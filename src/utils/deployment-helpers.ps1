# Lego Framework - Deployment Helper Functions
# Common utilities used by deployment scripts

# Configuration
$ErrorActionPreference = "Stop"

# Import required modules if available
# Import-Module Pester -ErrorAction SilentlyContinue

function Write-DeploymentLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO",
        [string]$Component = "Deployment"
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
    if ($env:LEGO_DEPLOYMENT_LOG) {
        $logMessage | Out-File -FilePath $env:LEGO_DEPLOYMENT_LOG -Append -Encoding UTF8
    }
}

function Test-CloudflareAuth {
    <#
    .SYNOPSIS
        Tests Cloudflare authentication and permissions
    #>
    Write-DeploymentLog "Testing Cloudflare authentication" -Component "Auth"

    try {
        # Test wrangler auth
        $null = & npx wrangler auth status 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Wrangler authentication failed"
        }

        Write-DeploymentLog "Cloudflare authentication successful" -Level "SUCCESS" -Component "Auth"
        return $true
    } catch {
        Write-DeploymentLog "Cloudflare authentication failed: $_" -Level "ERROR" -Component "Auth"
        return $false
    }
}

function Get-CloudflareAccountInfo {
    <#
    .SYNOPSIS
        Gets Cloudflare account information
    #>
    try {
        $accountInfo = & npx wrangler whoami 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to get account info"
        }

        # Parse account information
        $accountId = $accountInfo | Select-String -Pattern "Account ID: (.+)" | ForEach-Object { $_.Matches.Groups[1].Value }
        $accountName = $accountInfo | Select-String -Pattern "Account Name: (.+)" | ForEach-Object { $_.Matches.Groups[1].Value }

        return @{
            AccountId = $accountId
            AccountName = $accountName
        }
    } catch {
        Write-DeploymentLog "Failed to get Cloudflare account info: $_" -Level "ERROR" -Component "Auth"
        return $null
    }
}

function New-D1Database {
    <#
    .SYNOPSIS
        Creates a new D1 database if it doesn't exist
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,

        [Parameter(Mandatory=$false)]
        [string]$LocationHint
    )

    Write-DeploymentLog "Creating D1 database: $DatabaseName" -Component "Database"

    try {
        $createCommand = "npx wrangler d1 create $DatabaseName"
        if ($LocationHint) {
            $createCommand += " --location $LocationHint"
        }

        $result = Invoke-Expression $createCommand 2>&1

        if ($LASTEXITCODE -eq 0) {
            # Extract database ID from result
            $dbId = $result | Select-String -Pattern "database_id = (.+)" | ForEach-Object { $_.Matches.Groups[1].Value }

            Write-DeploymentLog "D1 database created: $DatabaseName (ID: $dbId)" -Level "SUCCESS" -Component "Database"
            return @{
                Success = $true
                DatabaseId = $dbId
                DatabaseName = $DatabaseName
            }
        } else {
            # Check if database already exists
            if ($result -match "already exists") {
                Write-DeploymentLog "D1 database already exists: $DatabaseName" -Level "WARN" -Component "Database"

                # Try to get existing database ID
                $listResult = & npx wrangler d1 list 2>&1
                $existingDb = $listResult | Where-Object { $_ -match $DatabaseName } | Select-Object -First 1

                if ($existingDb -match "(.{32})") {
                    $dbId = $matches[1]
                    return @{
                        Success = $true
                        DatabaseId = $dbId
                        DatabaseName = $DatabaseName
                        Existed = $true
                    }
                }
            }

            throw "Failed to create database: $result"
        }
    } catch {
        Write-DeploymentLog "Failed to create D1 database $DatabaseName`: $_" -Level "ERROR" -Component "Database"
        return @{
            Success = $false
            Error = $_.Exception.Message
            DatabaseName = $DatabaseName
        }
    }
}

function Invoke-D1Migration {
    <#
    .SYNOPSIS
        Runs D1 database migrations
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,

        [Parameter(Mandatory=$false)]
        [string]$MigrationPath = ".\migrations",

        [Parameter(Mandatory=$false)]
        [switch]$Local
    )

    if (-not (Test-Path $MigrationPath)) {
        Write-DeploymentLog "No migrations directory found at: $MigrationPath" -Level "WARN" -Component "Database"
        return @{ Success = $true; Message = "No migrations to run" }
    }

    Write-DeploymentLog "Running D1 migrations for: $DatabaseName" -Component "Database"

    try {
        $migrateCommand = "npx wrangler d1 migrations apply $DatabaseName"
        if ($Local) {
            $migrateCommand += " --local"
        }

        $result = Invoke-Expression $migrateCommand 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-DeploymentLog "D1 migrations completed for: $DatabaseName" -Level "SUCCESS" -Component "Database"
            return @{
                Success = $true
                Output = $result
            }
        } else {
            throw "Migration failed: $result"
        }
    } catch {
        Write-DeploymentLog "D1 migration failed for $DatabaseName`: $_" -Level "ERROR" -Component "Database"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Test-ServiceHealth {
    <#
    .SYNOPSIS
        Tests service health after deployment
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceUrl,

        [Parameter(Mandatory=$false)]
        [int]$TimeoutSeconds = 30,

        [Parameter(Mandatory=$false)]
        [string[]]$HealthEndpoints = @("/health", "/status", "/")
    )

    Write-DeploymentLog "Testing service health at: $ServiceUrl" -Component "Health"

    foreach ($endpoint in $HealthEndpoints) {
        try {
            $testUrl = "$ServiceUrl$endpoint".TrimEnd('/')
            Write-DeploymentLog "Testing endpoint: $testUrl" -Component "Health"

            $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec $TimeoutSeconds -ErrorAction Stop

            if ($response.StatusCode -eq 200) {
                Write-DeploymentLog "Health check passed for: $testUrl" -Level "SUCCESS" -Component "Health"
                return @{
                    Success = $true
                    Endpoint = $endpoint
                    StatusCode = $response.StatusCode
                    ResponseTime = $response.BaseResponse.ResponseTime
                }
            } else {
                Write-DeploymentLog "Health check failed for $testUrl`: Status $($response.StatusCode)" -Level "WARN" -Component "Health"
            }
        } catch {
            Write-DeploymentLog "Health check failed for $testUrl`: $_" -Level "WARN" -Component "Health"
        }
    }

    return @{
        Success = $false
        Error = "All health endpoints failed"
    }
}

function Backup-D1Database {
    <#
    .SYNOPSIS
        Creates a backup of a D1 database
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,

        [Parameter(Mandatory=$false)]
        [string]$BackupPath = ".\backups",

        [Parameter(Mandatory=$false)]
        [switch]$Timestamp
    )

    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }

    $timestamp = if ($Timestamp) { Get-Date -Format "yyyyMMdd-HHmmss" } else { "" }
    $backupFile = Join-Path $BackupPath "$DatabaseName$timestamp.sql"

    Write-DeploymentLog "Creating backup of $DatabaseName to $backupFile" -Component "Backup"

    try {
        # Export database to SQL file
        $exportResult = & npx wrangler d1 export $DatabaseName --local --format=sql --output=$backupFile 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-DeploymentLog "Database backup created: $backupFile" -Level "SUCCESS" -Component "Backup"
            return @{
                Success = $true
                BackupFile = $backupFile
                Size = (Get-Item $backupFile).Length
            }
        } else {
            throw "Backup export failed: $exportResult"
        }
    } catch {
        Write-DeploymentLog "Database backup failed for $DatabaseName`: $_" -Level "ERROR" -Component "Backup"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Get-DeploymentMetrics {
    <#
    .SYNOPSIS
        Collects deployment metrics
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$DeploymentId,

        [Parameter(Mandatory=$false)]
        [hashtable]$CustomMetrics = @{}
    )

    $metrics = @{
        DeploymentId = $DeploymentId
        Timestamp = Get-Date -Format "o"
        Hostname = $env:COMPUTERNAME
        User = $env:USERNAME
        PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        NodeVersion = (& node --version 2>$null) -replace "v", ""
        WranglerVersion = (& npx wrangler --version 2>$null)
    }

    # Add custom metrics
    foreach ($key in $CustomMetrics.Keys) {
        $metrics[$key] = $CustomMetrics[$key]
    }

    return $metrics
}

function Send-DeploymentMetrics {
    <#
    .SYNOPSIS
        Sends deployment metrics to monitoring service
    #>
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Metrics,

        [Parameter(Mandatory=$false)]
        [string]$MetricsEndpoint
    )

    if (-not $MetricsEndpoint) {
        Write-DeploymentLog "No metrics endpoint configured, skipping metrics upload" -Level "WARN" -Component "Metrics"
        return
    }

    try {
        $jsonMetrics = $Metrics | ConvertTo-Json -Depth 10
        $response = Invoke-WebRequest -Uri $MetricsEndpoint -Method POST -Body $jsonMetrics -ContentType "application/json" -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-DeploymentLog "Deployment metrics sent successfully" -Level "SUCCESS" -Component "Metrics"
        } else {
            Write-DeploymentLog "Failed to send metrics: Status $($response.StatusCode)" -Level "WARN" -Component "Metrics"
        }
    } catch {
        Write-DeploymentLog "Failed to send deployment metrics: $_" -Level "WARN" -Component "Metrics"
    }
}

# Export functions for use in other scripts
# End of deployment helpers