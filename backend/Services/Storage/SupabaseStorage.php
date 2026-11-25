<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

use function ProPos\normalizeTenantId;

/**
 * Supabase (PostgREST) deposu. Yalnızca sunucu tarafında, secret/service_role anahtarıyla çalışır;
 * tablolarda RLS açık ve politika yok (bkz. supabase/migrations/001_propos_init.sql).
 * Anahtar yalnızca `apikey` başlığında gider, günlüğe/hata metnine yazılmaz.
 */
class SupabaseStorage implements Storage
{
    private string $url;
    private string $key;
    private int $timeout;
    /** Son hata (anahtar içermez) — tanılama için. */
    public string $lastError = '';

    public function __construct(?string $url = null, ?string $key = null, int $timeoutSec = 12)
    {
        $this->url = rtrim((string)($url ?? getenv('SUPABASE_URL')), '/');
        $this->key = (string)($key ?? getenv('SUPABASE_SECRET_KEY'));
        $this->timeout = $timeoutSec;
        if ($this->url === '' || $this->key === '') {
            throw new \RuntimeException('SUPABASE_URL ve SUPABASE_SECRET_KEY tanımlı olmalı.');
        }
        if (!preg_match('#^https://[a-z0-9.-]+$#i', $this->url)) {
            throw new \RuntimeException('SUPABASE_URL https://… biçiminde olmalı.');
        }
    }

    public function name(): string
    {
        return 'supabase';
    }

    /**
     * @return array{status:int, body:string}
     */
    public function request(string $method, string $path, ?string $body = null, array $headers = []): array
    {
        // Tek curl tutamacı istek boyunca yeniden kullanılır: TLS el sıkışması her çağrıda tekrarlanmaz (≈2-3 kat hızlanma).
        static $shared = null;
        if ($shared === null) {
            $shared = curl_init();
        }
        $ch = $shared;
        curl_reset($ch);
        curl_setopt($ch, CURLOPT_URL, $this->url . $path);
        $h = array_merge(['apikey: ' . $this->key, 'Content-Type: application/json', 'Accept: application/json'], $headers);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $h,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        $res = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            $this->lastError = 'ağ: ' . curl_error($ch);
            $status = 0;
            $res = '';
        } elseif ($status >= 400) {
            $this->lastError = "HTTP $status";
        }
        return ['status' => $status, 'body' => (string)$res];
    }

    private function id(string $tenantId): string
    {
        return rawurlencode(normalizeTenantId($tenantId));
    }

    public function readTenant(string $tenantId): ?string
    {
        $r = $this->request('GET', '/rest/v1/propos_tenant_state?tenant_id=eq.' . $this->id($tenantId) . '&select=data&limit=1');
        if ($r['status'] !== 200) {
            return null;
        }
        $rows = json_decode($r['body'], true);
        if (!is_array($rows) || !isset($rows[0]) || !array_key_exists('data', $rows[0])) {
            return null;
        }
        $data = $rows[0]['data'];
        return (is_array($data) && $data === []) ? null : json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function writeTenant(string $tenantId, string $json, int $rev, string $updatedBy): bool
    {
        // $json zaten doğrulanmış geçerli JSON; yeniden kodlamadan gövdeye gömülür (büyük veride bellek/zaman tasarrufu).
        $body = '{"tenant_id":' . json_encode(normalizeTenantId($tenantId)) . ',"rev":' . $rev . ',"updated_by":' . json_encode($updatedBy)
            . ',"updated_at":' . json_encode(gmdate('c')) . ',"data":' . $json . '}';
        $r = $this->request('POST', '/rest/v1/propos_tenant_state?on_conflict=tenant_id', $body, ['Prefer: resolution=merge-duplicates,return=minimal']);
        return $r['status'] >= 200 && $r['status'] < 300;
    }

    public function deleteTenant(string $tenantId): ?string
    {
        $raw = $this->readTenant($tenantId);
        $r = $this->request('DELETE', '/rest/v1/propos_tenant_state?tenant_id=eq.' . $this->id($tenantId), null, ['Prefer: return=minimal']);
        return ($r['status'] >= 200 && $r['status'] < 300) ? ($raw ?? '{}') : null;
    }

    public function stats(array $ids): array
    {
        $out = [];
        foreach ($ids as $id) {
            $out[$id] = ['bytes' => 0, 'rev' => 0, 'updatedBy' => ''];
        }
        $r = $this->request('GET', '/rest/v1/propos_tenant_state?select=tenant_id,rev,updated_by&limit=5000');
        if ($r['status'] === 200) {
            foreach ((array)json_decode($r['body'], true) as $row) {
                if (isset($row['tenant_id']) && array_key_exists($row['tenant_id'], $out)) {
                    $out[$row['tenant_id']] = ['bytes' => 0, 'rev' => (int)($row['rev'] ?? 0), 'updatedBy' => (string)($row['updated_by'] ?? '')];
                }
            }
        }
        return $out;
    }

    public function readRegistry(): ?string
    {
        $r = $this->request('GET', '/rest/v1/propos_registry?id=eq.1&select=data&limit=1');
        if ($r['status'] !== 200) {
            return null;
        }
        $rows = json_decode($r['body'], true);
        if (!is_array($rows) || !isset($rows[0]['data']) || !is_array($rows[0]['data'])) {
            return null;
        }
        return json_encode($rows[0]['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function writeRegistry(string $json): bool
    {
        $body = '{"id":1,"updated_at":' . json_encode(gmdate('c')) . ',"data":' . $json . '}';
        $r = $this->request('POST', '/rest/v1/propos_registry?on_conflict=id', $body, ['Prefer: resolution=merge-duplicates,return=minimal']);
        return $r['status'] >= 200 && $r['status'] < 300;
    }

    public function registryVersion(): string
    {
        return 'remote'; // istek ömrü boyunca önbellek; yazınca TenantService sıfırlar
    }

    public function ping(): bool
    {
        $r = $this->request('POST', '/rest/v1/rpc/propos_keepalive', '{}');
        if ($r['status'] === 200) {
            return true;
        }
        // Fonksiyon henüz kurulmadıysa en az bir tablo sorgusu veritabanını uyandırır.
        $r = $this->request('GET', '/rest/v1/propos_registry?select=id&limit=1');
        return $r['status'] === 200;
    }
}
