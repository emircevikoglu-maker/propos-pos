<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

use function ProPos\normalizeTenantId;

class FileStorage implements Storage
{
    private string $tenantsDir;
    private string $defaultFile;
    private string $registryFile;

    /** $dir verilirse (önbellek) tüm dosyalar o klasörde tutulur; verilmezse PROPOS_DATA_DIR düzeni. */
    public function __construct(?string $dir = null)
    {
        if ($dir === null) {
            $this->tenantsDir = PROPOS_TENANTS_DIR;
            $this->defaultFile = PROPOS_DEFAULT_DB_FILE;
            $this->registryFile = PROPOS_REGISTRY_FILE;
        } else {
            $this->tenantsDir = $dir . DIRECTORY_SEPARATOR . 'tenants';
            $this->defaultFile = $dir . DIRECTORY_SEPARATOR . 'default.json';
            $this->registryFile = $dir . DIRECTORY_SEPARATOR . 'registry.json';
            if (!is_dir($this->tenantsDir)) {
                @mkdir($this->tenantsDir, 0750, true);
            }
        }
    }

    public function name(): string
    {
        return 'file';
    }

    public function path(string $tenantId): string
    {
        $norm = normalizeTenantId($tenantId);
        return $norm === 'DEFAULT' ? $this->defaultFile : $this->tenantsDir . DIRECTORY_SEPARATOR . $norm . '.json';
    }

    /** Dosyanın son değişiklik zamanı (yoksa 0): önbellek geçerliliği için. */
    public function tenantMtime(string $tenantId): int
    {
        $f = $this->path($tenantId);
        clearstatcache(true, $f);
        return is_file($f) ? (int)filemtime($f) : 0;
    }

    public function registryMtime(): int
    {
        clearstatcache(true, $this->registryFile);
        return is_file($this->registryFile) ? (int)filemtime($this->registryFile) : 0;
    }

    public function readTenant(string $tenantId): ?string
    {
        $f = $this->path($tenantId);
        if (!is_file($f)) {
            return null;
        }
        $c = @file_get_contents($f);
        return ($c === false || trim($c) === '') ? null : $c;
    }

    public function writeTenant(string $tenantId, string $json, int $rev, string $updatedBy): bool
    {
        $f = $this->path($tenantId);
        $tmp = $f . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(3));
        if (@file_put_contents($tmp, $json, LOCK_EX) === false || !@rename($tmp, $f)) {
            @unlink($tmp);
            return false;
        }
        return true;
    }

    public function deleteTenant(string $tenantId): ?string
    {
        $f = $this->path($tenantId);
        if (!is_file($f)) {
            return null;
        }
        $raw = (string)file_get_contents($f);
        @unlink($f);
        return $raw;
    }

    public function stats(array $ids): array
    {
        $out = [];
        foreach ($ids as $id) {
            $file = $this->path($id);
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
            $out[$id] = ['bytes' => $size, 'rev' => $rev, 'updatedBy' => $by];
        }
        return $out;
    }

    public function readRegistry(): ?string
    {
        return is_file($this->registryFile) ? (string)@file_get_contents($this->registryFile) : null;
    }

    public function writeRegistry(string $json): bool
    {
        return @file_put_contents($this->registryFile, $json, LOCK_EX) !== false;
    }

    public function registryVersion(): string
    {
        clearstatcache(true, $this->registryFile);
        return is_file($this->registryFile) ? (string)filemtime($this->registryFile) . ':' . (string)filesize($this->registryFile) : '0';
    }

    public function ping(): bool
    {
        return is_dir(PROPOS_DATA_DIR) && is_writable(PROPOS_DATA_DIR);
    }
}
