output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.pool.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.pool.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.pool.endpoint
}

output "client_id" {
  description = "Client ID for the web application SPA"
  value       = aws_cognito_user_pool_client.client.id
}

output "hosted_ui_domain" {
  description = "Hosted UI domain name"
  value       = "${aws_cognito_user_pool_domain.domain.domain}.auth.${aws_cognito_user_pool.pool.id != "" ? split("_", aws_cognito_user_pool.pool.id)[0] : "us-east-1"}.amazoncognito.com"
}
