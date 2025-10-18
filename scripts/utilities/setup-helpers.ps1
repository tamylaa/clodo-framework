# PowerShell Setup Helper Functions
# Interactive setup utilities for Clodo Framework services

function Get-UserInput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,
        
        [Parameter(Mandatory=$false)]
        [string]$DefaultValue = "",
        
        [Parameter(Mandatory=$false)]
        [switch]$Required
    )
    
    do {
        if ($DefaultValue) {
            $userInput = Read-Host "$Prompt [$DefaultValue]"
            if ([string]::IsNullOrEmpty($userInput)) {
                $userInput = $DefaultValue
            }
        } else {
            $userInput = Read-Host $Prompt
        }
        
        if ($Required -and [string]::IsNullOrEmpty($userInput)) {
            Write-Host "This field is required. Please provide a value." -ForegroundColor Red
        }
    } while ($Required -and [string]::IsNullOrEmpty($userInput))
    
    return $userInput
}

function Get-UserChoice {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,
        
        [Parameter(Mandatory=$true)]
        [string[]]$Options,
        
        [Parameter(Mandatory=$false)]
        [int]$DefaultIndex = 0
    )
    
    Write-Host $Prompt -ForegroundColor Yellow
    
    for ($i = 0; $i -lt $Options.Length; $i++) {
        $marker = if ($i -eq $DefaultIndex) { " (default)" } else { "" }
        Write-Host "  $($i + 1). $($Options[$i])$marker" -ForegroundColor White
    }
    
    do {
        $choice = Read-Host "Enter choice (1-$($Options.Length))"
        
        if ([string]::IsNullOrEmpty($choice)) {
            return $Options[$DefaultIndex]
        }
        
        if ([int]::TryParse($choice, [ref]$null)) {
            $index = [int]$choice - 1
            if ($index -ge 0 -and $index -lt $Options.Length) {
                return $Options[$index]
            }
        }
        
        Write-Host "Invalid choice. Please select 1-$($Options.Length)." -ForegroundColor Red
    } while ($true)
}

function Test-ServiceName {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName
    )
    
    if ($ServiceName -notmatch '^[a-z0-9-]+$') {
        return @{
            Valid = $false
            Error = "Service name must contain only lowercase letters, numbers, and hyphens"
        }
    }
    
    if ($ServiceName.Length -lt 3 -or $ServiceName.Length -gt 50) {
        return @{
            Valid = $false
            Error = "Service name must be between 3 and 50 characters"
        }
    }
    
    return @{
        Valid = $true
        Error = $null
    }
}

function Test-DomainName {
    param(
        [Parameter(Mandatory=$true)]
        [string]$DomainName
    )
    
    if ($DomainName -notmatch '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$') {
        return @{
            Valid = $false
            Error = "Domain name format is invalid"
        }
    }
    
    return @{
        Valid = $true
        Error = $null
    }
}

function Show-SetupSummary {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Configuration
    )
    
    Write-Host "`n🔍 Configuration Summary:" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    foreach ($key in $Configuration.Keys) {
        $value = $Configuration[$key]
        if ($key -like "*token*" -or $key -like "*secret*" -or $key -like "*key*") {
            $value = "*" * 8 + $value.Substring([Math]::Max(0, $value.Length - 4))
        }
        Write-Host "  $key`: $value" -ForegroundColor White
    }
    
    Write-Host "`nProceed with this configuration? (y/N)" -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    
    return $confirm -eq 'y' -or $confirm -eq 'Y' -or $confirm -eq 'yes'
}

function New-ServiceDirectory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    
    $servicePath = Join-Path $OutputPath $ServiceName
    
    if (Test-Path $servicePath) {
        Write-Host "Directory already exists: $servicePath" -ForegroundColor Yellow
        Write-Host "Overwrite existing directory? (y/N)" -ForegroundColor Yellow -NoNewline
        $overwrite = Read-Host
        
        if ($overwrite -eq 'y' -or $overwrite -eq 'Y' -or $overwrite -eq 'yes') {
            Remove-Item $servicePath -Recurse -Force
        } else {
            throw "Service directory already exists and user chose not to overwrite"
        }
    }
    
    New-Item -ItemType Directory -Path $servicePath -Force | Out-Null
    Write-Host "✅ Created service directory: $servicePath" -ForegroundColor Green
    
    return $servicePath
}

function Get-ServiceTypeFeatures {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceType
    )
    
    $features = @{
        "data-service" = @("Authentication", "Authorization", "File Storage", "Search", "Filtering", "Pagination")
        "auth-service" = @("Authentication", "Authorization", "User Profiles", "Email Notifications", "Magic Link Auth")
        "content-service" = @("File Storage", "Search", "Filtering", "Pagination", "Caching")
        "api-gateway" = @("Authentication", "Authorization", "Rate Limiting", "Caching", "Monitoring")
        "generic" = @("Logging", "Monitoring", "Error Reporting")
    }
    
    return $features[$ServiceType] -or @()
}

function Show-WelcomeMessage {
    Write-Host @"
🚀 Clodo Framework Interactive Setup Wizard
==========================================

This wizard will guide you through creating a new Clodo service.
You'll be prompted for the following information:

• Service Name (required)
• Service Type (required) 
• Domain Name (required)
• Cloudflare Configuration (required)
• Additional Options (optional)

Press Enter to continue or Ctrl+C to exit...
"@ -ForegroundColor Cyan
    
    Read-Host
}

# Export functions for use by other scripts
Export-ModuleMember -Function *