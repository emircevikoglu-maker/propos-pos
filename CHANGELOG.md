# Değişiklik günlüğü

Biçim: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/). Sürüm numarası `package.json` ile birlikte artar.
Başlıklar: Eklendi · Değişti · Düzeltildi · Güvenlik · Kaldırıldı.

## [3.5.0] — 2026-11-25
### Eklendi
- Çevrimdışı çalışma: internet kopunca satış sürer; değişiklikler IndexedDB'de kalıcıdır, bağlantı gelince otomatik gönderilir. Üst çubukta "Çevrimdışı · bekleyen var". Tarayıcıda doğrulandı: sunucu kapatıldı → satış → sayfa yeniden açıldı (veri yerinde) → sunucu açıldı → sunucuya ulaştı.
- Üç yönlü birleştirme (`services/merge.js`): çevrimdışı cihaz başkasının değişikliğini ezmez. Satış/gider/stok kaydı kimliğe göre birleşir (çift satış yok); stok ve adet sayaçları delta ile birleşir (iki cihaz da düştüyse ikisi de uygulanır); aynı alanda gerçek çakışmada yerel kazanır ve bildirilir.
- Eşitleme motoru (`services/syncEngine.js`): debounce'lu gönderim, üstel geri çekilme (3→60 sn), 429/yetki/çevrimdışı ayrımı, ilk başarılı çekmeden önce gönderim yok, açılışta kirli durum + taban ile devam.
- Sunucu iyimser eşzamanlılık: `POST /api/sync?baseRev=` uyuşmuyorsa `409 CONFLICT` + güncel veri (yazılmaz); geçersiz baseRev 400; işletme başına süreç kilidi. `baseRev` yoksa eski davranış.
- `503 STORAGE_DOWN`: depo (Supabase) erişilemezse "kayıt yok" sanılmaz, yazma durur (sessiz veri kaybı yok); genel hata yakalayıcı sır sızdırmaz.
- IndexedDB yerel depo (`services/localDb.js`): localStorage ~5 MB tavanı kalktı; eski veri bir kez taşınır; IndexedDB yoksa localStorage/belleğe düşer; açılış ön yüklemesi (3 sn zaman aşımı); `navigator.storage.persist()` ve kota göstergesi.
- PWA: `manifest.webmanifest`, 4 ikon (`tools/make_icons.py`), service worker (kabuk önbelleği, ağ-öncelikli gezinme + 3 sn zaman aşımı, `/api/*` asla önbelleğe alınmaz, yeni sürüm kullanıcı onayıyla), Sistem menüsünde "Uygulamayı yükle" ve "Yeni sürümü uygula". Müşteri paketine PWA dosyaları eklendi.
### Değişti
- Eski "service worker'ı sil" betiği derlemeden kaldırıldı.
- Bağlantı durumu ağ sonuçlarından türetilir (`navigator.onLine` yalnızca ipucu); ağ yokken oturum alınamaması anahtarı GEÇERSİZ saymaz ve eşleştirme ekranı açmaz.
### Testler
- 76 yeni test: birleştirme (24), eşitleme motoru (18), yerel depo (12), service worker (13), PHP eşzamanlılık/PWA/depo kesintisi. Toplam 357.
### Bilinen sınırlar
- Service worker yalnızca HTTPS/localhost'ta çalışır: düz `http://LAN-IP` üzerinde "çevrimdışıyken sayfayı yeniden aç" ve "uygulamayı yükle" yok (çevrimdışı çalışma ve IndexedDB yine var). Üretimde HTTPS şart.
- Aynı masada iki cihazın çevrimdışı kapama/ödemesi çift satış üretebilir (uyarı verilir, otomatik çözülmez).
- Gönderim hâlâ tam durum (delta değil): büyük işletmede P2-b gerekli.

## [3.4.0] — 2026-11-25
### Eklendi
- Çeşit seçeneğine stok reçetesi: "Ekstra shot → +18 g kahve" gibi seçenek başına ek tüketim; satışta ürün reçetesi + seçilen çeşitlerin reçeteleri adetle çarpılarak düşülür (düzenleyicide seçenek satırında "+ stok").
- Atık & sayım kaydı: zayi (sebep listesiyle) ve sayım farkı (eksik/fazla) maliyetiyle `stockLog` olarak kaydedilir ve senkronlanır; Stok ekranında son 30 gün özeti (maliyetler yalnızca yönetici açıkken) ve son 50 kayıt. Zayi stoktan fazlasını düşemez.
- Kuver: adisyonda kişi sayısı (−/+), satışa `guests` yazılır, masa taşıma/birleştirmede toplanır; Z raporunda toplam kişi ve kişi başı ciro.
- Barkod: ürüne barkod alanı (tekil; çakışma engellenir); POS arama kutusuna okutup Enter ile ürün eklenir (çeşitli üründe seçim penceresi açılır).
- Kasa kapanışı: Z raporunda "Sayılan nakit" girişi; fark (tutuyor/eksik/fazla) anında gösterilir, gün başına cihazda saklanır.
- Geri bildirim: Sistem menüsünden tek dokunuşla (kafa karıştırıcı/yavaş/hata/öneri) + kısa not; `POST /api/feedback` doğrulanır, hız sınırlıdır, denetim günlüğüne tek satır yazılır (satır sonu enjeksiyonu engelli).
### Düzeltildi
- Stok modalı sayım için 0 ve ondalık değere izin vermiyordu (`min=1`).
- `ApiController` `audit` fonksiyonunu içe aktarmıyordu (yeni uç testle yakalandı).
- Kişi sayısı art arda hızlı dokunuşta kayboluyordu (göreli güncelleme).
### Testler
- 39 yeni test (stok/atık/sayım, barkod, kuver, kasa farkı, çeşit reçetesi, geri bildirim bileşeni ve ucu). Toplam 281.

## [3.3.0] — 2026-11-25
### Eklendi
- Depolama katmanı: `Storage` arayüzü, `FileStorage` (varsayılan) ve `SupabaseStorage` (PostgREST/curl; secret anahtar yalnızca sunucuda). `PROPOS_STORAGE=file|supabase`; yanlış yapılandırma sessizce dosyaya düşmez, açık hata verir. `.env` yükleyici (`backend/env.php`; gerçek ortam değişkeni `.env`'yi ezer).
- Şema: `supabase/migrations/001_propos_init.sql` (RLS açık, politika yok; anon rol hiçbir şeye erişemez; `propos_keepalive()` yalnızca service_role).
- Realtime sinyali: kayıt sonrası sunucu `{rev, by}` yayınlar (veri taşımaz); kanal adı tahmin edilemez (HMAC); istemci bağımlılıksız Phoenix istemcisiyle dinler, bağlıyken yoklama 3 sn → 60 sn (gizli sekmede 120 sn), kopunca üstel geri çekilmeyle yeniden dener. `GET /api/realtime`.
- Keepalive: `GET /api/keepalive` (içeriksiz `{ok:true}`, yalnızca bu uçta CORS `*`, sıkı hız sınırı) ve `backend/cron/keepalive.php` (CLI); `.github/workflows/keepalive.yml`; `docs/CRON` içeriği `docs/SUPABASE.md` içinde.
- `CachedStorage`: yazma-geçişli yerel önbellek (Supabase'e her istek ≈0,45 sn; senkron GET 1,2 sn → 36 ms, kayıt 2 sn → 1 sn). Yazma önce uzağa, başarısızsa yerel kopya değişmez; `PROPOS_CACHE=0` kapatır, `PROPOS_CACHE_TTL` (varsayılan 900 sn). Uzak depoya tek curl bağlantısı yeniden kullanılır.
- `tools/migrate_to_supabase.php` (dosya → Supabase kopyalama, `--dry-run`, `--force`).
- Testler: keepalive (CORS, hız sınırı), realtime ucu, Supabase sözleşme/RLS suite'i (`--only supabase`, gerçek projede ZZTEST kayıtları açıp siler), Realtime istemcisi (10 test), paket içeriği (sır yok). Toplam 251 test (önbellek 7 + Supabase 8 gerçek proje testi ayrı).
### Değişti
- Testler gerçek `.env`'den yalıtıldı (`PROPOS_NO_DOTENV=1`, `PROPOS_STORAGE=file`).
- Müşteri paketine yeni sunucu dosyaları eklendi (Storage, env, Realtime); `.env` hiçbir koşulda girmez.
- `.htaccess`: `.env`, `.git`, `supabase/`, `docs/` dışarıya kapalı.

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
