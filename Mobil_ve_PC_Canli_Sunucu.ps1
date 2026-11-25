$ErrorActionPreference = "Continue"
$projDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$routerPath = Join-Path $projDir "backend\router.php"
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\.|^169\.254\." } | Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $lanIp) { $lanIp = "127.0.0.1" }

Set-Location $projDir
$keyInfo = & php (Join-Path $projDir "backend\init.php")

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ProPos Kurumsal POS - PHP & React Canli Sunucu (v3.0)" -ForegroundColor Green
Write-Host "   Yerel Erisim : http://localhost:8586" -ForegroundColor Yellow
Write-Host "   Mobil/Wi-Fi  : http://$($lanIp):8586" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "   $keyInfo" -ForegroundColor Magenta
Write-Host "   (Anahtari kaydettikten sonra data\KURUCU_ANAHTARI.txt dosyasini silin)" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan

& php -S 0.0.0.0:8586 $routerPath
