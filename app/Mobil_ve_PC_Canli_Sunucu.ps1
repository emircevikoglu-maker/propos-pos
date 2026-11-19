$ErrorActionPreference = "Continue"
$projDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tenantsDir = Join-Path $projDir "tenants"
$routerPath = Join-Path $projDir "backend\router.php"

if (-not (Test-Path $tenantsDir)) {
    New-Item -ItemType Directory -Path $tenantsDir -Force | Out-Null
}

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\.|^169\.254\." } | Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $lanIp) { $lanIp = "127.0.0.1" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ProPos Kurumsal POS - PHP & React Canli Sunucu (v2.5)" -ForegroundColor Green
Write-Host "   Yerel Erisim : http://localhost:8586" -ForegroundColor Yellow
Write-Host "   Mobil/Wi-Fi  : http://$($lanIp):8586" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $projDir
& php -S 0.0.0.0:8586 $routerPath
