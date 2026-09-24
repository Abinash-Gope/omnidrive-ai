"""
OmniDrive AI - Phase 3: Presigned URL Generator & Ingestion Lambda Handler
File: lambda/presigned_url/handler.py
Route: POST /upload-url (Cognito JWT Authorizer Authenticated)

Responsibilities:
1. Extract Cognito 'sub' (User ID) from event['requestContext']['authorizer']['claims'].
2. Parse HTTP body: { "file_name": string, "file_type": string, "file_size": number }.
3. Generate a unique file_id (UUID v4).
4. Construct S3 Object Key: raw/{user_id}/{file_id}/{sanitized_file_name}.
5. Generate an S3 Presigned PUT URL valid for 300 seconds (5 minutes).
6. Persist initial item to DynamoDB table 'OmniDrive_Registry' with status 'PENDING_UPLOAD'.
7. Provide production CORS headers for all responses (including OPTIONS preflight).
"""

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment configuration
RAW_BUCKET_NAME = os.environ.get("RAW_BUCKET_NAME", "omnidrive-ai-raw-dev")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "OmniDrive_Registry")
URL_EXPIRATION_SECONDS = int(os.environ.get("URL_EXPIRATION_SECONDS", "300"))  # 5 minutes
USE_ACCELERATE_ENDPOINT = os.environ.get("USE_ACCELERATE_ENDPOINT", "true").lower() in ("true", "1", "yes")

# AWS SDK clients
def get_s3_client(use_accelerate=None):
    """Factory helper to construct S3 client with optional Transfer Acceleration."""
    accelerate = USE_ACCELERATE_ENDPOINT if use_accelerate is None else bool(use_accelerate)
    return boto3.client("s3", config=Config(s3={"use_accelerate_endpoint": accelerate}))

s3_client = get_s3_client()
dynamodb = boto3.resource("dynamodb")
URL_EXPIRATION_SECONDS = int(os.environ.get("URL_EXPIRATION_SECONDS", "300"))  # 5 minutes

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
}


def lambda_handler(event, context):
    """
    AWS Lambda entrypoint for generating S3 presigned PUT URLs
    and registering initial upload records in DynamoDB.
    """
    logger.info("Received presigned URL generation request. Request ID: %s", getattr(context, "aws_request_id", "local"))

    # Handle CORS OPTIONS preflight request
    http_method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method", "")
    ).upper()

    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "CORS preflight successful"}),
        }

    try:
        # 1. Extract Cognito 'sub' (User ID) from authorizer claims
        user_id = extract_user_id(event)
        if not user_id:
            logger.warning("Unauthorized access attempt: missing Cognito 'sub' claim.")
            return build_response(401, {"error": "Unauthorized: Missing valid Cognito user identification claim."})

        # 2. Parse HTTP body: { "file_name": str, "file_type": str, "file_size": num }
        body = parse_request_body(event)

        # Check for Resumable Multipart Upload routes & actions
        path = event.get("rawPath") or event.get("path") or ""
        action = body.get("action", "")

        if action == "initiate_multipart" or path.endswith("/upload/initiate") or path.endswith("/initiate"):
            return handle_initiate_multipart(user_id, body)
        if action == "part_url" or path.endswith("/upload/part-url") or path.endswith("/part-url"):
            return handle_part_presigned_url(user_id, body)
        if action == "complete_multipart" or path.endswith("/upload/complete") or path.endswith("/complete"):
            return handle_complete_multipart(user_id, body)

        file_name = body.get("file_name", "").strip()
        # Accept file_type (per prompt) or content_type
        file_type = (body.get("file_type") or body.get("content_type", "")).strip().lower()
        file_size = body.get("file_size", 0)

        if not file_name or not file_type:
            return build_response(400, {
                "error": "Missing required fields: 'file_name' and 'file_type' are required."
            })

        try:
            file_size = int(file_size)
        except (ValueError, TypeError):
            file_size = 0

        # Storage Quota Validation (15 GB Free Tier = 16,106,127,360 bytes)
        FREE_TIER_LIMIT_BYTES = int(os.environ.get("STORAGE_LIMIT_BYTES", str(15 * 1024 * 1024 * 1024)))
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        user_pk = f"USER#{user_id}"

        try:
            from boto3.dynamodb.conditions import Key
            res = table.query(
                KeyConditionExpression=Key("PK").eq(user_pk) & Key("SK").begins_with("FILE#"),
                ProjectionExpression="file_size",
            )
            current_bytes = sum(int(i.get("file_size") or 0) for i in res.get("Items", []))
            if current_bytes + file_size > FREE_TIER_LIMIT_BYTES:
                return build_response(403, {
                    "error": "Storage quota exceeded: This upload would exceed your 15 GB Free Tier limit. Please delete unused files or upgrade to Pro Cloud."
                })
        except Exception as quota_err:
            logger.warning("Storage quota validation notice: %s", str(quota_err))

        # 3. Generate unique file_id (UUID v4) & sanitize filename
        file_id = str(uuid.uuid4())
        sanitized_file_name = sanitize_filename(file_name)

        # 4. Construct S3 Object Key: raw/{user_id}/{file_id}/{file_name}
        s3_raw_key = f"raw/{user_id}/{file_id}/{sanitized_file_name}"
        timestamp = datetime.now(timezone.utc).isoformat()

        # 5. Generate S3 Presigned PUT URL valid for 300 seconds (5 minutes)
        # Note: Do NOT add 'Metadata' to Params; metadata is persisted directly to DynamoDB,
        # and omitting it from Params prevents SigV4 signed-header mismatches on client PUT.
        presigned_put_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": RAW_BUCKET_NAME,
                "Key": s3_raw_key,
                "ContentType": file_type,
            },
            ExpiresIn=URL_EXPIRATION_SECONDS,
        )

        # 6. Save initial item to DynamoDB table OmniDrive_Registry
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        registry_item = {
            "PK": f"USER#{user_id}",
            "SK": f"FILE#{file_id}",
            "file_id": file_id,
            "user_id": user_id,
            "file_name": sanitized_file_name,
            "file_type": file_type,
            "content_type": file_type,
            "file_size": file_size,
            "s3_raw_key": s3_raw_key,
            "s3_key": s3_raw_key,
            "s3_bucket": RAW_BUCKET_NAME,
            "status": "PENDING_UPLOAD",
            "pipeline_step": "AWAITING_UPLOAD",
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        table.put_item(Item=registry_item)
        logger.info("Successfully registered PENDING_UPLOAD for file_id: %s (user: %s, key: %s)", file_id, user_id, s3_raw_key)

        # Return presigned URL with file details
        return build_response(200, {
            "upload_url": presigned_put_url,
            "file_id": file_id,
            "s3_key": s3_raw_key,
            "s3_raw_key": s3_raw_key,
            "file_name": sanitized_file_name,
            "file_type": file_type,
            "file_size": file_size,
            "status": "PENDING_UPLOAD",
            "expires_in": URL_EXPIRATION_SECONDS,
        })

    except ClientError as e:
        logger.error("AWS ClientError in presigned URL handler: %s", str(e), exc_info=True)
        return build_response(500, {"error": "AWS service error while preparing direct upload."})
    except Exception as e:
        logger.error("Unexpected error in presigned URL handler: %s", str(e), exc_info=True)
        return build_response(500, {"error": f"Internal server error: {str(e)}"})


def extract_user_id(event):
    """
    Extracts Cognito 'sub' (User ID) from:
    1. event['requestContext']['authorizer']['claims']['sub'] (REST API / Standard Authorizer)
    2. event['requestContext']['authorizer']['jwt']['claims']['sub'] (HTTP API v2 JWT Authorizer)
    3. Direct headers or body fallback (useful for local development)
    """
    authorizer = event.get("requestContext", {}).get("authorizer", {})

    # 1. Standard / REST API authorizer claims
    claims = authorizer.get("claims")
    if isinstance(claims, dict) and "sub" in claims:
        return claims["sub"]

    # 2. HTTP API v2 JWT authorizer claims
    jwt_claims = authorizer.get("jwt", {}).get("claims", {})
    if isinstance(jwt_claims, dict) and "sub" in jwt_claims:
        return jwt_claims["sub"]

    # 3. Development / Local test header fallback
    headers = event.get("headers") or {}
    for key in ("x-user-id", "X-User-Id", "X-USER-ID"):
        if key in headers and headers[key]:
            return headers[key]

    # 4. Fallback in body
    body = parse_request_body(event)
    return body.get("user_id")


def parse_request_body(event):
    """Parses JSON request body safely handling dict or string representations."""
    body = event.get("body")
    if not body:
        return {}
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except (json.JSONDecodeError, TypeError):
        return {}


def sanitize_filename(filename):
    """Sanitizes filename for safe S3 key storage."""
    base = os.path.basename(filename)
    # Replace spaces and special characters with underscore, keeping extension and alphanumerics
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return sanitized or "file_upload"


def build_response(status_code, body_dict):
    """Builds standardized API Gateway HTTP response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body_dict),
    }


def handle_initiate_multipart(user_id, body):
    """Initiates an S3 multipart upload for connection-drop resilience."""
    file_name = (body.get("file_name") or body.get("fileName") or "upload").strip()
    file_type = (body.get("file_type") or body.get("contentType") or "application/octet-stream").strip().lower()
    file_id = str(uuid.uuid4())
    sanitized_file_name = sanitize_filename(file_name)
    s3_raw_key = f"raw/{user_id}/{file_id}/{sanitized_file_name}"

    mp_res = s3_client.create_multipart_upload(
        Bucket=RAW_BUCKET_NAME,
        Key=s3_raw_key,
        ContentType=file_type,
    )
    upload_id = mp_res["UploadId"]

    # Register record in DynamoDB
    timestamp = datetime.now(timezone.utc).isoformat()
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    registry_item = {
        "PK": f"USER#{user_id}",
        "SK": f"FILE#{file_id}",
        "file_id": file_id,
        "user_id": user_id,
        "file_name": sanitized_file_name,
        "file_type": file_type,
        "content_type": file_type,
        "s3_raw_key": s3_raw_key,
        "s3_key": s3_raw_key,
        "s3_bucket": RAW_BUCKET_NAME,
        "upload_id": upload_id,
        "status": "PENDING_UPLOAD",
        "pipeline_step": "MULTIPART_INITIATED",
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    table.put_item(Item=registry_item)

    return build_response(200, {
        "upload_id": upload_id,
        "uploadId": upload_id,
        "file_id": file_id,
        "fileId": file_id,
        "s3_key": s3_raw_key,
        "fileKey": s3_raw_key,
        "file_key": s3_raw_key,
    })


def handle_part_presigned_url(user_id, body):
    """Generates an accelerated presigned PUT URL for a specific multipart part."""
    file_key = body.get("file_key") or body.get("fileKey") or body.get("s3_key")
    upload_id = body.get("upload_id") or body.get("uploadId")
    part_number = int(body.get("part_number") or body.get("partNumber") or 1)

    if not file_key or not upload_id:
        return build_response(400, {"error": "Missing 'file_key' or 'upload_id' for multipart part URL."})

    part_url = s3_client.generate_presigned_url(
        ClientMethod="upload_part",
        Params={
            "Bucket": RAW_BUCKET_NAME,
            "Key": file_key,
            "UploadId": upload_id,
            "PartNumber": part_number,
        },
        ExpiresIn=URL_EXPIRATION_SECONDS,
    )

    return build_response(200, {
        "presigned_url": part_url,
        "presignedUrl": part_url,
        "part_number": part_number,
        "partNumber": part_number,
    })


def handle_complete_multipart(user_id, body):
    """Completes the S3 multipart upload and sets status to PENDING_PROCESSING."""
    file_key = body.get("file_key") or body.get("fileKey") or body.get("s3_key")
    upload_id = body.get("upload_id") or body.get("uploadId")
    raw_parts = body.get("parts") or []

    if not file_key or not upload_id:
        return build_response(400, {"error": "Missing 'file_key' or 'upload_id' to complete multipart upload."})

    parts = []
    for p in raw_parts:
        pn = p.get("PartNumber") or p.get("partNumber") or p.get("part_number")
        etag = p.get("ETag") or p.get("etag") or ""
        if pn and etag:
            parts.append({"PartNumber": int(pn), "ETag": str(etag).strip('"')})

    parts.sort(key=lambda x: x["PartNumber"])

    comp_res = s3_client.complete_multipart_upload(
        Bucket=RAW_BUCKET_NAME,
        Key=file_key,
        UploadId=upload_id,
        MultipartUpload={"Parts": parts},
    )

    file_id = body.get("file_id") or body.get("fileId")
    if not file_id and len(file_key.split("/")) >= 3:
        file_id = file_key.split("/")[2]

    if file_id:
        try:
            table = dynamodb.Table(DYNAMODB_TABLE_NAME)
            table.update_item(
                Key={"PK": f"USER#{user_id}", "SK": f"FILE#{file_id}"},
                UpdateExpression="SET #status = :s, pipeline_step = :p, updated_at = :u",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":s": "PENDING_PROCESSING",
                    ":p": "UPLOAD_COMPLETED",
                    ":u": datetime.now(timezone.utc).isoformat(),
                },
            )
        except Exception as db_err:
            logger.warning("Could not update DynamoDB status on complete multipart: %s", db_err)

    return build_response(200, {
        "status": "COMPLETED",
        "file_id": file_id,
        "fileId": file_id,
        "file_key": file_key,
        "s3_key": file_key,
        "location": comp_res.get("Location", ""),
        "bucket": RAW_BUCKET_NAME,
    })
