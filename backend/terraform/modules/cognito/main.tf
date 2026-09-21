resource "random_id" "cognito_suffix" {
  byte_length = 4
}

# =========================================================================
# COGNITO USER POOL: OmniDrive AI Multi-Tenant Identity Store
# =========================================================================
resource "aws_cognito_user_pool" "pool" {
  name = "${var.project_name}-user-pool-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  schema {
    attribute_data_type = "String"
    name                = "name"
    required            = false
    mutable             = true
  }

  tags = {
    Name        = "${var.project_name}-user-pool"
    Environment = var.environment
  }
}

# =========================================================================
# COGNITO IDENTITY PROVIDER: Google Social Federation
# =========================================================================
resource "aws_cognito_identity_provider" "google" {
  count         = var.google_client_id != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "email openid profile"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# =========================================================================
# COGNITO USER POOL CLIENT: Public SPA Web Client (Zero Secret)
# =========================================================================
resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project_name}-web-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret                      = false
  explicit_auth_flows                  = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
  ]
  supported_identity_providers         = var.google_client_id != "" ? ["COGNITO", "Google"] : ["COGNITO"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls

  prevent_user_existence_errors = "ENABLED"

  depends_on = [aws_cognito_identity_provider.google]
}

# =========================================================================
# COGNITO HOSTED UI DOMAIN
# =========================================================================
resource "aws_cognito_user_pool_domain" "domain" {
  domain       = "${var.project_name}-${var.environment}-${random_id.cognito_suffix.hex}"
  user_pool_id = aws_cognito_user_pool.pool.id
}
