# ProPos — Claude çalışma notları

Restoran/kafe POS + bayi/lisans yönetimi. Türkçe arayüz. Ürün olarak satılacak; ilk saha test sürüşü: 25 Kasım 2026 (yalnızca deneme, acele yok). Ürün adı her yerde ProPos; işletmenin adı `brandSettings.businessName`'den dinamik gelir (koda işletme adı yazılmaz).

## Konumlar
- `C:\faho\projects\stimule\propos` — arkadaşın orijinali. DOKUNMA (yalnızca okuma/karşılaştırma).
- `C:\faho\projects\stimule\propos-v2` — çalışma kopyası (bu repo). Büyük değişiklikten önce kopya al (`propos-v2-yedek-<tarih>`), sonra devam et.
- Eski tek dosya `ProPos_Hazir_Uygulama.html` (1,6 MB derlenmiş paket) okunmaz; gerekirse sadece `grep`/satır aralığı.

## Kayıt dosyaları (her iş sonunda güncelle)
- `TODO.md`: planlar (P0…P10), `[ ] [x] [~] [?]`, boyut S/M/L/XL. Yeni iş önce buraya plan olarak yazılır.
- `CHANGELOG.md`: her değişiklik satırı (Eklendi/Değişti/Düzeltildi/Güvenlik/Kaldırıldı); sürüm `package.json` ile birlikte.
- `docs/NOTES.md`: kararlar, gerekçeler, teşhisler, fikir değerlendirmeleri, açık sorular.
- Token kuralı: ağır düşünme dışındaki token-yüklü işler önce plana yazılır; tasarım prototipi gibi bağımsız işler ayrı oturuma.

## Komutlar
- `npm start` (`tools/dev.py start`): gerekirse install/build/ilk kurulum, anahtarları yazar, POS :8586 + panel :8590. `npm run reset [-- --pin 1234]`: data → `_yedek/` + temiz kurulum. `npm run keys`.
- `npm test` = `python tests/run.py` → lint + PHP (unit/api/control/security/abuse) + React (vitest). `--only php|react|unit,security`, `--filter PIN`, `-v`, `--build` (paket ayrımı kontrolü), `--keep`. Gerçek `data/` ve `dist/`'e dokunmaz (PROPOS_DATA_DIR/PROPOS_DIST_DIR geçici).
- Her değişiklikten sonra `npm test` (≈20 sn). Yeni uç/özellik = yeni test; güvenlik kontrolü eklenince saldırgan testi de (`tests/php/suites/security.php`).
- `npm run build` → `dist/index.html` (POS) + `dist-admin/index.html` (kontrol paneli); ayrı paketler.
- `npm run control` → kontrol paneli `php -S 127.0.0.1:8590 backend/control.php` (yalnızca localhost; VDS'te ayrı alt alan adı + IP kısıtı).
- `php backend/init.php` → ilk kurulum, kurucu anahtarını `data/KURUCU_ANAHTARI.txt`'ye yazar
- `npm run serve` veya `Mobil_ve_PC_Canli_Sunucu.ps1` → `php -S 0.0.0.0:8586 backend/router.php`
- PHP: `C:\faho\projects\xampp\php\php` (8.2). Lint: `php -l <dosya>`
- Test sunucusu için ayrı port kullan (örn. 8599); kapatırken `Get-NetTCPConnection -LocalPort 8599 -State Listen` ile PID bul (State filtresi olmadan PID 0 döner, hata yağar).

## Mevcut yapı
- `src/` React 18: `context/PosContext.jsx` (tek büyük context — bölünecek), `components/views/*`, `components/modals/*`,
  `components/auth/` (DeviceGate, PairingScreen, PinPad), `components/pos/OptionPicker`, `components/settings/ProductOptionsEditor`,
  `services/apiService.js`, `utils/productOptions.js` (çeşit/fiyat saf mantığı), `admin/` (kontrol paneli: AdminApp, adminApi, validation — POS paketine girmez).
- `backend/`: `bootstrap.php` (ortak yükleyici; müşteri paketine giren dosyaları ister), `router.php` (POS), `control.php` (panel, ayrı giriş),
  `static.php`, `config.php` (`qs()` güvenli sorgu okuyucu, env ayarları), `Controllers/{Api,Control}Controller.php`,
  `Services/{Auth,Tenant,Pin,Package}Service.php`, `Throttle.php` (token bucket + hata sayacı, dosya tabanlı), `ZipBuilder.php`.
- `tests/`: `run.py` (koşucu), `php/index.php` + `php/lib.php` (bağımlılıksız çatı, ham soket HTTP), `php/suites/*`, `react/*.test.js(x)`.
- Veri: `data/` (web'e kapalı): `default.json`, `tenants/<ID>.json`, `registry.json`, `config.json`, `audit.log`, `backups/`, `ratelimit/`.
- Ortam: `PROPOS_DATA_DIR`, `PROPOS_DIST_DIR`, `PROPOS_FOUNDER_KEY`, `PROPOS_MAX_DB_BYTES`, `PROPOS_RL_POLL|ACTION|IP|CONTROL` ("kapasite:dolum/sn"), `PROPOS_RL_PENALTY`, `PROPOS_LOGIN_DELAY_MS`, `PROPOS_DEBUG` (yoksa hata çıktısı kapalı), `PROPOS_CORS_ORIGIN`.

## Giriş modeli (3 katman)
1. Cihaz eşleştirme (bir kez): işletme kodu + bağlantı anahtarı → `localStorage`. Eşleşmemiş cihazda POS hiç açılmaz (DeviceGate). Anahtar yenilenince (panel) eski anahtar VE onunla alınmış tüm oturumlar anında düşer (token'da anahtar parmak izi `k`).
2. Oturum: `/api/login` → 12 saat, `sessionStorage`. Lisans (askı/süre) hem girişte hem her senkronda sunucuda kontrol edilir → 403 `LICENSE` → lisans ekranı.
3. Yönetici kilidi: PIN yalnızca sunucuda hash (`adminPinHash`, tenant verisinde). `/api/pin/verify` → 4 saatlik `manager` token. 6 hatada 5 dk kilit. İstemci PIN'i/uzunluğunu bilmez; senkron PIN'i taşımaz, istemciden gelen PIN/hash yok sayılır; eski düz PIN ilk erişimde hash'e çevrilir.
- Kurucu: ayrı kontrol paneli (yalnızca kurucu anahtarı). Uygulama içi bayi stüdyosu geçiş için duruyor, ileride kaldırılacak.

## API (sözleşme — backend dili değişse de korunacak)
- Hatalar: `{ok:false, error, code}`; kodlar `AUTH` 401, `BAD_KEY` 401, `BAD_PIN` 401, `LICENSE` 403, `NO_PIN` 409, `RATE_LIMIT` 429 + `Retry-After`.
- PIN: `GET /api/pin/status`, `POST /api/pin/verify {pin}`, `POST /api/pin/change {current?, next}` (yönetici oturumunda current gerekmez).
- Kontrol paneli (`control.php`): `POST /api/login {key}` (yalnızca kurucu), `GET /api/tenants` (+stats), `POST /api/tenants/save|rotate-key|delete`, `GET /api/package`, `GET /api/audit`. POS uçları burada YOK.
- `POST /api/login {tenantId,key}` → `{token, role: founder|tenant}`; başlık `X-ProPos-Token`, 12 saat. Hatalı girişte 10 dk/8 deneme sınırı.
- `GET /api/sync?tenantId&since=<rev>` → değişmediyse `{unchanged:true}`; `POST /api/sync?tenantId&deviceId` tüm durum (whole-state).
- Kurucuya özel: `/api/tenants` (syncKey sunucu üretir), `/api/package` (müşteri ZIP: yalnızca o müşterinin verisi), `/api/apply-update`, `/api/prepare-github`, `/api/audit`. Açık: `/api/info`.

## Yapılanlar (v3.1 — 24 Kasım 2026)
- Test altyapısı (195 test, ~20 sn): normal + saldırgan (dizin aşımı, belirteç sahteciliği, çapraz işletme, yetki yükseltme, tip karışıklığı, boyut, başlık/denetim kaydı enjeksiyonu, CORS, sızıntı, kaba kuvvet, hız sınırı). Mutasyonla doğrulandı (savunma bozulunca test kırılıyor).
- Testlerin bulduğu açıklar düzeltildi: dizi `tenantId` → "ARRAY" işletmesi; `?tenantId[]=` TypeError/500; `</script>` kaçışı derlemede hiç çalışmıyordu; kilitli pakette `?tenant=` ile başka işletmeye geçilebiliyordu.
- Kontrol paneli ayrı (giriş noktası, derleme, port, CSP/DENY). Giriş modeli (yukarıda). 429 + Retry-After, istemci 30 sn bekleyip son durumu yeniden gönderir.
- İçecek çeşitleri: ürün başına seçenek grupları (tek/çoklu, zorunlu, max, fiyat farkı), hazır gruplar (Boy, Süt, Şeker, Sıcaklık, Ekstra, Servis); sepet satırı `options`+`optionKey`, aynı seçim birleşir.
- Marka: "PICKY'S/PICKYS-MASTER" sabitleri kaldırıldı (geriye uyumlu takma ad hariç); sekme başlığı `<işletme> · ProPos`.

## Yapılanlar (v3.0)
- Kimlik doğrulama (HMAC token), kurucu anahtarı sunucuda hash; `PICKYS9999`/`9999` kaldırıldı.
- Tenant izolasyonu; bilinmeyen tenant artık DEFAULT verisine düşmüyor. CORS kapalı (`PROPOS_CORS_ORIGIN` ile açılır).
- Ana işletme verisi/PIN'i artık her derlemeye ve müşteri paketine gömülmüyor.
- Yoklama 2 sn + `since`; bold normalizasyonu; Tailwind CDN → derlenmiş CSS; Z raporu (Finans sekmesi).

## Bilinen riskler (öncelik sırasıyla)
1. `localStorage` ~5 MB: satış ~317 B → 100 satış/gün ile birkaç ayda dolar. IndexedDB'ye taşınmalı.
2. Whole-state senkron: satışlar sınırsız büyüyor; `PROPOS_MAX_DB_BYTES` 20 MB tavanı yoğun işletmede aylar içinde dolar. Defter (satışlar) ayrılıp sayfalanmalı.
3. Son yazan kazanır: aynı adisyona iki cihaz → biri kaybolur. Varlık başına `rev` + optimistik eşzamanlılık; satışlar UUID ile idempotent.
4. ~~Lisans kontrolü istemcide~~ (v3.1: sunucuda, girişte + her senkronda). Kalan: token TTL 12 saat (anahtar yenileme anında düşürüyor; yine de 15 dk + refresh düşünülebilir).
5. ~~adminPin düz metin~~ (v3.1: hash, sunucuda). `syncKey` registry'de düz (panelde gösterilip teslim edildiği için); yetki hâlâ ekran düzeyinde: whole-state senkron yüzünden cihaz oturumu her şeyi yazabilir. Roller gelince ayrı uçlar + sunucu tarafı izin.
6. Base64 görseller JSON içinde (logo ~6,8 KB) → ayrı varlık (WebP, hash'li URL, immutable cache).
7. Proxy arkasında `REMOTE_ADDR` herkes için aynı → güvenilir proxy'den `X-Forwarded-For` (hız sınırı ve kaba kuvvet kilidi IP'ye bağlı; nginx arkasında bu ŞART). HTTPS zorunlu; panelde CSP var, POS'ta yok (QR için api.qrserver.com'a LAN adresi gidiyor → yerel QR üreticisine geçilmeli).

## Hedef mimari (karar verildi)
- Backend bizim VDS'imizde PHP. İleride Express/Go olabilir → API sözleşmesini sabit tut, `/api/v1` sürümle; iş mantığı controller'da değil servislerde.
- Frontend ayrı ve değiştirilebilir (Svelte/Qwik olabilir): iş kuralları backend'de, UI ince.
- Kontrol paneli (bayi/lisans/sürüm) ayrı uygulama, ayrı port/alan adı, ayrı derleme; müşteriye giden pakette bayi kodu OLMAYACAK. `pos-api` ve `control-api` ayrı giriş noktaları.
- Sürüm yayını GitHub'dan değil, VDS'ten. Tek kod tabanı + tenant başına özellik bayrakları (entitlement); "0.5/0.7" müşteriye görünen paket adı, ayrı dal değil. Güvenlik/hata düzeltmeleri herkese.
- Rate limit: tenant+cihaz başına token bucket, senkron yoklaması ayrı kova. Aşımda `429` + `Retry-After: 30`, UI'da nazik uyarı ("Çok fazla istek, 30 sn bekleyin").
- Bildirim/periodik işler: başta cron (5 dk), ileride socket/push.

## Yol haritası
1. Sıradaki kolay işler: yazıcı (adisyon + mutfak fişi, tarayıcı yazdırma 58/80 mm; çeşitler fişte görünmeli), geri bildirim butonu, demo veri/tanıtım turu, çeşit seçeneğine reçete (ekstra shot → stoktan espresso düş).
2. Fiş/fatura: (a) bilgi fişi/adisyon (mali değil), (b) yerel yazdırma ajanı (sessiz baskı, ESC/POS, çekmece açma) — VDS restoran LAN'ındaki yazıcıya ulaşamaz, (c) e-Arşiv entegratörü, (d) ÖKC (PAVO/Beko/Ingenico/PAX) SDK'ları.
3. Yoğunluk uyarısı (AI'sız): (gün, 15 dk dilim) bazında geçmiş 4-8 hafta; medyan + MAD / Poisson üst yüzdelik; reaktif (anlık sapma) + proaktif (30-60 dk önce). Soğuk başlangıç ~4 hafta. Mesaj açıklanabilir olmalı ("normalin 1,6 katı").
4. Roller/izinler (sunucuda), personel PIN'i, müdür onayı; yüzeyler: garson/kasa/mutfak/arka ofis/patron.
5. Senkron: delta + long-poll, defter ayrımı, IndexedDB + çevrimdışı kuyruk.
6. UI yeniden tasarım (önce yedek al): tipografi sistemi, bileşenler, tek ikon seti.

## Arayüz kuralları
- Ağırlık: 400 gövde, 500 etiket, 600 başlık, 700 yalnızca toplam tutar. `font-black`/`font-extrabold` YASAK. `<b>`/`<strong>` yerine `font-semibold`.
- Min. yazı 11-12 px; dokunma hedefi ≥ 44 px. Tek birincil renk (amber) + başarı/uyarı/tehlike + nötr.
- POS ekranında pop-up/satış teklifi YOK; yükseltme önerileri yalnızca patron/arka ofis panelinde, sıklık sınırlı, kapatılabilir.

## Claude için çalışma kuralları (token)
- Okumadan önce `grep`/satır aralığı; büyük dosyayı bütün okuma. Mekanik değişiklik → script (örn. bold regex), elle tek tek düzenleme değil.
- Komut çıktısını sınırla (`| head`, `| tail`, hata filtresi).
- PHP/JS dosyası yazarken bash heredoc yerine Write aracı (tırnaklar heredoc'u bozuyor). Glob'lu `rm -rf` engelleniyor; açık yol kullan.
- Her değişiklikten sonra: `php -l`, `npm run build`, test portunda curl + tarayıcı. Orijinal `propos/` klasörüne yazma.
- Kullanıcı deneyimli geliştirici: Türkçe, teknik ve nüanslı yaz; aşırı bold kullanma.
