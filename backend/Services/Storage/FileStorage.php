<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

use function ProPos\normalizeTenantId;

class FileStorage implements Storage
{
    public function name(): string
    {
        return 'file';
    }

    public function path(string $tenantId): string
    {
        $norm = normalizeTenantId($tenantId);
        return $norm === 'DEFAULT' ? PROPOS_DEFAULT_DB_FILE : PROPOS_TENANTS_DIR . DIRECTORY_SEPARATOR . $norm . '.json';
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
        return is_file(PROPOS_REGISTRY_FILE) ? (string)@file_get_contents(PROPOS_REGISTRY_FILE) : null;
    }

    public function writeRegistry(string $json): bool
    {
        return @file_put_contents(PROPOS_REGISTRY_FILE, $json, LOCK_EX) !== false;
    }

    public function registryVersion(): string
    {
        clearstatcache(true, PROPOS_REGISTRY_FILE);
        return is_file(PROPOS_REGISTRY_FILE) ? (string)filemtime(PROPOS_REGISTRY_FILE) . ':' . (string)filesize(PROPOS_REGISTRY_FILE) : '0';
    }

    public function ping(): bool
    {
        return is_dir(PROPOS_DATA_DIR) && is_writable(PROPOS_DATA_DIR);
    }
}
