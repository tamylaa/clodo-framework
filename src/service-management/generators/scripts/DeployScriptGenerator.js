import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';

/**
 * DeployScriptGenerator
 * 
 * Generates scripts/deploy.ps1 PowerShell deployment script.
 */
export class DeployScriptGenerator extends BaseGenerator {
  constructor(options = {}) {
    super({
      name: 'DeployScriptGenerator',
      description: 'Generates PowerShell deployment script',
      outputPath: 'scripts/deploy.ps1',
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
    Deploy ${confirmedValues.displayName} to Cloudflare

.DESCRIPTION
    Automated deployment script for ${confirmedValues.displayName}
    Handles database setup, worker deployment, and environment configuration

.PARAMETER Environment
    Target environment (development, staging, production)

.PARAMETER SkipTests
    Skip running tests before deployment

.EXAMPLE
    .\\scripts\\deploy.ps1 -Environment production

.EXAMPLE
    .\\scripts\\deploy.ps1 -Environment staging -SkipTests
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'development',

    [Parameter(Mandatory = $false)]
    [switch]$SkipTests
)

Write-Host "🚀 Deploying ${confirmedValues.displayName} to $Environment" -ForegroundColor Cyan

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
    .\\scripts\\health-check.ps1 -Environment $Environment

    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Service URL: ${confirmedValues.productionUrl}" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}
`;

    await this.writeFile(join('scripts', 'deploy.ps1'), content);
    return join(servicePath, 'scripts', 'deploy.ps1');
  }

  validateContext(context) {
    const confirmedValues = context.confirmedValues || context;
    if (!confirmedValues.displayName || !confirmedValues.productionUrl) {
      throw new Error('DeployScriptGenerator: Missing required fields');
    }
    return true;
  }
}
