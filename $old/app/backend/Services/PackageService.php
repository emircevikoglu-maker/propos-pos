<?php
declare(strict_types=1);

namespace ProPos\Services;

use function ProPos\normalizeTenantId;

class PackageService
{
    private TenantService $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    /**
     * Apply remote HTML update to both dist/index.html and ProPos_Hazir_Uygulama.html.
     */
    public function applyHtmlUpdate(string $htmlContent): bool
    {
        if (trim($htmlContent) === '' || stripos($htmlContent, '<html') === false) {
            return false;
        }
        $distHtml = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        $rootHtml = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Hazir_Uygulama.html';

        if (!is_dir(PROPOS_DIST_DIR)) {
            @mkdir(PROPOS_DIST_DIR, 0777, true);
        }

        $okDist = @file_put_contents($distHtml, $htmlContent, LOCK_EX) !== false;
        $okRoot = @file_put_contents($rootHtml, $htmlContent, LOCK_EX) !== false;
        return $okDist && $okRoot;
    }

    /**
     * Prepare GitHub release artifacts (version.json and index.html in github-yayin/).
     */
    public function prepareGithubRelease(string $manifestJson): bool
    {
        if (trim($manifestJson) === '') {
            return false;
        }
        $ghDir = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'github-yayin';
        if (!is_dir($ghDir)) {
            @mkdir($ghDir, 0777, true);
        }

        @file_put_contents($ghDir . DIRECTORY_SEPARATOR . 'version.json', $manifestJson, LOCK_EX);
        @file_put_contents(PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'version.json', $manifestJson, LOCK_EX);
        @file_put_contents(PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'version.json', $manifestJson, LOCK_EX);

        $srcHtml = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($srcHtml)) {
            @copy($srcHtml, $ghDir . DIRECTORY_SEPARATOR . 'index.html');
        }
        return true;
    }

    /**
     * Build a customer-locked standalone ZIP package.
     *
     * @return array{filename: string, bytes: string}
     */
    public function buildCustomerZip(string $tenantId, string $businessName, string $githubRepo, string $appVersion): array
    {
        $normTenant = normalizeTenantId($tenantId);
        $bizName = trim($businessName) !== '' ? trim($businessName) : $normTenant;
        $safeSlug = preg_replace('/[^a-zA-Z0-9_-]/', '_', $bizName) ?: $normTenant;

        $state = $this->tenantService->loadTenant($normTenant);
        $registry = $this->tenantService->loadRegistry();
        $registryJson = json_encode($registry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $zip = new ZipBuilder();

        $indexHtmlPath = PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . 'index.html';
        if (!is_file($indexHtmlPath)) {
            $indexHtmlPath = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . 'ProPos_Hazir_Uygulama.html';
        }

        if (is_file($indexHtmlPath)) {
            $html = (string)file_get_contents($indexHtmlPath);
            $safeRepo = str_replace('"', '', $githubRepo);
            $safeVer = trim($appVersion) !== '' ? str_replace('"', '', $appVersion) : '2.4.0';

            $bootScript = '<script>'
                . 'window.__PROPOS_LOCKED_TENANT__ = "' . $normTenant . '"; '
                . 'window.__PROPOS_APP_VERSION__ = "' . $safeVer . '"; '
                . 'window.__PROPOS_GITHUB_REPO__ = "' . $safeRepo . '"; '
                . 'try { '
                . 'localStorage.setItem("propos_active_tenant_id", "' . $normTenant . '"); '
                . 'localStorage.setItem("propos_app_version", "' . $safeVer . '"); '
                . 'if ("' . $safeRepo . '" !== "") localStorage.setItem("propos_github_repo", "' . $safeRepo . '"); '
                . '} catch(e){}'
                . "</script>\n</head>";

            $lockedHtml = str_replace('</head>', $bootScript, $html);
            $zip->addText('dist/index.html', $lockedHtml);
            $zip->addText('ProPos_Hazir_Uygulama.html', $lockedHtml);
        }

        $zip->addText('ProPos_Canli_Veritabani.json', $state['json']);
        $zip->addText('tenants/' . $normTenant . '.json', $state['json']);
        $zip->addText('ProPos_Bayi_Musteriler.json', $registryJson);

        $supportFiles = [
            'Mobil_ve_PC_Canli_Sunucu.ps1',
            'api/index.php',
            'backend/config.php',
            'backend/router.php',
            'backend/Controllers/ApiController.php',
            'backend/Services/TenantService.php',
            'backend/Services/PackageService.php',
            'backend/Services/ZipBuilder.php',
        ];

        foreach ($supportFiles as $relPath) {
            $absPath = PROPOS_ROOT_DIR . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
            if (is_file($absPath)) {
                $zip->addBytes($relPath, (string)file_get_contents($absPath));
            }
        }

        $readme = "=================================================================\r\n"
            . "   " . strtoupper($bizName) . " - PROPOS KURUMSAL POS & MOBIL KURULUM PAKETI\r\n"
            . "   ISLETME KODU (TENANT ID): " . $normTenant . "\r\n"
            . "=================================================================\r\n\r\n"
            . "1. BILGISAYARDA KULLANIM:\r\n"
            . "   - Bu ZIP paketi icindeki tum dosyalari bir klasore cikarin.\r\n"
            . "   - 'ProPos_Hazir_Uygulama.html' dosyasina cift tiklayarak veya\r\n"
            . "     'Mobil_ve_PC_Canli_Sunucu.ps1' ile PHP sunucusunu baslatarak kullanabilirsiniz.\r\n\r\n"
            . "2. TELEFON VE TABLETTEN CANLI SENKRONIZE KULLANIM:\r\n"
            . "   - Uygulamanin ust barindaki 'PC & Mobil Canli Senkron' butonuna tiklayin.\r\n"
            . "   - Ekranda cikan QR kodu telefonunuzun kamerasiyla okutarak aninda baglanin!\r\n";

        $zip->addText('MUSTERI_KURULUM_REHBERI.txt', $readme);

        return [
            'filename' => "ProPos_Kurulum_Paketi_{$safeSlug}_{$normTenant}.zip",
            'bytes'    => $zip->toBytes(),
        ];
    }
}
