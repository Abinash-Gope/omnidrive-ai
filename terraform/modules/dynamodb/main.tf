resource "aws_dynamodb_table" "files" {
  name         = "${var.project_name}-files-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # On-Demand pricing: $0 baseline when idle
  hash_key     = "file_id"
  range_key    = "created_at"

  attribute {
    name = "file_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI 1: Query by Processing Status (e.g., PENDING, MODERATION_CHECK, APPROVED, COMPLETED, REJECTED)
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI 2: Query by User Workspace
  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-files-table"
  }
}
