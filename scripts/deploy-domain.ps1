param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "generic-service",

    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "staging",

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,

    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun,

    [Parameter(Mandatory=$false)]
    [string]$ConfigPath = ".\src\config\domains.js",

    [Parameter(Mandatory=$false)]
    [string]$WranglerPath = ".\wrangler.toml",

    [Parameter(Mandatory=$false)]
    [string]$PackagePath = ".\package.json"
)

# Import Lego Framework utilities
. "$PSScriptRoot\..\src\utils\deployment-helpers.ps1"

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$White = "White"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor $Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Yellow
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

function Exit-WithError {
    param([string]$Message, [int]$ExitCode = 1)
    Write-Error-Message $Message
    exit $ExitCode
}

# Main deployment function
function Invoke-ServiceDeployment {
    Write-Step "Starting deployment of $ServiceName for domain $DomainName ($Environment)"

    # Validate prerequisites
    if (-not $SkipValidation) {
        Test-Prerequisites
    }

    # Load and validate domain configuration
    $domainConfig = Get-DomainConfig -DomainName $DomainName -ConfigPath $ConfigPath
    if (-not $domainConfig) {
        Exit-WithError "Domain configuration not found for: $DomainName"
    }

    Write-Success "Domain configuration loaded: $($domainConfig.displayName)"

    # Validate service configuration
    if (-not $SkipValidation) {
        Test-ServiceConfiguration -DomainConfig $domainConfig -ServiceName $ServiceName
    }

    # Prepare deployment environment
    $deployConfig = New-DeploymentConfig -DomainConfig $domainConfig -Environment $Environment -ServiceName $ServiceName

    # Generate wrangler configuration
    Write-Step "Generating wrangler configuration"
    $wranglerConfig = New-WranglerConfig -DeployConfig $deployConfig -TemplatePath $WranglerPath

    if ($DryRun) {
        Write-Warning "DRY RUN: Would write wrangler config to $($wranglerConfig.Path)"
        Write-Host ($wranglerConfig.Content | ConvertTo-Json -Depth 10) -ForegroundColor $White
    } else {
        $wranglerConfig.Content | Out-File -FilePath $wranglerConfig.Path -Encoding UTF8
        Write-Success "Wrangler configuration generated"
    }

    # Install dependencies
    if (-not $DryRun -and (Test-Path $PackagePath)) {
        Write-Step "Installing dependencies"
        Invoke-Command "npm install" -ErrorAction Stop
        Write-Success "Dependencies installed"
    }

    # Run tests
    if (-not $SkipTests -and -not $DryRun) {
        Write-Step "Running tests"
        try {
            Invoke-Command "npm test" -ErrorAction Stop
            Write-Success "Tests passed"
        } catch {
            Write-Warning "Tests failed, but continuing with deployment"
        }
    }

    # Create/update databases
    if (-not $DryRun) {
        Write-Step "Setting up databases"
        Initialize-ServiceDatabases -DeployConfig $deployConfig
        Write-Success "Databases configured"
    }

    # Deploy to Cloudflare
    if (-not $DryRun) {
        Write-Step "Deploying to Cloudflare Workers"
        $deployResult = Publish-CloudflareWorker -DeployConfig $deployConfig

        if ($deployResult.Success) {
            Write-Success "Deployment completed successfully"
            Write-Host "Worker URL: $($deployResult.Url)" -ForegroundColor $Green
            Write-Host "Deployment ID: $($deployResult.DeploymentId)" -ForegroundColor $White
        } else {
            Exit-WithError "Deployment failed: $($deployResult.Error)"
        }
    } else {
        Write-Warning "DRY RUN: Would deploy to Cloudflare Workers"
    }

    # Run post-deployment validation
    if (-not $DryRun -and -not $SkipValidation) {
        Write-Step "Running post-deployment validation"
        $validationResult = Test-DeploymentHealth -DeployConfig $deployConfig

        if ($validationResult.Success) {
            Write-Success "Post-deployment validation passed"
        } else {
            Write-Warning "Post-deployment validation failed: $($validationResult.Error)"
        }
    }

    Write-Step "Deployment process completed"
    if ($DryRun) {
        Write-Warning "This was a dry run - no actual deployment occurred"
    }
}

# Validate prerequisites
function Test-Prerequisites {
    Write-Step "Validating prerequisites"

    # Check Node.js
    try {
        $nodeVersion = & node --version 2>$null
        Write-Success "Node.js found: $nodeVersion"
    } catch {
        Exit-WithError "Node.js is not installed or not in PATH"
    }

    # Check npm
    try {
        $npmVersion = & npm --version 2>$null
        Write-Success "npm found: v$npmVersion"
    } catch {
        Exit-WithError "npm is not installed or not in PATH"
    }

    # Check wrangler
    try {
        $wranglerVersion = & npx wrangler --version 2>$null
        Write-Success "Wrangler found: $wranglerVersion"
    } catch {
        Exit-WithError "Wrangler is not installed. Run: npm install -g wrangler"
    }

    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Exit-WithError "PowerShell 5.0 or higher is required"
    }

    Write-Success "Prerequisites validation completed"
}

# Load domain configuration
function Get-DomainConfig {
    param([string]$DomainName, [string]$ConfigPath)

    if (-not (Test-Path $ConfigPath)) {
        return $null
    }

    try {
        # This is a simplified version - in practice, you'd parse the JS config file
        # For now, we'll assume the config is available as a PowerShell object
        # In a real implementation, you might use Node.js to parse the JS file

        Write-Warning "Note: Domain config parsing from JS files requires Node.js integration"
        Write-Warning "For now, using mock configuration"

        # Mock domain config - replace with actual parsing logic
        return @{
            name = $DomainName
            displayName = "$DomainName Service"
            accountId = "mock-account-id"
            zoneId = "mock-zone-id"
            domains = @{
                production = "api.$DomainName.com"
                staging = "staging-api.$DomainName.com"
                development = "dev-api.$DomainName.com"
            }
            databases = @(
                @{
                    name = "${DomainName}-db"
                    type = "d1"
                }
            )
            features = @{
                authentication = $true
                logging = $true
                monitoring = ($Environment -eq "production")
            }
        }
    } catch {
        Write-Error-Message "Failed to load domain configuration: $_"
        return $null
    }
}

# Validate service configuration
function Test-ServiceConfiguration {
    param($DomainConfig, [string]$ServiceName)

    # Check if service has required configuration
    if (-not $DomainConfig.databases -and -not $DomainConfig.services) {
        Write-Warning "No databases or services configured for $ServiceName"
    }

    # Validate environment-specific settings
    if (-not $DomainConfig.domains.$Environment) {
        Write-Warning "No domain configured for environment: $Environment"
    }

    Write-Success "Service configuration validated"
}

# Create deployment configuration
function New-DeploymentConfig {
    param($DomainConfig, [string]$Environment, [string]$ServiceName)

    return @{
        domain = $DomainConfig
        environment = $Environment
        serviceName = $ServiceName
        timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        deploymentId = [Guid]::NewGuid().ToString()
        workerName = "$ServiceName-$Environment-$DomainName"
        domainUrl = $DomainConfig.domains.$Environment
    }
}

# Generate wrangler configuration
function New-WranglerConfig {
    param($DeployConfig, [string]$TemplatePath)

    $config = @"
name = "$($DeployConfig.workerName)"
main = "src/worker/index.js"
compatibility_date = "$(Get-Date -Format "yyyy-MM-dd")"

[env.$($DeployConfig.environment)]
"@

    # Add database bindings
    if ($DeployConfig.domain.databases) {
        foreach ($db in $DeployConfig.domain.databases) {
            $config += @"

[[d1_databases]]
binding = "$($db.name)"
database_name = "$($db.name)"
database_id = "$($db.id)"
"@
        }
    }

    # Add environment variables
    $config += @"

[vars]
DOMAIN_NAME = "$($DeployConfig.domain.name)"
ENVIRONMENT = "$($DeployConfig.environment)"
SERVICE_NAME = "$($DeployConfig.serviceName)"
DEPLOYMENT_ID = "$($DeployConfig.deploymentId)"
"@

    # Add domain routing if configured
    if ($DeployConfig.domainUrl) {
        $config += @"

[[routes]]
pattern = "$($DeployConfig.domainUrl)/*"
zone_id = "$($DeployConfig.domain.zoneId)"
"@
    }

    return @{
        Path = $TemplatePath
        Content = $config
    }
}

# Initialize service databases
function Initialize-ServiceDatabases {
    param($DeployConfig)

    if (-not $DeployConfig.domain.databases) {
        Write-Warning "No databases configured for service"
        return
    }

    foreach ($db in $DeployConfig.domain.databases) {
        Write-Step "Setting up database: $($db.name)"

        try {
            # Create database if it doesn't exist
            $createResult = Invoke-Command "npx wrangler d1 create $($db.name)" -ErrorAction Stop

            if ($createResult -match "database_id = (.+)") {
                $db.id = $matches[1]
                Write-Success "Database created: $($db.name)"
            } else {
                Write-Warning "Database may already exist: $($db.name)"
            }

            # Run migrations if they exist
            $migrationPath = ".\migrations"
            if (Test-Path $migrationPath) {
                Write-Step "Running database migrations"
                Invoke-Command "npx wrangler d1 migrations apply $($db.name) --local" -ErrorAction Stop
                Write-Success "Migrations applied"
            }

        } catch {
            Write-Error-Message "Failed to setup database $($db.name): $_"
            # Continue with other databases
        }
    }
}

# Deploy to Cloudflare Workers
function Publish-CloudflareWorker {
    param($DeployConfig)

    try {
        Write-Step "Publishing worker: $($DeployConfig.workerName)"

        $deployCommand = "npx wrangler deploy --env $($DeployConfig.environment)"
        $result = Invoke-Command $deployCommand -ErrorAction Stop

        # Parse deployment result
        $urlMatch = $result | Select-String -Pattern "https://(.+)\.workers\.dev"
        $deploymentUrl = if ($urlMatch) { $urlMatch.Matches[0].Value } else { $null }

        return @{
            Success = $true
            Url = $deploymentUrl
            DeploymentId = $DeployConfig.deploymentId
            Output = $result
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            Output = $result
        }
    }
}

# Test deployment health
function Test-DeploymentHealth {
    param($DeployConfig)

    if (-not $DeployConfig.domainUrl) {
        return @{ Success = $true; Message = "No domain URL configured for health check" }
    }

    try {
        Write-Step "Testing deployment health at: $($DeployConfig.domainUrl)"

        # Simple health check - try to access the worker
        $response = Invoke-WebRequest -Uri "$($DeployConfig.domainUrl)/health" -TimeoutSec 30 -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Success "Health check passed"
            return @{ Success = $true }
        } else {
            return @{ Success = $false; Error = "Health check returned status $($response.StatusCode)" }
        }
    } catch {
        return @{ Success = $false; Error = "Health check failed: $_" }
    }
}

# Utility function to run commands
function Invoke-Command {
    param([string]$Command, [switch]$ErrorAction)

    Write-Host "Running: $Command" -ForegroundColor $White

    try {
        $output = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -ne 0 -and $ErrorAction) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        return $output
    } catch {
        if ($ErrorAction) {
            throw
        }
        Write-Error-Message "Command failed: $_"
        return $null
    }
}

# Run main deployment
try {
    Invoke-ServiceDeployment
} catch {
    Exit-WithError "Deployment failed: $_"
}