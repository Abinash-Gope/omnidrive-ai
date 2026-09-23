resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# --- RAW INGESTION S3 BUCKET ---
resource "aws_s3_bucket" "raw" {
  bucket        = "${var.project_name}-raw-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "raw" {
  bucket                  = aws_s3_bucket.raw.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Enable EventBridge notifications on raw bucket for decoupled processing
resource "aws_s3_bucket_notification" "raw_eventbridge" {
  bucket      = aws_s3_bucket.raw.id
  eventbridge = true
}

# Enable S3 Transfer Acceleration on raw bucket for edge-routed fast uploads
resource "aws_s3_bucket_accelerate_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id
  status = "Enabled"
}

# --- PROCESSED ASSETS S3 BUCKET ---
resource "aws_s3_bucket" "processed" {
  bucket        = "${var.project_name}-processed-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "processed" {
  bucket = aws_s3_bucket.processed.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "processed" {
  bucket                  = aws_s3_bucket.processed.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "processed" {
  bucket = aws_s3_bucket.processed.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
