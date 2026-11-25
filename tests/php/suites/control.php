<?php
declare(strict_types=1);

// Kontrol paneli: ayrı giriş noktası, yalnızca kurucu.

t('kontrol paneli kökü panel arayüzünü CSP ve DENY ile servis eder', function () {
    $r = jget(controlUrl(), '/');
    assertStatus(200, $r);
    assertContains('Kontrol Paneli', $r['body']);
    assertContains("frame-ancestors 'none'", $r['headers']['content-security-policy'] ?? '');
    assertSame('DENY', $r['headers']['x-frame-options'] ?? null);
});

t('POS sunucusu panel arayüzünü servis etmez', function () {
    foreach (['/', '/dist-admin/index.html', '/../dist-admin/index.html', '/%2e%2e/dist-admin/index.html'] as $p) {
        $r = http(posUrl(), 'GET', $p);
        assertNotContains('Kontrol Paneli', $r['body'], "POS $p");
    }
});

t('kontrol paneli POS uçlarını içermez (sync/pin 404)', function () {
    $f = tok(founderToken());
    assertStatus(404, jget(controlUrl(), '/api/sync?tenantId=DEFAULT', $f));
    assertStatus(404, jpost(controlUrl(), '/api/pin/verify?tenantId=DEFAULT', ['pin' => '1'], $f));
});

t('kontrol girişi: işletme anahtarı kabul edilmez', function () {
    $key = createTenant('CTL-A');
    $r = jpost(controlUrl(), '/api/login', ['key' => $key]);
    assertStatus(401, $r);
    assertStatus(401, jpost(controlUrl(), '/api/login', ['key' => 'yanlis-kurucu']));
});

t('kontrol uçları: belirteçsiz, işletme ve yönetici belirteciyle 401', function () {
    $key = T::$ctx['api']['key'] ?? createTenant('CTL-B');
    $id = isset(T::$ctx['api']['key']) ? 'API-A' : 'CTL-B';
    $tenant = tenantToken($id, $key);
    $tokens = [null, $tenant, 'çöp.belirteç'];
    if (isset(T::$ctx['api']['manager'])) $tokens[] = T::$ctx['api']['manager'];
    foreach ($tokens as $t) {
        foreach ([['GET', '/api/tenants'], ['GET', '/api/audit'], ['GET', '/api/session'], ['GET', '/api/package?tenantId=' . $id], ['POST', '/api/tenants/save'], ['POST', '/api/tenants/rotate-key'], ['POST', '/api/tenants/delete']] as [$m, $p]) {
            $r = http(controlUrl(), $m, $p, tok($t), $m === 'POST' ? json_encode(['tenantId' => $id, 'businessName' => 'x']) : null);
            assertStatus(401, $r, "$m $p");
        }
    }
});

t('işletme listesi: anahtar var, PIN yok, istatistik var', function () {
    $r = jget(controlUrl(), '/api/tenants', tok(founderToken()));
    assertStatus(200, $r);
    $found = false;
    foreach ($r['json']['tenants'] as $tn) {
        assertFalse(isset($tn['adminPin']), 'PIN listede olmamalı');
        assertTrue(array_key_exists('stats', $tn));
        if ($tn['tenantId'] === 'CTL-A') $found = true;
    }
    assertTrue($found);
    assertNotContains('adminPinHash', $r['body']);
});

t('kayıt doğrulama hataları 400 ve anlamlı mesaj', function () {
    $f = tok(founderToken());
    foreach ([['tenantId' => 'x', 'businessName' => 'a'], ['tenantId' => 'CTL-V', 'businessName' => ''], ['tenantId' => 'CTL-V', 'businessName' => 'a', 'status' => 'root'], ['tenantId' => 'CTL-A', 'businessName' => 'a', 'mustBeNew' => true]] as $b) {
        $r = jpost(controlUrl(), '/api/tenants/save', $b, $f);
        assertStatus(400, $r, show($b));
        assertTrue(is_string($r['json']['error'] ?? null));
    }
    assertStatus(405, jget(controlUrl(), '/api/tenants/save', $f));
});

t('silme: DEFAULT ve bilinmeyen kayıt silinemez; gerçek silme listeden düşürür', function () {
    $f = tok(founderToken());
    assertStatus(400, jpost(controlUrl(), '/api/tenants/delete', ['tenantId' => 'DEFAULT'], $f));
    assertStatus(400, jpost(controlUrl(), '/api/tenants/delete', ['tenantId' => 'YOK-YOK'], $f));
    createTenant('CTL-DEL');
    assertStatus(200, jpost(controlUrl(), '/api/tenants/delete', ['tenantId' => 'CTL-DEL'], $f));
    assertNotContains('"CTL-DEL"', jget(controlUrl(), '/api/tenants', $f)['body']);
});

t('kurulum paketi: ZIP döner, yalnızca istenen işletme', function () {
    $f = tok(founderToken());
    $other = createTenant('CTL-PKG2');
    $mine = createTenant('CTL-PKG1');
    $r = jget(controlUrl(), '/api/package?tenantId=CTL-PKG1', $f);
    assertStatus(200, $r);
    assertSame('application/zip', $r['headers']['content-type'] ?? null);
    assertSame("PK\x03\x04", substr($r['body'], 0, 4));
    $files = readZip($r['body']);
    $all = implode("
", array_keys($files)) . "
" . implode("
", $files);
    assertContains($mine, $all);
    assertNotContains($other, $all);
    assertNotContains('ControlController', $all);
    assertFalse(isset($files['data/config.json']));
});

t('denetim kaydı: başarısız girişler görünür', function () {
    $r = jget(controlUrl(), '/api/audit', tok(founderToken()));
    assertStatus(200, $r);
    assertContains('control.login', $r['body']);
    assertContains('login.fail', $r['body']);
});
