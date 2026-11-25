<?php
declare(strict_types=1);

/*
 * ProPos PHP test çatısı — bağımlılıksız (composer/PHPUnit gerekmez).
 * Testler t('ad', fn) ile kaydedilir; assert* başarısızlıkta AssertionFailed fırlatır.
 * HTTP istemcisi ham soket kullanır: yol normalleştirilmeden gönderilir (dizin aşımı testleri için şart).
 */

final class AssertionFailed extends \Exception {}
final class Skipped extends \Exception {}

final class T
{
    /** @var array<int, array{suite:string,name:string,fn:callable}> */
    public static array $tests = [];
    public static string $suite = '';
    public static array $opt = [];
    /** Suite'ler arası paylaşılan durum (token, anahtar…) */
    public static array $ctx = [];
}

function suite(string $name): void { T::$suite = $name; }
function t(string $name, callable $fn): void { T::$tests[] = ['suite' => T::$suite, 'name' => $name, 'fn' => $fn]; }
function skip(string $why): void { throw new Skipped($why); }
function opt(string $k, ?string $default = null): ?string { return T::$opt[$k] ?? $default; }

function fail(string $msg): void { throw new AssertionFailed($msg); }
function show($v): string
{
    $s = is_string($v) ? $v : json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $s = (string)$s;
    return strlen($s) > 300 ? substr($s, 0, 300) . '…' : $s;
}
function assertTrue($cond, string $msg = 'koşul yanlış'): void { if ($cond !== true) fail($msg); }
function assertFalse($cond, string $msg = 'koşul doğru'): void { if ($cond !== false) fail($msg); }
function assertSame($expected, $actual, string $msg = ''): void
{
    if ($expected !== $actual) fail(($msg ? $msg . ': ' : '') . 'beklenen ' . show($expected) . ', gelen ' . show($actual));
}
function assertNotSame($a, $b, string $msg = ''): void { if ($a === $b) fail(($msg ? $msg . ': ' : '') . 'değerler eşit olmamalı: ' . show($a)); }
function assertContains(string $needle, string $hay, string $msg = ''): void
{
    if (strpos($hay, $needle) === false) fail(($msg ? $msg . ': ' : '') . show($needle) . ' bulunamadı; içerik: ' . show($hay));
}
function assertNotContains(string $needle, string $hay, string $msg = ''): void
{
    if (strpos($hay, $needle) !== false) fail(($msg ? $msg . ': ' : '') . show($needle) . ' içerikte OLMAMALI');
}
function assertMatches(string $re, string $s, string $msg = ''): void { if (!preg_match($re, $s)) fail(($msg ? $msg . ': ' : '') . show($s) . " ≠ $re"); }
function assertStatus(int $expected, array $res, string $msg = ''): void
{
    if ($res['status'] !== $expected) fail(($msg ? $msg . ': ' : '') . "HTTP $expected beklendi, {$res['status']} geldi; gövde: " . show($res['body']));
}
function assertStatusIn(array $expected, array $res, string $msg = ''): void
{
    if (!in_array($res['status'], $expected, true)) fail(($msg ? $msg . ': ' : '') . 'HTTP ' . implode('/', $expected) . " beklendi, {$res['status']} geldi; gövde: " . show($res['body']));
}
/** Yanıtta sızıntı yok: PHP hata metni, dosya yolu, sır alanları. */
function assertNoLeak(array $res, string $msg = ''): void
{
    foreach (['founderHash', '"secret"', 'adminPinHash', '<?php', 'Stack trace', 'PROPOS_ROOT_DIR'] as $bad) {
        if (stripos($res['body'], $bad) !== false) fail(($msg ? $msg . ': ' : '') . "yanıtta sızıntı: $bad");
    }
    // PHP hata çıktısı satır başında "Warning: ..." / "<b>Fatal error</b>:" biçimindedir (bundle metni yanlış alarm vermesin).
    if (preg_match('/(^|
)(<br \/>\s*)?(<b>)?(Warning|Notice|Deprecated|Fatal error|Parse error)(<\/b>)?:\s/', $res['body'])) {
        fail(($msg ? $msg . ': ' : '') . 'yanıtta PHP hata çıktısı var');
    }
    if (preg_match('#[A-Za-z]:\\\\[^"\s]*\\\\(backend|data)#', $res['body'])) fail(($msg ? $msg . ': ' : '') . 'yanıtta sunucu dosya yolu var');
}

// ---- HTTP --------------------------------------------------------------------

/**
 * Ham HTTP/1.1 isteği. $path olduğu gibi gönderilir (normalleştirme yok).
 * @return array{status:int, headers:array<string,string>, body:string, json:?array, raw:string}
 */
function http(string $base, string $method, string $path, array $headers = [], ?string $body = null, int $timeout = 15): array
{
    $u = parse_url($base);
    $host = $u['host'] ?? '127.0.0.1';
    $port = (int)($u['port'] ?? 80);
    $fp = @fsockopen($host, $port, $errno, $errstr, 5);
    if (!$fp) {
        fail("Sunucuya bağlanılamadı ($base): $errstr");
    }
    stream_set_timeout($fp, $timeout);
    $lines = ["$method $path HTTP/1.1", "Host: $host:$port", 'Connection: close', 'User-Agent: ProPosTest/1.0'];
    $hasCt = false;
    foreach ($headers as $k => $v) {
        $lines[] = is_int($k) ? $v : "$k: $v";
        if (is_string($k) && strtolower($k) === 'content-type') $hasCt = true;
    }
    if ($body !== null) {
        if (!$hasCt) $lines[] = 'Content-Type: application/json';
        $lines[] = 'Content-Length: ' . strlen($body);
    }
    fwrite($fp, implode("\r\n", $lines) . "\r\n\r\n" . ($body ?? ''));
    $raw = '';
    while (!feof($fp)) {
        $chunk = fread($fp, 65536);
        if ($chunk === false || ($chunk === '' && stream_get_meta_data($fp)['timed_out'])) break;
        $raw .= $chunk;
    }
    fclose($fp);
    $sep = strpos($raw, "\r\n\r\n");
    $head = $sep === false ? $raw : substr($raw, 0, $sep);
    $resBody = $sep === false ? '' : substr($raw, $sep + 4);
    $hl = explode("\r\n", $head);
    $status = preg_match('#^HTTP/\d\.\d (\d{3})#', $hl[0] ?? '', $m) ? (int)$m[1] : 0;
    $hdrs = [];
    foreach (array_slice($hl, 1) as $line) {
        $p = strpos($line, ':');
        if ($p !== false) $hdrs[strtolower(trim(substr($line, 0, $p)))] = trim(substr($line, $p + 1));
    }
    if (isset($hdrs['transfer-encoding']) && stripos($hdrs['transfer-encoding'], 'chunked') !== false) {
        $decoded = '';
        while ($resBody !== '') {
            $nl = strpos($resBody, "\r\n");
            if ($nl === false) break;
            $len = hexdec(trim(substr($resBody, 0, $nl)));
            if ($len === 0) break;
            $decoded .= substr($resBody, $nl + 2, (int)$len);
            $resBody = substr($resBody, $nl + 2 + (int)$len + 2);
        }
        $resBody = $decoded;
    }
    $json = json_decode($resBody, true);
    return ['status' => $status, 'headers' => $hdrs, 'body' => $resBody, 'json' => is_array($json) ? $json : null, 'raw' => $head];
}

function jpost(string $base, string $path, $data, array $headers = []): array
{
    return http($base, 'POST', $path, $headers, is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_UNICODE));
}
function jget(string $base, string $path, array $headers = []): array { return http($base, 'GET', $path, $headers); }
function tok(?string $token): array { return $token ? ['X-ProPos-Token' => $token] : []; }

// ---- Senaryo yardımcıları ------------------------------------------------------

function posUrl(): string { return opt('pos') ?? skip('--pos verilmedi'); }
function controlUrl(): string { return opt('control') ?? skip('--control verilmedi'); }

function founderToken(): string
{
    if (!isset(T::$ctx['founder'])) {
        $key = opt('founder-key') ?? skip('--founder-key verilmedi');
        $r = jpost(controlUrl(), '/api/login', ['key' => $key]);
        assertStatus(200, $r, 'kurucu girişi');
        T::$ctx['founder'] = $r['json']['token'];
    }
    return T::$ctx['founder'];
}

/** Kontrol panelinden işletme oluşturur, anahtarını döndürür. */
function createTenant(string $id, string $pin = '4826', array $extra = []): string
{
    $r = jpost(controlUrl(), '/api/tenants/save', array_merge(['tenantId' => $id, 'businessName' => "Test $id", 'initialPin' => $pin, 'planType' => 'yearly', 'status' => 'active', 'expiresAt' => 'unlimited'], $extra), tok(founderToken()));
    assertStatus(200, $r, "işletme oluştur $id");
    return (string)$r['json']['tenant']['syncKey'];
}

function tenantToken(string $id, string $key): string
{
    $r = jpost(posUrl(), '/api/login', ['tenantId' => $id, 'key' => $key]);
    assertStatus(200, $r, "işletme girişi $id");
    assertSame('tenant', $r['json']['role'] ?? null, 'rol');
    return (string)$r['json']['token'];
}

function minimalState(array $extra = []): array
{
    return array_merge(['version' => '1.0', 'tables' => [['id' => 't1', 'name' => 'Masa 1', 'items' => []]], 'products' => [['id' => 'p1', 'name' => 'Çay', 'price' => 25]], 'sales' => []], $extra);
}

/** Belirteç gövdesini (imzayı koruyarak) değiştirir: imza doğrulamasını sınamak için. */
function tamperToken(string $token, callable $mutate): string
{
    [$body, $sig] = explode('.', $token) + [1 => ''];
    $payload = json_decode((string)base64_decode(strtr($body, '-_', '+/')), true) ?: [];
    $payload = $mutate($payload);
    $newBody = rtrim(strtr(base64_encode((string)json_encode($payload)), '+/', '-_'), '=');
    return $newBody . '.' . $sig;
}

function tmpDir(string $prefix): string
{
    $d = rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR . $prefix . '_' . bin2hex(random_bytes(4));
    @mkdir($d, 0700, true);
    return $d;
}

/** Minimal ZIP okuyucu (ext-zip gerekmeden): ad → içerik; CRC doğrulanır. */
function readZip(string $bytes): array
{
    $eocd = strrpos($bytes, "PK\x05\x06");
    if ($eocd === false) fail('ZIP: EOCD yok');
    $e = unpack('vdisk/vcdisk/ventries/vtotal/Vsize/Voffset', substr($bytes, $eocd + 4, 16));
    $pos = $e['offset'];
    $files = [];
    for ($i = 0; $i < $e['total']; $i++) {
        if (substr($bytes, $pos, 4) !== "PK\x01\x02") fail('ZIP: merkezi dizin bozuk');
        $c = unpack('vver/vneed/vflag/vmethod/vtime/vdate/Vcrc/Vcsize/Vusize/vnlen/velen/vclen/vdisk/vint/Vext/Vloff', substr($bytes, $pos + 4, 42));
        $name = substr($bytes, $pos + 46, $c['nlen']);
        $l = unpack('vnlen/velen', substr($bytes, $c['loff'] + 26, 4));
        $data = substr($bytes, $c['loff'] + 30 + $l['nlen'] + $l['elen'], $c['csize']);
        if ($c['method'] === 8) $data = (string)gzinflate($data);
        if ((crc32($data) & 0xFFFFFFFF) !== $c['crc']) fail("ZIP: CRC uyuşmuyor ($name)");
        $files[$name] = $data;
        $pos += 46 + $c['nlen'] + $c['elen'] + $c['clen'];
    }
    return $files;
}
