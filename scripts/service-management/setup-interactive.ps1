param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceName,

    [Parameter(Mandatory=$false)]
    [ValidateSet("data-service", "auth-service", "content-service", "api-gateway", "generic")]
    [string]$ServiceType = "generic",

    [Parameter(Mandatory=$false)]
    [string]$DomainName,

    [Parameter(Mandatory=$false)]
    [switch]$NonInteractive,

    [Parameter(Mandatory=$false)]
    [string]$TemplatePath = ".\templates",

    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "."
)

# Import Lego Framework utilities
. "$PSScriptRoot\..\utilities\deployment-helpers.ps1"
. "$PSScriptRoot\..\utilities\setup-helpers.ps1"

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$White = "White"
$Magenta = "Magenta"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor $Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "WARNING: $Message" -ForegroundColor $Yellow
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Prompt {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor $Magenta -NoNewline
}

function Exit-WithError {
    param([string]$Message, [int]$ExitCode = 1)
    Write-Error-Message $Message
    exit $ExitCode
}

# Main setup function
function Invoke-InteractiveSetup {
    Write-Step "Lego Framework - Interactive Service Setup"
    Write-Host "Welcome to the Lego Framework service setup wizard!" -ForegroundColor $Cyan
    Write-Host "This wizard will help you create a new service with proper configuration.`n" -ForegroundColor $White

    # Gather service information
    $serviceInfo = Get-ServiceInformation
    $domainInfo = Get-DomainInformation
    $cloudflareInfo = Get-CloudflareInformation
    $featureInfo = Get-FeatureConfiguration -ServiceType $serviceInfo.Type

    # Display configuration summary
    Show-ConfigurationSummary -ServiceInfo $serviceInfo -DomainInfo $domainInfo -CloudflareInfo $cloudflareInfo -FeatureInfo $featureInfo

    # Confirm setup
    if (-not $NonInteractive) {
        $confirmation = Get-UserConfirmation "Do you want to proceed with this configuration?"
        if (-not $confirmation) {
            Write-Host "Setup cancelled by user." -ForegroundColor $Yellow
            exit 0
        }
    }

    # Create service structure
    Write-Step "Creating service structure"
    $servicePath = New-ServiceStructure -ServiceInfo $serviceInfo -OutputPath $OutputPath
    Write-Success "Service structure created at: $servicePath"

    # Generate configuration files
    Write-Step "Generating configuration files"
    New-ServiceConfiguration -ServiceInfo $serviceInfo -DomainInfo $domainInfo -CloudflareInfo $cloudflareInfo -FeatureInfo $featureInfo -ServicePath $servicePath
    Write-Success "Configuration files generated"

    # Initialize project
    Write-Step "Initializing project"
    Initialize-ServiceProject -ServicePath $servicePath -ServiceInfo $serviceInfo
    Write-Success "Project initialized"

    # Setup Cloudflare resources
    if (-not $NonInteractive) {
        $setupCloudflare = Get-UserConfirmation "Do you want to set up Cloudflare resources now?"
        if ($setupCloudflare) {
            Write-Step "Setting up Cloudflare resources"
            $cfResult = Initialize-CloudflareResources -ServiceInfo $serviceInfo -DomainInfo $domainInfo -CloudflareInfo $cloudflareInfo
            if ($cfResult.Success) {
                Write-Success "Cloudflare resources configured"
            } else {
                Write-Warning "Cloudflare setup failed: $($cfResult.Error)"
            }
        }
    }

    # Display next steps
    Show-NextSteps -ServiceInfo $serviceInfo -ServicePath $servicePath

    Write-Step "Service setup completed successfully!"
    Write-Host "`n[SUCCESS] Your new Lego service is ready to go!" -ForegroundColor $Green
}

# Gather service information
function Get-ServiceInformation {
    Write-Step "Service Information"

    if ($ServiceName) {
        $name = $ServiceName
    } else {
        Write-Prompt "Enter service name: "
        $name = Read-Host
        if (-not $name) {
            Exit-WithError "Service name is required"
        }
    }

    # Validate service name
    if ($name -notmatch '^[a-z0-9-]+$') {
        Exit-WithError "Service name must contain only lowercase letters, numbers, and hyphens"
    }

    $displayName = Get-UserInput "Display name" "$($name -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) })"
    $description = Get-UserInput "Description" "A Lego Framework service"
    $version = Get-UserInput "Initial version" "1.0.0"
    $author = Get-UserInput "Author" $env:USERNAME

    return @{
        Name = $name
        DisplayName = $displayName
        Description = $description
        Version = $version
        Author = $author
        Type = $ServiceType
    }
}

# Gather domain information
function Get-DomainInformation {
    Write-Step "Domain Configuration"

    if ($DomainName) {
        $name = $DomainName
    } else {
        Write-Prompt "Enter domain name: "
        $name = Read-Host
        if (-not $name) {
            Exit-WithError "Domain name is required"
        }
    }

    $displayName = Get-UserInput "Domain display name" "$($name -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) })"

    Write-Host "Domain URLs:" -ForegroundColor $White
    $productionUrl = Get-UserInput "Production URL" "api.$name.com"
    $stagingUrl = Get-UserInput "Staging URL" "staging-api.$name.com"
    $developmentUrl = Get-UserInput "Development URL" "dev-api.$name.com"

    return @{
        Name = $name
        DisplayName = $displayName
        ProductionUrl = $productionUrl
        StagingUrl = $stagingUrl
        DevelopmentUrl = $developmentUrl
    }
}

# Gather Cloudflare information
function Get-CloudflareInformation {
    Write-Step "Cloudflare Configuration"

    Write-Host "You'll need your Cloudflare account information." -ForegroundColor $White
    Write-Host "You can find this in your Cloudflare dashboard under Account Settings.`n" -ForegroundColor $White

    $accountId = Get-UserInput "Account ID" ""
    $zoneId = Get-UserInput "Zone ID" ""

    if (-not $accountId -or -not $zoneId) {
        Write-Warning "Cloudflare IDs are required for deployment. You can configure them later in the generated config files."
    }

    return @{
        AccountId = $accountId
        ZoneId = $zoneId
    }
}

# Get feature configuration based on service type
function Get-FeatureConfiguration {
    param([string]$ServiceType)

    Write-Step "Feature Configuration"

    $baseFeatures = @{
        logging = $true
        monitoring = $true
        errorReporting = $true
    }

    $serviceSpecificFeatures = switch ($ServiceType) {
        "data-service" {
            @{
                authentication = $true
                authorization = $true
                fileStorage = $true
                search = $true
                filtering = $true
                pagination = $true
            }
        }
        "auth-service" {
            @{
                authentication = $true
                authorization = $true
                userProfiles = $true
                emailNotifications = $true
                magicLinkAuth = $true
            }
        }
        "content-service" {
            @{
                fileStorage = $true
                search = $true
                filtering = $true
                pagination = $true
                caching = $true
            }
        }
        "api-gateway" {
            @{
                authentication = $true
                authorization = $true
                rateLimiting = $true
                caching = $true
                monitoring = $true
            }
        }
        default {
            @{
                authentication = $false
                authorization = $false
            }
        }
    }

    $allFeatures = $baseFeatures + $serviceSpecificFeatures

    Write-Host "Default features for $ServiceType service:" -ForegroundColor $White
    foreach ($feature in $allFeatures.GetEnumerator() | Sort-Object Name) {
        $status = if ($feature.Value) { "[ENABLED]" } else { "[DISABLED]" }
        Write-Host "  $status $($feature.Name)" -ForegroundColor $(if ($feature.Value) { $Green } else { $White })
    }

    Write-Host ""

    if (-not $NonInteractive) {
        Write-Host "You can modify these features later in the generated configuration files." -ForegroundColor $Yellow
    }

    return $allFeatures
}

# Display configuration summary
function Show-ConfigurationSummary {
    param($ServiceInfo, $DomainInfo, $CloudflareInfo, $FeatureInfo)

    Write-Step "Configuration Summary"

    Write-Host "Service:" -ForegroundColor $Cyan
    Write-Host "  Name: $($ServiceInfo.Name)" -ForegroundColor $White
    Write-Host "  Display Name: $($ServiceInfo.DisplayName)" -ForegroundColor $White
    Write-Host "  Type: $($ServiceInfo.Type)" -ForegroundColor $White
    Write-Host "  Version: $($ServiceInfo.Version)" -ForegroundColor $White

    Write-Host "`nDomain:" -ForegroundColor $Cyan
    Write-Host "  Name: $($DomainInfo.Name)" -ForegroundColor $White
    Write-Host "  Production: $($DomainInfo.ProductionUrl)" -ForegroundColor $White
    Write-Host "  Staging: $($DomainInfo.StagingUrl)" -ForegroundColor $White
    Write-Host "  Development: $($DomainInfo.DevelopmentUrl)" -ForegroundColor $White

    Write-Host "`nCloudflare:" -ForegroundColor $Cyan
    Write-Host "  Account ID: $(if ($CloudflareInfo.AccountId) { $CloudflareInfo.AccountId } else { 'Not configured' })" -ForegroundColor $White
    Write-Host "  Zone ID: $(if ($CloudflareInfo.ZoneId) { $CloudflareInfo.ZoneId } else { 'Not configured' })" -ForegroundColor $White

    Write-Host "`nEnabled Features:" -ForegroundColor $Cyan
    $enabledFeatures = $FeatureInfo.GetEnumerator() | Where-Object { $_.Value } | Sort-Object Name
    foreach ($feature in $enabledFeatures) {
        Write-Host "  [ENABLED] $($feature.Name)" -ForegroundColor $Green
    }

    Write-Host ""
}

# Create service directory structure
function New-ServiceStructure {
    param($ServiceInfo, [string]$OutputPath)

    $servicePath = Join-Path $OutputPath $ServiceInfo.Name

    if (Test-Path $servicePath) {
        if (-not $NonInteractive) {
            $overwrite = Get-UserConfirmation "Service directory already exists. Overwrite?"
            if (-not $overwrite) {
                Exit-WithError "Service directory already exists"
            }
            Remove-Item $servicePath -Recurse -Force
        } else {
            Exit-WithError "Service directory already exists: $servicePath"
        }
    }

    # Create directory structure
    $directories = @(
        $servicePath,
        (Join-Path $servicePath "src"),
        (Join-Path $servicePath "src\config"),
        (Join-Path $servicePath "src\worker"),
        (Join-Path $servicePath "src\routes"),
        (Join-Path $servicePath "src\services"),
        (Join-Path $servicePath "scripts"),
        (Join-Path $servicePath "tests"),
        (Join-Path $servicePath "migrations"),
        (Join-Path $servicePath "docs")
    )

    foreach ($dir in $directories) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    return $servicePath
}

# Generate configuration files
function New-ServiceConfiguration {
    param($ServiceInfo, $DomainInfo, $CloudflareInfo, $FeatureInfo, [string]$ServicePath)

    # Generate package.json
    $packageJson = @{
        name = $ServiceInfo.Name
        version = $ServiceInfo.Version
        description = $ServiceInfo.Description
        main = "src/worker/index.js"
        type = "module"
        scripts = @{
            test = "jest"
            deploy = "powershell .\scripts\deploy.ps1"
            setup = "powershell .\scripts\setup.ps1"
        }
        dependencies = @{
            "@tamyla/clodo-framework" = "^1.0.0"
            "wrangler" = "^3.0.0"
        }
        devDependencies = @{
            "jest" = "^29.7.0"
            "@babel/core" = "^7.23.0"
            "@babel/preset-env" = "^7.23.0"
        }
        author = $ServiceInfo.Author
        license = "MIT"
    }

    $packageJson | ConvertTo-Json -Depth 10 | Out-File (Join-Path $ServicePath "package.json") -Encoding UTF8

    # Generate domain configuration
    $featureString = ($FeatureInfo.GetEnumerator() | Where-Object { $_.Value } | ForEach-Object { "      $($_.Name): true," }) -join "`n"
    $domainConfig = @"
import { createDomainConfigSchema } from '@tamyla/clodo-framework';

export const domains = {
  '$($DomainInfo.Name)': {
    ...createDomainConfigSchema(),
    name: '$($DomainInfo.Name)',
    displayName: '$($DomainInfo.DisplayName)',
    accountId: '$($CloudflareInfo.AccountId)',
    zoneId: '$($CloudflareInfo.ZoneId)',
    domains: {
      production: '$($DomainInfo.ProductionUrl)',
      staging: '$($DomainInfo.StagingUrl)',
      development: '$($DomainInfo.DevelopmentUrl)'
    },
    features: {
$($featureString)
    }
  }
};
"@

    $domainConfig | Out-File (Join-Path $ServicePath "src\config\domains.js") -Encoding UTF8

    # Generate wrangler.toml
    $wranglerConfig = @"
name = "$($ServiceInfo.Name)-staging"
main = "src/worker/index.js"
compatibility_date = $(Get-Date -Format "yyyy-MM-dd")

[env.staging]
name = "$($ServiceInfo.Name)-staging"

[env.production]
name = "$($ServiceInfo.Name)-production"

# Database bindings will be added during deployment
# [[d1_databases]]
# binding = "$($ServiceInfo.Name)-db"
# database_name = "$($ServiceInfo.Name)-db"
"@

    $wranglerConfig | Out-File (Join-Path $ServicePath "wrangler.toml") -Encoding UTF8

    # Generate main worker file
    $workerCode = @"
import { initializeService, createFeatureGuard, COMMON_FEATURES } from '@tamyla/clodo-framework';
import { domains } from './config/domains.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize service with Lego Framework
      const service = initializeService(env, domains);

      // Route handling based on service type: $($ServiceInfo.Type)
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: '$($ServiceInfo.Name)',
          version: '$($ServiceInfo.Version)',
          features: service.features
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add your service-specific routes here
      // Example:
      // if (url.pathname.startsWith('/api/')) {
      //   return handleApiRequest(request, env, ctx);
      // }

      return new Response('Lego Service: $($ServiceInfo.DisplayName)', {
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      console.error('Service error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
"@

    $workerCode | Out-File (Join-Path $ServicePath "src\worker\index.js") -Encoding UTF8

    # Generate README.md
    $featureList = ($FeatureInfo.GetEnumerator() | Where-Object { $_.Value } | ForEach-Object { "- $($_.Name)" }) -join "`n"
    $readme = @"
# $($ServiceInfo.DisplayName)

$($ServiceInfo.Description)

## Features

$featureList

## Setup

1. Install dependencies:
   ```bash

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your domain settings in `src/config/domains.js`

3. Deploy to Cloudflare:
   ```bash
   npm run deploy
   ```

## Development

- Start development server: `npm run dev`
- Run tests: `npm test`
- Deploy to staging: `npm run deploy -- --Environment staging`
- Deploy to production: `npm run deploy -- --Environment production`

## Lego Framework

This service is built using the Lego Framework, which provides:
- Domain configuration management
- Feature flag system
- Deployment automation
- Consistent service patterns

Learn more: [Clodo Framework Documentation](../packages/clodo-framework/README.md)
"@

    $readme | Out-File (Join-Path $ServicePath "README.md") -Encoding UTF8
}

# Initialize project
function Initialize-ServiceProject {
    param([string]$ServicePath, $ServiceInfo)

    Push-Location $ServicePath

    try {
        # Initialize git repository
        if (-not (Test-Path ".git")) {
            & git init 2>$null | Out-Null
            Write-Success "Git repository initialized"
        }

        # Create .gitignore
        $gitignore = @"
node_modules/
.env
.env.local
.wrangler/
logs/
*.log
coverage/
.nyc_output/
"@

        $gitignore | Out-File ".gitignore" -Encoding UTF8

        # Create initial .env.example
        $envExample = @"
# Lego Framework Environment Variables
DOMAIN_NAME=$($ServiceInfo.Name)
ENVIRONMENT=development

# Cloudflare Account (configure in src/config/domains.js)
# CLOUDFLARE_ACCOUNT_ID=your-account-id
# CLOUDFLARE_ZONE_ID=your-zone-id

# Service-specific environment variables
"@

        $envExample | Out-File ".env.example" -Encoding UTF8

    } finally {
        Pop-Location
    }
}

# Setup Cloudflare resources
function Initialize-CloudflareResources {
    param($ServiceInfo, $DomainInfo, $CloudflareInfo)

    if (-not $CloudflareInfo.AccountId -or -not $CloudflareInfo.ZoneId) {
        return @{ Success = $false; Error = "Cloudflare credentials not configured" }
    }

    try {
        # Test Cloudflare authentication
        if (-not (Test-CloudflareAuth)) {
            throw "Cloudflare authentication failed"
        }

        # Create D1 database
        $dbResult = New-D1Database -DatabaseName "$($ServiceInfo.Name)-db"
        if (-not $dbResult.Success) {
            throw "Failed to create database: $($dbResult.Error)"
        }

        return @{
            Success = $true
            DatabaseId = $dbResult.DatabaseId
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Display next steps
function Show-NextSteps {
    param($ServiceInfo, [string]$ServicePath)

    Write-Step "Next Steps"

    Write-Host "Your service has been created! Here's what to do next:" -ForegroundColor $Cyan
    Write-Host ""

    Write-Host "1. Navigate to your service:" -ForegroundColor $White
    Write-Host "   cd $ServicePath" -ForegroundColor $Yellow
    Write-Host ""

    Write-Host "2. Install dependencies:" -ForegroundColor $White
    Write-Host "   npm install" -ForegroundColor $Yellow
    Write-Host ""

    Write-Host "3. Configure your domain settings:" -ForegroundColor $White
    Write-Host "   Edit src/config/domains.js" -ForegroundColor $Yellow
    Write-Host ""

    Write-Host "4. Implement your service logic:" -ForegroundColor $White
    Write-Host "   Edit src/worker/index.js" -ForegroundColor $Yellow
    Write-Host ""

    Write-Host "5. Test your service:" -ForegroundColor $White
    Write-Host "   npm test" -ForegroundColor $Yellow
    Write-Host ""

    Write-Host "6. Deploy to staging:" -ForegroundColor $White
    Write-Host "   npm run deploy -- --Environment staging" -ForegroundColor $Yellow
    Write-Host ""

    Write-Host "7. Deploy to production:" -ForegroundColor $White
    Write-Host "   npm run deploy -- --Environment production" -ForegroundColor $Yellow
    Write-Host ""
}

# Helper functions
function Get-UserInput {
    param([string]$Prompt, [string]$DefaultValue = "")

    if ($NonInteractive) {
        return $DefaultValue
    }

    $promptText = $Prompt
    if ($DefaultValue) {
        $promptText += " (default: $DefaultValue)"
    }
    $promptText += ": "

    Write-Prompt $promptText
    $userInput = Read-Host

    return if ($userInput) { $userInput } else { $DefaultValue }
}

function Get-UserConfirmation {
    param([string]$Prompt)

    if ($NonInteractive) {
        return $true
    }

    Write-Prompt "$Prompt (y/N): "
    $response = Read-Host

    return $response -eq 'y' -or $response -eq 'Y'
}

# Run main setup
try {
    Invoke-InteractiveSetup
} catch {
    Exit-WithError "Setup failed: $_"
}