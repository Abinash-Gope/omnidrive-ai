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
