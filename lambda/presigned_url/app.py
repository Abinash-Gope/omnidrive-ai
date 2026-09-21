"""
Lambda Handler: Generate S3 Presigned PUT URL
Validates file metadata, registers initial PENDING record in DynamoDB,
and issues a short-lived presigned URL for direct client-to-S3 ingestion.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

RAW_BUCKET_NAME = os.environ.get("RAW_BUCKET_NAME", "omnidrive-ai-raw-dev")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-files-dev")
URL_EXPIRATION_SECONDS = int(os.environ.get("URL_EXPIRATION_SECONDS", "900")) # 15 minutes

ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB hard limit for free-tier protection


def lambda_handler(event, context):
    logger.info("Received presigned URL request: %s", event)

    try:
        body = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else (event.get("body") or {})
        file_name = body.get("file_name", "").strip()
        content_type = body.get("content_type", "").strip().lower()
        file_size = body.get("file_size", 0)
        user_id = body.get("user_id", "anonymous-user")

        # 1. Validation
        if not file_name or not content_type:
            return build_response(400, {"error": "Missing required fields: file_name and content_type"})

        if content_type not in ALLOWED_MIME_TYPES:
            return build_response(400, {"error": f"Unsupported content_type: {content_type}. Allowed: {list(ALLOWED_MIME_TYPES)}"})

        if file_size and file_size > MAX_FILE_SIZE_BYTES:
            return build_response(400, {"error": f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES / (1024*1024)}MB"})

        # 2. Key & ID Generation
        file_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        sanitized_name = os.path.basename(file_name).replace(" ", "_")
        s3_key = f"uploads/{user_id}/{file_id}/{sanitized_name}"

        # 3. Generate Presigned PUT URL
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
                }
            },
            ExpiresIn=URL_EXPIRATION_SECONDS,
        )

        # 4. Insert Initial Job State in DynamoDB (PENDING)
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        item = {
            "file_id": file_id,
            "created_at": timestamp,
            "user_id": user_id,
            "file_name": sanitized_name,
            "content_type": content_type,
            "file_size": file_size,
            "s3_bucket": RAW_BUCKET_NAME,
            "s3_key": s3_key,
            "status": "PENDING",
            "pipeline_step": "AWAITING_UPLOAD",
            "updated_at": timestamp,
        }
        table.put_item(Item=item)

        logger.info("Successfully issued presigned URL for file_id: %s, key: %s", file_id, s3_key)

        return build_response(
            200,
            {
                "file_id": file_id,
                "upload_url": presigned_url,
                "s3_key": s3_key,
                "expires_in": URL_EXPIRATION_SECONDS,
            },
        )

    except ClientError as e:
        logger.error("AWS ClientError: %s", str(e), exc_info=True)
        return build_response(500, {"error": "Internal AWS client failure generating upload URL."})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e), exc_info=True)
        return build_response(500, {"error": f"Server error: {str(e)}"})


def build_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body),
    }
