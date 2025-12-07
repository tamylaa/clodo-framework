
# Script to extract all imports from documentation and templates
$results = @()
$symbolSet = @{}

function Extract-Imports {
    param (
        [string]$FilePath,
        [string]$RelativePath
    )
    
    $content = Get-Content $FilePath -Raw
    $pattern = "import\s+\{([^}]+)\}\s+from\s+['\`"](@tamyla/clodo-framework[^'\`"]*)['\`"]"
    
    $matches = [regex]::Matches($content, $pattern)
    
    foreach ($match in $matches) {
        $symbolsString = $match.Groups[1].Value
        $package = $match.Groups[2].Value
        
        # Split symbols by comma and clean them
        $symbols = $symbolsString -split ',' | ForEach-Object { 
            $_.Trim() -replace '\s+', ' '
        } | Where-Object { $_ -ne '' }
        
        foreach ($symbol in $symbols) {
            $key = "$symbol|$package"
            if (-not $symbolSet.ContainsKey($key)) {
                $symbolSet[$key] = @()
            }
            $symbolSet[$key] += $RelativePath
            
            $script:results += [PSCustomObject]@{
                Symbol = $symbol
                Package = $package
                File = $RelativePath
            }
        }
    }
}

# Process README.md
Write-Host "Processing README.md..."
Extract-Imports -FilePath "README.md" -RelativePath "README.md"

# Process docs/
Write-Host "Processing docs/..."
Get-ChildItem -Path "docs" -Filter "*.md" -Recurse | ForEach-Object {
    $relativePath = $_.FullName -replace [regex]::Escape($PWD.Path + "\"), ""
    Extract-Imports -FilePath $_.FullName -RelativePath $relativePath
}

# Process i-docs/
Write-Host "Processing i-docs/..."
Get-ChildItem -Path "i-docs" -Filter "*.md" -Recurse | ForEach-Object {
    $relativePath = $_.FullName -replace [regex]::Escape($PWD.Path + "\"), ""
    Extract-Imports -FilePath $_.FullName -RelativePath $relativePath
}

# Process templates/
Write-Host "Processing templates/..."
Get-ChildItem -Path "templates" -Recurse -Include "*.js","*.md" | ForEach-Object {
    $relativePath = $_.FullName -replace [regex]::Escape($PWD.Path + "\"), ""
    Extract-Imports -FilePath $_.FullName -RelativePath $relativePath
}

# Create unique list with file references
$uniqueImports = @()
foreach ($key in $symbolSet.Keys) {
    $parts = $key -split '\|'
    $symbol = $parts[0]
    $package = $parts[1]
    $files = $symbolSet[$key] | Select-Object -Unique
    
    $uniqueImports += [PSCustomObject]@{
        symbol = $symbol
        package = $package
        foundIn = @($files)
    }
}

# Sort by symbol name
$uniqueImports = $uniqueImports | Sort-Object -Property symbol

# Convert to JSON
$json = $uniqueImports | ConvertTo-Json -Depth 10

# Save to file
$outputFile = "documented-imports.json"
$json | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "`nAnalysis complete!"
Write-Host "Total import statements found: $($results.Count)"
Write-Host "Unique symbols found: $($uniqueImports.Count)"
Write-Host "Output saved to: $outputFile"

# Display summary
Write-Host "`nUnique symbols by package:"
$uniqueImports | Group-Object -Property package | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) symbols"
}

# Return the JSON
Write-Output $json
