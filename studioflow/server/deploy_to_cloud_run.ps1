# Deploy to Google Cloud Run Script
# Prerequisites: gcloud CLI installed and authenticated

$ErrorActionPreference = "Stop"

# Check if gcloud is installed
if (-not (Get-Command "gcloud" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
}

Write-Host "✅ gcloud CLI found." -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in current directory." -ForegroundColor Red
    exit 1
}

Write-Host "🔄 converting .env to env.yaml for Cloud Run..." -ForegroundColor Cyan

# Read .env and convert to env.yaml format
$envContent = Get-Content ".env"
$envYaml = @()

foreach ($line in $envContent) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
        continue
    }

    # Split by first =
    $parts = $line -split "=", 2
    if ($parts.Length -eq 2) {
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        
        # Remove quotes if present
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        # Skip local-only vars if needed, but for now we include all
        $envYaml += "$key: `"$value`""
    }
}

$envYaml | Out-File "env.yaml" -Encoding UTF8
Write-Host "✅ env.yaml created." -ForegroundColor Green

Write-Host "🚀 Starting Deployment to Cloud Run..." -ForegroundColor Cyan
Write-Host "Service Name: studioflow-backend"
Write-Host "Region: us-central1 (default)"

# Run gcloud deploy
# Note: We use --source . to build from source (requires Cloud Build enabled)
gcloud run deploy studioflow-backend `
    --source . `
    --region us-central1 `
    --allow-unauthenticated `
    --env-vars-file env.yaml

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "Don't forget to clean up env.yaml if it contains secrets."
    # Remove-Item "env.yaml" # Optional: auto-cleanup
} else {
    Write-Host "❌ Deployment Failed." -ForegroundColor Red
}
