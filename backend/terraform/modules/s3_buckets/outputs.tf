output "raw_bucket_name" {
  description = "Name of the raw ingestion S3 bucket"
  value       = aws_s3_bucket.raw.id
}

output "raw_bucket_arn" {
  description = "ARN of the raw ingestion S3 bucket"
  value       = aws_s3_bucket.raw.arn
}

output "processed_bucket_name" {
  description = "Name of the processed assets S3 bucket"
  value       = aws_s3_bucket.processed.id
}

output "processed_bucket_arn" {
  description = "ARN of the processed assets S3 bucket"
  value       = aws_s3_bucket.processed.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution for processed assets"
  value       = aws_cloudfront_distribution.processed_cdn.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for processed assets"
  value       = aws_cloudfront_distribution.processed_cdn.id
}
