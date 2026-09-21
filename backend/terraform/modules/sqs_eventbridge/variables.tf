variable "project_name" {
  description = "Project name identifier"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "raw_bucket_arn" {
  description = "ARN of the raw ingestion S3 bucket"
  type        = string
}

variable "raw_bucket_name" {
  description = "Name of the raw ingestion S3 bucket"
  type        = string
}
