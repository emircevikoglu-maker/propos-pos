<?php
declare(strict_types=1);

// POS sunucusu: işletme cihazları. Kontrol paneli burada SERVİS EDİLMEZ (bkz. control.php).
require_once __DIR__ . '/bootstrap.php';

use ProPos\Controllers\ApiController;
use function ProPos\serveStatic;

$pathOnly = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (strpos($pathOnly, '/api/') === 0) {
    (new ApiController())->handle($method, $pathOnly);
    exit;
}
serveStatic(PROPOS_DIST_DIR, $pathOnly);
