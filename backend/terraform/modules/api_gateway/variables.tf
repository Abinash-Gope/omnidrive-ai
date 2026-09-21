variable "project_name" {
  description = "Project name identifier"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  type        = string
}

variable "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  type        = string
}

variable "client_id" {
  description = "Client ID for Cognito User Pool application"
  type        = string
}

variable "presigned_url_function_arn" {
  description = "ARN of the presigned URL Lambda function"
  type        = string
}

variable "presigned_url_function_name" {
  description = "Name of the presigned URL Lambda function"
  type        = string
}

variable "files_api_function_arn" {
  description = "ARN of the files API Lambda function"
  type        = string
}

variable "files_api_function_name" {
  description = "Name of the files API Lambda function"
  type        = string
}
