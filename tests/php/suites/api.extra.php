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
