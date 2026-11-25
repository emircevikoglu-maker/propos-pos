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

    /** Uzaktan gelen yeni uygulama HTML'ini yazar; öncekinin yedeğini alır. */
    public function applyHtmlUpdate(string $htmlContent): bool
    {
        if (trim($htmlContent) === '' || strlen($htmlContent) > PROPOS_MAX_HTML_BYTES || stripos($htmlContent, '<html') === false) {
            return false;
        }
        if (!is_dir(PROPOS_DIST_DIR)) {
            @mkdir(PROPOS_DIST_DIR, 0755, true);
        }
        $distHtml = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($distHtml)) {
            @copy($distHtml, PROPOS_BACKUP_DIR . DIRECTORY_SEPARATOR . 'index_' . date('Ymd_His') . '.html.bak');
        }
        audit('update.apply', (string)strlen($htmlContent));
        return @file_put_contents($distHtml, $htmlContent, LOCK_EX) !== false;
    }

    public function prepareGithubRelease(string $manifestJson): bool
    {
        $manifest = json_decode($manifestJson, true);
        if (!is_array($manifest) || empty($manifest['version'])) {
            return false;
        }
        $ghDir = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'github-yayin';
        if (!is_dir($ghDir)) {
            @mkdir($ghDir, 0755, true);
        }
        $encoded = json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        @file_put_contents($ghDir . DIRECTORY_SEPARATOR . 'version.json', $encoded, LOCK_EX);
        @file_put_contents(PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'version.json', $encoded, LOCK_EX);
        $srcHtml = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($srcHtml)) {
            @copy($srcHtml, $ghDir . DIRECTORY_SEPARATOR . 'index.html');
        }
        audit('github.prepare', (string)$manifest['version']);
        return true;
    }

    /**
     * Müşteriye özel kilitli kurulum ZIP'i. İçine YALNIZCA o müşterinin kaydı ve verisi girer;
     * diğer müşteriler ve ana işletme verisi asla paketlenmez.
     *
     * @return array{filename: string, bytes: string}
     */
    public function buildCustomerZip(string $tenantId, string $businessName, string $githubRepo, string $appVersion): array
    {
        $normTenant = normalizeTenantId($tenantId);
        $entry = $this->tenantService->findRegistryEntry($normTenant) ?? [];
        $bizName = trim($businessName) !== '' ? trim($businessName) : ($entry['businessName'] ?? $normTenant);
        $safeSlug = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$bizName) ?: $normTenant;

        $zip = new ZipBuilder();
        $indexHtmlPath = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($indexHtmlPath)) {
            $safeRepo = preg_replace('/[^A-Za-z0-9_.\/-]/', '', $githubRepo) ?? '';
            $safeVer = preg_replace('/[^0-9A-Za-z.\-]/', '', $appVersion) ?: '3.0.0';
            $cfg = json_encode([
                'tenant' => $normTenant, 'version' => $safeVer, 'repo' => $safeRepo,
                'syncKey' => $entry['syncKey'] ?? '',
            ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
            $boot = '<script>(function(c){window.__PROPOS_LOCKED_TENANT__=c.tenant;window.__PROPOS_APP_VERSION__=c.version;'
                . 'window.__PROPOS_GITHUB_REPO__=c.repo;window.__PROPOS_SYNC_KEY__=c.syncKey;'
                . 'try{localStorage.setItem("propos_active_tenant_id",c.tenant);localStorage.setItem("propos_app_version",c.version);'
                . 'if(c.repo)localStorage.setItem("propos_github_repo",c.repo);'
                . 'if(c.syncKey)localStorage.setItem("propos_sync_key_"+c.tenant,c.syncKey);}catch(e){}})(' . $cfg . ');</script>' . "\n";
            $html = (string)file_get_contents($indexHtmlPath);
            $locked = preg_replace('/<\/head>/i', str_replace('\\', '\\\\', $boot) . '</head>', $html, 1) ?? $html;
            $zip->addText('dist/index.html', $locked);
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
            'backend/Services/Storage/Storage.php',
            'backend/Services/Storage/FileStorage.php',
            'backend/Services/Storage/SupabaseStorage.php',
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
            'backend/Services/PackageService.php',
            'backend/Services/ZipBuilder.php',
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
