// Küçük saf yardımcılar: barkod arama, kuver (kişi sayısı), kasa sayımı farkı.

/** Barkod tam eşleşme (büyük/küçük harf ve boşluktan bağımsız). Eşleşme yoksa null. Barkod boşsa asla eşleşmez. */
export function findByBarcode(products, code) {
  const c = String(code == null ? "" : code).trim().toLowerCase();
  if (!c || !Array.isArray(products)) return null;
  return products.find((p) => p && typeof p.barcode === "string" && p.barcode.trim().toLowerCase() === c) || null;
}

export const cleanBarcode = (v) => String(v == null ? "" : v).replace(/[^A-Za-z0-9._-]/g, "").slice(0, 32);

/** Başka üründe aynı barkod var mı? */
export const barcodeTaken = (products, code, exceptId) => {
  const c = cleanBarcode(code).toLowerCase();
  return !!c && (products || []).some((p) => p && p.id !== exceptId && typeof p.barcode === "string" && p.barcode.toLowerCase() === c);
};

export const MAX_GUESTS = 99;
export const normalizeGuests = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(MAX_GUESTS, n)) : 0; };

/** Kuver raporu: toplam kişi, kişi başı ciro (kuver girilmemiş satışlar hariç). */
export function coverStats(sales) {
  let guests = 0, revenue = 0, withGuests = 0;
  (Array.isArray(sales) ? sales : []).forEach((s) => {
    const g = normalizeGuests(s && s.guests);
    if (g > 0 && Number.isFinite(Number(s.total)) && s.paymentMethod !== "İkram / İptal") { guests += g; revenue += Number(s.total); withGuests += 1; }
  });
  return { guests, withGuests, perGuest: guests > 0 ? Math.round((revenue / guests) * 100) / 100 : 0 };
}

/** Kasa sayımı: beklenen çekmece ile sayılan fark. status: ok | short | over | invalid */
export function cashDifference(expected, counted) {
  const e = Number(expected), c = Number(counted);
  if (!Number.isFinite(e) || !Number.isFinite(c) || c < 0 || counted === "" || counted == null) return { diff: 0, status: "invalid" };
  const diff = Math.round((c - e) * 100) / 100;
  return { diff, status: diff === 0 ? "ok" : diff < 0 ? "short" : "over" };
}
