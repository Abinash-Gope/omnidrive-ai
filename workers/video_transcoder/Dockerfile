# Multi-stage ARM64 build for FFmpeg Video Transcoder on AWS ECS Fargate
FROM --platform=linux/arm64 python:3.11-slim

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy transcoder worker logic
COPY transcoder.py .

# Non-root security user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

CMD ["python", "transcoder.py"]
