#!/usr/bin/env python3
"""PWA ikonlarını bağımlılıksız üretir (saf Python: zlib+struct). Çıktı: src/pwa/*.png
   python tools/make_icons.py
Tasarım: koyu sıcak zemin + amber yuvarlak kare + "P" harfi (geometrik). Maskable sürümde güvenli alan için içerik %80'e küçülür."""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "pwa"
BG = (16, 14, 12)
AMBER = (245, 165, 36)
INK = (29, 18, 3)
SS = 3  # supersampling (kenar yumuşatma)


def inside_round_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def inside_p(x, y, s):
    """Geometrik P: sol dikey gövde + sağ yarım daire karın (birim kare 0..1 içinde)."""
    u, v = x / s, y / s
    stem = 0.33 <= u <= 0.455 and 0.24 <= v <= 0.76
    # karın: dış yarım daire (merkez (0.455,0.395), r=0.155) iç boşluk r=0.07
    cx, cy = 0.455, 0.395
    d2 = (u - cx) ** 2 + (v - cy) ** 2
    bowl = u >= cx and 0.07 ** 2 <= d2 <= 0.155 ** 2
    bar_top = 0.455 <= u <= 0.455 and False
    top = 0.455 <= u <= 0.455 + 0.0 and False
    top_bar = 0.33 <= u <= 0.455 and 0.24 <= v <= 0.31
    mid_bar = 0.33 <= u <= 0.455 and 0.485 <= v <= 0.55
    return stem or bowl or top_bar or mid_bar


def render(size, scale_content, rounded):
    rows = []
    n = size * SS
    pad = (1 - scale_content) / 2 * size
    for py in range(size):
        row = bytearray()
        for px in range(size):
            acc = [0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    x = px + (sx + 0.5) / SS
                    y = py + (sy + 0.5) / SS
                    col = BG
                    # amber yuvarlak kare (maskable'da tam kare zemin amber)
                    if rounded:
                        if inside_round_rect(x, y, pad, pad, size - pad, size - pad, size * 0.22 * scale_content):
                            col = AMBER
                            if inside_p(x - pad, y - pad, size * scale_content):
                                col = INK
                    else:
                        col = AMBER
                        if inside_p(x - pad, y - pad, size * scale_content):
                            col = INK
                    acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]
            k = SS * SS
            row += bytes((acc[0] // k, acc[1] // k, acc[2] // k))
        rows.append(b"\x00" + bytes(row))
    return b"".join(rows)


def png(size, raw):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [("icon-192.png", 192, 1.0, True), ("icon-512.png", 512, 1.0, True),
            ("icon-maskable-512.png", 512, 0.78, False), ("apple-touch-icon.png", 180, 0.9, True)]
    for name, size, scale, rounded in jobs:
        (OUT / name).write_bytes(png(size, render(size, scale, rounded)))
        print(name, size)


if __name__ == "__main__":
    main()
