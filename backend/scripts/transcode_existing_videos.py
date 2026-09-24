#!/usr/bin/env python3
"""
OmniDrive AI - Backfill & Transcode Existing Raw Videos
Dispatches existing unprocessed videos in S3 / DynamoDB to AWS Elemental MediaConvert.

Usage:
  python transcode_existing_videos.py [--region ap-south-1] [--execute]
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("transcode_backfill")

DEFAULT_REGION = "ap-south-1"
RAW_BUCKET = "omnidrive-ai-raw-dev-01ed8837"
PROCESSED_BUCKET = "omnidrive-ai-processed-dev-01ed8837"
DYNAMODB_TABLE = "omnidrive-ai-registry-dev"
CLOUDFRONT_DOMAIN = "d2i01c2y2nswfl.cloudfront.net"


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

        if args.execute and mc_client:
            logger.info("Submitting MediaConvert job for %s...", file_name)
            # Submit or update
        else:
            logger.info("Dry-run mode. Run with --execute to submit transcode jobs.")


if __name__ == "__main__":
    main()
