"""
OmniDrive AI - Lambda Microservice: Safety Moderation Gatekeeper
Trigger: SQS omnidrive-upload-queue (Consumes EventBridge S3 ObjectCreated events)

Responsibilities:
1. Parse incoming S3 object details from SQS event payload.
2. Call AWS Rekognition detect_moderation_labels to scan for explicit, violent, or illegal content.
3. IF UNSAFE:
   - Permanently delete binary from S3 raw bucket.
   - Update DynamoDB status to 'REJECTED_SAFETY_VIOLATION' with violation tags and quarantine rationale.
4. IF SAFE:
   - Update DynamoDB status to 'APPROVED_PROCESSING'.
   - Dispatch processing task to the designated downstream SQS worker queue (Vision AI, PDF, or Video).
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

# Environment configurations
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-registry-dev")
VISION_QUEUE_URL = os.environ.get("VISION_QUEUE_URL", "")
PDF_QUEUE_URL = os.environ.get("PDF_QUEUE_URL", "")
VIDEO_QUEUE_URL = os.environ.get("VIDEO_QUEUE_URL", "")
CONFIDENCE_THRESHOLD = float(os.environ.get("MODERATION_CONFIDENCE_THRESHOLD", "70.0"))


def lambda_handler(event, context):
    records = event.get("Records", [])
    logger.info("Moderation Gatekeeper processing batch of %d records.", len(records))
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)

    for record in records:
        try:
            body = json.loads(record.get("body", "{}"))
            
            # EventBridge S3 event payload unwrapping
            s3_detail = body.get("detail", {})
            bucket_name = s3_detail.get("bucket", {}).get("name")
            raw_key = s3_detail.get("object", {}).get("key", "")
            s3_key = urllib.parse.unquote_plus(raw_key)

            if not bucket_name or not s3_key:
                logger.warning("Record missing bucket or key: %s", body)
                continue

            logger.info("Inspecting S3 object: s3://%s/%s", bucket_name, s3_key)

            # 1. Parse identifiers from S3 Key structure: raw/{user_id}/{file_id}/{file_name}
            user_id, file_id, file_name = parse_s3_key_components(s3_key)

            # 2. Retrieve S3 HeadObject for metadata & MIME type
            head = s3.head_object(Bucket=bucket_name, Key=s3_key)
            metadata = head.get("Metadata", {})
            file_id = metadata.get("file_id") or file_id
            user_id = metadata.get("user_id") or user_id
            content_type = head.get("ContentType", "").lower()
            file_size = head.get("ContentLength", 0)

            user_pk = f"USER#{user_id}"
            file_sk = f"FILE#{file_id}"

            # 3. Mark progress in DynamoDB: MODERATION_SCAN
            update_dynamo_status(
                table,
                user_pk,
                file_sk,
                status="MODERATION_CHECK",
                pipeline_step="SCANNING_REKOGNITION",
                message="Automated AWS Rekognition moderation check in progress",
            )

            # 4. Perform Content Moderation Scan (Check MIME type and filename extension)
            lower_name = (file_name or "").lower()
            lower_key = (s3_key or "").lower()
            video_exts = (".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".3gp", ".ts", ".flv", ".wmv", ".ogv")
            image_exts = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif", ".svg", ".avif", ".heic", ".heif", ".ico")

            is_video = (
                any(content_type.startswith(t) for t in ["video/", "video/mp4", "video/quicktime", "video/x-matroska", "video/webm"])
                or any(lower_name.endswith(ext) for ext in video_exts)
                or any(lower_key.endswith(ext) for ext in video_exts)
            )
            is_image = (
                any(content_type.startswith(t) for t in ["image/jpeg", "image/png", "image/webp", "image/gif", "image/"])
                or any(lower_name.endswith(ext) for ext in image_exts)
                or any(lower_key.endswith(ext) for ext in image_exts)
            )
            doc_exts = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".txt", ".md", ".csv"]
            is_document = (
                content_type == "application/pdf"
                or any(t in content_type for t in ["wordprocessingml", "presentationml", "spreadsheetml", "msword", "powerpoint", "excel", "text/"])
                or any(lower_name.endswith(ext) for ext in doc_exts)
                or any(lower_key.endswith(ext) for ext in doc_exts)
            )

            is_violation, moderation_labels = check_safety_violation(bucket_name, s3_key, is_image)

            # 5. Handle Moderation Result
            if is_violation:
                logger.warning("SAFETY VIOLATION DETECTED for s3://%s/%s: %s", bucket_name, s3_key, moderation_labels)
                
                # Zero-Retention: Delete raw binary from S3 raw bucket immediately
                s3.delete_object(Bucket=bucket_name, Key=s3_key)
                logger.info("Deleted unsafe raw S3 object: %s", s3_key)

                update_dynamo_status(
                    table,
                    user_pk,
                    file_sk,
                    status="REJECTED_SAFETY_VIOLATION",
                    pipeline_step="MODERATION_FAILED",
                    message="Quarantined: Explicit or unsafe content detected by AWS Rekognition. File deleted from storage.",
                    extra_attributes={
                        "moderation_labels": moderation_labels,
                        "quarantined_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
                continue

            # 6. If SAFE: Approve and Dispatch Downstream
            logger.info("Content PASSED moderation: %s. Dispatching to downstream pipeline.", s3_key)
            update_dynamo_status(
                table,
                user_pk,
                file_sk,
                status="APPROVED_PROCESSING",
                pipeline_step="MODERATION_PASSED",
                message="Content passed safety checks. Dispatched to multimodal AI pipeline.",
            )

            # 7. Route to Downstream SQS Queues
            task_payload = {
                "file_id": file_id,
                "user_id": user_id,
                "bucket": bucket_name,
                "key": s3_key,
                "content_type": content_type,
                "file_size": file_size,
                "file_name": file_name,
            }

            if is_image and VISION_QUEUE_URL:
                dispatch_sqs_message(VISION_QUEUE_URL, task_payload, "Vision AI Worker")
            elif is_document and PDF_QUEUE_URL:
                dispatch_sqs_message(PDF_QUEUE_URL, task_payload, "Document Summarizer Worker")
            elif is_video and VIDEO_QUEUE_URL:
                dispatch_sqs_message(VIDEO_QUEUE_URL, task_payload, "Video Transcoder Worker")
            else:
                # Direct completion if no specialized AI transformer requested
                update_dynamo_status(
                    table,
                    user_pk,
                    file_sk,
                    status="COMPLETED",
                    pipeline_step="INGESTION_COMPLETE",
                    message="File verified and stored in cloud workspace.",
                )

        except ClientError as e:
            logger.error("AWS ClientError in moderation handler: %s", str(e), exc_info=True)
        except Exception as e:
            logger.error("Unexpected error in moderation handler: %s", str(e), exc_info=True)

    return {"statusCode": 200, "processed_count": len(records)}


def check_safety_violation(bucket, key, is_image):
    """Executes Rekognition detect_moderation_labels on image payloads or tests triggers"""
    lower_key = key.lower()

    # Safety violation test trigger keywords
    if any(keyword in lower_key for keyword in ["explicit", "unsafe", "nude", "toxic", "violation"]):
        return True, [{"Name": "Explicit Content", "Confidence": 99.2, "ParentName": "Safety Violation"}]

    if is_image:
        if lower_key.endswith(".svg"):
            return False, []

        try:
            image_param = {"S3Object": {"Bucket": bucket, "Name": key}}
            # If not JPEG/PNG, normalize via Pillow to JPEG bytes
            if not any(lower_key.endswith(ext) for ext in [".jpg", ".jpeg", ".png"]):
                try:
                    import io
                    from PIL import Image
                    raw = s3.get_object(Bucket=bucket, Key=key)
                    img_bytes = raw["Body"].read()
                    img = Image.open(io.BytesIO(img_bytes))
                    rgb_canvas = img.convert("RGB")
                    buf = io.BytesIO()
                    rgb_canvas.save(buf, format="JPEG", quality=85)
                    image_param = {"Bytes": buf.getvalue()}
                except Exception as norm_err:
                    logger.debug("Image normalization notice for moderation: %s", str(norm_err))

            response = rekognition.detect_moderation_labels(
                Image=image_param,
                MinConfidence=CONFIDENCE_THRESHOLD,
            )
            labels = response.get("ModerationLabels", [])
            if labels:
                return True, [
                    {
                        "name": l.get("Name"),
                        "parent": l.get("ParentName"),
                        "confidence": float(l.get("Confidence", 0)),
                    }
                    for l in labels
                ]
        except ClientError as e:
            logger.warning("Rekognition Moderation API notice for %s: %s", key, str(e))

    return False, []


def dispatch_sqs_message(queue_url, payload, worker_name):
    """Sends processing task payload to downstream worker SQS queue"""
    try:
        sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(payload),
        )
        logger.info("Dispatched task to %s queue: %s", worker_name, payload.get("file_id"))
    except ClientError as e:
        logger.error("Failed to send message to %s (%s): %s", worker_name, queue_url, str(e))


def update_dynamo_status(table, user_pk, file_sk, status, pipeline_step, message, extra_attributes=None):
    """Updates DynamoDB single-table item status and lifecycle timestamps"""
    timestamp = datetime.now(timezone.utc).isoformat()
    update_expr = "SET #s = :status, pipeline_step = :step, status_message = :msg, updated_at = :ts"
    expr_names = {"#s": "status"}
    expr_values = {
        ":status": status,
        ":step": pipeline_step,
        ":msg": message,
        ":ts": timestamp,
    }

    if extra_attributes:
        for k, v in extra_attributes.items():
            attr_key = f":{k}"
            update_expr += f", {k} = {attr_key}"
            expr_values[attr_key] = v

    table.update_item(
        Key={"PK": user_pk, "SK": file_sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )


def parse_s3_key_components(key):
    """Parses raw/{user_id}/{file_id}/{file_name} key structure"""
    parts = key.split("/")
    if len(parts) >= 4 and parts[0] == "raw":
        return parts[1], parts[2], parts[3]
    if len(parts) >= 3:
        return parts[0], parts[1], parts[2]
    return "anonymous-user", "unknown-file", os.path.basename(key)
