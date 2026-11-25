<?php
declare(strict_types=1);

namespace ProPos;

/**
 * Kök dizindeki .env dosyasını okur (KEY=VALUE, # yorum, tırnaklı değer). Var olan ortam değişkenini EZMEZ
 * (sunucu/test ortamı önceliklidir). Değerler asla günlüğe/çıktıya yazılmaz.
 */
function loadDotEnv(string $file): void
{
    if (!is_file($file) || !is_readable($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);
        if (!preg_match('/^[A-Z][A-Z0-9_]*$/', $k) || getenv($k) !== false) {
            continue;
        }
        if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) {
            $v = substr($v, 1, -1);
        }
        putenv("$k=$v");
        $_ENV[$k] = $v;
    }
}
