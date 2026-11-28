<?php
// Kullanıcı yönetimi (yalnızca komut satırı; web'den erişilemez, .htaccess backend/'i zaten kapatır).
//   php backend/users.php list
//   php backend/users.php add <kullanici> <parola> [--tenant=DEFAULT] [--role=owner|staff] [--name="Görünen ad"] [--allow-short]
//   php backend/users.php passwd <kullanici> <yeni-parola> [--allow-short]
//   php backend/users.php disable|enable|delete <kullanici>
// --allow-short: 4-7 karakterlik parolaya izin verir (kurucunun bilinçli tercihi; panel ve API en az 8 ister).
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/bootstrap.php';

use ProPos\Services\TenantService;

$args = array_slice($argv, 1);
$opts = [];
$pos = [];
foreach ($args as $a) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', $a, $m)) {
        $opts[$m[1]] = $m[2] ?? true;
    } else {
        $pos[] = $a;
    }
}
$cmd = $pos[0] ?? 'help';
$t = new TenantService();
$min = !empty($opts['allow-short']) ? 4 : 8;
$out = static function (bool $ok, string $msg): void {
    fwrite($ok ? STDOUT : STDERR, $msg . PHP_EOL);
    exit($ok ? 0 : 1);
};
$find = static function (string $u) use ($t, $out): array {
    $f = $t->findUser($u);
    if (!$f) {
        $out(false, "Kullanıcı yok: $u");
    }
    return $f;
};

switch ($cmd) {
    case 'list':
        foreach ($t->loadRegistry() as $e) {
            foreach (TenantService::publicUsers($e) as $u) {
                echo str_pad($e['tenantId'], 14) . str_pad($u['username'], 24) . str_pad($u['role'], 8) . ($u['active'] ? 'açık ' : 'KAPALI') . ' ' . $u['displayName'] . PHP_EOL;
            }
        }
        exit(0);
    case 'add':
        $r = $t->saveUser([
            'tenantId' => is_string($opts['tenant'] ?? null) ? $opts['tenant'] : 'DEFAULT',
            'username' => $pos[1] ?? '', 'password' => $pos[2] ?? '',
            'role' => is_string($opts['role'] ?? null) ? $opts['role'] : 'staff',
            'displayName' => is_string($opts['name'] ?? null) ? $opts['name'] : '',
        ], $min);
        $out($r['ok'], $r['ok'] ? 'Kaydedildi: ' . TenantService::normalizeUsername($pos[1] ?? '') : $r['error']);
        // no break (out çıkar)
    case 'passwd':
    case 'disable':
    case 'enable':
        if ($cmd === 'passwd' && ($pos[2] ?? '') === '') {
            $out(false, 'Yeni parola gerekli.');
        }
        $f = $find($pos[1] ?? '');
        $u = $f['user'];
        $r = $t->saveUser([
            'tenantId' => $f['tenantId'], 'username' => $u['username'], 'role' => $u['role'] ?? 'staff',
            'displayName' => $u['displayName'] ?? '',
            'active' => $cmd === 'disable' ? false : ($cmd === 'enable' ? true : (bool)($u['active'] ?? true)),
            'password' => $cmd === 'passwd' ? ($pos[2] ?? '') : '',
        ], $min);
        $out($r['ok'], $r['ok'] ? "Tamam ($cmd): {$u['username']} — açık oturumları düştü." : $r['error']);
        // no break
    case 'delete':
        $out($t->deleteUser($pos[1] ?? ''), 'Silindi ya da bulunamadı: ' . ($pos[1] ?? ''));
        // no break
    default:
        echo "Kullanım: php backend/users.php list | add <kullanici> <parola> [--tenant=KOD] [--role=owner|staff] [--name=..] [--allow-short] | passwd <kullanici> <parola> | disable|enable|delete <kullanici>" . PHP_EOL;
        exit($cmd === 'help' ? 0 : 1);
}
