import { describe, it, expect } from "vitest";
import { isPaymentLine, paymentLine, productStats, closingTotals, itemCount } from "../../src/utils/ledger";

const products = [{ id: "prd-1", name: "Latte", category: "Kahveler", recipe: [{ ingredientId: "i1", amount: 10 }] }, { id: "prd-17", name: "Çay", category: "Kahveler", recipe: [] }];
const ingredients = [{ id: "i1", unitCost: 2 }];
const sale = (items, paymentMethod = "Nakit") => ({ id: Math.random().toString(), paymentMethod, items });

describe("ödeme satırları ürün raporuna karışmaz", () => {
  it("yeni ve eski (prd-1 / prd-17 kimlikli) ödeme satırları tanınır", () => {
    expect(isPaymentLine(paymentLine("Kısmi Hesap Tahsilatı", 50))).toBe(true);
    expect(isPaymentLine({ productId: "prd-1", name: "Kısmi Hesap Tahsilatı" })).toBe(true);
    expect(isPaymentLine({ productId: "prd-17", name: "Cari Aktarım (Berber)" })).toBe(true);
    expect(isPaymentLine({ productId: "prd-17", name: "Esnaf Cari Tahsilatı (Berber)" })).toBe(true);
    expect(isPaymentLine({ productId: "prd-1", name: "Latte" })).toBe(false);
  });

  it("Latte ve Çay adetleri kısmi ödeme/tahsilat yüzünden şişmez", () => {
    const stats = productStats([
      sale([{ productId: "prd-1", name: "Latte", price: 100, qty: 2 }]),
      sale([{ productId: "prd-1", name: "Kısmi Hesap Tahsilatı", price: 500, qty: 1 }]),
      sale([{ productId: "prd-17", name: "Esnaf Cari Tahsilatı (Berber)", price: 900, qty: 1 }]),
      sale([paymentLine("Kısmi Hesap Tahsilatı", 70)])
    ], products, ingredients);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({ id: "prd-1", name: "Latte", qty: 2, revenue: 200, costTotal: 40, profit: 160, share: 100 });
    expect(itemCount(sale([paymentLine("x", 1), { productId: "prd-17", name: "Çay", price: 25, qty: 3 }]))).toBe(3);
  });

  it("ürün adı ilk görülen satırdan değil katalogdan gelir", () => {
    const stats = productStats([sale([{ productId: "prd-1", name: "Eski Latte Adı", price: 100, qty: 1 }])], products, ingredients);
    expect(stats[0].name).toBe("Latte");
  });
});

describe("closingTotals", () => {
  const table = { items: [{ price: 100, qty: 3 }], discount: 20, paidAmount: 100 };
  it("kısmi ödeme sonrası brüt yalnızca kalanı sayar", () => {
    expect(closingTotals(table)).toEqual({ subtotal: 300, gross: 200, discount: 20, remaining: 180 });
  });
  it("ek (esnaf) indirimi brütü aşamaz; negatif kalan olmaz", () => {
    expect(closingTotals(table, 500)).toEqual({ subtotal: 300, gross: 200, discount: 200, remaining: 0 });
    expect(closingTotals({ items: [], paidAmount: 50 })).toEqual({ subtotal: 0, gross: 0, discount: 0, remaining: 0 });
  });
});
