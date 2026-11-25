<?php
declare(strict_types=1);

namespace ProPos\Services;

use ProPos\Services\Storage\StorageFactory;

/**
 * Supabase Realtime SİNYALİ: istemciler her saniye yoklamak yerine yalnızca "rev değişti" bildirimini dinler,
 * veriyi yine PHP'den (yetkili) çeker. Kanal içeriği yalnızca {rev, by}'dir — veri taşımaz.
 * Kanal adı tahmin edilemez: propos-<işletme>-<HMAC(sunucu sırrı)>; yalnızca kimliği doğrulanmış cihaza verilir.
 * Yayın sunucu tarafından secret anahtarla yapılır; tarayıcıya yalnızca publishable (anon) anahtar gider.
 */
class Realtime
{
    public static function enabled(): bool
    {
        $flag = getenv('PROPOS_REALTIME');
        if ($flag === '0') {
            return false;
        }
        $hasKeys = (string)getenv('SUPABASE_URL') !== '' && (string)getenv('SUPABASE_PUBLISHABLE_KEY') !== '' && (string)getenv('SUPABASE_SECRET_KEY') !== '';
        return $hasKeys && ($flag === '1' || StorageFactory::make()->name() === 'supabase');
    }

    public static function topic(string $tenantId, AuthService $auth): string
    {
        $id = strtolower(preg_replace('/[^A-Za-z0-9-]/', '-', $tenantId) ?? 'x');
        return 'propos-' . $id . '-' . substr($auth->derive('realtime|' . $tenantId), 0, 20);
    }

    /** @return array{url:string,key:string,topic:string}|null */
    public static function clientConfig(string $tenantId, AuthService $auth): ?array
    {
        if (!self::enabled()) {
            return null;
        }
        $base = rtrim((string)getenv('SUPABASE_URL'), '/');
        return [
            'url' => preg_replace('#^https://#', 'wss://', $base) . '/realtime/v1/websocket',
            'key' => (string)getenv('SUPABASE_PUBLISHABLE_KEY'),
            'topic' => self::topic($tenantId, $auth),
        ];
    }

    /** Sinyali yayınlar; hata istek akışını asla bozmaz. */
    public static function notify(string $tenantId, int $rev, string $by, AuthService $auth): bool
    {
        if (!self::enabled()) {
            return false;
        }
        $body = json_encode(['messages' => [['topic' => self::topic($tenantId, $auth), 'event' => 'rev', 'payload' => ['rev' => $rev, 'by' => $by], 'private' => false]]]);
        $ch = curl_init(rtrim((string)getenv('SUPABASE_URL'), '/') . '/realtime/v1/api/broadcast');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['apikey: ' . (string)getenv('SUPABASE_SECRET_KEY'), 'Content-Type: application/json'],
            CURLOPT_TIMEOUT_MS => 1500,
            CURLOPT_CONNECTTIMEOUT_MS => 1000,
        ]);
        curl_exec($ch);
        $ok = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE) < 300 && curl_errno($ch) === 0;
        curl_close($ch);
        return $ok;
    }
}
