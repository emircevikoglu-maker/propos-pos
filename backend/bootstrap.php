<?php
declare(strict_types=1);

// Ortak yükleyici: POS (router.php), kontrol paneli (control.php) ve testler kullanır.
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Services/ZipBuilder.php';
require_once __DIR__ . '/Services/Throttle.php';
require_once __DIR__ . '/Services/TenantService.php';
require_once __DIR__ . '/Services/AuthService.php';
require_once __DIR__ . '/Services/PinService.php';
require_once __DIR__ . '/Services/PackageService.php';
require_once __DIR__ . '/Controllers/ApiController.php';
require_once __DIR__ . '/static.php';
