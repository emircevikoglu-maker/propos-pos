# ProPos API sözleşmesi (3.5.1)

Kod: `backend/Controllers/ApiController.php` (POS) ve `ControlController.php` (kontrol paneli). Bu belge kodu yansıtır; uç değişirse burası aynı değişiklikte güncellenir.
Kimlik: `X-ProPos-Token` başlığı (HMAC imzalı oturum, 12 sa; yönetici PIN'i sonrası 4 sa'lik `manager` belirteci). Hatalar: `{ok:false, error, code}`.

## Hata kodları
`AUTH` 401 · `BAD_KEY` 401 · `BAD_PIN` 401 · `LICENSE` 403 · `NO_PIN` 409 · `CONFLICT` 409 (+ güncel veri) · `RATE_LIMIT` 429 (+`Retry-After`) · `STORAGE_DOWN` 503 (depo erişilemez; yazma yapılmadı).

## POS (`backend/router.php`)
| Uç | Yöntem | Kimlik | Açıklama |
|---|---|---|---|
| `/api/info` | GET | yok | `{ok, app, lanIp, port, auth}`; hassas bilgi yok |
| `/api/login` | POST `{tenantId,key}` | yok | `{token, role: founder\|tenant}`; 10 dk'da 8 hatalı deneme sınırı; lisans kontrolü |
| `/api/sync?tenantId&since=<rev>` | GET | oturum | değişmediyse `{unchanged:true}`; değilse veri + `rev` |
| `/api/sync?tenantId&deviceId&baseRev=<rev>` | POST tam durum | oturum | `baseRev` verilirse iyimser eşzamanlılık: sunucu revizyonu farklıysa yazılmaz, `409 CONFLICT` + güncel veri. `baseRev` yoksa eski davranış (son yazan kazanır). Geçersiz `baseRev` 400 |
| `/api/realtime?tenantId` | GET | oturum | Supabase Realtime yapılandırması (`enabled`, kanal konusu, anahtar); yoksa `enabled:false` |
| `/api/feedback` | POST | oturum | geri bildirim (denetim kaydına, hız sınırlı) |
| `/api/pin/status` | GET | oturum | PIN tanımlı mı |
| `/api/pin/verify` | POST `{pin}` | oturum | `manager` belirteci; 6 hatada 5 dk kilit |
| `/api/pin/change` | POST `{current?,next}` | oturum | yönetici oturumunda `current` gerekmez |
| `/api/keepalive` | GET/POST/HEAD | yok | `{ok:true}`; yalnızca bu uçta CORS `*`; IP başına ~4/gün, genel 12 patlama + 2 saatte 1 |
| `/api/tenants`, `/api/package`, `/api/apply-update`, `/api/prepare-github`, `/api/audit` | | kurucu | eski bayi uçları (kaldırılacak, TODO P8); yeni yer kontrol paneli |

Yoklama, eylem ve IP kovaları ayrıdır (`PROPOS_RL_POLL|ACTION|IP`); aşımda `429` ve istemci `Retry-After` kadar bekler.

## Kontrol paneli (`backend/control.php`, yalnızca kurucu)
`POST /api/login {key}` · `GET /api/session` · `GET /api/tenants` (+istatistik) · `POST /api/tenants/save` · `POST /api/tenants/rotate-key` · `POST /api/tenants/delete` · `GET /api/package` (müşteri ZIP'i) · `GET /api/audit`.

## CORS
Varsayılan kapalı (uygulama kendi kökeninden çalışır). `PROPOS_CORS_ORIGIN`: tek köken, virgülle liste ya da `*`. Liste verilirse yalnızca isteğin `Origin`'i listedeyse yansıtılır (`Vary: Origin`). İzin verilen istek başlıkları: `Content-Type, X-ProPos-Token, Cache-Control, Pragma`; açığa çıkan: `Retry-After`. `/api/keepalive` bağımsızdır (her zaman `*`).

## Statik
`/` uygulama kabuğu, `/sw.js` (`Service-Worker-Allowed: /`), `/manifest.webmanifest`, ikonlar. `/api/*` service worker tarafından asla önbelleğe alınmaz.

## Ortam değişkenleri
`PROPOS_DATA_DIR|DIST_DIR|ADMIN_DIST_DIR` · `PROPOS_FOUNDER_KEY` · `PROPOS_STORAGE=file|supabase` · `PROPOS_CACHE`, `PROPOS_CACHE_TTL` · `PROPOS_REALTIME` · `SUPABASE_URL|PUBLISHABLE_KEY|SECRET_KEY` (`.env.example`) · `PROPOS_RL_POLL|ACTION|IP|CONTROL|KEEPALIVE|KEEPALIVE_ALL|FEEDBACK` ("kapasite:dolum/sn") · `PROPOS_RL_PENALTY` · `PROPOS_LOGIN_DELAY_MS` · `PROPOS_MAX_DB_BYTES` · `PROPOS_MAX_HTML_BYTES` · `PROPOS_CORS_ORIGIN` · `PROPOS_DEBUG` · `PROPOS_NO_DOTENV` (testler).
