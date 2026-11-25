<?php
declare(strict_types=1);

namespace ProPos\Services;

use function ProPos\audit;
use function ProPos\clientIp;
use function ProPos\envInt;
use function ProPos\normalizeTenantId;
use function ProPos\sendJson;

/**
 * İmzalı (HMAC) oturum belirteci + kurucu anahtarı + işletme bağlantı anahtarı.
 * Kurucu anahtarı yalnızca hash olarak saklanır; ilk kurulumda üretilip data/KURUCU_ANAHTARI.txt
 * dosyasına bir kez yazılır (okuyup silebilirsiniz).
 */
class AuthService
{
    private const TOKEN_TTL = 43200; // 12 saat
    private const MANAGER_TTL = 14400; // yönetici kilidi 4 saat
    private const MAX_FAILS = 8;
    private const FAIL_WINDOW = 600;

    private array $config;
    private TenantService $tenants;

    public function __construct(TenantService $tenants)
    {
        $this->tenants = $tenants;
        $this->config = $this->loadConfig();
    }

    private function loadConfig(): array
    {
        if (is_file(PROPOS_CONFIG_FILE)) {
            $cfg = json_decode((string)file_get_contents(PROPOS_CONFIG_FILE), true);
            if (is_array($cfg) && !empty($cfg['secret']) && !empty($cfg['founderHash'])) {
                return $cfg;
            }
        }
        $envKey = getenv('PROPOS_FOUNDER_KEY');
        $plain = $envKey ?: self::generateKey('PROPOS', 3);
        $cfg = [
            'secret' => bin2hex(random_bytes(32)),
            'founderHash' => password_hash($plain, PASSWORD_DEFAULT),
            'createdAt' => date('c'),
        ];
        file_put_contents(PROPOS_CONFIG_FILE, json_encode($cfg, JSON_PRETTY_PRINT), LOCK_EX);
        if (!$envKey) {
            file_put_contents(
                PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'KURUCU_ANAHTARI.txt',
                "ProPos kurucu anahtari (ilk kurulumda uretildi; guvenli bir yere kaydedip bu dosyayi silin):\r\n" . $plain . "\r\n"
            );
        }
        audit('config.created');
        return $cfg;
    }

    /** Sunucu sırrından etiketli türetilmiş değer (kanal adı gibi tahmin edilemez tanımlayıcılar için). */
    public function derive(string $label): string
    {
        return hash_hmac('sha256', $label, $this->config['secret']);
    }

    public static function generateKey(string $prefix, int $groups): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $parts = [$prefix];
        for ($g = 0; $g < $groups; $g++) {
            $part = '';
            for ($i = 0; $i < 4; $i++) {
                $part .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $parts[] = $part;
        }
        return implode('-', $parts);
    }

    private static function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private function sign(string $body): string
    {
        return self::b64(hash_hmac('sha256', $body, $this->config['secret'], true));
    }

    public const ROLES = ['founder', 'tenant', 'manager'];

    /** Anahtar parmak izi: anahtar yenilenince o anahtarla alınmış tüm oturumlar düşer. */
    public static function keyFingerprint(?array $entry): string
    {
        return substr(hash('sha256', (string)($entry['syncKey'] ?? '')), 0, 12);
    }

    public function issueToken(string $role, string $tenantId, ?int $ttl = null): string
    {
        $ttl = $ttl ?? ($role === 'manager' ? self::MANAGER_TTL : self::TOKEN_TTL);
        $payload = ['r' => $role, 't' => $tenantId, 'e' => time() + $ttl];
        if ($role !== 'founder') {
            $payload['k'] = self::keyFingerprint($this->tenants->findRegistryEntry($tenantId));
        }
        $body = self::b64((string)json_encode($payload));
        return $body . '.' . $this->sign($body);
    }

    /** @return array{r:string,t:string,e:int}|null */
    public function verifyToken(string $token): ?array
    {
        if (strlen($token) > 1024) {
            return null;
        }
        $parts = explode('.', $token);
        if (count($parts) !== 2 || $parts[0] === '' || !hash_equals($this->sign($parts[0]), $parts[1])) {
            return null;
        }
        $payload = json_decode((string)base64_decode(strtr($parts[0], '-_', '+/'), true), true);
        if (!is_array($payload) || !is_string($payload['r'] ?? null) || !is_string($payload['t'] ?? null)
            || !is_int($payload['e'] ?? null) || !in_array($payload['r'], self::ROLES, true) || $payload['e'] < time()) {
            return null;
        }
        return $payload;
    }

    /** @return array{r:string,t:string,e:int}|null */
    public function currentSession(): ?array
    {
        $token = (string)($_SERVER['HTTP_X_PROPOS_TOKEN'] ?? '');
        return $token !== '' ? $this->verifyToken($token) : null;
    }

    public function requireFounder(): array
    {
        $s = $this->currentSession();
        if (!$s || $s['r'] !== 'founder') {
            sendJson(['ok' => false, 'error' => 'Bu işlem için kurucu yetkisi gerekir.', 'code' => 'AUTH'], 401);
        }
        return $s;
    }

    public function requireTenant(string $tenantId): array
    {
        $s = $this->currentSession();
        if (!$s || ($s['r'] !== 'founder' && $s['t'] !== $tenantId)) {
            sendJson(['ok' => false, 'error' => 'Oturum gerekli.', 'code' => 'AUTH'], 401);
        }
        if ($s['r'] !== 'founder') {
            $fp = self::keyFingerprint($this->tenants->findRegistryEntry($tenantId));
            if (!is_string($s['k'] ?? null) || !hash_equals($fp, $s['k'])) {
                sendJson(['ok' => false, 'error' => 'Oturum geçersiz (anahtar yenilenmiş).', 'code' => 'AUTH'], 401);
            }
        }
        return $s;
    }

    /** Yönetici (PIN ile açılmış) ya da kurucu oturumu. */
    public function isManager(array $session, string $tenantId): bool
    {
        return $session['r'] === 'founder' || ($session['r'] === 'manager' && $session['t'] === $tenantId);
    }

    /** null: geçerli; aksi hâlde müşteriye gösterilecek neden. */
    public static function licenseProblem(?array $entry): ?string
    {
        if (!$entry || ($entry['tenantId'] ?? '') === 'DEFAULT') {
            return null;
        }
        if (($entry['status'] ?? 'active') === 'suspended') {
            return 'İşletme lisansı askıya alınmış. Bayinizle görüşün.';
        }
        $exp = (string)($entry['expiresAt'] ?? 'unlimited');
        if ($exp !== '' && $exp !== 'unlimited') {
            $ts = strtotime($exp);
            if ($ts !== false && $ts < time()) {
                return 'Lisans süresi dolmuş. Bayinizle görüşün.';
            }
        }
        return null;
    }

    /**
     * $founderOnly: kontrol paneli girişi; işletme anahtarları kabul edilmez.
     */
    public function login(string $tenantId, string $key, bool $founderOnly = false): array
    {
        $tenantId = normalizeTenantId($tenantId);
        $this->failScope = $founderOnly ? 'control' : 'pos';
        $this->throttle();
        $key = trim($key);
        if (strlen($key) > 200) {
            $key = '';
        }

        if ($key !== '' && password_verify($key, $this->config['founderHash'])) {
            $this->clearFails();
            audit($founderOnly ? 'control.login' : 'login.founder', $tenantId);
            return ['role' => 'founder', 'token' => $this->issueToken('founder', $founderOnly ? '*' : $tenantId)];
        }
        if (!$founderOnly) {
            $entry = $this->tenants->findRegistryEntry($tenantId);
            if ($entry && $key !== '' && !empty($entry['syncKey']) && hash_equals((string)$entry['syncKey'], $key)) {
                $this->clearFails();
                $problem = self::licenseProblem($entry);
                if ($problem !== null) {
                    audit('login.license', $tenantId);
                    sendJson(['ok' => false, 'error' => $problem, 'code' => 'LICENSE'], 403);
                }
                audit('login.tenant', $tenantId);
                return ['role' => 'tenant', 'token' => $this->issueToken('tenant', $tenantId)];
            }
        }
        $this->registerFail();
        $delay = envInt('PROPOS_LOGIN_DELAY_MS', 400);
        if ($delay > 0) {
            usleep($delay * 1000);
        }
        audit($founderOnly ? 'control.login.fail' : 'login.fail', $tenantId);
        sendJson(['ok' => false, 'error' => 'Anahtar hatalı.', 'code' => 'BAD_KEY'], 401);
    }

    /** POS girişleri ile kontrol paneli girişi ayrı sayılır: bozuk anahtarlı bir tablet kurucuyu kilitlemez. */
    private string $failScope = 'pos';

    private function failKey(): string
    {
        return 'login|' . $this->failScope . '|' . clientIp();
    }

    private function throttle(): void
    {
        $t = new Throttle();
        if ($t->failCount($this->failKey(), self::FAIL_WINDOW) >= self::MAX_FAILS) {
            $retry = $t->failRetryAfter($this->failKey(), self::FAIL_WINDOW);
            sendJson(['ok' => false, 'error' => 'Çok fazla hatalı deneme. Biraz sonra tekrar deneyin.', 'code' => 'RATE_LIMIT', 'retryAfter' => $retry], 429, ['Retry-After: ' . $retry]);
        }
    }

    private function registerFail(): void
    {
        (new Throttle())->registerFail($this->failKey(), self::FAIL_WINDOW);
    }

    private function clearFails(): void
    {
        (new Throttle())->clearFails($this->failKey());
    }
}
