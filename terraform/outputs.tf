output "raw_bucket_name" {
  description = "Name of the raw ingestion S3 bucket"
  value       = module.s3_buckets.raw_bucket_name
}

output "processed_bucket_name" {
  description = "Name of the processed assets S3 bucket"
  value       = module.s3_buckets.processed_bucket_name
}

output "dynamodb_table_name" {
  description = "Name of the files metadata DynamoDB table"
  value       = module.dynamodb.table_name
}

output "moderation_queue_url" {
  description = "URL of the SQS moderation queue"
  value       = module.sqs_eventbridge.moderation_queue_url
}

output "video_queue_url" {
  description = "URL of the SQS video processing queue"
  value       = module.sqs_eventbridge.video_queue_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS Fargate cluster"
  value       = module.ecs_fargate.cluster_name
}
