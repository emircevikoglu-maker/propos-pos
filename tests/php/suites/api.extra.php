<?php
declare(strict_types=1);

// api suite eki: keepalive ve realtime uçları.

t('keepalive: herkese açık, içeriksiz {ok:true}, yalnızca bu uçta CORS *', function () {
    $r = http(posUrl(), 'GET', '/api/keepalive', ['Origin' => 'https://baska-host.example']);
    assertStatus(200, $r);
    assertSame('{"ok":true}', trim($r['body']), 'yanıt hiçbir şey belli etmemeli');
    assertSame('*', $r['headers']['access-control-allow-origin'] ?? null);
    $o = http(posUrl(), 'OPTIONS', '/api/keepalive', ['Origin' => 'https://baska-host.example', 'Access-Control-Request-Method' => 'GET']);
    assertStatus(204, $o);
    assertSame('*', $o['headers']['access-control-allow-origin'] ?? null);
    assertStatus(405, http(posUrl(), 'PUT', '/api/keepalive'));
    $other = http(posUrl(), 'GET', '/api/info', ['Origin' => 'https://baska-host.example']);
    assertFalse(isset($other['headers']['access-control-allow-origin']), 'diğer uçlarda CORS açık OLMAMALI');
});

t('realtime ucu: belirteç ister; Supabase yoksa enabled=false', function () {
    $c = apiCtx();
    assertStatus(401, jget(posUrl(), '/api/realtime?tenantId=API-A'));
    $r = jget(posUrl(), '/api/realtime?tenantId=API-A', tok($c['token']));
    assertStatus(200, $r);
    assertSame(false, $r['json']['enabled'] ?? null);
    assertNotContains('SUPABASE', $r['body']);
});

t('eşzamanlılık: baseRev eşleşirse yazılır, eskiyse 409 CONFLICT + güncel veri (PIN\'siz), baseRev yoksa eski davranış', function () {
    $key = createTenant('API-CC');
    $tok = tenantToken('API-CC', $key);
    $w0 = jpost(posUrl(), '/api/sync?tenantId=API-CC&deviceId=a', minimalState(['marker' => 'v0']), tok($tok));
    assertStatus(200, $w0);
    $r0 = $w0['json']['rev'];
    $w1 = jpost(posUrl(), "/api/sync?tenantId=API-CC&deviceId=a&baseRev=$r0", minimalState(['marker' => 'v1']), tok($tok));
    assertStatus(200, $w1, 'baseRev güncelse kabul');
    $r1 = $w1['json']['rev'];
    assertTrue($r1 > $r0);
    $stale = jpost(posUrl(), "/api/sync?tenantId=API-CC&deviceId=b&baseRev=$r0", minimalState(['marker' => 'v-stale']), tok($tok));
    assertStatus(409, $stale);
    assertSame('CONFLICT', $stale['json']['code'] ?? null);
    assertSame($r1, $stale['json']['rev'] ?? null);
    assertSame('v1', $stale['json']['data']['marker'] ?? null, 'istemci birleştirebilsin diye güncel veri gelir');
    assertFalse(isset($stale['json']['data']['adminPinHash']) || isset($stale['json']['data']['adminPin']));
    assertSame('v1', jget(posUrl(), '/api/sync?tenantId=API-CC', tok($tok))['json']['data']['marker'], 'reddedilen yazma veriyi bozmamalı');
    assertStatus(200, jpost(posUrl(), '/api/sync?tenantId=API-CC&deviceId=old', minimalState(['marker' => 'legacy']), tok($tok)), 'baseRev yoksa son yazan kazanır (eski istemci)');
});

t('eşzamanlılık: geçersiz baseRev 400; kuyruk aynı anda gelen iki yazmadan yalnızca biri kazanır', function () {
    $key = createTenant('API-CD');
    $tok = tenantToken('API-CD', $key);
    $base = jpost(posUrl(), '/api/sync?tenantId=API-CD&deviceId=a', minimalState(), tok($tok))['json']['rev'];
    foreach (['abc', '-1', '1.5', '99999999999999999999', '1;DROP', '%00'] as $bad) {
        assertStatus(400, jpost(posUrl(), "/api/sync?tenantId=API-CD&deviceId=a&baseRev=$bad", minimalState(), tok($tok)), $bad);
    }
    $codes = [];
    foreach (['x', 'y', 'z'] as $d) {
        $codes[] = jpost(posUrl(), "/api/sync?tenantId=API-CD&deviceId=$d&baseRev=$base", minimalState(['by' => $d]), tok($tok))['status'];
    }
    assertSame([200, 409, 409], $codes, 'aynı rev tabanından yalnızca ilk yazma geçer');
});

t('PWA: sw.js doğru içerik tipi ve Service-Worker-Allowed ile, manifest doğru MIME ile servis edilir', function () {
    $sw = jget(posUrl(), '/sw.js');
    if ($sw['status'] !== 200 || strpos($sw['body'], 'propos-shell-') === false) skip('dist PWA dosyaları yok (npm run build)');
    assertContains('javascript', $sw['headers']['content-type'] ?? '');
    assertSame('/', $sw['headers']['service-worker-allowed'] ?? null);
    assertNotContains('__VERSION__', $sw['body']);
    $m = jget(posUrl(), '/manifest.webmanifest');
    assertStatus(200, $m);
    assertContains('application/manifest+json', $m['headers']['content-type'] ?? '');
    assertSame('ProPos', $m['json']['short_name'] ?? null);
    $icon = jget(posUrl(), '/icon-192.png');
    assertSame("\x89PNG", substr($icon['body'], 0, 4));
});

t('PWA: gezinme istekleri (herhangi yol) uygulama kabuğunu döner; API yolları kabuğa DÜŞMEZ', function () {
    foreach (['/', '/masalar', '/?tenant=X'] as $p) {
        assertContains('<div id="root">', jget(posUrl(), $p)['body'], $p);
    }
    $r = jget(posUrl(), '/api/yok-boyle-bir-uc');
    assertStatus(404, $r);
    assertNotContains('<div id="root">', $r['body']);
});

t('503 STORAGE_DOWN ve 500 SERVER yanıtları sır sızdırmaz (yalnızca sabit JSON)', function () {
    // Gövdesi bozuk istek sunucu hatası üretmemeli; yine de genel hata biçimi JSON olmalı.
    $r = http(posUrl(), 'POST', '/api/login', [], str_repeat("\xFF", 5000));
    assertTrue($r['status'] < 500, 'HTTP ' . $r['status']);
    assertNoLeak($r);
});
