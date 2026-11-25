<?php
declare(strict_types=1);

/*
 * ProPos kontrol paneli (bayi / lisans yönetimi) — ayrı giriş noktası.
 * Çalıştırma:  php -S 127.0.0.1:8590 backend/control.php
 * VDS: ayrı alt alan adı + nginx ters vekil + IP kısıtı önerilir. Müşteri paketine girmez.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Controllers/ControlController.php';

use ProPos\Controllers\ControlController;
use function ProPos\serveStatic;

$pathOnly = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (strpos($pathOnly, '/api/') === 0) {
    (new ControlController())->handle($method, $pathOnly);
    exit;
}
serveStatic(PROPOS_ADMIN_DIST_DIR, $pathOnly, [
    "Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'X-Frame-Options: DENY',
]);
