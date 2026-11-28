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
Tasarım kaynağı `design-prototype/` (tokenlar, bileşenler, hareket). Uygulamadaki karşılığı `src/design/ui.css` (prototipten birebir) ve `src/ui/*` (React). Rapor/yönetim ekranları `src/ui/page.jsx` kalıbıyla (prototipin `.boss` ızgarası) kurulur. Adresler: `/masalar`, `/masalar/:id` (adisyon), `/stok`, `/esnaf`, `/analiz`, `/patron`, `/personel`, `/finans`, `/yonetim`; pencereler `?s=…` (odeme, cesit, icerik, iptal, islem, stok, tahsilat, fis, malzeme, baglanti…). Geri tuşu önce pencereyi kapatır. Sunucu bilinmeyen yolları `index.html`'e düşürür.

## Satış, içerik ve reçete
- Malzemeler **Stok → Malzemeler** (yönetici PIN'i): ad, birim, kritik sınır, birim maliyet.
- Reçete **Yönetim → Menü → ürün**: 1 adedin düşürdüğü malzeme ve miktar; "Çıkarılabilir" kapalıysa satışta çıkarılamaz. Çeşit seçeneklerine ek tüketim bağlanabilir.
- Satışta ürün kartının sağ altındaki ikon ya da adisyon satırındaki **İçerik**: çeşit, malzeme çıkarma, not, adet.
- Kampanyalar: **Yönetim → Kampanyalar**.

## Fiş yazdırma
**Gönder** yalnızca yeni adetleri bara/mutfağa ayırır; **Yönetim → Yazdırma**'da kategori → istasyon, 58/80 mm ve otomatik baskı ayarlanır. Tarayıcı yazdırma penceresi açılır. Kasada sessiz basmak için fiş yazıcısını Windows'ta varsayılan yapın ve Chrome'u ayrı bir kısayoldan şu bayrakla açın: `chrome.exe --kiosk-printing http://localhost:8586`. Android/iOS'ta yazdırma penceresi atlanamaz. Bu fişler **mali belge değildir**.

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

## Giriş akışı (3.9.0)
1. Kullanıcı adı + parola. Kullanıcıları kurucu kontrol panelinden ekler (işletme kartı → Kullanıcılar). Oturum 30 gün.
2. Parola değişince ya da kullanıcı kapatılınca o kullanıcının açık oturumları anında düşer (kayıp/çalıntı cihaz).
3. Yönetici ekranları ayrıca işletme PIN'i ister; PIN sunucuda hash olarak durur, 6 hatalı denemede 5 dk kilitlenir.

## Kullanıcılar
Kontrol paneli (işletme kartı → Kullanıcılar) ya da sunucuda:
```
php backend/users.php list
php backend/users.php add ali.kasa GucluParola1 --tenant=KAFE-101 --role=staff --name="Ali"
php backend/users.php passwd ali.kasa YeniParola2     # açık oturumları düşer
php backend/users.php disable ali.kasa
```

## Dağıtım
Ön yüz Vercel (`vercel.json`, `PROPOS_API_URL`), arka uç Linux PHP (Apache `.htaccess` / nginx). Ayrıntı: `docs/DEPLOY.md`. Sürüm iş kaydı: `docs/plans/`.

## Güvenlik modeli
- Tüm veri `data/` altındadır (web'e kapalı). Eski kök dizin dosyaları ilk çalıştırmada oraya taşınır.
- Kurucu anahtarı sunucuda hash olarak durur; ilk kurulumda `data/KURUCU_ANAHTARI.txt` dosyasına yazılır (okuyup silin).
- Her işletmenin ayrı `syncKey`'i vardır; cihazlar `/api/login` ile 12 saatlik imzalı oturum alır. Lisans (askı/süre) sunucuda kontrol edilir.
- İstek hızı sınırı: aşımda `429` + `Retry-After` (yoklama ve kullanıcı eylemleri ayrı kovalarda).
- POS sunucusunda bayi ucu yoktur (3.10.0); işletme, lisans, kullanıcı ve müşteri paketi yalnızca kontrol panelinde (`npm run control`).
- Başka bir işletmenin verisine erişim yok; kayıtsız işletme verisi `DEFAULT`'a düşmez.
- Hatalı girişte hız sınırı (10 dk'da 8 deneme), `data/audit.log` denetim kaydı, günlük otomatik yedek (`data/backups`, 14 gün).
- CORS kapalı; ayrı alan adı gerekirse `PROPOS_CORS_ORIGIN` (tek köken, virgüllü liste ya da `*`; liste verilirse yalnızca listedeki köken yansır).
- Depo erişilemezse sunucu `503 STORAGE_DOWN` döner, "kayıt yok" sanıp üzerine yazmaz.
- Proxy arkasında gerçek IP için güvenilir `X-Forwarded-For` henüz yok (TODO P8); VDS'e geçmeden yapılmalı.
