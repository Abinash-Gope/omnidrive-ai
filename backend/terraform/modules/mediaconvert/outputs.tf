output "mediaconvert_role_arn" {
  description = "ARN of the IAM role for MediaConvert service"
  value       = aws_iam_role.mediaconvert_service_role.arn
}

output "dispatcher_function_arn" {
  description = "ARN of the MediaConvert dispatcher Lambda function"
  value       = aws_lambda_function.mediaconvert_dispatcher.arn
}

output "complete_function_arn" {
  description = "ARN of the MediaConvert completion Lambda function"
  value       = aws_lambda_function.mediaconvert_complete.arn
}
