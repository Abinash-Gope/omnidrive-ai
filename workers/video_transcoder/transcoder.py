"""
Video Transcoder Worker: ECS Fargate (ARM64)
Consumes video jobs from SQS, downloads raw video from S3, executes FFmpeg
multi-bitrate HLS (.m3u8) encoding (1080p, 720p, 480p), uploads segments to S3,
updates DynamoDB to COMPLETED, and terminates immediately for $0 idle cost.
"""

import json
import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("video_transcoder")

s3 = boto3.client("s3")
sqs = boto3.client("sqs")
dynamodb = boto3.resource("dynamodb")

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
VIDEO_QUEUE_URL = os.environ.get("VIDEO_QUEUE_URL", "")
PROCESSED_BUCKET_NAME = os.environ.get("PROCESSED_BUCKET_NAME", "omnidrive-ai-processed-dev")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "omnidrive-ai-files-dev")
MAX_WAIT_TIME = 20 # Long poll timeout


def main():
    logger.info("ECS Fargate Transcoder task started. Checking SQS queue: %s", VIDEO_QUEUE_URL)

    if not VIDEO_QUEUE_URL:
        logger.error("VIDEO_QUEUE_URL environment variable is not defined.")
        sys.exit(1)

    table = dynamodb.Table(DYNAMODB_TABLE_NAME)

    # 1. Pull message from SQS (Auto-stop if queue is empty)
    response = sqs.receive_message(
        QueueUrl=VIDEO_QUEUE_URL,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=MAX_WAIT_TIME,
    )

    messages = response.get("Messages", [])
    if not messages:
        logger.info("No messages in queue. Auto-terminating container task to maintain $0 idle cost.")
        sys.exit(0)

    msg = messages[0]
    receipt_handle = msg["ReceiptHandle"]
    body = json.loads(msg["Body"])

    file_id = body.get("file_id")
    raw_bucket = body.get("bucket")
    raw_key = body.get("key")

    logger.info("Processing video job for file_id: %s (s3://%s/%s)", file_id, raw_bucket, raw_key)

    work_dir = f"/tmp/transcode_{file_id}"
    os.makedirs(work_dir, exist_ok=True)
    input_file = os.path.join(work_dir, "input.mp4")
    output_dir = os.path.join(work_dir, "hls")
    os.makedirs(output_dir, exist_ok=True)

    try:
        # 2. Update status to PROCESSING
        update_dynamo(table, file_id, "PROCESSING", "Transcoding into multi-bitrate HLS streams (1080p, 720p, 480p)")

        # 3. Download raw video from S3
        logger.info("Downloading raw S3 asset to local worker: %s", input_file)
        s3.download_file(raw_bucket, raw_key, input_file)

        # 4. Transcode to multi-bitrate HLS streams via FFmpeg
        logger.info("Executing FFmpeg multi-bitrate HLS transcode...")
        run_ffmpeg_hls(input_file, output_dir)

        # 5. Upload HLS segments and playlists to Processed S3 Bucket
        logger.info("Uploading HLS artifacts to S3: s3://%s/hls/%s/", PROCESSED_BUCKET_NAME, file_id)
        s3_prefix = f"hls/{file_id}"
        upload_hls_directory(output_dir, PROCESSED_BUCKET_NAME, s3_prefix)

        master_playlist_url = f"https://{PROCESSED_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_prefix}/master.m3u8"

        # 6. Update DynamoDB to COMPLETED
        update_dynamo(
            table,
            file_id,
            "COMPLETED",
            "HLS Adaptive Video Transcoding finished",
            extra={
                "hls_master_url": master_playlist_url,
                "hls_qualities": ["1080p", "720p", "480p"],
                "transcoder_worker": "AWS ECS Fargate ARM64 • FFmpeg 6.1",
            },
        )

        # 7. Delete SQS message
        sqs.delete_message(QueueUrl=VIDEO_QUEUE_URL, ReceiptHandle=receipt_handle)
        logger.info("Successfully completed transcode and deleted message from SQS.")

    except Exception as e:
        logger.error("Transcoding failed for file %s: %s", file_id, str(e), exc_info=True)
        update_dynamo(table, file_id, "FAILED", f"Transcode error: {str(e)}")
        sys.exit(1)
    finally:
        # Clean local scratch space
        shutil.rmtree(work_dir, ignore_errors=True)
        logger.info("Worker task finished. Container stopping naturally.")


def run_ffmpeg_hls(input_path, output_dir):
    """
    Executes FFmpeg generating 1080p, 720p, and 480p HLS playlists + master playlist.
    """
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        # Variant 0: 1080p
        "-map", "0:v:0", "-map", "0:a:0?", "-b:v:0", "4500k", "-s:v:0", "1920x1080", "-b:a:0", "192k",
        # Variant 1: 720p
        "-map", "0:v:0", "-map", "0:a:0?", "-b:v:1", "2200k", "-s:v:1", "1280x720", "-b:a:1", "128k",
        # Variant 2: 480p
        "-map", "0:v:0", "-map", "0:a:0?", "-b:v:2", "800k", "-s:v:2", "854x480", "-b:a:2", "96k",
        # HLS options
        "-c:v", "libx264", "-c:a", "aac",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", os.path.join(output_dir, "v%v_segment_%03d.ts"),
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", "v:0,a:0? v:1,a:1? v:2,a:2?",
        os.path.join(output_dir, "v%v.m3u8"),
    ]

    logger.info("FFmpeg command: %s", " ".join(cmd))
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        logger.error("FFmpeg error stderr:\n%s", res.stderr)
        raise RuntimeError(f"FFmpeg execution failed with code {res.returncode}")


def upload_hls_directory(local_dir, bucket, s3_prefix):
    for root, _, files in os.walk(local_dir):
        for f in files:
            local_path = os.path.join(root, f)
            rel_path = os.path.relpath(local_path, local_dir)
            s3_key = f"{s3_prefix}/{rel_path.replace(os.path.sep, '/')}"

            content_type = "application/x-mpegURL" if f.endswith(".m3u8") else "video/MP2T"

            s3.upload_file(
                local_path,
                bucket,
                s3_key,
                ExtraArgs={
                    "ContentType": content_type,
                    "CacheControl": "max-age=31536000" if f.endswith(".ts") else "no-cache",
                },
            )


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


if __name__ == "__main__":
    main()
