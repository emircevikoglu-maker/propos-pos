# ProPos — Yapılacaklar (planlar)

Biçim: her plan bir hedef + adımlar. `[ ]` yapılacak, `[x]` bitti, `[~]` kısmen, `[?]` karar bekliyor.
Boyut: S (< 1 saat), M (yarım gün), L (1-2 gün), XL (daha fazla). Ayrıntı ve gerekçe: `docs/NOTES.md`. Bitenler: `CHANGELOG.md`.
Kural: her adım bitince `npm test` yeşil + CHANGELOG satırı.

## Sıra (öneri)
1. P0 test sürüşü → 2. P1-a yazdırma → 3. P2-a istemci offline + PWA → 4. P4 altyapı kararı (Supabase denemesi) → 5. P5 roller → 6. P6 tasarım → 7. P7 özellikler

---

## P0 — Test sürüşüne hazırlık
- [x] Tek komutla başlatma: `npm start` (install/build/ilk kurulum/anahtarları yaz) — S
- [x] Güvenli veri sıfırlama: `npm run reset` (data → `_yedek/`), `--pin` — S
- [x] "API'yi patlatan rate limit": debounce, giriş fırtınası, gizli sekme yoklaması — M
- [x] İlk PIN kurulumu (veri sıfırlanınca kilitlenme) — S
- [ ] Gerçek cihazlarla deneme: 2 tablet + 1 PC aynı anda, 1 saat; 429 görülüyor mu, F12'de istek boyutları — kullanıcı
- [ ] Ekranda geri bildirim butonu ("burası kafa karıştırıcı" → denetim kaydı) — S
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
### P1-b Yerel yazdırma ajanı — L
- [ ] Küçük servis (Go ya da Node, tek exe): localhost HTTP → ESC/POS; yazıcı keşfi, çoklu yazıcı, çekmece açma
- [ ] Eşleştirme: ajan yalnızca kendi POS kökeninden istek kabul eder (CORS + yerel anahtar)
- [ ] İsteğe bağlı: dayanıklı yerel kuyruk (SQLite) — offline güvencesi (NOTES: tek kurulum, iki ihtiyaç)
### P1-c Mali belge — XL, iş geliştirme
- [ ] e-Arşiv entegratörü araştırması (API ile; ÖKC'den kolay)
- [ ] ÖKC (PAVO/Beko/Ingenico/PAX) görüşmeleri, SDK + sertifikasyon

## P2 — Senkron v2 + çevrimdışı + PWA
### P2-a İstemci (backend'den bağımsız; her iki altyapıda da lazım) — L
- [ ] PWA: manifest, service worker (uygulama kabuğu önbelleği), kurulum yönergesi
- [ ] IndexedDB (Dexie) ile localStorage yerine kalıcı depo; `navigator.storage.persist()`; kota göstergesi
- [ ] Outbox: satışlar istemci UUID'li olay; çevrimdışıyken kuyrukta, bağlantı gelince sırayla gönder; sunucu idempotent
- [ ] Günlük yerel yedek (dosyaya) — ayar
- [ ] Testler: çevrimdışı satış → çevrimiçi → tek kayıt (çift yok)
### P2-b Protokol — L
- [ ] Durumu böl: katalog/ayar, canlı operasyon (masalar), defter (satış/gider, gün bazlı sayfalı)
- [ ] Delta senkron (`since=N` → değişiklikler), long-poll ya da Supabase realtime (P4'e bağlı)
- [ ] Varlık başına `rev` + If-Match; çakışmada "başkası değiştirdi" uyarısı (aynı adisyona iki garson)
- [ ] Görseller JSON'dan çıkar: WebP, `/media/{tenant}/{hash}.webp`, immutable cache
- [x] Gönderim debounce'u (geçici iyileştirme, 24 Kasım)

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
- [ ] g. Manuel test: iki tarayıcı + çevrimdışı kesinti senaryosu

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
- [ ] İkram ve atık kaydı (stok doğruluğu) — S
- [ ] Çeşit seçeneğine reçete (ekstra shot → stoktan espresso düş) — S
- [ ] Kampanya / happy hour kural motoru (saat, gün, ürün/kategori, %/tutar) — M
- [ ] Stok sayımı + fark raporu — M
- [ ] Kuver (kişi sayısı) + kuver raporu — S
- [ ] Barkod alanı + odaklı giriş kutusu — S
- [ ] QR menü (salt okunur) — M; masadan sipariş — L
- [ ] Müşteri ekranı (ikinci monitör rotası) — S
- [ ] Mutfak ekranı (KDS) — M (P1 ile)
- [ ] Yoğunluk uyarısı (cron, medyan+MAD/Poisson) — M
- [ ] i18n altyapısı (metinleri anahtara taşı) — M
- [ ] Kasa kapanışı: sayım + fark girişi (Z raporu üstüne) — S
- [ ] Tedarikçi yönetimi (esnaf modülünden türet) — M
- [ ] Patron yüzeyi (PWA): günlük özet, kâr, yoğunluk — M

## P8 — Güvenlik / üretim
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
