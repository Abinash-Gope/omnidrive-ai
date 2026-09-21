output "presigned_url_function_arn" {
  value = aws_lambda_function.presigned_url.arn
}

output "presigned_url_function_name" {
  value = aws_lambda_function.presigned_url.function_name
}

output "files_api_function_arn" {
  value = aws_lambda_function.files_api.arn
}

output "files_api_function_name" {
  value = aws_lambda_function.files_api.function_name
}

output "moderation_gate_function_arn" {
  value = aws_lambda_function.moderation_gate.arn
}

output "vision_ai_function_arn" {
  value = aws_lambda_function.vision_ai.arn
}

output "pdf_summarizer_function_arn" {
  value = aws_lambda_function.pdf_summarizer.arn
}
