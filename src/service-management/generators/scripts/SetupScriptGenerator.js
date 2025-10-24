import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';

export class SetupScriptGenerator extends BaseGenerator {
  constructor(options = {}) {
    super({
      name: 'SetupScriptGenerator',
      description: 'Generates PowerShell setup script',
      outputPath: 'scripts/setup.ps1',
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

    const databaseSetup = confirmedValues.features && confirmedValues.features.database ? `
    Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
    # Database setup would go here
    Write-Host "⚠️  Database setup requires manual configuration" -ForegroundColor Yellow
    ` : `
    Write-Host "ℹ️  Database not required for this service type" -ForegroundColor Gray
    `;

    const content = `#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup ${confirmedValues.displayName} environment

.DESCRIPTION
    Initializes the development environment for ${confirmedValues.displayName}
    Sets up database, configures environment variables, and prepares for development

.EXAMPLE
    .\\scripts\\setup.ps1
#>

Write-Host "🔧 Setting up ${confirmedValues.displayName} development environment" -ForegroundColor Cyan

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
${databaseSetup}

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
`;

    await this.writeFile(join('scripts', 'setup.ps1'), content);
    return join(servicePath, 'scripts', 'setup.ps1');
  }

  validateContext(context) {
    const confirmedValues = context.confirmedValues || context;
    if (!confirmedValues.displayName) {
      throw new Error('SetupScriptGenerator: Missing displayName');
    }
    return true;
  }
}
