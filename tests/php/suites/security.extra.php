<?php
declare(strict_types=1);

// security suite eki: geri bildirim ucu (doğrulama, kimlik, denetim günlüğü enjeksiyonu, boyut).

t('feedback: belirteçsiz 401, GET 405, geçersiz tür 400', function () {
    $c = secCtx();
    assertStatus(401, jpost(posUrl(), '/api/feedback?tenantId=SEC-A', ['kind' => 'bug', 'text' => 'x']));
    assertStatus(405, jget(posUrl(), '/api/feedback?tenantId=SEC-A', tok($c['ta'])));
    foreach (['', 'admin', ['bug'], 5, null, 'BUG'] as $kind) {
        assertStatus(400, jpost(posUrl(), '/api/feedback?tenantId=SEC-A', ['kind' => $kind, 'text' => 'x'], tok($c['ta'])), show($kind));
    }
});

t('feedback: kaydedilir, denetim günlüğünde işletme/tür/ekran/not görünür', function () {
    $c = secCtx();
    $marker = 'FB-' . bin2hex(random_bytes(4));
    assertStatus(200, jpost(posUrl(), '/api/feedback?tenantId=SEC-A', ['kind' => 'confusing', 'text' => "Kafa karışıyor $marker", 'screen' => 'inventory'], tok($c['ta'])));
    $lines = jget(controlUrl(), '/api/audit', tok(founderToken()))['json']['lines'] ?? [];
    $hit = array_values(array_filter($lines, static fn($l) => strpos($l, $marker) !== false));
    assertSame(1, count($hit));
    assertContains("\tfeedback\t", $hit[0]);
    assertContains('SEC-A | confusing | inventory | Kafa karışıyor', $hit[0]);
});

t('feedback: satır sonu/sekme enjeksiyonu sahte denetim kaydı üretemez; uzun metin kırpılır', function () {
    $c = secCtx();
    $evil = "x\n2099-01-01T00:00:00+00:00\t9.9.9.9\tlogin.founder\tSAHTE-FB\r\ny";
    assertStatus(200, jpost(posUrl(), '/api/feedback?tenantId=SEC-A', ['kind' => 'bug', 'text' => $evil, 'screen' => "pos\nX"], tok($c['ta'])));
    assertStatus(200, jpost(posUrl(), '/api/feedback?tenantId=SEC-A', ['kind' => 'idea', 'text' => str_repeat('ş', 5000), 'screen' => 'pos'], tok($c['ta'])));
    $lines = jget(controlUrl(), '/api/audit', tok(founderToken()))['json']['lines'] ?? [];
    foreach ($lines as $line) {
        assertSame(3, substr_count($line, "\t"), 'her kayıt tam 4 alan: ' . show($line));
        assertFalse(strpos($line, "\tSAHTE-FB") !== false && strpos($line, 'login.founder') === 0, 'sahte kayıt');
    }
    $long = array_values(array_filter($lines, static fn($l) => strpos($l, 'ş') !== false && strpos($l, '| idea |') !== false));
    assertTrue(count($long) >= 1 && strlen($long[0]) < 900, 'metin kırpılmalı');
    assertSame(1, preg_match('//u', $long[0]), 'kırpma UTF-8 karakterini bölmemeli');
});

t('feedback: tip karışıklığı (dizi not/ekran) hata vermez', function () {
    $c = secCtx();
    $r = http(posUrl(), 'POST', '/api/feedback?tenantId=SEC-A', tok($c['ta']), json_encode(['kind' => 'bug', 'text' => ['a'], 'screen' => ['b']]));
    assertStatus(200, $r);
    assertNoLeak($r);
});

t('feedback: başka işletme belirteciyle yazılamaz', function () {
    $c = secCtx();
    assertStatus(401, jpost(posUrl(), '/api/feedback?tenantId=SEC-B', ['kind' => 'bug', 'text' => 'x'], tok($c['ta'])));
});
