terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Module 1: S3 Buckets (Raw Ingestion + Processed Assets + CORS + EventBridge)
module "s3_buckets" {
  source       = "./modules/s3_buckets"
  project_name = var.project_name
  environment  = var.environment
}

# Module 2: DynamoDB Table (Files Metadata & Job State Machine)
module "dynamodb" {
  source       = "./modules/dynamodb"
  project_name = var.project_name
  environment  = var.environment
}

# Module 3: SQS Queues & EventBridge Rules (Decoupled Ingestion & Fan-out)
module "sqs_eventbridge" {
  source            = "./modules/sqs_eventbridge"
  project_name      = var.project_name
  environment       = var.environment
  raw_bucket_arn    = module.s3_buckets.raw_bucket_arn
  raw_bucket_name   = module.s3_buckets.raw_bucket_name
}

# Module 4: ECS Fargate Task (ARM64 FFmpeg HLS Transcoder, Zero-NAT Public Subnets)
module "ecs_fargate" {
  source               = "./modules/ecs_fargate"
  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  raw_bucket_arn       = module.s3_buckets.raw_bucket_arn
  processed_bucket_arn = module.s3_buckets.processed_bucket_arn
  dynamodb_table_arn   = module.dynamodb.table_arn
  video_queue_arn      = module.sqs_eventbridge.video_queue_arn
}
