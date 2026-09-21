# =========================================================================
# DEAD LETTER QUEUES (DLQs)
# =========================================================================
resource "aws_sqs_queue" "moderation_dlq" {
  name                      = "${var.project_name}-moderation-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "video_dlq" {
  name                      = "${var.project_name}-video-dlq-${var.environment}"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "vision_dlq" {
  name                      = "${var.project_name}-vision-dlq-${var.environment}"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "pdf_dlq" {
  name                      = "${var.project_name}-pdf-dlq-${var.environment}"
  message_retention_seconds = 1209600
}

# =========================================================================
# PRIMARY WORKER SQS QUEUES
# =========================================================================
# 1. Moderation Queue (First gatekeeper receiving all S3 uploads)
resource "aws_sqs_queue" "moderation_queue" {
  name                       = "${var.project_name}-moderation-queue-${var.environment}"
  visibility_timeout_seconds = 90
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.moderation_dlq.arn
    maxReceiveCount     = 3
  })
}

# 2. Video Processing Queue (Consumed by ECS Fargate ARM64 FFmpeg container)
resource "aws_sqs_queue" "video_queue" {
  name                       = "${var.project_name}-video-queue-${var.environment}"
  visibility_timeout_seconds = 900 # 15 minutes for long video transcoding
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.video_dlq.arn
    maxReceiveCount     = 3
  })
}

# 3. Vision AI Queue (Consumed by Rekognition Image Lambda)
resource "aws_sqs_queue" "vision_queue" {
  name                       = "${var.project_name}-vision-queue-${var.environment}"
  visibility_timeout_seconds = 120
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.vision_dlq.arn
    maxReceiveCount     = 3
  })
}

# 4. PDF Summarizer Queue (Consumed by Textract + Bedrock Lambda)
resource "aws_sqs_queue" "pdf_queue" {
  name                       = "${var.project_name}-pdf-queue-${var.environment}"
  visibility_timeout_seconds = 180
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.pdf_dlq.arn
    maxReceiveCount     = 3
  })
}

# =========================================================================
# SQS QUEUE POLICY: Allow EventBridge to publish to Moderation Queue
# =========================================================================
resource "aws_sqs_queue_policy" "moderation_queue_policy" {
  queue_url = aws_sqs_queue.moderation_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowEventBridgeToSendMessage"
        Effect    = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.moderation_queue.arn
      }
    ]
  })
}

# =========================================================================
# EVENTBRIDGE RULE: Trigger on S3 ObjectCreated
# =========================================================================
resource "aws_cloudwatch_event_rule" "s3_upload_rule" {
  name        = "${var.project_name}-s3-upload-rule-${var.environment}"
  description = "Routes direct S3 uploads to the Rekognition safety moderation queue"

  event_pattern = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["Object Created"]
    detail = {
      bucket = {
        name = [var.raw_bucket_name]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "moderation_sqs_target" {
  rule      = aws_cloudwatch_event_rule.s3_upload_rule.name
  target_id = "SendToModerationQueue"
  arn       = aws_sqs_queue.moderation_queue.arn
}
