# Lego Framework - Setup Helper Functions
# Common utilities used by setup scripts

# Configuration
$ErrorActionPreference = "Stop"

function Write-SetupLog {
    <#
    .SYNOPSIS
        Logs setup operations with consistent formatting
    #>
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO",
        [string]$Component = "Setup"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Component] [$Level] $Message"

    switch ($Level) {
        "INFO" { Write-Host $logMessage -ForegroundColor White }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
    }

    # Also log to file if log path is set
    if ($env:LEGO_SETUP_LOG) {
        $logMessage | Out-File -FilePath $env:LEGO_SETUP_LOG -Append -Encoding UTF8
    }
}

function Test-NodeJsEnvironment {
    <#
    .SYNOPSIS
        Tests if Node.js environment is properly set up
    #>
    Write-SetupLog "Testing Node.js environment" -Component "Environment"

    try {
        $nodeVersion = & node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Node.js not found"
        }

        $npmVersion = & npm --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "npm not found"
        }

        Write-SetupLog "Node.js $nodeVersion, npm $npmVersion" -Level "SUCCESS" -Component "Environment"

        # Check if package.json exists and is valid
        if (Test-Path "package.json") {
            $null = Get-Content "package.json" -Raw | ConvertFrom-Json
            Write-SetupLog "Valid package.json found" -Level "SUCCESS" -Component "Environment"
        } else {
            Write-SetupLog "No package.json found" -Level "WARN" -Component "Environment"
        }

        return $true
    } catch {
        Write-SetupLog "Node.js environment test failed: $_" -Level "ERROR" -Component "Environment"
        return $false
    }
}

function Test-CloudflareCli {
    <#
    .SYNOPSIS
        Tests if Wrangler CLI is available and authenticated
    #>
    Write-SetupLog "Testing Wrangler CLI" -Component "Cloudflare"

    try {
        $wranglerVersion = & npx wrangler --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Wrangler CLI not found"
        }

        Write-SetupLog "Wrangler $wranglerVersion found" -Level "SUCCESS" -Component "Cloudflare"

        # Test authentication
        $null = & npx wrangler auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-SetupLog "Wrangler authenticated" -Level "SUCCESS" -Component "Cloudflare"
            return $true
        } else {
            Write-SetupLog "Wrangler not authenticated" -Level "WARN" -Component "Cloudflare"
            return $false
        }
    } catch {
        Write-SetupLog "Wrangler CLI test failed: $_" -Level "ERROR" -Component "Cloudflare"
        return $false
    }
}

function New-ServiceFromTemplate {
    <#
    .SYNOPSIS
        Creates a new service from a template
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName,

        [Parameter(Mandatory=$true)]
        [ValidateSet("data-service", "auth-service", "content-service", "api-gateway", "generic")]
        [string]$ServiceType,

        [Parameter(Mandatory=$false)]
        [string]$TemplatePath = "$PSScriptRoot\..\templates",

        [Parameter(Mandatory=$false)]
        [string]$OutputPath = "."
    )

    $templateDir = Join-Path $TemplatePath $ServiceType
    $serviceDir = Join-Path $OutputPath $ServiceName

    if (-not (Test-Path $templateDir)) {
        throw "Template not found: $templateDir"
    }

    Write-SetupLog "Creating service from template: $ServiceType" -Component "Template"

    # Copy template files
    Copy-Item -Path $templateDir -Destination $serviceDir -Recurse -Force

    # Replace template variables
    $templateVars = @{
        "{{SERVICE_NAME}}" = $ServiceName
        "{{SERVICE_TYPE}}" = $ServiceType
        "{{SERVICE_DISPLAY_NAME}}" = ($ServiceName -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) })
        "{{CURRENT_DATE}}" = (Get-Date -Format "yyyy-MM-dd")
        "{{CURRENT_YEAR}}" = (Get-Date -Format "yyyy")
    }

    Get-ChildItem -Path $serviceDir -Recurse -File | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $modified = $false

        foreach ($var in $templateVars.GetEnumerator()) {
            if ($content.Contains($var.Key)) {
                $content = $content.Replace($var.Key, $var.Value)
                $modified = $true
            }
        }

        if ($modified) {
            $content | Out-File $_.FullName -Encoding UTF8 -NoNewline
        }
    }

    Write-SetupLog "Service created from template: $serviceDir" -Level "SUCCESS" -Component "Template"
    return $serviceDir
}

function Register-ServiceDomain {
    <#
    .SYNOPSIS
        Registers a service domain configuration
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName,

        [Parameter(Mandatory=$true)]
        [string]$DomainName,

        [Parameter(Mandatory=$false)]
        [hashtable]$DomainConfig = @{},

        [Parameter(Mandatory=$false)]
        [string]$ConfigPath = ".\src\config\domains.js"
    )

    Write-SetupLog "Registering service domain: $DomainName" -Component "Domain"

    # Load existing domain config
    # Note: In a real implementation, you'd parse the existing JS file
    # For now, we'll create a new configuration

    # Add new domain configuration
    $defaultConfig = @{
        name = $DomainName
        displayName = ($DomainName -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) })
        accountId = ""
        zoneId = ""
        domains = @{
            production = "api.$DomainName.com"
            staging = "staging-api.$DomainName.com"
            development = "dev-api.$DomainName.com"
        }
        services = @($ServiceName)
        databases = @("$ServiceName-db")
        features = @{
            logging = $true
            monitoring = $true
        }
        settings = @{
            environment = "development"
            logLevel = "info"
        }
    }

    # Merge with provided config
    $finalConfig = $defaultConfig
    foreach ($key in $DomainConfig.Keys) {
        if ($DomainConfig[$key] -is [hashtable] -and $finalConfig.ContainsKey($key)) {
            $finalConfig[$key] = $finalConfig[$key] + $DomainConfig[$key]
        } else {
            $finalConfig[$key] = $DomainConfig[$key]
        }
    }

    # Save configuration (simplified - would need proper JS generation)
    $configDir = Split-Path $ConfigPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }

    $configContent = @"
// Domain configuration for $ServiceName
// Generated by Lego Framework Setup

export const domains = {
  '$DomainName': $(ConvertTo-Json $finalConfig -Depth 10)
};
"@

    $configContent | Out-File -FilePath $ConfigPath -Encoding UTF8

    Write-SetupLog "Domain configuration saved: $ConfigPath" -Level "SUCCESS" -Component "Domain"
    return $finalConfig
}

function Install-ServiceDependencies {
    <#
    .SYNOPSIS
        Installs npm dependencies for a service
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServicePath,

        [Parameter(Mandatory=$false)]
        [switch]$Production
    )

    Push-Location $ServicePath

    try {
        Write-SetupLog "Installing dependencies for: $ServicePath" -Component "Dependencies"

        $installCommand = "npm install"
        if ($Production) {
            $installCommand += " --production"
        }

        $result = Invoke-Expression "$installCommand 2>&1"
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed: $result"
        }

        Write-SetupLog "Dependencies installed successfully" -Level "SUCCESS" -Component "Dependencies"
        return $true
    } catch {
        Write-SetupLog "Dependency installation failed: $_" -Level "ERROR" -Component "Dependencies"
        return $false
    } finally {
        Pop-Location
    }
}

function Initialize-ServiceGit {
    <#
    .SYNOPSIS
        Initializes git repository for a service
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServicePath,

        [Parameter(Mandatory=$false)]
        [string]$InitialCommitMessage = "Initial commit - Lego Framework service"
    )

    Push-Location $ServicePath

    try {
        Write-SetupLog "Initializing git repository" -Component "Git"

        # Initialize repository
        $null = & git init 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "git init failed"
        }

        # Add all files
        $null = & git add . 2>&1

        # Initial commit
        $null = & git commit -m $InitialCommitMessage 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "git commit failed"
        }

        Write-SetupLog "Git repository initialized with initial commit" -Level "SUCCESS" -Component "Git"
        return $true
    } catch {
        Write-SetupLog "Git initialization failed: $_" -Level "ERROR" -Component "Git"
        return $false
    } finally {
        Pop-Location
    }
}

function New-ServiceDocumentation {
    <#
    .SYNOPSIS
        Generates documentation for a service
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName,

        [Parameter(Mandatory=$true)]
        [string]$ServiceType,

        [Parameter(Mandatory=$false)]
        [string]$OutputPath = ".\docs",

        [Parameter(Mandatory=$false)]
        [hashtable]$ServiceInfo = @{}
    )

    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }

    Write-SetupLog "Generating documentation for: $ServiceName" -Component "Documentation"

    # Generate README.md
    $readmePath = Join-Path $OutputPath "README.md"
    $readmeContent = @"
# $ServiceName

$(if ($ServiceInfo.Description) { $ServiceInfo.Description } else { "A Lego Framework $ServiceType service" })

## Overview

This service was generated using the Lego Framework and follows established patterns for:
- Domain configuration management
- Feature flag control
- Automated deployment
- Consistent service architecture

## Features

$(if ($ServiceInfo.Features) {
    $ServiceInfo.Features | ForEach-Object { "- $_" }
} else {
    "- Standard Lego Framework features"
})

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## Configuration

### Domain Configuration

Edit `src/config/domains.js` to configure:
- Cloudflare account and zone IDs
- Domain URLs for different environments
- Feature flags
- Database connections

### Environment Variables

Copy `.env.example` to `.env` and configure:
- `DOMAIN_NAME`: Your domain identifier
- `ENVIRONMENT`: development/staging/production
- Service-specific variables

## API Endpoints

$(if ($ServiceType -eq "data-service") {
@"
### Data Service Endpoints

- `GET /health` - Health check
- `GET /api/data` - Retrieve data
- `POST /api/data` - Create data
- `PUT /api/data/:id` - Update data
- `DELETE /api/data/:id` - Delete data
"@
} elseif ($ServiceType -eq "auth-service") {
@"
### Auth Service Endpoints

- `GET /health` - Health check
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
"@
} else {
@"
### Service Endpoints

- `GET /health` - Health check
- Add your service-specific endpoints here
"@
})

## Development

### Available Scripts

- `npm test` - Run tests
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run deploy` - Deploy to Cloudflare

### Project Structure

```
src/
├── config/          # Domain and feature configuration
├── worker/          # Cloudflare Worker entry point
├── routes/          # Route handlers
├── services/        # Business logic services
└── utils/           # Utility functions

scripts/             # Deployment and setup scripts
tests/               # Test files
migrations/          # Database migrations
docs/                # Documentation
```

## Lego Framework

This service uses the Lego Framework for:
- **Domain Configuration**: Centralized configuration management
- **Feature Flags**: Runtime feature toggling
- **Worker Integration**: Consistent service initialization
- **Deployment Automation**: One-command deployment
- **Service Registry**: Cross-service communication

Learn more: [Lego Framework Documentation](../../packages/lego-framework/README.md)

## Contributing

1. Follow the established code patterns
2. Add tests for new features
3. Update documentation
4. Use the Lego Framework utilities

## License

$(if ($ServiceInfo.License) { $ServiceInfo.License } else { "MIT" })
"@

    $readmeContent | Out-File -FilePath $readmePath -Encoding UTF8

    # Generate API documentation
    $apiDocPath = Join-Path $OutputPath "API.md"
    $apiContent = @"
# $ServiceName API Documentation

## Base URL
```
Production:  https://your-domain.com
Staging:     https://staging-your-domain.com
Development: http://localhost:8787
```

## Authentication

$(if ($ServiceType -eq "auth-service") {
@"
This service handles authentication. Use the returned tokens for subsequent requests.
"@ } else {
@"
Include authentication headers as required by your authentication service.
"@ })

## Endpoints

### Health Check

**GET** `/health`

Check service health and get basic information.

**Response:**
```json
{
  "status": "healthy",
  "service": "$ServiceName",
  "version": "1.0.0",
  "features": ["feature1", "feature2"]
}
```

### $(if ($ServiceType -eq "data-service") { "Data Operations" } elseif ($ServiceType -eq "auth-service") { "Authentication" } else { "Service Operations" })

Add your API endpoint documentation here.

## Error Responses

All errors follow this format:
```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {}
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
"@

    $apiContent | Out-File -FilePath $apiDocPath -Encoding UTF8

    Write-SetupLog "Documentation generated: $readmePath, $apiDocPath" -Level "SUCCESS" -Component "Documentation"
}

# Export functions for use in other scripts
# End of setup helpers