<?php
declare(strict_types=1);

// Süreç içi birim testleri: servisler doğrudan çağrılır (HTTP yok). Geçici PROPOS_DATA_DIR kullanılır.

use ProPos\Services\AuthService;
use ProPos\Services\PackageService;
use ProPos\Services\PinService;
use ProPos\Services\TenantService;
use ProPos\Services\Throttle;
use ProPos\Services\ZipBuilder;
use function ProPos\normalizeTenantId;

function freshServices(): array
{
    $ts = new TenantService();
    return [$ts, new AuthService($ts), new PinService($ts, new Throttle())];
}

function unitTenant(TenantService $ts, string $id, string $pin = '2580'): array
{
    $r = $ts->upsertEntry(['tenantId' => $id, 'businessName' => "Birim $id", 'initialPin' => $pin, 'planType' => 'yearly', 'status' => 'active', 'expiresAt' => 'unlimited']);
    assertTrue($r['ok'], 'upsert: ' . ($r['error'] ?? ''));
    return $r['tenant'];
}

// ---- normalizeTenantId -------------------------------------------------------

t('normalizeTenantId: boş ve takma adlar DEFAULT olur', function () {
    foreach ([null, '', '   ', 'default', 'MASTER', 'pickys-master'] as $v) {
        assertSame('DEFAULT', normalizeTenantId($v), show($v));
    }
});

t('normalizeTenantId: dizin aşımı ve özel karakterler temizlenir', function () {
    assertSame('ETCPASSWD', normalizeTenantId('../../etc/passwd'));
    assertSame('CONFIG', normalizeTenantId('%2e%2e%2fconfig'));
    assertSame('ASCRIPTB', normalizeTenantId("a<script>\0b"));
    assertSame('KAFE-1', normalizeTenantId(" kafe-1 \r\n"));
    assertSame(40, strlen(normalizeTenantId(str_repeat('A', 500))));
});

// ---- Belirteç (HMAC) ----------------------------------------------------------

t('token: üret/doğrula ve rol, tenant korunur', function () {
    [$ts, $auth] = freshServices();
    unitTenant($ts, 'TOK-1');
    $p = $auth->verifyToken($auth->issueToken('tenant', 'TOK-1'));
    assertSame('tenant', $p['r'] ?? null);
    assertSame('TOK-1', $p['t'] ?? null);
    assertTrue(is_string($p['k'] ?? null), 'anahtar parmak izi olmalı');
});

t('token: gövdesi değiştirilen belirteç reddedilir (rol yükseltme)', function () {
    [, $auth] = freshServices();
    $forged = tamperToken($auth->issueToken('tenant', 'TOK-1'), static function ($p) { $p['r'] = 'founder'; return $p; });
    assertSame(null, $auth->verifyToken($forged));
});

t('token: süresi dolmuş belirteç reddedilir', function () {
    [, $auth] = freshServices();
    assertSame(null, $auth->verifyToken($auth->issueToken('tenant', 'TOK-1', -5)));
});

t('token: bilinmeyen rol geçerli imzayla bile reddedilir', function () {
    [, $auth] = freshServices();
    assertSame(null, $auth->verifyToken($auth->issueToken('god', 'TOK-1')));
});

t('token: bozuk biçimler reddedilir, hata fırlatmaz', function () {
    [, $auth] = freshServices();
    foreach (['', '.', 'abc', 'a.b.c', str_repeat('A', 5000) . '.x', "\0.\0", 'eyJyIjoiZm91bmRlciJ9.', '!!!.???'] as $bad) {
        assertSame(null, $auth->verifyToken($bad), show($bad));
    }
});

t('token: "e" alanı sayı yerine metinse reddedilir (tip karışıklığı)', function () {
    [, $auth] = freshServices();
    $t = tamperToken($auth->issueToken('tenant', 'TOK-1'), static function ($p) { $p['e'] = '99999999999'; return $p; });
    assertSame(null, $auth->verifyToken($t));
});

t('generateKey: biçim doğru, karışık karakter yok, çakışma yok', function () {
    $seen = [];
    for ($i = 0; $i < 300; $i++) {
        $k = AuthService::generateKey('SYNC', 3);
        assertMatches('/^SYNC(-[A-HJ-NP-Z2-9]{4}){3}$/', $k);
        $seen[$k] = true;
    }
    assertSame(300, count($seen), 'üretilen anahtarlar benzersiz olmalı');
});

t('licenseProblem: askı, süre dolumu, sınırsız, DEFAULT', function () {
    assertSame(null, AuthService::licenseProblem(['tenantId' => 'A', 'status' => 'active', 'expiresAt' => 'unlimited']));
    assertSame(null, AuthService::licenseProblem(['tenantId' => 'A', 'status' => 'active', 'expiresAt' => gmdate('c', time() + 86400)]));
    assertTrue(is_string(AuthService::licenseProblem(['tenantId' => 'A', 'status' => 'suspended', 'expiresAt' => 'unlimited'])));
    assertTrue(is_string(AuthService::licenseProblem(['tenantId' => 'A', 'status' => 'active', 'expiresAt' => '2020-01-01T00:00:00Z'])));
    assertSame(null, AuthService::licenseProblem(['tenantId' => 'DEFAULT', 'status' => 'suspended']), 'ana işletme kilitlenmez');
    assertSame(null, AuthService::licenseProblem(null));
});

// ---- Tenant verisi --------------------------------------------------------------

t('saveTenant: geçersiz paketler reddedilir', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'SAVE-1');
    foreach (['', 'null', '[]', '{"tables":"x","products":[]}', '{"products":[]}', '{"tables":[],"products":5}', '{bozuk', str_repeat('[', 2000) . str_repeat(']', 2000)] as $bad) {
        $r = $ts->saveTenant('SAVE-1', $bad, 'dev');
        assertFalse($r['ok'], 'kabul edilmemeli: ' . show($bad));
    }
});

t('saveTenant: kayıtsız işletmeye yazılamaz', function () {
    [$ts] = freshServices();
    $r = $ts->saveTenant('YOK-BOYLE', json_encode(minimalState()), 'dev');
    assertFalse($r['ok']);
    assertFalse(is_file(PROPOS_TENANTS_DIR . DIRECTORY_SEPARATOR . 'YOK-BOYLE.json'), 'dosya oluşmamalı');
});

t('saveTenant: boyut sınırı aşılırsa reddedilir', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'BIG-1');
    $r = $ts->saveTenant('BIG-1', str_repeat(' ', PROPOS_MAX_DB_BYTES + 1), 'dev');
    assertFalse($r['ok']);
});

t('saveTenant: istemciden gelen PIN/hash yok sayılır, mevcut hash korunur', function () {
    [$ts, , $pins] = freshServices();
    unitTenant($ts, 'PIN-KEEP', '7391');
    $evil = minimalState(['adminPin' => '0000', 'adminPinHash' => password_hash('0000', PASSWORD_DEFAULT)]);
    assertTrue($ts->saveTenant('PIN-KEEP', json_encode($evil), 'dev')['ok']);
    assertFalse($pins->verify('PIN-KEEP', '0000')['ok'], 'saldırganın PIN\'i çalışmamalı');
    assertTrue($pins->verify('PIN-KEEP', '7391')['ok'], 'asıl PIN çalışmalı');
    $raw = (string)file_get_contents($ts->getTenantFilePath('PIN-KEEP'));
    assertNotContains('"adminPin"', $raw, 'düz PIN diske yazılmamalı');
});

t('saveTenant: PIN\'i olmayan işletmeye eski istemcinin düz PIN\'i hash olarak geçer', function () {
    [$ts, , $pins] = freshServices();
    assertTrue($ts->upsertEntry(['tenantId' => 'LEGACY-1', 'businessName' => 'Eski', 'expiresAt' => 'unlimited'])['ok']);
    assertTrue($ts->saveTenant('LEGACY-1', json_encode(minimalState(['adminPin' => '9182'])), 'dev')['ok']);
    assertTrue($pins->verify('LEGACY-1', '9182')['ok']);
    assertNotContains('9182', (string)file_get_contents($ts->getTenantFilePath('LEGACY-1')));
});

t('saveTenant: tenantId gövdeden değil yoldan gelir; rev artar; deviceId temizlenir', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'REV-1');
    $a = $ts->saveTenant('REV-1', json_encode(minimalState(['tenantId' => 'BASKA'])), "dev\r\nX-Evil: 1<script>");
    $b = $ts->saveTenant('REV-1', json_encode(minimalState()), 'dev2');
    assertTrue($b['rev'] > $a['rev'], 'rev monoton artmalı');
    assertSame('devX-Evil1script', $a['updatedBy']);
    assertSame('REV-1', $ts->loadTenant('REV-1')['data']['tenantId']);
    assertFalse(is_file(PROPOS_TENANTS_DIR . DIRECTORY_SEPARATOR . 'BASKA.json'));
});

t('loadTenant: bilinmeyen işletme başka işletmenin verisine düşmez', function () {
    [$ts] = freshServices();
    file_put_contents(PROPOS_DEFAULT_DB_FILE, json_encode(minimalState(['secretMarker' => 'ANA-ISLETME-VERISI'])));
    $r = $ts->loadTenant('BILINMEYEN');
    assertSame([], $r['data']);
    assertNotContains('ANA-ISLETME-VERISI', $r['json']);
});

t('publicData: PIN alanları istemciye gitmez', function () {
    $d = TenantService::publicData(['adminPin' => '1', 'adminPinHash' => 'x', 'tables' => []]);
    assertSame(['tables' => []], $d);
});

// ---- Bayi kaydı ---------------------------------------------------------------

t('saveRegistry: istemcinin gönderdiği syncKey yok sayılır', function () {
    [$ts] = freshServices();
    $orig = unitTenant($ts, 'REG-1')['syncKey'];
    assertTrue($ts->saveRegistry(json_encode([['tenantId' => 'REG-1', 'businessName' => 'X', 'syncKey' => 'SYNC-HACK-HACK-HACK'], ['tenantId' => 'REG-NEW', 'syncKey' => 'SYNC-AAAA-AAAA-AAAA']])));
    assertSame($orig, $ts->findRegistryEntry('REG-1')['syncKey']);
    assertNotSame('SYNC-AAAA-AAAA-AAAA', $ts->findRegistryEntry('REG-NEW')['syncKey']);
    assertTrue($ts->findRegistryEntry('DEFAULT') !== null, 'DEFAULT listeden düşmemeli');
});

t('saveRegistry: dev liste ve bozuk girdi reddedilir', function () {
    [$ts] = freshServices();
    assertFalse($ts->saveRegistry(json_encode(array_fill(0, 5001, ['tenantId' => 'X']))));
    assertFalse($ts->saveRegistry('{bozuk'));
    assertFalse($ts->saveRegistry('"metin"'));
});

t('registryViewFor: yalnızca kendi kaydı, sırlar olmadan', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'VIEW-1');
    $v = $ts->registryViewFor('VIEW-1');
    assertSame(1, count($v));
    assertFalse(isset($v[0]['syncKey']) || isset($v[0]['adminPin']));
});

t('upsertEntry: alan doğrulamaları', function () {
    [$ts] = freshServices();
    $bad = [
        ['tenantId' => 'ab', 'businessName' => 'x'],
        ['tenantId' => '../X', 'businessName' => 'x'],
        ['tenantId' => str_repeat('A', 41), 'businessName' => 'x'],
        ['tenantId' => 'GOOD-1', 'businessName' => ''],
        ['tenantId' => 'GOOD-1', 'businessName' => str_repeat('ş', 61)],
        ['tenantId' => 'GOOD-1', 'businessName' => 'x', 'status' => 'god'],
        ['tenantId' => 'GOOD-1', 'businessName' => 'x', 'planType' => 'free-forever'],
        ['tenantId' => 'GOOD-1', 'businessName' => 'x', 'expiresAt' => 'yarın'],
        ['tenantId' => 'GOOD-1', 'businessName' => 'x', 'initialPin' => '12'],
        ['tenantId' => 'GOOD-1', 'businessName' => 'x', 'initialPin' => '12 34'],
        ['tenantId' => ['dizi'], 'businessName' => 'x'],
    ];
    foreach ($bad as $b) {
        assertFalse($ts->upsertEntry($b)['ok'], 'reddedilmeli: ' . show($b));
    }
});

t('upsertEntry: kontrol karakterleri temizlenir, syncKey/adminPin kabul edilmez, PIN hash olarak tenant verisine gider', function () {
    [$ts, , $pins] = freshServices();
    $r = $ts->upsertEntry(['tenantId' => 'clean-1', 'businessName' => "Kafe\r\n\x07 Bir", 'syncKey' => 'SYNC-HACK-HACK-HACK', 'adminPin' => '1111', 'initialPin' => '5050', 'expiresAt' => '2030-01-01']);
    assertTrue($r['ok']);
    assertSame('CLEAN-1', $r['tenant']['tenantId']);
    assertSame('Kafe Bir', $r['tenant']['businessName']);
    assertNotSame('SYNC-HACK-HACK-HACK', $r['tenant']['syncKey']);
    assertFalse(isset($r['tenant']['adminPin']));
    assertNotContains('5050', (string)file_get_contents(PROPOS_REGISTRY_FILE));
    assertTrue($pins->verify('CLEAN-1', '5050')['ok']);
});

t('upsertEntry: mustBeNew ile mevcut kod üzerine yazılamaz', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'DUP-1');
    assertFalse($ts->upsertEntry(['tenantId' => 'DUP-1', 'businessName' => 'Başka', 'mustBeNew' => true])['ok']);
});

t('rotateSyncKey ve deleteEntry', function () {
    [$ts] = freshServices();
    $old = unitTenant($ts, 'ROT-1')['syncKey'];
    $new = $ts->rotateSyncKey('ROT-1');
    assertTrue(is_string($new) && $new !== $old);
    assertSame(null, $ts->rotateSyncKey('YOK-1'));
    assertTrue($ts->saveTenant('ROT-1', json_encode(minimalState()), 'd')['ok']);
    assertTrue($ts->deleteEntry('ROT-1'));
    assertSame(null, $ts->findRegistryEntry('ROT-1'));
    assertFalse(is_file($ts->getTenantFilePath('ROT-1')), 'veri dosyası yedeğe taşınmalı');
    assertTrue(count(glob(PROPOS_BACKUP_DIR . '/deleted_ROT-1_*.json') ?: []) === 1, 'yedekte olmalı');
    assertFalse($ts->deleteEntry('DEFAULT'), 'ana işletme silinemez');
});

// ---- PIN ------------------------------------------------------------------------

t('PinService::isValidPin', function () {
    foreach (['1234', '123456789012', 'MAMİ35', 'abcd'] as $ok) assertTrue(PinService::isValidPin($ok), $ok);
    foreach (['', '123', '1234567890123', '12 34', "12\n34", "1234\t"] as $no) assertFalse(PinService::isValidPin($no), show($no));
});

t('PIN: yanlış denemeler sayılır, sınırda doğru PIN de kilitlenir', function () {
    [$ts, , $pins] = freshServices();
    unitTenant($ts, 'LOCK-1', '1357');
    for ($i = 0; $i < PinService::MAX_FAILS; $i++) {
        $r = $pins->verify('LOCK-1', '0000');
        assertSame('BAD_PIN', $r['code'] ?? null);
    }
    $r = $pins->verify('LOCK-1', '1357');
    assertSame('RATE_LIMIT', $r['code'] ?? null, 'kilitliyken doğru PIN de reddedilmeli');
    assertTrue(($r['retryAfter'] ?? 0) > 0);
});

t('PIN: düz metin PIN (eski veri) ilk erişimde hash\'e çevrilir', function () {
    [$ts, , $pins] = freshServices();
    unitTenant($ts, 'MIG-1', '1111');
    $state = $ts->loadTenant('MIG-1')['data'];
    unset($state['adminPinHash']);
    $state['adminPin'] = 'MAMİ35';
    $ts->writeTenantData('MIG-1', $state);
    assertTrue($pins->verify('MIG-1', 'MAMİ35')['ok']);
    $raw = (string)file_get_contents($ts->getTenantFilePath('MIG-1'));
    assertNotContains('MAMİ35', $raw);
    assertContains('adminPinHash', $raw);
});

t('PIN değiştirme: mevcut PIN ya da yönetici oturumu gerekir', function () {
    [$ts, , $pins] = freshServices();
    unitTenant($ts, 'CHG-1', '2468');
    assertFalse($pins->change('CHG-1', 'yanlis', '9999', false)['ok']);
    assertFalse($pins->change('CHG-1', null, '9999', false)['ok']);
    assertFalse($pins->change('CHG-1', '2468', '1', false)['ok'], 'geçersiz yeni PIN');
    assertTrue($pins->change('CHG-1', '2468', '9999', false)['ok']);
    assertTrue($pins->change('CHG-1', null, '8888', true)['ok'], 'yönetici oturumu mevcut PIN istemez');
    assertTrue($pins->verify('CHG-1', '8888')['ok']);
    assertFalse($pins->verify('CHG-1', '9999')['ok']);
});

// ---- Throttle -----------------------------------------------------------------------

t('Throttle: kova boşalınca ceza süresi boyunca kapalı, sonra açılır', function () {
    $th = new Throttle(tmpDir('rl'));
    $now = 1000.0;
    for ($i = 0; $i < 3; $i++) assertTrue($th->hit('k', 3, 1.0, 30, $now)['ok']);
    $r = $th->hit('k', 3, 1.0, 30, $now);
    assertFalse($r['ok']);
    assertSame(30, $r['retryAfter']);
    assertFalse($th->hit('k', 3, 1.0, 30, $now + 29)['ok'], 'ceza bitmeden açılmamalı');
    assertTrue($th->hit('k', 3, 1.0, 30, $now + 31)['ok'], 'ceza sonrası açılmalı');
    assertTrue($th->hit('baska-anahtar', 3, 1.0, 30, $now)['ok'], 'kovalar bağımsız');
});

t('Throttle: hata sayacı pencere dışında sıfırlanır', function () {
    $th = new Throttle(tmpDir('rl'));
    $th->registerFail('f', 60, 1000);
    $th->registerFail('f', 60, 1010);
    assertSame(2, $th->failCount('f', 60, 1020));
    assertSame(0, $th->failCount('f', 60, 1100));
    $th->clearFails('f');
    assertSame(0, $th->failCount('f', 60, 1020));
});

t('Throttle::bucketConfig ortam değişkenini doğrular', function () {
    putenv('PROPOS_TEST_RL=5:0.5');
    assertSame([5, 0.5], Throttle::bucketConfig('PROPOS_TEST_RL', 9, 9.0));
    putenv('PROPOS_TEST_RL=bozuk');
    assertSame([9, 9.0], Throttle::bucketConfig('PROPOS_TEST_RL', 9, 9.0));
    putenv('PROPOS_TEST_RL');
});

// ---- ZIP / müşteri paketi ----------------------------------------------------------

t('ZipBuilder: geçerli arşiv, CRC doğru', function () {
    $z = new ZipBuilder();
    $z->addText('a.txt', 'merhaba');
    $z->addBytes('dir/b.bin', random_bytes(2048));
    $files = readZip($z->toBytes());
    assertSame('merhaba', $files['a.txt'] ?? null);
    assertSame(2048, strlen($files['dir/b.bin'] ?? ''));
});

t('Müşteri paketi: yalnızca o işletmenin verisi; kontrol paneli kodu yok', function () {
    [$ts] = freshServices();
    $a = unitTenant($ts, 'PKG-A');
    $b = unitTenant($ts, 'PKG-B');
    $ts->saveTenant('PKG-A', json_encode(minimalState(['marker' => 'VERI-A'])), 'd');
    $ts->saveTenant('PKG-B', json_encode(minimalState(['marker' => 'VERI-B'])), 'd');
    file_put_contents(PROPOS_DIST_DIR . '/index.html', '<html><head></head><body>x</body></html>');
    $pkg = (new PackageService($ts))->buildCustomerZip('PKG-A', '', '', '3.0.0');
    $files = readZip($pkg['bytes']);
    $all = implode("\n", array_keys($files)) . "\n" . implode("\n", $files);
    assertContains('VERI-A', $all);
    assertContains($a['syncKey'], $all);
    assertNotContains('VERI-B', $all, 'başka işletmenin verisi');
    assertNotContains($b['syncKey'], $all, 'başka işletmenin anahtarı');
    assertNotContains('ControlController', $all, 'kontrol paneli kodu pakete girmemeli');
    assertNotContains('control.php', implode("\n", array_keys($files)));
    assertFalse(isset($files['data/config.json']), 'sunucu sırrı pakete girmemeli');
    assertFalse(isset($files['.env']) || isset($files['backend/.env']), 'sırlar pakete girmemeli');
    assertNotContains('SUPABASE_SECRET_KEY=', $all, '.env içeriği pakete girmemeli');
    foreach (['backend/env.php', 'backend/Services/Storage/FileStorage.php', 'backend/bootstrap.php', 'backend/router.php', 'backend/Services/Throttle.php', 'backend/Services/PinService.php', 'backend/static.php'] as $need) {
        assertTrue(isset($files[$need]), "pakette eksik: $need (kurulum açılmaz)");
    }
    assertContains('__PROPOS_LOCKED_TENANT__', $files['dist/index.html'] ?? '');
});

t('Müşteri paketi: bootstrap.php yalnızca pakette olan dosyaları ister', function () {
    $src = (string)file_get_contents(PROPOS_ROOT_DIR . '/backend/bootstrap.php');
    preg_match_all("#require_once __DIR__ \\. '/([^']+)'#", $src, $m);
    $pkgSrc = (string)file_get_contents(PROPOS_ROOT_DIR . '/backend/Services/PackageService.php');
    foreach ($m[1] as $rel) {
        assertContains("'backend/$rel'", $pkgSrc, "bootstrap $rel istiyor ama paket listesinde yok");
    }
});

t('applyHtmlUpdate: HTML olmayan ya da boş içerik reddedilir', function () {
    [$ts] = freshServices();
    $p = new PackageService($ts);
    assertFalse($p->applyHtmlUpdate(''));
    assertFalse($p->applyHtmlUpdate('<?php system($_GET["c"]); ?>'));
    assertFalse($p->applyHtmlUpdate(str_repeat('a', 100)));
});
