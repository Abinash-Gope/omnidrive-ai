# ==============================================================================
# OmniDrive AI - Root Terraform Outputs
# ==============================================================================

# API Gateway
output "api_endpoint" {
  description = "Base URL of the HTTP API Gateway"
  value       = module.api_gateway.api_endpoint
}

output "api_id" {
  description = "ID of the HTTP API Gateway"
  value       = module.api_gateway.api_id
}

# Amazon Cognito
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = module.cognito.user_pool_arn
}

output "cognito_client_id" {
  description = "Cognito SPA App Client ID"
  value       = module.cognito.client_id
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI Domain"
  value       = module.cognito.hosted_ui_domain
}

# S3 Buckets
output "raw_bucket_name" {
  description = "Name of the raw ingestion S3 bucket"
  value       = module.s3_buckets.raw_bucket_name
}

output "processed_bucket_name" {
  description = "Name of the processed assets S3 bucket"
  value       = module.s3_buckets.processed_bucket_name
}

# DynamoDB
output "dynamodb_table_name" {
  description = "Name of the single-table DynamoDB registry"
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the single-table DynamoDB registry"
  value       = module.dynamodb.table_arn
}

# SQS Queues
output "moderation_queue_url" {
  description = "URL of the SQS moderation queue"
  value       = module.sqs_eventbridge.moderation_queue_url
}

output "video_queue_url" {
  description = "URL of the SQS video processing queue"
  value       = module.sqs_eventbridge.video_queue_url
}

output "vision_queue_url" {
  description = "URL of the SQS vision processing queue"
  value       = module.sqs_eventbridge.vision_queue_url
}

output "pdf_queue_url" {
  description = "URL of the SQS PDF processing queue"
  value       = module.sqs_eventbridge.pdf_queue_url
}

# ECS Fargate
output "ecs_cluster_name" {
  description = "Name of the ECS Fargate cluster"
  value       = module.ecs_fargate.cluster_name
}
