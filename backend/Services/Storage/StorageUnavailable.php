<?php
declare(strict_types=1);

namespace ProPos\Services\Storage;

/** Depo geçici olarak erişilemiyor (ağ/5xx). "Kayıt yok" ile KARIŞTIRILMAMALI: veri kaybını önlemek için yazma durdurulur, API 503 döner. */
class StorageUnavailable extends \RuntimeException
{
}
