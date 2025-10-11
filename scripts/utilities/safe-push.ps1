# Clodo Framework - Safe Push Workflow
# This script prevents the "rejected push" issue when working with semantic-release

Write-Host "`nClodo Framework - Safe Push Workflow`n" -ForegroundColor Cyan

# Step 1: Fetch latest changes
Write-Host "Fetching latest changes from remote..." -ForegroundColor Yellow
git fetch

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to fetch from remote" -ForegroundColor Red
    exit 1
}

# Step 2: Check if we're behind
$behind = git rev-list HEAD..origin/master --count 2>$null
if ($behind -gt 0) {
    Write-Host "Local branch is $behind commit(s) behind remote" -ForegroundColor Yellow
    Write-Host "Rebasing local changes on top of remote..." -ForegroundColor Yellow
    
    git rebase origin/master
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Rebase failed - resolve conflicts and run 'git rebase --continue'" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Rebase successful" -ForegroundColor Green
} else {
    Write-Host "Local branch is up to date" -ForegroundColor Green
}

# Step 3: Check if we're ahead (have commits to push)
$ahead = git rev-list origin/master..HEAD --count 2>$null
if ($ahead -eq 0) {
    Write-Host "`nNothing to push - already up to date`n" -ForegroundColor Green
    exit 0
}

Write-Host "Pushing $ahead commit(s) to remote..." -ForegroundColor Yellow

# Step 4: Push
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPush successful!" -ForegroundColor Green
    Write-Host "Semantic-release will run shortly and create a new version`n" -ForegroundColor Cyan
} else {
    Write-Host "`nPush failed" -ForegroundColor Red
    exit 1
}
