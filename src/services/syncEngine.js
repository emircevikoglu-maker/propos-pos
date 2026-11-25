// Eşitleme motoru: yerel değişiklikleri kalıcı tutar, bağlantı yokken biriktirir, bağlantı gelince
// sunucudaki (başkalarının) değişiklikleriyle ÜÇ YÖNLÜ BİRLEŞTİRİP gönderir. React'ten bağımsızdır (sahte api/depo ile test edilir).
//
// Akış: localChanged → (debounce) → push(baseRev = bildiğimiz sunucu rev'i)
//   ok        → rev/taban güncellenir
//   conflict  → (409) sunucudaki güncel durumla birleştir, birleşik durumu uygula ve yeniden gönder
//   offline   → dirty kalır, üstel geri çekilmeyle yeniden dener (bağlantı gelince hemen)
// pull → sunucuda daha yeni rev varsa: dirty değilse doğrudan uygula, dirty ise birleştir.

import { mergeStates, stripMeta } from "./merge";

const BACKOFF_MS = [3000, 6000, 12000, 24000, 48000, 60000];

/**
 * @param {object} o
 * @param {(baseRev:number, json:string) => Promise<{kind:'ok',rev:number}|{kind:'conflict',rev:number,data:object}|{kind:'limited',retryAfter:number}|{kind:'offline'}|{kind:'auth'}|{kind:'error'}>} o.push
 * @param {(since:number) => Promise<{kind:'unchanged'}|{kind:'data',rev:number,data:object}|{kind:'limited',retryAfter:number}|{kind:'offline'}|{kind:'auth'}|{kind:'error'}>} o.pull
 * @param {{saveState:Function, saveBase:Function, saveMeta:Function}} o.store
 * @param {(state:object, info:{remote:boolean, conflicts:string[]}) => void} o.applyState
 * @param {(s:{status:string, pending:boolean, conflicts:string[]}) => void} [o.onStatus]
 */
export function createSyncEngine({ tenantId, deviceId, push, pull, store, applyState, onStatus = () => {}, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, debounceMs = 600, maxWaitMs = 3000 }) {
  let serverRev = 0;
  let base = null;
  let local = null;
  let dirty = false;
  let initialized = false; // ilk başarılı pull yapıldı mı (baseRev bilinmeden gönderilmez)
  let pushing = false;
  let pulling = false;
  let again = false;
  let pushTimer = null;
  let firstQueuedAt = 0;
  let retryTimer = null;
  let attempt = 0;
  let status = "connecting";
  let lastConflicts = [];
  let destroyed = false;

  const emit = (s) => { status = s; try { onStatus({ status, pending: dirty, conflicts: lastConflicts }); } catch (e) { /* arayüz hatası eşitlemeyi bozmasın */ } };
  const persistMeta = () => store.saveMeta({ serverRev, dirty });
  const hasContent = (s) => !!s && ((Array.isArray(s.sales) && s.sales.length > 0) || (Array.isArray(s.tables) && s.tables.some((t) => t && t.items && t.items.length)) || (Array.isArray(s.products) && s.products.length > 0));

  function clearTimers() {
    if (pushTimer) clearTimer(pushTimer);
    if (retryTimer) clearTimer(retryTimer);
    pushTimer = retryTimer = null;
  }

  function scheduleRetry(ms) {
    if (destroyed) return;
    if (retryTimer) clearTimer(retryTimer);
    retryTimer = setTimer(() => { retryTimer = null; if (initialized) flush(); else pullNow(); }, ms);
  }

  function backoff() {
    const ms = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt += 1;
    return ms;
  }

  function envelope(state) {
    return JSON.stringify({ version: "1.0", tenantId, ...state, exportedAt: new Date(now()).toISOString() });
  }

  function adoptRemote(rev, data) {
    const remote = stripMeta(data);
    if (!dirty || !local) {
      serverRev = rev; base = remote; local = remote; dirty = false;
      store.saveState(remote); store.saveBase(remote); persistMeta();
      applyState(remote, { remote: true, conflicts: [] });
      lastConflicts = [];
      return false;
    }
    const { merged, conflicts } = mergeStates(base, local, remote);
    serverRev = rev; base = remote; local = stripMeta(merged);
    lastConflicts = conflicts;
    store.saveState(local); store.saveBase(remote); persistMeta();
    applyState(local, { remote: false, conflicts });
    return true;
  }

  async function flush() {
    if (destroyed || !dirty || !initialized) return;
    if (pushing) { again = true; return; }
    pushing = true;
    const sent = local;
    let res;
    try { res = await push(serverRev, envelope(sent)); } catch (e) { res = { kind: "offline" }; }
    pushing = false;
    if (destroyed) return;
    switch (res.kind) {
      case "ok":
        serverRev = res.rev; base = sent; attempt = 0;
        dirty = local !== sent; // gönderirken yeni değişiklik olduysa hâlâ kirli
        store.saveBase(sent); persistMeta();
        if (dirty || again) { again = false; scheduleSoon(); }
        emit(dirty ? "pending" : "synced");
        break;
      case "conflict": {
        const merged = adoptRemote(res.rev, res.data);
        attempt = 0;
        emit(merged ? "pending" : "synced");
        if (merged) scheduleSoon(); // birleşik durumu gönder
        break;
      }
      case "limited":
        emit("pending");
        scheduleRetry(Math.max(1000, (res.retryAfter || 30) * 1000 + 250));
        break;
      case "auth":
        emit("blocked");
        break;
      default: // offline | error
        emit("offline");
        scheduleRetry(backoff());
    }
  }

  function scheduleSoon() {
    if (destroyed) return;
    if (pushTimer) clearTimer(pushTimer);
    pushTimer = setTimer(() => { pushTimer = null; firstQueuedAt = 0; flush(); }, 150);
  }

  async function pullNow() {
    if (destroyed || pulling) return;
    pulling = true;
    let res;
    try { res = await pull(serverRev); } catch (e) { res = { kind: "offline" }; }
    pulling = false;
    if (destroyed) return;
    switch (res.kind) {
      case "unchanged":
        initialized = true;
        if (dirty) flush(); else emit("synced");
        break;
      case "data": {
        const wasInit = initialized;
        initialized = true;
        const serverEmpty = !res.rev;
        if (serverEmpty && !wasInit) {
          // Sunucu boş: yerel içerik varsa yükle (ilk kurulum / veri sıfırlama sonrası).
          serverRev = 0;
          if (hasContent(local)) { dirty = true; persistMeta(); flush(); } else emit("synced");
          break;
        }
        if (res.rev <= serverRev && wasInit) { if (dirty) flush(); else emit("synced"); break; }
        const merged = adoptRemote(res.rev, res.data);
        attempt = 0;
        if (merged) { emit("pending"); scheduleSoon(); } else emit("synced");
        break;
      }
      case "limited": emit(dirty ? "pending" : "synced"); break;
      case "auth": emit("blocked"); break;
      default: emit(dirty ? "offline" : "offline");
    }
  }

  return {
    /** Açılış: yerel kalıcı durum + üst veri (IndexedDB'den). */
    init({ state, base: storedBase, meta }) {
      local = state ? stripMeta(state) : null;
      base = storedBase ? stripMeta(storedBase) : null;
      serverRev = Number(meta && meta.serverRev) || 0;
      dirty = !!(meta && meta.dirty) && !!local;
      emit(dirty ? "pending" : "connecting");
    },
    /** Arayüz durumu değişti (kullanıcı eylemi). */
    localChanged(state) {
      if (destroyed) return;
      local = stripMeta(state);
      dirty = true;
      store.saveState(local); persistMeta();
      emit(status === "offline" ? "offline" : "pending");
      if (!firstQueuedAt) firstQueuedAt = now();
      if (pushTimer) clearTimer(pushTimer);
      if (retryTimer && status === "offline") return; // geri çekilme sürüyor; bağlantı gelince onOnline tetikler
      const wait = Math.max(0, Math.min(debounceMs, firstQueuedAt + maxWaitMs - now()));
      pushTimer = setTimer(() => { pushTimer = null; firstQueuedAt = 0; flush(); }, wait);
    },
    pull: pullNow,
    flush,
    /** Bağlantı geri geldi (online olayı / soket bağlandı / görünür oldu). */
    onOnline() {
      attempt = 0;
      if (retryTimer) { clearTimer(retryTimer); retryTimer = null; }
      pullNow().then(() => { if (dirty) flush(); });
    },
    /** Sayfa kapanırken bekleyeni hemen göndermeyi dener. */
    flushNow() { if (pushTimer) { clearTimer(pushTimer); pushTimer = null; firstQueuedAt = 0; } return flush(); },
    state: () => ({ status, dirty, serverRev, initialized, conflicts: lastConflicts, pushing }),
    destroy() { destroyed = true; clearTimers(); }
  };
}
