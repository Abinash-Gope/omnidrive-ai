# =========================================================================
# PACKAGING: Lambda Python Zip Archives
# =========================================================================
data "archive_file" "presigned_url_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/presigned_url"
  output_path = "${path.module}/dist/presigned_url.zip"
}

data "archive_file" "files_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/files"
  output_path = "${path.module}/dist/files.zip"
}

data "archive_file" "moderation_gate_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/moderation_gate"
  output_path = "${path.module}/dist/moderation_gate.zip"
}

data "archive_file" "vision_ai_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/vision_ai"
  output_path = "${path.module}/dist/vision_ai.zip"
}

data "archive_file" "pdf_summarizer_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda/pdf_summarizer"
  output_path = "${path.module}/dist/pdf_summarizer.zip"
}

# =========================================================================
# BASE ASSUME ROLE POLICY FOR LAMBDA
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

# =========================================================================
# 1. PRESIGNED URL GENERATOR LAMBDA
# =========================================================================
resource "aws_iam_role" "presigned_url" {
  name               = "${var.project_name}-presigned-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "presigned_url" {
  name = "${var.project_name}-presigned-policy-${var.environment}"
  role = aws_iam_role.presigned_url.id

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
        Action   = ["s3:PutObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "presigned_url" {
  function_name    = "${var.project_name}-presigned-url-${var.environment}"
  filename         = data.archive_file.presigned_url_zip.output_path
  source_code_hash = data.archive_file.presigned_url_zip.output_base64sha256
  role             = aws_iam_role.presigned_url.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      RAW_BUCKET_NAME         = var.raw_bucket_name
      DYNAMODB_TABLE_NAME     = var.dynamodb_table_name
      URL_EXPIRATION_SECONDS  = "300"
      USE_ACCELERATE_ENDPOINT = "true"
    }
  }
}

# =========================================================================
# 2. FILES REGISTRY & STATUS API LAMBDA
# =========================================================================
resource "aws_iam_role" "files_api" {
  name               = "${var.project_name}-files-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "files_api" {
  name = "${var.project_name}-files-policy-${var.environment}"
  role = aws_iam_role.files_api.id

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
        Action   = ["dynamodb:Query", "dynamodb:GetItem", "dynamodb:DeleteItem"]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:DeleteObject", "s3:GetObject"]
        Resource = [
          "${var.raw_bucket_arn}/*",
          "${var.processed_bucket_arn}/*"
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "files_api" {
  function_name    = "${var.project_name}-files-api-${var.environment}"
  filename         = data.archive_file.files_zip.output_path
  source_code_hash = data.archive_file.files_zip.output_base64sha256
  role             = aws_iam_role.files_api.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
      RAW_BUCKET_NAME     = var.raw_bucket_name
      CLOUDFRONT_DOMAIN   = var.cloudfront_domain
    }
  }
}

# =========================================================================
# 3. SAFETY MODERATION GATEKEEPER LAMBDA
# =========================================================================
resource "aws_iam_role" "moderation_gate" {
  name               = "${var.project_name}-moderation-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "moderation_gate" {
  name = "${var.project_name}-moderation-policy-${var.environment}"
  role = aws_iam_role.moderation_gate.id

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
        Resource = var.moderation_queue_arn
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = [
          var.vision_queue_arn,
          var.pdf_queue_arn,
          var.video_queue_arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:HeadObject", "s3:DeleteObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["rekognition:DetectModerationLabels"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem"]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "moderation_gate" {
  function_name    = "${var.project_name}-moderation-gate-${var.environment}"
  filename         = data.archive_file.moderation_gate_zip.output_path
  source_code_hash = data.archive_file.moderation_gate_zip.output_base64sha256
  role             = aws_iam_role.moderation_gate.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME              = var.dynamodb_table_name
      VISION_QUEUE_URL                 = var.vision_queue_url
      PDF_QUEUE_URL                    = var.pdf_queue_url
      VIDEO_QUEUE_URL                  = var.video_queue_url
      MODERATION_CONFIDENCE_THRESHOLD = "70.0"
    }
  }
}

resource "aws_lambda_event_source_mapping" "moderation_trigger" {
  event_source_arn = var.moderation_queue_arn
  function_name    = aws_lambda_function.moderation_gate.arn
  batch_size       = 5
}

# =========================================================================
# 4. VISION AI WORKER LAMBDA
# =========================================================================
resource "aws_iam_role" "vision_ai" {
  name               = "${var.project_name}-vision-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "vision_ai" {
  name = "${var.project_name}-vision-policy-${var.environment}"
  role = aws_iam_role.vision_ai.id

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
        Resource = var.vision_queue_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${var.processed_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["rekognition:DetectLabels"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem"]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "vision_ai" {
  function_name    = "${var.project_name}-vision-ai-${var.environment}"
  filename         = data.archive_file.vision_ai_zip.output_path
  source_code_hash = data.archive_file.vision_ai_zip.output_base64sha256
  role             = aws_iam_role.vision_ai.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME   = var.dynamodb_table_name
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
      MAX_LABELS            = "10"
      MIN_CONFIDENCE        = "75.0"
    }
  }
}

resource "aws_lambda_event_source_mapping" "vision_trigger" {
  event_source_arn = var.vision_queue_arn
  function_name    = aws_lambda_function.vision_ai.arn
  batch_size       = 5
}

# =========================================================================
# 5. PDF SUMMARIZER (TEXTRACT + BEDROCK) LAMBDA
# =========================================================================
resource "aws_iam_role" "pdf_summarizer" {
  name               = "${var.project_name}-pdf-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "pdf_summarizer" {
  name = "${var.project_name}-pdf-policy-${var.environment}"
  role = aws_iam_role.pdf_summarizer.id

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
        Resource = var.pdf_queue_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["textract:DetectDocumentText"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:*::foundation-model/*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:UpdateItem"]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "pdf_summarizer" {
  function_name    = "${var.project_name}-pdf-summarizer-${var.environment}"
  filename         = data.archive_file.pdf_summarizer_zip.output_path
  source_code_hash = data.archive_file.pdf_summarizer_zip.output_base64sha256
  role             = aws_iam_role.pdf_summarizer.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
      BEDROCK_MODEL_ID    = "anthropic.claude-3-haiku-20240307-v1:0"
    }
  }
}

resource "aws_lambda_event_source_mapping" "pdf_trigger" {
  event_source_arn = var.pdf_queue_arn
  function_name    = aws_lambda_function.pdf_summarizer.arn
  batch_size       = 2
}
