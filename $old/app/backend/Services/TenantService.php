<?php
declare(strict_types=1);

namespace ProPos\Services;

use function ProPos\normalizeTenantId;

class TenantService
{
    public function getTenantFilePath(string $tenantId): string
    {
        $norm = normalizeTenantId($tenantId);
        if ($norm === 'DEFAULT') {
            return PROPOS_DEFAULT_DB_FILE;
        }
        return PROPOS_TENANTS_DIR . DIRECTORY_SEPARATOR . $norm . '.json';
    }

    /**
     * Load tenant state including raw JSON, revision timestamp, and updatedBy device.
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
        } elseif (is_file(PROPOS_DEFAULT_DB_FILE)) {
            $content = @file_get_contents(PROPOS_DEFAULT_DB_FILE);
            if ($content !== false && trim($content) !== '') {
                $rawJson = $content;
            }
        }

        $decoded = json_decode($rawJson, true);
        if (!is_array($decoded)) {
            $decoded = [];
            $rawJson = '{}';
        }

        $rev = isset($decoded['rev']) ? (int)$decoded['rev'] : (is_file($filePath) ? (int)(filemtime($filePath) * 1000) : (int)round(microtime(true) * 1000));
        $updatedBy = isset($decoded['updatedBy']) ? (string)$decoded['updatedBy'] : 'init';

        return [
            'tenantId'  => $norm,
            'json'      => $rawJson,
            'data'      => $decoded,
            'rev'       => $rev,
            'updatedBy' => $updatedBy,
        ];
    }

    /**
     * Atomically save tenant database JSON to disk.
     *
     * @return array{ok: bool, tenantId: string, rev: int, updatedBy: string}
     */
    public function saveTenant(string $tenantId, string $rawJson, string $deviceId = 'unknown'): array
    {
        $norm = normalizeTenantId($tenantId);
        $decoded = json_decode($rawJson, true);

        if (!is_array($decoded) || !isset($decoded['tables']) || !isset($decoded['products'])) {
            return ['ok' => false, 'tenantId' => $norm, 'rev' => 0, 'updatedBy' => $deviceId];
        }

        $rev = (int)round(microtime(true) * 1000);
        $decoded['rev'] = $rev;
        $decoded['updatedBy'] = $deviceId !== '' ? $deviceId : 'unknown';
        $decoded['tenantId'] = $norm;

        $filePath = $this->getTenantFilePath($norm);
        $encoded = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $tmpFile = $filePath . '.tmp.' . getmypid();
        if (@file_put_contents($tmpFile, $encoded, LOCK_EX) !== false) {
            @rename($tmpFile, $filePath);
        } else {
            @file_put_contents($filePath, $encoded, LOCK_EX);
        }

        return [
            'ok'        => true,
            'tenantId'  => $norm,
            'rev'       => $rev,
            'updatedBy' => $decoded['updatedBy'],
        ];
    }

    /**
     * Load dealer customer registry list.
     */
    public function loadRegistry(): array
    {
        if (is_file(PROPOS_REGISTRY_FILE)) {
            $raw = @file_get_contents(PROPOS_REGISTRY_FILE);
            if ($raw !== false) {
                $parsed = json_decode($raw, true);
                if (is_array($parsed)) {
                    return $parsed;
                }
            }
        }
        return [];
    }

    /**
     * Save dealer customer registry list.
     */
    public function saveRegistry(string $rawBody): bool
    {
        $parsed = json_decode($rawBody, true);
        if (!is_array($parsed)) {
            return false;
        }
        $encoded = json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        return @file_put_contents(PROPOS_REGISTRY_FILE, $encoded, LOCK_EX) !== false;
    }
}
