output "cluster_name" {
  description = "Name of the ECS Fargate cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS Fargate cluster"
  value       = aws_ecs_cluster.main.arn
}

output "task_definition_arn" {
  description = "ARN of the video transcoder task definition"
  value       = aws_ecs_task_definition.transcoder.arn
}

output "security_group_id" {
  description = "Security group ID for ECS Fargate tasks"
  value       = aws_security_group.fargate_sg.id
}
