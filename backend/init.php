<?php
// Ilk kurulum: veri klasorunu ve kurucu anahtarini olusturur (php backend/init.php).
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
new ProPos\Services\AuthService(new ProPos\Services\TenantService());
$keyFile = PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'KURUCU_ANAHTARI.txt';
echo is_file($keyFile) ? trim((string)file_get_contents($keyFile)) : 'Kurucu anahtari zaten olusturulmus (gizli; data/config.json icinde hash olarak durur).';
echo PHP_EOL;
