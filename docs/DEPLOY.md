# Dağıtım: ön yüz Vercel, arka uç Linux (PHP)

Topoloji (3.9.0): tüm müşteriler için tek Vercel projesi (POS arayüzü) + tek Linux sunucu (PHP API + veri). Müşteri ayrımı giriş yapan kullanıcıdan gelir (kurucu panelinden eklenen kullanıcı → işletme). İstenirse müşteri başına ayrı Vercel projesi de açılabilir; kod aynı, yalnızca `PROPOS_API_URL` farklı olabilir.

Kontrol paneli (kurucu) Vercel'e KONMAZ: `dist-admin/` yalnızca arka uç sunucusunda, IP kısıtlı ayrı alt alan adında ya da SSH tüneliyle açılır.

## 1. Arka uç (Linux)
Gereken: PHP 8.1+ (`curl`, `openssl`, `mbstring`, `json`), HTTPS (Let's Encrypt), `php-fpm`.

1. Kodu sunucuya alın (git clone). Veri klasörünü web kökünün DIŞINA koyun: `PROPOS_DATA_DIR=/var/lib/propos`.
2. `.env` (repo kökünde; `.env.example`'dan):
   ```
   PROPOS_DATA_DIR=/var/lib/propos
   PROPOS_CORS_ORIGIN=https://<proje>.vercel.app
   PROPOS_STORAGE=file            # ya da supabase (docs/SUPABASE.md)
   ```
3. İlk kurulum: `php backend/init.php` → kurucu anahtarı `$PROPOS_DATA_DIR/KURUCU_ANAHTARI.txt`'ye bir kez yazılır; okuyup güvenli yere alın, dosyayı silin.
4. Web sunucusu: tüm istekler `backend/router.php`'ye gider (statik dosyaları da o servis eder, veri ve kaynak klasörleri kapalıdır).
   - Apache/LiteSpeed: kökteki `.htaccess` hazır (`AllowOverride All`).
   - nginx:
     ```nginx
     server {
       server_name api.ornek.com;
       root /srv/propos;
       location / {
         include fastcgi_params;
         fastcgi_param SCRIPT_FILENAME $document_root/backend/router.php;
         fastcgi_pass unix:/run/php/php8.2-fpm.sock;
       }
     }
     ```
5. Kontrol paneli: ayrı alt alan adı + IP kısıtı (`fastcgi_param SCRIPT_FILENAME $document_root/backend/control.php;` ve `allow <ip>; deny all;`), ya da hiç açmayıp `ssh -L 8590:127.0.0.1:8590` + `php -S 127.0.0.1:8590 backend/control.php`.
6. Cron (isteğe bağlı): günlük `curl -s https://api.ornek.com/api/keepalive` (Supabase kullanılıyorsa uykuya düşmesin).
7. Ters vekil (Cloudflare vb.) arkasındaysa: hız sınırı ve giriş kilidi istemci IP'sine bağlı; güvenilir `X-Forwarded-For` ayarı TODO P8 — o yapılana kadar vekil kullanmayın ya da sınırları gevşetin.

## 2. Ön yüz (Vercel)
1. Vercel'de projeyi repodan içe aktarın; `vercel.json` derleme ve SPA yönlendirmesini tanımlar (`npm run build` → `dist/`).
2. Ortam değişkeni: `PROPOS_API_URL=https://api.ornek.com` (sonunda `/` yok). Derleme zamanında pakete gömülür; değiştirince yeniden derleyin.
3. Alan adı bağlayın; arka uçtaki `PROPOS_CORS_ORIGIN`'e tam bu kökeni yazın (birden fazlaysa virgülle).
4. PWA (çevrimdışı açılış, "uygulamayı yükle") HTTPS'te kendiliğinden çalışır.

## 3. Kullanıcı ekleme
Kontrol paneli → işletme kartı → Kullanıcılar → "+ Kullanıcı" (kullanıcı adı, parola ≥ 8, rol sahip/çalışan). Parola değiştirme ya da kapatma o kullanıcının tüm açık oturumlarını anında düşürür. Yönetici ekranları (Analiz, Personel, Finans, Yönetim) ayrıca işletmenin yönetici PIN'ini ister.

## 4. Tek makinede (yerel/LAN) kurulum
Eskisi gibi: `npm start` ya da `Mobil_ve_PC_Canli_Sunucu.ps1` (`php -S 0.0.0.0:8586 backend/router.php`). `PROPOS_API_URL` boş bırakılınca ön yüz aynı kökene bağlanır.

## Kontrol listesi
- [ ] `https://api…/api/info` → `{"ok":true}`
- [ ] Vercel adresinde giriş ekranı açılıyor, tarayıcı konsolunda CORS hatası yok
- [ ] Panelden kullanıcı eklendi, POS'ta giriş yapıldı, iki cihazda masa açılınca diğerinde görünüyor
- [ ] `data/`, `.env`, `backend/` web'den 403/404
