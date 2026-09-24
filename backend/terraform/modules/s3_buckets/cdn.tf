# =========================================================================
# OmniDrive AI - CloudFront CDN Distribution with HTTP/3 (QUIC)
# File: terraform/modules/s3_buckets/cdn.tf
# =========================================================================

# Origin Access Control (OAC) for secure S3 bucket access
resource "aws_cloudfront_origin_access_control" "processed_oac" {
  name                              = "${var.project_name}-processed-oac-${var.environment}"
  description                       = "Origin Access Control for processed assets S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution with HTTP/3 (QUIC) for 3G resilience & global edge delivery
resource "aws_cloudfront_distribution" "processed_cdn" {
  origin {
    domain_name              = aws_s3_bucket.processed.bucket_regional_domain_name
    origin_id                = "S3-Processed-Bucket"
    origin_access_control_id = aws_cloudfront_origin_access_control.processed_oac.id
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "OmniDrive AI CloudFront CDN for Processed Media & HLS Assets"
  http_version    = "http2and3" # Enables HTTP/3 (QUIC) to handle packet loss over mobile 3G

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Processed-Bucket"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 24 hours
    max_ttl                = 31536000 # 365 days
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-processed-cdn-${var.environment}"
  }
}
