variable "project_name" {
  description = "Project prefix for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS Region for deployment"
  type        = string
}

variable "raw_bucket_arn" {
  description = "ARN of the raw S3 ingestion bucket"
  type        = string
}

variable "raw_bucket_name" {
  description = "Name of the raw S3 ingestion bucket"
  type        = string
}

variable "processed_bucket_arn" {
  description = "ARN of the processed S3 assets bucket"
  type        = string
}

variable "processed_bucket_name" {
  description = "Name of the processed S3 assets bucket"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the metadata registry DynamoDB table"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the metadata registry DynamoDB table"
  type        = string
}

variable "video_queue_arn" {
  description = "ARN of the SQS video processing queue"
  type        = string
}

variable "video_queue_url" {
  description = "URL of the SQS video processing queue"
  type        = string
}

variable "cloudfront_domain" {
  description = "CloudFront CDN domain distribution name"
  type        = string
}
