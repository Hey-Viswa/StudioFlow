# Test Railway Server Deployment

# Replace YOUR_RAILWAY_URL with your actual Railway domain
$RAILWAY_URL = "https://your-railway-app.up.railway.app"

Write-Host "Testing Railway Server..." -ForegroundColor Cyan

# Test health endpoint
Write-Host "`nTesting /api/health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$RAILWAY_URL/api/health" -Method Get
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ Health check failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n" -NoNewline
Write-Host "If health check passed, your server is running!" -ForegroundColor Green
Write-Host "Next step: Add this URL to Vercel as VITE_API_URL" -ForegroundColor Cyan
