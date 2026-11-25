<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

/** PROPOS_STORAGE=file (varsayılan) | supabase. Yanlış/eksik yapılandırma sessizce dosyaya DÜŞMEZ: açık hata verir. */
class StorageFactory
{
    private static ?Storage $override = null;
    private static ?Storage $cached = null;

    public static function set(?Storage $s): void
    {
        self::$override = $s;
        self::$cached = null;
    }

    public static function make(): Storage
    {
        if (self::$override !== null) {
            return self::$override;
        }
        if (self::$cached !== null) {
            return self::$cached;
        }
        $kind = strtolower(trim((string)(getenv('PROPOS_STORAGE') ?: 'file')));
        if ($kind === 'supabase') {
            $remote = new SupabaseStorage();
            // Yerel yazma-geçişli önbellek (varsayılan açık): PROPOS_CACHE=0 kapatır, PROPOS_CACHE_TTL saniye (varsayılan 900).
            if (getenv('PROPOS_CACHE') === '0') {
                return self::$cached = $remote;
            }
            $ttl = is_numeric(getenv('PROPOS_CACHE_TTL')) ? (int)getenv('PROPOS_CACHE_TTL') : 900;
            return self::$cached = new CachedStorage($remote, new FileStorage(PROPOS_DATA_DIR . DIRECTORY_SEPARATOR . 'cache'), $ttl);
        }
        if ($kind !== 'file') {
            throw new \RuntimeException("Bilinmeyen PROPOS_STORAGE: $kind (file | supabase)");
        }
        return self::$cached = new FileStorage();
    }
}
