<?php
declare(strict_types=1);

namespace ProPos;

/**
 * Statik dosyayı yalnızca verilen derleme klasöründen servis eder (realpath ile dışarı çıkış engellenir).
 * Bilinmeyen yol tek sayfa uygulamasının index.html'ine düşer.
 */
function serveStatic(string $distDir, string $pathOnly, array $extraHeaders = []): void
{
    $requested = ltrim(rawurldecode($pathOnly), '/');
    $distReal = realpath($distDir);
    $full = ($requested === '' || $distReal === false || strpos($requested, "\0") !== false)
        ? false : realpath($distReal . DIRECTORY_SEPARATOR . $requested);
    if ($full === false || strpos($full, $distReal . DIRECTORY_SEPARATOR) !== 0 || !is_file($full)) {
        $full = $distReal !== false ? $distReal . DIRECTORY_SEPARATOR . 'index.html' : false;
    }
    if ($full === false || !is_file($full)) {
        http_response_code(404);
        echo 'ProPos build bulunamadi. "npm run build" calistirin.';
        exit;
    }
    $ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
    $mime = [
        'html' => 'text/html; charset=utf-8', 'json' => 'application/json; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8',
        'svg' => 'image/svg+xml', 'png' => 'image/png', 'ico' => 'image/x-icon',
    ];
    if (!isset($mime[$ext])) {
        http_response_code(404);
        exit;
    }
    sendApiHeaders();
    foreach ($extraHeaders as $h) {
        header($h);
    }
    header('Content-Type: ' . $mime[$ext]);
    readfile($full);
    exit;
}
