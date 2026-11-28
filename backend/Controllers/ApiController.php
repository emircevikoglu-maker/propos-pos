<?php
declare(strict_types=1);

namespace ProPos\Controllers;

use ProPos\Services\AuthService;
use ProPos\Services\PinService;
use ProPos\Services\Realtime;
use ProPos\Services\Storage\StorageFactory;
use ProPos\Services\TenantService;
use ProPos\Services\Throttle;
use function ProPos\audit;
use function ProPos\clientIp;
use function ProPos\detectLanIp;
use function ProPos\envInt;
use function ProPos\installExceptionHandler;
use function ProPos\normalizeTenantId;
use function ProPos\mbSubstrSafe;
use function ProPos\qs;
use function ProPos\sendApiHeaders;
use function ProPos\sendJson;

/**
 * POS API (işletme cihazları). Kurucu/bayi uçları BİLEREK yok (3.10.0'da kaldırıldı);
 * yönetim yalnızca ayrı kontrol panelinde (backend/control.php).
 */
class ApiController
{
    private TenantService $tenants;
    private AuthService $auth;
    private PinService $pins;
    private Throttle $throttle;

    public function __construct()
    {
        $this->tenants = new TenantService();
        $this->auth = new AuthService($this->tenants);
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
        installExceptionHandler();
        $method = strtoupper($method);
        if ($path === '/api/keepalive') {
            $this->keepalive($method);
        }
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

            case '/api/auth/login': // 3.9.0: kullanıcı adı + parola
                if ($method !== 'POST') {
                    sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
                }
                $body = self::jsonBody($rawBody);
                $r = $this->auth->loginUser(
                    is_string($body['username'] ?? null) ? $body['username'] : '',
                    is_string($body['password'] ?? null) ? $body['password'] : ''
                );
                sendJson(['ok' => true] + $r);
                break;

            case '/api/sync':
                $this->sync($method, $rawBody);
                break;

            case '/api/feedback':
                $this->feedback($method, $rawBody);
                break;

            case '/api/realtime':
                $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
                $this->auth->requireTenant($tenantId);
                $cfg = Realtime::clientConfig($tenantId, $this->auth);
                sendJson($cfg ? ['ok' => true, 'enabled' => true] + $cfg : ['ok' => true, 'enabled' => false]);
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

            default:
                sendJson(['ok' => false, 'error' => 'Endpoint bulunamadı'], 404);
        }
    }

    /**
     * Herkese açık canlı-tutma ucu (cron, GitHub Actions, Vercel… her hosttan çağrılabilir: yalnızca bu uçta CORS `*`).
     * Yanıt hiçbir şey belli etmez: {ok:true}. Sıkı hız sınırı: IP başına ~4/gün, tüm istekler için 12 patlama + 2 saatte 1.
     */
    private function keepalive(string $method): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, HEAD, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Cache-Control, Pragma');
        header('Access-Control-Expose-Headers: Retry-After');
        header('Access-Control-Max-Age: 86400');
        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        if (!in_array($method, ['GET', 'POST', 'HEAD'], true)) {
            sendJson(['ok' => false], 405);
        }
        $penalty = envInt('PROPOS_RL_PENALTY', 30);
        [$ipCap, $ipRefill] = Throttle::bucketConfig('PROPOS_RL_KEEPALIVE', 4, 1 / 21600);
        [$allCap, $allRefill] = Throttle::bucketConfig('PROPOS_RL_KEEPALIVE_ALL', 12, 1 / 7200);
        foreach ([['ka|ip|' . clientIp(), $ipCap, $ipRefill], ['ka|all', $allCap, $allRefill]] as [$key, $cap, $refill]) {
            $r = $this->throttle->hit($key, $cap, $refill, max($penalty, 3600));
            if (!$r['ok']) {
                sendJson(['ok' => false], 429, ['Retry-After: ' . $r['retryAfter']]);
            }
        }
        $ok = false;
        try {
            $ok = StorageFactory::make()->ping();
        } catch (\Throwable $e) {
            $ok = false;
        }
        sendJson(['ok' => $ok], $ok ? 200 : 503);
    }

    /** Çalışan geri bildirimi: doğrulanır, sınırlanır, denetim günlüğüne tek satır yazılır (kontrol karakterleri temizlenir). */
    private function feedback(string $method, string $rawBody): void
    {
        if ($method !== 'POST') {
            sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
        }
        $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
        $this->auth->requireTenant($tenantId);
        [$cap, $refill] = Throttle::bucketConfig('PROPOS_RL_FEEDBACK', 10, 1 / 30);
        $r = $this->throttle->hit('fb|' . $tenantId . '|' . clientIp(), $cap, $refill, 30);
        if (!$r['ok']) {
            sendJson(['ok' => false, 'code' => 'RATE_LIMIT', 'retryAfter' => $r['retryAfter']], 429, ['Retry-After: ' . $r['retryAfter']]);
        }
        $b = self::jsonBody($rawBody);
        $kind = is_string($b['kind'] ?? null) ? $b['kind'] : '';
        if (!in_array($kind, ['confusing', 'slow', 'bug', 'idea'], true)) {
            sendJson(['ok' => false, 'error' => 'Geçersiz tür.'], 400);
        }
        $clean = static fn($v, int $max): string => mbSubstrSafe(trim((string)(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', is_string($v) ? $v : '') ?? '')), $max);
        $screen = preg_replace('/[^a-z]/', '', strtolower($clean($b['screen'] ?? '', 30))) ?: 'bilinmiyor';
        audit('feedback', $tenantId . ' | ' . $kind . ' | ' . $screen . ' | ' . $clean($b['text'] ?? '', 300));
        sendJson(['ok' => true]);
    }

    private function pinVerify(string $method, string $rawBody): void
    {
        if ($method !== 'POST') {
            sendJson(['ok' => false, 'error' => 'POST gerekli'], 405);
        }
        $tenantId = normalizeTenantId(qs('tenantId', 'DEFAULT'));
        $session = $this->auth->requireTenant($tenantId);
        $body = self::jsonBody($rawBody);
        $pin = is_string($body['pin'] ?? null) ? $body['pin'] : '';
        $r = $this->pins->verify($tenantId, $pin);
        if ($r['ok']) {
            // Kullanıcı oturumundan açılan yönetici kilidi aynı kullanıcıya bağlı kalır (kullanıcı kapatılınca o da düşer).
            $user = is_string($session['u'] ?? null) ? $session['u'] : null;
            sendJson(['ok' => true, 'role' => 'manager', 'token' => $this->auth->issueToken('manager', $tenantId, null, $user)]);
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
            $baseRevRaw = qs('baseRev', '');
            if ($baseRevRaw !== '' && (!ctype_digit($baseRevRaw) || strlen($baseRevRaw) > 15)) {
                sendJson(['ok' => false, 'error' => 'Geçersiz baseRev.'], 400);
            }
            $baseRev = $baseRevRaw !== '' ? (int)$baseRevRaw : null;
            $result = $this->tenants->saveTenant($tenantId, $rawBody, $deviceId, $baseRev);
            if (!empty($result['conflict'])) {
                sendJson(['ok' => false, 'code' => 'CONFLICT'] + $result, 409);
            }
            if ($result['ok'] && Realtime::enabled()) {
                // Yanıt istemciye gittikten sonra sinyal yayınla (kayıt gecikmesini artırmasın).
                $auth = $this->auth;
                register_shutdown_function(static function () use ($tenantId, $result, $auth): void {
                    if (function_exists('fastcgi_finish_request')) {
                        fastcgi_finish_request();
                    }
                    Realtime::notify($tenantId, (int)$result['rev'], (string)$result['updatedBy'], $auth);
                });
            }
            sendJson($result, $result['ok'] ? 200 : 400);
        }
        sendJson(['ok' => false, 'error' => 'Yöntem desteklenmiyor'], 405);
    }
}
