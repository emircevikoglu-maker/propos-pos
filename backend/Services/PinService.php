<?php
declare(strict_types=1);

namespace ProPos\Services;

use function ProPos\audit;
use function ProPos\clientIp;
use function ProPos\normalizeTenantId;

/**
 * Yönetici PIN'i: yalnızca sunucuda, hash olarak durur. İstemci PIN'i ve uzunluğunu bilmez.
 * Kaynak sırası: tenant verisindeki adminPinHash → eski düz adminPin (geçiş) → bayi kaydındaki adminPin (geçiş).
 */
class PinService
{
    public const MAX_FAILS = 6;
    public const FAIL_WINDOW = 300;

    private TenantService $tenants;
    private Throttle $throttle;

    public function __construct(TenantService $tenants, ?Throttle $throttle = null)
    {
        $this->tenants = $tenants;
        $this->throttle = $throttle ?? new Throttle();
    }

    public static function isValidPin(string $pin): bool
    {
        return (bool)preg_match('/^\S{4,12}$/u', $pin) && strlen($pin) <= 48;
    }

    /** Hash'i döndürür; düz metin PIN bulursa hash'e çevirip düz metni siler. */
    public function currentHash(string $tenantId): ?string
    {
        $id = normalizeTenantId($tenantId);
        $state = $this->tenants->loadTenant($id)['data'];
        if (!empty($state['adminPinHash']) && is_string($state['adminPinHash'])) {
            return $state['adminPinHash'];
        }
        $plain = null;
        if (!empty($state['adminPin']) && is_string($state['adminPin'])) {
            $plain = $state['adminPin'];
        } else {
            $entry = $this->tenants->findRegistryEntry($id);
            if ($entry && !empty($entry['adminPin']) && is_string($entry['adminPin'])) {
                $plain = $entry['adminPin'];
            }
        }
        if ($plain === null) {
            return null;
        }
        $hash = password_hash($plain, PASSWORD_DEFAULT);
        if (!empty($state)) {
            unset($state['adminPin']);
            $state['adminPinHash'] = $hash;
            $this->tenants->writeTenantData($id, $state);
            audit('pin.migrate', $id);
        }
        return $hash;
    }

    public function hasPin(string $tenantId): bool
    {
        return $this->currentHash($tenantId) !== null;
    }

    private function failKey(string $tenantId): string
    {
        return 'pin|' . normalizeTenantId($tenantId) . '|' . clientIp();
    }

    /** Kilitliyse kalan saniye, değilse 0. */
    public function lockedFor(string $tenantId): int
    {
        $key = $this->failKey($tenantId);
        if ($this->throttle->failCount($key, self::FAIL_WINDOW) >= self::MAX_FAILS) {
            return $this->throttle->failRetryAfter($key, self::FAIL_WINDOW);
        }
        return 0;
    }

    /** @return array{ok:bool, code?:string, retryAfter?:int, attemptsLeft?:int} */
    public function verify(string $tenantId, string $pin): array
    {
        $id = normalizeTenantId($tenantId);
        $locked = $this->lockedFor($id);
        if ($locked > 0) {
            return ['ok' => false, 'code' => 'RATE_LIMIT', 'retryAfter' => $locked];
        }
        $hash = $this->currentHash($id);
        if ($hash === null) {
            return ['ok' => false, 'code' => 'NO_PIN'];
        }
        if (strlen($pin) <= 48 && password_verify($pin, $hash)) {
            $this->throttle->clearFails($this->failKey($id));
            audit('pin.ok', $id);
            return ['ok' => true];
        }
        $n = $this->throttle->registerFail($this->failKey($id), self::FAIL_WINDOW);
        audit('pin.fail', $id);
        return ['ok' => false, 'code' => 'BAD_PIN', 'attemptsLeft' => max(0, self::MAX_FAILS - $n)];
    }

    /**
     * PIN değiştirir. Mevcut PIN varsa ya doğru mevcut PIN ya da yönetici oturumu gerekir.
     *
     * @return array{ok:bool, code?:string, error?:string, retryAfter?:int}
     */
    public function change(string $tenantId, ?string $current, string $next, bool $managerSession): array
    {
        $id = normalizeTenantId($tenantId);
        if (!self::isValidPin($next)) {
            return ['ok' => false, 'code' => 'INVALID', 'error' => 'PIN 4-12 karakter olmalı, boşluk içermemeli.'];
        }
        if ($this->hasPin($id) && !$managerSession) {
            $check = $this->verify($id, (string)$current);
            if (!$check['ok']) {
                return $check + ['error' => 'Mevcut PIN hatalı.'];
            }
        }
        $state = $this->tenants->loadTenant($id)['data'];
        $state += ['tables' => [], 'products' => []];
        unset($state['adminPin']);
        $state['adminPinHash'] = password_hash($next, PASSWORD_DEFAULT);
        if (!$this->tenants->writeTenantData($id, $state)) {
            return ['ok' => false, 'code' => 'IO', 'error' => 'PIN kaydedilemedi.'];
        }
        audit('pin.change', $id);
        return ['ok' => true];
    }
}
