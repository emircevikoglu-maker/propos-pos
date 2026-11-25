# ProPos — Yapılacaklar (planlar)

Biçim: her plan bir hedef + adımlar. `[ ]` yapılacak, `[x]` bitti, `[~]` kısmen, `[?]` karar bekliyor.
Boyut: S (< 1 saat), M (yarım gün), L (1-2 gün), XL (daha fazla). Ayrıntı ve gerekçe: `docs/NOTES.md`. Fikir havuzu: `docs/IDEAS.md` (İ-n). Bitenler: `CHANGELOG.md`.
Kural: her adım bitince `npm test` yeşil + CHANGELOG satırı.

## ÖNCELİK DEĞİŞİKLİĞİ (25 Kasım, kullanıcı geri bildirimi) — P12, P13, P14 diğer her şeyin önünde
Kullanıcı 3.5.x'i inceledi: (1) giydirilen tasarım prototip değil, ekran sıkışık ve animasyonlar yok; (2) gezinme (geri tuşu) yok; (3) API kapanınca sistem kullanılamaz oluyor, aynı anda lisans çevrimdışıyken zorlanamıyor. Kod ve tarayıcıyla doğrulandı (docs/NOTES.md "3.5.x geri bildirim analizi"). HTTPS rehberi ve kampanya motoru bu üçünün arkasına alındı.

## Sıra (öneri)
0. **P14 (çevrimdışı/lisans güvenilirliği) → P13 (yönlendirme) → P12 (prototip tasarıma tam geçiş)**, ardından aşağıdaki sıra:
1. P0 test sürüşü → 2. P1-a yazdırma → 3. P2-a istemci offline + PWA → 4. P4 altyapı kararı (Supabase denemesi) → 5. P5 roller → 6. P6 tasarım → 7. P7 özellikler

---

## P14 — Çevrimdışı güvenilirliği + lisans zorlama (kritik) — L
Doğrulananlar: (a) açık pencerede sunucu kapanınca satış sürüyor ama yönetici PIN'i yalnızca sunucuda doğrulandığı için Analiz/Çalışan/Ciro/Yönetim kilitli kalıyor ve tıklayınca geri bildirim yok; (b) düz `http://LAN-IP`'de service worker yok: pencere kapanırsa sunucu kapalıyken uygulama bir daha AÇILMIYOR (IndexedDB boşa); (c) 403/401 olayları (lisans ekranı, eşleştirme) yalnızca sayfa yenilenince kalkan kalıcı katman olarak duruyor. Kullanıcının tarif ettiği "pencere kapanana kadar devre dışı" bu üçünün bileşimi; tam yeniden üretim adımı kullanıcıdan istendi (hangi sunucu kapandı, ne göründü).
- [ ] Bağlantı/oturum durumunu TEK durum makinesine topla: `online | offline | degraded | auth | license` + her durumdan otomatik çıkış (yenileme gerektirmez). Kalıcı yapışkan katman kalmaz.
- [ ] "Sunucu cevabı" doğrulaması: JSON olmayan 200 (captive portal/proxy HTML), zaman aşımı, 5xx → çevrimdışı say; 401/403 yalnızca imzalı/yapısal `code` ile yetki hatası.
- [ ] Açılış API'den bağımsız: eşleşmiş cihaz her koşulda IndexedDB'den açılır (sunucu kapalı, oturum yok, ağ yok). Test: 8 senaryo matrisi (başlangıçta kapalı / oturum ortasında kapanış / geri gelme / anahtar geçersiz / lisans bitti / 429 / 5xx / HTML yanıt).
- [ ] Yönetici PIN'i çevrimdışı: sunucu cihaza tuzlu yavaş (PBKDF2) doğrulayıcı verir, IndexedDB'de durur; çevrimdışıyken yerelde doğrulanır, deneme sayacı + kilit yerelde. Tehdit modeli: garsonu engeller, kararlı saldırgana karşı koruma iddiası YOK (belgeye yazılır).
- [ ] Lisans "kira" (lease) modeli — istemci geri sayımı DEĞİL, sunucunun imzaladığı süreli belge: her başarılı eşitlemede sunucu `{tenant, exp, grace, issuedAt}` belgesini Ed25519 ile imzalar; istemci açık anahtarla WebCrypto'da doğrular, IndexedDB'de tutar. Çevrimdışı çalışma kira bitimine kadar; bitince salt-okunur kilit ekranı (açık masaları görme/dışa aktarma, yeni satış yok). Saat geri alma tespiti (son görülen sunucu zamanı). Plana bağlı süre (varsayılan 72 sa).
- [ ] Dürüst sınır (belgeye yazılacak): istemci JS'i ele geçirilebilir; kira imzasız uydurulamaz ama kodu yamayan kararlı biri kilidi atlayabilir. Gerçek zorlama SUNUCUDA: lisans bitince eşitleme/Realtime/güncelleme/yedek durur, çok cihazlı kullanım ve veri çıkışı kesilir; müşteri paketi bayiye bağlıdır. Saldırı yüzeyi = bir cihazın kira süresi.
- [ ] Süresi biten lisansı çevrimdışıyken de bitirme: kira kısa tutulur (isteğe bağlı 24 sa); yenileme her eşitlemede sessiz; kullanıcıya "X saat içinde bağlanın" uyarısı (gerçek süre sunucu imzasından).
- [ ] Yerel sunucu topolojisi ayrımı: (A) işletme PC'sinde PHP (LAN) — internet kopsa bile uygulama sürer; (B) bulut VDS — internet kopunca yalnızca istemci çevrimdışı. Belgede ve kurulumda hangisi olduğu açık yazılır; (A) için sunucuyu Windows hizmeti/görev olarak otomatik başlatma + sağlık kontrolü.
- [ ] Uygulama kabuğunu http LAN'da da açabilmek: HTTPS rehberi (P2-d) + alternatif "yerel kurulum paketi" (Caddy + yerel sertifika).

## P13 — Yönlendirme (geri tuşu) — M
Durum: `react-router-dom` YOK; sekme ve açık masa `useState`; geri tuşu uygulamadan çıkarıyor. Doğrulandı.
- [x] (3.6.0) `react-router-dom` v6 (BrowserRouter; PHP `router.php`'de SPA yedek rota: `/api` ve dosya dışı yollar `index.html`, SW zaten `/` önbelleğinden döner). Rotalar: `/masalar`, `/masalar/:masaId` (adisyon), `/masalar/:masaId/odeme`, `/stok`, `/esnaf`, `/analiz`, `/calisan`, `/finans`, `/ayarlar`, `/yonetim`, `/patron`.
- [x] (3.6.0) Geri tuşu: sheet/pencere/ödeme açıkken geri = kapat (geçmişe girdi eklenir); masadan geri = masalar; kök rotada geri uygulamadan çıkarmaz (replace + "çıkmak için tekrar bas" tostu yok, basitçe masalar).
- [x] (3.6.0) Korumalı rotalar: PIN yoksa PIN ekranına yönlendir, doğrulayınca asıl rotaya dön; yenilemede açık adisyon yeniden açılır.
- [~] Derin bağlantı + yenileme tarayıcıda doğrulandı, yönlendirme sözleşmesi test edildi; çok sekme ve geri/ileri bileşen testleri (Shell render) TODO; `activeTab` artık URL'den türetilir.
- [ ] Prototipin `#masa=S2` kısayolları test için korunur.

## P12 — yeni iş kalemleri (3.6.0 sonrası)
- [ ] Giriş/eşleştirme/lisans ekranlarını prototip diline taşı — S
- [ ] Arama ikonu (şu an "eye" yer tutucu), "Gönder" düğmesi (P1 ile), mobil alt çubuk ürün sayısı hizası — S
- [ ] Yoğun saat çipi demo verisinde sürekli görünüyor (tohum satışlar son 10 dk'da): demo verisini zamana yay — S
- [ ] Shell/OrderView için bileşen testleri (MemoryRouter + sahte bağlam): ürün ekle, çeşit penceresi, ödeme, geri tuşu — M

## P12 — Prototip tasarıma TAM geçiş (giydirme yaklaşımı başarısız, terk edildi) — XL
Kullanıcı kararı: geçiş yaklaşımı (skin.css ile Tailwind sınıflarını yeni renklere eşleme) geçersiz; ekranlar `design-prototype/` ile BİREBİR aynı düzen, boşluk ve hareketle yeniden yazılacak. Hata analizi: tokenlar taşındı ama düzen (3 sütun: kategori rayı / ürün ızgarası / adisyon), boşluk ölçeği, 56 px birincil eylemler, kademeli gösterim ve `PPMotion/PPCelebrate` akışları taşınmadı; eski ekranların kontrol yoğunluğu aynen kaldı (garson seçici, cari yaz, kredi, alman usulü, indirim, masa taşı tek panelde).
- [~] P12-0 Tasarım borcu envanteri: prototipteki her ekran/durum ↔ uygulamadaki karşılığı tablosu (özellik kaybı sıfır kontrol listesi). Prototipte olmayan ekranlar (Esnaf, Stok/Reçete, Çalışan, Finans, Analiz, Yönetim) AYNI sistemle tasarlanır; yeni ekran başına önce kısa taslak onayı.
- [x] (3.6.0) P12-1 Tasarım sistemi gerçek CSS olarak: `tokens.css` + `ui.css` olduğu gibi (Tailwind eşleme yok); React bileşenleri: Button, Card, Sheet, Chip, Field, Tabs, Toast, Rail, Topbar.
- [x] (3.6.0) P12-2 Kabuk: sol ray (ikon + etiket), üst çubuk (işletme, hedef çubuğu, seri, senkron noktası), dar ekranda alt gezinme.
- [x] (3.6.0) P12-3 Masalar → Adisyon → Çeşit seçici → Ödeme (nakit/kart, para üstü) → 5 sn geri al; uçan ürün, sayaç sıçraması, rozet. Gerçek `motion.js` (prototipten); ikinci bir yeniden yazım değil.
- [~] P12-4 Kutlamalar: mevcut `celebrateSale/Z` kancaları yeni ödeme akışında çalışıyor; kademe 0-3 görsel doğrulaması, "kutlamalar" sayfası, hatasız sipariş serisi göstergesi TODO — `PPCelebrate` kademe 0-3 gerçek kancalara bağlı; Z raporu basılı tut; yoğun saat/azaltılmış hareket kuralları; kutlamalar sayfası.
- [ ] P12-5 Patron görünümü (KPI, yoğunluk, menü mühendisliği, günün hikâyesi, hedef serisi).
- [~] P12-6 Kalan ekranlar prototip diliyle. (3.7.0) TAMAM: Stok/Reçete/Atık-Sayım, Personel, Finans + Z raporu/Kasa/Kuver, Esnaf. (3.7.1) Analiz da TAMAM (prototipin patron kartları — yoğunluk tahmini, menü matrisi, günün hikâyesi — P12-5'te ayrı eklenecek). KALDI: Yönetim (Ayarlar), giriş/eşleştirme/lisans ekranları.
- [ ] P12-7 Tailwind + `skin.css` + eski ekran sınıfları tamamen kaldırılır; derleme boyutu ve `font-black` yasağı testleri.
- Kabul ölçütleri (sıkışıklık YASAK): ≥ 44 px hedef, birincil eylem 56 px; panel başına en çok 1 birincil + 2 ikincil eylem, gerisi "Daha fazla" sheet'inde; ekranın yarısından fazlası boş olmasın ama yoğun da olmasın: boşluk ölçeği 8/12/16/24; metin kırpma ("Demleme...") yok (2 satıra sarma); 1024×768, 1280×800, 1920×1080, 390×844'te ekran görüntüsü kontrolü (tarayıcı panelinde elle + `design-prototype` ile yan yana); animasyon süresi ≤ 600 ms, yalnızca transform/opacity.
- [ ] P12-8 UX denetimi (ayrı liste): görülen sorunlar — adisyon paneli aşırı yüklü; "Hızlı tek tık ekle" şeridi ve katalog üst üste; ürün adları kırpılıyor; garson seçici ve ödeme yöntemleri aynı kaydırmada; yönetici kilitli menülere tıklayınca geri bildirim yok (çevrimdışıyken özellikle); sekme geçişinde bağlam kaybı. Yeni bulunanlar buraya eklenir.

---

## P0 — Test sürüşüne hazırlık
- [x] Tek komutla başlatma: `npm start` (install/build/ilk kurulum/anahtarları yaz) — S
- [x] Güvenli veri sıfırlama: `npm run reset` (data → `_yedek/`), `--pin` — S
- [x] "API'yi patlatan rate limit": debounce, giriş fırtınası, gizli sekme yoklaması — M
- [x] İlk PIN kurulumu (veri sıfırlanınca kilitlenme) — S
- [ ] Gerçek cihazlarla deneme: 2 tablet + 1 PC aynı anda, 1 saat; 429 görülüyor mu, F12'de istek boyutları — kullanıcı
- [x] Geri bildirim (Sistem menüsü → denetim kaydı) — S
- [ ] Demo veri + 3 adımlı tanıtım turu — M

## P1 — Yazdırma (en kritik özellik)
### P1-a Tarayıcıdan adisyon + mutfak fişi — M
- [ ] Fiş şablonu bileşeni: 58/80 mm `@page`, ayar: kağıt genişliği, yazı boyutu, alt bilgi metni
- [ ] Adisyon (bilgi fişi, "mali değeri yoktur" ibaresi): işletme adı/logo, masa, garson, satırlar + çeşit özeti + not, indirim, kısmi ödeme, toplam
- [ ] Mutfak/bar fişi: yalnızca yeni eklenen satırlar (satıra `printedQty` alanı), büyük yazı, çeşitler belirgin, not vurgulu, fiyat yok
- [ ] Kategori → istasyon yönlendirmesi (Kahveler → Bar, Tatlılar → Mutfak); ayar ekranı
- [ ] "Siparişi gönder" düğmesi: yeni satırları fişe basar, `printedQty` günceller (tekrar basmaz)
- [ ] Otomatik yazdır açık/kapalı; Chrome `--kiosk-printing` ile sessiz baskı rehberi (README)
- [ ] Testler: şablon çıktısı escape (XSS), çeşitler fişte, ikinci basımda yalnızca yeni satırlar
- [?] Kullanıcıdan: yazıcı modeli / genişlik / bağlantı
### P1-b Yerel yazdırma ajanı + YAZICI API'Sİ — L (en son yapılacak, ÇOK ÖNEMLİ)
- [ ] API sözleşmesi (önce bunu yaz): `GET /v1/printers`, `POST /v1/print {job:"receipt|kitchen|label|z", printer, copies, model}`, `POST /v1/drawer`, `GET /v1/health`; iş modeli JSON (satırlar, çeşitler, notlar, toplamlar, işletme başlığı) — ESC/POS'a dönüşümü ajan yapar, POS yalnızca modeli gönderir
- [ ] Ajan 127.0.0.1'e bağlanır; yalnızca POS kökenine CORS; eşleştirme anahtarı (ilk kurulumda POS'tan girilir); iş kuyruğu + yeniden deneme + "kâğıt bitti/çevrimdışı" durumu
- [ ] Windows ham yazdırma (spooler/USB/ağ 9100) ve Bluetooth; 58/80 mm; Türkçe kod sayfası (CP857/1254) testi; kesici ve çekmece darbesi
- [ ] İstasyon yönlendirme (bar/mutfak/kasa) = ajanda yazıcı eşlemesi; POS'ta ayar ekranı
- [ ] Küçük servis (Go ya da Node, tek exe): localhost HTTP → ESC/POS; yazıcı keşfi, çoklu yazıcı, çekmece açma
- [ ] Eşleştirme: ajan yalnızca kendi POS kökeninden istek kabul eder (CORS + yerel anahtar)
- [ ] İsteğe bağlı: dayanıklı yerel kuyruk (SQLite) — offline güvencesi (NOTES: tek kurulum, iki ihtiyaç)
### P1-c Mali belge — XL, iş geliştirme
- [ ] e-Arşiv entegratörü araştırması (API ile; ÖKC'den kolay)
- [ ] ÖKC (PAVO/Beko/Ingenico/PAX) görüşmeleri, SDK + sertifikasyon

## P2 — Senkron v2 + çevrimdışı + PWA
### P2-a İstemci (backend'den bağımsız; her iki altyapıda da lazım) — L
- [x] PWA: manifest, service worker (kabuk önbelleği), kurulum menüsü (3.5.0)
- [x] IndexedDB (bağımlılıksız sarmalayıcı) + `storage.persist()` + kota göstergesi (3.5.0)
- [~] Outbox yerine "kirli durum + üç yönlü birleştirme" yapıldı (satış kimliğine göre birleşir, çift yok); olay-tabanlı gerçek outbox P2-b ile
- [ ] Günlük yerel yedek (dosyaya) — ayar
- [x] Testler: çevrimdışı satış → çevrimiçi → tek kayıt (motor + tarayıcıda doğrulandı)
### P2-b Protokol — L
- [ ] Durumu böl: katalog/ayar, canlı operasyon (masalar), defter (satış/gider, gün bazlı sayfalı)
- [ ] Delta senkron (`since=N` → değişiklikler), long-poll ya da Supabase realtime (P4'e bağlı)
- [ ] Varlık başına `rev` + If-Match; çakışmada "başkası değiştirdi" uyarısı (aynı adisyona iki garson)
- [ ] Görseller JSON'dan çıkar: WebP, `/media/{tenant}/{hash}.webp`, immutable cache
- [x] Gönderim debounce'u (geçici iyileştirme, 24 Kasım)

## P2-c — İnternet kesintisi (sunucu + istemci tespiti) — L (P2-a ile birlikte)
- [x] İstemci: bağlantı durumu (ağ sonuçlarından; 3.5.0) (Realtime soket durumu + son başarılı istek + `navigator.onLine` ipucu; yalnızca `onLine`'a güvenme); durum çubuğunda "Çevrimdışı — N işlem bekliyor"
- [~] Sunucu: `503 STORAGE_DOWN` yapıldı; cihaz `lastSeen` + panel uyarısı TODO — S (yoklama/sinyal/kayıt); panelde "şu cihaz 3 dk'dır görünmüyor" uyarısı; depo (Supabase) erişilemezse yazma `503 STORAGE_DOWN` döner (veri kaybı yerine istemci kuyruğuna alır), okuma önbellekten sürer
- [x] Çevrimdışıyken ENGELLEME değil KUYRUĞA ALMA (PIN doğrulama gibi sunucu şart işler "bağlantı gerekli" der): satış/sipariş yerelde sürer; PIN doğrulama, yeni cihaz eşleştirme, lisans yenileme gibi sunucu şart işler "bağlantı gerekli" der
- [~] Çakışma politikası: kimlikli birleştirme + delta yapıldı; kapama çakışması (aynı masada iki cihaz) uyarısı TODO — satışlar UUID'li olay (idempotent); adisyon satırları UUID'li ekleme (iki cihaz aynı masaya satır eklerse birleşir); ödeme/kapama tek cihazda (kapama başka cihazda açık satır bırakırsa uyarı)
- [ ] Lisans çevrimdışı tolerans süresi (örn. 72 sa) — sunucu doğrulayamazsa kilitlemez, süre bitince salt okunur

## P2-d — Çevrimdışı sonrası iyileştirmeler
- [ ] Aynı masada iki cihaz çevrimdışı kapadı → çift satış uyarısı ve tek tıkla düzeltme — M
- [ ] Cihaz `lastSeen` + panelde "X dk'dır görünmüyor" — S
- [ ] Lisans çevrimdışı tolerans (72 sa) sunucu tarafı — S
- [ ] HTTPS kurulum rehberi (VDS + otomatik sertifika, ya da yerelde Caddy) — S, PWA için ŞART
- [ ] Background Sync (Chromium) ile sekme kapalıyken gönderim — M
- [ ] Çevrimdışıyken yeni cihaz eşleştirme yapılamaz: arayüzde açıkça belirt — S

## P3 — Depolama: PDO (SQLite / MySQL) — [?] P4 kararına bağlı, M
- [ ] `StorageInterface` (tenant verisi, registry, throttle sayaçları, denetim kaydı); `FileStorage` (bugünkü), `PdoStorage`
- [ ] Ayar: `data/storage.php` ya da `PROPOS_DB_DSN` (`sqlite:data/propos.sqlite` | `mysql:host=…;dbname=…`)
- [ ] Şema: `tenants(id, rev, updated_by, data JSON)`, `registry(tenant_id, …)`, `kv(key, value, expires_at)`, `audit(…)`
- [ ] Taşıma komutu: dosyadan → veritabanına; `dev.py reset` her iki depoyu da temizler
- [ ] Testler: aynı PHP suite'leri iki depoyla da koşar (run.py `--storage=sqlite`)
- Not: Supabase'e geçilecekse bu plan atlanır.

## P4 — Supabase geçişi (karar verildi: 25 Kasım) — XL, [?] bekleyen girdiler
Önkoşullar (kullanıcıdan): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (yalnızca sunucu), `SUPABASE_ANON_KEY` (istemci); `.env`'de bugün yalnızca proje adı + DB parolası var → REST için yetmez. Bu PHP derlemesinde `pdo_pgsql`/`pdo_sqlite` YOK (yalnızca `pdo_mysql`, `curl`, `openssl`) → PHP, Supabase'e PostgREST (HTTPS/curl) ile konuşur; doğrudan Postgres gerekmez.
- [x] a. Şema (migration dosyası; kullanıcı SQL Editor'de çalıştırır): `tenants`, `registry`, `tenant_state(tenant_id, rev, data jsonb)`, `sales_events(id uuid pk, tenant_id, …)`, `audit`, `kv(rate limit)`; RLS açık, anon rolüne hiçbir tablo yok
- [x] b. `Storage` arayüzü + `SupabaseStorage` (curl); `FileStorage` kalır (geliştirme/test); `PROPOS_STORAGE=file|supabase`
- [x] c. Realtime: istemci anon key ile yalnızca `tenant:<id>` broadcast kanalına abone (içerik yok, "rev değişti" sinyali) → sinyalde `GET /api/sync?since` (yoklama biter, hız sınırı sorunu kalkar). Kanal yetkisi: PHP'nin imzaladığı kısa ömürlü JWT (tenant claim)
- [x] d. Keepalive: `backend/cron/keepalive.php` (basit `select 1` benzeri; yanıt gövdesi içeriksiz `{ok:true}`), her hosttan çağrılabilir, ayrı token yok ama sıkı hız sınırı (≈7/hafta + tolerans); Vercel/cron-job.org günlük çağırır
- [~] e. Günlük yedek: sunucu diskine günlük yerel yedek var; Supabase'ten zamanlanmış döküm TODO — cron ile tenant JSON dökümü (yerel indirme)
- [x] f. Testler (şema kurulunca çalışır): aynı PHP suite'leri `PROPOS_STORAGE=supabase` ile (test projesi/şeması) + RLS çapraz tenant testleri + keepalive hız sınırı
- [x] g. Manuel uçtan uca (13/13): panel→işletme, PIN, kayıt, Realtime sinyali, keepalive, istatistik, temizlik (`e2e` betiği scratch'te; testlere taşınabilir)
- [ ] h. Tarayıcıda iki gerçek cihazla Realtime denemesi (WebSocket tarayıcıda; Node ile doğrulandı) — kullanıcı + ben
- [ ] i. Mevcut PHP suite'lerini `PROPOS_STORAGE=supabase` ile de koş (izole test projesi önerilir) — M
- [ ] j. `saveTenant`: tam durum yerine yalnızca `rev` okuma (kayıt başına 1 uzak okuma tasarrufu) — S

## P5 — Roller ve sunucuda yetki — L
- [ ] Personel PIN'i (hash), hızlı kullanıcı değiştirme ekranı
- [ ] Rol/izin matrisi (garson, kasiyer, müdür, sahip; `sale:void`, `discount:>10`, `report:view`)
- [ ] Müdür onayı (iptal, büyük indirim) + denetim kaydı
- [ ] Silinen ürün kaydı → "silinen ürün raporu" (kaçak tespiti)
- [ ] Sunucu tarafı zorlama (whole-state senkron bitince mümkün; P2-b ile birlikte)
- [?] "Personele özel hizmet" tanımı

## P6 — Arayüz yeniden tasarım + kutlama animasyonları
- [x] Ayrı prototip (projeye karışmaz): panelin sıfırdan tasarımı + Duolingo tarzı kutlama anları; performans kuralları NOTES'ta — L → `design-prototype/` (POS akışı + patron görünümü `index.html`, kutlama demo `kutlamalar.html`, kararlar/token/bileşen listesi ve modül olarak ekleme planı `design-prototype/README.md`)
- [ ] Prototip incelemesi: kullanıcı onayı + zayıf Android tablette FPS ölçümü (`kutlamalar.html` → Cihaz gücü: Oto/Zayıf) — S
- [x] Uygulamaya giydirme (3.2.0): tokenlar, skin.css, tek ikon seti, masa kartı, geri al, kutlamalar, sadeleşen üst çubuk
- [~] Kalan: POS adisyon paneli ve ödeme penceresinin prototipteki düzene taşınması, patron görünümü (KPI, yoğunluk, menü matrisi), `<Button>/<Sheet>` React bileşenleri, Tailwind sınıflarının kademeli kaldırılması; yüzey ayrımı (garson/kasa/mutfak/patron)
- [x] Kutlamalar opsiyonel modül: ayar + `prefers-reduced-motion` + yoğun saatte sadeleşme
- [ ] Zayıf Android tablette FPS ölçümü (kutlamalar.html FPS ölçer) — kullanıcı (plan: README "Uygulamaya opsiyonel modül olarak ekleme" — `src/celebrate/` lazy parça, saf `policy.js` + vitest, tenant ayarı/bayrağı, seri sunucuda)

## P7 — Özellikler (Kardo kıyasından, öncelik sırasıyla)
- [x] İkram (mevcut "İkram / Zayi Kapat") + atık/sayım kaydı (3.4.0) — S
- [x] Çeşit seçeneğine reçete — S
- [ ] Kampanya / happy hour kural motoru (saat, gün, ürün/kategori, %/tutar) — M
- [x] Stok sayımı + fark kaydı (3.4.0; ayrı "sayım oturumu" ekranı TODO) — M
- [x] Kuver + Z raporunda kuver — S
- [x] Barkod alanı + arama kutusunda okutma — S
- [ ] QR menü (salt okunur) — M; masadan sipariş — L
- [ ] Müşteri ekranı (ikinci monitör rotası) — S
- [ ] Mutfak ekranı (KDS) — M (P1 ile)
- [ ] Yoğunluk uyarısı (cron, medyan+MAD/Poisson) — M
- [ ] i18n altyapısı (metinleri anahtara taşı) — M
- [x] Kasa kapanışı: sayım + fark (cihaza özel; sunucuya kayıt TODO) — S
- [ ] Tedarikçi yönetimi (esnaf modülünden türet) — M
- [ ] Patron yüzeyi (PWA): günlük özet, kâr, yoğunluk — M

## P7b — Yeni küçük fikirler (3.4.0 sonrası)
- [ ] Sayım oturumu: tüm malzemeleri tek ekranda say, topluca fark raporu — S
- [ ] Kasa sayımı ve kuver verisini sunucuya yaz (cihazlar arası, Z geçmişi) — S
- [ ] Z raporuna atık/sayım farkı satırı — S
- [ ] Kuver girilmezse masa kapatırken (yalnızca kuver açıksa) hatırlatma YOK — POS'ta popup kuralı; ayarla isteğe bağlı varsayılan kişi sayısı — S
- [ ] Barkod: okutunca ürün yoksa "yeni ürün olarak ekle" kısayolu (yönetici) — S
- [ ] Geri bildirimleri panelde ayrı sekmede listele/filtrele — S

## P8 — Güvenlik / üretim
- [x] CORS: ön kontrol (preflight) `Cache-Control`/`Pragma` başlıklarını reddediyordu (fetch `cache:"no-store"`); `PROPOS_CORS_ORIGIN` artık virgüllü liste/`*` kabul eder, yalnızca listedeki köken yansır (3.5.1)
- [ ] HTTPS zorunlu; HSTS — S
- [ ] Ters vekil arkasında güvenilir `X-Forwarded-For` (hız sınırı + kilit IP'ye bağlı) — S, VDS'e geçmeden ŞART
- [ ] POS'a CSP; QR'ı yerel üret (api.qrserver.com'a LAN adresi gidiyor) — S
- [ ] Kontrol paneline TOTP + IP kısıtı — M
- [ ] Uygulama içi bayi stüdyosunu ve GitHub güncelleme yolunu kaldır (`apply-update`, `prepare-github`, raw GitHub fetch) — M
- [ ] Oturumu httpOnly çereze taşı / token TTL 15 dk + refresh — M
- [ ] Yedeği geri yüklemeyi bir kez gerçekten dene — S
- [ ] Panoda: son senkron, hata oranı, tenant DB boyutu (kısmen var) — S

## P11 — Laravel'e geçiş [?] — şimdilik HAYIR (gerekçe NOTES.md)
- [ ] Supabase sonrası yeniden değerlendir: PHP'de kalan yüzey küçülürse (auth + lisans + panel) Laravel ya da hafif Slim/doğrudan Edge Function kıyası

## P9 — Kod sağlığı
- [ ] `PosContext` (≈1100 satır) alan alan böl: katalog, masalar, satışlar, ayarlar — L
- [ ] Kimlikler `Date.now()` yerine UUID (çok cihazda çakışma) — S
- [x] `detectLanIp()` sonucunu önbellekle (Windows'ta her tam yanıtta DNS) — S
- [ ] `saveTenant` için dosya kilidi (eşzamanlı iki POST) — S
- [x] Toast zamanlayıcısı üst üste binince erken kapanıyor — S

## P10 — Ticari
- [ ] Paketler: temele maliyetsiz özellikler (sınırsız personel, offline, QR menü, kampanya, çeşitler, barkod, raporlar, yoğunluk uyarısı); ücretliye sürekli maliyetliler
- [ ] Özellik bayrakları (entitlement) altyapısı
- [ ] Kurulum/donanım paketini ayrı satma; yıllık peşin indirimi
- [ ] İlk 10-20 işletme: indirim karşılığı geri bildirim + referans izni
- [ ] Bağlama göre teklif mekaniği (patron yüzeyinde, haftada ≤1)
