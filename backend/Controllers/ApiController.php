<?php
declare(strict_types=1);

namespace ProPos\Controllers;

use ProPos\Services\AuthService;
use ProPos\Services\PackageService;
use ProPos\Services\PinService;
use ProPos\Services\TenantService;
use ProPos\Services\Throttle;
use function ProPos\clientIp;
use function ProPos\detectLanIp;
use function ProPos\envInt;
use function ProPos\normalizeTenantId;
use function ProPos\qs;
use function ProPos\sendApiHeaders;
use function ProPos\sendJson;

/**
 * POS API (işletme cihazları). Kurucu uçları geçiş dönemi için burada da duruyor;
 * asıl yönetim ayrı kontrol panelinde (backend/control.php).
 */
class ApiController
{
    private TenantService $tenants;
    private AuthService $auth;
    private PackageService $packages;
    private PinService $pins;
    private Throttle $throttle;

    public function __construct()
    {
        $this->tenants = new TenantService();
        $this->auth = new AuthService($this->tenants);
        $this->packages = new PackageService($this->tenants);
        $this->throttle = new Throttle();
        $this->pins = new PinService($this->tenants, $this->throttle);
    }

    /**
     * Token bucket: IP başına genel kova + (tenant, cihaz, IP) başına iki kova.
     * Senkron yoklaması (poll) ile kullanıcı eylemleri (action) ayrı; yoklayan tablet
     * garsonun sipariş girişini engellemez.
     */
    private function rateLimit(string $method, string $path): void
    {
        $penalty = envInt('PROPOS_RL_PENALTY', 30);
        [$ipCap, $ipRefill] = Throttle::bucketConfig('PROPOS_RL_IP', 600, 20);
        $ip = clientIp();
        $checks = [['ip|' . $ip, $ipCap, $ipRefill]];
        if ($path === '/api/sync' || strpos($path, '/api/pin') === 0) {
            $bucket = ($path === '/api/sync' && $method === 'GET') ? 'poll' : 'action';
            [$cap, $refill] = $bucket === 'poll'
                ? Throttle::bucketConfig('PROPOS_RL_POLL', 90, 1.5)
                : Throttle::bucketConfig('PROPOS_RL_ACTION', 120, 3);
            $tenant = normalizeTenantId(qs('tenantId', 'DEFAULT'));
            $device = substr(preg_replace('/[^A-Za-z0-9_\-.]/', '', qs('deviceId', '')) ?? '', 0, 60);
            $checks[] = [$bucket . '|' . $tenant . '|' . $device . '|' . $ip, $cap, $refill];
        }
        foreach ($checks as [$key, $cap, $refill]) {
            $r = $this->throttle->hit($key, $cap, $refill, $penalty);
            if (!$r['ok']) {
                sendJson([
                    'ok' => false, 'code' => 'RATE_LIMIT', 'retryAfter' => $r['retryAfter'],
                    'error' => 'Çok fazla istek. ' . $r['retryAfter'] . ' sn bekleyin.',
                ], 429, ['Retry-After: ' . $r['retryAfter']]);
            }
        }
    }

    private static function jsonBody(string $raw): array
    {
        $d = json_decode($raw, true);
        return is_array($d) ? $d : [];
    }

    public function handle(string $method, string $path): void
    {
        $method = strtoupper($method);
        if ($method === 'OPTIONS') {
            http_response_code(204);
            sendApiHeaders();
            exit;
        }
        $this->rateLimit($method, $path);
        $rawBody = (string)file_get_contents('php://input');

        switch ($path) {
            case '/api/info': // herkese açık, hassas bilgi içermez
                sendJson(['ok' => true, 'app' => 'ProPos', 'lanIp' => detectLanIp(), 'port' => PROPOS_PORT, 'auth' => true]);
                break;

            case '/api/login':
                if ($method !== 'POST') {
                    sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
                }
                $body = self::jsonBody($rawBody);
                $result = $this->auth->login(
                    is_string($body['tenantId'] ?? null) ? $body['tenantId'] : 'DEFAULT',
                    is_string($body['key'] ?? null) ? $body['key'] : ''
                );
                sendJson(['ok' => true, 'role' => $result['role'], 'token' => $result['token']]);
                break;

            case '/api/sync':
                $this->sync($method, $rawBody);
                break;

            case '/api/pin/status':
                $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
                $this->auth->requireTenant($tenantId);
                sendJson(['ok' => true, 'hasPin' => $this->pins->hasPin($tenantId), 'lockedFor' => $this->pins->lockedFor($tenantId)]);
                break;

            case '/api/pin/verify':
                $this->pinVerify($method, $rawBody);
                break;

            case '/api/pin/change':
                $this->pinChange($method, $rawBody);
                break;

            case '/api/tenants':
                $this->auth->requireFounder();
                if ($method === 'GET') {
                    sendJson(['ok' => true, 'tenants' => $this->tenants->loadRegistry()]);
                }
                if ($method === 'POST' && $this->tenants->saveRegistry($rawBody)) {
                    sendJson(['ok' => true, 'tenants' => $this->tenants->loadRegistry()]);
                }
                sendJson(['ok' => false, 'error' => 'Geçersiz kayıt listesi'], 400);
                break;

            case '/api/apply-update':
                $this->auth->requireFounder();
                if ($method === 'POST' && $this->packages->applyHtmlUpdate($rawBody)) {
                    sendJson(['ok' => true]);
                }
                sendJson(['ok' => false, 'error' => 'Geçersiz güncelleme paketi'], 400);
                break;

            case '/api/prepare-github':
                $this->auth->requireFounder();
                if ($method === 'POST' && $this->packages->prepareGithubRelease($rawBody)) {
                    sendJson(['ok' => true]);
                }
                sendJson(['ok' => false, 'error' => 'Geçersiz sürüm bildirimi'], 400);
                break;

            case '/api/package':
                $this->auth->requireFounder();
                self::sendPackage($this->packages);
                break;

            case '/api/audit':
                $this->auth->requireFounder();
                sendJson(['ok' => true, 'lines' => self::auditTail(200)]);
                break;

            default:
                sendJson(['ok' => false, 'error' => 'Endpoint bulunamadı'], 404);
        }
    }

    public static function auditTail(int $n): array
    {
        $lines = is_file(PROPOS_AUDIT_FILE) ? array_slice(file(PROPOS_AUDIT_FILE, FILE_IGNORE_NEW_LINES) ?: [], -$n) : [];
        return array_reverse($lines);
    }

    public static function sendPackage(PackageService $packages): void
    {
        $pkg = $packages->buildCustomerZip(
            qs('tenantId', 'DEFAULT'),
            qs('businessName', ''),
            qs('githubRepo', ''),
            qs('appVersion', '3.0.0')
        );
        http_response_code(200);
        sendApiHeaders();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $pkg['filename'] . '"');
        header('Content-Length: ' . strlen($pkg['bytes']));
        echo $pkg['bytes'];
        exit;
    }

    private function pinVerify(string $method, string $rawBody): void
    {
        if ($method !== 'POST') {
            sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
        }
        $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
        $this->auth->requireTenant($tenantId);
        $body = self::jsonBody($rawBody);
        $pin = is_string($body['pin'] ?? null) ? $body['pin'] : '';
        $r = $this->pins->verify($tenantId, $pin);
        if ($r['ok']) {
            sendJson(['ok' => true, 'role' => 'manager', 'token' => $this->auth->issueToken('manager', $tenantId)]);
        }
        if (($r['code'] ?? '') === 'RATE_LIMIT') {
            sendJson(['ok' => false, 'code' => 'RATE_LIMIT', 'retryAfter' => $r['retryAfter'],
                'error' => 'Çok fazla hatalı PIN. ' . $r['retryAfter'] . ' sn bekleyin.'], 429, ['Retry-After: ' . $r['retryAfter']]);
        }
        if (($r['code'] ?? '') === 'NO_PIN') {
            sendJson(['ok' => false, 'code' => 'NO_PIN', 'error' => 'Bu işletme için henüz yönetici PIN\'i belirlenmemiş.'], 409);
        }
        sendJson(['ok' => false, 'code' => 'BAD_PIN', 'attemptsLeft' => $r['attemptsLeft'] ?? 0, 'error' => 'PIN hatalı.'], 401);
    }

    private function pinChange(string $method, string $rawBody): void
    {
        if ($method !== 'POST') {
            sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
        }
        $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
        $session = $this->auth->requireTenant($tenantId);
        $body = self::jsonBody($rawBody);
        $r = $this->pins->change(
            $tenantId,
            is_string($body['current'] ?? null) ? $body['current'] : null,
            is_string($body['next'] ?? null) ? $body['next'] : '',
            $this->auth->isManager($session, $tenantId)
        );
        if ($r['ok']) {
            sendJson(['ok' => true]);
        }
        $status = ['RATE_LIMIT' => 429, 'INVALID' => 400, 'IO' => 500][$r['code'] ?? ''] ?? 401;
        sendJson(['ok' => false, 'code' => $r['code'] ?? 'BAD_PIN', 'error' => $r['error'] ?? 'PIN değiştirilemedi.'], $status,
            $status === 429 ? ['Retry-After: ' . (int)($r['retryAfter'] ?? 30)] : []);
    }

    private function sync(string $method, string $rawBody): void
    {
        $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
        $session = $this->auth->requireTenant($tenantId);
        if ($session['r'] !== 'founder') {
            // Lisans oturum süresince de kontrol edilir (token 12 saat geçerli).
            $problem = AuthService::licenseProblem($this->tenants->findRegistryEntry($tenantId));
            if ($problem !== null) {
                sendJson(['ok' => false, 'error' => $problem, 'code' => 'LICENSE'], 403);
            }
        }

        if ($method === 'GET') {
            $state = $this->tenants->loadTenant($tenantId);
            $since = (int)qs('since', '-1');
            // Değişiklik yoksa gövde göndermeden dön (yoklamada bant genişliği tasarrufu).
            if ($since >= 0 && $since === $state['rev'] && $state['rev'] > 0) {
                sendJson(['ok' => true, 'tenantId' => $tenantId, 'rev' => $state['rev'], 'unchanged' => true]);
            }
            sendJson([
                'ok'        => true,
                'tenantId'  => $tenantId,
                'rev'       => $state['rev'],
                'updatedBy' => $state['updatedBy'],
                'lanIp'     => detectLanIp(),
                'registry'  => $session['r'] === 'founder' ? $this->tenants->loadRegistry() : $this->tenants->registryViewFor($tenantId),
                'data'      => TenantService::publicData($state['data']),
            ]);
        }
        if ($method === 'POST') {
            $deviceId = trim(qs('deviceId', 'unknown'));
            $result = $this->tenants->saveTenant($tenantId, $rawBody, $deviceId);
            sendJson($result, $result['ok'] ? 200 : 400);
        }
        sendJson(['ok' => false, 'error' => 'Yöntem desteklenmiyor'], 405);
    }
}
