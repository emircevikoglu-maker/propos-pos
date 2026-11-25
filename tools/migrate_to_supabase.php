<?php
declare(strict_types=1);

/*
 * Yerel dosya verisini (data/) Supabase'e kopyalar. Dosyalara DOKUNMAZ (kopyalar); tekrar çalıştırmak güvenlidir.
 *   php tools/migrate_to_supabase.php --dry-run     # ne yapılacağını söyler
 *   php tools/migrate_to_supabase.php               # kopyalar (uzak kayıt listesi doluysa durur)
 *   php tools/migrate_to_supabase.php --force       # uzak kayıt listesinin ÜZERİNE yazar
 * Önkoşul: supabase/migrations/001_propos_init.sql çalıştırılmış olmalı; .env'de SUPABASE_URL ve SUPABASE_SECRET_KEY.
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}
putenv('PROPOS_STORAGE=file');
require_once dirname(__DIR__) . '/backend/bootstrap.php';

use ProPos\Services\Storage\FileStorage;
use ProPos\Services\Storage\SupabaseStorage;

$dry = in_array('--dry-run', $argv, true);
$force = in_array('--force', $argv, true);
$src = new FileStorage();
try {
    $dst = new SupabaseStorage();
} catch (\Throwable $e) {
    fwrite(STDERR, "Supabase yapılandırması eksik: " . $e->getMessage() . "\n");
    exit(2);
}
if ($dst->request('GET', '/rest/v1/propos_registry?select=id&limit=1')['status'] !== 200) {
    fwrite(STDERR, "Şema kurulu değil: supabase/migrations/001_propos_init.sql dosyasını SQL Editor'de çalıştırın.\n");
    exit(2);
}

$registryRaw = $src->readRegistry();
$registry = $registryRaw ? json_decode($registryRaw, true) : [];
if (!is_array($registry)) {
    $registry = [];
}
$ids = array_values(array_unique(array_merge(['DEFAULT'], array_map(static fn($e) => (string)($e['tenantId'] ?? ''), $registry))));
$ids = array_values(array_filter($ids, static fn($i) => $i !== ''));

$remoteRegistry = $dst->readRegistry();
$remoteCount = $remoteRegistry ? count((array)json_decode($remoteRegistry, true)) : 0;
echo "Yerel: " . count($registry) . " kayıt, " . count($ids) . " işletme verisi adayı. Uzak kayıt listesi: $remoteCount.\n";
if ($remoteCount > 0 && !$force) {
    fwrite(STDERR, "Uzak kayıt listesi dolu; üzerine yazmamak için durdum (--force ile yazılır).\n");
    exit(3);
}

$done = 0;
foreach ($ids as $id) {
    $raw = $src->readTenant($id);
    if ($raw === null) {
        echo "  - $id: yerel veri yok, atlandı\n";
        continue;
    }
    $doc = json_decode($raw, true);
    $rev = is_array($doc) ? (int)($doc['rev'] ?? 0) : 0;
    $by = is_array($doc) ? substr((string)($doc['updatedBy'] ?? ''), 0, 60) : '';
    echo "  - $id: " . number_format(strlen($raw)) . " bayt, rev $rev" . ($dry ? " (deneme)" : "") . "\n";
    if (!$dry && !$dst->writeTenant($id, $raw, $rev, $by)) {
        fwrite(STDERR, "    YAZILAMADI ($id): " . $dst->lastError . "\n");
        exit(4);
    }
    $done++;
}
if ($registryRaw !== null && !$dry && !$dst->writeRegistry($registryRaw)) {
    fwrite(STDERR, "Kayıt listesi yazılamadı: " . $dst->lastError . "\n");
    exit(4);
}
echo ($dry ? "Deneme bitti" : "Tamam") . ": $done işletme verisi" . ($registryRaw !== null ? " + kayıt listesi" : "") . ".\n";
