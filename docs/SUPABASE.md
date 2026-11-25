# Supabase + canlı-tutma (cron) kurulum notları

Mimari özeti: **PHP yetkili kalır** (kimlik, lisans, PIN, doğrulama). Supabase iki iş yapar: (1) kalıcı depo (PostgREST, yalnızca sunucu), (2) Realtime **sinyali** (istemcilere "veri değişti"). İstemci veriyi hâlâ PHP'den çeker.
`service_role`/secret anahtar **asla tarayıcıya gitmez**; tarayıcıya yalnızca publishable (anon) anahtar ve tahmin edilemez kanal adı verilir. Tablolarda RLS açık, politika yok: anon anahtarla hiçbir veri okunamaz/yazılamaz (testle doğrulanır).

## 1. Ortam değişkenleri (`.env`, commit'lenmez)
```
SUPABASE_URL=https://<proje>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # tarayıcıya gider (yalnızca Realtime kanalına abone olmak için)
SUPABASE_SECRET_KEY=sb_secret_...             # YALNIZCA sunucu
PROPOS_STORAGE=supabase                       # file (varsayılan) | supabase
PROPOS_REALTIME=1                             # supabase deposunda varsayılan açık; 0 = yalnızca yoklama
```
`.env` üretimde sunucuda dosya olarak ya da gerçek ortam değişkeni olarak verilir (gerçek ortam değişkeni `.env`'yi ezer).

## 2. Şema
Supabase paneli → **SQL Editor** → `supabase/migrations/001_propos_init.sql` dosyasının tamamını yapıştırıp **Run**. Tekrar çalıştırmak güvenlidir.

## 3. Mevcut veriyi taşıma (isteğe bağlı)
```
php tools/migrate_to_supabase.php --dry-run
php tools/migrate_to_supabase.php
```
Dosyalara dokunmaz (kopyalar). Uzak kayıt listesi doluysa üzerine yazmadan durur (`--force` ile yazılır).

## 4. Doğrulama
```
python tests/run.py --only supabase -v     # gerçek projeye karşı sözleşme + RLS testleri (ZZTEST kayıtları açıp siler)
```
Şema kurulu değilse testler "atlandı" olur.

## 5. Keepalive (projenin duraklatılmaması)
Supabase ücretsiz plan uzun süre etkinlik olmayan projeyi duraklatır. İki yol, ikisi de içeriksiz yanıt verir:

**HTTP (her hosttan, herhangi bir zamanlayıcıdan):**
```
GET https://<sunucunuz>/api/keepalive      →  {"ok":true}
```
- Yanıt yalnızca `{"ok":true}` / `{"ok":false}`; veritabanı sonucu, sürüm, sayı sızdırmaz.
- Yalnızca bu uçta CORS `*` açık (her hosting/origin çağırabilir); diğer uçlar kapalı.
- Hız sınırlı: IP başına ~4 çağrı/gün sürekli, tüm kaynaklar için 12 patlama + 2 saatte 1; aşımda `429` + `Retry-After`. Haftada 7 çağrı rahatça sığar. `PROPOS_RL_KEEPALIVE="kapasite:dolum/sn"` ve `PROPOS_RL_KEEPALIVE_ALL` ile ayarlanır.
- Veritabanında çalışan sorgu: `select 1` (RPC `propos_keepalive`, yalnızca service_role çağırabilir).

**Komut satırı (aynı sunucuda sistem cron'u):**
```
0 4 * * *  php /yol/propos/backend/cron/keepalive.php      # çıktı: ok | fail, çıkış kodu 0/1
```

### Zamanlayıcı örnekleri
- **GitHub Actions** (`.github/workflows/keepalive.yml` hazır): repo → Settings → Secrets → `PROPOS_KEEPALIVE_URL` = `https://<sunucunuz>/api/keepalive`. Günde 1 çalışır.
- **Vercel Cron:** `vercel.json` → `{"crons":[{"path":"/api/ping","schedule":"0 4 * * *"}]}` ve `/api/ping` fonksiyonu içinden `fetch(process.env.PROPOS_KEEPALIVE_URL)` (Hobby planda günde 1 yeter).
- **cron-job.org / UptimeRobot:** URL'yi günde 1 çağıracak şekilde ekleyin.

## 6. Realtime nasıl çalışır
1. Cihaz giriş yapar, `GET /api/realtime` ile `{url, key(publishable), topic}` alır.
2. Tarayıcı `wss://…/realtime/v1/websocket` kanalına abone olur (`topic = propos-<işletme>-<HMAC>`; tahmin edilemez, yalnızca doğrulanmış cihaza verilir).
3. Bir cihaz kaydedince PHP yanıtı gönderdikten sonra sunucu anahtarıyla `{rev, by}` sinyali yayınlar (veri taşımaz).
4. Diğer cihazlar sinyalde `GET /api/sync?since=` ile veriyi çeker. Kendi sinyalini yok sayar.
5. Realtime bağlıyken emniyet yoklaması 60 sn (gizli sekmede 120 sn); kopunca üstel geri çekilmeyle yeniden dener, o sürede 3 sn'lik yoklamaya geri döner.

## 7. Bilinen sınırlar / sonraki adımlar
- Hâlâ tüm durum tek JSON (whole-state). Delta/defter ayrımı TODO P2-b.
- `saveTenant` mevcut durumu okuyup rev'i denetliyor: Supabase'te her kayıtta ek bir okuma. İleride yalnızca `rev` sütunu okunacak.
- Denetim kaydı ve hız sınırı sayaçları sunucu diskinde kalır (çok sunuculu kurulumda paylaşımlı depo gerekir).
- Verinin Supabase bölgesi: yurt dışıysa KVKK aktarım yükümlülükleri için hukuki görüş alın.
