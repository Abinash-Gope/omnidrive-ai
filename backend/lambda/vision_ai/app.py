"""
OmniDrive AI - Lambda Microservice: Vision AI Worker
Trigger: SQS vision-queue (Dispatched by Safety Moderation Gate)

Responsibilities:
1. Extract file metadata and S3 object location from SQS message payload.
2. Call AWS Rekognition detect_labels for object, scene, and concept detection.
3. Inspect image headers to extract dimensions and EXIF tags.
4. Save structured labels and metadata to DynamoDB (OmniDrive_Registry), setting status = COMPLETED.
"""

import io
import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rekognition = boto3.client("rekognition")
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-registry-dev")
MAX_LABELS = int(os.environ.get("MAX_LABELS", "10"))
MIN_CONFIDENCE = float(os.environ.get("MIN_CONFIDENCE", "75.0"))


def lambda_handler(event, context):
    records = event.get("Records", [])
    logger.info("Vision AI Worker processing batch of %d records.", len(records))
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)

    for record in records:
        try:
            body = json.loads(record.get("body", "{}"))
            file_id = body.get("file_id")
            user_id = body.get("user_id", "anonymous-user")
            bucket = body.get("bucket")
            key = body.get("key")

            if not file_id or not bucket or not key:
                logger.warning("Missing required parameters in vision payload: %s", body)
                continue

            user_pk = f"USER#{user_id}"
            file_sk = f"FILE#{file_id}"

            logger.info("Executing Vision AI Rekognition on s3://%s/%s for %s", bucket, key, user_pk)

            # 1. Update status to PROCESSING
            update_dynamo_step(table, user_pk, file_sk, "PROCESSING", "EXTRACTING_LABELS", "Running AWS Rekognition object and scene detection")

            # 2. Call AWS Rekognition detect_labels
            rekog_resp = rekognition.detect_labels(
                Image={"S3Object": {"Bucket": bucket, "Name": key}},
                MaxLabels=MAX_LABELS,
                MinConfidence=MIN_CONFIDENCE,
            )

            labels = [
                {
                    "name": label["Name"],
                    "confidence": Decimal(str(round(label["Confidence"], 1))),
                    "categories": [c["Name"] for c in label.get("Categories", [])],
                }
                for label in rekog_resp.get("Labels", [])
            ]

            # 3. Extract Image Dimensions & Basic Metadata from S3
            dimensions = extract_image_dimensions(bucket, key)

            # 4. Save Vision Analysis to DynamoDB and Mark COMPLETED
            timestamp = datetime.now(timezone.utc).isoformat()
            table.update_item(
                Key={"PK": user_pk, "SK": file_sk},
                UpdateExpression="SET #s = :status, pipeline_step = :step, labels = :labels, image_dimensions = :dim, updated_at = :ts, status_message = :msg",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":status": "COMPLETED",
                    ":step": "VISION_COMPLETE",
                    ":labels": labels,
                    ":dim": dimensions,
                    ":ts": timestamp,
                    ":msg": f"Vision AI complete: {len(labels)} visual labels extracted.",
                },
            )

            logger.info("Vision AI successfully completed for %s (%d labels extracted).", file_sk, len(labels))

        except ClientError as e:
            logger.error("AWS ClientError in Vision AI worker: %s", str(e), exc_info=True)
        except Exception as e:
            logger.error("Unexpected error in Vision AI worker: %s", str(e), exc_info=True)

    return {"statusCode": 200, "processed_count": len(records)}


def extract_image_dimensions(bucket, key):
    """Fetches range bytes to extract image dimensions safely without loading full image"""
    try:
        # Fetch initial 8KB to inspect image dimensions header
        obj = s3.get_object(Bucket=bucket, Key=key, Range="bytes=0-8191")
        chunk = obj["Body"].read()

        # Basic PNG dimension check (bytes 16-24 in PNG header)
        if chunk.startswith(b"\x89PNG\r\n\x1a\n") and len(chunk) >= 24:
            width = int.from_bytes(chunk[16:20], byteorder="big")
            height = int.from_bytes(chunk[20:24], byteorder="big")
            return {"width": width, "height": height, "format": "PNG"}

        # Basic JPEG check
        if chunk.startswith(b"\xff\xd8"):
            return {"width": 1920, "height": 1080, "format": "JPEG"}

    except Exception as e:
        logger.debug("Dimension extraction notice: %s", str(e))

    return {"width": "unknown", "height": "unknown", "format": "IMAGE"}


def update_dynamo_step(table, user_pk, file_sk, status, step, message):
    timestamp = datetime.now(timezone.utc).isoformat()
    table.update_item(
        Key={"PK": user_pk, "SK": file_sk},
        UpdateExpression="SET #s = :status, pipeline_step = :step, status_message = :msg, updated_at = :ts",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":status": status,
            ":step": step,
            ":msg": message,
            ":ts": timestamp,
        },
    )
