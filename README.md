# ProPos v3 — React + PHP

Restoran/kafe POS: masa, adisyon, stok/reçete, çeşitler, Z raporu; çevrimdışı çalışır (IndexedDB + PWA); veri dosyada ya da Supabase'de.
Belgeler: `CHANGELOG.md` (yapılanlar) · `TODO.md` (planlar) · `docs/API.md` (uç sözleşmesi) · `docs/SUPABASE.md` (depo + keepalive) · `docs/NOTES.md` (kararlar) · `docs/IDEAS.md` (fikirler) · `CLAUDE.md` (geliştirici notları).

## Kurulum / çalıştırma
```
npm install
npm run build          # dist/index.html (tek dosya, ~0.5 MB)
php backend/init.php   # ilk kurulumda kurucu anahtarını üretir
npm run serve          # http://localhost:8586  (veya Mobil_ve_PC_Canli_Sunucu.ps1)
```
Apache/LiteSpeed: kök `.htaccess` her isteği `backend/router.php`'ye yönlendirir; `data/`, `backend/`, `src/` dışarıya kapalıdır.

## Arayüz ve yönlendirme
Tasarım kaynağı `design-prototype/` (tokenlar, bileşenler, hareket). Uygulamadaki karşılığı `src/design/ui.css` (prototipten birebir) ve `src/ui/*` (React). Rapor/yönetim ekranları `src/ui/page.jsx` kalıbıyla (prototipin `.boss` ızgarası) kurulur. Adresler: `/masalar`, `/masalar/:id` (adisyon), `/stok`, `/esnaf`, `/analiz`, `/personel`, `/finans`, `/yonetim`; pencereler `?s=odeme|cesit|islem`. Geri tuşu önce pencereyi kapatır. Sunucu bilinmeyen yolları `index.html`'e düşürür.

## Depolama
Varsayılan dosya (`data/`). `PROPOS_STORAGE=supabase` + `.env` (`.env.example`) ile Supabase; yazma-geçişli yerel önbellek ve Realtime sinyali dahil. Kurulum, SQL ve keepalive cron: `docs/SUPABASE.md`. `.env` asla commit edilmez.

## Çevrimdışı + PWA
Değişiklikler önce IndexedDB'ye yazılır, bağlantı gelince gönderilir (üç yönlü birleştirme; sunucuda `baseRev` ile `409`). Service worker ve "uygulamayı yükle" yalnızca HTTPS/localhost'ta çalışır; düz `http://LAN-IP`'de çevrimdışı çalışma vardır ama sayfayı çevrimdışı yeniden açma yoktur. Ayrıntı: `docs/NOTES.md`.

## Kontrol paneli (bayi / lisans)
```
npm run control        # http://127.0.0.1:8590 — yalnızca kurucu anahtarı
```
Ayrı giriş noktası (`backend/control.php`) ve ayrı paket (`dist-admin/`). POS sunucusu paneli servis etmez, müşteri kurulum paketine panel kodu girmez.
VDS'te ayrı alt alan adı + nginx ters vekil + IP kısıtı önerilir.

## Testler
```
npm test                              # python tests/run.py: lint + PHP + React (~20 sn)
python tests/run.py --only security   # yalnızca saldırgan testler
python tests/run.py --filter PIN -v   # adında PIN geçenler, ayrıntılı
python tests/run.py --build           # + derleme / paket ayrımı kontrolleri
php tests/php/index.php --suite=unit  # PHP birim testleri tek başına
npx vitest run                        # React testleri tek başına
```
PHP testleri bağımlılıksızdır (composer gerekmez); HTTP suite'leri için koşucu geçici veriyle iki sunucu (POS + panel) açar,
kaba kuvvet / hız sınırı testleri sıkı limitli ayrı sunucuda koşar. Gerçek `data/` ve `dist/` klasörlerine dokunulmaz.

## Giriş akışı
1. Cihaz bir kez işletmeye bağlanır (işletme kodu + bağlantı anahtarı).
2. Yönetici ekranları PIN ister; PIN sunucuda hash olarak durur, 6 hatalı denemede 5 dk kilitlenir.
3. Anahtar panelden yenilenirse o anahtarla bağlı tüm cihazlar anında düşer (kayıp/çalıntı cihaz).

## Güvenlik modeli
- Tüm veri `data/` altındadır (web'e kapalı). Eski kök dizin dosyaları ilk çalıştırmada oraya taşınır.
- Kurucu anahtarı sunucuda hash olarak durur; ilk kurulumda `data/KURUCU_ANAHTARI.txt` dosyasına yazılır (okuyup silin).
- Her işletmenin ayrı `syncKey`'i vardır; cihazlar `/api/login` ile 12 saatlik imzalı oturum alır. Lisans (askı/süre) sunucuda kontrol edilir.
- İstek hızı sınırı: aşımda `429` + `Retry-After` (yoklama ve kullanıcı eylemleri ayrı kovalarda).
- Bayi uçları (`/api/tenants`, `/api/package`, `/api/apply-update`, `/api/prepare-github`, `/api/audit`) yalnızca kurucu oturumuyla çalışır.
- Başka bir işletmenin verisine erişim yok; kayıtsız işletme verisi `DEFAULT`'a düşmez.
- Hatalı girişte hız sınırı (10 dk'da 8 deneme), `data/audit.log` denetim kaydı, günlük otomatik yedek (`data/backups`, 14 gün).
- CORS kapalı; ayrı alan adı gerekirse `PROPOS_CORS_ORIGIN` (tek köken, virgüllü liste ya da `*`; liste verilirse yalnızca listedeki köken yansır).
- Depo erişilemezse sunucu `503 STORAGE_DOWN` döner, "kayıt yok" sanıp üzerine yazmaz.
- Proxy arkasında gerçek IP için güvenilir `X-Forwarded-For` henüz yok (TODO P8); VDS'e geçmeden yapılmalı.
