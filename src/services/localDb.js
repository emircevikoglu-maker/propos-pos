// Yerel kalıcı depo: IndexedDB (localStorage ~5 MB tavanı yerine). Durum anlık görüntüsü + eşitleme üst verisi.
// IndexedDB yoksa (gizli sekme, eski WebView) küçük veride localStorage'a düşer; ikisi de yoksa bellekte kalır ve `mode` bildirir.
//
// Anahtarlar (işletme başına): state:<id> (son yerel durum), base:<id> (sunucunun bildiğimiz son durumu), meta:<id> ({serverRev, dirty}).

const DB_NAME = "propos";
const DB_VERSION = 1;
const STORE = "kv";
export const BOOT_TIMEOUT_MS = 3000;

let dbPromise = null;
let mode = "idb"; // idb | localstorage | memory
const memory = new Map();

export const getMode = () => mode;
export function _resetForTests() { dbPromise = null; mode = "idb"; memory.clear(); }

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined" || !indexedDB) throw new Error("no idb");
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { mode = lsOk() ? "localstorage" : "memory"; resolve(null); };
      req.onblocked = () => { mode = lsOk() ? "localstorage" : "memory"; resolve(null); };
    } catch (e) {
      mode = lsOk() ? "localstorage" : "memory";
      resolve(null);
    }
  });
  return dbPromise;
}

function lsOk() { try { localStorage.setItem("__propos_t", "1"); localStorage.removeItem("__propos_t"); return true; } catch (e) { return false; } }
const lsKey = (k) => `propos_idb_fallback_${k}`;

export async function dbGet(key) {
  const db = await openDb();
  if (!db) {
    if (mode === "localstorage") { try { const raw = localStorage.getItem(lsKey(key)); return raw ? JSON.parse(raw) : undefined; } catch (e) { return undefined; } }
    return memory.get(key);
  }
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch (e) { resolve(undefined); }
  });
}

/** @returns {Promise<boolean>} yazıldı mı */
export async function dbSet(key, value) {
  const db = await openDb();
  if (!db) {
    if (mode === "localstorage") { try { localStorage.setItem(lsKey(key), JSON.stringify(value)); return true; } catch (e) { return false; } }
    memory.set(key, value);
    return true;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false); // kota dolu vb.
    } catch (e) { resolve(false); }
  });
}

export async function dbDel(key) {
  const db = await openDb();
  if (!db) { if (mode === "localstorage") { try { localStorage.removeItem(lsKey(key)); } catch (e) {} } else memory.delete(key); return; }
  await new Promise((resolve) => {
    try { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(key); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); tx.onabort = () => resolve(); } catch (e) { resolve(); }
  });
}

const valid = (s) => s && typeof s === "object" && Array.isArray(s.tables) && Array.isArray(s.products);

/**
 * Açılışta çağrılır: son yerel durum + üst veri. IndexedDB boşsa eski localStorage kopyasını bir kez taşır
 * (yazma başarılıysa localStorage'daki büyük kopya silinir → 5 MB kotası serbest kalır).
 */
export async function loadLocal(tenantId, legacyKey) {
  let state = await dbGet(`state:${tenantId}`);
  if (!valid(state) && legacyKey) {
    try {
      const raw = localStorage.getItem(legacyKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (valid(parsed)) {
        state = parsed;
        if (await dbSet(`state:${tenantId}`, parsed) && mode === "idb") { try { localStorage.removeItem(legacyKey); } catch (e) {} }
      }
    } catch (e) {}
  }
  const meta = (await dbGet(`meta:${tenantId}`)) || {};
  const base = await dbGet(`base:${tenantId}`);
  return { state: valid(state) ? state : null, base: base && typeof base === "object" ? base : null, meta: { serverRev: Number(meta.serverRev) || 0, dirty: meta.dirty === true } };
}

export const saveState = (tenantId, state) => dbSet(`state:${tenantId}`, state);
export const saveBase = (tenantId, base) => dbSet(`base:${tenantId}`, base);
export const saveMeta = (tenantId, meta) => dbSet(`meta:${tenantId}`, { serverRev: Number(meta.serverRev) || 0, dirty: meta.dirty === true });
export async function clearLocal(tenantId) { await Promise.all([dbDel(`state:${tenantId}`), dbDel(`base:${tenantId}`), dbDel(`meta:${tenantId}`)]); }

/** Açılış ön yüklemesi: DeviceGate bekler, sonuç `window.__PROPOS_BOOT__`'a yazılır (zaman aşımında boş devam eder). */
export async function preloadLocal(tenantId, legacyKey) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), BOOT_TIMEOUT_MS));
  const loaded = await Promise.race([loadLocal(tenantId, legacyKey).catch(() => null), timeout]);
  if (typeof window !== "undefined") window.__PROPOS_BOOT__ = { tenantId, ...(loaded || { state: null, base: null, meta: { serverRev: 0, dirty: false } }) };
  return loaded;
}

/** Kalıcı depolama izni (tarayıcı veriyi baskı altında silmesin) ve kota göstergesi. */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persisted && !(await navigator.storage.persisted()) && navigator.storage.persist) return await navigator.storage.persist();
    return !!(navigator.storage && navigator.storage.persisted && (await navigator.storage.persisted()));
  } catch (e) { return false; }
}

export async function storageEstimate() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota, ratio: quota > 0 ? usage / quota : 0 };
  } catch (e) { return null; }
}
