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

    public function name(): string { return 'supabase'; }
    public function readTenant(string $id): ?string { $this->reads++; return $this->tenants[$id] ?? null; }
    public function writeTenant(string $id, string $json, int $rev, string $by): bool { if ($this->failWrites) return false; $this->tenants[$id] = $json; return true; }
    public function deleteTenant(string $id): ?string { $r = $this->tenants[$id] ?? null; unset($this->tenants[$id]); return $r; }
    public function stats(array $ids): array { return []; }
    public function readRegistry(): ?string { $this->reads++; return $this->registry; }
    public function writeRegistry(string $json): bool { if ($this->failWrites) return false; $this->registry = $json; return true; }
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
