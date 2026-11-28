// ProPos PHP Backend API iletişim servisi (imzalı oturum belirteci ile)
//
// Giriş katmanları (3.9.0):
//  1) Kullanıcı girişi: kullanıcı adı + parola → 30 günlük oturum (localStorage, `propos_session`). Kullanıcıyı kurucu ekler.
//     Eski cihaz eşleştirme (bağlantı anahtarı) yalnızca geriye uyumluluk için okunur; arayüzde yok, 4.0'da kalkar.
//  2) Yönetici kilidi: PIN sunucuda doğrulanır → 4 saatlik yönetici belirteci (sessionStorage).
// Arka uç adresi: derlemede PROPOS_API_URL (Vercel ön yüz + Linux arka uç), yoksa aynı köken.

const FOUNDER_TOKEN_KEY = "propos_founder_token";
const tokenKey = (tid) => `propos_token_${tid}`;
const managerKey = (tid) => `propos_mgr_token_${tid}`;
const syncKeyKey = (tid) => `propos_sync_key_${tid}`;

export function getLocalSyncBaseUrl() {
  const configured = typeof __API_URL__ !== "undefined" ? String(__API_URL__ || "") : "";
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined" && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    return window.location.origin;
  }
  return "http://localhost:8586";
}

const safeGet = (store, key) => { try { return store.getItem(key); } catch (e) { return null; } };
const safeSet = (store, key, val) => { try { store.setItem(key, val); } catch (e) {} };
const safeDel = (store, key) => { try { store.removeItem(key); } catch (e) {} };
const emit = (name, detail) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} };

// Sunucunun reddettiği anahtarlar (bu sayfa ömrü boyunca bir daha denenmez → giriş fırtınası/IP kilidi olmaz).
const rejectedKeys = new Set();

export function getStoredSyncKey(tenantId) {
  let key = null;
  if (typeof window !== "undefined" && window.__PROPOS_SYNC_KEY__ && String(window.__PROPOS_LOCKED_TENANT__ || "").toUpperCase() === tenantId) {
    key = window.__PROPOS_SYNC_KEY__;
  } else {
    key = safeGet(localStorage, syncKeyKey(tenantId));
  }
  return key && !rejectedKeys.has(key) ? key : null;
}
export function setStoredSyncKey(tenantId, key) { rejectedKeys.delete(key); safeSet(localStorage, syncKeyKey(tenantId), key); }
export function hasFounderSession() { return !!safeGet(sessionStorage, FOUNDER_TOKEN_KEY); }
export function clearFounderSession() { safeDel(sessionStorage, FOUNDER_TOKEN_KEY); }
const SESSION_KEY = "propos_session";
/** Kullanıcı oturumu: {token, tenantId, username, displayName, userRole} ya da null. */
export function getUserSession() {
  try {
    const s = JSON.parse(safeGet(localStorage, SESSION_KEY) || "null");
    return s && typeof s.token === "string" && typeof s.tenantId === "string" ? s : null;
  } catch (e) { return null; }
}
function clearUserSession() { safeDel(localStorage, SESSION_KEY); }
export function isDevicePaired(tenantId) {
  const s = getUserSession();
  return (!!s && s.tenantId === tenantId) || !!getStoredSyncKey(tenantId) || hasFounderSession();
}
export function hasManagerSession(tenantId) { return !!safeGet(sessionStorage, managerKey(tenantId)); }
export function clearManagerSession(tenantId) { safeDel(sessionStorage, managerKey(tenantId)); }

/** Çıkış: kullanıcı oturumu, (eski) cihaz anahtarı ve tüm oturumlar silinir. Yerel veri (IndexedDB) kalır. */
export function unpairDevice(tenantId) {
  clearUserSession();
  safeDel(localStorage, syncKeyKey(tenantId));
  safeDel(sessionStorage, tokenKey(tenantId));
  safeDel(sessionStorage, managerKey(tenantId));
  clearFounderSession();
}

// ---- 429 / hız sınırı ------------------------------------------------------
const blockedUntil = { poll: 0, action: 0 };
let pendingPush = null;
let pushRetryTimer = null;
let lastAuthEventAt = 0;
// Gönderim kuyruğu (debounce): tuş başına tam durum POST'u yerine son durum tek seferde gider.
export const PUSH_DEBOUNCE_MS = 600;
export const PUSH_MAX_WAIT_MS = 3000;
let queued = null;
let queueTimer = null;
let queueFirstAt = 0;

export function rateLimitState() { return { ...blockedUntil }; }
export function _resetApiStateForTests() {
  blockedUntil.poll = 0;
  blockedUntil.action = 0;
  online = true;
  pendingPush = null;
  if (pushRetryTimer) clearTimeout(pushRetryTimer);
  pushRetryTimer = null;
  lastAuthEventAt = 0;
  if (queueTimer) clearTimeout(queueTimer);
  queueTimer = null;
  queued = null;
  queueFirstAt = 0;
  rejectedKeys.clear();
}

function noteRateLimit(res, bucket) {
  const sec = Math.min(300, Math.max(1, Number(res.headers.get("Retry-After")) || 30));
  blockedUntil[bucket] = Date.now() + sec * 1000;
  emit("propos-rate-limited", { retryAfter: sec, bucket });
  return sec;
}

/** /api/info: sunucu erişilebilir mi? */
export async function fetchServerInfo() {
  try {
    const res = await fetch(`${getLocalSyncBaseUrl()}/api/info`, { cache: "no-store" });
    if (!res.ok) return null;
    const out = await res.json().catch(() => null);
    return out && out.ok ? out : null;
  } catch (e) {
    return null;
  }
}

/** Anahtarla oturum açar. Kurucu anahtarı → kurucu oturumu; işletme anahtarı → işletme oturumu. */
export async function loginWithKey(tenantId, key) {
  try {
    const res = await fetch(`${getLocalSyncBaseUrl()}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, key })
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 403 && out.code === "LICENSE") {
      emit("propos-license-blocked", { tenantId, message: out.error });
      return { ok: false, code: "LICENSE", error: out.error || "Lisans geçersiz." };
    }
    if (res.status === 429) {
      const sec = Number(res.headers.get("Retry-After")) || out.retryAfter || 30;
      return { ok: false, code: "RATE_LIMIT", retryAfter: sec, error: out.error || `Çok fazla deneme. ${sec} sn bekleyin.` };
    }
    if (!res.ok || !out.ok || typeof out.token !== "string") return { ok: false, code: out.code || "BAD_KEY", error: out.error || "Giriş başarısız." };
    safeSet(sessionStorage, out.role === "founder" ? FOUNDER_TOKEN_KEY : tokenKey(tenantId), out.token);
    return { ok: true, role: out.role };
  } catch (e) {
    return { ok: false, code: "NETWORK", error: "Sunucuya ulaşılamadı." };
  }
}

/** Cihazı işletmeye eşler: anahtar doğrulanırsa cihaza kaydedilir. */
export async function pairDevice(tenantId, key) {
  const clean = String(key || "").trim();
  if (!clean) return { ok: false, code: "EMPTY", error: "Bağlantı anahtarını girin." };
  const r = await loginWithKey(tenantId, clean);
  if (r.ok && r.role === "tenant") setStoredSyncKey(tenantId, clean);
  return r;
}

/** Kullanıcı adı + parola ile giriş (3.9.0). Başarılıysa oturum ve etkin işletme kaydedilir. */
export async function loginUser(username, password) {
  try {
    const res = await fetch(`${getLocalSyncBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 403 && out.code === "LICENSE") return { ok: false, code: "LICENSE", error: out.error || "Lisans geçersiz." };
    if (res.status === 429) {
      const sec = Number(res.headers.get("Retry-After")) || out.retryAfter || 30;
      return { ok: false, code: "RATE_LIMIT", error: out.error || `Çok fazla deneme. ${sec} sn bekleyin.` };
    }
    if (!res.ok || !out.ok || typeof out.token !== "string" || typeof out.tenantId !== "string") {
      return { ok: false, code: out.code || "BAD_LOGIN", error: out.error || "Giriş başarısız." };
    }
    const session = { token: out.token, tenantId: out.tenantId, username: out.username || "", displayName: out.displayName || "", userRole: out.userRole || "staff" };
    safeSet(localStorage, SESSION_KEY, JSON.stringify(session));
    safeSet(localStorage, "propos_active_tenant_id", out.tenantId);
    return { ok: true, ...session };
  } catch (e) {
    return { ok: false, code: "NETWORK", error: "Sunucuya ulaşılamadı." };
  }
}

function requestAuth(tenantId) {
  const now = Date.now();
  if (now - lastAuthEventAt < 3000) return;
  lastAuthEventAt = now;
  emit("propos-auth-required", { tenantId });
}

async function getToken(tenantId, { preferManager = false } = {}) {
  const founder = safeGet(sessionStorage, FOUNDER_TOKEN_KEY);
  if (founder) return founder;
  if (preferManager) {
    const mgr = safeGet(sessionStorage, managerKey(tenantId));
    if (mgr) return mgr;
  }
  const user = getUserSession();
  if (user && user.tenantId === tenantId) return user.token;
  const cached = safeGet(sessionStorage, tokenKey(tenantId));
  if (cached) return cached;
  const key = getStoredSyncKey(tenantId);
  if (key) {
    const r = await loginWithKey(tenantId, key);
    if (r.ok) return safeGet(sessionStorage, tokenKey(tenantId)) || safeGet(sessionStorage, FOUNDER_TOKEN_KEY);
    // Ağ yok: oturum alınamadı ama anahtar GEÇERSİZ değil → çevrimdışı say (eşleştirme ekranı açma, anahtarı silme).
    if (r.code === "NETWORK") throw new TypeError("offline");
    if (r.code === "BAD_KEY") {
      // Anahtar geçersiz (veri sıfırlandı / panelden yenilendi): bir daha deneme, eşleştirme iste.
      rejectedKeys.add(key);
      safeDel(localStorage, syncKeyKey(tenantId));
    } else if (r.code === "RATE_LIMIT") {
      const until = Date.now() + (r.retryAfter || 30) * 1000;
      blockedUntil.poll = Math.max(blockedUntil.poll, until);
      blockedUntil.action = Math.max(blockedUntil.action, until);
      emit("propos-rate-limited", { retryAfter: r.retryAfter || 30, bucket: "login" });
      return { blocked: true };
    }
  }
  return null;
}

async function authedFetch(tenantId, path, options = {}, { preferManager = false } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken(tenantId, { preferManager });
    if (token && token.blocked) return new Response(null, { status: 429, headers: { "Retry-After": "30" } });
    if (!token) {
      requestAuth(tenantId);
      return new Response(null, { status: 401 });
    }
    const res = await fetch(`${getLocalSyncBaseUrl()}${path}`, {
      ...options,
      headers: { ...(options.headers || {}), "X-ProPos-Token": token }
    });
    if (res.status === 403) {
      const out = await res.clone().json().catch(() => ({}));
      if (out.code === "LICENSE") emit("propos-license-blocked", { tenantId, message: out.error });
      return res;
    }
    if (res.status !== 401) return res;
    // PIN uçlarında 401 = yanlış PIN olabilir; oturumu yalnızca gerçek oturum hatasında sil.
    const body = await res.clone().json().catch(() => ({}));
    if (body.code && body.code !== "AUTH") return res;
    safeDel(sessionStorage, tokenKey(tenantId));
    safeDel(sessionStorage, managerKey(tenantId));
    safeDel(sessionStorage, FOUNDER_TOKEN_KEY);
    clearUserSession();
  }
  requestAuth(tenantId);
  return new Response(null, { status: 401 });
}

const q = (tenantId) => `tenantId=${encodeURIComponent(tenantId)}`;

/** since: istemcinin bildiği son revizyon; değişmediyse sunucu gövdesiz { unchanged: true } döner. */
export async function fetchTenantSync(tenantId, since = -1, deviceId = "") {
  if (Date.now() < blockedUntil.poll) return null;
  const sinceNum = Number.isFinite(Number(since)) ? Number(since) : -1;
  const res = await authedFetch(tenantId, `/api/sync?${q(tenantId)}&since=${sinceNum}&deviceId=${encodeURIComponent(deviceId)}`, { cache: "no-store" });
  if (res.status === 429) { noteRateLimit(res, "poll"); return null; }
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/** Tüm durumu gönderir. 429'da en son durumu saklayıp Retry-After sonrasında bir kez yeniden dener. */
export async function pushTenantSync(tenantId, deviceId, rev, jsonStr) {
  if (Date.now() < blockedUntil.action) {
    pendingPush = { tenantId, deviceId, rev, jsonStr };
    return null;
  }
  const res = await authedFetch(tenantId, `/api/sync?${q(tenantId)}&deviceId=${encodeURIComponent(deviceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: jsonStr,
    keepalive: jsonStr.length < 60000
  });
  if (res.status === 429) {
    const sec = noteRateLimit(res, "action");
    pendingPush = { tenantId, deviceId, rev, jsonStr };
    if (!pushRetryTimer) {
      pushRetryTimer = setTimeout(() => {
        pushRetryTimer = null;
        const p = pendingPush;
        pendingPush = null;
        if (p) pushTenantSync(p.tenantId, p.deviceId, p.rev, p.jsonStr).catch(() => {});
      }, sec * 1000 + 250);
    }
    return { ok: false, rateLimited: true, retryAfter: sec };
  }
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/**
 * Tam durumu gönderim kuyruğuna koyar. PUSH_DEBOUNCE_MS sessizlikten sonra (en geç PUSH_MAX_WAIT_MS)
 * yalnızca EN SON durum gönderilir. onDone(out) sonucu alır.
 */
export function queuePush(tenantId, deviceId, rev, jsonStr, onDone) {
  const now = Date.now();
  if (!queued) queueFirstAt = now;
  queued = { tenantId, deviceId, rev, jsonStr, onDone };
  if (queueTimer) clearTimeout(queueTimer);
  const wait = Math.max(0, Math.min(PUSH_DEBOUNCE_MS, queueFirstAt + PUSH_MAX_WAIT_MS - now));
  queueTimer = setTimeout(flushQueuedPush, wait);
}

export function hasPendingPush() { return !!queued || !!pendingPush; }

/** Kuyruktakini hemen gönderir (sayfa kapanırken / sekme gizlenirken). */
export function flushQueuedPush() {
  if (queueTimer) clearTimeout(queueTimer);
  queueTimer = null;
  const q = queued;
  queued = null;
  if (!q) return Promise.resolve(null);
  return pushTenantSync(q.tenantId, q.deviceId, q.rev, q.jsonStr)
    .then((out) => { if (q.onDone) q.onDone(out); return out; })
    .catch(() => null);
}

// ---- Eşitleme motoru için sonuç-türlü çağrılar (hata ayrımı: offline / limited / auth / conflict) ----

/** @returns {Promise<{kind:'ok',rev:number}|{kind:'conflict',rev:number,data:object}|{kind:'limited',retryAfter:number}|{kind:'offline'}|{kind:'auth'}|{kind:'error',status:number}>} */
export async function pushState(tenantId, deviceId, baseRev, jsonStr) {
  if (Date.now() < blockedUntil.action) return { kind: "limited", retryAfter: Math.ceil((blockedUntil.action - Date.now()) / 1000) };
  let res;
  try {
    res = await authedFetch(tenantId, `/api/sync?${q(tenantId)}&deviceId=${encodeURIComponent(deviceId)}&baseRev=${Math.max(0, Math.floor(Number(baseRev) || 0))}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonStr,
      keepalive: jsonStr.length < 60000
    });
  } catch (e) {
    noteConnectivity(false);
    return { kind: "offline" };
  }
  if (res.status === 429) { const sec = noteRateLimit(res, "action"); noteConnectivity(true); return { kind: "limited", retryAfter: sec }; }
  if (res.status === 401 || res.status === 403) return { kind: "auth" };
  if (res.status === 0 || res.status >= 500) { noteConnectivity(res.status !== 0); return { kind: "offline", status: res.status }; }
  noteConnectivity(true);
  const out = await res.json().catch(() => null);
  if (res.status === 409 && out && out.code === "CONFLICT" && out.data && typeof out.data === "object") return { kind: "conflict", rev: Number(out.rev) || 0, data: out.data };
  if (res.ok && out && out.ok) return { kind: "ok", rev: Number(out.rev) || 0 };
  return { kind: "error", status: res.status };
}

/** @returns {Promise<{kind:'unchanged'}|{kind:'data',rev:number,data:object}|{kind:'limited',retryAfter:number}|{kind:'offline'}|{kind:'auth'}|{kind:'error',status:number}>} */
export async function pullState(tenantId, since, deviceId = "") {
  if (Date.now() < blockedUntil.poll) return { kind: "limited", retryAfter: Math.ceil((blockedUntil.poll - Date.now()) / 1000) };
  const sinceNum = Number.isFinite(Number(since)) ? Number(since) : -1;
  let res;
  try {
    res = await authedFetch(tenantId, `/api/sync?${q(tenantId)}&since=${sinceNum}&deviceId=${encodeURIComponent(deviceId)}`, { cache: "no-store" });
  } catch (e) {
    noteConnectivity(false);
    return { kind: "offline" };
  }
  if (res.status === 429) { const sec = noteRateLimit(res, "poll"); noteConnectivity(true); return { kind: "limited", retryAfter: sec }; }
  if (res.status === 401 || res.status === 403) return { kind: "auth" };
  if (res.status === 0 || res.status >= 500) { noteConnectivity(res.status !== 0); return { kind: "offline", status: res.status }; }
  const out = await res.json().catch(() => null);
  if (!res.ok || !out || !out.ok) return { kind: "error", status: res.status };
  noteConnectivity(true);
  if (out.packetRegistry === undefined && Array.isArray(out.registry)) lastRegistry = out.registry;
  if (out.unchanged) return { kind: "unchanged" };
  return { kind: "data", rev: Number(out.rev) || 0, data: out.data && typeof out.data === "object" ? out.data : {}, lanIp: out.lanIp, registry: out.registry };
}

let lastRegistry = null;
export const getLastRegistry = () => lastRegistry;

// ---- Bağlantı durumu: ağ hatası = çevrimdışı; yanıt (4xx dahil) = sunucuya ulaşıldı ----
let online = true;
export const isNetworkOnline = () => online;
function noteConnectivity(ok) {
  if (ok === online) return;
  online = ok;
  emit("propos-connectivity", { online: ok });
}

/** Realtime sinyal kanalı bilgisi (Supabase kapalıysa {enabled:false}). */
export async function fetchRealtimeConfig(tenantId) {
  try {
    const res = await authedFetch(tenantId, `/api/realtime?${q(tenantId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const out = await res.json().catch(() => null);
    return out && out.ok && out.enabled ? out : null;
  } catch (e) {
    return null;
  }
}

/** Çalışan geri bildirimi (sunucuda denetim günlüğüne yazılır). */
export async function sendFeedback(tenantId, { kind, text, screen }) {
  try {
    const res = await authedFetch(tenantId, `/api/feedback?${q(tenantId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, text: String(text || "").slice(0, 300), screen: String(screen || "").slice(0, 30) })
    });
    return res.ok ? { ok: true } : { ok: false, code: res.status };
  } catch (e) {
    return { ok: false, code: 0 };
  }
}

// ---- Yönetici PIN'i (sunucuda doğrulanır) ----------------------------------

export async function fetchPinStatus(tenantId) {
  try {
    const res = await authedFetch(tenantId, `/api/pin/status?${q(tenantId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  } catch (e) {
    return null;
  }
}

/** @returns {Promise<{ok:boolean, error?:string, code?:string, retryAfter?:number, attemptsLeft?:number}>} */
export async function verifyManagerPin(tenantId, pin) {
  try {
    const res = await authedFetch(tenantId, `/api/pin/verify?${q(tenantId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: String(pin || "") })
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out.ok && typeof out.token === "string") {
      safeSet(sessionStorage, managerKey(tenantId), out.token);
      return { ok: true };
    }
    if (res.status === 429) {
      const sec = Number(res.headers.get("Retry-After")) || out.retryAfter || 30;
      return { ok: false, code: "RATE_LIMIT", retryAfter: sec, error: out.error || `Çok fazla deneme. ${sec} sn bekleyin.` };
    }
    if (res.status === 401 && !out.code) return { ok: false, code: "AUTH", error: "Cihaz oturumu yok. Önce işletmeye bağlanın." };
    return { ok: false, code: out.code || "BAD_PIN", attemptsLeft: out.attemptsLeft, error: out.error || "PIN hatalı." };
  } catch (e) {
    return { ok: false, code: "NETWORK", error: "Yönetici kilidi için sunucu bağlantısı gerekir." };
  }
}

export async function changeManagerPin(tenantId, current, next) {
  try {
    const res = await authedFetch(tenantId, `/api/pin/change?${q(tenantId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: current || "", next })
    }, { preferManager: true });
    const out = await res.json().catch(() => ({}));
    return res.ok && out.ok ? { ok: true } : { ok: false, code: out.code, error: out.error || "PIN değiştirilemedi." };
  } catch (e) {
    return { ok: false, code: "NETWORK", error: "Sunucuya ulaşılamadı." };
  }
}

// ---- Kurucu (geçiş dönemi: uygulama içi bayi stüdyosu) ----------------------

const founderCall = (path, options) => authedFetch("DEFAULT", path, options);

export async function fetchRegistryAsFounder() {
  const res = await founderCall("/api/tenants");
  if (!res.ok) return null;
  const out = await res.json().catch(() => null);
  return out && out.tenants ? out.tenants : null;
}

/** Kaydı gönderir; sunucu syncKey üretip tam listeyi döner. */
export async function postDealerTenants(tenantsJson) {
  return founderCall("/api/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: tenantsJson });
}

export async function postPrepareGithubRelease(manifestJson) {
  return founderCall("/api/prepare-github", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: manifestJson });
}

export async function postApplyHtmlUpdate(newHtml) {
  return founderCall("/api/apply-update", { method: "POST", headers: { "Content-Type": "text/html; charset=utf-8" }, body: newHtml });
}

export async function downloadPackageZip(query, filename) {
  const res = await founderCall(`/api/package?${query}`);
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}
