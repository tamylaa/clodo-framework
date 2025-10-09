#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup undefined environment

.DESCRIPTION
    Initializes the development environment for undefined
    Sets up database, configures environment variables, and prepares for development

.EXAMPLE
    .\scripts\setup.ps1
#>

Write-Host "🔧 Setting up undefined development environment" -ForegroundColor Cyan

try {
    # Check if .env exists
    if (-not (Test-Path ".env")) {
        Write-Host "📄 Creating .env file from template..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env" -Force
        Write-Host "⚠️  Please edit .env file with your actual values" -ForegroundColor Yellow
    }

    # Install dependencies
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install

    # Create database (if configured)
    
    Write-Host "ℹ️  Database not required for this service type" -ForegroundColor Gray
    

    # Run initial build
    Write-Host "🔨 Running initial build..." -ForegroundColor Yellow
    npm run build

    # Run tests
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    npm test

    Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
    Write-Host "🚀 You can now run 'npm run dev' to start development" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    exit 1
}
