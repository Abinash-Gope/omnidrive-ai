variable "project_name" {
  description = "Project name identifier"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS deployment region"
  type        = string
}

variable "raw_bucket_arn" {
  description = "ARN of the raw S3 bucket"
  type        = string
}

variable "raw_bucket_name" {
  description = "Name of the raw S3 bucket"
  type        = string
  default     = ""
}

variable "processed_bucket_arn" {
  description = "ARN of the processed S3 bucket"
  type        = string
}

variable "processed_bucket_name" {
  description = "Name of the processed S3 bucket"
  type        = string
  default     = ""
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = ""
}

variable "video_queue_arn" {
  description = "ARN of the video SQS queue"
  type        = string
}

variable "video_queue_url" {
  description = "URL of the video SQS queue"
  type        = string
  default     = ""
}
