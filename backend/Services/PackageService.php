<?php
declare(strict_types=1);

namespace ProPos\Services;

use function ProPos\audit;
use function ProPos\normalizeTenantId;

class PackageService
{
    private TenantService $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    /**
     * Müşteriye özel kilitli kurulum ZIP'i. İçine YALNIZCA o müşterinin kaydı ve verisi girer;
     * diğer müşteriler ve ana işletme verisi asla paketlenmez.
     *
     * @return array{filename: string, bytes: string}
     */
    public function buildCustomerZip(string $tenantId, string $businessName, string $appVersion): array
    {
        $normTenant = normalizeTenantId($tenantId);
        $entry = $this->tenantService->findRegistryEntry($normTenant) ?? [];
        $bizName = trim($businessName) !== '' ? trim($businessName) : ($entry['businessName'] ?? $normTenant);
        $safeSlug = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$bizName) ?: $normTenant;

        $zip = new ZipBuilder();
        $indexHtmlPath = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($indexHtmlPath)) {
            $safeVer = preg_replace('/[^0-9A-Za-z.\-]/', '', $appVersion) ?: '3.0.0';
            $cfg = json_encode([
                'tenant' => $normTenant, 'version' => $safeVer,
                'syncKey' => $entry['syncKey'] ?? '',
            ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
            $boot = '<script>(function(c){window.__PROPOS_LOCKED_TENANT__=c.tenant;window.__PROPOS_APP_VERSION__=c.version;'
                . 'window.__PROPOS_SYNC_KEY__=c.syncKey;'
                . 'try{localStorage.setItem("propos_active_tenant_id",c.tenant);'
                . 'if(c.syncKey)localStorage.setItem("propos_sync_key_"+c.tenant,c.syncKey);}catch(e){}})(' . $cfg . ');</script>' . "\n";
            $html = (string)file_get_contents($indexHtmlPath);
            $locked = preg_replace('/<\/head>/i', str_replace('\\', '\\\\', $boot) . '</head>', $html, 1) ?? $html;
            $zip->addText('dist/index.html', $locked);
            // PWA dosyaları (service worker, manifest, ikonlar): müşteri kurulumunda da çevrimdışı açılış çalışsın.
            foreach (['sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'] as $asset) {
                $assetPath = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . $asset;
                if (is_file($assetPath)) {
                    $zip->addBytes('dist/' . $asset, (string)file_get_contents($assetPath));
                }
            }
        }

        $state = $this->tenantService->loadTenant($normTenant);
        $zip->addText('data/' . ($normTenant === 'DEFAULT' ? 'default.json' : 'tenants/' . $normTenant . '.json'), $state['json']);
        if ($entry) {
            $zip->addText('data/registry.json', json_encode([$entry], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        }

        $supportFiles = [
            'Mobil_ve_PC_Canli_Sunucu.ps1',
            'api/index.php',
            'backend/bootstrap.php',
            'backend/config.php',
            'backend/env.php',
            'backend/Services/Storage/StorageUnavailable.php',
            'backend/Services/Storage/Storage.php',
            'backend/Services/Storage/FileStorage.php',
            'backend/Services/Storage/SupabaseStorage.php',
            'backend/Services/Storage/CachedStorage.php',
            'backend/Services/Storage/StorageFactory.php',
            'backend/init.php',
            'backend/router.php',
            'backend/static.php',
            'backend/Controllers/ApiController.php',
            'backend/Services/AuthService.php',
            'backend/Services/PinService.php',
            'backend/Services/Realtime.php',
            'backend/Services/TenantService.php',
            'backend/Services/Throttle.php',
        ];
        foreach ($supportFiles as $relPath) {
            $absPath = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
            if (is_file($absPath)) {
                $zip->addBytes($relPath, (string)file_get_contents($absPath));
            }
        }

        $readme = "ProPos - " . $bizName . " kurulum paketi\r\nIsletme kodu: " . $normTenant . "\r\n\r\n"
            . "1. Klasore cikarin. PHP kuruluysa 'Mobil_ve_PC_Canli_Sunucu.ps1' dosyasina sag tiklayip PowerShell ile calistirin.\r\n"
            . "2. Tarayicida http://localhost:8586 adresini acin.\r\n"
            . "3. Telefon/tablet icin ekrandaki 'PC & Mobil Canli Senkron' butonundaki QR kodu okutun.\r\n";
        $zip->addText('KURULUM_REHBERI.txt', $readme);

        audit('package.build', $normTenant);
        return ['filename' => "ProPos_Kurulum_{$safeSlug}_{$normTenant}.zip", 'bytes' => $zip->toBytes()];
    }
}
