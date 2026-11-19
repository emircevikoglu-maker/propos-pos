<?php
declare(strict_types=1);

namespace ProPos\Services;

/**
 * Lightweight, zero-dependency ZIP archive builder using standard zlib (gzdeflate).
 */
class ZipBuilder
{
    private array $dataSegments = [];
    private array $centralDir = [];
    private int $offset = 0;

    public function addText(string $entryName, string $content): void
    {
        $this->addBytes($entryName, $content);
    }

    public function addBytes(string $entryName, string $data): void
    {
        $entryName = str_replace('\\', '/', ltrim($entryName, '/\\'));
        $uncompressedSize = strlen($data);
        $crc = crc32($data);
        $compressed = gzdeflate($data, 6);
        $compressedSize = strlen($compressed);

        $localHeader = "\x50\x4b\x03\x04"
            . "\x14\x00" // version needed to extract (2.0)
            . "\x00\x08" // general purpose bit flag (UTF-8)
            . "\x08\x00" // compression method (deflate)
            . "\x00\x00\x21\x00" // mod time & date
            . pack('V', $crc)
            . pack('V', $compressedSize)
            . pack('V', $uncompressedSize)
            . pack('v', strlen($entryName))
            . pack('v', 0) // extra field length
            . $entryName;

        $localSegment = $localHeader . $compressed;
        $this->dataSegments[] = $localSegment;

        $centralRecord = "\x50\x4b\x01\x02"
            . "\x14\x00" // version made by
            . "\x14\x00" // version needed
            . "\x00\x08" // UTF-8 flag
            . "\x08\x00" // deflate
            . "\x00\x00\x21\x00"
            . pack('V', $crc)
            . pack('V', $compressedSize)
            . pack('V', $uncompressedSize)
            . pack('v', strlen($entryName))
            . pack('v', 0) // extra
            . pack('v', 0) // comment
            . pack('v', 0) // disk number
            . pack('v', 0) // internal attrs
            . pack('V', 32) // external attrs
            . pack('V', $this->offset)
            . $entryName;

        $this->centralDir[] = $centralRecord;
        $this->offset += strlen($localSegment);
    }

    public function toBytes(): string
    {
        $dataBlock = implode('', $this->dataSegments);
        $centralBlock = implode('', $this->centralDir);
        $count = count($this->centralDir);

        $endOfCentralDir = "\x50\x4b\x05\x06"
            . "\x00\x00"
            . "\x00\x00"
            . pack('v', $count)
            . pack('v', $count)
            . pack('V', strlen($centralBlock))
            . pack('V', strlen($dataBlock))
            . "\x00\x00";

        return $dataBlock . $centralBlock . $endOfCentralDir;
    }
}
