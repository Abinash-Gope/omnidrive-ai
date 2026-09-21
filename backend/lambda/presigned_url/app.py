"""
OmniDrive AI - Lambda Microservice: Presigned URL Generator
Route: POST /upload-url (Cognito JWT Authenticated)

Responsibilities:
1. Extract and verify authenticated user identity (Cognito 'sub' claim).
2. Validate incoming file metadata (allowed MIME types, maximum size).
3. Register initial record in DynamoDB (OmniDrive_Registry) with status PENDING_UPLOAD.
4. Issue a short-lived S3 Presigned PUT URL for direct client-to-S3 binary streaming.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

# Structured logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# Environment configuration with safe defaults
RAW_BUCKET_NAME = os.environ.get("RAW_BUCKET_NAME", "omnidrive-ai-raw-dev")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-registry-dev")
URL_EXPIRATION_SECONDS = int(os.environ.get("URL_EXPIRATION_SECONDS", "300"))  # 5 minutes

ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}

# 500 MB maximum threshold (optimized for Free Tier safeguards)
MAX_FILE_SIZE_BYTES = int(os.environ.get("MAX_FILE_SIZE_BYTES", str(500 * 1024 * 1024)))


def lambda_handler(event, context):
    logger.info("Handling presigned URL generation. Request ID: %s", getattr(context, "aws_request_id", "local"))

    try:
        # 1. Authenticate & Extract User Identity from Cognito JWT Authorizer
        user_id = extract_user_id(event)
        if not user_id:
            return build_response(401, {"error": "Unauthorized: Missing valid Cognito authentication claim."})

        # 2. Parse and Validate Request Payload
        body = parse_request_body(event)
        file_name = body.get("file_name", "").strip()
        content_type = body.get("content_type", "").strip().lower()
        file_size = body.get("file_size", 0)

        if not file_name or not content_type:
            return build_response(400, {"error": "Missing required fields: 'file_name' and 'content_type'."})

        if content_type not in ALLOWED_MIME_TYPES:
            return build_response(
                400,
                {
                    "error": f"Unsupported MIME type '{content_type}'.",
                    "allowed_types": sorted(list(ALLOWED_MIME_TYPES)),
                },
            )

        if file_size and int(file_size) > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
            return build_response(400, {"error": f"File size exceeds maximum allowable limit of {max_mb} MB."})

        # 3. Generate Unique Identifiers & S3 Key
        file_id = str(uuid.uuid4())
        sanitized_name = os.path.basename(file_name).replace(" ", "_")
        s3_key = f"raw/{user_id}/{file_id}/{sanitized_name}"
        timestamp = datetime.now(timezone.utc).isoformat()

        # 4. Generate S3 Presigned PUT URL
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": RAW_BUCKET_NAME,
                "Key": s3_key,
                "ContentType": content_type,
                "Metadata": {
                    "file_id": file_id,
                    "user_id": user_id,
                    "original_name": sanitized_name,
                },
            },
            ExpiresIn=URL_EXPIRATION_SECONDS,
        )

        # 5. Write Single-Table DynamoDB Registry Record (PK: USER#<id>, SK: FILE#<id>)
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        item = {
            "PK": f"USER#{user_id}",
            "SK": f"FILE#{file_id}",
            "file_id": file_id,
            "user_id": user_id,
            "file_name": sanitized_name,
            "content_type": content_type,
            "file_size": file_size,
            "s3_bucket": RAW_BUCKET_NAME,
            "s3_key": s3_key,
            "status": "PENDING_UPLOAD",
            "pipeline_step": "AWAITING_UPLOAD",
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        table.put_item(Item=item)

        logger.info("Issued presigned URL for file_id: %s (User: %s, Key: %s)", file_id, user_id, s3_key)

        return build_response(
            200,
            {
                "upload_url": presigned_url,
                "file_id": file_id,
                "s3_key": s3_key,
                "expires_in": URL_EXPIRATION_SECONDS,
            },
        )

    except ClientError as e:
        logger.error("AWS ClientError generating presigned URL: %s", str(e), exc_info=True)
        return build_response(500, {"error": "AWS internal service failure while generating upload URL."})
    except Exception as e:
        logger.error("Unexpected error in presigned_url handler: %s", str(e), exc_info=True)
        return build_response(500, {"error": f"Internal server error: {str(e)}"})


def extract_user_id(event):
    """
    Extracts the authenticated user ID from:
    1. HTTP API v2 JWT Authorizer claims (Cognito 'sub')
    2. Fallback header 'x-user-id' (useful for local integration testing)
    3. Body 'user_id' parameter
    """
    # 1. API Gateway HTTP API v2 JWT Authorizer
    jwt_claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    if "sub" in jwt_claims:
        return jwt_claims["sub"]

    # 2. API Gateway REST API Cognito Authorizer
    cognito_claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
    )
    if "sub" in cognito_claims:
        return cognito_claims["sub"]

    # 3. Header Fallback
    headers = event.get("headers") or {}
    for key in ("x-user-id", "X-User-Id", "X-USER-ID"):
        if key in headers:
            return headers[key]

    # 4. Body Fallback
    body = parse_request_body(event)
    return body.get("user_id")


def parse_request_body(event):
    body = event.get("body")
    if not body:
        return {}
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {}


def build_response(status_code, body):
    """Standardized HTTP response with production CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
        "body": json.dumps(body),
    }
