// İptal / silinen ürün defteri ve hatasız sipariş serisi (saf fonksiyonlar). Senkrona `voidLog` olarak girer.
import { lineDetails } from "./productOptions";
import { productLines } from "./ledger";

export const VOID_REASONS = ["Müşteri vazgeçti", "Yanlış giriş", "Bozuk / döküldü", "İkram"];
export const MAX_VOIDS = 2000;

const newVoidId = (now) => `vd-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Adet azaltmanın etkisi. Gönderilmiş adet ancak gönderilmemişler bitince eksilir.
 * @returns {{removed:number, sentRemoved:number, wholeLine:boolean, sentQty:number}}
 */
export function removalEffect(item, delta) {
  const qty = item.qty || 0;
  const sent = Math.min(qty, item.sentQty || 0);
  const removed = Math.min(qty, Math.max(0, -delta));
  const sentRemoved = Math.max(0, removed - (qty - sent));
  return { removed, sentRemoved, wholeLine: removed > 0 && removed === qty, sentQty: sent - sentRemoved };
}

/** Kayda değer mi: gönderilmiş adet eksildiyse ya da satır tümden silindiyse. */
export function lineVoid({ table, item, delta, reason = "", user = "", now = Date.now() }) {
  const e = removalEffect(item, delta);
  if (!e.sentRemoved && !e.wholeLine) return null;
  const qty = e.sentRemoved || e.removed;
  return {
    id: newVoidId(now), timestamp: new Date(now).toISOString(), kind: "line", tableId: table.id, tableName: table.name,
    productId: item.productId, name: item.name, details: lineDetails(item), qty, unitPrice: item.price, amount: item.price * qty,
    afterSend: e.sentRemoved > 0, staffId: table.staffId || "", user, reason
  };
}

export function receiptVoid({ sale, user = "", now = Date.now() }) {
  return {
    id: newVoidId(now), timestamp: new Date(now).toISOString(), kind: "receipt", tableId: "", tableName: sale.tableName,
    productId: "", name: "Adisyon kaydı silindi", details: productLines(sale).map((i) => `${i.qty}× ${i.name}`).join(", "),
    qty: 1, unitPrice: Number(sale.total) || 0, amount: Number(sale.total) || 0, afterSend: true, staffId: sale.staffId || "", user, reason: "Kayıt silindi"
  };
}

export const appendVoids = (log, entries) => [...entries.filter(Boolean), ...(Array.isArray(log) ? log : [])].slice(0, MAX_VOIDS);

export function summarizeVoids(list, nameOf = (e) => e.user || "Bilinmiyor") {
  const out = { count: 0, qty: 0, amount: 0, afterSendCount: 0, afterSendAmount: 0, byPerson: [] };
  const people = new Map();
  (Array.isArray(list) ? list : []).forEach((e) => {
    const amount = Number(e.amount) || 0;
    out.count += 1; out.qty += Number(e.qty) || 0; out.amount += amount;
    if (e.afterSend) { out.afterSendCount += 1; out.afterSendAmount += amount; }
    const key = nameOf(e);
    const p = people.get(key) || { name: key, count: 0, amount: 0 };
    p.count += 1; p.amount += amount;
    people.set(key, p);
  });
  out.byPerson = [...people.values()].sort((a, b) => b.amount - a.amount);
  return out;
}

/** Sipariş sayılan satış: ürün satırı olan (yalnızca kısmi tahsilat / cari tahsilat kayıtları sayılmaz). */
const isOrder = (s) => productLines(s).length > 0;

/**
 * Hatasız sipariş serisi: art arda kapanan siparişler. Mutfağa gitmiş ürünün iptali, silinen adisyon kaydı
 * ya da ikram/iptal kapanışı seriyi sıfırlar. Gün sonu seriyi sıfırlamaz.
 * @returns {{current:number, best:number}}
 */
export function cleanStreak(sales, voidLog) {
  const events = [
    ...(Array.isArray(sales) ? sales : []).filter((s) => s && isOrder(s)).map((s) => ({ t: Date.parse(s.timestamp), brk: s.paymentMethod === "İkram / İptal" })),
    ...(Array.isArray(voidLog) ? voidLog : []).filter((v) => v && v.afterSend).map((v) => ({ t: Date.parse(v.timestamp), brk: true }))
  ].filter((e) => Number.isFinite(e.t)).sort((a, b) => a.t - b.t);
  let current = 0, best = 0;
  events.forEach((e) => { current = e.brk ? 0 : current + 1; if (current > best) best = current; });
  return { current, best };
}
