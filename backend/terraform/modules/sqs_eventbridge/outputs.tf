output "moderation_queue_url" {
  value = aws_sqs_queue.moderation_queue.id
}

output "moderation_queue_arn" {
  value = aws_sqs_queue.moderation_queue.arn
}

output "video_queue_url" {
  value = aws_sqs_queue.video_queue.id
}

output "video_queue_arn" {
  value = aws_sqs_queue.video_queue.arn
}

output "vision_queue_url" {
  value = aws_sqs_queue.vision_queue.id
}

output "vision_queue_arn" {
  value = aws_sqs_queue.vision_queue.arn
}

output "pdf_queue_url" {
  value = aws_sqs_queue.pdf_queue.id
}

output "pdf_queue_arn" {
  value = aws_sqs_queue.pdf_queue.arn
}
