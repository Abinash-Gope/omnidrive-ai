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


HLS_QUALITIES = [
    {"name": "Original", "resolution": None, "video_bitrate": "8000k", "audio_bitrate": "256k"},
    {"name": "1080p", "resolution": "1920:1080", "video_bitrate": "3500k", "audio_bitrate": "192k"},
    {"name": "720p", "resolution": "1280:720", "video_bitrate": "1800k", "audio_bitrate": "128k"},
    {"name": "480p", "resolution": "854:480", "video_bitrate": "800k", "audio_bitrate": "96k"},
    {"name": "360p", "resolution": "640:360", "video_bitrate": "400k", "audio_bitrate": "64k"},
    {"name": "240p", "resolution": "426:240", "video_bitrate": "200k", "audio_bitrate": "48k"},
]


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
    user_id = body.get("user_id")
    raw_bucket = body.get("bucket", PROCESSED_BUCKET_NAME)
    raw_key = body.get("key", "")

    user_pk, file_sk = resolve_keys(table, file_id, user_id, raw_key)
    logger.info("Processing video job for %s / %s (s3://%s/%s)", user_pk, file_sk, raw_bucket, raw_key)

    work_dir = f"/tmp/transcode_{file_id}"
    os.makedirs(work_dir, exist_ok=True)
    input_file = os.path.join(work_dir, "input.mp4")
    output_dir = os.path.join(work_dir, "hls")
    os.makedirs(output_dir, exist_ok=True)

    try:
        # 2. Update status to PROCESSING
        update_dynamo(table, user_pk, file_sk, "PROCESSING", "Transcoding into multi-bitrate HLS streams (1080p, 720p, 480p)")

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
            user_pk,
            file_sk,
            "COMPLETED",
            "HLS Adaptive Video Transcoding finished",
            extra={
                "hls_master_url": master_playlist_url,
                "hls_qualities": ["Original", "1080p", "720p", "480p", "360p", "240p"],
                "transcoder_worker": "AWS ECS Fargate ARM64 • FFmpeg 6.1",
            },
        )

        # 7. Delete SQS message
        sqs.delete_message(QueueUrl=VIDEO_QUEUE_URL, ReceiptHandle=receipt_handle)
        logger.info("Successfully completed transcode and deleted message from SQS.")

    except Exception as e:
        logger.error("Transcoding failed for file %s: %s", file_id, str(e), exc_info=True)
        update_dynamo(table, user_pk, file_sk, "FAILED", f"Transcode error: {str(e)}")
        sys.exit(1)
    finally:
        # Clean local scratch space
        shutil.rmtree(work_dir, ignore_errors=True)
        logger.info("Worker task finished. Container stopping naturally.")


def resolve_keys(table, file_id, user_id=None, raw_key=None):
    """Resolves single-table PK (USER#<id>) and SK (FILE#<id>)"""
    if user_id:
        return f"USER#{user_id}", f"FILE#{file_id}"
    if raw_key and raw_key.startswith("raw/"):
        parts = raw_key.split("/")
        if len(parts) >= 3:
            return f"USER#{parts[1]}", f"FILE#{file_id}"
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
        logger.warning("FileLookupIndex query fallback failed: %s", str(e))
    return f"USER#unknown", f"FILE#{file_id}"


def run_ffmpeg_hls(input_path, output_dir):
    """
    Executes FFmpeg generating a 6-tier ladder:
    Variant 0: Original (Source Quality - No Limit)
    Variant 1: 1080p Full HD
    Variant 2: 720p HD
    Variant 3: 480p SD
    Variant 4: 360p Low
    Variant 5: 240p Ultra-Low (3G)
    plus master playlist with 2s independent segments.
    """
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-filter_complex",
        "[0:v]split=6[v0],[v1],[v2],[v3],[v4],[v5]; "
        "[v0]null[v0out]; "
        "[v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease[v1out]; "
        "[v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v2out]; "
        "[v3]scale=w=854:h=480:force_original_aspect_ratio=decrease[v3out]; "
        "[v4]scale=w=640:h=360:force_original_aspect_ratio=decrease[v4out]; "
        "[v5]scale=w=426:h=240:force_original_aspect_ratio=decrease[v5out]",
        # Video streams
        "-map", "[v0out]", "-c:v:0", "libx264", "-b:v:0", "8000k", "-maxrate:v:0", "12000k", "-bufsize:v:0", "16000k",
        "-map", "[v1out]", "-c:v:1", "libx264", "-b:v:1", "3500k", "-maxrate:v:1", "4000k", "-bufsize:v:1", "6000k",
        "-map", "[v2out]", "-c:v:2", "libx264", "-b:v:2", "1800k", "-maxrate:v:2", "2200k", "-bufsize:v:2", "3000k",
        "-map", "[v3out]", "-c:v:3", "libx264", "-b:v:3", "800k",  "-maxrate:v:3", "1000k", "-bufsize:v:3", "1500k",
        "-map", "[v4out]", "-c:v:4", "libx264", "-b:v:4", "400k",  "-maxrate:v:4", "500k",  "-bufsize:v:4", "800k",
        "-map", "[v5out]", "-c:v:5", "libx264", "-b:v:5", "200k",  "-maxrate:v:5", "250k",  "-bufsize:v:5", "400k",
        # Audio streams
        "-map", "0:a:0?", "-c:a:0", "aac", "-b:a:0", "256k",
        "-map", "0:a:0?", "-c:a:1", "aac", "-b:a:1", "192k",
        "-map", "0:a:0?", "-c:a:2", "aac", "-b:a:2", "128k",
        "-map", "0:a:0?", "-c:a:3", "aac", "-b:a:3", "96k",
        "-map", "0:a:0?", "-c:a:4", "aac", "-b:a:4", "64k",
        "-map", "0:a:0?", "-c:a:5", "aac", "-b:a:5", "48k",
        # HLS options & keyframe GOP alignment
        "-preset", "fast",
        "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
        "-f", "hls",
        "-hls_time", "2",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-hls_segment_filename", os.path.join(output_dir, "segment_%v_%03d.ts"),
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", "v:0,a:0? v:1,a:1? v:2,a:2? v:3,a:3? v:4,a:4? v:5,a:5?",
        os.path.join(output_dir, "output_%v.m3u8"),
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


def update_dynamo(table, user_pk, file_sk, status, step, extra=None):
    if not user_pk or not file_sk:
        logger.error("Cannot update DynamoDB: missing user_pk (%s) or file_sk (%s)", user_pk, file_sk)
        return

    now = datetime.now(timezone.utc).isoformat()
    update_expr = "SET #s = :status, pipeline_step = :step, updated_at = :now"
    expr_names = {"#s": "status"}
    expr_values = {":status": status, ":step": step, ":now": now}

    if extra:
        for k, v in extra.items():
            update_expr += f", {k} = :{k}"
            expr_values[f":{k}"] = v

    table.update_item(
        Key={"PK": user_pk, "SK": file_sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )


if __name__ == "__main__":
    main()
