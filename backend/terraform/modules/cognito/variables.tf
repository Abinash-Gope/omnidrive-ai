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
