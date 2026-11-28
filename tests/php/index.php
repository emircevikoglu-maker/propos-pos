<?php
declare(strict_types=1);

/*
 * ProPos PHP test giriş noktası.
 *
 *   php tests/php/index.php --suite=unit|api|control|security|abuse|all
 *        [--pos=http://127.0.0.1:8601] [--control=http://127.0.0.1:8602]
 *        [--founder-key=...] [--filter=metin] [--format=json|text] [--list]
 *
 * unit: süreç içi (PROPOS_DATA_DIR verilmezse geçici klasör açılır). Diğerleri çalışan sunucuya HTTP ile gider.
 * Çıkış kodu: 0 = hepsi geçti, 1 = başarısız var, 2 = kullanım hatası.
 * Genelde doğrudan değil tests/run.py üzerinden çağrılır.
 */

ini_set('display_errors', 'stderr');
error_reporting(E_ALL);

$opts = [];
foreach (array_slice($argv, 1) as $arg) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', $arg, $m)) {
        $opts[$m[1]] = $m[2] ?? '1';
    }
}
$suites = ['unit', 'api', 'control', 'security', 'abuse', 'supabase'];
$want = ($opts['suite'] ?? 'all') === 'all' ? ['unit', 'api', 'control', 'security'] : explode(',', (string)$opts['suite']);
foreach ($want as $w) {
    if (!in_array($w, $suites, true)) {
        fwrite(STDERR, "Bilinmeyen suite: $w (" . implode(', ', $suites) . ")\n");
        exit(2);
    }
}

require_once __DIR__ . '/lib.php';
T::$opt = $opts;

if (in_array('unit', $want, true) || in_array('supabase', $want, true)) {
    if (!getenv('PROPOS_DATA_DIR')) {
        putenv('PROPOS_DATA_DIR=' . tmpDir('propos_unit'));
    }
    if (!getenv('PROPOS_DIST_DIR')) {
        putenv('PROPOS_DIST_DIR=' . tmpDir('propos_unit_dist'));
    }
    putenv('PROPOS_LOGIN_DELAY_MS=0');
    if (in_array('unit', $want, true)) {
        putenv('PROPOS_NO_DOTENV=1');
        putenv('PROPOS_STORAGE=file');
    }
    require_once dirname(__DIR__, 2) . '/backend/bootstrap.php';
    // Paket üretici bootstrap'ta değil (yalnızca panel ister).
    require_once dirname(__DIR__, 2) . '/backend/Services/ZipBuilder.php';
    require_once dirname(__DIR__, 2) . '/backend/Services/PackageService.php';
}

foreach ($want as $w) {
    suite($w);
    require __DIR__ . "/suites/$w.php";
    if (is_file(__DIR__ . "/suites/$w.extra.php")) {
        require __DIR__ . "/suites/$w.extra.php";
    }
}

$filter = $opts['filter'] ?? null;
$results = [];
$t0 = microtime(true);
foreach (T::$tests as $test) {
    $full = $test['suite'] . ' › ' . $test['name'];
    if ($filter !== null && stripos($full, $filter) === false) continue;
    if (isset($opts['list'])) { echo $full, "\n"; continue; }
    $start = microtime(true);
    $status = 'passed';
    $message = '';
    try {
        ($test['fn'])();
    } catch (Skipped $e) {
        $status = 'skipped';
        $message = $e->getMessage();
    } catch (AssertionFailed $e) {
        $status = 'failed';
        $message = $e->getMessage();
    } catch (\Throwable $e) {
        $status = 'failed';
        $message = get_class($e) . ': ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine();
    }
    $results[] = ['suite' => $test['suite'], 'name' => $test['name'], 'status' => $status, 'ms' => (int)round((microtime(true) - $start) * 1000), 'message' => $message];
}
if (isset($opts['list'])) exit(0);

$count = static fn(string $s): int => count(array_filter($results, static fn($r) => $r['status'] === $s));
$summary = ['passed' => $count('passed'), 'failed' => $count('failed'), 'skipped' => $count('skipped'), 'total' => count($results), 'ms' => (int)round((microtime(true) - $t0) * 1000)];

if (($opts['format'] ?? 'text') === 'json') {
    echo json_encode(['summary' => $summary, 'tests' => $results], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), "\n";
} else {
    foreach ($results as $r) {
        $mark = ['passed' => 'OK  ', 'failed' => 'FAIL', 'skipped' => 'SKIP'][$r['status']];
        echo "$mark {$r['suite']} › {$r['name']}" . ($r['message'] !== '' ? "\n      {$r['message']}" : '') . "\n";
    }
    echo "\n{$summary['passed']} geçti, {$summary['failed']} başarısız, {$summary['skipped']} atlandı ({$summary['ms']} ms)\n";
}
exit($summary['failed'] > 0 ? 1 : 0);
