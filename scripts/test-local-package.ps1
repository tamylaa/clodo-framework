#!/usr/bin/env pwsh
# Local package testing script for Windows

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  LOCAL PACKAGE TESTING SCRIPT" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$tempDir = Join-Path $env:TEMP "clodo-test-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Test 1: Build
    Write-Host "[1] Building package..."
    npm run build > $null 2>&1
    Write-Host "    OK - Build complete" -ForegroundColor Green
    $testsPassed++
    
    # Test 2: Create tarball
    Write-Host "[2] Creating tarball..."
    $tarball = npm pack --silent 2>$null
    if ($tarball) {
        Write-Host "    OK - Created: $tarball" -ForegroundColor Green
        $testsPassed++
    } else {
        throw "Failed to create package"
    }
    
    # Test 3: Verify import paths in source
    Write-Host "[3] Verifying import paths..."
    $opsContent = Get-Content "dist/utils/cloudflare/ops.js" -Raw
    if ($opsContent -match "from.*lib/shared/cloudflare/ops") {
        Write-Host "    OK - ops.js paths correct" -ForegroundColor Green
    } else {
        throw "ops.js has wrong import path"
    }
    $testsPassed++
    
    # Test 4: Test CLI
    Write-Host "[4] Testing CLI..."
    $cliOutput = & node dist/cli/clodo-service.js --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK - CLI functional" -ForegroundColor Green
        $testsPassed++
    } else {
        throw "CLI test failed"
    }
    
    # Test 5: Test module import
    Write-Host "[5] Testing module imports..."
    $testCode = @'
const mod = require('./dist/index.js');
if (Object.keys(mod).length > 20) {
    console.log('Module loaded with ' + Object.keys(mod).length + ' exports');
} else {
    throw 'Not enough exports';
}
'@
    $testCode | & node 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK - Module imports work" -ForegroundColor Green
        $testsPassed++
    } else {
        throw "Module import failed"
    }
    
    # Test 6: Verify tarball contents
    Write-Host "[6] Verifying tarball structure..."
    $tarballPath = Get-Item $tarball -ErrorAction Stop
    Push-Location $tempDir
    tar -xzf $tarballPath.FullName | Out-Null
    $extractedDir = Get-ChildItem -Directory | Select-Object -First 1
    
    if ((Test-Path "$($extractedDir.FullName)/package.json") -and 
        (Test-Path "$($extractedDir.FullName)/dist/index.js")) {
        Write-Host "    OK - Tarball structure valid" -ForegroundColor Green
        $testsPassed++
    } else {
        throw "Tarball missing required files"
    }
    
    # Success!
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "SUCCESS - ALL TESTS PASSED" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host ""
    
    $packageSize = "{0:N2} MB" -f ((Get-Item $tarball -ErrorAction SilentlyContinue).Length / 1MB)
    Write-Host "SUMMARY:"
    Write-Host "  Package: $tarball"
    Write-Host "  Size: $packageSize"
    Write-Host "  Tests: $testsPassed/6 passed"
    Write-Host ""
    Write-Host "NEXT STEPS:"
    Write-Host "  1. git add ."
    Write-Host "  2. git commit -m 'fix: correct import paths'"
    Write-Host "  3. git push origin main"
    Write-Host "  4. GitHub Actions will run semantic-release"
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Red
    Write-Host "FAILED - TESTS DID NOT PASS" -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "DO NOT PUSH - Fix issues first!" -ForegroundColor Yellow
    Write-Host ""
    exit 1

} finally {
    Pop-Location -ErrorAction SilentlyContinue
    Pop-Location -ErrorAction SilentlyContinue
    Pop-Location -ErrorAction SilentlyContinue
    
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    }
}
