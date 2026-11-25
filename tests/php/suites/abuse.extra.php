<?php
declare(strict_types=1);

// abuse suite eki: keepalive hız sınırı (sunucu PROPOS_RL_KEEPALIVE=2:0.0001 ile açılır).

t('keepalive: hız sınırı 429 + Retry-After; yanıt gövdesi hiçbir şey sızdırmaz', function () {
    $codes = [];
    for ($i = 0; $i < 5; $i++) {
        $r = http(posUrl(), 'GET', '/api/keepalive');
        $codes[] = $r['status'];
        if ($r['status'] === 429) {
            assertMatches('/^\d+$/', $r['headers']['retry-after'] ?? '');
            assertSame('{"ok":false}', trim($r['body']));
        }
    }
    assertTrue(in_array(429, $codes, true), 'sınır tetiklenmeli: ' . implode(',', $codes));
    assertSame([200, 200], array_slice($codes, 0, 2), 'ilk çağrılar geçmeli');
});
