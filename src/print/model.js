// Fiş modeli (saf, düz JSON). POS yazıcı markasını bilmez; yazıcı ajanı (P1-b) ileride aynı modeli alacak.
// Adisyon ve mutfak fişi BİLGİ fişidir, mali belge değildir.
import { lineDetails } from "../utils/productOptions";
import { closingTotals } from "../utils/ledger";

export const STATIONS = ["Bar", "Mutfak"];
export const NO_STATION = "Fiş yok";
const KITCHEN_HINT = /tatlı|atıştır|yemek|tost|mutfak|kahvaltı|sandviç|pizza|burger|salata|çorba|ana /i;
export const DISCLAIMER = "Bilgi fişidir, mali değeri yoktur.";

/** Kategori → istasyon. Ayarlanmamış kategori için ada bakılarak makul varsayılan seçilir. */
export function stationFor(category, stations = {}) {
  const set = stations && Object.prototype.hasOwnProperty.call(stations, category) ? stations[category] : null;
  if (set === NO_STATION || STATIONS.includes(set)) return set;
  return KITCHEN_HINT.test(String(category || "").toLocaleLowerCase("tr-TR")) ? "Mutfak" : "Bar";
}

export const unsentQty = (item) => Math.max(0, (item.qty || 0) - (item.sentQty || 0));
export const unsentCount = (items) => (items || []).reduce((s, i) => s + unsentQty(i), 0);
/** Gönderildi işaretle (değişmeyen satırlar aynı nesne kalır). */
export const markSent = (items) => (items || []).map((i) => (unsentQty(i) > 0 ? { ...i, sentQty: i.qty } : i));

const kitchenLine = (item, qty) => ({ qty, name: item.name, details: lineDetails(item), note: item.note || "" });

/**
 * İstasyon başına mutfak/bar fişi.
 * @param {Array<{item:object, qty:number}>} entries
 * @param {{tableName:string, staffName?:string, time?:string, categoryOf:(productId:string)=>string, stations?:object, cancel?:boolean, reprint?:boolean, reason?:string}} info
 */
export function buildKitchenTickets(entries, info) {
  const groups = new Map();
  (entries || []).forEach(({ item, qty }) => {
    if (!(qty > 0)) return;
    const station = stationFor(info.categoryOf(item.productId), info.stations);
    if (station === NO_STATION) return;
    if (!groups.has(station)) groups.set(station, []);
    groups.get(station).push(kitchenLine(item, qty));
  });
  return STATIONS.filter((s) => groups.has(s)).map((station) => ({
    kind: "kitchen", station, tableName: info.tableName, staffName: info.staffName || "", time: info.time || new Date().toISOString(),
    cancel: !!info.cancel, reprint: !!info.reprint, reason: info.reason || "", lines: groups.get(station)
  }));
}

export const pendingEntries = (items) => (items || []).map((item) => ({ item, qty: unsentQty(item) })).filter((e) => e.qty > 0);

const receiptLine = (i) => ({ qty: i.qty, name: i.name, details: lineDetails(i), note: i.note || "", amount: (Number(i.price) || 0) * (Number(i.qty) || 0) });

/** Açık adisyonun bilgi fişi. */
export function buildTableReceipt(table, { businessName, staffName = "", footer = "", time } = {}) {
  const t = closingTotals(table);
  return {
    kind: "receipt", businessName: businessName || "ProPos", tableName: table.name, staffName, time: time || new Date().toISOString(),
    lines: (table.items || []).map(receiptLine), subtotal: t.subtotal, discount: Math.max(0, Number(table.discount) || 0),
    paid: Math.max(0, Number(table.paidAmount) || 0), total: t.remaining, method: "", footer, disclaimer: DISCLAIMER
  };
}

/** Kapanmış satışın bilgi fişi (ödeme sonrası ya da Analiz → fiş incele). */
export function buildSaleReceipt(sale, { businessName, staffName = "", footer = "" } = {}) {
  const lines = (sale.items || []).map(receiptLine);
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discount = Math.max(0, Number(sale.discount) || 0);
  const total = Number(sale.total) || 0;
  return {
    kind: "receipt", businessName: businessName || "ProPos", tableName: sale.tableName, staffName, time: sale.timestamp,
    lines, subtotal, discount, paid: Math.max(0, Math.round((subtotal - discount - total) * 100) / 100), total, method: sale.paymentMethod || "", footer, disclaimer: DISCLAIMER
  };
}
