<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Services/ZipBuilder.php';
require_once __DIR__ . '/Services/TenantService.php';
require_once __DIR__ . '/Services/PackageService.php';
require_once __DIR__ . '/Controllers/ApiController.php';

use ProPos\Controllers\ApiController;
use function ProPos\sendCorsHeaders;

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$pathOnly = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 1. Handle API requests (/api/*)
if (strpos($pathOnly, '/api/') === 0) {
    $controller = new ApiController();
    $controller->handle($method, $pathOnly);
    exit;
}

// 2. Serve static files from dist/ or fallback to dist/index.html (SPA routing)
if ($pathOnly === '/' || $pathOnly === '') {
    $pathOnly = '/index.html';
}

$safeRel = str_replace(['..', '/'], ['', DIRECTORY_SEPARATOR], ltrim($pathOnly, '/'));
$fullPath = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . $safeRel;

if (!is_file($fullPath)) {
    $fullPath = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
    if (!is_file($fullPath)) {
        $fullPath = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Hazir_Uygulama.html';
    }
}

if (!is_file($fullPath)) {
    http_response_code(404);
    echo 'ProPos build file not found.';
    exit;
}

$ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
$mimeMap = [
    'html' => 'text/html; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'js'   => 'application/javascript; charset=utf-8',
    'css'  => 'text/css; charset=utf-8',
    'svg'  => 'image/svg+xml',
    'png'  => 'image/png',
    'ico'  => 'image/x-icon',
];

sendCorsHeaders();
header('Content-Type: ' . ($mimeMap[$ext] ?? 'application/octet-stream'));
readfile($fullPath);
