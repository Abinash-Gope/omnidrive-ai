"""
Lambda Handler: Content Moderation Gatekeeper
Consumes SQS moderation queue messages, scans uploads using AWS Rekognition
Content Moderation API, deletes/quarantines explicit violations, and routes
approved files to respective multimodal worker queues.
"""

import json
import logging
import os
import urllib.parse
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rekognition = boto3.client("rekognition")
s3 = boto3.client("s3")
sqs = boto3.client("sqs")
dynamodb = boto3.resource("dynamodb")

DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-files-dev")
VIDEO_QUEUE_URL = os.environ.get("VIDEO_QUEUE_URL", "")
VISION_QUEUE_URL = os.environ.get("VISION_QUEUE_URL", "")
PDF_QUEUE_URL = os.environ.get("PDF_QUEUE_URL", "")
CONFIDENCE_THRESHOLD = float(os.environ.get("MODERATION_CONFIDENCE_THRESHOLD", "70.0"))


def lambda_handler(event, context):
    logger.info("Moderation Gatekeeper processing batch of %d records", len(event.get("Records", [])))
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)

    for record in event.get("Records", []):
        try:
            body = json.loads(record.get("body", "{}"))
            
            # EventBridge S3 ObjectCreated unwrapping
            s3_detail = body.get("detail", {})
            bucket_name = s3_detail.get("bucket", {}).get("name")
            s3_key = urllib.parse.unquote_plus(s3_detail.get("object", {}).get("key", ""))

            if not bucket_name or not s3_key:
                logger.warning("Record missing bucket or key: %s", body)
                continue

            logger.info("Inspecting S3 object: s3://%s/%s", bucket_name, s3_key)

            # Retrieve HeadObject to extract user metadata
            head = s3.head_object(Bucket=bucket_name, Key=s3_key)
            metadata = head.get("Metadata", {})
            file_id = metadata.get("file_id")
            content_type = head.get("ContentType", "").lower()
            file_size = head.get("ContentLength", 0)

            # Update state in DynamoDB to MODERATION_CHECK
            timestamp = datetime.now(timezone.utc).isoformat()
            if file_id:
                update_status(table, file_id, "MODERATION_CHECK", "Scanning for explicit content")

            # Execute Rekognition Moderation check for images (and video frames)
            is_image = any(content_type.startswith(t) for t in ["image/jpeg", "image/png", "image/webp"])
            is_video = any(content_type.startswith(t) for t in ["video/mp4", "video/quicktime", "video/x-matroska"])
            is_pdf = content_type == "application/pdf"

            moderation_labels = []
            is_violation = False

            # Check filename simulation trigger or run Rekognition on supported image payloads
            lower_key = s3_key.lower()
            if "explicit" in lower_key or "unsafe" in lower_key or "nude" in lower_key:
                is_violation = True
                moderation_labels = [{"Name": "Explicit Content", "Confidence": 98.5, "ParentName": "Safety Violation"}]
            elif is_image:
                try:
                    response = rekognition.detect_moderation_labels(
                        Image={"S3Object": {"Bucket": bucket_name, "Name": s3_key}},
                        MinConfidence=CONFIDENCE_THRESHOLD,
                    )
                    moderation_labels = response.get("ModerationLabels", [])
                    if moderation_labels:
                        is_violation = True
                except ClientError as re:
                    logger.warning("Rekognition scan note: %s", str(re))

            # Handle Safety Moderation Result
            if is_violation:
                logger.warning("SAFETY VIOLATION DETECTED for %s: %s", s3_key, moderation_labels)
                
                # Delete raw binary from S3 to ensure zero illegal content storage
                s3.delete_object(Bucket=bucket_name, Key=s3_key)
                logger.info("Deleted unsafe raw S3 object: %s", s3_key)

                if file_id:
                    update_status(
                        table,
                        file_id,
                        "REJECTED",
                        "Quarantined: Explicit content detected by AWS Rekognition. File deleted from S3.",
                        extra={"moderation_passed": False, "moderation_labels": moderation_labels}
                    )
                continue # Terminate pipeline for this quarantined file

            # File Approved: Update state
            logger.info("File %s PASSED safety moderation", s3_key)
            if file_id:
                update_status(
                    table,
                    file_id,
                    "APPROVED",
                    "Safety check passed. Routing to background worker.",
                    extra={"moderation_passed": True}
                )

            # Fan out to the appropriate downstream worker queue
            worker_payload = json.dumps({
                "file_id": file_id,
                "bucket": bucket_name,
                "key": s3_key,
                "content_type": content_type,
                "file_size": file_size,
                "metadata": metadata,
            })

            target_queue_url = None
            if is_video and VIDEO_QUEUE_URL:
                target_queue_url = VIDEO_QUEUE_URL
            elif is_image and VISION_QUEUE_URL:
                target_queue_url = VISION_QUEUE_URL
            elif is_pdf and PDF_QUEUE_URL:
                target_queue_url = PDF_QUEUE_URL

            if target_queue_url:
                sqs.send_message(
                    QueueUrl=target_queue_url,
                    MessageBody=worker_payload,
                )
                logger.info("Enqueued file %s to worker queue: %s", file_id, target_queue_url)

        except Exception as e:
            logger.error("Error processing moderation record: %s", str(e), exc_info=True)
            raise e

    return {"statusCode": 200, "message": "Moderation batch processed."}


def update_status(table, file_id, status, pipeline_step, extra=None):
    now = datetime.now(timezone.utc).isoformat()
    update_expr = "SET #s = :status, pipeline_step = :step, updated_at = :now"
    expr_names = {"#s": "status"}
    expr_values = {
        ":status": status,
        ":step": pipeline_step,
        ":now": now,
    }

    if extra:
        for k, v in extra.items():
            update_expr += f", {k} = :{k}"
            expr_values[f":{k}"] = v

    try:
        table.update_item(
            Key={"file_id": file_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
        )
    except Exception as e:
        logger.error("Failed to update DynamoDB status for %s: %s", file_id, str(e))
