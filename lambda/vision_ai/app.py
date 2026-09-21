"""
Lambda Handler: Vision AI Worker
Consumes image processing messages from SQS, calls AWS Rekognition detect_labels
for object & scene detection, extracts EXIF metadata, and saves results to DynamoDB.
"""

import io
import json
import logging
import os
from datetime import datetime, timezone
import boto3
from PIL import Image, ExifTags

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rekognition = boto3.client("rekognition")
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-files-dev")
MAX_LABELS = int(os.environ.get("MAX_LABELS", "10"))
MIN_CONFIDENCE = float(os.environ.get("MIN_CONFIDENCE", "75.0"))


def lambda_handler(event, context):
    logger.info("Vision AI Worker processing batch of %d records", len(event.get("Records", [])))
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)

    for record in event.get("Records", []):
        try:
            body = json.loads(record.get("body", "{}"))
            file_id = body.get("file_id")
            bucket = body.get("bucket")
            key = body.get("key")

            if not file_id or not bucket or not key:
                logger.warning("Missing required parameters in body: %s", body)
                continue

            logger.info("Processing image with Rekognition: s3://%s/%s", bucket, key)

            # 1. Update status to PROCESSING
            update_dynamo(table, file_id, "PROCESSING", "Extracting Vision AI labels & EXIF")

            # 2. Rekognition Object & Scene Detection
            rekog_resp = rekognition.detect_labels(
                Image={"S3Object": {"Bucket": bucket, "Name": key}},
                MaxLabels=MAX_LABELS,
                MinConfidence=MIN_CONFIDENCE,
            )

            labels = [
                {
                    "name": label["Name"],
                    "confidence": round(label["Confidence"], 1),
                    "categories": [c["Name"] for c in label.get("Categories", [])],
                }
                for label in rekog_resp.get("Labels", [])
            ]

            # 3. Download partial stream for EXIF metadata parsing
            exif_data = extract_exif(bucket, key)

            # 4. Update DynamoDB with COMPLETED status
            update_dynamo(
                table,
                file_id,
                "COMPLETED",
                "Vision AI processing complete",
                extra={
                    "labels": labels,
                    "exif": exif_data,
                    "ai_worker": "AWS Rekognition + Pillow EXIF",
                },
            )

            logger.info("Successfully processed image %s with %d labels", file_id, len(labels))

        except Exception as e:
            logger.error("Error processing vision AI record: %s", str(e), exc_info=True)
            raise e

    return {"statusCode": 200, "message": "Vision AI processing complete."}


def extract_exif(bucket, key):
    exif_summary = {
        "camera": "Unknown Camera",
        "lens": "Standard Lens",
        "iso": "Auto",
        "aperture": "Auto",
        "shutter": "Auto",
    }
    try:
        obj = s3.get_object(Bucket=bucket, Key=key)
        img_bytes = obj["Body"].read()
        image = Image.open(io.BytesIO(img_bytes))

        raw_exif = image.getexif()
        if not raw_exif:
            return exif_summary

        exif_dict = {ExifTags.TAGS.get(k, k): v for k, v in raw_exif.items() if k in ExifTags.TAGS}

        make = str(exif_dict.get("Make", "")).strip()
        model = str(exif_dict.get("Model", "")).strip()
        if make or model:
            exif_summary["camera"] = f"{make} {model}".strip()

        if "ISOSpeedRatings" in exif_dict:
            exif_summary["iso"] = str(exif_dict["ISOSpeedRatings"])
        if "FNumber" in exif_dict:
            exif_summary["aperture"] = f"f/{float(exif_dict['FNumber']):.1f}"
        if "ExposureTime" in exif_dict:
            exif_summary["shutter"] = f"{exif_dict['ExposureTime']}s"

    except Exception as e:
        logger.warning("Could not extract EXIF from %s: %s", key, str(e))

    return exif_summary


def update_dynamo(table, file_id, status, step, extra=None):
    now = datetime.now(timezone.utc).isoformat()
    update_expr = "SET #s = :status, pipeline_step = :step, updated_at = :now"
    expr_names = {"#s": "status"}
    expr_values = {":status": status, ":step": step, ":now": now}

    if extra:
        for k, v in extra.items():
            update_expr += f", {k} = :{k}"
            expr_values[f":{k}"] = v

    table.update_item(
        Key={"file_id": file_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )
