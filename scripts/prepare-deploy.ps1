$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $repoRoot "dist/bingo-djgogi-family"
$deployRoot = Join-Path $repoRoot "deploy"
$deployPath = Join-Path $deployRoot "bingo-djgogi-family"

Write-Host "Preparing deployment package from dist output..."

if (-not (Test-Path $distPath)) {
  throw "Build output not found at '$distPath'. Run 'npm run build:prod' first."
}

if (Test-Path $deployPath) {
  Remove-Item -Path $deployPath -Recurse -Force
}

New-Item -Path $deployPath -ItemType Directory -Force | Out-Null
Copy-Item -Path (Join-Path $distPath "*") -Destination $deployPath -Recurse -Force

$sqlScriptPath = Join-Path $deployPath "sqlscript"
if (Test-Path $sqlScriptPath) {
  Remove-Item -Path $sqlScriptPath -Recurse -Force
}

Write-Host "Deployment package ready:"
Write-Host "  $deployPath"
Write-Host ""
Write-Host "Deploy ONLY this folder to production."
