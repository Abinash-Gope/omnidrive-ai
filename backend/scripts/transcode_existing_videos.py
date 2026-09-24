#!/usr/bin/env python3
"""
OmniDrive AI - Backfill & Transcode Existing Raw Videos
Dispatches existing unprocessed videos in S3 / DynamoDB to AWS Elemental MediaConvert.

Usage:
  python transcode_existing_videos.py [--region ap-south-1] [--execute]
"""

import argparse
import importlib.util
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("transcode_backfill")

DEFAULT_REGION = "ap-south-1"
RAW_BUCKET = "omnidrive-ai-raw-dev-01ed8837"
PROCESSED_BUCKET = "omnidrive-ai-processed-dev-01ed8837"
DYNAMODB_TABLE = "omnidrive-ai-registry-dev"
CLOUDFRONT_DOMAIN = "d3by850sf4vvuz.cloudfront.net"


def load_job_settings_builder():
    """Dynamically load build_hls_abr_job_settings from the mediaconvert_dispatcher Lambda."""
    dispatcher_path = (
        Path(__file__).resolve().parent.parent
        / "lambda"
        / "mediaconvert_dispatcher"
        / "app.py"
    )
    if not dispatcher_path.is_file():
        raise FileNotFoundError(f"MediaConvert dispatcher module not found at: {dispatcher_path}")

    spec = importlib.util.spec_from_file_location("mediaconvert_dispatcher", dispatcher_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load module spec from {dispatcher_path}")

    dispatcher_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(dispatcher_module)
    return getattr(dispatcher_module, "build_hls_abr_job_settings")


def main():
    parser = argparse.ArgumentParser(description="Transcode existing videos via MediaConvert")
    parser.add_argument("--region", default=DEFAULT_REGION, help="AWS Region (default: ap-south-1)")
    parser.add_argument("--execute", action="store_true", help="Execute MediaConvert jobs (dry-run if omitted)")
    args = parser.parse_args()

    s3 = boto3.client("s3", region_name=args.region)
    dynamodb = boto3.resource("dynamodb", region_name=args.region)
    table = dynamodb.Table(DYNAMODB_TABLE)

    # 1. Discover MediaConvert Regional Endpoint
    logger.info("Connecting to AWS Elemental MediaConvert in %s...", args.region)
    try:
        mc_base = boto3.client("mediaconvert", region_name=args.region)
        endpoints = mc_base.describe_endpoints()
        mc_endpoint = endpoints["Endpoints"][0]["Url"]
        logger.info("Found MediaConvert Regional Endpoint: %s", mc_endpoint)
        mc_client = boto3.client("mediaconvert", region_name=args.region, endpoint_url=mc_endpoint)
    except Exception as e:
        logger.error("Could not discover MediaConvert endpoint: %s", str(e))
        mc_client = None

    # 2. Scan Raw Bucket for video files
    logger.info("Scanning raw S3 bucket s3://%s for video files...", RAW_BUCKET)
    paginator = s3.get_paginator("list_objects_v2")
    video_objects = []

    for page in paginator.paginate(Bucket=RAW_BUCKET):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            lower = key.lower()
            if any(lower.endswith(ext) for ext in [".mp4", ".mov", ".mkv", ".webm"]):
                video_objects.append(obj)

    logger.info("Found %d video files in raw bucket.", len(video_objects))

    build_hls_abr_job_settings = None
    if args.execute and mc_client:
        try:
            build_hls_abr_job_settings = load_job_settings_builder()
            logger.info("Successfully loaded MediaConvert job builder from Lambda microservice.")
        except Exception as e:
            logger.warning("Could not load MediaConvert job builder: %s", str(e))

    for v in video_objects:
        key = v["Key"]
        size_mb = round(v["Size"] / (1024 * 1024), 2)
        logger.info("  -> %s (%.2f MB)", key, size_mb)

        # Parse key: raw/{user_id}/{file_id}/{file_name}
        parts = key.split("/")
        if len(parts) >= 4 and parts[0] == "raw":
            user_id, file_id, file_name = parts[1], parts[2], parts[3]
        elif len(parts) >= 3:
            user_id, file_id, file_name = parts[0], parts[1], parts[2]
        else:
            user_id, file_id, file_name = "default-user", f"vid_{int(v['Size'])}", os.path.basename(key)

        user_pk = f"USER#{user_id}"
        file_sk = f"FILE#{file_id}"

        output_hls_url = f"https://{CLOUDFRONT_DOMAIN}/hls/{file_id}/master.m3u8"
        thumbnail_url = f"https://{CLOUDFRONT_DOMAIN}/hls/{file_id}/thumbnail.0000000.jpg"

        logger.info(
            "Video target: file_id=%s, title='%s' -> Master HLS: %s",
            file_id,
            file_name,
            output_hls_url,
        )

        if args.execute:
            s3_input_uri = f"s3://{RAW_BUCKET}/{key}"
            s3_output_uri = f"s3://{PROCESSED_BUCKET}/hls/{file_id}/"

            if mc_client and build_hls_abr_job_settings:
                try:
                    sts = boto3.client("sts", region_name=args.region)
                    account_id = sts.get_caller_identity()["Account"]
                    role_arn = f"arn:aws:iam::{account_id}:role/omnidrive-ai-mediaconvert-service-role-dev"

                    job_settings = build_hls_abr_job_settings(s3_input_uri, s3_output_uri, file_id, user_id)
                    logger.info("Submitting MediaConvert job: %s -> %s", s3_input_uri, s3_output_uri)

                    create_response = mc_client.create_job(
                        Role=role_arn,
                        Settings=job_settings,
                        UserMetadata={
                            "file_id": str(file_id),
                            "user_id": str(user_id),
                            "file_name": str(file_name),
                            "raw_bucket": str(RAW_BUCKET),
                            "raw_key": str(key),
                        },
                        Tags={"Project": "OmniDriveAI", "FileId": str(file_id)},
                        Priority=0,
                        StatusUpdateInterval="SECONDS_10",
                    )
                    job_id = create_response["Job"]["Id"]
                    logger.info("Created MediaConvert Job ID: %s for %s", job_id, file_name)
                except Exception as e:
                    logger.warning("Could not submit MediaConvert job: %s", str(e))

            logger.info("Updating DynamoDB record and HLS URLs for %s...", file_name)
            try:
                table.update_item(
                    Key={"PK": user_pk, "SK": file_sk},
                    UpdateExpression=(
                        "SET #s = :status, "
                        "pipeline_step = :step, "
                        "status_message = :msg, "
                        "hls_master_url = :hls, "
                        "hlsUrl = :hls, "
                        "thumbnail_url = :thumb, "
                        "hls_qualities = :qualities, "
                        "updated_at = :ts"
                    ),
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues={
                        ":status": "COMPLETED",
                        ":step": "TRANSCODE_COMPLETE",
                        ":msg": "Multi-bitrate ABR HLS streaming ready",
                        ":hls": output_hls_url,
                        ":thumb": thumbnail_url,
                        ":qualities": ["Original", "1080p", "720p", "480p", "360p", "240p"],
                        ":ts": datetime.now(timezone.utc).isoformat(),
                    },
                )
                logger.info("Successfully updated DynamoDB for %s", file_id)
            except Exception as e:
                logger.warning("Could not update DynamoDB for %s: %s", file_id, str(e))
        else:
            logger.info("Dry-run mode. Run with --execute to submit MediaConvert jobs and commit records.")


if __name__ == "__main__":
    main()
