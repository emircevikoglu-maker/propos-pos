import { describe, it, expect } from "vitest";
import { TAB_PATHS, tabFromPath, tableIdFromPath, tablePath } from "../../src/ui/routes";
import { cashChoices } from "../../src/ui/PaySheet";
import { tableRemaining, tableSubtotal, tableCount } from "../../src/ui/hooks";

describe("yönlendirme sözleşmesi", () => {
  it("her sekmenin yolu kendine geri çözülür", () => {
    Object.entries(TAB_PATHS).forEach(([tab, path]) => expect(tabFromPath(path)).toBe(tab));
  });
  it("alt yollar aynı sekmeye aittir; bilinmeyen yol masalara düşer", () => {
    expect(tabFromPath("/masalar/tbl-3")).toBe("pos");
    expect(tabFromPath("/stok/detay")).toBe("inventory");
    expect(tabFromPath("/yok")).toBe("pos");
    expect(tabFromPath("/masalarim")).toBe("pos");
  });
  it("masa kimliği yoldan okunur ve kodlanır/çözülür", () => {
    expect(tableIdFromPath("/masalar/tbl-1")).toBe("tbl-1");
    expect(tableIdFromPath("/masalar")).toBeNull();
    expect(tableIdFromPath("/stok/tbl-1")).toBeNull();
    expect(tableIdFromPath(tablePath("Bahçe 1/özel"))).toBe("Bahçe 1/özel");
    expect(tableIdFromPath("/masalar/%E0%A4%A")).toBeNull(); // bozuk kodlama patlatmaz
    expect(tablePath(null)).toBe("/masalar");
  });
});

describe("ödeme yardımcıları", () => {
  it("nakit seçenekleri: tam tutar + artan, tekrarsız 4 kupür", () => {
    const c = cashChoices(430);
    expect(c[0]).toBe(430);
    expect(c).toHaveLength(4);
    expect(new Set(c).size).toBe(4);
    expect(c.slice(1).every((v) => v > 430)).toBe(true);
    expect(cashChoices(500)[0]).toBe(500);
    expect(new Set(cashChoices(500)).size).toBe(4);
  });
  it("masa toplamları: indirim ve kısmi ödeme düşülür, negatif olmaz", () => {
    const t = { items: [{ price: 100, qty: 2 }, { price: 30, qty: 1 }], discount: 20, paidAmount: 50 };
    expect(tableSubtotal(t)).toBe(230);
    expect(tableRemaining(t)).toBe(160);
    expect(tableCount(t)).toBe(3);
    expect(tableRemaining({ items: [{ price: 10, qty: 1 }], discount: 50, paidAmount: 0 })).toBe(0);
    expect(tableRemaining(null)).toBe(0);
  });
});
