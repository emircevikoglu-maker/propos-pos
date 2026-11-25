<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

/**
 * Yazma-geçişli (write-through) yerel önbellek: PHP tek yazıcı olduğu için okumalar yerel diskten (≈ms) gelir,
 * yazmalar ÖNCE uzak depoya (dayanıklılık) sonra yerel kopyaya yapılır. Uzak yazma başarısızsa yerel kopya DEĞİŞMEZ
 * (iki depo ayrışmaz) ve çağırana false döner. Uzak depoya dışarıdan (panelden) yapılan değişiklikler TTL sonunda görünür.
 * Neden: Supabase'e her istekte 2-3 gidiş-dönüş ≈ 0,5-1,5 sn; senkron yoklaması ve giriş bu gecikmeyi kaldıramaz.
 */
class CachedStorage implements Storage
{
    private Storage $remote;
    private FileStorage $local;
    private int $ttl;
    public int $remoteReads = 0;

    public function __construct(Storage $remote, FileStorage $local, int $ttlSeconds = 900)
    {
        $this->remote = $remote;
        $this->local = $local;
        $this->ttl = max(0, $ttlSeconds);
    }

    public function name(): string
    {
        return $this->remote->name();
    }

    private function fresh(int $mtime): bool
    {
        return $mtime > 0 && ($this->ttl === 0 || time() - $mtime < $this->ttl);
    }

    public function readTenant(string $tenantId): ?string
    {
        if ($this->fresh($this->local->tenantMtime($tenantId))) {
            $raw = $this->local->readTenant($tenantId);
            if ($raw !== null) {
                return $raw;
            }
        }
        $this->remoteReads++;
        $raw = $this->remote->readTenant($tenantId);
        if ($raw !== null) {
            $this->local->writeTenant($tenantId, $raw, 0, '');
        }
        return $raw;
    }

    public function writeTenant(string $tenantId, string $json, int $rev, string $updatedBy): bool
    {
        if (!$this->remote->writeTenant($tenantId, $json, $rev, $updatedBy)) {
            return false;
        }
        $this->local->writeTenant($tenantId, $json, $rev, $updatedBy);
        return true;
    }

    public function deleteTenant(string $tenantId): ?string
    {
        $raw = $this->remote->deleteTenant($tenantId);
        if ($raw !== null) {
            $this->local->deleteTenant($tenantId);
        }
        return $raw;
    }

    public function stats(array $ids): array
    {
        return $this->remote->stats($ids);
    }

    public function readRegistry(): ?string
    {
        if ($this->fresh($this->local->registryMtime())) {
            $raw = $this->local->readRegistry();
            if ($raw !== null) {
                return $raw;
            }
        }
        $this->remoteReads++;
        $raw = $this->remote->readRegistry();
        if ($raw !== null) {
            $this->local->writeRegistry($raw);
        }
        return $raw;
    }

    public function writeRegistry(string $json): bool
    {
        if (!$this->remote->writeRegistry($json)) {
            return false;
        }
        $this->local->writeRegistry($json);
        return true;
    }

    public function registryVersion(): string
    {
        return $this->local->registryVersion();
    }

    public function ping(): bool
    {
        return $this->remote->ping();
    }
}
