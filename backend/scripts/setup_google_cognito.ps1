# =========================================================================
# OmniDrive AI - Configure Real Google OAuth on AWS Cognito
# Region: ap-south-1 (Mumbai)
# =========================================================================

param (
    [Parameter(Mandatory=$false)]
    [string]$GoogleClientId = "",

    [Parameter(Mandatory=$false)]
    [string]$GoogleClientSecret = "",

    [string]$UserPoolId = "ap-south-1_S6BEWSSAC",
    [string]$ClientId = "4gh5u5t7ckq7bpau1e7q6o0j3k",
    [string]$Region = "ap-south-1",
    [string]$Domain = "omnidrive-ai-dev-6127c51d.auth.ap-south-1.amazoncognito.com"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  OmniDrive AI: AWS Cognito Real Google Sign-In Setup  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Cognito User Pool ID : $UserPoolId"
Write-Host "Cognito Client ID    : $ClientId"
Write-Host "Cognito Domain       : $Domain"
Write-Host "Cognito Redirect URI : https://$Domain/oauth2/idpresponse" -ForegroundColor Green
Write-Host ""

if (-not $GoogleClientId) {
    $GoogleClientId = Read-Host "Enter your Google OAuth Client ID (from Google Cloud Console)"
}

if (-not $GoogleClientSecret) {
    $GoogleClientSecret = Read-Host "Enter your Google OAuth Client Secret (from Google Cloud Console)"
}

if (-not $GoogleClientId -or -not $GoogleClientSecret) {
    Write-Host "Error: Both Google Client ID and Secret are required." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/2] Configuring Google Identity Provider on Cognito User Pool..." -ForegroundColor Yellow

# Check if provider exists
$existing = aws cognito-idp describe-identity-provider --user-pool-id $UserPoolId --provider-name Google --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Google Provider already exists. Updating credentials..." -ForegroundColor Yellow
    aws cognito-idp update-identity-provider `
        --user-pool-id $UserPoolId `
        --provider-name Google `
        --provider-details client_id="$GoogleClientId",client_secret="$GoogleClientSecret",authorize_scopes="email openid profile" `
        --attribute-mapping email=email,name=name,username=sub `
        --region $Region
} else {
    Write-Host "Creating Google Identity Provider in Cognito..." -ForegroundColor Yellow
    aws cognito-idp create-identity-provider `
        --user-pool-id $UserPoolId `
        --provider-name Google `
        --provider-type Google `
        --provider-details client_id="$GoogleClientId",client_secret="$GoogleClientSecret",authorize_scopes="email openid profile" `
        --attribute-mapping email=email,name=name,username=sub `
        --region $Region
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to configure Google Identity Provider on AWS Cognito." -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Updating Cognito User Pool Client to enable Google Sign-In..." -ForegroundColor Yellow

aws cognito-idp update-user-pool-client `
    --user-pool-id $UserPoolId `
    --client-id $ClientId `
    --supported-identity-providers COGNITO Google `
    --callback-urls "http://localhost:3000" "http://localhost:3000/dashboard" `
    --logout-urls "http://localhost:3000" `
    --allowed-oauth-flows-user-pool-client `
    --allowed-oauth-flows code implicit `
    --allowed-oauth-scopes email openid profile `
    --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH `
    --prevent-user-existence-errors ENABLED `
    --region $Region

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " SUCCESS! Real Google Sign-In is now live on AWS Cognito! " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "Make sure you added the Authorized Redirect URI in Google Cloud Console:"
    Write-Host "  https://$Domain/oauth2/idpresponse" -ForegroundColor Cyan
} else {
    Write-Host "Failed to update User Pool Client." -ForegroundColor Red
}
