<?php
declare(strict_types=1);

namespace ProPos\Services;

use function ProPos\audit;
use function ProPos\normalizeTenantId;

class TenantService
{
    private const SECRET_FIELDS = ['syncKey', 'adminPin'];
    /** Tenant verisinde istemciye asla gönderilmeyen / istemciden asla alınmayan alanlar. */
    public const DATA_SECRET_FIELDS = ['adminPin', 'adminPinHash'];
    public const STATUSES = ['active', 'suspended'];
    public const PLANS = ['trial', 'monthly', 'yearly', 'lifetime'];

    public function getTenantFilePath(string $tenantId): string
    {
        $norm = normalizeTenantId($tenantId);
        return $norm === 'DEFAULT'
            ? PROPOS_DEFAULT_DB_FILE
            : PROPOS_TENANTS_DIR . DIRECTORY_SEPARATOR . $norm . '.json';
    }

    public function tenantExists(string $tenantId): bool
    {
        $norm = normalizeTenantId($tenantId);
        return $norm === 'DEFAULT' || $this->findRegistryEntry($norm) !== null;
    }

    /**
     * Yalnızca kendi dosyasını okur; kayıt yoksa BOŞ veri döner (başka işletmenin verisine asla düşmez).
     *
     * @return array{tenantId: string, json: string, data: array, rev: int, updatedBy: string}
     */
    public function loadTenant(string $tenantId): array
    {
        $norm = normalizeTenantId($tenantId);
        $filePath = $this->getTenantFilePath($norm);

        $rawJson = '{}';
        if (is_file($filePath)) {
            $content = @file_get_contents($filePath);
            if ($content !== false && trim($content) !== '') {
                $rawJson = $content;
            }
        }
        $decoded = json_decode($rawJson, true);
        if (!is_array($decoded)) {
            $decoded = [];
            $rawJson = '{}';
        }
        return [
            'tenantId'  => $norm,
            'json'      => $rawJson,
            'data'      => $decoded,
            'rev'       => (int)($decoded['rev'] ?? 0),
            'updatedBy' => (string)($decoded['updatedBy'] ?? 'init'),
        ];
    }

    /** İstemciye giden kopya: PIN ve hash çıkarılır. */
    public static function publicData(array $data): array
    {
        foreach (self::DATA_SECRET_FIELDS as $f) {
            unset($data[$f]);
        }
        return $data;
    }

    /** Ham veriyi atomik yazar (PIN gibi sunucu tarafı alanlar için). */
    public function writeTenantData(string $tenantId, array $data): bool
    {
        $filePath = $this->getTenantFilePath($tenantId);
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $tmpFile = $filePath . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(3));
        if ($encoded === false || @file_put_contents($tmpFile, $encoded, LOCK_EX) === false || !@rename($tmpFile, $filePath)) {
            @unlink($tmpFile);
            return false;
        }
        return true;
    }

    /**
     * @return array{ok: bool, tenantId: string, rev: int, updatedBy: string, error?: string}
     */
    public function saveTenant(string $tenantId, string $rawJson, string $deviceId = 'unknown'): array
    {
        $norm = normalizeTenantId($tenantId);
        $fail = static fn(string $msg): array => ['ok' => false, 'tenantId' => $norm, 'rev' => 0, 'updatedBy' => $deviceId, 'error' => $msg];

        if (strlen($rawJson) > PROPOS_MAX_DB_BYTES) {
            return $fail('Veri çok büyük.');
        }
        if (!$this->tenantExists($norm)) {
            return $fail('İşletme kaydı bulunamadı.');
        }
        $decoded = json_decode($rawJson, true);
        if (!is_array($decoded) || !isset($decoded['tables']) || !isset($decoded['products'])
            || !is_array($decoded['tables']) || !is_array($decoded['products'])) {
            return $fail('Geçersiz veri paketi.');
        }

        // PIN sunucuda tutulur: istemciden gelen PIN/hash yok sayılır, mevcut hash korunur.
        $current = $this->loadTenant($norm)['data'];
        $incomingPlainPin = isset($decoded['adminPin']) && is_string($decoded['adminPin']) ? $decoded['adminPin'] : null;
        foreach (self::DATA_SECRET_FIELDS as $f) {
            unset($decoded[$f]);
        }
        if (!empty($current['adminPinHash']) && is_string($current['adminPinHash'])) {
            $decoded['adminPinHash'] = $current['adminPinHash'];
        } elseif (!empty($current['adminPin']) && is_string($current['adminPin'])) {
            $decoded['adminPinHash'] = password_hash($current['adminPin'], PASSWORD_DEFAULT);
        } elseif ($incomingPlainPin !== null && PinService::isValidPin($incomingPlainPin)) {
            // Eski istemci, PIN'i hiç olmayan işletmeye ilk kez PIN gönderiyor: tek seferlik geçiş.
            $decoded['adminPinHash'] = password_hash($incomingPlainPin, PASSWORD_DEFAULT);
        }

        $rev = (int)round(microtime(true) * 1000);
        if ($rev <= (int)($current['rev'] ?? 0)) {
            $rev = (int)$current['rev'] + 1;
        }
        $deviceId = preg_replace('/[^A-Za-z0-9_\-.]/', '', $deviceId) ?: 'unknown';
        $decoded['rev'] = $rev;
        $decoded['updatedBy'] = substr($deviceId, 0, 60);
        $decoded['tenantId'] = $norm;

        $filePath = $this->getTenantFilePath($norm);
        $this->dailyBackup($norm, $filePath);

        if (!$this->writeTenantData($norm, $decoded)) {
            return $fail('Veri diske yazılamadı.');
        }
        return ['ok' => true, 'tenantId' => $norm, 'rev' => $rev, 'updatedBy' => $decoded['updatedBy']];
    }

    /** Günde bir kez yedek alır, 14 günden eskileri siler. */
    private function dailyBackup(string $tenantId, string $filePath): void
    {
        if (!is_file($filePath)) {
            return;
        }
        $target = PROPOS_BACKUP_DIR . DIRECTORY_SEPARATOR . $tenantId . '_' . date('Y-m-d') . '.json';
        if (is_file($target)) {
            return;
        }
        @copy($filePath, $target);
        foreach (glob(PROPOS_BACKUP_DIR . DIRECTORY_SEPARATOR . '*.json') ?: [] as $old) {
            if (filemtime($old) < time() - 14 * 86400) {
                @unlink($old);
            }
        }
    }

    // ---- Bayi / müşteri kaydı -------------------------------------------------

    /** @return array<int, array<string,mixed>> Anahtarlar DAHİL (yalnızca kurucuya gösterilir). */
    /** İstek içi önbellek: bir yoklamada kayıt dosyası 3-4 kez okunuyordu. Yazınca sıfırlanır. */
    private static ?array $registryCache = null;
    private static int $registryMtime = -1;

    public function loadRegistry(): array
    {
        clearstatcache(true, PROPOS_REGISTRY_FILE);
        $mtime = is_file(PROPOS_REGISTRY_FILE) ? (int)filemtime(PROPOS_REGISTRY_FILE) : 0;
        if (self::$registryCache !== null && self::$registryMtime === $mtime) {
            return self::$registryCache;
        }
        $list = [];
        if (is_file(PROPOS_REGISTRY_FILE)) {
            $parsed = json_decode((string)@file_get_contents(PROPOS_REGISTRY_FILE), true);
            if (is_array($parsed)) {
                $list = array_values(array_filter($parsed, 'is_array'));
            }
        }
        $dirty = false;
        $hasDefault = false;
        foreach ($list as &$entry) {
            $entry['tenantId'] = normalizeTenantId((string)($entry['tenantId'] ?? ''));
            if ($entry['tenantId'] === 'DEFAULT') {
                $hasDefault = true;
            }
            if (empty($entry['syncKey'])) {
                $entry['syncKey'] = AuthService::generateKey('SYNC', 3);
                $dirty = true;
            }
        }
        unset($entry);
        if (!$hasDefault) {
            array_unshift($list, [
                'tenantId' => 'DEFAULT', 'displayCode' => 'MASTER', 'businessName' => 'Ana İşletme',
                'ownerName' => 'Kurucu', 'adminPin' => '', 'licenseKey' => 'PROPOS-MASTER-UNLIMITED',
                'planType' => 'lifetime', 'status' => 'active', 'createdAt' => date('c'),
                'expiresAt' => 'unlimited', 'themeId' => 'emerald', 'currency' => 'TRY',
                'syncKey' => AuthService::generateKey('SYNC', 3),
            ]);
            $dirty = true;
        }
        if ($dirty) {
            $this->writeRegistry($list);
        }
        self::$registryCache = $list;
        self::$registryMtime = is_file(PROPOS_REGISTRY_FILE) ? (int)filemtime(PROPOS_REGISTRY_FILE) : 0;
        return $list;
    }

    public function findRegistryEntry(string $tenantId): ?array
    {
        $norm = normalizeTenantId($tenantId);
        foreach ($this->loadRegistry() as $entry) {
            if ($entry['tenantId'] === $norm) {
                return $entry;
            }
        }
        return null;
    }

    /** Kurucu dışındaki oturumlara: yalnızca kendi kaydı, gizli alanlar olmadan. */
    public function registryViewFor(string $tenantId): array
    {
        $entry = $this->findRegistryEntry($tenantId);
        if (!$entry) {
            return [];
        }
        foreach (self::SECRET_FIELDS as $field) {
            unset($entry[$field]);
        }
        return [$entry];
    }

    /**
     * Kurucudan gelen listeyi kaydeder. syncKey istemciden ASLA alınmaz:
     * var olan kayıtta korunur, yeni kayıtta sunucu üretir.
     */
    public function saveRegistry(string $rawBody): bool
    {
        $parsed = json_decode($rawBody, true);
        if (!is_array($parsed) || count($parsed) > 5000) {
            return false;
        }
        $existing = [];
        foreach ($this->loadRegistry() as $e) {
            $existing[$e['tenantId']] = $e;
        }
        $next = [];
        $seen = [];
        foreach ($parsed as $entry) {
            if (!is_array($entry) || empty($entry['tenantId'])) {
                continue;
            }
            $id = normalizeTenantId((string)$entry['tenantId']);
            if (isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $entry['tenantId'] = $id;
            $entry['syncKey'] = $existing[$id]['syncKey'] ?? AuthService::generateKey('SYNC', 3);
            $next[] = $entry;
        }
        if (!isset($seen['DEFAULT']) && isset($existing['DEFAULT'])) {
            array_unshift($next, $existing['DEFAULT']);
        }
        audit('registry.save', (string)count($next));
        return $this->writeRegistry($next);
    }

    /**
     * Kontrol panelinden tek kayıt oluşturur/günceller. Alanlar doğrulanır; syncKey istemciden alınmaz.
     *
     * @return array{ok:bool, error?:string, tenant?:array}
     */
    public function upsertEntry(array $input): array
    {
        $str = static fn($v, string $d = ''): string => is_string($v) ? $v : (is_int($v) ? (string)$v : $d);
        $rawId = strtoupper(trim($str($input['tenantId'] ?? '')));
        if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{2,39}$/', $rawId)) {
            return ['ok' => false, 'error' => 'İşletme kodu 3-40 karakter olmalı (A-Z, 0-9, - _).'];
        }
        $id = normalizeTenantId($rawId);
        $clean = static fn($v, int $max): string => substr(trim((string)(preg_replace('/[\x00-\x1F\x7F]/', '', is_scalar($v) ? (string)$v : '') ?? '')), 0, $max);
        $name = $clean($input['businessName'] ?? '', 400);
        if ($name === '' || strlen($name) > 120) {
            return ['ok' => false, 'error' => 'İşletme adı gerekli (en fazla 120 bayt).'];
        }
        $status = $str($input['status'] ?? 'active', '?');
        $plan = $str($input['planType'] ?? 'yearly', '?');
        if (!in_array($status, self::STATUSES, true) || !in_array($plan, self::PLANS, true)) {
            return ['ok' => false, 'error' => 'Geçersiz durum ya da paket.'];
        }
        $expires = $str($input['expiresAt'] ?? 'unlimited', '?');
        if ($expires !== 'unlimited') {
            $ts = preg_match('/^\d{4}-\d{2}-\d{2}/', $expires) ? strtotime($expires) : false;
            if ($ts === false) {
                return ['ok' => false, 'error' => 'Geçersiz bitiş tarihi.'];
            }
            $expires = gmdate('c', $ts);
        }
        $pin = isset($input['initialPin']) && is_scalar($input['initialPin']) ? (string)$input['initialPin'] : '';
        if ($pin !== '' && !PinService::isValidPin($pin)) {
            return ['ok' => false, 'error' => 'PIN 4-12 karakter olmalı, boşluk içermemeli.'];
        }

        $list = $this->loadRegistry();
        $idx = null;
        foreach ($list as $i => $e) {
            if ($e['tenantId'] === $id) {
                $idx = $i;
            }
        }
        $isNew = $idx === null;
        if (!$isNew && !empty($input['mustBeNew'])) {
            return ['ok' => false, 'error' => 'Bu işletme kodu zaten kayıtlı.'];
        }
        $base = $isNew ? ['createdAt' => gmdate('c'), 'syncKey' => AuthService::generateKey('SYNC', 3)] : $list[$idx];
        $currency = $input['currency'] ?? ($base['currency'] ?? 'TRY');
        $entry = array_merge($base, [
            'tenantId' => $id,
            'displayCode' => $id === 'DEFAULT' ? 'MASTER' : $id,
            'businessName' => $name,
            'ownerName' => $clean($input['ownerName'] ?? ($base['ownerName'] ?? ''), 120),
            'phone' => $clean($input['phone'] ?? ($base['phone'] ?? ''), 40),
            'note' => $clean($input['note'] ?? ($base['note'] ?? ''), 500),
            'planType' => $plan,
            'status' => $status,
            'expiresAt' => $expires,
            'currency' => in_array($currency, ['TRY', 'USD', 'EUR', 'GBP'], true) ? $currency : 'TRY',
            'updatedAt' => gmdate('c'),
        ]);
        unset($entry['adminPin']);
        if ($isNew) {
            $list[] = $entry;
        } else {
            $list[$idx] = $entry;
        }
        if (!$this->writeRegistry($list)) {
            return ['ok' => false, 'error' => 'Kayıt diske yazılamadı.'];
        }
        if ($pin !== '') {
            // Başlangıç PIN'i yalnızca hash olarak tenant verisine yazılır.
            $state = $this->loadTenant($id)['data'];
            $state += ['tables' => [], 'products' => []];
            unset($state['adminPin']);
            $state['adminPinHash'] = password_hash($pin, PASSWORD_DEFAULT);
            $this->writeTenantData($id, $state);
        }
        audit($isNew ? 'tenant.create' : 'tenant.update', $id);
        return ['ok' => true, 'tenant' => $entry];
    }

    public function rotateSyncKey(string $tenantId): ?string
    {
        $id = normalizeTenantId($tenantId);
        $list = $this->loadRegistry();
        $key = null;
        foreach ($list as &$e) {
            if ($e['tenantId'] === $id) {
                $e['syncKey'] = AuthService::generateKey('SYNC', 3);
                $e['keyRotatedAt'] = gmdate('c');
                $key = $e['syncKey'];
            }
        }
        unset($e);
        if ($key === null || !$this->writeRegistry($list)) {
            return null;
        }
        audit('tenant.rotate_key', $id);
        return $key;
    }

    /** Kaydı siler; veri dosyası silinmez, yedek klasörüne taşınır. DEFAULT silinemez. */
    public function deleteEntry(string $tenantId): bool
    {
        $id = normalizeTenantId($tenantId);
        if ($id === 'DEFAULT') {
            return false;
        }
        $list = $this->loadRegistry();
        $next = array_values(array_filter($list, static fn($e) => $e['tenantId'] !== $id));
        if (count($next) === count($list) || !$this->writeRegistry($next)) {
            return false;
        }
        $file = $this->getTenantFilePath($id);
        if (is_file($file)) {
            @rename($file, PROPOS_BACKUP_DIR . DIRECTORY_SEPARATOR . 'deleted_' . $id . '_' . date('Ymd_His') . '.json');
        }
        audit('tenant.delete', $id);
        return true;
    }

    /** Panel için: son senkron (rev), cihaz ve veri boyutu. Dosya bütünüyle çözülmez. */
    public function stats(): array
    {
        $out = [];
        foreach ($this->loadRegistry() as $e) {
            $file = $this->getTenantFilePath($e['tenantId']);
            $size = is_file($file) ? (int)filesize($file) : 0;
            $rev = 0;
            $by = '';
            if ($size > 0) {
                $head = (string)@file_get_contents($file, false, null, 0, 65536);
                $tail = $size > 65536 ? (string)@file_get_contents($file, false, null, $size - 4096) : '';
                if (preg_match_all('/"rev":(\d+)/', $head . $tail, $m)) {
                    $rev = (int)max(array_map('intval', $m[1]));
                }
                if (preg_match('/"updatedBy":"([A-Za-z0-9_\-.]{0,60})"/', $head . $tail, $m2)) {
                    $by = $m2[1];
                }
            }
            $out[$e['tenantId']] = ['bytes' => $size, 'rev' => $rev, 'updatedBy' => $by];
        }
        return $out;
    }

    private function writeRegistry(array $list): bool
    {
        self::$registryCache = null;
        $encoded = json_encode(array_values($list), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        return @file_put_contents(PROPOS_REGISTRY_FILE, $encoded, LOCK_EX) !== false;
    }
}
