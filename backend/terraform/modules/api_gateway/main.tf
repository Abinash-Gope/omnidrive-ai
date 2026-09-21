# ==============================================================================
# API Gateway HTTP API v2 (OmniDrive Serverless Ingestion & Registry Gateway)
# ==============================================================================

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-${var.environment}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_credentials = false
    allow_headers     = ["Authorization", "Content-Type", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    allow_methods     = ["GET", "POST", "OPTIONS", "DELETE", "PUT"]
    allow_origins     = ["*"]
    max_age           = 300
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-http-api"
  }
}

# ------------------------------------------------------------------------------
# Cognito JWT Authorizer
# ------------------------------------------------------------------------------
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.http_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-${var.environment}-cognito-authorizer"

  jwt_configuration {
    audience = [var.client_id]
    issuer   = "https://${var.user_pool_endpoint}"
  }
}

# ------------------------------------------------------------------------------
# Integrations (Lambda Proxy 2.0)
# ------------------------------------------------------------------------------
resource "aws_apigatewayv2_integration" "presigned_url" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.presigned_url_function_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "files_api" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.files_api_function_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------
# 1. POST /upload-url -> Presigned URL Generator
resource "aws_apigatewayv2_route" "upload_url" {
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = "POST /upload-url"
  target             = "integrations/${aws_apigatewayv2_integration.presigned_url.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# 2. GET /files -> List User Files
resource "aws_apigatewayv2_route" "get_files" {
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = "GET /files"
  target             = "integrations/${aws_apigatewayv2_integration.files_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# 3. GET /files/{fileId} -> Get Single File Metadata
resource "aws_apigatewayv2_route" "get_file_by_id" {
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = "GET /files/{fileId}"
  target             = "integrations/${aws_apigatewayv2_integration.files_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ------------------------------------------------------------------------------
# Stage ($default with Auto-Deploy)
# ------------------------------------------------------------------------------
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name = "${var.project_name}-${var.environment}-default-stage"
  }
}

# ------------------------------------------------------------------------------
# Lambda Permissions for API Gateway Invocation
# ------------------------------------------------------------------------------
resource "aws_lambda_permission" "api_gateway_presigned" {
  statement_id  = "AllowAPIGatewayInvokePresignedUrl"
  action        = "lambda:InvokeFunction"
  function_name = var.presigned_url_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_files" {
  statement_id  = "AllowAPIGatewayInvokeFilesApi"
  action        = "lambda:InvokeFunction"
  function_name = var.files_api_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
