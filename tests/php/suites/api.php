<?php
declare(strict_types=1);

// POS API'si: normal akışlar (çalışan sunucuya HTTP). Kurulum: kontrol panelinden işletme açılır.

function apiCtx(): array
{
    if (!isset(T::$ctx['api'])) {
        $key = createTenant('API-A', '4826');
        T::$ctx['api'] = ['key' => $key, 'token' => tenantToken('API-A', $key)];
    }
    return T::$ctx['api'];
}

t('GET /api/info herkese açık ve sır içermez', function () {
    $r = jget(posUrl(), '/api/info');
    assertStatus(200, $r);
    assertSame('ProPos', $r['json']['app'] ?? null);
    assertNoLeak($r);
    assertNotContains('SYNC-', $r['body']);
});

t('login: yanlış anahtar 401, GET 405, boş gövde 401', function () {
    $r = jpost(posUrl(), '/api/login', ['tenantId' => 'API-A', 'key' => 'SYNC-YANL-ISAN-AHTR']);
    assertStatus(401, $r);
    assertSame('BAD_KEY', $r['json']['code'] ?? null);
    assertStatus(405, jget(posUrl(), '/api/login'));
    assertStatus(401, jpost(posUrl(), '/api/login', ''));
});

t('login: doğru işletme anahtarı tenant rolü verir', function () {
    $c = apiCtx();
    assertTrue(strlen($c['token']) > 20);
});

t('sync: belirteçsiz 401 (code AUTH)', function () {
    $r = jget(posUrl(), '/api/sync?tenantId=API-A');
    assertStatus(401, $r);
    assertSame('AUTH', $r['json']['code'] ?? null);
});

t('sync: GET kendi verisini döner; PIN hash ve başka işletme yok', function () {
    $c = apiCtx();
    $r = jget(posUrl(), '/api/sync?tenantId=API-A', tok($c['token']));
    assertStatus(200, $r);
    assertNoLeak($r);
    assertSame(1, count($r['json']['registry'] ?? []));
    assertSame('API-A', $r['json']['registry'][0]['tenantId'] ?? null);
    assertFalse(isset($r['json']['registry'][0]['syncKey']), 'syncKey cihaza geri gönderilmemeli');
    assertFalse(isset($r['json']['data']['adminPinHash']) || isset($r['json']['data']['adminPin']));
});

t('sync: POST kaydeder, rev artar, since ile "unchanged" döner', function () {
    $c = apiCtx();
    $w = jpost(posUrl(), '/api/sync?tenantId=API-A&deviceId=tablet-1', minimalState(['marker' => 'ilk']), tok($c['token']));
    assertStatus(200, $w);
    $rev = $w['json']['rev'];
    $r = jget(posUrl(), "/api/sync?tenantId=API-A&since=$rev", tok($c['token']));
    assertSame(true, $r['json']['unchanged'] ?? null);
    $w2 = jpost(posUrl(), '/api/sync?tenantId=API-A&deviceId=tablet-2', minimalState(['marker' => 'ikinci']), tok($c['token']));
    assertTrue($w2['json']['rev'] > $rev);
    $r2 = jget(posUrl(), "/api/sync?tenantId=API-A&since=$rev", tok($c['token']));
    assertSame('ikinci', $r2['json']['data']['marker'] ?? null);
    assertSame('tablet-2', $r2['json']['updatedBy'] ?? null);
});

t('sync: bozuk gövde 400, desteklenmeyen yöntem 405', function () {
    $c = apiCtx();
    assertStatus(400, jpost(posUrl(), '/api/sync?tenantId=API-A', '{bozuk', tok($c['token'])));
    assertStatus(400, jpost(posUrl(), '/api/sync?tenantId=API-A', ['tables' => 'x', 'products' => []], tok($c['token'])));
    assertStatus(405, http(posUrl(), 'PUT', '/api/sync?tenantId=API-A', tok($c['token']), '{}'));
    assertStatus(405, http(posUrl(), 'DELETE', '/api/sync?tenantId=API-A', tok($c['token'])));
});

t('PIN: durum, yanlış PIN 401 + kalan hak, doğru PIN yönetici belirteci', function () {
    $c = apiCtx();
    $s = jget(posUrl(), '/api/pin/status?tenantId=API-A', tok($c['token']));
    assertSame(true, $s['json']['hasPin'] ?? null);
    $bad = jpost(posUrl(), '/api/pin/verify?tenantId=API-A', ['pin' => '0000'], tok($c['token']));
    assertStatus(401, $bad);
    assertSame('BAD_PIN', $bad['json']['code'] ?? null);
    assertTrue(is_int($bad['json']['attemptsLeft'] ?? null));
    $ok = jpost(posUrl(), '/api/pin/verify?tenantId=API-A', ['pin' => '4826'], tok($c['token']));
    assertStatus(200, $ok);
    assertSame('manager', $ok['json']['role'] ?? null);
    T::$ctx['api']['manager'] = $ok['json']['token'];
    assertStatus(200, jget(posUrl(), '/api/sync?tenantId=API-A', tok($ok['json']['token'])), 'yönetici belirteci senkronda da geçerli');
});

t('PIN değiştirme: yönetici oturumuyla mevcut PIN sorulmaz; eski PIN artık geçmez', function () {
    $c = apiCtx();
    $mgr = T::$ctx['api']['manager'] ?? skip('önceki test yönetici belirteci üretmedi');
    assertStatus(401, jpost(posUrl(), '/api/pin/change?tenantId=API-A', ['current' => 'yanlis', 'next' => '1593'], tok($c['token'])), 'cihaz oturumu + yanlış mevcut PIN');
    assertStatus(400, jpost(posUrl(), '/api/pin/change?tenantId=API-A', ['next' => '1 2'], tok($mgr)), 'geçersiz PIN');
    assertStatus(200, jpost(posUrl(), '/api/pin/change?tenantId=API-A', ['next' => '1593'], tok($mgr)));
    assertStatus(401, jpost(posUrl(), '/api/pin/verify?tenantId=API-A', ['pin' => '4826'], tok($c['token'])));
    assertStatus(200, jpost(posUrl(), '/api/pin/verify?tenantId=API-A', ['pin' => '1593'], tok($c['token'])));
});

t('lisans: askıya alınan işletme giriş yapamaz, açık oturumu da 403 alır; açılınca düzelir', function () {
    $key = createTenant('API-LIC');
    $token = tenantToken('API-LIC', $key);
    $f = tok(founderToken());
    assertStatus(200, jpost(controlUrl(), '/api/tenants/save', ['tenantId' => 'API-LIC', 'businessName' => 'Lisans', 'status' => 'suspended', 'planType' => 'yearly', 'expiresAt' => 'unlimited'], $f));
    $l = jpost(posUrl(), '/api/login', ['tenantId' => 'API-LIC', 'key' => $key]);
    assertStatus(403, $l);
    assertSame('LICENSE', $l['json']['code'] ?? null);
    $s = jget(posUrl(), '/api/sync?tenantId=API-LIC', tok($token));
    assertStatus(403, $s);
    assertSame('LICENSE', $s['json']['code'] ?? null);
    assertStatus(200, jpost(controlUrl(), '/api/tenants/save', ['tenantId' => 'API-LIC', 'businessName' => 'Lisans', 'status' => 'active', 'planType' => 'yearly', 'expiresAt' => 'unlimited'], $f));
    assertStatus(200, jget(posUrl(), '/api/sync?tenantId=API-LIC', tok($token)));
});

t('lisans: süresi dolan işletme giriş yapamaz', function () {
    $key = createTenant('API-EXP');
    assertStatus(200, jpost(controlUrl(), '/api/tenants/save', ['tenantId' => 'API-EXP', 'businessName' => 'Bitti', 'status' => 'active', 'planType' => 'monthly', 'expiresAt' => '2020-01-01'], tok(founderToken())));
    $l = jpost(posUrl(), '/api/login', ['tenantId' => 'API-EXP', 'key' => $key]);
    assertStatus(403, $l);
});

t('anahtar yenileme: eski anahtar ve eski oturumlar anında düşer', function () {
    $key = createTenant('API-ROT');
    $old = tenantToken('API-ROT', $key);
    $r = jpost(controlUrl(), '/api/tenants/rotate-key', ['tenantId' => 'API-ROT'], tok(founderToken()));
    assertStatus(200, $r);
    $new = $r['json']['syncKey'];
    assertNotSame($key, $new);
    assertStatus(401, jpost(posUrl(), '/api/login', ['tenantId' => 'API-ROT', 'key' => $key]), 'eski anahtar');
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=API-ROT', tok($old)), 'eski oturum (çalınan cihaz senaryosu)');
    assertStatus(200, jget(posUrl(), '/api/sync?tenantId=API-ROT', tok(tenantToken('API-ROT', $new))));
});

t('bilinmeyen uç 404 JSON döner', function () {
    $r = jget(posUrl(), '/api/olmayan-uc');
    assertStatus(404, $r);
    assertTrue(is_array($r['json']));
});

t('POS kökü uygulamayı servis eder (index.html)', function () {
    $r = jget(posUrl(), '/');
    assertStatus(200, $r);
    assertContains('<div id="root">', $r['body']);
    assertContains('text/html', $r['headers']['content-type'] ?? '');
});
