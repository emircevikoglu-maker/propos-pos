// Atık / sayım kaydı (stok doğruluğu ve "kaçak var mı" sorusu için). Saf fonksiyonlar; senkrona `stockLog` olarak girer.
export const WASTE_REASONS = ["Son kullanma", "Döküldü / kırıldı", "Hatalı hazırlama", "Personel tüketimi", "Diğer"];
export const MAX_LOG = 2000;

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const money = (n) => Math.round(n * 100) / 100;

/**
 * Stok işlemi kaydı üretir; kayıt gerektirmeyen işlemde (alım) null döner.
 * waste: stoktan fazlası düşülemez (gerçekten düşen miktar yazılır). set: sayılan değer; fark = sayılan − sistem.
 * @returns {{entry: object|null, newStock: number}|null} geçersiz girişte null
 */
export function applyStockAction({ type, ingredient, amount, reason, now = new Date(), id }) {
  if (!ingredient || typeof ingredient !== "object") return null;
  const val = num(amount);
  const stock = num(ingredient.stock);
  const unitCost = Number.isFinite(num(ingredient.unitCost)) ? num(ingredient.unitCost) : 0;
  if (!Number.isFinite(val) || !Number.isFinite(stock)) return null;
  const base = { id: id || `sl-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: now.toISOString(), ingredientId: ingredient.id, name: String(ingredient.name || "").slice(0, 80), unit: String(ingredient.unit || "").slice(0, 12) };
  if (type === "add") {
    if (val <= 0) return null;
    return { entry: null, newStock: stock + val };
  }
  if (type === "waste") {
    if (val <= 0) return null;
    const actual = Math.min(stock, val);
    const why = WASTE_REASONS.includes(reason) ? reason : "Diğer";
    return { entry: actual > 0 ? { ...base, kind: "waste", amount: actual, cost: money(actual * unitCost), reason: why } : null, newStock: stock - actual };
  }
  if (type === "set") {
    if (val < 0) return null;
    const diff = money(val - stock);
    return { entry: diff !== 0 ? { ...base, kind: "count", amount: diff, expected: stock, counted: val, cost: money(diff * unitCost), reason: diff < 0 ? "Sayım eksiği" : "Sayım fazlası" } : null, newStock: val };
  }
  return null;
}

export const appendLog = (log, entry) => (entry ? [entry, ...(Array.isArray(log) ? log : [])].slice(0, MAX_LOG) : (Array.isArray(log) ? log : []));

/** Özet: atık maliyeti, sayım eksiği (negatif) ve fazlası maliyeti. */
export function summarizeStockLog(log, from = 0, to = Infinity) {
  const out = { wasteCost: 0, shortageCost: 0, surplusCost: 0, count: 0 };
  (Array.isArray(log) ? log : []).forEach((e) => {
    const t = Date.parse(e && e.timestamp);
    if (!e || !(t >= from && t <= to)) return;
    const c = num(e.cost);
    if (!Number.isFinite(c)) return;
    out.count += 1;
    if (e.kind === "waste") out.wasteCost += c;
    else if (e.kind === "count") { if (c < 0) out.shortageCost += c; else out.surplusCost += c; }
  });
  Object.keys(out).forEach((k) => { out[k] = money(out[k]); });
  return out;
}
