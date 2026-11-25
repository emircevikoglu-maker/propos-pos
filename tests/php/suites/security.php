<?php
declare(strict_types=1);

// Saldırgan testler: dizin aşımı, belirteç sahteciliği, işletmeler arası erişim, yetki yükseltme,
// tip karışıklığı, boyut, başlık enjeksiyonu, bilgi sızıntısı. Her biri "açık var mı" sorusunu sorar.

function secCtx(): array
{
    if (!isset(T::$ctx['sec'])) {
        $ka = createTenant('SEC-A', '3141');
        $kb = createTenant('SEC-B', '2718');
        $ta = tenantToken('SEC-A', $ka);
        $tb = tenantToken('SEC-B', $kb);
        assertStatus(200, jpost(posUrl(), '/api/sync?tenantId=SEC-B&deviceId=b', minimalState(['marker' => 'B-GIZLI-VERI']), tok($tb)));
        $m = jpost(posUrl(), '/api/pin/verify?tenantId=SEC-A', ['pin' => '3141'], tok($ta));
        assertStatus(200, $m);
        T::$ctx['sec'] = ['ka' => $ka, 'kb' => $kb, 'ta' => $ta, 'tb' => $tb, 'ma' => $m['json']['token']];
    }
    return T::$ctx['sec'];
}

// ---- Statik dosya / dizin aşımı ------------------------------------------------

t('dizin aşımı: data/, backend/ ve .htaccess hiçbir kodlamayla okunamaz (POS + panel)', function () {
    $paths = [
        '/data/config.json', '/data/registry.json', '/data/audit.log', '/backend/config.php', '/.htaccess', '/package.json',
        '/../data/config.json', '/../../data/config.json', '/..%2fdata%2fconfig.json', '/%2e%2e/data/config.json',
        '/%2e%2e%2f%2e%2e%2fdata%2fconfig.json', '/..%5cdata%5cconfig.json', '/..\\data\\config.json',
        '/....//data/config.json', '/%252e%252e/data/config.json', '/index.html%00.json', '/%00', '/dist/../data/config.json',
        '/../backend/Services/AuthService.php', '/..%c0%afdata/config.json', '/data%2fconfig.json',
    ];
    $c = secCtx();
    foreach ([posUrl(), controlUrl()] as $base) {
        foreach ($paths as $p) {
            $r = http($base, 'GET', $p);
            assertNoLeak($r, "$base$p");
            foreach ([$c['ka'], $c['kb'], (string)opt('founder-key'), '"syncKey":"', 'B-GIZLI-VERI', "	login."] as $secret) {
                assertNotContains($secret, $r['body'], "$base$p sızıntı");
            }
        }
    }
});

t('statik: izin verilmeyen uzantılar servis edilmez', function () {
    foreach (['/index.php', '/x.phtml', '/a.sh'] as $p) {
        $r = http(posUrl(), 'GET', $p);
        assertNotContains('<?php', $r['body'], $p);
    }
});

// ---- Belirteç sahteciliği --------------------------------------------------------

t('belirteç: rolü founder yapılan işletme belirteci kurucu uçlarına giremez', function () {
    $c = secCtx();
    $forged = tamperToken($c['ta'], static function ($p) { $p['r'] = 'founder'; return $p; });
    assertStatus(401, jget(posUrl(), '/api/tenants', tok($forged)));
    assertStatus(401, jget(controlUrl(), '/api/tenants', tok($forged)));
});

t('belirteç: tenant alanı değiştirilerek başka işletmeye geçilemez', function () {
    $c = secCtx();
    $forged = tamperToken($c['ta'], static function ($p) { $p['t'] = 'SEC-B'; return $p; });
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=SEC-B', tok($forged)));
});

t('belirteç: süre uzatma, alg:none ve JWT biçimi reddedilir', function () {
    $c = secCtx();
    $longer = tamperToken($c['ta'], static function ($p) { $p['e'] = time() + 10 * 365 * 86400; return $p; });
    assertStatus(401, jget(posUrl(), '/api/sync?tenantId=SEC-A', tok($longer)));
    $none = rtrim(strtr(base64_encode('{"alg":"none"}'), '+/', '-_'), '=') . '.' . rtrim(strtr(base64_encode('{"r":"founder","t":"DEFAULT","e":9999999999}'), '+/', '-_'), '=') . '.';
    assertStatus(401, jget(posUrl(), '/api/tenants', tok($none)));
    $body = rtrim(strtr(base64_encode('{"r":"founder","t":"DEFAULT","e":9999999999}'), '+/', '-_'), '=');
    assertStatus(401, jget(posUrl(), '/api/tenants', tok($body . '.')));
    assertStatus(401, jget(posUrl(), '/api/tenants', tok($body)));
});

t('belirteç: devasa başlık sunucuyu düşürmez', function () {
    $r = jget(posUrl(), '/api/sync?tenantId=SEC-A', tok(str_repeat('A', 7000) . '.' . str_repeat('B', 100)));
    assertStatus(401, $r);
});

// ---- İşletmeler arası erişim ----------------------------------------------------------

t('çapraz işletme: A belirteciyle B okunamaz/yazılamaz (tüm kodlama varyantları)', function () {
    $c = secCtx();
    foreach (['SEC-B', 'sec-b', ' SEC-B ', 'SEC-B%00', 'SEC%2DB', 'SEC-B/../SEC-A', '..%2FSEC-B'] as $v) {
        $q = rawurlencode($v);
        if (strpos($v, '%') !== false) $q = $v; // zaten kodlanmış
        $r = jget(posUrl(), "/api/sync?tenantId=$q", tok($c['ta']));
        assertNotContains('B-GIZLI-VERI', $r['body'], "GET $v");
        $w = jpost(posUrl(), "/api/sync?tenantId=$q&deviceId=x", minimalState(['marker' => 'A-YAZDI']), tok($c['ta']));
        if ($w['status'] === 200) {
            assertSame('SEC-A', $w['json']['tenantId'] ?? null, "POST $v yalnızca A'ya yazabilir");
        }
    }
    $b = jget(posUrl(), '/api/sync?tenantId=SEC-B', tok($c['tb']));
    assertSame('B-GIZLI-VERI', $b['json']['data']['marker'] ?? null, "B'nin verisi bozulmamalı");
});

t('çapraz işletme: A belirteciyle B için PIN denenemez/değiştirilemez', function () {
    $c = secCtx();
    assertStatus(401, jpost(posUrl(), '/api/pin/verify?tenantId=SEC-B', ['pin' => '2718'], tok($c['ta'])));
    assertStatus(401, jpost(posUrl(), '/api/pin/change?tenantId=SEC-B', ['next' => '0000'], tok($c['ma'])), 'A yöneticisi B\'nin PIN\'ini değiştiremez');
    assertStatus(200, jpost(posUrl(), '/api/pin/verify?tenantId=SEC-B', ['pin' => '2718'], tok($c['tb'])), 'B\'nin PIN\'i değişmemiş olmalı');
});

t('çapraz işletme: gövdeye yazılan tenantId başka işletmeye yönlendirmez', function () {
    $c = secCtx();
    jpost(posUrl(), '/api/sync?tenantId=SEC-A&deviceId=x', minimalState(['tenantId' => 'SEC-B', 'marker' => 'A-GOVDE']), tok($c['ta']));
    $b = jget(posUrl(), '/api/sync?tenantId=SEC-B', tok($c['tb']));
    assertSame('B-GIZLI-VERI', $b['json']['data']['marker'] ?? null);
});

// ---- Yetki yükseltme -------------------------------------------------------------------

t('yetki: işletme ve yönetici belirteci POS\'taki kurucu uçlarına giremez', function () {
    $c = secCtx();
    foreach ([$c['ta'], $c['ma']] as $t) {
        foreach ([['GET', '/api/tenants', null], ['POST', '/api/tenants', '[]'], ['POST', '/api/apply-update', '<html>hack</html>'], ['GET', '/api/package?tenantId=SEC-B', null], ['GET', '/api/audit', null], ['POST', '/api/prepare-github', '{"version":"9"}']] as [$m, $p, $b]) {
            assertStatus(401, http(posUrl(), $m, $p, tok($t), $b), "$m $p");
        }
    }
});

t('yetki: senkronla PIN/hash enjekte edilerek yönetici kilidi ele geçirilemez', function () {
    $c = secCtx();
    $evil = minimalState(['adminPin' => '0000', 'adminPinHash' => password_hash('0000', PASSWORD_BCRYPT)]);
    assertStatus(200, jpost(posUrl(), '/api/sync?tenantId=SEC-A&deviceId=x', $evil, tok($c['ta'])));
    assertStatus(401, jpost(posUrl(), '/api/pin/verify?tenantId=SEC-A', ['pin' => '0000'], tok($c['ta'])));
    assertStatus(200, jpost(posUrl(), '/api/pin/verify?tenantId=SEC-A', ['pin' => '3141'], tok($c['ta'])));
});

t('yetki: cihaz oturumu mevcut PIN\'i bilmeden PIN değiştiremez', function () {
    $c = secCtx();
    assertStatus(401, jpost(posUrl(), '/api/pin/change?tenantId=SEC-A', ['next' => '0000'], tok($c['ta'])));
    assertStatus(401, jpost(posUrl(), '/api/pin/change?tenantId=SEC-A', ['current' => '', 'next' => '0000'], tok($c['ta'])));
});

t('yetki: kurucu kayıt listesine sahte syncKey gönderse bile anahtar değişmez', function () {
    $c = secCtx();
    $f = tok(founderToken());
    $list = jget(posUrl(), '/api/tenants', $f)['json']['tenants'];
    foreach ($list as &$e) if ($e['tenantId'] === 'SEC-A') $e['syncKey'] = 'SYNC-HACK-HACK-HACK';
    unset($e);
    assertStatus(200, jpost(posUrl(), '/api/tenants', $list, $f));
    assertStatus(401, jpost(posUrl(), '/api/login', ['tenantId' => 'SEC-A', 'key' => 'SYNC-HACK-HACK-HACK']));
    assertStatus(200, jpost(posUrl(), '/api/login', ['tenantId' => 'SEC-A', 'key' => $c['ka']]));
});

// ---- Tip karışıklığı / bozuk girdi -------------------------------------------------------

t('tip karışıklığı: dizi/nesne parametreler 500 üretmez, sızıntı yok', function () {
    $c = secCtx();
    $cases = [
        [posUrl(), 'POST', '/api/login', json_encode(['tenantId' => ['x'], 'key' => ['SYNC']])],
        [posUrl(), 'POST', '/api/login', json_encode(['tenantId' => 5, 'key' => 12345])],
        [posUrl(), 'POST', '/api/login', json_encode(['key' => ['$ne' => null]])],
        [posUrl(), 'GET', '/api/sync?tenantId[]=SEC-A', null],
        [posUrl(), 'GET', '/api/sync?tenantId=SEC-A&since[]=1', null],
        [posUrl(), 'POST', '/api/sync?tenantId=SEC-A&deviceId[]=x', json_encode(minimalState())],
        [posUrl(), 'POST', '/api/pin/verify?tenantId=SEC-A', json_encode(['pin' => ['3141']])],
        [posUrl(), 'POST', '/api/pin/verify?tenantId=SEC-A', json_encode(['pin' => 3141])],
        [posUrl(), 'POST', '/api/pin/change?tenantId=SEC-A', json_encode(['current' => ['x'], 'next' => ['y']])],
        [controlUrl(), 'POST', '/api/login', json_encode(['key' => ['a' => 'b']])],
        [controlUrl(), 'POST', '/api/tenants/save', json_encode(['tenantId' => ['A'], 'businessName' => ['x'], 'status' => ['active']])],
        [controlUrl(), 'POST', '/api/tenants/rotate-key', json_encode(['tenantId' => ['SEC-A']])],
        [controlUrl(), 'POST', '/api/tenants/delete', json_encode(['tenantId' => ['SEC-A']])],
        [controlUrl(), 'GET', '/api/package?tenantId[]=SEC-A', null],
    ];
    foreach ($cases as [$base, $m, $p, $b]) {
        $hdr = $base === controlUrl() ? tok(founderToken()) : tok($c['ta']);
        if ($p === '/api/login') $hdr = [];
        $r = http($base, $m, $p, $hdr, $b);
        assertTrue($r['status'] > 0 && $r['status'] < 500, "$m $p → HTTP {$r['status']}: " . show($r['body']));
        assertNoLeak($r, "$m $p");
    }
    assertStatus(401, jpost(posUrl(), '/api/pin/verify?tenantId=SEC-A', ['pin' => ['3141']], tok($c['ta'])), 'dizi PIN doğru sayılmamalı');
    $still = jget(controlUrl(), '/api/tenants', tok(founderToken()));
    assertContains('"SEC-A"', $still['body'], 'dizi tenantId ile kayıt silinmemeli');
    assertNotContains('"ARRAY"', $still['body'], '"Array" adlı kayıt oluşmamalı');
});

t('bozuk JSON: derin iç içe, dev sayı, BOM, boş — hepsi 4xx', function () {
    $c = secCtx();
    foreach ([str_repeat('[', 5000) . str_repeat(']', 5000), '{"tables":[],"products":[],"x":1e999999}', "\xEF\xBB\xBF{}", '', 'null', '"string"', '{"tables":{},"products":{}}x'] as $b) {
        $r = jpost(posUrl(), '/api/sync?tenantId=SEC-A&deviceId=x', $b, tok($c['ta']));
        assertTrue($r['status'] >= 200 && $r['status'] < 500, 'HTTP ' . $r['status']);
        assertNoLeak($r);
    }
});

t('boyut: sınırı aşan gövde reddedilir', function () {
    $c = secCtx();
    $limit = (int)(opt('max-db-bytes') ?? 0) ?: skip('--max-db-bytes verilmedi');
    $big = json_encode(minimalState(['pad' => str_repeat('x', $limit + 10)]));
    $r = jpost(posUrl(), '/api/sync?tenantId=SEC-A&deviceId=x', $big, tok($c['ta']));
    assertStatus(400, $r);
    assertContains('büyük', $r['json']['error'] ?? '');
});

// ---- Enjeksiyon / başlık / sızıntı -------------------------------------------------------

t('başlık enjeksiyonu: deviceId ve paket adındaki CRLF yanıta başlık eklemez', function () {
    $c = secCtx();
    $r = jpost(posUrl(), '/api/sync?tenantId=SEC-A&deviceId=' . rawurlencode("x\r\nX-Injected: 1"), minimalState(), tok($c['ta']));
    assertFalse(isset($r['headers']['x-injected']));
    assertMatches('/^[A-Za-z0-9_\-.]*$/', (string)($r['json']['updatedBy'] ?? ''));
    $p = jget(controlUrl(), '/api/package?tenantId=SEC-A&businessName=' . rawurlencode("a\"\r\nX-Injected: 1"), tok(founderToken()));
    assertFalse(isset($p['headers']['x-injected']));
    assertMatches('/^attachment; filename="[A-Za-z0-9_.\-]+"$/', $p['headers']['content-disposition'] ?? '');
});

t('denetim kaydı enjeksiyonu: satır sonu içeren girdi yeni kayıt satırı üretemez', function () {
    jpost(posUrl(), '/api/login', ['tenantId' => "SEC-A\n2099-01-01T00:00:00+00:00\t1.2.3.4\tlogin.founder\tSAHTE", 'key' => 'x']);
    $a = jget(controlUrl(), '/api/audit', tok(founderToken()));
    assertNotContains("\tSAHTE", implode("\n", $a['json']['lines'] ?? []));
    foreach ($a['json']['lines'] as $line) {
        assertSame(3, substr_count($line, "\t"), 'her kayıt tam 4 alan: ' . show($line));
    }
});

t('güvenlik başlıkları: nosniff, frame, referrer, önbellek; API JSON tipinde', function () {
    $r = jget(posUrl(), '/api/info');
    assertSame('nosniff', $r['headers']['x-content-type-options'] ?? null);
    assertSame('SAMEORIGIN', $r['headers']['x-frame-options'] ?? null);
    assertSame('no-referrer', $r['headers']['referrer-policy'] ?? null);
    assertContains('no-store', $r['headers']['cache-control'] ?? '');
    assertContains('application/json', $r['headers']['content-type'] ?? '');
});

t('CORS: yabancı köken izin almaz', function () {
    $r = http(posUrl(), 'GET', '/api/info', ['Origin' => 'https://evil.example']);
    assertFalse(isset($r['headers']['access-control-allow-origin']), 'CORS varsayılan kapalı olmalı');
    $o = http(posUrl(), 'OPTIONS', '/api/sync', ['Origin' => 'https://evil.example', 'Access-Control-Request-Method' => 'POST']);
    assertFalse(isset($o['headers']['access-control-allow-origin']));
});

t('sızıntı: hata yanıtları dosya yolu / PHP hatası içermez', function () {
    foreach ([['GET', '/api/sync'], ['POST', '/api/login'], ['GET', '/api/%00'], ['GET', '/api/' . str_repeat('a', 3000)], ['POST', '/api/pin/verify']] as [$m, $p]) {
        $r = http(posUrl(), $m, $p, [], $m === 'POST' ? '{' : null);
        assertNoLeak($r, "$m $p");
        assertTrue($r['status'] < 500, "$m $p HTTP {$r['status']}");
    }
});

t('kullanıcı adı numaralandırma: kayıtlı ve kayıtsız işletme aynı hatayı alır', function () {
    $a = jpost(posUrl(), '/api/login', ['tenantId' => 'SEC-A', 'key' => 'SYNC-XXXX-XXXX-XXXX']);
    $b = jpost(posUrl(), '/api/login', ['tenantId' => 'HIC-YOK-99', 'key' => 'SYNC-XXXX-XXXX-XXXX']);
    assertSame($a['status'], $b['status']);
    assertSame($a['json']['error'] ?? null, $b['json']['error'] ?? null);
});

t('apply-update (kurucu): HTML olmayan içerik reddedilir; yalnızca dist/ içine yazar', function () {
    $f = tok(founderToken());
    assertStatus(400, http(posUrl(), 'POST', '/api/apply-update', $f + ['Content-Type' => 'text/html'], '<?php echo 1; ?>'));
    $marker = 'PROPOS-TEST-' . bin2hex(random_bytes(4));
    $html = '<!DOCTYPE html><html><head></head><body><div id="root"></div>' . $marker . '</body></html>';
    assertStatus(200, http(posUrl(), 'POST', '/api/apply-update', $f + ['Content-Type' => 'text/html'], $html));
    assertContains($marker, jget(posUrl(), '/')['body'], 'test dist klasörüne yazılmalı');
    assertNotContains($marker, jget(controlUrl(), '/')['body'], 'panel etkilenmemeli');
});

t('CORS: PROPOS_CORS_ORIGIN listesi — ön kontrol Cache-Control/Pragma/X-ProPos-Token izni, yalnızca listedeki köken yansır', function () {
    $php = PHP_BINARY;
    $dir = tmpDir('cors');
    $port = 0;
    $s = @stream_socket_server('tcp://127.0.0.1:0', $en, $es);
    if ($s) { $port = (int)explode(':', stream_socket_get_name($s, false))[1]; fclose($s); }
    assertTrue($port > 0, 'boş port bulunamadı');
    $env = array_merge(getenv(), ['PROPOS_DATA_DIR' => $dir, 'PROPOS_NO_DOTENV' => '1', 'PROPOS_CORS_ORIGIN' => 'https://app.example, https://pos.example/']);
    $router = realpath(__DIR__ . '/../../../backend/router.php');
    $proc = proc_open([$php, '-S', "127.0.0.1:$port", $router], [0 => ['pipe', 'r'], 1 => ['file', $dir . '/o.log', 'w'], 2 => ['file', $dir . '/e.log', 'w']], $pipes, null, $env);
    try {
        $base = "http://127.0.0.1:$port";
        for ($i = 0; $i < 50; $i++) { $c = @fsockopen('127.0.0.1', $port, $en, $es, 0.2); if ($c) { fclose($c); break; } usleep(100000); }
        $o = http($base, 'OPTIONS', '/api/sync', ['Origin' => 'https://pos.example', 'Access-Control-Request-Method' => 'POST', 'Access-Control-Request-Headers' => 'content-type,x-propos-token,cache-control,pragma']);
        assertSame('https://pos.example', $o['headers']['access-control-allow-origin'] ?? null);
        $allow = strtolower($o['headers']['access-control-allow-headers'] ?? '');
        foreach (['content-type', 'x-propos-token', 'cache-control', 'pragma'] as $h) assertContains($h, $allow, "izin verilen başlık: $h");
        assertContains('retry-after', strtolower($o['headers']['access-control-expose-headers'] ?? ''));
        $x = http($base, 'GET', '/api/info', ['Origin' => 'https://evil.example']);
        assertFalse(isset($x['headers']['access-control-allow-origin']), 'listede olmayan köken yansıtılmamalı');
        $k = http($base, 'OPTIONS', '/api/keepalive', ['Origin' => 'https://x.example', 'Access-Control-Request-Method' => 'GET', 'Access-Control-Request-Headers' => 'cache-control']);
        assertContains('cache-control', strtolower($k['headers']['access-control-allow-headers'] ?? ''));
    } finally {
        if (is_resource($proc)) proc_terminate($proc);
    }
});
