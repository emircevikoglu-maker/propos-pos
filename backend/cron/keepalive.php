<?php
declare(strict_types=1);

/*
 * Keepalive (komut satırı): Supabase projesinin duraklatılmaması için veritabanına tek hafif sorgu atar.
 * Çıktı hiçbir veri içermez ("ok" / "fail"). Kullanım (sistem cron'u, günde 1):
 *   0 4 * * *  php /yol/propos/backend/cron/keepalive.php
 * HTTP ile tetiklemek için: GET /api/keepalive (docs/CRON.md).
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/bootstrap.php';

use ProPos\Services\Storage\StorageFactory;

$ok = false;
try {
    $ok = StorageFactory::make()->ping();
} catch (\Throwable $e) {
    $ok = false;
}
echo $ok ? "ok\n" : "fail\n";
exit($ok ? 0 : 1);
