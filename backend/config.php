<?php
declare(strict_types=1);

namespace ProPos;

require_once __DIR__ . '/env.php';
// Testler PROPOS_NO_DOTENV=1 verir: gerçek .env (Supabase) test koşularına sızmasın.
if (!getenv('PROPOS_NO_DOTENV')) {
    loadDotEnv(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');
}

// Hata ayrıntısı istemciye asla gitmez (yol/sır sızıntısı). Geliştirmede PROPOS_DEBUG=1.
if (!getenv('PROPOS_DEBUG')) {
    ini_set('display_errors', '0');
}
ini_set('log_errors', '1');

/** Sorgu parametresini yalnızca metin olarak okur (?a[]=x gibi dizi saldırıları varsayılana düşer). */
function qs(string $key, string $default = ''): string
{
    $v = $_GET[$key] ?? null;
    return is_string($v) ? $v : $default;
}

/** mbstring olmadan güvenli kırpma: UTF-8 karakter sınırında keser. */
function mbSubstrSafe(string $s, int $max): string
{
    return preg_match('/^.{0,' . $max . '}/us', $s, $m) ? $m[0] : substr($s, 0, $max);
}

/**
 * İşlenmeyen istisnalar JSON olarak döner ve ayrıntı sızdırmaz: depo erişilemezse 503 STORAGE_DOWN (istemci kuyruğa alır),
 * diğerleri 500 SERVER. Hata ayrıntısı yalnızca sunucu günlüğüne gider.
 */
function installExceptionHandler(): void
{
    set_exception_handler(static function (\Throwable $e): void {
        error_log('ProPos: ' . get_class($e) . ': ' . $e->getMessage());
        if (!headers_sent()) {
            if ($e instanceof \ProPos\Services\Storage\StorageUnavailable) {
                http_response_code(503);
                header('Retry-After: 10');
            } else {
                http_response_code(500);
            }
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
        }
        echo $e instanceof \ProPos\Services\Storage\StorageUnavailable
            ? '{"ok":false,"code":"STORAGE_DOWN","error":"Depo geçici olarak erişilemiyor. İşlemleriniz kuyruğa alınır."}'
            : '{"ok":false,"code":"SERVER","error":"Sunucu hatası."}';
        exit;
    });
}

function envInt(string $name, int $default): int
{
    $v = getenv($name);
    return ($v !== false && is_numeric($v)) ? (int)$v : $default;
}

define('PROPOS_ROOT_DIR', dirname(__DIR__));
define('PROPOS_DIST_DIR', getenv('PROPOS_DIST_DIR') ? rtrim((string)getenv('PROPOS_DIST_DIR'), '\/') : PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'dist');
define('PROPOS_ADMIN_DIST_DIR', PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'dist-admin');
// Tüm kalıcı veri web köküne açık olmayan tek klasörde tutulur. Testler PROPOS_DATA_DIR ile geçici klasör verir.
define('PROPOS_DATA_DIR', getenv('PROPOS_DATA_DIR') ? rtrim((string)getenv('PROPOS_DATA_DIR'), '\/') : PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'data');
define('PROPOS_TENANTS_DIR', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'tenants');
define('PROPOS_BACKUP_DIR', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'backups');
define('PROPOS_DEFAULT_DB_FILE', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'default.json');
define('PROPOS_REGISTRY_FILE', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'registry.json');
define('PROPOS_CONFIG_FILE', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'config.json');
define('PROPOS_AUDIT_FILE', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'audit.log');
define('PROPOS_RATE_DIR', PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'ratelimit');
define('PROPOS_PORT', 8586);
define('PROPOS_MAX_DB_BYTES', envInt('PROPOS_MAX_DB_BYTES', 20 * 1024 * 1024));

function bootstrapStorage(): void
{
    foreach ([PROPOS_DATA_DIR, PROPOS_TENANTS_DIR, PROPOS_BACKUP_DIR, PROPOS_RATE_DIR] as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
    }
    // Apache/LiteSpeed için erişim kilidi (php -S zaten router üzerinden korur).
    $guard = PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . '.htaccess';
    if (!is_file($guard)) {
        @file_put_contents($guard, "Require all denied\nDeny from all\n");
        @file_put_contents(PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'index.html', '');
    }
    // Eski sürümden (kök dizindeki dosyalar) otomatik taşıma (yalnızca varsayılan veri klasöründe).
    if (getenv('PROPOS_DATA_DIR')) {
        return;
    }
    $legacy = [
        PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Canli_Veritabani.json' => PROPOS_DEFAULT_DB_FILE,
        PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Bayi_Musteriler.json' => PROPOS_REGISTRY_FILE,
    ];
    foreach ($legacy as $old => $new) {
        if (is_file($old) && !is_file($new)) {
            @rename($old, $new);
        }
    }
    $oldTenants = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'tenants';
    if (is_dir($oldTenants)) {
        foreach (glob($oldTenants . DIRECTORY_SEPARATOR . '*.json') ?: [] as $file) {
            $target = PROPOS_TENANTS_DIR . DIRECTORY_SEPARATOR . basename($file);
            if (!is_file($target)) {
                @rename($file, $target);
            }
        }
    }
}

bootstrapStorage();

/**
 * Güvenlik başlıkları. CORS varsayılan olarak kapalıdır (uygulama kendi kökeninden çalışır);
 * ayrı bir alan adından erişim gerekirse PROPOS_CORS_ORIGIN ortam değişkeni verilir.
 */
function sendApiHeaders(): void
{
    // PROPOS_CORS_ORIGIN: tek köken, virgülle ayrılmış liste ya da "*". Liste verilirse yalnızca istek kökeni listedeyse yansıtılır.
    $allowed = trim((string)getenv('PROPOS_CORS_ORIGIN'));
    if ($allowed !== '') {
        $reqOrigin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
        $list = array_values(array_filter(array_map('trim', explode(',', $allowed))));
        $out = null;
        if (in_array('*', $list, true)) {
            $out = '*';
        } elseif ($reqOrigin !== '' && in_array(rtrim($reqOrigin, '/'), array_map(fn($o) => rtrim($o, '/'), $list), true)) {
            $out = $reqOrigin;
        }
        if ($out !== null) {
            header('Access-Control-Allow-Origin: ' . $out);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            // fetch({cache:"no-store"}) tarayıcıda Cache-Control/Pragma istek başlığı ekler; ön kontrol bunlara da izin vermeli.
            header('Access-Control-Allow-Headers: Content-Type, X-ProPos-Token, Cache-Control, Pragma');
            header('Access-Control-Expose-Headers: Retry-After');
            header('Access-Control-Max-Age: 600');
        }
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
}

function sendJson(array $payload, int $statusCode = 200, array $extraHeaders = []): void
{
    http_response_code($statusCode);
    foreach ($extraHeaders as $h) {
        header($h);
    }
    sendApiHeaders();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

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
    return ($clean !== null && $clean !== '') ? substr($clean, 0, 40) : 'DEFAULT';
}

function clientIp(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function audit(string $action, string $detail = ''): void
{
    $line = date('c') . "\t" . clientIp() . "\t" . $action . "\t" . str_replace(["\r", "\n", "\t"], ' ', $detail) . "\n";
    @file_put_contents(PROPOS_AUDIT_FILE, $line, FILE_APPEND | LOCK_EX);
}

function detectLanIp(): string
{
    static $cached = null; // gethostbynamel Windows'ta yavaş; her yoklamada çağrılmasın
    return $cached ??= detectLanIpUncached();
}

function detectLanIpUncached(): string
{
    if (!empty($_SERVER['SERVER_ADDR']) && !in_array($_SERVER['SERVER_ADDR'], ['127.0.0.1', '::1', '0.0.0.0'], true)) {
        return (string)$_SERVER['SERVER_ADDR'];
    }
    if (!empty($_SERVER['HTTP_HOST'])) {
        $host = explode(':', (string)$_SERVER['HTTP_HOST'])[0];
        if (preg_match('/^[A-Za-z0-9.\-]+$/', $host) && $host !== 'localhost' && $host !== '127.0.0.1') {
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
