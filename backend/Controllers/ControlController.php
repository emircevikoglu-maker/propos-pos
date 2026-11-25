<?php
declare(strict_types=1);

namespace ProPos\Controllers;

use ProPos\Services\AuthService;
use ProPos\Services\PackageService;
use ProPos\Services\TenantService;
use ProPos\Services\Throttle;
use function ProPos\clientIp;
use function ProPos\installExceptionHandler;
use function ProPos\sendApiHeaders;
use function ProPos\qs;
use function ProPos\sendJson;

/**
 * Kontrol paneli API'si (yalnızca kurucu). POS uçlarını (sync, pin) BİLEREK içermez;
 * müşteriye giden pakete de girmez.
 */
class ControlController
{
    private TenantService $tenants;
    private AuthService $auth;
    private PackageService $packages;

    public function __construct()
    {
        $this->tenants = new TenantService();
        $this->auth = new AuthService($this->tenants);
        $this->packages = new PackageService($this->tenants);
    }

    private static function body(string $raw): array
    {
        $d = json_decode($raw, true);
        return is_array($d) ? $d : [];
    }

    private static function requirePost(string $method): void
    {
        if ($method !== 'POST') {
            sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
        }
    }

    /** Kurucu listesi: anahtarlar dahil, PIN'ler hariç. */
    private function tenantList(): array
    {
        $stats = $this->tenants->stats();
        return array_map(static function (array $e) use ($stats): array {
            unset($e['adminPin']);
            $e['stats'] = $stats[$e['tenantId']] ?? null;
            $e['licenseProblem'] = AuthService::licenseProblem($e);
            return $e;
        }, $this->tenants->loadRegistry());
    }

    public function handle(string $method, string $path): void
    {
        installExceptionHandler();
        $method = strtoupper($method);
        if ($method === 'OPTIONS') {
            http_response_code(204);
            sendApiHeaders();
            exit;
        }
        [$cap, $refill] = Throttle::bucketConfig('PROPOS_RL_CONTROL', 120, 2);
        $rl = (new Throttle())->hit('control|' . clientIp(), $cap, $refill, 30);
        if (!$rl['ok']) {
            sendJson(['ok' => false, 'code' => 'RATE_LIMIT', 'retryAfter' => $rl['retryAfter'], 'error' => 'Çok fazla istek.'], 429, ['Retry-After: ' . $rl['retryAfter']]);
        }
        $raw = (string)file_get_contents('php://input');

        if ($path === '/api/login') {
            self::requirePost($method);
            $b = self::body($raw);
            $r = $this->auth->login('DEFAULT', is_string($b['key'] ?? null) ? $b['key'] : '', true);
            sendJson(['ok' => true, 'role' => $r['role'], 'token' => $r['token']]);
        }

        $this->auth->requireFounder();

        switch ($path) {
            case '/api/session':
                sendJson(['ok' => true, 'role' => 'founder']);
                break;

            case '/api/tenants':
                sendJson(['ok' => true, 'tenants' => $this->tenantList()]);
                break;

            case '/api/tenants/save':
                self::requirePost($method);
                $r = $this->tenants->upsertEntry(self::body($raw));
                if (!$r['ok']) {
                    sendJson(['ok' => false, 'error' => $r['error']], 400);
                }
                sendJson(['ok' => true, 'tenant' => $r['tenant'], 'tenants' => $this->tenantList()]);
                break;

            case '/api/tenants/rotate-key':
                self::requirePost($method);
                $key = $this->tenants->rotateSyncKey((is_string(self::body($raw)['tenantId'] ?? null) ? self::body($raw)['tenantId'] : ''));
                if ($key === null) {
                    sendJson(['ok' => false, 'error' => 'İşletme bulunamadı.'], 404);
                }
                sendJson(['ok' => true, 'syncKey' => $key, 'tenants' => $this->tenantList()]);
                break;

            case '/api/tenants/delete':
                self::requirePost($method);
                if (!$this->tenants->deleteEntry((is_string(self::body($raw)['tenantId'] ?? null) ? self::body($raw)['tenantId'] : ''))) {
                    sendJson(['ok' => false, 'error' => 'Silinemedi (ana işletme silinemez).'], 400);
                }
                sendJson(['ok' => true, 'tenants' => $this->tenantList()]);
                break;

            case '/api/package':
                ApiController::sendPackage($this->packages);
                break;

            case '/api/audit':
                sendJson(['ok' => true, 'lines' => ApiController::auditTail(300)]);
                break;

            default:
                sendJson(['ok' => false, 'error' => 'Endpoint bulunamadı'], 404);
        }
    }
}
