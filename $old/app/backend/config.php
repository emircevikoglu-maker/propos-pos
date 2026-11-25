<?php
declare(strict_types=1);

namespace ProPos;

define('PROPOS_ROOT_DIR', dirname(__DIR__));
define('PROPOS_DIST_DIR', PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'dist');
define('PROPOS_TENANTS_DIR', PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'tenants');
define('PROPOS_DEFAULT_DB_FILE', PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Canli_Veritabani.json');
define('PROPOS_REGISTRY_FILE', PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Bayi_Musteriler.json');
define('PROPOS_PORT', 8586);

if (!is_dir(PROPOS_TENANTS_DIR)) {
    @mkdir(PROPOS_TENANTS_DIR, 0777, true);
}

/**
 * Send standard CORS and no-cache headers for POS live sync.
 */
function sendCorsHeaders(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Cache-Control, Pragma');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}

/**
 * Send a JSON HTTP response and terminate.
 */
function sendJson(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    sendCorsHeaders();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Normalize tenant code to safe uppercase identifier.
 */
function normalizeTenantId(?string $rawId): string
{
    if ($rawId === null || trim($rawId) === '') {
        return 'DEFAULT';
    }
    $decoded = strtoupper(trim(rawurldecode($rawId)));
    if (in_array($decoded, ['DEFAULT', 'PICKYS-MASTER', 'MASTER'], true)) {
        return 'DEFAULT';
    }
    $clean = preg_replace('/[^A-Z0-9_-]/', '', $decoded);
    return ($clean !== null && $clean !== '') ? $clean : 'DEFAULT';
}

/**
 * Detect local LAN IPv4 address for mobile QR code connection.
 */
function detectLanIp(): string
{
    if (!empty($_SERVER['SERVER_ADDR']) && $_SERVER['SERVER_ADDR'] !== '127.0.0.1' && $_SERVER['SERVER_ADDR'] !== '::1') {
        return $_SERVER['SERVER_ADDR'];
    }
    if (!empty($_SERVER['HTTP_HOST'])) {
        $host = explode(':', $_SERVER['HTTP_HOST'])[0];
        if ($host !== 'localhost' && $host !== '127.0.0.1') {
            return $host;
        }
    }
    $hostname = gethostname();
    if ($hostname !== false) {
        $ips = gethostbynamel($hostname);
        if (is_array($ips)) {
            foreach ($ips as $ip) {
                if (strpos($ip, '127.') !== 0 && strpos($ip, '169.254.') !== 0) {
                    return $ip;
                }
            }
        }
    }
    return '127.0.0.1';
}
