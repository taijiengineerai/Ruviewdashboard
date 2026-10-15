# Starts RuView (laptop WiFi mode) + this dashboard with a fresh random API token.
# Usage (PowerShell):  powershell -ExecutionPolicy Bypass -File C:\RuViewDashboard\start-ruview.ps1
# Optional:            -RuViewDir C:\RuView   -Source wifi
param([string]$RuViewDir = "C:\RuView", [string]$Source = "wifi")

$exe = Join-Path $RuViewDir "v2\target\release\sensing-server.exe"
if (-not (Test-Path $exe)) { Write-Host "sensing-server.exe not found at $exe - build it first (see README)." -ForegroundColor Red; exit 1 }

$env:RUVIEW_API_TOKEN = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })

Write-Host "Starting RuView sensing server ($Source mode) on http://localhost:3000 ..."
$srv = Start-Process -FilePath $exe -WorkingDirectory (Join-Path $RuViewDir "v2") -PassThru -WindowStyle Minimized `
  -ArgumentList "--source", $Source, "--http-port", "3000", "--ws-port", "3001", "--tick-ms", "500", "--ui-path", "..\ui"

Start-Sleep -Seconds 2
Start-Process "http://localhost:8090"
Write-Host "Dashboard: http://localhost:8090   (press Ctrl+C here to stop both)" -ForegroundColor Green
try { node (Join-Path $PSScriptRoot "server.js") }
finally { if ($srv -and -not $srv.HasExited) { Stop-Process -Id $srv.Id -Force } }
