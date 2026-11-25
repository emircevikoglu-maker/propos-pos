# ProPos — Notlar ve kararlar

Kaynak: önceki oturumlar (`.chat-backup.md`) + 24 Kasım 2026 oturumları. Yapılacaklar `TODO.md`'de, yapılanlar `CHANGELOG.md`'de.
Bu dosya "neden" sorusunun cevabıdır: karar, gerekçe, açık soru.

## Kullanıcı / çalışma biçimi
- Deneyimli geliştirici; Türkçe, teknik, nüanslı yanıt; az bold. Sonuçtan tersine mühendislik yapar (ping-pong'u DevTools'ta istek boyutundan yakaladı: 9 KB → 67 KB).
- Token tasarrufu: ağır düşünme dışındaki token-yüklü işler önce plana ve kayda dökülür, sonra (gerekirse ayrı oturumda / ucuz modelde) uygulanır.
- Fikir önermekten çekinme; "yap" denirse yap, iyi fikirse ekle.
- Test sürüşü 25 Kasım: yalnızca deneme; acele yok.

## Kararlar (geçerli)
| Konu | Karar | Gerekçe |
|---|---|---|
| Backend | Şimdilik PHP, kendi VDS'imiz. Dil değişebilir → API sözleşmesi sabit, iş mantığı servislerde | Esneklik; Supabase değerlendirmesi açık (aşağıda) |
| Kontrol paneli | Ayrı giriş noktası + ayrı paket + ayrı port/alan adı; müşteri paketinde yok | İptal edilen müşteri paneli bilmemeli |
| Sürüm satışı | Tek kod tabanı + tenant başına özellik bayrağı; "0.5/0.7" paket adı, dal değil | Beş dalda yama cehennemi olmasın |
| Adalet çizgisi | Güvenlik/hata düzeltmesi, yasal zorunluluk, temel satış döngüsü herkese ücretsiz | Taahhüt kilit algısı oluşmasın |
| Teklif/popup | Bağlama göre, haftada ≤1, kapatılabilir, POS ekranında ASLA | Çalışanın işi bölünmesin |
| Hız sınırı | Token bucket; yoklama ve eylem ayrı kova; 429 + Retry-After 30; nazik uyarı | Bant genişliği; tablet garsonu engellemesin |
| Giriş | Cihaz eşleştirme → oturum → sunucuda yönetici PIN'i | v3.1'de uygulandı |
| Fiş | Adisyon/mutfak fişi mali belge değil; mali belge = ÖKC ya da e-Arşiv entegratörü | Hukuki karışıklık olmasın |
| Testler | Her değişiklikte `npm test`; normal + saldırgan; Python koşucu PHP ve React'i çağırır | Kullanıcının açık isteği |

## Teknik notlar
- Senkron bugün whole-state: her değişiklik tüm durumu POST eder, değişiklikte diğer cihazlar tümünü indirir. Satışlar sınırsız büyür (≈317 B/satış). localStorage ≈5 MB → birkaç ayda dolar. Kalıcı çözüm: katalog / canlı operasyon / defter ayrımı + delta + IndexedDB (TODO P2).
- Base64 görsel JSON'da (logo 6,8 KB) → ayrı varlık, WebP, hash'li URL, immutable cache.
- Çakışma: CRDT gereksiz; satış = değişmez olay (istemci UUID, sunucu idempotent); masa/adisyon = varlık başına rev + If-Match.
- Lisans gerçekçiliği: kod müşterideyse `if (!licenseOk)` silinebilir. Asıl koruma: müşterinin ihtiyaç duyduğu şeyi bizim sunucuda tutmak (bulut yedek, çok cihaz, rapor, güncelleme). İptalde salt-okunur mod (KVKK veri taşınabilirliği).
- Yazıcı: VDS restoran LAN'ındaki yazıcıya ulaşamaz. Sıra: tarayıcı yazdırma (58/80 mm `@page`) → yerel ajan (ESC/POS, sessiz baskı, çekmece, çoklu yazıcı) → e-Arşiv API → ÖKC SDK'ları (PAVO vb.).
- Yoğunluk uyarısı (AI'sız): gün × 15 dk dilim, son 4-8 hafta azalan ağırlık, medyan + MAD, küçük sayılarda Poisson %95 üst sınır; mod kullanılmaz. Soğuk başlangıç ~4 hafta. Özel günler işaretlenir. Reaktif + proaktif (asıl değer proaktifte). Yalnızca sahip/müdüre.
- UX ilkeleri: Fitts/Hick, mekânsal hafıza (ızgara yer değiştirmez), onay yerine 5 sn geri al, iyimser arayüz, ince mikro etkileşim, kademeli gösterim, kişisel pozitif oyunlaştırma (liderlik tablosu varsayılan kapalı), ilk dokunuşta 3 adımlı tur.

## "API'yi patlatan rate limit" teşhisi (24 Kasım, düzeltildi)
1. Her state değişikliği (tuş vuruşu dahil) anında tam durum POST ediyordu → eylem kovası doluyor → 429 → 30 sn kilit. Çözüm: gönderim kuyruğu (600 ms debounce, en geç 3 sn).
2. Veri sıfırlanınca / anahtar yenilenince cihazdaki eski anahtar her 2 sn'de `/api/login` deniyordu → 8 hatada IP 10 dk kilit, kurucu paneli dahil. Çözüm: reddedilen anahtar bir daha denenmez ve silinir; POS ve panel girişleri ayrı sayaçta; giriş 429'u yoklamayı da durdurur.
3. Gizli sekmede de 2 sn yoklama. Çözüm: görünürde 3 sn, gizlide 30 sn, görünür olunca hemen.
4. Veri sıfırlanınca PIN yok → Ayarlar PIN arkasında → kilitlenme. Çözüm: PIN penceresinde ilk PIN'i iki kez yazarak belirleme.

## Fikir değerlendirmesi: Supabase + Vercel + PWA (24 Kasım, karar bekliyor)
Artıları
- Realtime (Postgres değişiklik akışı) → yoklama/long-poll derdi biter; mutfak ekranı, çok cihaz anlık.
- Postgres + RLS: tenant izolasyonu veritabanı seviyesinde (bugün PHP'de elle).
- SaaS modeline doğal geçiş: kod ve veri bizde → lisans iptali anında etkili (müşteri ZIP'i biter).
- Vercel: panel ve PWA'nın statik barındırması, cron (Hobby planda günde bir; keepalive + günlük yedek için yeterli).

Nüanslar / riskler
- Free plan, 1 hafta etkinlik olmazsa projeyi duraklatır; cron ile ping çözüm ama üretim verisini free planda tutmak riskli (yedek, SLA yok). Plan limitleri değişebilir; karar anında güncel fiyat/limit doğrulanmalı.
- KVKK: Supabase bölgesi yurt dışı (ör. Frankfurt) → kişisel veri yurt dışına aktarım. Açık rıza / standart sözleşme gibi yükümlülükler doğabilir; müşteri verisi (cari, telefon) var. Hukuki görüş alınmalı.
- Kimlik modeli taşınmalı: cihaz eşleştirme → Edge Function anahtarı JWT'ye (tenant claim) çevirir; PIN/rol → RLS politikaları + custom claims. Bugünkü PHP testlerinin mantığı (çapraz tenant, yetki yükseltme) RLS testlerine taşınmalı.
- Vercel serverless uzun bağlantıya uygun değil; realtime Supabase'ten gelir, sorun değil.
- PHP backend'e yapılan yatırım (testler dahil) kısmen boşa gider; ama sözleşme/test senaryoları aynen geçer.

Çevrimdışı (internet kesilince) — IndexedDB güvenilir mi?
- Yeterince güvenilir, şu koşullarla: `navigator.storage.persist()` istenir (kurulu PWA'da Chromium genelde verir), uygulama PWA olarak kurulur (Safari kurulmamış sitelerin verisini 7 gün kullanılmazsa silebilir; kurulu PWA muaf), kota `navigator.storage.estimate()` ile izlenir.
- Desen: outbox (gönderilecek olaylar kuyruğu) + istemci UUID + sunucuda idempotent kabul. Satış asla "son yazan kazanır"a bırakılmaz.
- Background Sync API yalnızca Chromium; diğerlerinde `online` olayı + periyodik deneme.
- Ek güvence: günlük yerel yedek dosyası (File System Access API, Chromium) ya da indirme.
- Kütüphane: Dexie (IndexedDB sarmalayıcı) hafif ve yeterli. Supabase ile hazır offline-first senkron katmanları da var (ör. PowerSync); maliyet/limitleri ayrıca değerlendirilmeli.
- Yerel program (mock API / ajan) fikri: tek başına offline için gereksiz, ama sessiz yazdırma ve çekmece için zaten bir yerel ajan gerekecek (P1-b). O ajan opsiyonel olarak dayanıklı yerel kuyruk (SQLite) da tutabilir: iki ihtiyaç tek kurulumda.

Önerim: Önce P2'nin istemci yarısını (IndexedDB + outbox + PWA) backend'den bağımsız yap; bu her iki yolda da lazım. Ardından 1-2 günlük bir Supabase denemesi (spike): bir tenant, satış olayları, RLS, realtime, keepalive cron. Sonuca göre PDO (P3) ya hiç yapılmaz ya da PHP'de kalınırsa yapılır.

## Fikir #2: Duolingo tarzı kutlama ekranları + panelin sıfırdan tasarımı
- Ayrı tasarım/prototip olarak yapılacak, projeye karıştırılmayacak; onay gelirse opsiyonel modül olarak eklenecek (ayar: "kutlamalar açık/kapalı", azaltılmış hareket tercihine uyar).
- Performans kuralları (PWA, zayıf tabletler): yalnızca `transform`/`opacity` animasyonu (kompozitör), Web Animations API / CSS; ağır kütüphane yok ya da lazy; `prefers-reduced-motion`; konfeti için tek canvas + requestAnimationFrame, parçacık sayısı cihaz gücüne göre; animasyon ≤ 600 ms, iş akışını asla bloklamaz; yoğun saatte (yüksek sipariş hızı) kutlamalar otomatik sadeleşir.
- Kutlama anları (anlamlı olanlar): gün içindeki ilk satış, kişisel rekor, hedefe ulaşma, Z raporu kapanışı, stok sayımı bitti, hatasız 50 sipariş serisi. Her satışta değil (yorar).
- Sesli geri bildirim isteğe bağlı, varsayılan kapalı.

## Açık sorular (kullanıcıya)
1. Yazıcı: marka/model, 58 mm mi 80 mm mi, bağlantı (USB/ağ/Bluetooth), mutfak ve bar ayrı yazıcı mı?
2. Altyapı: Supabase denemesi yapılsın mı, yoksa PHP VDS'te kalıp PDO (SQLite/MySQL) mı?
3. "Personele özel hizmet" ne demek: personel başına görünüm mü, prim/hedef takibi mi, müşteri tarafı mı?
4. Hedef ölçek: onlarca mı yüzlerce işletme mi (altyapı ve fiyat kararını etkiler)?
