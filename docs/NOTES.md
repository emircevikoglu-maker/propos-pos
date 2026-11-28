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

## Laravel'e geçiş (25 Kasım) — şimdilik hayır
- Maliyet yüksek: ~2000 satır PHP + 100 PHP testi Laravel'e taşınır; HTTP sözleşmesini ve güvenlik testlerini korumak ayrı bir iş.
- Hız kazancı küçük: darboğaz PHP çatısı değil; tam durum JSON'u okuma/yazma, dosya IO ve yoklama sıklığı. Bunlar Supabase (delta + realtime) ile kalkıyor. Laravel'in bu darboğazlara etkisi sıfır; yalnızca ORM/kuyruk/kimlik yardımcıları gelir.
- Supabase'e geçince PHP'de yalnızca kimlik/lisans/panel kalır (küçük yüzey) → Laravel'e değmeyebilir. Önce Supabase, sonra gerekirse karar.
- Not: php-fpm + OPcache ile (VDS) mevcut kod zaten `php -S` geliştirme sunucusundan çok hızlıdır; hız ölçümü o ortamda yapılmalı.

## Giydirme yaklaşımı (25 Kasım, 3.2.0)
- Prototip sıfırdan yazılmış tek sayfa; uygulama ise 9600 satır Tailwind. Sıfırdan taşımak özellik kaybı riski taşıyordu. Bunun yerine katmanlı giydirme: (1) tokenlar + `skin.css` mevcut sınıfları yeni tokenlara eşler, (2) yeni bileşenler (masa kartı, geri al, kutlama, üst çubuk) aynı veriyle yazılır, (3) kalan ekranlar kademeli taşınır (TODO P6).
- `.table`/`.ring` sınıfları Tailwind ile çakıştığı için `pp-table`/`pp-ring` oldu.
- Kutlama kararı saf fonksiyon (`pickProMoment`→`pickMoment`) ve test edildi; görsel sahneler `motion.js`'te.

## İnternet kesintisinde sunucu ne bilir, ne yapılır? (25 Kasım)
- Sunucu, restoranın internetinin koptuğunu DOĞRUDAN bilemez: kopan hat restoran ile sunucu arasında. Sunucu yalnızca "bu cihazdan haber gelmiyor" der (`lastSeen`). Kesintiyi asıl tespit eden istemcidir (başarısız istekler, Realtime soketinin düşmesi; `navigator.onLine` yalnızca ipucu, Wi-Fi bağlı ama internet yok durumunu bilmez).
- Veri girişi ENGELLENMEMELİ: satış durursa işletme zarar eder. Doğrusu çevrimdışıyken yerelde sürdürüp kuyruğa almak (outbox) ve bağlantı gelince idempotent göndermek. Engellenecek olanlar sunucu şart işler: PIN doğrulama, yeni cihaz eşleştirme, lisans yenileme.
- Sunucunun kendi tarafındaki kesinti (VDS ↔ Supabase): depo yazması başarısız → `503 STORAGE_DOWN`; istemci kuyruğa alır, okumalar yerel önbellekten sürer (CachedStorage zaten bunu sağlar).
- Asıl zor kısım çakışma: kesintide iki tablet aynı masaya yazarsa. Çözüm: adisyon satırları UUID'li ekleme olayı (birleşir), kapama/ödeme tek cihazda.
- Lisans: çevrimdışı tolerans (örn. 72 sa) — sunucu doğrulayamadı diye müşteriyi kilitleme.

## Yazıcı API'si (25 Kasım, en son yapılacak, çok önemli)
- POS modeli gönderir, ajan ESC/POS'a çevirir; böylece POS yazıcı markasından bağımsız kalır ve fiş şablonu tek yerde. Ajan localhost'ta, yalnızca POS kökenine açık, eşleştirme anahtarlı. Mali belge (e-Arşiv/ÖKC) ayrı bir adaptör arayüzü (P1-c); adisyon/mutfak fişi mali belge DEĞİL.
- Gerekli bilgi: yazıcı marka/model, 58/80 mm, USB/ağ/Bluetooth, mutfak/bar ayrı mı (Açık sorular).

## Önbellek kararı (25 Kasım)
- Ölçüm: Supabase'e her istek ≈0,45 sn (bağlantı yeniden kullanımıyla bile); senkron GET 2 uzak okuma = 1,2 sn. Çözüm: PHP tek yazıcı olduğu için yazma-geçişli yerel önbellek. Çok sunuculu kurulumda önbellek TTL'si yanlış okuma riski taşır (TTL kısaltılır ya da Realtime sinyaliyle geçersiz kılınır).

## Çevrimdışı mimarisi (3.5.0, 25 Kasım)
- Katmanlar: IndexedDB (yerel gerçek) → eşitleme motoru (dirty bayrağı + taban) → sunucu (baseRev ile iyimser eşzamanlılık). Her yerel değişiklik ÖNCE kalıcı depoya yazılır (çökmeye karşı), sonra gönderilir.
- Neden "olay kuyruğu" değil de "durum + üç yönlü birleştirme": mevcut veri modeli tam durum; olay-tabanlı outbox için sunucu tarafında defter tablosu ve sayfalama gerekir (P2-b). Birleştirme bugünkü modelde en az değişiklikle doğru sonucu verir: defterler kimlikle birleşir, sayaçlar delta, varlıklar alan alan.
- Taban (base) = sunucunun bildiğimiz son durumu. Taban olmadan (ilk eşitleme) "boş liste dolu listeyi ezmez" kuralı geçerli.
- Güvenlik: depo erişilemezken sunucu "kayıt yok" sanıp üzerine yazmaz (`StorageUnavailable` → 503); `baseRev` yarışları 409'a çevirir.
- HTTPS kısıtı: service worker ve "uygulamayı yükle" yalnızca güvenli bağlamda. LAN'daki `http://192.168.x.x` tabletlerinde çevrimdışı ÇALIŞMA vardır (sayfa açıkken, IndexedDB), ama kapatıp çevrimdışı yeniden açma yoktur. Çözüm: yerelde bile HTTPS (örn. Caddy ile yerel sertifika) ya da VDS'te HTTPS + tablet bulut adresinden açar.
- Tarayıcı veri silme riski: `storage.persist()` istenir; kurulu PWA'da genellikle verilir. Safari kurulu olmayan sitenin verisini 7 gün kullanılmazsa silebilir → iOS'ta PWA olarak kurmak önerilir; ayrıca sunucuda zaten kopya var (son güvence).

## ÇOK ÖNEMLİ — Çevrimdışıyken birden fazla çalışan (28 Kasım)
- IndexedDB cihaza ve tarayıcıya özeldir (çerez gibi, köken başına). İki telefon aynı veritabanını PAYLAŞAMAZ; veri bir cihazdan diğerine yalnızca sunucu üzerinden gider. İnternet yokken cihazlar birbirini görmez.
- Kural (kullanıcıya söylenecek): internet gidince tek cihaz (kasa PC'si) kullanılır. Mobil veriyle bağlanan telefon zaten çevrimiçidir; tek telefonla da sipariş alınabilir.
- Risk: kesintide ikinci cihaz da sipariş alırsa bağlantı gelince birleşir (satışlar kimlikle, masa alanları alan alan), ama AYNI MASAYI iki cihaz kapatırsa çift satış olabilir (P2-d). Çevrimdışı uyarısı bu kuralı ekranda söylemeli; ileride: aynı LAN'daki cihazları yerel sunucu üzerinden eşitlemek (topoloji A) ya da kapanışta çakışma uyarısı.

## Tailwind kalır (28 Kasım)
- Kullanıcı sorusu: "Tailwind'i niye kaldırıyorsun, tasarım için iyi değil mi?" Cevap: iyi; sorun Tailwind değil iki ayrı tasarım dilinin (eski Tailwind renkleri + prototip tokenları) yan yana yaşamasıydı. Karar: Tailwind kalır, teması `ui.css` CSS değişkenlerine bağlanır; kaldırılacak olan yalnızca `skin.css` (eski sınıfları zorla yeniden boyayan geçici katman).

## Kullanıcı tabanlı giriş (28 Kasım)
- Kullanıcı: "token üretme olayı çok garip, olmaz; genel veritabanından ben kullanıcı ekleyeceğim." Cihaza bağlantı anahtarı yazdırmak (eşleştirme) kalkıyor; kurucu panelden kullanıcı adı + parola tanımlar. İçeride yine imzalı oturum belirteci var ama kullanıcı görmez/üretmez (her web uygulamasındaki oturum çerezi gibi). Çapraz köken (Vercel ↔ Linux arka uç) olduğu için çerez yerine başlık + localStorage: üçüncü taraf çerez engelleri (Safari ITP) oturumu bozmasın.

## Kısa parola (28 Kasım, 3.9.1) — tehlike notu
- Kullanıcı `pickys`/`emir` için 4 haneli parola istedi. Panel/API en az 8 ister; komut satırı aracı `--allow-short` ile 4-7'ye izin verir (4 altı hiçbir yoldan yok).
- Risk: 4 hane = 10.000 olasılık. Giriş sınırı IP başına 10 dk'da 8 hata; tek IP'den ~2 ay sürer ama dağıtık denemede (çok IP) günler içinde düşebilir. Sunucu internete açılmadan önce bu iki parola uzatılmalı (`php backend/users.php passwd <kullanici> <yeni>`) ya da kullanıcı başına kilit (P8) eklenmeli. Tehlikeli sayılmadı çünkü yerel veri + kullanıcının açık isteği; bilgi olarak düşüldü.

## Fikir dosyası konumu
- Kullanıcı "idea/ideas.md" dedi; dosya `docs/IDEAS.md`'de (tek kaynak, ikinci kopya açılmadı).

## Açık sorular (kullanıcıya)
1. Yazıcı: marka/model, 58 mm mi 80 mm mi, bağlantı (USB/ağ/Bluetooth), mutfak ve bar ayrı yazıcı mı? (3.10 tarayıcı baskısı bunu beklemez; P1-b ajanı bekler.)
5. Mali müşavir teyidi: adisyon (bilgi fişi) ibaresi ve zorunluluğu, e-Arşiv mi ÖKC mi (3.10 plan 5. bölüm).
2. Altyapı: Supabase denemesi yapılsın mı, yoksa PHP VDS'te kalıp PDO (SQLite/MySQL) mı?
3. "Personele özel hizmet" ne demek: personel başına görünüm mü, prim/hedef takibi mi, müşteri tarafı mı?
4. Hedef ölçek: onlarca mı yüzlerce işletme mi (altyapı ve fiyat kararını etkiler)?

## 3.5.x geri bildirim analizi (25 Kasım, kullanıcı incelemesi sonrası)
1. Tasarım: "giydirme" yaklaşımı yanlıştı. Prototip yeniden yazım değil bir düzen ve hareket dili; ben yalnızca renk/yazı tokenlarını taşıyıp eski ekranları o renklerle boyadım. Sonuç: tarayıcıda doğrulandı — adisyon paneli tek sütunda garson seçici + kalemler + indirim + 5 ödeme yöntemi; katalog kırpılmış adlarla; boş yer yok ama anlaşılırlık da yok. Karar: P12 (prototip BİREBİR, ekran ekran yeniden yazım). Kullanıcı gerekçesi: boş yer olmayan ekranda yeni kullanıcı öğrenme vakti harcamaz, verim ve uzun vadeli satış düşer.
2. Yönlendirme: `react-router-dom` hiç eklenmemiş; `activeTab`/açık masa `useState`. Geri tuşu sayfadan çıkarıyor. P13.
3. Çevrimdışı: "IndexedDB anlamsızlaştı" eleştirisi iki doğrulanmış nedene dayanıyor: yönetici PIN'i yalnızca sunucuda doğrulanıyor (çevrimdışıyken Analiz/Çalışan/Ciro/Yönetim kilitli, tıklayınca bile geri bildirim yok); düz http LAN'da service worker çalışmıyor, pencere kapanınca sunucu kapalıyken uygulama yeniden açılmıyor. Tam "pencere kapanana kadar devre dışı" yeniden üretilemedi; kullanıcıdan adım istendi. P14.
4. Lisans/çevrimdışı gerilimi gerçek: istemci geri sayımı JS ile aşılır (kullanıcı haklı). Kabul edilen model: sunucunun imzaladığı süreli kira + gerçek zorlama sunucuda; dürüst sınır belgelenir (P14).
5. Süreç dersi: "bitti" işaretlerim kullanıcının gördüğü sonuçla örtüşmedi çünkü kabul ölçütüm test sayısıydı, ekran görüntüsü değil. Bundan sonra görsel işler için kabul ölçütü: prototip ile yan yana ekran görüntüsü + dört çözünürlük.
