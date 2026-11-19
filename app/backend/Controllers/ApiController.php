<?php
declare(strict_types=1);

namespace ProPos\Controllers;

use ProPos\Services\PackageService;
use ProPos\Services\TenantService;
use function ProPos\detectLanIp;
use function ProPos\normalizeTenantId;
use function ProPos\sendCorsHeaders;
use function ProPos\sendJson;

class ApiController
{
    private TenantService $tenantService;
    private PackageService $packageService;

    public function __construct()
    {
        $this->tenantService = new TenantService();
        $this->packageService = new PackageService($this->tenantService);
    }

    public function handle(string $method, string $path): void
    {
        $upperMethod = strtoupper($method);

        if ($upperMethod === 'OPTIONS') {
            http_response_code(200);
            sendCorsHeaders();
            exit;
        }

        $lanIp = detectLanIp();
        $rawBody = (string)file_get_contents('php://input');

        switch ($path) {
            case '/api/info':
                $state = $this->tenantService->loadTenant($_GET['tenantId'] ?? 'DEFAULT');
                sendJson([
                    'ok'        => true,
                    'lanIp'     => $lanIp,
                    'port'      => PROPOS_PORT,
                    'rev'       => $state['rev'],
                    'updatedBy' => $state['updatedBy'],
                ]);
                break;

            case '/api/tenants':
                if ($upperMethod === 'GET') {
                    sendJson([
                        'ok'      => true,
                        'lanIp'   => $lanIp,
                        'tenants' => $this->tenantService->loadRegistry(),
                    ]);
                } elseif ($upperMethod === 'POST') {
                    if ($this->tenantService->saveRegistry($rawBody)) {
                        sendJson(['ok' => true]);
                    }
                    sendJson(['ok' => false, 'error' => 'Invalid tenant registry payload'], 400);
                }
                break;

            case '/api/sync':
                $tenantId = normalizeTenantId($_GET['tenantId'] ?? 'DEFAULT');
                if ($upperMethod === 'GET') {
                    $state = $this->tenantService->loadTenant($tenantId);
                    sendJson([
                        'ok'        => true,
                        'tenantId'  => $tenantId,
                        'rev'       => $state['rev'],
                        'updatedBy' => $state['updatedBy'],
                        'lanIp'     => $lanIp,
                        'registry'  => $this->tenantService->loadRegistry(),
                        'data'      => $state['data'],
                    ]);
                } elseif ($upperMethod === 'POST') {
                    $deviceId = isset($_GET['deviceId']) ? trim((string)$_GET['deviceId']) : 'unknown';
                    $result = $this->tenantService->saveTenant($tenantId, $rawBody, $deviceId);
                    if ($result['ok']) {
                        sendJson($result);
                    }
                    sendJson(['ok' => false, 'error' => 'Invalid database payload'], 400);
                }
                break;

            case '/api/apply-update':
                if ($upperMethod === 'POST' && $this->packageService->applyHtmlUpdate($rawBody)) {
                    sendJson(['ok' => true]);
                }
                sendJson(['ok' => false, 'error' => 'Invalid HTML update payload'], 400);
                break;

            case '/api/prepare-github':
                if ($upperMethod === 'POST' && $this->packageService->prepareGithubRelease($rawBody)) {
                    sendJson(['ok' => true]);
                }
                sendJson(['ok' => false, 'error' => 'Invalid GitHub release manifest'], 400);
                break;

            case '/api/package':
                $tenantId = $_GET['tenantId'] ?? 'DEFAULT';
                $businessName = $_GET['businessName'] ?? $tenantId;
                $githubRepo = $_GET['githubRepo'] ?? '';
                $appVersion = $_GET['appVersion'] ?? '2.4.0';

                $pkg = $this->packageService->buildCustomerZip(
                    (string)$tenantId,
                    (string)$businessName,
                    (string)$githubRepo,
                    (string)$appVersion
                );

                http_response_code(200);
                sendCorsHeaders();
                header('Content-Type: application/zip');
                header('Content-Disposition: attachment; filename="' . $pkg['filename'] . '"');
                header('Content-Length: ' . strlen($pkg['bytes']));
                echo $pkg['bytes'];
                exit;

            default:
                sendJson(['ok' => false, 'error' => 'Endpoint not found'], 404);
        }
    }
}
