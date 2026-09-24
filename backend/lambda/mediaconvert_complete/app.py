"""
OmniDrive AI - Lambda Microservice: MediaConvert Transcode Completion Handler
Trigger: Amazon EventBridge Rule (aws.mediaconvert / MediaConvert Job State Change)

Responsibilities:
1. Parse EventBridge event for MediaConvert Job completion or failure.
2. Extract userMetadata (file_id, user_id, raw_key).
3. IF STATUS == "COMPLETE":
   - Construct CDN URLs:
     hls_master_url: https://{CLOUDFRONT_DOMAIN}/hls/{file_id}/master.m3u8
     thumbnail_url:  https://{CLOUDFRONT_DOMAIN}/hls/{file_id}/thumbnail.0000000.jpg
   - Extract media duration in seconds from outputDetails.
   - Update DynamoDB item to 'COMPLETED' with 5-tier HLS qualities.
4. IF STATUS == "ERROR":
   - Update DynamoDB status to 'FAILED' with CloudWatch error code.
"""

import json
import logging
import os
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-registry-dev")
CLOUDFRONT_DOMAIN = os.environ.get("CLOUDFRONT_DOMAIN", "")
PROCESSED_BUCKET = os.environ.get("PROCESSED_BUCKET_NAME", "omnidrive-ai-processed-dev-01ed8837")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)


def lambda_handler(event, context):
    logger.info("MediaConvert Completion EventBridge event received: %s", json.dumps(event))

    detail = event.get("detail", {})
    status = detail.get("status")
    job_id = detail.get("jobId")
    user_metadata = detail.get("userMetadata", {})

    file_id = user_metadata.get("file_id")
    user_id = user_metadata.get("user_id")

    if not file_id:
        logger.error("Event missing file_id in userMetadata: %s", detail)
        return {"statusCode": 400, "message": "Missing file_id in userMetadata"}

    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    user_pk, file_sk = resolve_keys(table, file_id, user_id)

    timestamp = datetime.now(timezone.utc).isoformat()

    if status == "COMPLETE":
        # Extract duration from outputDetails
        duration_sec = 0
        try:
            output_groups = detail.get("outputGroupDetails", [])
            if output_groups:
                out_details = output_groups[0].get("outputDetails", [])
                if out_details:
                    duration_ms = out_details[0].get("durationInMs", 0)
                    duration_sec = round(duration_ms / 1000, 2)
        except Exception as e:
            logger.warning("Could not extract duration from MediaConvert details: %s", str(e))

        # Build CloudFront Edge CDN or S3 HTTPS links
        base_host = CLOUDFRONT_DOMAIN if CLOUDFRONT_DOMAIN else f"{PROCESSED_BUCKET}.s3.{AWS_REGION}.amazonaws.com"
        hls_master_url = f"https://{base_host}/hls/{file_id}/master.m3u8"
        thumbnail_url = f"https://{base_host}/hls/{file_id}/thumbnail.0000000.jpg"

        logger.info(
            "MediaConvert job COMPLETED for %s. Master HLS URL: %s, Duration: %s sec",
            file_id,
            hls_master_url,
            duration_sec,
        )

        update_expr = (
            "SET #s = :status, "
            "pipeline_step = :step, "
            "status_message = :msg, "
            "hls_master_url = :hls, "
            "hlsUrl = :hls, "
            "thumbnail_url = :thumb, "
            "hls_qualities = :qualities, "
            "transcoder_worker = :worker, "
            "mediaconvert_job_id = :jid, "
            "updated_at = :ts"
        )
        expr_values = {
            ":status": "COMPLETED",
            ":step": "TRANSCODE_COMPLETE",
            ":msg": "AWS Elemental MediaConvert 5-tier ABR HLS streaming ready",
            ":hls": hls_master_url,
            ":thumb": thumbnail_url,
            ":qualities": ["Original", "1080p", "720p", "480p", "360p", "240p"],
            ":worker": "AWS Elemental MediaConvert (Serverless Broadcast)",
            ":jid": job_id,
            ":ts": timestamp,
        }

        if duration_sec > 0:
            update_expr += ", duration = :dur"
            expr_values[":dur"] = duration_sec

        try:
            table.update_item(
                Key={"PK": user_pk, "SK": file_sk},
                UpdateExpression=update_expr,
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues=expr_values,
            )
            logger.info("Successfully updated DynamoDB item %s / %s to COMPLETED", user_pk, file_sk)
        except ClientError as e:
            logger.error("Failed to update DynamoDB to COMPLETED: %s", str(e), exc_info=True)
            return {"statusCode": 500, "message": str(e)}

    elif status == "ERROR":
        error_code = detail.get("errorCode", "UnknownError")
        error_message = detail.get("errorMessage", "MediaConvert transcode error")
        logger.error("MediaConvert job FAILED for %s: Code=%s, Message=%s", file_id, error_code, error_message)

        try:
            table.update_item(
                Key={"PK": user_pk, "SK": file_sk},
                UpdateExpression="SET #s = :status, pipeline_step = :step, status_message = :msg, updated_at = :ts",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":status": "FAILED",
                    ":step": "MEDIACONVERT_FAILED",
                    ":msg": f"Transcode error ({error_code}): {error_message}",
                    ":ts": timestamp,
                },
            )
        except ClientError as e:
            logger.error("Failed to update DynamoDB to FAILED: %s", str(e), exc_info=True)

    return {"statusCode": 200, "file_id": file_id, "status": status}


def resolve_keys(table, file_id, user_id=None):
    """Resolves single-table PK (USER#<id>) and SK (FILE#<id>)"""
    if user_id and user_id != "unknown":
        return f"USER#{user_id}", f"FILE#{file_id}"
    try:
        from boto3.dynamodb.conditions import Key
        resp = table.query(
            IndexName="FileLookupIndex",
            KeyConditionExpression=Key("file_id").eq(file_id),
            Limit=1,
        )
        items = resp.get("Items", [])
        if items:
            return items[0].get("PK"), items[0].get("SK")
    except Exception as e:
        logger.warning("FileLookupIndex query fallback failed in complete handler: %s", str(e))
    return "USER#unknown", f"FILE#{file_id}"
