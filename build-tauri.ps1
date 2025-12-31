# Tauri Build Helper Script
# This script ensures Cargo is in PATH before building

$env:Path += ";$env:USERPROFILE\.cargo\bin"

Write-Host "Building Tauri application..." -ForegroundColor Cyan
npm run tauri:build

