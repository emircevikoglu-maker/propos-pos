# ProPos — Claude çalışma notları

Restoran/kafe POS + bayi/lisans yönetimi. Türkçe arayüz. Ürün olarak satılacak; ilk saha test sürüşü: 25 Kasım 2026 (yalnızca deneme, acele yok). Ürün adı her yerde ProPos; işletmenin adı `brandSettings.businessName`'den dinamik gelir (koda işletme adı yazılmaz).

## Konumlar
- `C:\faho\projects\stimule\propos` — arkadaşın orijinali. DOKUNMA (yalnızca okuma/karşılaştırma).
- `C:\faho\projects\stimule\propos-v2` — çalışma kopyası (bu repo). Büyük değişiklikten önce kopya al (`propos-v2-yedek-<tarih>`), sonra devam et.
- Eski tek dosya `ProPos_Hazir_Uygulama.html` (1,6 MB derlenmiş paket) okunmaz; gerekirse sadece `grep`/satır aralığı.

## Kayıt dosyaları (her iş sonunda güncelle)
- `docs/plans/<sürüm>.md`: SÜRÜM PLANI — o sürümün tek iş kaydı. Sürüme başlarken yazılır; her adım yapıldıkça işaretlenir, karar/bulgu kısa not düşülür. Kısa ve eksiksiz; megabaytlık döküm değil. Güncel: `docs/plans/3.9.0.md`.
- `TODO.md`: planlar (P0…P10), `[ ] [x] [~] [?]`, boyut S/M/L/XL. Yeni iş önce buraya plan olarak yazılır.
- `CHANGELOG.md`: her değişiklik satırı (Eklendi/Değişti/Düzeltildi/Güvenlik/Kaldırıldı); sürüm `package.json` ile birlikte.
- `docs/IDEAS.md`: fikir havuzu (İ-n); fikir iş sırasında araya sokulmaz, buraya yazılır.
- `docs/API.md`: uç sözleşmesi + ortam değişkenleri; uç değişince aynı işte güncelle. README/CLAUDE.md kodu yansıtmalı.
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
- `src/` React 18: `ui/` (YENİ arayüz: Shell, TablesView, OrderView, PaySheet, OpsSheet, Sheet, routes — `design-prototype/` düzeninin birebir karşılığı), `design/ui.css` (prototipten üretilir, elle düzenleme), `design/ui-extra.css`, `context/PosContext.jsx` (tek büyük context — bölünecek; sekme/masa URL'den türetilir), `components/views/*`, `components/modals/*`,
  `components/auth/` (DeviceGate = giriş kapısı, LoginScreen, PinPad), `ui/page.jsx` (sayfa kalıbı: Page/Card/Kpi/Seg/ItemRow/SwitchRow, dar ekranda tablo→kart), `ui/settings/*`, `components/pos/OptionPicker`, `components/settings/ProductOptionsEditor`,
  `services/{apiService,realtime,merge,syncEngine,localDb}.js` (eşitleme/çevrimdışı), `pwa/` (service worker, kayıt, ikonlar), `design/` (tokenlar, skin.css, kutlamalar), `utils/productOptions.js` (çeşit/fiyat saf mantığı), `admin/` (kontrol paneli: AdminApp, adminApi, validation — POS paketine girmez).
- `backend/`: `bootstrap.php` (ortak yükleyici; müşteri paketine giren dosyaları ister), `router.php` (POS), `control.php` (panel, ayrı giriş),
  `static.php`, `config.php` (`qs()` güvenli sorgu okuyucu, env ayarları), `Controllers/{Api,Control}Controller.php`,
  `Services/{Auth,Tenant,Pin,Package,Throttle,Realtime,ZipBuilder}.php` (kullanıcılar: `TenantService::saveUser/findUser/deleteUser`, giriş: `AuthService::loginUser`), `Services/Storage/{Storage,FileStorage,SupabaseStorage,CachedStorage,StorageFactory,StorageUnavailable}.php`, `env.php` (.env), `cron/keepalive.php`. Depo: `PROPOS_STORAGE=file|supabase`; tenant yazımında `withTenantLock` + `baseRev`.
- `tests/`: `run.py` (koşucu), `php/index.php` + `php/lib.php` (bağımlılıksız çatı, ham soket HTTP), `php/suites/*`, `react/*.test.js(x)`.
- Veri: `data/` (web'e kapalı): `default.json`, `tenants/<ID>.json`, `registry.json`, `config.json`, `audit.log`, `backups/`, `ratelimit/`.
- Ortam: `PROPOS_DATA_DIR`, `PROPOS_DIST_DIR`, `PROPOS_FOUNDER_KEY`, `PROPOS_MAX_DB_BYTES`, `PROPOS_RL_POLL|ACTION|IP|CONTROL` ("kapasite:dolum/sn"), `PROPOS_RL_PENALTY`, `PROPOS_LOGIN_DELAY_MS`, `PROPOS_DEBUG` (yoksa hata çıktısı kapalı), `PROPOS_CORS_ORIGIN` (virgüllü liste/`*`), `PROPOS_STORAGE`, `PROPOS_CACHE[_TTL]`, `PROPOS_REALTIME`, `SUPABASE_*`. Tam liste: `docs/API.md`.

## Giriş modeli (3.9.0'dan itibaren — kullanıcı kararı 28 Kasım)
- Kullanıcı adı + parola. Kullanıcıları kurucu kontrol panelinden ekler (kayıt defterinde işletmenin altında `users[]`, parola `password_hash`). Cihaz eşleştirme / bağlantı anahtarı arayüzden kalktı; arka uçta tenant anahtarı yalnızca geçiş için duruyor (4.0'da silinir).
- Oturum belirteci kullanıcıya görünmez, 30 gün, `localStorage`; parola değişince/kullanıcı kapatılınca düşer. Yönetici PIN'i aynen (aşağıda 3.).
- Dağıtım: ön yüz Vercel (`PROPOS_API_URL` ile arka uca bağlanır), arka uç Linux PHP (`docs/DEPLOY.md`).

## Giriş modeli (3.1-3.8, eski)
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

## Bilinen riskler (3.5.1, öncelik sırasıyla)
1. Gönderim tam durum: satışlar sınırsız büyür (`PROPOS_MAX_DB_BYTES`); defter ayrılıp sayfalanmalı (TODO P2-b).
2. Aynı masada iki cihaz çevrimdışı kapatırsa çift satış (uyarı/çözüm yok; P2-d).
3. Service worker HTTPS ister; LAN `http://` tabletlerinde çevrimdışı yeniden açılış yok (HTTPS rehberi P2-d).
4. Proxy arkasında `REMOTE_ADDR` herkes için aynı → güvenilir `X-Forwarded-For` (hız sınırı/kilit IP'ye bağlı); POS'ta CSP yok, QR üçüncü tarafa gidiyor (P8).
5. Hız sınırı kovaları ve denetim kaydı yerel diskte; çok sunuculu kurulumda paylaşılmaz.
6. Yetki ekran düzeyinde: whole-state senkronla cihaz oturumu her şeyi yazabilir → roller + ayrı uçlar (P5).
7. Base64 görseller JSON içinde → ayrı varlık.
Çözülenler: localStorage 5 MB (IndexedDB), son-yazan-kazanır (baseRev + birleştirme), istemci lisansı, düz PIN.

## Hedef mimari (karar verildi)
- Backend bizim VDS'imizde PHP. İleride Express/Go olabilir → API sözleşmesini sabit tut, `/api/v1` sürümle; iş mantığı controller'da değil servislerde.
- Frontend ayrı ve değiştirilebilir (Svelte/Qwik olabilir): iş kuralları backend'de, UI ince.
- Kontrol paneli (bayi/lisans/sürüm) ayrı uygulama, ayrı port/alan adı, ayrı derleme; müşteriye giden pakette bayi kodu OLMAYACAK. `pos-api` ve `control-api` ayrı giriş noktaları.
- Sürüm yayını GitHub'dan değil, VDS'ten. Tek kod tabanı + tenant başına özellik bayrakları (entitlement); "0.5/0.7" müşteriye görünen paket adı, ayrı dal değil. Güvenlik/hata düzeltmeleri herkese.
- Rate limit: tenant+cihaz başına token bucket, senkron yoklaması ayrı kova. Aşımda `429` + `Retry-After: 30`, UI'da nazik uyarı ("Çok fazla istek, 30 sn bekleyin").
- Bildirim/periodik işler: başta cron (5 dk), ileride socket/push.

## Yol haritası
Güncel plan `TODO.md`, fikirler `docs/IDEAS.md`. Sıradaki: HTTPS rehberi (PWA için şart) → kampanya motoru → yazıcı ajanı (en son, çok önemli; marka/model/58-80 mm/bağlantı bilgisi kullanıcıdan beklenir) → roller → kalan yeniden tasarım.

## Arayüz çalışma kuralı (kullanıcı kararı, 25 Kasım)
- Yeni ekran/bileşen `design-prototype/` ile BİREBİR aynı sınıf, boşluk ve hareketle yapılır (giydirme/eşleme YOK). Prototipte olmayan ekranlar aynı bileşenlerle tasarlanır, önce kısa taslak onayı alınır.
- Görsel iş bitmeden kabul edilmez: prototiple yan yana ekran görüntüsü, 1024×768 / 1280×800 / 1920×1080 / 390×844.
- Sıkışıklık yok: panel başına tek birincil eylem, ikincil işlemler sheet'te; metin kırpma yok; hedefler ≥ 44 px.
- Büyük/bekletilemez değişiklik → doğrudan commit + push (main); önemli ama acil değilse onay bekle. Git yoksa değişen dosyalar paylaşılır.
- (28 Kasım) Gereksiz soru yok: yapı ve özellikler belli (KardoPOS kıyası + silinen her şey hedef). Testler geçince push et, "işimi bitirdim" yaz, dur. Tek istisna: tehlikeli iş (veri silme, güvenlik zayıflatma, geri alınamaz dış etki) → dur, sor; tehlikesizse NOTES'a not düş, devam.

## Arayüz kuralları
- Tailwind KALIR (karar 28 Kasım): tek tasarım kaynağı `src/design/ui.css` tokenları; Tailwind teması bu CSS değişkenlerine bağlanır. Eski renkleri zorla boyayan `skin.css` eski ekranlar bitince silinir. Yeni ekranlarda prototip sınıfları + gerekirse token'a bağlı Tailwind yardımcıları; ham Tailwind renkleri (`stone-900`, `amber-500`) YASAK.
- Responsive zorunlu: her ekran 390 / 768 / 1024 / 1280 / 1920'de denenir; dar ekranda tablo yerine kart, pencere alt sayfa.
- Ağırlık: 400 gövde, 500 etiket, 600 başlık, 700 yalnızca toplam tutar. `font-black`/`font-extrabold` YASAK. `<b>`/`<strong>` yerine `font-semibold`.
- Min. yazı 11-12 px; dokunma hedefi ≥ 44 px. Tek birincil renk (amber) + başarı/uyarı/tehlike + nötr.
- POS ekranında pop-up/satış teklifi YOK; yükseltme önerileri yalnızca patron/arka ofis panelinde, sıklık sınırlı, kapatılabilir.

## Claude için çalışma kuralları (token)
- Okumadan önce `grep`/satır aralığı; büyük dosyayı bütün okuma. Mekanik değişiklik → script (örn. bold regex), elle tek tek düzenleme değil.
- Komut çıktısını sınırla (`| head`, `| tail`, hata filtresi).
- PHP/JS dosyası yazarken bash heredoc yerine Write aracı (tırnaklar heredoc'u bozuyor). Glob'lu `rm -rf` engelleniyor; açık yol kullan.
- Her değişiklikten sonra: `php -l`, `npm run build`, test portunda curl + tarayıcı. Orijinal `propos/` klasörüne yazma.
- Kullanıcı deneyimli geliştirici: Türkçe, teknik ve nüanslı yaz; aşırı bold kullanma.
