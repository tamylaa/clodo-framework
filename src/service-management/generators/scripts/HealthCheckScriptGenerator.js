import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';

export class HealthCheckScriptGenerator extends BaseGenerator {
  constructor(options = {}) {
    super({
      name: 'HealthCheckScriptGenerator',
      description: 'Generates PowerShell health check script',
      outputPath: 'scripts/health-check.ps1',
      ...options
    });
  }

  shouldGenerate(context) {
    return true;
  }

  async generate(context) {
    const coreInputs = context.coreInputs || context;
    const confirmedValues = context.confirmedValues || context;
    const servicePath = context.servicePath || context.outputDir;

    this.setContext({ coreInputs, confirmedValues, servicePath });

    const content = `#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Health check for ${confirmedValues.displayName}

.DESCRIPTION
    Performs health checks on ${confirmedValues.displayName} service
    Tests endpoints, database connectivity, and overall service health

.PARAMETER Environment
    Target environment to check (development, staging, production)

.EXAMPLE
    .\\scripts\\health-check.ps1 -Environment production
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'development'
)

Write-Host "🏥 Running health checks for ${confirmedValues.displayName} ($Environment)" -ForegroundColor Cyan

# Determine service URL based on environment
$serviceUrl = switch ($Environment) {
    'production' { "${confirmedValues.productionUrl}" }
    'staging' { "${confirmedValues.stagingUrl}" }
    'development' { "${confirmedValues.developmentUrl}" }
}

Write-Host "🌐 Checking service at: $serviceUrl" -ForegroundColor Gray

try {
    # Health check endpoint
    $healthUrl = "$serviceUrl${confirmedValues.healthCheckPath}"
    Write-Host "🔍 Testing health endpoint: $healthUrl" -ForegroundColor Yellow

    $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 30
    if ($response.status -eq 'healthy') {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check failed: $($response | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }

    # API endpoint check
    $apiUrl = "$serviceUrl${confirmedValues.apiBasePath}"
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
`;

    await this.writeFile(join('scripts', 'health-check.ps1'), content);
    return join(servicePath, 'scripts', 'health-check.ps1');
  }

  validateContext(context) {
    const confirmedValues = context.confirmedValues || context;
    const required = ['displayName', 'productionUrl', 'stagingUrl', 'developmentUrl', 'healthCheckPath', 'apiBasePath'];
    const missing = required.filter(field => !confirmedValues[field]);
    
    if (missing.length > 0) {
      throw new Error(`HealthCheckScriptGenerator: Missing fields: ${missing.join(', ')}`);
    }
    return true;
  }
}

