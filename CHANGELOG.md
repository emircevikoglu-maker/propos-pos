# Değişiklik günlüğü

Biçim: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/). Sürüm numarası `package.json` ile birlikte artar.
Başlıklar: Eklendi · Değişti · Düzeltildi · Güvenlik · Kaldırıldı.

## [3.2.0] — 2026-11-25
### Eklendi
- Yeni tasarım sistemi uygulamaya giydirildi (`src/design/`: tokenlar, bileşen CSS'i, `skin.css`, tek ikon seti, hareket/konfeti modülü). Mevcut Tailwind ekranları `skin.css` ile yeni tokenlara eşlenir; işletme tema rengi (`--brand-primary`) çalışmaya devam eder.
- Masa kartı: büyük tutar + zaman halkası (90 dk = tam tur, 60 dk+ uyarı rengi), 60 dk üstü "1 sa 20 dk" biçimi.
- Onay penceresi yerine 5 sn "Geri al": masa kapatma (satış, stok ve masa geri yüklenir) ve adisyondan ürün çıkarma.
- Kutlamalar: günün ilk satışı, günlük hedef, rekor (≥7 gün geçmişle), en büyük adisyon, 25'in katları seri, Z raporu kapanış ekranı. Geri alınan satış kutlanmaz; yoğun saatte (10 dk'da 8+ ödeme) sadeleşir; azaltılmış hareket desteği; ses varsayılan kapalı.
- Yönetim → "Kutlamalar & Hareket": açık/kapalı, yoğun saat sadeleştirme, ses, hareket, günlük ciro hedefi (cihaza özel). Üst çubukta hedef ilerlemesi.
- Üst çubuk sadeleşti: işletme kodu, cihaz bağlama, güncelleme kontrolü, bayi paneli, ana işletmeye dönüş "Sistem" menüsüne taşındı (hiçbiri kaldırılmadı); dönem filtresi yalnızca rapor ekranlarında.
- 15 kutlama testi; kaynak taramasına `motion.js` kaçış kuralı.
### Değişti
- Arka plandaki bulanık ışık katmanları ve `backdrop-filter` kaldırıldı (zayıf tabletlerde pahalıydı).
- Birincil renk düz (gradyan yok), min. yazı 11 px, dokunmatikte düğmeler ≥ 40 px.
### Düzeltildi
- Üst üste gelen bildirimler eskisinin zamanlayıcısıyla erken kapanıyordu.
- `detectLanIp()` her yanıtta DNS sorgusu yapıyordu (istek başına önbellek).
- Güvenlik testi, derlenmiş paket metnindeki "Warning:" yazısını PHP hatası sanıyordu.
### Altyapı
- `git init`, `.gitignore` (`.env`, `data/`, `dist/`, `_data_backup/`, `.chat-backup.md`), `.env.example`, `.gitattributes`.

## [3.1.1] — 2026-11-24
### Düzeltildi
- "React tarafı API'yi patlatıyor": her state değişikliği (tuş vuruşu dahil) tam durumu anında POST ediyordu → gönderim kuyruğu (600 ms debounce, en geç 3 sn, sayfa kapanırken/gizlenirken hemen gönderim).
- Geçersiz kayıtlı anahtar (veri sıfırlama / anahtar yenileme sonrası) her 2 sn'de `/api/login` deniyor ve IP'yi 10 dk kilitliyordu → reddedilen anahtar bir daha denenmez ve silinir; giriş 429'u yoklamayı da durdurur.
- Gizli sekmede de 2 sn'de bir yoklama → görünürde 3 sn, gizlide 30 sn, görünür olunca hemen.
- POS cihazlarının hatalı girişleri kurucuyu kontrol panelinden kilitliyordu → POS ve panel girişleri ayrı sayaçta.
- Veri sıfırlanınca PIN olmadığı için yönetim ekranlarına girilemiyordu → PIN penceresinde ilk PIN'i iki kez yazarak belirleme.
- Masa taşıma/birleştirme aynı ürünün farklı çeşitlerini tek satırda birleştiriyordu (yanlış fiyat) ve mevcut satırı yerinde değiştiriyordu (state mutasyonu).
- Kısmi ödeme alınan masada Z raporu "Brüt" tutarı kısmi ödeme kadar şişiyordu.
- İndirim ara toplamı aşabiliyordu.
- Cari aktarımda çeşit bilgisi kayboluyordu (artık "Caffè Latte (Büyük · Yulaf sütü)").
### Eklendi
- `npm start` (`tools/dev.py start`): gerekirse install + build + ilk kurulum, anahtarları yazar, POS (8586) + panel (8590) birlikte; günlükler `data/logs/`.
- `npm run reset`: `data/` → `_yedek/data-<zaman>/` (silmez), temiz kurulum, `--pin`, `--yes`.
- `npm run keys`: kurucu anahtarı (dosya duruyorsa) + işletme bağlantı anahtarları.
- Kayıt dosyaları: `TODO.md` (planlar), `CHANGELOG.md`, `docs/NOTES.md` (kararlar, teşhisler, fikir değerlendirmeleri).
- 9 gerileme testi (giriş fırtınası, debounce, ilk PIN); toplam 204 test.
### Değişti
- Registry dosyası istek içinde önbelleğe alınır (bir yoklamada 3-4 okuma → 1).

## [3.1.0] — 2026-11-24
### Eklendi
- Test altyapısı: `python tests/run.py` → lint + PHP (unit, api, control, security, abuse) + React (vitest + Testing Library) + derleme kontrolleri. Normal ve saldırgan testler; mutasyonla doğrulandı.
- Ayrı kontrol paneli: `backend/control.php` + `dist-admin/`; işletme ekle/düzenle, lisans uzat/askıya al, anahtar göster/kopyala/yenile, kurulum paketi, denetim kaydı. POS paketine ve müşteri ZIP'ine girmez.
- Giriş modeli: cihaz eşleştirme ekranı, sunucuda hash'li yönetici PIN'i (`/api/pin/*`, 6 hatada 5 dk kilit), lisansın sunucuda kontrolü (403 `LICENSE`), anahtar yenilenince eski oturumların anında düşmesi.
- Hız sınırı: token bucket (yoklama / eylem / IP kovaları), `429` + `Retry-After`, istemcide "30 sn bekleyin" ve son durumu yeniden gönderme.
- İçecek çeşitleri: ürün başına seçenek grupları, hazır gruplar, POS'ta seçim penceresi, adisyonda çeşit özeti.
### Değişti
- Ürün adı her yerde ProPos; işletme adı veriden dinamik; "PICKY'S/PICKYS-MASTER" sabitleri kaldırıldı.
### Güvenlik
- Dizi `tenantId` ile "ARRAY" işletmesi oluşturulabiliyordu; `?tenantId[]=` 500 üretiyordu; hata çıktısı istemciye gidiyordu (artık `PROPOS_DEBUG` yoksa kapalı).
- Derlemede `</script>` kaçışı çalışmıyordu.
- Kilitli müşteri paketinde `?tenant=` ile başka işletmeye geçilebiliyordu.
- Yönetici PIN'i düz metin olarak senkronla her cihaza gidiyordu.

## [3.0.0] — 2026-11-21
### Eklendi
- HMAC oturum belirteci, kurucu anahtarı sunucuda hash; tenant izolasyonu; CORS kapalı; Z raporu; yoklamada `since`.
### Değişti
- Tailwind CDN → derlenmiş CSS; tek dosya derleme (`dist/index.html`).
### Kaldırıldı
- Gömülü `PICKYS9999` / `9999` anahtarları; ana işletme verisinin her derlemeye gömülmesi.
