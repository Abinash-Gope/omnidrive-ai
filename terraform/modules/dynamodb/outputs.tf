output "table_name" {
  description = "Name of the DynamoDB files metadata table"
  value       = aws_dynamodb_table.files.name
}

output "table_arn" {
  description = "ARN of the DynamoDB files metadata table"
  value       = aws_dynamodb_table.files.arn
}
