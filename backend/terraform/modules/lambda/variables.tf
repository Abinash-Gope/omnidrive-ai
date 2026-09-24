variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "raw_bucket_arn" {
  type = string
}

variable "raw_bucket_name" {
  type = string
}

variable "processed_bucket_arn" {
  type = string
}

variable "processed_bucket_name" {
  type = string
}

variable "dynamodb_table_arn" {
  type = string
}

variable "dynamodb_table_name" {
  type = string
}

variable "moderation_queue_arn" {
  type = string
}

variable "moderation_queue_url" {
  type = string
}

variable "vision_queue_arn" {
  type = string
}

variable "vision_queue_url" {
  type = string
}

variable "pdf_queue_arn" {
  type = string
}

variable "pdf_queue_url" {
  type = string
}

variable "video_queue_arn" {
  type = string
}

variable "video_queue_url" {
  type = string
}

variable "cloudfront_domain" {
  type    = string
  default = ""
}
