// Kampanya / happy hour kuralları (saf fonksiyonlar). Tanımlar brandSettings.campaigns içinde senkronlanır.
// { id, name, active, days:[1..7] (1 = Pazartesi), from:"HH:MM", to:"HH:MM",
//   scope:"all"|"category"|"product", targets:[kategori adı | ürün kimliği], kind:"percent"|"amount"|"price", value }
// Saat cihaz saatidir. from > to ise aralık gece yarısını aşar ve GÜN, aralığın başladığı güne göre değerlendirilir.
// from == to → tüm gün. Fiyat satır eklenirken sabitlenir; birden çok kampanya uyuyorsa müşteriye en uygunu (birikmez).

export const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const KINDS = [["percent", "Yüzde indirim"], ["amount", "Tutar indirimi"], ["price", "Sabit fiyat"]];
export const SCOPES = [["all", "Tüm menü"], ["category", "Kategori"], ["product", "Ürün"]];

const toMin = (hhmm) => {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const isoDay = (date) => ((date.getDay() + 6) % 7) + 1;
const money = (n) => Math.round(n * 100) / 100;

export function isActiveAt(c, now = Date.now()) {
  if (!c || c.active === false || !Array.isArray(c.days)) return false;
  const from = toMin(c.from), to = toMin(c.to);
  if (from === null || to === null) return false;
  const d = new Date(now);
  const minute = d.getHours() * 60 + d.getMinutes();
  const today = isoDay(d), yesterday = today === 1 ? 7 : today - 1;
  if (from === to) return c.days.includes(today);
  if (from < to) return c.days.includes(today) && minute >= from && minute < to;
  return (minute >= from && c.days.includes(today)) || (minute < to && c.days.includes(yesterday));
}

export function appliesTo(c, product) {
  if (!c || !product) return false;
  if (c.scope === "all") return true;
  const targets = Array.isArray(c.targets) ? c.targets : [];
  return c.scope === "category" ? targets.includes(product.category) : c.scope === "product" && targets.includes(product.id);
}

/** Tek kampanyanın birim fiyata etkisi. `unit` seçenekler dahil, `base` ürünün liste fiyatı. Asla negatif olmaz. */
export function discounted(c, unit, base) {
  const value = Number(c && c.value);
  if (!Number.isFinite(value) || value < 0) return unit;
  if (c.kind === "percent") return money(unit * (1 - Math.min(100, value) / 100));
  if (c.kind === "amount") return money(Math.max(0, unit - value));
  if (c.kind === "price") return money(Math.max(0, value + (unit - base))); // seçenek farkı korunur
  return unit;
}

/** @returns {{price:number, campaign:object|null}} */
export function bestPrice(campaigns, product, unit, now = Date.now()) {
  const base = Number(product && product.price) || 0;
  return (Array.isArray(campaigns) ? campaigns : []).reduce((best, c) => {
    if (!isActiveAt(c, now) || !appliesTo(c, product)) return best;
    const price = discounted(c, unit, base);
    return price < best.price ? { price, campaign: c } : best;
  }, { price: unit, campaign: null });
}

export const campaignLabel = (c) => (c.kind === "percent" ? `${c.name} −%${c.value}` : c.name);

/** Adisyon satırına kampanyayı sabitler (uygun yoksa satır aynen döner). */
export function applyCampaign(campaigns, product, line, now = Date.now()) {
  const { price, campaign } = bestPrice(campaigns, product, line.price, now);
  return campaign ? { ...line, price, listPrice: line.price, campaignId: campaign.id, campaignName: campaignLabel(campaign) } : line;
}

/**
 * Satırın çeşidi değiştiğinde: satıra sabitlenmiş kampanya (süresi bitmiş olsa da) yeni liste fiyatına uygulanır;
 * kampanya silinmişse liste fiyatı geçerli olur.
 */
export function repriceLine(campaigns, product, line) {
  const { listPrice, campaignId, campaignName, ...rest } = line;
  if (!campaignId) return rest;
  const c = (campaigns || []).find((x) => x.id === campaignId);
  if (!c) return rest;
  return { ...rest, price: discounted(c, line.price, Number(product.price) || 0), listPrice: line.price, campaignId, campaignName };
}

export function validateCampaign(c) {
  const errors = [];
  if (!String(c.name || "").trim()) errors.push("Kampanya adını yazın.");
  if (!Array.isArray(c.days) || c.days.length === 0) errors.push("En az bir gün seçin.");
  if (toMin(c.from) === null || toMin(c.to) === null) errors.push("Saatleri SS:DD biçiminde girin.");
  const v = Number(c.value);
  if (!Number.isFinite(v) || v < 0 || (c.kind !== "price" && v === 0)) errors.push("İndirim ya da fiyat değeri girin.");
  if (c.kind === "percent" && v > 100) errors.push("Yüzde 100'ü aşamaz.");
  if (c.scope !== "all" && !(Array.isArray(c.targets) && c.targets.length)) errors.push(c.scope === "category" ? "Kategori seçin." : "Ürün seçin.");
  return errors;
}

/** İndirim raporu: kampanya, elle indirim ve ikram toplamları. */
export function discountReport(sales) {
  const out = { campaign: 0, manual: 0, comp: 0, compCount: 0, byCampaign: [] };
  const map = new Map();
  (sales || []).forEach((s) => {
    if (s.paymentMethod === "İkram / İptal") { out.comp += Number(s.total) || 0; out.compCount += 1; return; }
    out.manual += Number(s.discount) || 0;
    (s.items || []).forEach((i) => {
      if (!i.campaignId || !(i.listPrice > i.price)) return;
      const saved = (i.listPrice - i.price) * i.qty;
      out.campaign += saved;
      const row = map.get(i.campaignId) || { id: i.campaignId, name: i.campaignName || "Kampanya", qty: 0, amount: 0 };
      row.qty += i.qty; row.amount += saved;
      map.set(i.campaignId, row);
    });
  });
  out.byCampaign = [...map.values()].sort((a, b) => b.amount - a.amount);
  return out;
}
