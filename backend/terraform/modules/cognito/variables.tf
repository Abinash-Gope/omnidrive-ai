variable "project_name" {
  description = "Project name identifier"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "callback_urls" {
  description = "Allowed OAuth callback URLs"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:3000/dashboard"]
}

variable "logout_urls" {
  description = "Allowed OAuth sign-out URLs"
  type        = list(string)
  default     = ["http://localhost:3000"]
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

