# ProPos tasarım prototipi

Panelin sıfırdan tasarımı + Duolingo tarzı kutlama anları. Mevcut uygulamaya (`src/`, `backend/`) dokunmaz, ondan hiçbir şey içe aktarmaz. Onay gelirse opsiyonel modül olarak taşınır (aşağıda "Uygulamaya ekleme").

## Açma

Derleme yok, ağ yok, bağımlılık yok. `index.html`'i tarayıcıda doğrudan açın (`file://` çalışır; klasik `<script>`, ES modülü yok). İsterseniz:

```powershell
python -m http.server 8599 --directory design-prototype
```

| Sayfa | Ne var |
|---|---|
| `index.html` | POS: masalar → adisyon → ürün → çeşit → ödeme; patron görünümü; ayarlar |
| `kutlamalar.html` | Tüm kutlama anları, kademeler, koşullar (yoğun saat, hareket, cihaz gücü), karar günlüğü, FPS ölçer, mikro etkileşim oyun alanı |

Derin bağlantılar (inceleme kolaylığı): `index.html#masa=S2`, `index.html#patron` (PIN'i atlar), `kutlamalar.html#oynat=zReport` (`firstSale`, `goal`, `record`, `streak`, `bigTicket`, `stockCount` da olur).

### 3 dakikalık tur
1. Masa 2 → Caffè Latte → Yulaf sütü + Ekstra shot → Ekle (ürün adisyona uçar, sayaç sıçrar, ürün karosunda adet rozeti belirir).
2. Ödeme → Nakit → ₺700 → para üstü anında → Ödemeyi al. Ciro hedefi geçer: afiş + konfeti. Altta 5 sn "Geri al" çubuğu.
3. Bir masayı daha kapatın: seri bir artar (25'in katlarında tost).
4. Patron → herhangi 4 hane → yoğunluk, önden haber, menü mühendisliği, günün hikâyesi. En altta "Basılı tutun: Günü kapat" → kutlama ekranı → yeni gün başlar.
5. Herhangi bir masadan ödeme → "Günün ilk satışı" afişi.
6. Ayarlar → "Yoğun saati simüle et" açıkken aynı anlar tosta iner; Hareket → Azalt ile konfeti ve uçuşlar kaybolur, yalnız solma kalır.

## Tasarım kararları

Ana fikir: kasada çalışanın işi hızlı ve sessiz akar; ödül duygusu "işi bitirmenin" doğal sonucu olarak, seyrek ve kişisel gelir. Patron tarafı ise "neden"i gösterir (açıklanabilir sayılar), süs değil.

POS
- Mekânsal hafıza: ürün ızgarası her kategoride sabit sıradadır; popülerliğe göre yer değiştirmez. Popülerlik yalnızca patron görünümünde (menü matrisi) ve ürünü sabit konumda bırakan bir adet rozetiyle (o adisyondaki adet) görünür.
- Hick: kategoriler solda tek sütun (en fazla 5-7). Çeşit penceresinde zorunlu gruplar ön seçili gelir (Boy = Orta, Servis = Bardak): sık sipariş "ürün → Ekle", iki dokunuş. İsteğe bağlı gruplar ikinci dokunuşta seçimi kaldırır.
- Fitts: birincil eylemler sağ altta ve 56 px; ödeme yöntemi karoları 72 px; tüm dokunma hedefleri ≥ 44 px.
- Onay penceresi yok: satır silme ve masa kapatma anında olur, 5 sn geri alınabilir (tek çubuk; yenisi gelince önceki kalıcılaşır). Geri alınamayan tek eylem Z raporu: modal yerine 600 ms basılı tutma (klavyede Enter).
- İyimser arayüz: sayılar, rozetler, hedef çubuğu anında güncellenir; üstteki nokta "Kaydediliyor → Kaydedildi" ile senkronu ayrıca gösterir.
- Masa kartı: tutar en büyük öğe; köşedeki zaman halkası (90 dk = tam tur) masanın ne kadardır açık olduğunu bakışta söyler; 60 dk+ uyarı rengine döner. Halka statik `conic-gradient`, dakikada bir yeniden çizilir; animasyon değildir.
- Kademeli gösterim: adisyon satırına dokununca adet/not/sil araçları açılır; hızlı notlar çip (Acele, Az buzlu, Paket) — klavye yok.
- "Gönder (n)": mutfağa/bara gitmemiş adet sayısını gösterir (P1-a'daki `printedQty` fikrinin arayüzü).
- Dar ekran (< 900 px): gezinme alta iner, adisyon alttan açılan sayfa olur, altta "n ürün · toplam" çubuğu.

Patron
- KPI'lar: ciro (geçen haftanın aynı günü kıyası + hedef çubuğu), brüt kâr ve marj (ürün maliyeti düşülmüş, sabit gider hariç — etikette açıkça yazar), ortalama adisyon, şu an açık tutar.
- Yoğunluk: 15 dk dilimler; bugün (dolu), tahmin (taralı), tipik (4 hafta medyanı, çizgi), "şimdi" çizgisi. Normalin 1,35 katını aşan dilimler uyarı rengi.
- Önden haber: NOTES'taki AI'sız yoğunluk planının arayüzü. Mesaj açıklanabilir: kaç kat, kaç sipariş, ne yapılmalı, neden ("son 4 cumanın aynı saatleri + bugünkü gidiş + takvimde işaretli maç").
- Menü mühendisliği (Kasavana–Smith): satış adedi × adet başı kâr; Yıldız / Beygir / Bilmece / Zayıf. Altında iki somut öneri (Bilmece'yi öne al; Beygir'e ₺5 → günlük ek kâr). Yükseltme/satış teklifi yok (NOTES: POS ekranında asla; burada da yalnızca işletmenin kendi verisinden öneri).
- Günün hikâyesi: ilk satış, zirve, en büyük adisyon, seriler — kutlamaların kalıcı izi. Kutlama anında kaçırılsa bile burada görülür.
- Hedef serisi: son 28 gün, bugün çerçeveli. Ekip: liderlik tablosu varsayılan kapalı; kapalıyken yalnızca "aktif" gösterilir.

Oyunlaştırma
- Kişisel ve pozitif: kimse başkasıyla kıyaslanmaz (ayar açılmadıkça). Kayıp/ceza dili yok; seri kırıldığında mesaj gösterilmez, sayaç sessizce sıfırlanır (uygulamada: iptal/void/düzeltme; prototipte kırılma senaryosu yok).
- Kişisel seri Z raporuyla sıfırlanmaz, günler arası sürer (Duolingo mantığı); günlük sayaçlar sıfırlanır.

## Kutlama politikası (`PPCelebrate`)

| Kademe | Görünüm | Anlar | Süre |
|---|---|---|---|
| 0 mikro | basılma ölçeği, sayaç sıçraması, uçuş, parlama | her dokunuş | 120–440 ms |
| 1 tost | üstte hap, dokununca kapanır | seri (25'in katları), en büyük adisyon | 2,6 sn görünür |
| 2 afiş + konfeti | ekranı kapatmayan kart, altındaki her şey tıklanır | ilk satış, hedef, rekor, stok sayımı | 3,4 sn görünür |
| 3 kutlama ekranı | tam ekran, her dokunuş / Esc / Enter kapatır | yalnızca Z raporu | kullanıcı kapatana dek |

Karar kuralları (`resolve()`, saf fonksiyon; karar günlüğünde gerekçesiyle görünür):
1. Satış başına en fazla bir kutlama; öncelik: ilk satış > hedef > rekor > en büyük adisyon > seri.
2. "Günde bir kez" anlar (ilk satış, hedef, rekor) ikinci kez çıkmaz.
3. Yoğun saat (10 dk'da 8+ ödeme ya da elle) → kademe 2 tosta iner, konfeti yok.
4. 90 sn içinde ikinci büyük an → tosta iner. Kuyruk: afiş ya da ekran açıkken gelen büyük an (ör. afişten hemen sonra Z) sıraya girer (en fazla 3).
5. Kutlamalar kapalı → hiçbir şey; yalnızca Z raporu sade bilgi tostu olarak çıkar (işlevsel bilgi).
6. `prefers-reduced-motion` ya da ayar "Azalt" → konfeti ve hareket yok, yalnızca solma; içerik aynı.
7. Ses varsayılan kapalı; açılırsa dosya yok, WebAudio ile 2-3 kısa nota.

Mesaj sesi: başlık önü "Müthiş! / Harika! / Süper! / Bravo! / Efsane!" (rastgele), anlara özel "Günaydın!", "Rekor!", "Gün kapandı". Alt satır her zaman somut bilgi taşır (masa, tutar, saat) — kutlama aynı zamanda kayıt.

## Performans (zayıf Android tablet hedefi)

- Yalnızca `transform` ve `opacity` canlandırılır (WAAPI ya da CSS geçişi). Genişlik/yükseklik/top/renk animasyonu yok: ilerleme çubukları `scaleX`, yoğunluk çubukları `scaleY`, anahtar düğmesinin topu `translateX` (arka plan rengi anında değişir).
- Arayüz geçişleri ≤ 600 ms; `PPMotion.anim` süreyi 600'e kırpar. Bilinçli istisnalar: geri al çubuğunun 5 sn zaman göstergesi ve 600 ms basılı tut dolgusu (sayaç, geçiş değil; yine `scaleX`).
- Konfeti: tek `<canvas>`, `pointer-events: none`, yalnızca kutlama sırasında görünür; parçacık bitince rAF durur ve canvas gizlenir. Bütçe cihazdan: `hardwareConcurrency ≤ 4` ya da `deviceMemory ≤ 2` → 45, orta → 90, güçlü → 150. Çalışırken 26 ms'yi aşan 5 kare → bütçe kalıcı %40 düşer, parçacıkların yarısı atılır. DPR en fazla 1,5. Parçacık ömrü 0,7–1,15 sn: dekoratif katman, akışı bloklamaz; 600 ms'ye kesin sınır istenirse `life` tek satırda değişir.
- Sayı akışı `textContent` + `tabular-nums` (düzen kaymaz); azaltılmış harekette doğrudan son değer.
- Hiçbir kutlama girişi bloklamaz: tost ve afiş katmanı `pointer-events: none`, yalnızca kartın kendisi tıklanır; Z ekranı ilk dokunuşta kapanır.
- Boyut: `motion.js` ≈ 7,6 KB, `ui.css` ≈ 6,5 KB, `app.js` ≈ 15 KB, ikonlar ≈ 1,9 KB (gzip). Font dosyası yok (sistem yazı tipi yığını).
- Ölçüm: `kutlamalar.html`'deki FPS ölçer yalnızca kutlama sırasında 1,6 sn çalışır (ortalama FPS, en kötü kare, tepe parçacık, güncel bütçe). Bu makinede (masaüstü) en kötü kare 5 ms. Zayıf tablette henüz ölçülmedi — gerçek cihazda "Oto" ve "Zayıf" ile denenmeli.

## Tokenlar (`assets/tokens.css`)

| Grup | Token | Değer / not |
|---|---|---|
| Nötr | `--bg`, `--surface-1…4`, `--line`, `--line-soft` | sıcak taş, koyu |
| Metin | `--text-1/2/3` | `--text-3` surface-1 üzerinde ≈ 6,3:1 |
| Birincil | `--primary` #f5a524, `--primary-strong`, `--primary-ink`, `--primary-soft`, `--primary-line` | tek birincil renk (amber) |
| Durum | `--success`, `--warning`, `--danger` (+ `-soft`) | uyarı turuncu, amberden ayrışsın diye |
| Yazı | `--fs-xs` 12 … `--fs-3xl` 44 | alt sınır 12 px |
| Ağırlık | `--fw-body` 400, `--fw-label` 500, `--fw-head` 600, `--fw-total` 700 | 700 yalnızca `.money-total` |
| Boşluk | `--s-1…8` | 4'lük ızgara |
| Köşe | `--r-sm` 10, `--r-md` 14, `--r-lg` 20, `--r-xl` 28 | |
| Dokunma | `--tap` 44, `--tap-lg` 56 | |
| Hareket | `--ease-out`, `--ease-spring`, `--ease-in`, `--d-fast` 120, `--d-base` 200, `--d-slow` 320, `--d-max` 600 | azaltılmış harekette süreler 0 |
| Derinlik | `--elev-1/2/3` | iç ışık + gölge |
| Katman | `--z-sheet` 40, `--z-toast` 60, `--z-celebrate` 70, `--z-confetti` 80 | |

## Bileşenler

| Sınıf | Ne | React karşılığı (önerilen) |
|---|---|---|
| `.btn` (`-primary/-secondary/-ghost/-danger`, `-lg`, `-icon`) | düğme | `<Button variant size>` |
| `.seg`, `.chip`, `.tag`, `.switch` | segment, seçim çipi, etiket, anahtar | `<Segmented>`, `<Chip>`, `<Tag>`, `<Switch>` |
| `.money-total`, `.label`, `h1-h3` | tipografi | `<Money total>`, `<Label>`, `<Heading>` (P6 maddesi) |
| `.rail`, `.topbar`, `.goal`, `.streak`, `.busy-chip`, `.sync` | kabuk | `<AppShell>`, `<GoalPill>`, `<StreakChip>` |
| `.table` + `.ring` | masa kartı + zaman halkası | `<TableCard>` |
| `.cats`, `.product`, `.product-qty` | kategori ve ürün ızgarası | `<CategoryRail>`, `<ProductTile>` |
| `.ticket`, `.line`, `.stepper` | adisyon | `<Ticket>`, `<TicketLine>`, `<Stepper>` |
| `.sheet-wrap/.sheet` | pencere / alt sayfa | `<Sheet>` (mevcut `OptionPicker` buna taşınır) |
| `.pay-*`, `.cash-grid`, `.change`, `.split-*` | ödeme | `<PaymentSheet>` |
| `.undo` | geri al çubuğu | `useUndo()` + `<UndoBar>` |
| `.cel-toast/-banner/-screen`, `.cel-badge` | kutlama sahneleri | `<CelebrationLayer>` (portal) |
| `.card`, `.kpi`, `.heat`, `.matrix`, `.timeline`, `.dots`, `.alert` | patron | `<Kpi>`, `<HeatStrip>`, `<MenuMatrix>`, `<DayStory>`, `<GoalDots>` |
| `.pin*` | PIN | mevcut `PinPad` yeniden giydirilir |
| `.hold` + `.hold-fill` | basılı tut onayı | `<HoldButton>` |

JS API'si (`assets/motion.js`):
- `PPMotion`: `anim`, `bump`, `pop`, `rise`, `shake`, `flash`, `fly(from, to)`, `countUp`, `progress`, `holdToConfirm`, `undo(text, onUndo, {ms, onCommit})`, `reduced()`, `setReduced(null|bool)`.
- `PPConfetti`: `burst({x, y, angle, spread, speed, power})`, `cannons()`, `budget()`, `deviceBudget()`, `setBudget(n|null)`, `active()`.
- `PPCelebrate`: `moment(kind, data) → {tier, reasons}`, `resolve(kind)`, `configure({enabled, sound, autoSimplify, isBusy, cooldownMs, onLog})`, `resetDay()`, `resetCooldown()`, `MOMENTS`.

## Uygulamaya opsiyonel modül olarak ekleme

Önce yedek (`propos-v2-yedek-<tarih>`, CLAUDE.md kuralı). Sıra, her adım ayrı yayımlanabilir:

1. Tokenlar → `tailwind.config.js` `theme.extend`: `colors.primary/success/warning/danger/surface/text`, `borderRadius`, `fontSize`, `transitionTimingFunction`, `zIndex`. `fontWeight`'i 400/500/600/700 ile sınırla (`font-black`/`font-extrabold` derlemede yok olur; lint kuralı gereksizleşir). CSS değişkenleri `src/styles/tokens.css` olarak aynen kalabilir; Tailwind renkleri `var(--primary)`'e işaret eder.
2. `<Heading>/<Label>/<Money>` + `<Button>/<Chip>/<Switch>/<Sheet>` (P6 madde 2). Tek ikon seti: `icons.js`'teki yollar bir `<Icon name>` bileşenine taşınır (ya da aynı çizgi kalınlığında lucide; ikisi birden değil).
3. Kutlama modülü `src/celebrate/`:
   - `policy.js` — `resolve(kind, ctx)` saf fonksiyon (enabled, busy, cooldown, seen, reducedMotion → tier + gerekçeler). Vitest ile birim testleri: yoğun saatte iniş, 90 sn soğuma, günde bir kez, kapalıyken Z'nin sade çıkması, öncelik sırası.
   - `motion.js`, `confetti.js` — bu prototipten ESM'e (global yerine `export`).
   - `CelebrationLayer.jsx` (portal, `aria-live="polite"`) + `useCelebrate()`.
   - Paket: `React.lazy(() => import('./celebrate'))` → ayrı parça; kapalıysa hiç yüklenmez. `tests/run.py --build` paket ayrımı kontrolüne "celebrate parçası ana pakete girmedi" eklenir.
4. Ayar ve yetki: tenant verisinde `settings.celebrations = { enabled: true, sound: false, autoSimplify: true, leaderboard: false }`; ayar ekranı yönetici PIN'i arkasında. Tenant özellik bayrağı (`entitlements.celebrations`) ile paket bazında açılıp kapanabilir; varsayılan açık (temel döngüye zarar vermez, adalet çizgisi).
5. Bağlantı noktaları (`PosContext` bölünürken): ödeme tamamlanınca `onSale({prevDay, nextDay, amount, table})` → `celebrateSale` mantığı (prototipte `app.js`); Z raporu → `zReport`; stok sayımı (P7) → `stockCount`. Yoğun saat: son 10 dk'daki satış sayısı satış defterinden.
6. Seri ve rekor sunucuda: "hatasız" = iptal/void/düzeltme yok; çok cihazda tutarlı olsun diye sunucu hesaplar, istemci yalnızca gösterir. Seri personel PIN'ine (P5 roller) bağlanana dek cihaz başınadır.
7. Kutlama yalnızca ödemeyi alan cihazda çıkar; diğer cihazlar "günün hikâyesi"nde görür.

## Bilinen sınırlar / açık sorular

- Prototip: durum bellekte (yenileyince sıfırlanır), ödeme ve PIN sahte, masa taşıma/birleştirme, indirim, kuver, yazdırma yok.
- Açık tema yok (koyu tek tema); gün ışığında teras tableti için açık tema gerekebilir.
- Inter yüklü değilse Segoe UI / Roboto'ya düşer; font dosyası eklenmedi (boyut).
- Yoğun saat eşiği (10 dk'da 8) işletmeye göre ayarlanmalı; ideal olan tipik eğriye oranla belirlemek.
- Zayıf tablette FPS ölçümü yapılmadı.
- Kutlama metinleri i18n anahtarına taşınmadı (P7 i18n ile birlikte).

## Dosyalar

```
design-prototype/
  index.html          POS + patron
  kutlamalar.html     kutlama demo sayfası
  assets/tokens.css   tasarım tokenları
  assets/ui.css       bileşenler
  assets/icons.js     tek ikon seti (SVG sprite)
  assets/motion.js    PPMotion + PPConfetti + PPCelebrate
  assets/data.js      örnek veri (işletme adı brandSettings'ten)
  assets/app.js       POS akışı + patron görünümü
```
