variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "omnidrive-ai"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "google_client_id" {
  description = "Google OAuth Client ID from Google Cloud Console"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret from Google Cloud Console"
  type        = string
  default     = ""
  sensitive   = true
}

