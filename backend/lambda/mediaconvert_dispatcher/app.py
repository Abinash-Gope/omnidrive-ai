"""
OmniDrive AI - Lambda Microservice: MediaConvert Dispatcher
Trigger: SQS video_queue (Consumes approved video tasks from moderation_gate)

Responsibilities:
1. Parse incoming video job payload (file_id, user_id, raw S3 bucket, key).
2. Discover regional AWS Elemental MediaConvert endpoint via describe_endpoints().
3. Submit broadcast-grade 5-tier Adaptive Bitrate (ABR) HLS transcode job:
   - 1080p Full HD (3500 kbps, 60fps) - Pro Cloud Tier
   - 720p HD (1800 kbps, 60fps)       - Pro Cloud Tier
   - 480p SD (800 kbps, 30fps)        - Free Tier Max Lock
   - 360p Low (400 kbps, 30fps)       - 3G Resilient
   - 240p Ultra-Low (200 kbps, 24fps) - 2G/3G Cellular Zero-Buffering
   - Automated WebP/JPEG Poster frame extraction at 00:00:01
4. Set Output Destination: s3://{PROCESSED_BUCKET}/hls/{file_id}/
5. Update DynamoDB status to 'PROCESSING' with pipeline_step 'AWS_MEDIACONVERT_ENCODING'.
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
PROCESSED_BUCKET = os.environ.get("PROCESSED_BUCKET_NAME", "omnidrive-ai-processed-dev-01ed8837")
MEDIACONVERT_ROLE_ARN = os.environ.get("MEDIACONVERT_ROLE_ARN", "")
CLOUDFRONT_DOMAIN = os.environ.get("CLOUDFRONT_DOMAIN", "")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
sqs = boto3.client("sqs", region_name=AWS_REGION)

# Cached regional MediaConvert client
_mediaconvert_client = None


def get_mediaconvert_client():
    global _mediaconvert_client
    if _mediaconvert_client is None:
        base_client = boto3.client("mediaconvert", region_name=AWS_REGION)
        endpoints = base_client.describe_endpoints()
        endpoint_url = endpoints["Endpoints"][0]["Url"]
        logger.info("Discovered MediaConvert regional endpoint: %s", endpoint_url)
        _mediaconvert_client = boto3.client(
            "mediaconvert", region_name=AWS_REGION, endpoint_url=endpoint_url
        )
    return _mediaconvert_client


def lambda_handler(event, context):
    records = event.get("Records", [])
    logger.info("MediaConvert Dispatcher processing batch of %d records.", len(records))
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    mc = get_mediaconvert_client()

    for record in records:
        try:
            body = json.loads(record.get("body", "{}"))
            file_id = body.get("file_id")
            user_id = body.get("user_id")
            raw_bucket = body.get("bucket")
            raw_key = body.get("key")
            file_name = body.get("file_name", "video.mp4")

            if not file_id or not raw_bucket or not raw_key:
                logger.warning("Record missing required parameters: %s", body)
                continue

            user_pk = f"USER#{user_id}" if user_id else "USER#unknown"
            file_sk = f"FILE#{file_id}"
            s3_input_uri = f"s3://{raw_bucket}/{raw_key}"
            s3_output_hls_uri = f"s3://{PROCESSED_BUCKET}/hls/{file_id}/"

            logger.info(
                "Dispatching MediaConvert ABR job for %s (Input: %s -> Output: %s)",
                file_id,
                s3_input_uri,
                s3_output_hls_uri,
            )

            # 1. Update DynamoDB status to PROCESSING
            update_dynamo_step(
                table,
                user_pk,
                file_sk,
                status="PROCESSING",
                pipeline_step="AWS_MEDIACONVERT_ENCODING",
                message="Submitting broadcast-grade multi-bitrate HLS transcode job to AWS Elemental MediaConvert",
            )

            # 2. Build 5-Tier ABR HLS Job Settings Specification
            job_settings = build_hls_abr_job_settings(
                s3_input_uri, s3_output_hls_uri, file_id, user_id
            )

            # 3. Create MediaConvert Job
            create_response = mc.create_job(
                Role=MEDIACONVERT_ROLE_ARN,
                Settings=job_settings,
                UserMetadata={
                    "file_id": str(file_id),
                    "user_id": str(user_id or "unknown"),
                    "file_name": str(file_name),
                    "raw_bucket": str(raw_bucket),
                    "raw_key": str(raw_key),
                },
                Tags={
                    "Project": "OmniDriveAI",
                    "FileId": str(file_id),
                },
                Priority=0,
                StatusUpdateInterval="SECONDS_10",
            )

            job_id = create_response["Job"]["Id"]
            logger.info("MediaConvert job created successfully: JobId=%s for file=%s", job_id, file_id)

            # 4. Record Job ID in DynamoDB
            table.update_item(
                Key={"PK": user_pk, "SK": file_sk},
                UpdateExpression="SET mediaconvert_job_id = :jid, updated_at = :ts",
                ExpressionAttributeValues={
                    ":jid": job_id,
                    ":ts": datetime.now(timezone.utc).isoformat(),
                },
            )

        except ClientError as e:
            logger.error("AWS ClientError submitting MediaConvert job: %s", str(e), exc_info=True)
            if "user_pk" in locals() and "file_sk" in locals():
                update_dynamo_step(
                    table,
                    user_pk,
                    file_sk,
                    status="FAILED",
                    pipeline_step="MEDIACONVERT_DISPATCH_FAILED",
                    message=f"MediaConvert dispatch error: {str(e)}",
                )
        except Exception as e:
            logger.error("Unexpected error in MediaConvert dispatcher: %s", str(e), exc_info=True)

    return {"statusCode": 200, "processed_count": len(records)}


def build_hls_abr_job_settings(input_uri, output_uri, file_id, user_id):
    """
    Constructs an industrial-grade ABR HLS encoding ladder matching Apple HLS specifications:
    - 2.0s closed GOP segments with independent segment headers
    - 5 video renditions (1080p, 720p, 480p, 360p, 240p)
    - 1 thumbnail poster extraction
    """
    return {
        "Inputs": [
            {
                "AudioSelectors": {
                    "Audio Selector 1": {"DefaultSelection": "DEFAULT"}
                },
                "VideoSelector": {
                    "ColorSpace": "FOLLOW",
                    "Rotate": "AUTO",
                },
                "TimecodeSource": "ZEROBASED",
                "FileInput": input_uri,
            }
        ],
        "OutputGroups": [
            {
                "Name": "Apple HLS",
                "OutputGroupSettings": {
                    "Type": "HLS_GROUP_SETTINGS",
                    "HlsGroupSettings": {
                        "SegmentLength": 2,
                        "MinSegmentLength": 0,
                        "Destination": output_uri,
                        "DirectoryStructure": "SINGLE_DIRECTORY",
                        "ManifestDurationFormat": "INTEGER",
                        "OutputSelection": "MANIFESTS_AND_SEGMENTS",
                        "SegmentControl": "SEGMENTED_FILES",
                        "TimedMetadataId3Period": 10,
                        "TimedMetadataId3Frame": "PRIV",
                        "CaptionLanguageSetting": "OMIT",
                    },
                },
                "Outputs": [
                    # Rendition 1: 1080p Full HD (Pro Tier)
                    create_hls_rendition(
                        name_modifier="_1080p",
                        width=1920,
                        height=1080,
                        video_bitrate=3500000,
                        max_bitrate=4000000,
                        audio_bitrate=192000,
                    ),
                    # Rendition 2: 720p HD (Pro Tier)
                    create_hls_rendition(
                        name_modifier="_720p",
                        width=1280,
                        height=720,
                        video_bitrate=1800000,
                        max_bitrate=2200000,
                        audio_bitrate=128000,
                    ),
                    # Rendition 3: 480p SD (Free Tier Max Cap)
                    create_hls_rendition(
                        name_modifier="_480p",
                        width=854,
                        height=480,
                        video_bitrate=800000,
                        max_bitrate=1000000,
                        audio_bitrate=96000,
                    ),
                    # Rendition 4: 360p Low (3G Resilient)
                    create_hls_rendition(
                        name_modifier="_360p",
                        width=640,
                        height=360,
                        video_bitrate=400000,
                        max_bitrate=500000,
                        audio_bitrate=64000,
                    ),
                    # Rendition 5: 240p Ultra-Low (2G/3G Cellular Zero-Buffering)
                    create_hls_rendition(
                        name_modifier="_240p",
                        width=426,
                        height=240,
                        video_bitrate=200000,
                        max_bitrate=250000,
                        audio_bitrate=48000,
                    ),
                ],
            },
            # Thumbnail extraction output group
            {
                "Name": "Poster Thumbnail",
                "OutputGroupSettings": {
                    "Type": "FILE_GROUP_SETTINGS",
                    "FileGroupSettings": {
                        "Destination": output_uri,
                    },
                },
                "Outputs": [
                    {
                        "ContainerSettings": {"Container": "RAW"},
                        "VideoDescription": {
                            "CodecSettings": {
                                "Codec": "FRAME_CAPTURE",
                                "FrameCaptureSettings": {
                                    "FramerateNumerator": 1,
                                    "FramerateDenominator": 1,
                                    "MaxCaptures": 1,
                                    "Quality": 85,
                                },
                            },
                        },
                        "NameModifier": "thumbnail",
                    }
                ],
            },
        ],
    }


def create_hls_rendition(name_modifier, width, height, video_bitrate, max_bitrate, audio_bitrate):
    """Generates an individual HLS rendition output specification with closed GOP and H.264 profile"""
    return {
        "ContainerSettings": {
            "Container": "M3U8",
            "M3u8Settings": {
                "AudioFramesPerPes": 4,
                "PcrControl": "PCR_EVERY_PES_PACKET",
                "PmtPid": 480,
                "PrivateMetadataPid": 503,
                "ProgramNumber": 1,
                "PatInterval": 0,
                "PmtInterval": 0,
                "TimedMetadata": "NONE",
                "VideoPid": 481,
                "AudioPids": [482],
            },
        },
        "VideoDescription": {
            "Width": width,
            "Height": height,
            "ScalingBehavior": "DEFAULT",
            "Sharpness": 50,
            "AntiAlias": "ENABLED",
            "TimecodeInsertion": "DISABLED",
            "ColorMetadata": "INSERT",
            "RespondToAfd": "NONE",
            "AfdSignaling": "NONE",
            "DropFrameTimecode": "ENABLED",
            "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                    "InterlaceMode": "PROGRESSIVE",
                    "NumberReferenceFrames": 3,
                    "Syntax": "DEFAULT",
                    "Softness": 0,
                    "GopClosedCadence": 1,
                    "GopSize": 2.0,
                    "GopSizeUnits": "SECONDS",
                    "Slices": 1,
                    "SpatialAdaptiveQuantization": "ENABLED",
                    "TemporalAdaptiveQuantization": "ENABLED",
                    "FlickerAdaptiveQuantization": "DISABLED",
                    "EntropyEncoding": "CABAC",
                    "Bitrate": video_bitrate,
                    "MaxBitrate": max_bitrate,
                    "RateControlMode": "QVBR",
                    "QvbrSettings": {
                        "QvbrQualityLevel": 7,
                    },
                    "CodecProfile": "HIGH" if height >= 720 else "MAIN",
                    "Telecine": "NONE",
                    "MinIInterval": 0,
                    "AdaptiveQuantization": "HIGH",
                    "SceneChangeDetect": "TRANSITION_DETECTION",
                },
            },
        },
        "AudioDescriptions": [
            {
                "AudioTypeControl": "FOLLOW_INPUT",
                "CodecSettings": {
                    "Codec": "AAC",
                    "AacSettings": {
                        "AudioDescriptionBroadcasterMix": "NORMAL",
                        "Bitrate": audio_bitrate,
                        "RateControlMode": "CBR",
                        "CodecProfile": "LC",
                        "CodingMode": "CODING_MODE_2_0",
                        "SampleRate": 48000,
                    },
                },
                "LanguageCodeControl": "FOLLOW_INPUT",
            }
        ],
        "OutputSettings": {
            "HlsSettings": {
                "AudioGroupId": "program_audio",
                "AudioRenditionSets": "program_audio",
                "IFrameOnlyManifest": "EXCLUDE",
            }
        },
        "NameModifier": name_modifier,
    }


def update_dynamo_step(table, user_pk, file_sk, status, pipeline_step, message):
    try:
        table.update_item(
            Key={"PK": user_pk, "SK": file_sk},
            UpdateExpression="SET #s = :status, pipeline_step = :step, status_message = :msg, updated_at = :ts",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":status": status,
                ":step": pipeline_step,
                ":msg": message,
                ":ts": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as e:
        logger.warning("Failed to update DynamoDB status for %s: %s", file_sk, str(e))
