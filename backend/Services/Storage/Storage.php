<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

/**
 * Kalıcı depo sözleşmesi. İş mantığı (PIN, lisans, doğrulama) TenantService'te kalır; burası yalnızca okuyup yazar.
 * Uygulamalar: FileStorage (geliştirme/test/tek sunucu), SupabaseStorage (PostgREST).
 */
interface Storage
{
    public function name(): string;

    /** Ham JSON (nesne) ya da kayıt yoksa null. */
    public function readTenant(string $tenantId): ?string;

    public function writeTenant(string $tenantId, string $json, int $rev, string $updatedBy): bool;

    /** Veriyi siler ve ham JSON'unu döndürür (yedeğe yazmak çağırana ait). */
    public function deleteTenant(string $tenantId): ?string;

    /** @param string[] $ids @return array<string, array{bytes:int, rev:int, updatedBy:string}> */
    public function stats(array $ids): array;

    public function readRegistry(): ?string;

    public function writeRegistry(string $json): bool;

    /** Önbellek geçerlilik anahtarı (dosyada mtime). Değişince kayıt yeniden okunur. */
    public function registryVersion(): string;

    /** Depo ayakta mı? İçerik/sürüm bilgisi vermez. */
    public function ping(): bool;
}
