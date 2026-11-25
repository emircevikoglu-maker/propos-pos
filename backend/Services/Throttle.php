<?php
declare(strict_types=1);

namespace ProPos\Services;

/**
 * Dosya tabanlı token bucket (istek hızı) ve hatalı deneme sayacı.
 * VDS'te APCu/Redis'e geçilecekse yalnızca bu sınıf değişir.
 */
class Throttle
{
    private string $dir;

    public function __construct(?string $dir = null)
    {
        $this->dir = $dir ?? PROPOS_RATE_DIR;
        if (!is_dir($this->dir)) {
            @mkdir($this->dir, 0750, true);
        }
    }

    /** "kapasite:saniyedeki_dolum" biçimindeki ortam değişkenini okur. */
    public static function bucketConfig(string $env, int $capacity, float $refill): array
    {
        $raw = getenv($env);
        if ($raw !== false && preg_match('/^(\d+):(\d+(?:\.\d+)?)$/', (string)$raw, $m)) {
            return [max(1, (int)$m[1]), max(0.001, (float)$m[2])];
        }
        return [$capacity, $refill];
    }

    private function path(string $key): string
    {
        return $this->dir . DIRECTORY_SEPARATOR . substr(hash('sha256', $key), 0, 32) . '.json';
    }

    /** @param callable(array):array $fn */
    private function mutate(string $key, callable $fn): array
    {
        $fh = @fopen($this->path($key), 'c+');
        if ($fh === false) {
            return $fn([]); // depolama yoksa sınırlamayı devre dışı bırakmak yerine bellek içi hesapla
        }
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $state = json_decode($raw === false ? '' : $raw, true);
        $next = $fn(is_array($state) ? $state : []);
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, (string)json_encode($next['state']));
        fflush($fh);
        flock($fh, LOCK_UN);
        fclose($fh);
        if (random_int(1, 200) === 1) {
            $this->gc();
        }
        return $next;
    }

    /**
     * Token bucket. Kova boşalınca $penalty saniye boyunca tamamen kapanır
     * (istemci "30 sn bekleyin" uyarısı gösterir).
     *
     * @return array{ok:bool, retryAfter:int, remaining:int}
     */
    public function hit(string $key, int $capacity, float $refillPerSec, int $penalty = 30, ?float $now = null): array
    {
        $now = $now ?? microtime(true);
        $out = $this->mutate('rl|' . $key, static function (array $s) use ($capacity, $refillPerSec, $penalty, $now): array {
            $tokens = isset($s['t']) ? (float)$s['t'] : (float)$capacity;
            $last = isset($s['l']) ? (float)$s['l'] : $now;
            $blocked = isset($s['b']) ? (float)$s['b'] : 0.0;
            if ($blocked > $now) {
                return ['state' => $s, 'ok' => false, 'retryAfter' => (int)ceil($blocked - $now), 'remaining' => 0];
            }
            $tokens = min((float)$capacity, $tokens + max(0.0, $now - $last) * $refillPerSec);
            if ($tokens < 1.0) {
                return ['state' => ['t' => $tokens, 'l' => $now, 'b' => $now + $penalty], 'ok' => false, 'retryAfter' => $penalty, 'remaining' => 0];
            }
            $tokens -= 1.0;
            return ['state' => ['t' => $tokens, 'l' => $now, 'b' => 0], 'ok' => true, 'retryAfter' => 0, 'remaining' => (int)floor($tokens)];
        });
        return ['ok' => $out['ok'], 'retryAfter' => $out['retryAfter'], 'remaining' => $out['remaining']];
    }

    /** Pencere içindeki hatalı deneme sayısı. */
    public function failCount(string $key, int $window, ?int $now = null): int
    {
        $now = $now ?? time();
        $f = $this->path('fail|' . $key);
        $d = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
        if (!is_array($d) || (int)($d['since'] ?? 0) < $now - $window) {
            return 0;
        }
        return (int)($d['n'] ?? 0);
    }

    /** Kalan kilit süresi (sn). */
    public function failRetryAfter(string $key, int $window, ?int $now = null): int
    {
        $now = $now ?? time();
        $f = $this->path('fail|' . $key);
        $d = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
        return is_array($d) ? max(1, (int)($d['since'] ?? $now) + $window - $now) : $window;
    }

    public function registerFail(string $key, int $window, ?int $now = null): int
    {
        $now = $now ?? time();
        $out = $this->mutate('fail|' . $key, static function (array $s) use ($window, $now): array {
            if ((int)($s['since'] ?? 0) < $now - $window) {
                $s = ['n' => 0, 'since' => $now];
            }
            $s['n'] = (int)($s['n'] ?? 0) + 1;
            return ['state' => $s, 'n' => $s['n']];
        });
        return (int)$out['n'];
    }

    public function clearFails(string $key): void
    {
        @unlink($this->path('fail|' . $key));
    }

    private function gc(): void
    {
        foreach (glob($this->dir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $f) {
            if (@filemtime($f) < time() - 86400) {
                @unlink($f);
            }
        }
    }
}
