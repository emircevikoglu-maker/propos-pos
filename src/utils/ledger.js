// Satış defteri kuralları (saf fonksiyonlar).
// "Ödeme satırı" = ürün olmayan satır (kısmi tahsilat, cari aktarım, cari tahsilat). Ürün raporuna ve adet sayımına girmez.

export const PAYMENT_LINE_ID = "__payment";
// 3.9.1 ve öncesi bu satırları gerçek ürün kimliğiyle (prd-1 / prd-17) yazıyordu; eski kayıtlar adından tanınır.
const LEGACY_PAYMENT_NAME = /^(Kısmi Hesap Tahsilatı$|Cari Aktarım \(|Esnaf Cari Tahsilatı \()/;

export const isPaymentLine = (item) => !!item && (item.productId === PAYMENT_LINE_ID || LEGACY_PAYMENT_NAME.test(String(item.name || "")));
export const paymentLine = (name, amount) => ({ productId: PAYMENT_LINE_ID, name, price: amount, qty: 1 });
export const productLines = (sale) => ((sale && sale.items) || []).filter((i) => !isPaymentLine(i));
export const itemCount = (sale) => productLines(sale).reduce((s, i) => s + (Number(i.qty) || 0), 0);

export const linesTotal = (items) => (items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);

/**
 * Masayı kapatırken yazılacak tutarlar. Daha önce alınan kısmi ödemeler kendi satış kaydında sayıldığı için
 * brüt yalnızca kalanı içerir (Z raporu brütü iki kez saymaz).
 * @returns {{subtotal:number, gross:number, discount:number, remaining:number}}
 */
export function closingTotals(table, extraDiscount = 0) {
  const subtotal = linesTotal(table && table.items);
  const paid = Math.max(0, Number(table && table.paidAmount) || 0);
  const gross = Math.max(0, subtotal - paid);
  const discount = Math.min(gross, Math.max(0, (Number(table && table.discount) || 0) + (Number(extraDiscount) || 0)));
  return { subtotal, gross, discount, remaining: Math.max(0, gross - discount) };
}

/** 1 adet ürünün reçete maliyeti. */
export function recipeCost(product, ingredients) {
  const byId = ingredients instanceof Map ? ingredients : new Map((ingredients || []).map((i) => [i.id, i]));
  return ((product && product.recipe) || []).reduce((s, r) => s + (Number(byId.get(r.ingredientId)?.unitCost) || 0) * (Number(r.amount) || 0), 0);
}

/** Ürün bazında adet / ciro / maliyet / kâr (ikram ve ödeme satırları hariç), adede göre sıralı. */
export function productStats(sales, products, ingredients) {
  const byId = new Map((ingredients || []).map((i) => [i.id, i]));
  const map = new Map();
  let totalRevenue = 0;
  (sales || []).forEach((sale) => {
    if (sale.paymentMethod === "İkram / İptal") return;
    productLines(sale).forEach((item) => {
      let entry = map.get(item.productId);
      if (!entry) {
        const prd = (products || []).find((p) => p.id === item.productId);
        entry = { id: item.productId, name: prd?.name || item.name, category: prd?.category || "Diğer", image: prd?.image || "☕", unitPrice: item.price, unitCost: Math.round(recipeCost(prd, byId) * 10) / 10, qty: 0, revenue: 0, costTotal: 0, profit: 0 };
        map.set(item.productId, entry);
      }
      const rev = item.qty * item.price, cost = item.qty * entry.unitCost;
      entry.qty += item.qty; entry.revenue += rev; entry.costTotal += cost; entry.profit += rev - cost;
      totalRevenue += rev;
    });
  });
  return [...map.values()].sort((a, b) => b.qty - a.qty).map((p) => ({ ...p, share: totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0 }));
}
