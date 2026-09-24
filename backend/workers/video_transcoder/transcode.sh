#!/bin/bash
# =========================================================================
# OmniDrive AI - ECS Fargate HLS Transcoder Engine
# 6-Tier Ladder: Original (Source Quality - No Limit) down to 240p Ultra-Low
# =========================================================================

set -euo pipefail

INPUT_PATH="${1:-/tmp/input.mp4}"
OUTPUT_DIR="${2:-/tmp/hls}"

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

echo "[OmniDrive AI] Initiating 6-Tier HLS Transcode on $INPUT_PATH..."

ffmpeg -y -i "$INPUT_PATH" \
  -filter_complex \
  "[0:v]split=6[v0],[v1],[v2],[v3],[v4],[v5]; \
   [v0]null[v0out]; \
   [v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease[v1out]; \
   [v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease[v2out]; \
   [v3]scale=w=854:h=480:force_original_aspect_ratio=decrease[v3out]; \
   [v4]scale=w=640:h=360:force_original_aspect_ratio=decrease[v4out]; \
   [v5]scale=w=426:h=240:force_original_aspect_ratio=decrease[v5out]" \
  -map "[v0out]" -c:v:0 libx264 -b:v:0 8000k -maxrate:v:0 12000k -bufsize:v:0 16000k \
  -map "[v1out]" -c:v:1 libx264 -b:v:1 3500k -maxrate:v:1 4000k -bufsize:v:1 6000k \
  -map "[v2out]" -c:v:2 libx264 -b:v:2 1800k -maxrate:v:2 2200k -bufsize:v:2 3000k \
  -map "[v3out]" -c:v:3 libx264 -b:v:3 800k  -maxrate:v:3 1000k -bufsize:v:3 1500k \
  -map "[v4out]" -c:v:4 libx264 -b:v:4 400k  -maxrate:v:4 500k  -bufsize:v:4 800k \
  -map "[v5out]" -c:v:5 libx264 -b:v:5 200k  -maxrate:v:5 250k  -bufsize:v:5 400k \
  -map a:0? -c:a:0 aac -b:a:0 256k \
  -map a:0? -c:a:1 aac -b:a:1 192k \
  -map a:0? -c:a:2 aac -b:a:2 128k \
  -map a:0? -c:a:3 aac -b:a:3 96k \
  -map a:0? -c:a:4 aac -b:a:4 64k \
  -map a:0? -c:a:5 aac -b:a:5 48k \
  -preset fast -g 60 -keyint_min 60 -sc_threshold 0 \
  -hls_time 2 \
  -hls_playlist_type vod \
  -hls_flags independent_segments \
  -hls_segment_filename "segment_%v_%03d.ts" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0? v:1,a:1? v:2,a:2? v:3,a:3? v:4,a:4? v:5,a:5?" \
  output_%v.m3u8

echo "[OmniDrive AI] 6-Tier HLS Transcode completed successfully."
