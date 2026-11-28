<?php
declare(strict_types=1);

// unit suite eki: CachedStorage (yazma-geçişli yerel önbellek) — bellek içi sahte uzak depoyla.

use ProPos\Services\AuthService;
use ProPos\Services\PinService;
use ProPos\Services\TenantService;
use ProPos\Services\Storage\CachedStorage;
use ProPos\Services\Storage\FileStorage;
use ProPos\Services\Storage\Storage;

final class FakeRemote implements Storage
{
    public array $tenants = [];
    public ?string $registry = null;
    public int $reads = 0;
    public bool $failWrites = false;
    public bool $down = false;

    public function name(): string { return 'supabase'; }
    public function readTenant(string $id): ?string { if ($this->down) throw new \ProPos\Services\Storage\StorageUnavailable('down'); $this->reads++; return $this->tenants[$id] ?? null; }
    public function writeTenant(string $id, string $json, int $rev, string $by): bool { if ($this->down) throw new \ProPos\Services\Storage\StorageUnavailable('down'); if ($this->failWrites) return false; $this->tenants[$id] = $json; return true; }
    public function deleteTenant(string $id): ?string { $r = $this->tenants[$id] ?? null; unset($this->tenants[$id]); return $r; }
    public function stats(array $ids): array { return []; }
    public function readRegistry(): ?string { if ($this->down) throw new \ProPos\Services\Storage\StorageUnavailable('down'); $this->reads++; return $this->registry; }
    public function writeRegistry(string $json): bool { if ($this->down) throw new \ProPos\Services\Storage\StorageUnavailable('down'); if ($this->failWrites) return false; $this->registry = $json; return true; }
    public function registryVersion(): string { return 'remote'; }
    public function ping(): bool { return true; }
}

function cachedPair(int $ttl = 900): array
{
    $remote = new FakeRemote();
    $local = new FileStorage(tmpDir('cache'));
    return [new CachedStorage($remote, $local, $ttl), $remote, $local];
}

t('CachedStorage: ilk okuma uzaktan, sonrakiler yerelden (uzak çağrı artmaz)', function () {
    [$c, $r] = cachedPair();
    $r->tenants['A'] = '{"tables":[],"products":[],"rev":1}';
    assertSame($r->tenants['A'], $c->readTenant('A'));
    assertSame(1, $r->reads);
    for ($i = 0; $i < 5; $i++) assertSame($r->tenants['A'], $c->readTenant('A'));
    assertSame(1, $r->reads, 'yerel önbellek kullanılmalı');
});

t('CachedStorage: yazma önce uzağa, sonra yerele; okuma yeni değeri döner', function () {
    [$c, $r, $l] = cachedPair();
    assertTrue($c->writeTenant('A', '{"rev":2}', 2, 'dev'));
    assertSame('{"rev":2}', $r->tenants['A']);
    assertSame('{"rev":2}', $l->readTenant('A'));
    assertSame('{"rev":2}', $c->readTenant('A'));
    assertSame(0, $r->reads, 'yazılan veri tekrar uzaktan okunmamalı');
});

t('CachedStorage: uzak yazma başarısızsa yerel kopya DEĞİŞMEZ ve false döner (ayrışma yok)', function () {
    [$c, $r, $l] = cachedPair();
    $c->writeTenant('A', '{"rev":1}', 1, 'd');
    $r->failWrites = true;
    assertFalse($c->writeTenant('A', '{"rev":2}', 2, 'd'));
    assertSame('{"rev":1}', $l->readTenant('A'));
    assertFalse($c->writeRegistry('[{"tenantId":"X"}]'));
    assertNull($l->readRegistry());
});

t('CachedStorage: TTL dolunca uzaktan yenilenir (dışarıdan değişiklik görünür)', function () {
    [$c, $r, $l] = cachedPair(10);
    $c->writeTenant('A', '{"rev":1}', 1, 'd');
    $r->tenants['A'] = '{"rev":99}'; // panelden/başka sunucudan değişti
    assertSame('{"rev":1}', $c->readTenant('A'), 'TTL içinde yerel');
    touch($l->path('A'), time() - 3600);
    assertSame('{"rev":99}', $c->readTenant('A'), 'TTL sonrası uzak');
    assertSame('{"rev":99}', $l->readTenant('A'), 'yerel kopya güncellenmeli');
});

t('CachedStorage: TTL=0 süresiz önbellek; kayıt yoksa null ve önbelleğe yazılmaz', function () {
    [$c, $r, $l] = cachedPair(0);
    assertNull($c->readTenant('YOK'));
    assertFalse(is_file($l->path('YOK')), 'olmayan kayıt için dosya açılmamalı');
    $c->writeTenant('A', '{"a":1}', 1, 'd');
    touch($l->path('A'), time() - 999999);
    assertSame('{"a":1}', $c->readTenant('A'));
});

t('CachedStorage: silme her iki depodan; kayıt listesi okuma/yazma ve sürüm', function () {
    [$c, $r, $l] = cachedPair();
    $c->writeTenant('A', '{"a":1}', 1, 'd');
    assertSame('{"a":1}', $c->deleteTenant('A'));
    assertNull($c->readTenant('A'));
    assertNull($l->readTenant('A'));
    $v0 = $c->registryVersion();
    assertTrue($c->writeRegistry('[{"tenantId":"X"}]'));
    assertNotSame($v0, $c->registryVersion(), 'kayıt değişince sürüm değişmeli (TenantService önbelleği yenilensin)');
    assertSame('[{"tenantId":"X"}]', $c->readRegistry());
    assertSame(1, $r->reads, 'yalnızca silinen kaydın ıskası uzağa gitmeli; kayıt listesi yerelden');
});

t('TenantService CachedStorage üzerinde: kaydet/yükle/PIN, uzak okuma sayısı sabit', function () {
    $remote = new FakeRemote();
    $c = new CachedStorage($remote, new FileStorage(tmpDir('cache')), 900);
    $ts = new TenantService($c);
    $auth = new AuthService($ts);
    assertTrue($ts->upsertEntry(['tenantId' => 'CACHE-1', 'businessName' => 'Önbellek', 'initialPin' => '2468', 'expiresAt' => 'unlimited'])['ok']);
    assertTrue($ts->saveTenant('CACHE-1', json_encode(minimalState(['marker' => 'M1'])), 'dev')['ok']);
    $before = $remote->reads;
    for ($i = 0; $i < 10; $i++) {
        assertSame('M1', $ts->loadTenant('CACHE-1')['data']['marker']);
        assertTrue($ts->findRegistryEntry('CACHE-1') !== null);
    }
    assertSame($before, $remote->reads, 'okumalar uzak depoya gitmemeli');
    assertTrue((new PinService($ts))->verify('CACHE-1', '2468')['ok']);
    assertNotContains('2468', (string)$remote->tenants['CACHE-1'], 'uzak depoda düz PIN yok');
});

t('StorageUnavailable: önbellek yutmaz, TenantService "kayıt yok" sanıp üzerine YAZMAZ', function () {
    $remote = new FakeRemote();
    $remote->down = true;
    $c = new CachedStorage($remote, new FileStorage(tmpDir('cache')), 900);
    $threw = false;
    try { $c->readTenant('A'); } catch (\ProPos\Services\Storage\StorageUnavailable $e) { $threw = true; }
    assertTrue($threw, 'erişilemezlik "yok" gibi görünmemeli');
    $ts = new TenantService($c);
    $threw = false;
    try { $ts->saveTenant('A', json_encode(minimalState()), 'dev'); } catch (\ProPos\Services\Storage\StorageUnavailable $e) { $threw = true; }
    assertTrue($threw, 'depo kapalıyken kayıt reddedilmeli (sessiz veri kaybı yok)');
    assertSame([], $remote->tenants, 'hiçbir şey yazılmamalı');
});

t('saveTenant: baseRev uyuşmazlığı yazmaz ve güncel veriyi döner; eşleşince yazar', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'CC-1');
    $a = $ts->saveTenant('CC-1', json_encode(minimalState(['marker' => 'A'])), 'dev1');
    $stale = $ts->saveTenant('CC-1', json_encode(minimalState(['marker' => 'B'])), 'dev2', $a['rev'] - 5);
    assertTrue(!empty($stale['conflict']) && $stale['ok'] === false);
    assertSame($a['rev'], $stale['rev']);
    assertSame('A', $ts->loadTenant('CC-1')['data']['marker']);
    $ok = $ts->saveTenant('CC-1', json_encode(minimalState(['marker' => 'C'])), 'dev2', $a['rev']);
    assertTrue($ok['ok']);
    assertSame('C', $ts->loadTenant('CC-1')['data']['marker']);
});

t('Müşteri paketi PWA dosyalarını içerir (çevrimdışı açılış kurulumda da çalışsın)', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'PWA-1');
    foreach (['index.html' => '<html><head></head><body>x</body></html>', 'sw.js' => 'const VERSION="abc";', 'manifest.webmanifest' => '{"name":"x"}', 'icon-192.png' => "\x89PNG", 'icon-512.png' => "\x89PNG", 'icon-maskable-512.png' => "\x89PNG", 'apple-touch-icon.png' => "\x89PNG"] as $f => $c) {
        file_put_contents(PROPOS_DIST_DIR . DIRECTORY_SEPARATOR . $f, $c);
    }
    $files = readZip((new \ProPos\Services\PackageService($ts))->buildCustomerZip('PWA-1', '', '3.0.0')['bytes']);
    foreach (['dist/sw.js', 'dist/manifest.webmanifest', 'dist/icon-192.png', 'dist/icon-512.png', 'dist/icon-maskable-512.png', 'dist/apple-touch-icon.png'] as $need) {
        assertTrue(isset($files[$need]), "pakette eksik: $need");
    }
});

t('saveUser: varsayılan en az 8; komut satırı --allow-short 4-7 kabul eder; 4 altı hiçbir yoldan geçmez', function () {
    [$ts] = freshServices();
    unitTenant($ts, 'USR-UNIT');
    assertFalse($ts->saveUser(['tenantId' => 'USR-UNIT', 'username' => 'kisa.bir', 'password' => '3535'])['ok'], 'varsayılan 8');
    assertTrue($ts->saveUser(['tenantId' => 'USR-UNIT', 'username' => 'kisa.bir', 'password' => '3535'], 4)['ok'], 'izinli 4');
    assertFalse($ts->saveUser(['tenantId' => 'USR-UNIT', 'username' => 'kisa.iki', 'password' => '123'], 1)['ok'], 'taban 4');
    assertTrue(password_verify('3535', $ts->findUser('kisa.bir')['user']['hash']));
});

t('users.php yalnızca komut satırında çalışır (web SAPI 404)', function () {
    $src = (string)file_get_contents(dirname(__DIR__, 3) . '/backend/users.php');
    assertContains("PHP_SAPI !== 'cli'", $src);
});
