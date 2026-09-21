# =========================================================================
# DYNAMODB TABLE: OmniDrive_Registry (Single-Table Design)
# =========================================================================
# Partition Key (PK): USER#<user_id>
# Sort Key (SK):      FILE#<file_id>
# Global Secondary Index 1 (UserStatusIndex): PK (hash) + status (range)
# Global Secondary Index 2 (FileLookupIndex): file_id (hash) + created_at (range)
# =========================================================================

resource "aws_dynamodb_table" "files" {
  name         = "${var.project_name}-registry-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # On-Demand pricing: $0 baseline when idle

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "file_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI 1: Query User files filtered by processing status
  global_secondary_index {
    name            = "UserStatusIndex"
    hash_key        = "PK"
    range_key       = "status"
    projection_type = "ALL"
  }

  # GSI 2: Query by unique file_id lookup across system
  global_secondary_index {
    name            = "FileLookupIndex"
    hash_key        = "file_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-registry"
    Environment = var.environment
  }
}
