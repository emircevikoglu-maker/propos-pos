<?php
declare(strict_types=1);

// Kötüye kullanım: kaba kuvvet ve hız sınırı. Sıkı limitli AYRI bir sunucuda çalışır
// (run.py: PROPOS_RL_POLL=5:0.05, PROPOS_RL_ACTION=40:5, PROPOS_RL_IP=80:0.5). Sıra önemli.

function abuseCtx(): array
{
    if (!isset(T::$ctx['abuse'])) {
        $key = createTenant('ABU-A', '8642');
        T::$ctx['abuse'] = ['key' => $key, 'token' => tenantToken('ABU-A', $key)];
    }
    return T::$ctx['abuse'];
}

t('hız sınırı: yoklama kovası dolunca 429 + Retry-After; eylem kovası etkilenmez', function () {
    $c = abuseCtx();
    $limited = null;
    for ($i = 0; $i < 12; $i++) {
        $r = jget(posUrl(), '/api/sync?tenantId=ABU-A&deviceId=tab-1', tok($c['token']));
        if ($r['status'] === 429) { $limited = $r; break; }
    }
    if ($limited === null) fail('12 yoklamada 429 gelmedi');
    assertMatches('/^\d+$/', $limited['headers']['retry-after'] ?? '', 'Retry-After');
    assertTrue((int)$limited['headers']['retry-after'] >= 1);
    assertSame('RATE_LIMIT', $limited['json']['code'] ?? null);
    assertContains('sn bekleyin', $limited['json']['error'] ?? '');
    $w = jpost(posUrl(), '/api/sync?tenantId=ABU-A&deviceId=tab-1', minimalState(), tok($c['token']));
    assertStatus(200, $w, 'garsonun siparişi yoklama yüzünden engellenmemeli');
    $other = jget(posUrl(), '/api/sync?tenantId=ABU-A&deviceId=tab-2', tok($c['token']));
    assertStatus(200, $other, 'başka cihazın kovası ayrı');
});

t('kaba kuvvet: PIN 6 hatadan sonra kilitlenir, doğru PIN de 429 alır', function () {
    $c = abuseCtx();
    for ($i = 0; $i < 6; $i++) {
        assertStatus(401, jpost(posUrl(), '/api/pin/verify?tenantId=ABU-A&deviceId=p', ['pin' => sprintf('%04d', $i)], tok($c['token'])));
    }
    $r = jpost(posUrl(), '/api/pin/verify?tenantId=ABU-A&deviceId=p', ['pin' => '8642'], tok($c['token']));
    assertStatus(429, $r);
    assertTrue(isset($r['headers']['retry-after']));
});

t('kaba kuvvet: 8 hatalı anahtardan sonra giriş kilitlenir (doğru anahtar dahil)', function () {
    $c = abuseCtx();
    for ($i = 0; $i < 8; $i++) {
        assertStatus(401, jpost(posUrl(), '/api/login', ['tenantId' => 'ABU-A', 'key' => "SYNC-AAAA-AAAA-AA$i$i"]));
    }
    $r = jpost(posUrl(), '/api/login', ['tenantId' => 'ABU-A', 'key' => $c['key']]);
    assertStatus(429, $r);
    assertTrue((int)($r['headers']['retry-after'] ?? 0) > 0);
    $p = jpost(controlUrl(), '/api/login', ['key' => (string)opt('founder-key')]);
    assertStatus(200, $p, 'bozuk anahtarlı tabletler kurucuyu kontrol panelinden kilitlememeli (ayrı sayaç)');
    for ($i = 0; $i < 8; $i++) {
        assertStatus(401, jpost(controlUrl(), '/api/login', ['key' => "yanlis-$i"]));
    }
    assertStatus(429, jpost(controlUrl(), '/api/login', ['key' => (string)opt('founder-key')]), 'kontrol panelinin kendi kilidi');
});

t('hız sınırı: cihaz kimliği değiştirerek IP kovası atlatılamaz', function () {
    $c = abuseCtx();
    $hit = false;
    for ($i = 0; $i < 120; $i++) {
        $r = jget(posUrl(), '/api/sync?tenantId=ABU-A&deviceId=rnd' . bin2hex(random_bytes(4)), tok($c['token']));
        if ($r['status'] === 429) { $hit = true; break; }
    }
    assertTrue($hit, '120 farklı cihaz kimliğiyle IP sınırı tetiklenmeli');
});
