# =========================================================================
# OmniDrive AI - AWS Elemental MediaConvert Transcoding Module
# Broadcast-Grade Adaptive Bitrate (ABR) 5-Tier HLS Transcoding Pipeline
# =========================================================================

# 1. Package Lambda Archives
data "archive_file" "mediaconvert_dispatcher_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/mediaconvert_dispatcher"
  output_path = "${path.module}/dist/mediaconvert_dispatcher.zip"
}

data "archive_file" "mediaconvert_complete_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/mediaconvert_complete"
  output_path = "${path.module}/dist/mediaconvert_complete.zip"
}

# =========================================================================
# 2. MediaConvert Service IAM Role (Assumed by mediaconvert.amazonaws.com)
# =========================================================================
data "aws_iam_policy_document" "mediaconvert_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["mediaconvert.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "mediaconvert_service_role" {
  name               = "${var.project_name}-mediaconvert-service-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.mediaconvert_assume_role.json
}

resource "aws_iam_role_policy" "mediaconvert_service_policy" {
  name = "${var.project_name}-mediaconvert-service-policy-${var.environment}"
  role = aws_iam_role.mediaconvert_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:PutObjectAcl"]
        Resource = "${var.processed_bucket_arn}/*"
      }
    ]
  })
}

# =========================================================================
# 3. MediaConvert Dispatcher Lambda (Triggered by SQS video_queue)
# =========================================================================
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "dispatcher_role" {
  name               = "${var.project_name}-mediaconvert-dispatcher-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "dispatcher_policy" {
  name = "${var.project_name}-mediaconvert-dispatcher-policy-${var.environment}"
  role = aws_iam_role.dispatcher_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = var.video_queue_arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem", "dynamodb:GetItem", "dynamodb:Query"]
        Resource = [var.dynamodb_table_arn, "${var.dynamodb_table_arn}/index/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "mediaconvert:DescribeEndpoints",
          "mediaconvert:CreateJob",
          "mediaconvert:GetJob",
          "mediaconvert:ListJobs"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = aws_iam_role.mediaconvert_service_role.arn
      }
    ]
  })
}

resource "aws_lambda_function" "mediaconvert_dispatcher" {
  function_name    = "${var.project_name}-mediaconvert-dispatcher-${var.environment}"
  filename         = data.archive_file.mediaconvert_dispatcher_zip.output_path
  source_code_hash = data.archive_file.mediaconvert_dispatcher_zip.output_base64sha256
  role             = aws_iam_role.dispatcher_role.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME   = var.dynamodb_table_name
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
      MEDIACONVERT_ROLE_ARN = aws_iam_role.mediaconvert_service_role.arn
      CLOUDFRONT_DOMAIN     = var.cloudfront_domain
    }
  }
}

resource "aws_lambda_event_source_mapping" "video_queue_trigger" {
  event_source_arn = var.video_queue_arn
  function_name    = aws_lambda_function.mediaconvert_dispatcher.arn
  batch_size       = 1
  enabled          = true
}

# =========================================================================
# 4. MediaConvert Completion Handler Lambda (Triggered by EventBridge)
# =========================================================================
resource "aws_iam_role" "complete_role" {
  name               = "${var.project_name}-mediaconvert-complete-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "complete_policy" {
  name = "${var.project_name}-mediaconvert-complete-policy-${var.environment}"
  role = aws_iam_role.complete_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem", "dynamodb:GetItem", "dynamodb:Query"]
        Resource = [var.dynamodb_table_arn, "${var.dynamodb_table_arn}/index/*"]
      }
    ]
  })
}

resource "aws_lambda_function" "mediaconvert_complete" {
  function_name    = "${var.project_name}-mediaconvert-complete-${var.environment}"
  filename         = data.archive_file.mediaconvert_complete_zip.output_path
  source_code_hash = data.archive_file.mediaconvert_complete_zip.output_base64sha256
  role             = aws_iam_role.complete_role.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE_NAME   = var.dynamodb_table_name
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
      CLOUDFRONT_DOMAIN     = var.cloudfront_domain
    }
  }
}

# =========================================================================
# 5. Amazon EventBridge Rule: MediaConvert Job State Changes
# =========================================================================
resource "aws_cloudwatch_event_rule" "mediaconvert_state_change" {
  name        = "${var.project_name}-mediaconvert-state-change-${var.environment}"
  description = "Routes AWS Elemental MediaConvert Job State Changes (COMPLETE / ERROR) to handler"

  event_pattern = jsonencode({
    source        = ["aws.mediaconvert"]
    "detail-type" = ["MediaConvert Job State Change"]
    detail = {
      status = ["COMPLETE", "ERROR"]
    }
  })
}

resource "aws_cloudwatch_event_target" "mediaconvert_complete_target" {
  rule      = aws_cloudwatch_event_rule.mediaconvert_state_change.name
  target_id = "MediaConvertCompleteHandler"
  arn       = aws_lambda_function.mediaconvert_complete.arn
}

resource "aws_lambda_permission" "allow_eventbridge_mediaconvert_complete" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mediaconvert_complete.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.mediaconvert_state_change.arn
}
