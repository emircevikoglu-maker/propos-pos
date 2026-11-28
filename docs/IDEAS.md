# ProPos — Fikirler ve öneriler

Kural: fikir iş sırasında araya sokulmaz, burada toplanır; onaylanan fikir `TODO.md`'ye plan olarak girer (kimlik: İ-n).
Durum: `[ ]` öneri, `[→]` TODO'ya alındı, `[x]` yapıldı, `[✗]` vazgeçildi. Gerekçeli kararlar `docs/NOTES.md`'de.
Son güncelleme: 28 Kasım 2026 (3.9.1). İ-3 kampanya motoru ve İ-12 yerel QR 3.10 planına alındı.

## 1. Ürünü satılabilir yapan şeyler (en yüksek değer)
- [→] İ-1 Yazıcı ajanı (P1): satış anında ilk sorulan şey "fiş çıkıyor mu". Ajan localhost'ta, POS ESC/POS değil sade bir fiş modeli gönderir; marka bağımsızlığı bu sayede. Mali belge (e-Arşiv/ÖKC) ayrı adaptör; ilk sürümde yalnızca bilgi fişi + mutfak fişi.
- [→] İ-2 HTTPS kurulum rehberi (P2-d): PWA ve çevrimdışı açılış buna bağlı. Yerelde Caddy + yerel sertifika, bulutta otomatik sertifika. Rehber olmadan "çevrimdışı çalışıyor" iddiası tabletlerde boşa çıkar.
- [→] İ-3 Kampanya / happy hour motoru (P7): saat + gün + ürün/kategori + %/tutar. Temel pakette olmalı; maliyeti yok, satış argümanı güçlü.
- [ ] İ-4 Kurulum sihirbazı + demo veri: ilk açılışta "kafe / restoran / bar" seç → hazır menü, masa düzeni, çeşit grupları. İlk 10 dakika deneyimi satışı belirler.
- [ ] İ-5 Patron özeti mesajı (PWA/WhatsApp/e-posta): gün sonu tek ekran — ciro, kâr tahmini, en çok satan, atık, kasa farkı. Patron POS'a girmez, özet ona gelir; sürekli kullanım ve yenileme sebebi.

## 2. Güven ve veri bütünlüğü
- [→] İ-6 Aynı masada iki cihaz çevrimdışı kapadı → çift satış uyarısı + tek tıkla birleştirme (P2-d). Şu an bilinen tek gerçek veri riski bu.
- [ ] İ-7 "Veri sağlık" ekranı (yönetici): son başarılı senkron, bekleyen değişiklik sayısı, cihaz `lastSeen`, depolama kotası, son yedek. Sorun olunca telefonda "bende var" dedirtmeyin.
- [ ] İ-8 Z raporu + gün sonu kilidi: kapanıştan sonra o günün satışı değiştirilemez (düzeltme = ters kayıt). Muhasebe ve denetim güveni.
- [ ] İ-9 Yedeği geri yükleme provası: yılda iki kez otomatik "yedekten kurtarma" testi (geçici dizine aç, şema doğrula). Yedek var ama hiç denenmemişse yedek yok demektir (TODO P8'de).
- [ ] İ-10 Satış defterini ayrı tabloya al (P2-b): tam-durum gönderimi büyük işletmede darboğaz; ayrıca gerçek olay kuyruğunun ön koşulu.

## 3. Operasyon / saha
- [ ] İ-11 Mutfak ekranı (KDS): tablet + sipariş durumları (yeni/hazırlanıyor/hazır); fiş yazıcıya alternatif ve yazıcı arızasında yedek.
- [ ] İ-12 Müşteri ekranı + QR menü: aynı veriden salt okunur; QR'ı yerelde üret (şu an adres 3. tarafa gidiyor — güvenlik borcu P8).
- [ ] İ-13 Yoğunluk uyarısı (AI'sız): (gün, 15 dk) bazında medyan + MAD; "normalin 1,6 katı" gibi açıklanabilir mesaj. Soğuk başlangıç ~4 hafta; o sürece "veri toplanıyor" göster.
- [ ] İ-14 Personel performansı + hedefler: garson başına satış/ortalama adisyon; kutlama sistemiyle bağlı ("günün rekoru"). Sıralama tablosu yerine kişisel rekor — rekabet değil motivasyon.
- [ ] İ-15 Stok tahmini: reçete + son 4 haftanın tüketiminden "X, Y gün yeter"; minimum stok yerine kalan gün gösterilsin.
- [ ] İ-16 Tedarikçi siparişi: eksik malzemeleri tedarikçiye göre gruplayıp tek tıkla WhatsApp metni üret.

## 4. Mimari / kod sağlığı
- [ ] İ-17 `PosContext` bölünmesi (katalog, masalar, satışlar, ayarlar) — şu an ~1100+ satır; yeni özellik hızını düşürüyor.
- [ ] İ-18 Kimlikler `Date.now()` yerine UUID: çok cihazlı birleştirme artık buna yaslanıyor (çakışma ihtimali sıfıra yakın ama sıfır değil).
- [ ] İ-19 Background Sync (Chromium) + sekme kapalıyken gönderim; iOS'ta desteklenmez, o yüzden "ana ekrana ekle" yönergesi şart.
- [ ] İ-20 Supabase'e sunucu tarafı denetim/kota sayaçları taşıma: şu an kovalar ve audit yerel diskte; çok sunuculu kurulumda paylaşılmaz.
- [ ] İ-21 Laravel/Edge Function kararını Supabase oturunca yeniden ölç (P11): darboğaz PHP çatısı değildi.

## 5. Ticari
- [ ] İ-22 Paket mantığı: maliyetsiz özellikler temelde (çevrimdışı, çeşitler, kampanya, barkod, raporlar); sürekli maliyetli olanlar (SMS, e-Arşiv, bulut yedek geçmişi, çoklu şube) ücretli.
- [ ] İ-23 İlk 10-20 işletme: indirim karşılığı haftalık 15 dk geri bildirim görüşmesi + referans izni; uygulama içi geri bildirim butonu hazır, panelde sekmeli listeleme eksik (P7b).
- [ ] İ-24 Satış sonrası: kurulum + donanım (tablet, yazıcı, çekmece) paketi ayrı fiyat; yıllık peşin indirimi.

## 6. Yeni fikirler (28 Kasım, 3.9.1)
- [→] İ-25 İptal kaydı + "gönderildikten sonra iptal" vurgusu (3.10 C): kaçağın bir numaralı göstergesi; neden çipleri tek dokunuş.
- [→] İ-26 "Gönder (n)" düğmesi + yalnızca yeni satırları basan mutfak fişi (3.10 B): `sentQty`.
- [ ] İ-27 Kullanıcı başına giriş kilidi + parola gücü göstergesi: IP'ye bağlı sınır dağıtık denemeye yetmez (kısa parola notu, NOTES).
- [ ] İ-28 Personel hızlı geçişi: aynı tablette 4 haneli personel PIN'i ile "kim çalışıyor" değişir; giriş (işletme) ile personel (kişi) ayrılır. Satış/iptal kişiye yazılır (3.11).
- [ ] İ-29 Masa birleştir / ayır: iki masayı tek adisyonda topla; adisyonu ürün ürün böl ("Böl" şu an eşit pay). Kafe/restoranda en sık istenen ikinci işlem.
- [ ] İ-30 Ürün bazlı bölüşük ödeme: ödeme penceresinde satır seç → o satırları öde (kısmi ödeme kaydı satır kimliğiyle).
- [ ] İ-31 Sık not şablonları işletmeye özel: "Acele / Az buzlu / Paket" sabit değil, Yönetim'den düzenlenir; ürün kategorisine göre farklı çipler.
- [ ] İ-32 Tükendi işareti: ürün kartında tek dokunuşla "bugün yok" (stok reçetesinden bağımsız), QR menüye de yansır.
- [ ] İ-33 Gün sonu kontrol listesi: Z öncesi "açık masa var / kasa sayılmadı / gönderilmemiş satır var" uyarıları tek ekranda.
- [ ] İ-34 Çevrimdışı çok cihaz koruması: çevrimdışıyken ikinci cihaz masa kapatmak isterse "çevrimdışı — bu masayı yalnızca kasa kapatsın" uyarısı (NOTES "ÇOK ÖNEMLİ").
- [ ] İ-35 Kurulum sihirbazının panel tarafı: yeni işletme + ilk sahip kullanıcısı + menü şablonu tek formda (şu an işletme ve kullanıcı ayrı adım).
- [ ] İ-36 Ayın raporu e-postası/PDF (patron): ay sonu ciro, kâr, en iyi/zayıf ürün, iptal oranı; tarayıcıda PDF'e yazdır yeterli başlangıç.
- [ ] İ-37 Menü fiyat toplu güncelleme: kategoriye % artış (enflasyon ortamında haftalık ihtiyaç), önizleme + geri al.
- [ ] İ-38 Müşteri sadakat (basit): telefonla kayıt, 10 kahveye 1 ikram; ücretsiz temel paket özelliği olabilir, yemek platformlarına karşı doğrudan müşteri bağı.
- [ ] İ-39 Erişilebilirlik ve büyük yazı modu: yaşlı esnaf/garson için tek ayarla %115 ölçek (tokenlar zaten değişkenle).
- [ ] İ-40 Hata görünürlüğü: istemci hatalarını (window.onerror) sunucuya özet olarak gönder, panelde listele; pilotta "bende çalışıyor" tartışmasını bitirir (İ-7 ile).

## Dürüst notlar
- En büyük risk özellik eksikliği değil, saha doğrulaması: gerçek bir işletmede iki tablet + bir yazıcıyla bir hafta çalışmadan hiçbir senkron/çevrimdışı varsayımı kanıtlanmış sayılmaz. Önce küçük bir pilot.
- Test sayısı yüksek (360+) ama hepsi bizim senaryolarımız; pilotun getireceği "beklenmedik" ilk sürümde hep olur. Geri bildirim butonu ve veri sağlık ekranı (İ-7) bu yüzden erken değerli.
- Kapsam şişmesi tehlikesi: KDS, QR menü, masadan sipariş birlikte düşünülünce ikinci bir ürün olur. Sırayla ve her biri ayrı karar olarak.
