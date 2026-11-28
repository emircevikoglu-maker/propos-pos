// Üç yönlü birleştirme (base = sunucunun bildiği son durum, local = bu cihazın durumu, remote = sunucudaki güncel durum).
// Çevrimdışı çalışan cihaz bağlantı gelince başkalarının değişikliğini EZMEDEN kendi değişikliğini ekler.
// Saf fonksiyonlar: DOM/ağ yok, test edilebilir.
//
// Kurallar
//  - Defterler (sales, expenses, stockLog, voidLog): kimliğe göre BİRLEŞİM; silme, base'e göre iki taraftan birinin sildiği kayıt silinir.
//  - Varlık listeleri (tables, products, ingredients, staffList, esnafList, ...): kimlik başına 3 yönlü; iki taraf da değiştirdiyse alan alan.
//  - Sayısal sayaçlar (stock, qty, paidAmount, balance, guests): iki taraf da değiştirdiyse DELTA birleşir (remote + (local − base)).
//  - Başka alanlarda gerçek çakışma: yerel kazanır ve çakışma yolu raporlanır.
//  - Metin listeleri (zones, categories): küme birleşimi (eklenenler korunur, silinenler silinir).

export const LEDGERS = ["sales", "expenses", "stockLog", "voidLog"];
export const STRING_SETS = ["zones", "categories"];
export const DELTA_KEYS = ["stock", "qty", "paidAmount", "balance", "guests"];
export const META_KEYS = ["version", "tenantId", "rev", "exportedAt", "updatedBy"];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isIdArray = (a) => Array.isArray(a) && a.every((x) => isObj(x) && typeof x.id === "string") && a.length > 0;
const safeKey = (k) => k !== "__proto__" && k !== "constructor" && k !== "prototype";

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isObj(a)) {
    if (!isObj(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

const byId = (arr) => { const m = new Map(); (Array.isArray(arr) ? arr : []).forEach((x) => { if (isObj(x) && typeof x.id === "string" && !m.has(x.id)) m.set(x.id, x); }); return m; };

/** Defter: iki taraftaki kayıtların birleşimi; base'e göre silinenler çıkar. Sıra: yeniden eskiye (timestamp), yoksa remote sırası. */
export function mergeLedger(base, local, remote) {
  const b = byId(base), l = byId(local), r = byId(remote);
  const ids = new Set([...l.keys(), ...r.keys()]);
  const out = [];
  ids.forEach((id) => {
    const inBase = b.has(id), inL = l.has(id), inR = r.has(id);
    if (inBase && (!inL || !inR)) return; // bir taraf sildi
    out.push(inR ? r.get(id) : l.get(id));
  });
  const t = (x) => { const n = Date.parse(x && x.timestamp); return Number.isFinite(n) ? n : 0; };
  return out.sort((x, y) => t(y) - t(x));
}

export function mergeStringSet(base, local, remote) {
  const b = new Set(Array.isArray(base) ? base : []), l = Array.isArray(local) ? local : [], r = Array.isArray(remote) ? remote : [];
  const lSet = new Set(l), rSet = new Set(r);
  const out = [];
  const seen = new Set();
  [...r, ...l].forEach((x) => {
    if (typeof x !== "string" || seen.has(x)) return;
    seen.add(x);
    if (b.has(x) && (!lSet.has(x) || !rSet.has(x))) return; // bir taraf sildi
    out.push(x);
  });
  return out;
}

/** @returns {{value:any, conflicts:string[]}} */
export function mergeValue(base, local, remote, path = "", key = "") {
  const conflicts = [];
  const walk = (b, l, r, p, k) => {
    if (deepEqual(l, r)) return l;
    if (deepEqual(l, b)) return r;
    if (deepEqual(r, b)) return l;
    // ikisi de değişti
    if (b === undefined) { // base yok (ilk eşitleme): boş tarafın diğerini ezmesine izin verme
      if (Array.isArray(l) && l.length === 0) return r;
      if (Array.isArray(r) && r.length === 0) return l;
    }
    if (isIdArray(l) && isIdArray(r) && (b === undefined || Array.isArray(b))) return mergeEntities(b, l, r, p);
    if (isObj(l) && isObj(r)) {
      const out = {};
      const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
      keys.forEach((kk) => {
        if (!safeKey(kk)) return;
        const inL = Object.prototype.hasOwnProperty.call(l, kk), inR = Object.prototype.hasOwnProperty.call(r, kk);
        const bb = isObj(b) ? b[kk] : undefined;
        const bInB = isObj(b) && Object.prototype.hasOwnProperty.call(b, kk);
        if (inL && !inR) { if (bInB && deepEqual(l[kk], bb)) return; out[kk] = l[kk]; return; }
        if (!inL && inR) { if (bInB && deepEqual(r[kk], bb)) return; out[kk] = r[kk]; return; }
        out[kk] = walk(bb, l[kk], r[kk], p ? `${p}.${kk}` : kk, kk);
      });
      return out;
    }
    if (typeof l === "number" && typeof r === "number" && typeof b === "number" && DELTA_KEYS.includes(k)) {
      return Math.round((r + (l - b)) * 1000) / 1000;
    }
    conflicts.push(p || "(kök)");
    return l; // gerçek çakışma: yerel kazanır
  };
  const mergeEntities = (b, l, r, p) => {
    const bm = byId(b), lm = byId(l), rm = byId(r);
    const ids = [];
    const seen = new Set();
    [...r.map((x) => x.id), ...l.map((x) => x.id)].forEach((id) => { if (!seen.has(id)) { seen.add(id); ids.push(id); } });
    const out = [];
    ids.forEach((id) => {
      const inB = bm.has(id), inL = lm.has(id), inR = rm.has(id);
      if (inL && inR) { out.push(walk(bm.get(id), lm.get(id), rm.get(id), `${p}[${id}]`, "")); return; }
      if (inL && !inR) {
        if (inB && deepEqual(lm.get(id), bm.get(id))) return;   // uzak sildi, yerelde değişmedi → sil
        if (inB) conflicts.push(`${p}[${id}]`);                  // uzak sildi ama yerelde değişti → yerel korunur
        out.push(lm.get(id));
        return;
      }
      if (!inL && inR) {
        if (inB && deepEqual(rm.get(id), bm.get(id))) return;    // yerel sildi, uzakta değişmedi → sil
        if (inB) conflicts.push(`${p}[${id}]`);
        out.push(rm.get(id));
      }
    });
    return out;
  };
  return { value: walk(base, local, remote, path, key), conflicts };
}

/**
 * Tüm durumu birleştirir.
 * @param {object|null} base  sunucunun bildiğimiz son durumu (yoksa boş nesne gibi davranılır)
 * @returns {{ merged: object, conflicts: string[], changedRemote: boolean }}
 */
export function mergeStates(base, local, remote) {
  const B = isObj(base) ? base : {}, L = isObj(local) ? local : {}, R = isObj(remote) ? remote : {};
  const merged = {};
  const conflicts = [];
  const keys = new Set([...Object.keys(L), ...Object.keys(R)]);
  keys.forEach((k) => {
    if (!safeKey(k) || META_KEYS.includes(k)) return;
    const inL = Object.prototype.hasOwnProperty.call(L, k), inR = Object.prototype.hasOwnProperty.call(R, k);
    if (inL && !inR) { merged[k] = L[k]; return; }
    if (!inL && inR) { merged[k] = R[k]; return; }
    if (LEDGERS.includes(k)) { merged[k] = mergeLedger(B[k], L[k], R[k]); return; }
    if (STRING_SETS.includes(k) && Array.isArray(L[k]) && Array.isArray(R[k])) { merged[k] = mergeStringSet(B[k], L[k], R[k]); return; }
    const res = mergeValue(B[k], L[k], R[k], k, k);
    merged[k] = res.value;
    conflicts.push(...res.conflicts);
  });
  // Üst veriyi koru (sunucu rev/updatedBy'ı kendisi yazar)
  META_KEYS.forEach((k) => { if (Object.prototype.hasOwnProperty.call(L, k)) merged[k] = L[k]; });
  return { merged, conflicts, changedRemote: !deepEqual(stripMeta(R), stripMeta(merged)) };
}

export function stripMeta(state) {
  const out = {};
  Object.keys(isObj(state) ? state : {}).forEach((k) => { if (!META_KEYS.includes(k) && safeKey(k)) out[k] = state[k]; });
  return out;
}
