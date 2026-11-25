# ProPos v3 — React + PHP

## Kurulum / çalıştırma
```
npm install
npm run build          # dist/index.html (tek dosya, ~0.5 MB)
php backend/init.php   # ilk kurulumda kurucu anahtarını üretir
npm run serve          # http://localhost:8586  (veya Mobil_ve_PC_Canli_Sunucu.ps1)
```
Apache/LiteSpeed: kök `.htaccess` her isteği `backend/router.php`'ye yönlendirir; `data/`, `backend/`, `src/` dışarıya kapalıdır.

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
- CORS kapalı; ayrı alan adı gerekirse `PROPOS_CORS_ORIGIN` ortam değişkeni.
