# PowerShell Deployment Helper Functions
# Common utilities for Lego Framework deployment scripts

function Write-DeploymentLog {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "Info"    { "White" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        "Success" { "Green" }
        default   { "White" }
    }
    
    Write-Host "[$timestamp] $Level`: $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    param(
        [Parameter(Mandatory=$false)]
        [string[]]$RequiredCommands = @("node", "npm", "wrangler")
    )
    
    Write-DeploymentLog "Checking prerequisites..." "Info"
    
    $allPresent = $true
    foreach ($cmd in $RequiredCommands) {
        try {
            $null = Get-Command $cmd -ErrorAction Stop
            Write-DeploymentLog "✓ $cmd is available" "Success"
        }
        catch {
            Write-DeploymentLog "✗ $cmd is not available" "Error"
            $allPresent = $false
        }
    }
    
    return $allPresent
}

function Test-EnvironmentVariables {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$RequiredVars
    )
    
    Write-DeploymentLog "Checking environment variables..." "Info"
    
    $allPresent = $true
    foreach ($var in $RequiredVars) {
        $value = [System.Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            Write-DeploymentLog "✗ Environment variable $var is not set" "Error"
            $allPresent = $false
        } else {
            Write-DeploymentLog "✓ $var is set" "Success"
        }
    }
    
    return $allPresent
}

function Invoke-SafeCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command,
        
        [Parameter(Mandatory=$false)]
        [string]$WorkingDirectory = $PWD,
        
        [Parameter(Mandatory=$false)]
        [switch]$DryRun
    )
    
    if ($DryRun) {
        Write-DeploymentLog "[DRY RUN] Would execute: $Command" "Warning"
        return @{
            Success = $true
            Output = "[DRY RUN] Command not executed"
        }
    }
    
    try {
        Write-DeploymentLog "Executing: $Command" "Info"
        $output = Invoke-Expression $Command -ErrorAction Stop
        Write-DeploymentLog "Command completed successfully" "Success"
        
        return @{
            Success = $true
            Output = $output
        }
    }
    catch {
        Write-DeploymentLog "Command failed: $($_.Exception.Message)" "Error"
        
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Test-FileExists {
    param(
        [Parameter(Mandatory=$true)]
        [string]$FilePath,
        
        [Parameter(Mandatory=$false)]
        [string]$Description = "file"
    )
    
    if (Test-Path $FilePath) {
        Write-DeploymentLog "✓ $Description exists: $FilePath" "Success"
        return $true
    } else {
        Write-DeploymentLog "✗ $Description not found: $FilePath" "Error"
        return $false
    }
}

function Get-ServiceConfiguration {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ConfigPath
    )
    
    Write-DeploymentLog "Loading service configuration from: $ConfigPath" "Info"
    
    try {
        if (Test-Path $ConfigPath) {
            $content = Get-Content $ConfigPath -Raw
            Write-DeploymentLog "Configuration loaded successfully" "Success"
            return $content
        } else {
            throw "Configuration file not found: $ConfigPath"
        }
    }
    catch {
        Write-DeploymentLog "Failed to load configuration: $($_.Exception.Message)" "Error"
        throw
    }
}

function Start-DeploymentProcess {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceName,
        
        [Parameter(Mandatory=$true)]
        [string]$Environment,
        
        [Parameter(Mandatory=$false)]
        [switch]$DryRun
    )
    
    $startTime = Get-Date
    Write-DeploymentLog "Starting deployment for $ServiceName ($Environment)" "Info"
    Write-DeploymentLog "Deployment started at: $startTime" "Info"
    
    return @{
        ServiceName = $ServiceName
        Environment = $Environment
        StartTime = $startTime
        DryRun = $DryRun.IsPresent
    }
}

function Complete-DeploymentProcess {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$DeploymentInfo,
        
        [Parameter(Mandatory=$true)]
        [bool]$Success
    )
    
    $endTime = Get-Date
    $duration = $endTime - $DeploymentInfo.StartTime
    
    if ($Success) {
        Write-DeploymentLog "✅ Deployment completed successfully" "Success"
    } else {
        Write-DeploymentLog "❌ Deployment failed" "Error"
    }
    
    Write-DeploymentLog "Deployment duration: $($duration.ToString('hh\:mm\:ss'))" "Info"
    Write-DeploymentLog "Deployment ended at: $endTime" "Info"
}

# Export functions for use by other scripts
Export-ModuleMember -Function *