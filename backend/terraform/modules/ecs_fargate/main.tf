# =========================================================================
# ZERO NAT GATEWAY NETWORKING (Public Subnets with assign_public_ip = true)
# =========================================================================
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Task Security Group (Egress only, zero inbound ports open)
resource "aws_security_group" "fargate_sg" {
  name        = "${var.project_name}-fargate-sg-${var.environment}"
  description = "Egress-only security group for zero-NAT ECS Fargate workers"
  vpc_id      = data.aws_vpc.default.id

  egress {
    description = "Allow all outbound HTTPS/API traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-fargate-sg"
  }
}

# =========================================================================
# ECS CLUSTER
# =========================================================================
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "disabled" # Keep free tier lean
  }
}

# CloudWatch Log Group for container logs
resource "aws_cloudwatch_log_group" "transcoder_logs" {
  name              = "/ecs/${var.project_name}-transcoder-${var.environment}"
  retention_in_days = 7
}

# =========================================================================
# IAM ROLES
# =========================================================================
# 1. Task Execution Role (Pull image, stream logs to CloudWatch)
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# 2. Task Role (Runtime permissions: S3, DynamoDB, SQS)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_policy" "ecs_task_runtime_policy" {
  name        = "${var.project_name}-ecs-runtime-policy-${var.environment}"
  description = "Runtime permissions for FFmpeg video transcoder worker"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3RawAndProcessedAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.raw_bucket_arn,
          "${var.raw_bucket_arn}/*",
          var.processed_bucket_arn,
          "${var.processed_bucket_arn}/*"
        ]
      },
      {
        Sid    = "SQSVideoQueueAccess"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.video_queue_arn]
      },
      {
        Sid    = "DynamoDBUpdateAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_runtime_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_runtime_policy.arn
}

# =========================================================================
# ECS TASK DEFINITION (ARM64 Architecture)
# =========================================================================
resource "aws_ecs_task_definition" "transcoder" {
  family                   = "${var.project_name}-transcoder-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"  # 0.5 vCPU
  memory                   = "1024" # 1 GB RAM
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64" # Graviton pricing efficiency
  }

  container_definitions = jsonencode([
    {
      name      = "video-transcoder"
      image     = "public.ecr.aws/amazonlinux/amazonlinux:2023" # Will be replaced by custom container image
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.transcoder_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ffmpeg"
        }
      }
      environment = [
        { name = "AWS_REGION", value = var.aws_region },
        { name = "RAW_BUCKET_NAME", value = var.raw_bucket_name },
        { name = "PROCESSED_BUCKET_NAME", value = var.processed_bucket_name },
        { name = "DYNAMODB_TABLE_NAME", value = var.dynamodb_table_name },
        { name = "VIDEO_QUEUE_URL", value = var.video_queue_url }
      ]
    }
  ])
}
