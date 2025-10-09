#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy undefined to Cloudflare

.DESCRIPTION
    Automated deployment script for undefined
    Handles database setup, worker deployment, and environment configuration

.PARAMETER Environment
    Target environment (development, staging, production)

.PARAMETER SkipTests
    Skip running tests before deployment

.EXAMPLE
    .\scripts\deploy.ps1 -Environment production

.EXAMPLE
    .\scripts\deploy.ps1 -Environment staging -SkipTests
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'development',

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests
)

Write-Host "🚀 Deploying undefined to $Environment" -ForegroundColor Cyan

# Load environment variables
if (Test-Path ".env") {
    Write-Host "📄 Loading environment variables from .env" -ForegroundColor Gray
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value)
        }
    }
}

try {
    # Run tests unless skipped
    if (-not $SkipTests) {
        Write-Host "🧪 Running tests..." -ForegroundColor Yellow
        npm test
        if ($LASTEXITCODE -ne 0) {
            throw "Tests failed. Aborting deployment."
        }
    }

    # Lint code
    Write-Host "🔍 Running linter..." -ForegroundColor Yellow
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        throw "Linting failed. Aborting deployment."
    }

    # Deploy to Cloudflare
    Write-Host "☁️  Deploying to Cloudflare Workers..." -ForegroundColor Yellow
    npx wrangler deploy --env $Environment

    if ($LASTEXITCODE -ne 0) {
        throw "Cloudflare deployment failed."
    }

    # Run health check
    Write-Host "🏥 Running health check..." -ForegroundColor Yellow
    .\scripts\health-check.ps1 -Environment $Environment

    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Service URL: undefined" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}
