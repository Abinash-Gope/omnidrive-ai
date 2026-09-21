terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
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

# Module 2: DynamoDB Table (Single-table schema: PK, SK, UserStatusIndex, FileLookupIndex)
module "dynamodb" {
  source       = "./modules/dynamodb"
  project_name = var.project_name
  environment  = var.environment
}

# Module 3: SQS Queues & EventBridge Rules (Decoupled Ingestion & Fan-out)
module "sqs_eventbridge" {
  source          = "./modules/sqs_eventbridge"
  project_name    = var.project_name
  environment     = var.environment
  raw_bucket_arn  = module.s3_buckets.raw_bucket_arn
  raw_bucket_name = module.s3_buckets.raw_bucket_name
}

# Module 4: ECS Fargate Task (ARM64 FFmpeg HLS Transcoder, Zero-NAT Public Subnets)
module "ecs_fargate" {
  source                = "./modules/ecs_fargate"
  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  raw_bucket_arn        = module.s3_buckets.raw_bucket_arn
  raw_bucket_name       = module.s3_buckets.raw_bucket_name
  processed_bucket_arn  = module.s3_buckets.processed_bucket_arn
  processed_bucket_name = module.s3_buckets.processed_bucket_name
  dynamodb_table_arn    = module.dynamodb.table_arn
  dynamodb_table_name   = module.dynamodb.table_name
  video_queue_arn       = module.sqs_eventbridge.video_queue_arn
  video_queue_url       = module.sqs_eventbridge.video_queue_url
}

# Module 5: Amazon Cognito (User Pool, Public SPA Client, Hosted UI)
module "cognito" {
  source       = "./modules/cognito"
  project_name = var.project_name
  environment  = var.environment
}

# Module 6: Lambda Microservices (Presigned URL, Files API, Moderation Gate, Vision AI, PDF Summarizer)
module "lambda" {
  source                = "./modules/lambda"
  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  raw_bucket_arn        = module.s3_buckets.raw_bucket_arn
  raw_bucket_name       = module.s3_buckets.raw_bucket_name
  processed_bucket_arn  = module.s3_buckets.processed_bucket_arn
  processed_bucket_name = module.s3_buckets.processed_bucket_name
  dynamodb_table_arn    = module.dynamodb.table_arn
  dynamodb_table_name   = module.dynamodb.table_name
  moderation_queue_arn  = module.sqs_eventbridge.moderation_queue_arn
  moderation_queue_url  = module.sqs_eventbridge.moderation_queue_url
  vision_queue_arn      = module.sqs_eventbridge.vision_queue_arn
  vision_queue_url      = module.sqs_eventbridge.vision_queue_url
  pdf_queue_arn         = module.sqs_eventbridge.pdf_queue_arn
  pdf_queue_url         = module.sqs_eventbridge.pdf_queue_url
  video_queue_arn       = module.sqs_eventbridge.video_queue_arn
  video_queue_url       = module.sqs_eventbridge.video_queue_url
}

# Module 7: API Gateway HTTP API v2 (Cognito JWT Authorizer & Lambda Integrations)
module "api_gateway" {
  source                      = "./modules/api_gateway"
  project_name                = var.project_name
  environment                 = var.environment
  aws_region                  = var.aws_region
  user_pool_arn               = module.cognito.user_pool_arn
  user_pool_endpoint          = module.cognito.user_pool_endpoint
  client_id                   = module.cognito.client_id
  presigned_url_function_arn  = module.lambda.presigned_url_function_arn
  presigned_url_function_name = module.lambda.presigned_url_function_name
  files_api_function_arn      = module.lambda.files_api_function_arn
  files_api_function_name     = module.lambda.files_api_function_name
}
