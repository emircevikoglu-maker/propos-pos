<?php
declare(strict_types=1);

// Gerçek Supabase projesine karşı sözleşme testleri (yalnızca `--only supabase`). Geçici ZZTEST kayıtları açar ve siler;
// ana kayıt listesine (propos_registry) YAZMAZ. Şema kurulu değilse testler "atlandı" olur.

use ProPos\Services\Storage\SupabaseStorage;
use ProPos\Services\Storage\StorageFactory;

function sb(): SupabaseStorage
{
    $s = StorageFactory::make();
    if (!$s instanceof SupabaseStorage) skip('PROPOS_STORAGE=supabase değil');
    return $s;
}

function sbNeedSchema(): void
{
    if (sb()->request('GET', '/rest/v1/propos_tenant_state?select=tenant_id&limit=1')['status'] !== 200) {
        skip('şema kurulu değil: supabase/migrations/001_propos_init.sql çalıştırın');
    }
}

function assertNull($v, string $msg = ''): void { if ($v !== null) fail(($msg ? $msg . ': ' : '') . 'null beklendi: ' . show($v)); }
function assertNotNull($v, string $msg = ''): void { if ($v === null) fail(($msg ? $msg . ': ' : '') . 'null olmamalı'); }

t('bağlantı: REST erişilebilir ve ping başarılı', function () {
    sbNeedSchema();
    assertTrue(sb()->ping());
});

t('RLS: publishable (anon) anahtar tablolardan veri OKUYAMAZ ve YAZAMAZ', function () {
    sbNeedSchema();
    $anon = (string)getenv('SUPABASE_PUBLISHABLE_KEY') ?: skip('publishable anahtar yok');
    $a = new SupabaseStorage((string)getenv('SUPABASE_URL'), $anon);
    foreach (['propos_tenant_state', 'propos_registry'] as $t) {
        $r = $a->request('GET', "/rest/v1/$t?select=*&limit=1");
        assertTrue($r['status'] === 401 || $r['status'] === 403 || trim($r['body']) === '[]', "$t anon okuma: HTTP {$r['status']} " . substr($r['body'], 0, 80));
        assertNotContains('"data"', $r['body'], "$t anon veri sızdırdı");
    }
    $w = $a->request('POST', '/rest/v1/propos_tenant_state', '{"tenant_id":"ZZTEST-ANON","data":{}}', ['Prefer: return=minimal']);
    assertTrue($w['status'] >= 400, 'anon yazma reddedilmeli: HTTP ' . $w['status']);
    assertNull(sb()->readTenant('ZZTEST-ANON'));
});

t('anon anahtar keepalive RPC çağıramaz', function () {
    sbNeedSchema();
    $anon = (string)getenv('SUPABASE_PUBLISHABLE_KEY') ?: skip('publishable anahtar yok');
    $r = (new SupabaseStorage((string)getenv('SUPABASE_URL'), $anon))->request('POST', '/rest/v1/rpc/propos_keepalive', '{}');
    assertTrue($r['status'] >= 400, 'HTTP ' . $r['status']);
});

t('işletme verisi: yaz → oku → güncelle → sil (Türkçe karakter, iç içe veri korunur)', function () {
    sbNeedSchema();
    $id = 'ZZTEST-' . strtoupper(bin2hex(random_bytes(3)));
    $s = sb();
    try {
        $doc = ['tables' => [['id' => 't1', 'name' => 'Bahçe ş-ğ-ı', 'items' => []]], 'products' => [], 'rev' => 5, 'nested' => ['a' => [1, 2, ['b' => null]]]];
        assertTrue($s->writeTenant($id, json_encode($doc, JSON_UNESCAPED_UNICODE), 5, 'dev1'));
        $back = json_decode((string)$s->readTenant($id), true);
        assertSame('Bahçe ş-ğ-ı', $back['tables'][0]['name']);
        assertSame([1, 2, ['b' => null]], $back['nested']['a']);
        $doc['rev'] = 6;
        assertTrue($s->writeTenant($id, json_encode($doc), 6, 'dev2'));
        assertSame(6, json_decode((string)$s->readTenant($id), true)['rev']);
        $st = $s->stats([$id])[$id];
        assertSame(6, $st['rev']);
        assertSame('dev2', $st['updatedBy']);
        assertNotNull($s->deleteTenant($id));
        assertNull($s->readTenant($id));
    } finally {
        $s->deleteTenant($id);
    }
});

t('bilinmeyen kayıt null döner; filtre sözdizimi enjeksiyonu işlemez', function () {
    sbNeedSchema();
    assertNull(sb()->readTenant('ZZTEST-YOK-' . bin2hex(random_bytes(3))));
    assertNull(sb()->readTenant('X&select=*&or=(tenant_id.neq.A)'));
    assertNull(sb()->readTenant('A,or=(1.eq.1)'));
});

t('büyük veri (≈1 MB) yazılır ve aynen okunur', function () {
    sbNeedSchema();
    $id = 'ZZTEST-' . strtoupper(bin2hex(random_bytes(3)));
    $s = sb();
    try {
        $doc = ['tables' => [], 'products' => [], 'rev' => 1, 'pad' => str_repeat('ç', 500000)];
        assertTrue($s->writeTenant($id, json_encode($doc, JSON_UNESCAPED_UNICODE), 1, 'dev'));
        assertSame(500000, mb_strlen(json_decode((string)$s->readTenant($id), true)['pad'] ?? '', 'UTF-8'));
    } finally {
        $s->deleteTenant($id);
    }
});

t('kayıt listesi okunabilir (yazma testi yok: gerçek veriye dokunulmaz)', function () {
    sbNeedSchema();
    $r = sb()->readRegistry();
    assertTrue($r === null || is_array(json_decode($r, true)));
});

t('Realtime: kanal adı kararlı ve işletmeye özgü; sunucu yayını kabul edilir', function () {
    sbNeedSchema();
    if (!\ProPos\Services\Realtime::enabled()) skip('Realtime kapalı');
    $auth = new \ProPos\Services\AuthService(new \ProPos\Services\TenantService(sb()));
    assertTrue(\ProPos\Services\Realtime::notify('ZZTEST-RT', 1, 'dev', $auth), 'yayın kabul edilmeli');
    $t1 = \ProPos\Services\Realtime::topic('ZZTEST-RT', $auth);
    assertSame($t1, \ProPos\Services\Realtime::topic('ZZTEST-RT', $auth));
    assertNotSame($t1, \ProPos\Services\Realtime::topic('ZZTEST-RT2', $auth));
    assertMatches('/^propos-zztest-rt-[0-9a-f]{20}$/', $t1);
});
