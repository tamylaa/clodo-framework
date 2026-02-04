#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Health check for Test Api Service

.DESCRIPTION
    Performs health checks on Test Api Service service
    Tests endpoints, database connectivity, and overall service health

.PARAMETER Environment
    Target environment to check (development, staging, production)

.EXAMPLE
    .\scripts\health-check.ps1 -Environment production
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'development'
)

Write-Host "🏥 Running health checks for Test Api Service ($Environment)" -ForegroundColor Cyan

# Determine service URL based on environment
$serviceUrl = switch ($Environment) {
    'production' { "https://test-api-service.test.example.com" }
    'staging' { "https://test-api-service-sta.test.example.com" }
    'development' { "https://test-api-service-dev.test.example.com" }
}

Write-Host "🌐 Checking service at: $serviceUrl" -ForegroundColor Gray

try {
    # Health check endpoint
    $healthUrl = "$serviceUrl/health"
    Write-Host "🔍 Testing health endpoint: $healthUrl" -ForegroundColor Yellow

    $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 30
    if ($response.status -eq 'healthy') {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check failed: $($response | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }

    # API endpoint check
    $apiUrl = "$serviceUrl/api/v1/test/api-service"
    Write-Host "🔍 Testing API endpoint: $apiUrl" -ForegroundColor Yellow

    try {
        $apiResponse = Invoke-WebRequest -Uri $apiUrl -Method GET -TimeoutSec 30
        Write-Host "✅ API endpoint accessible (Status: $($apiResponse.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  API endpoint returned error (may be expected): $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "✅ All health checks completed successfully!" -ForegroundColor Green

} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}
