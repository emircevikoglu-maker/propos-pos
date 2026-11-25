import { describe, it, expect } from "vitest";
import { mergeStates, mergeLedger, mergeStringSet, mergeValue, deepEqual, stripMeta } from "../../src/services/merge";

const sale = (id, total, ts = "2026-11-25T10:00:00Z") => ({ id, total, timestamp: ts, paymentMethod: "Nakit" });
const table = (id, items = [], extra = {}) => ({ id, name: id, status: items.length ? "occupied" : "empty", items, discount: 0, paidAmount: 0, guests: 0, ...extra });
const line = (id, qty, extra = {}) => ({ id, productId: "p1", name: "Çay", price: 25, qty, ...extra });
const ing = (id, stock) => ({ id, name: id, stock, unitCost: 1 });

describe("defter birleşimi (satış/gider/stok kaydı)", () => {
  it("iki cihazın çevrimdışı satışları birleşir, çift satış olmaz", () => {
    const base = [sale("s1", 10)];
    const local = [sale("s3", 30, "2026-11-25T12:00:00Z"), sale("s1", 10)];
    const remote = [sale("s2", 20, "2026-11-25T11:00:00Z"), sale("s1", 10)];
    expect(mergeLedger(base, local, remote).map((s) => s.id)).toEqual(["s3", "s2", "s1"]);
  });

  it("aynı satış iki tarafta da varsa tek kayıt kalır (idempotent)", () => {
    const x = [sale("s1", 10), sale("s2", 5)];
    expect(mergeLedger([], x, x)).toHaveLength(2);
  });

  it("bir tarafın silmesi (base'e göre) korunur", () => {
    const base = [sale("s1", 10), sale("s2", 20)];
    expect(mergeLedger(base, [sale("s2", 20)], base).map((s) => s.id)).toEqual(["s2"]);
    expect(mergeLedger(base, base, [sale("s1", 10)]).map((s) => s.id)).toEqual(["s1"]);
  });

  it("bozuk girdi çökertmez", () => {
    expect(mergeLedger(null, "çöp", undefined)).toEqual([]);
    expect(mergeLedger([], [null, 5, { total: 1 }, sale("a", 1)], [])).toHaveLength(1);
  });
});

describe("varlık birleşimi (masalar, stok, ürünler)", () => {
  it("farklı masalardaki değişiklikler birbirini ezmez", () => {
    const base = { tables: [table("t1"), table("t2"), table("t3")] };
    const local = { tables: [table("t1", [line("a", 2)]), table("t2"), table("t3")] };
    const remote = { tables: [table("t1"), table("t2", [line("b", 1)]), table("t3")] };
    const { merged, conflicts } = mergeStates(base, local, remote);
    expect(merged.tables[0].items).toHaveLength(1);
    expect(merged.tables[1].items).toHaveLength(1);
    expect(conflicts).toEqual([]);
  });

  it("aynı masaya iki cihaz farklı satır ekledi: ikisi de korunur", () => {
    const base = { tables: [table("t1", [line("a", 1)])] };
    const local = { tables: [table("t1", [line("a", 1), line("l1", 2)])] };
    const remote = { tables: [table("t1", [line("a", 1), line("r1", 3)])] };
    const { merged, conflicts } = mergeStates(base, local, remote);
    expect(merged.tables[0].items.map((i) => i.id).sort()).toEqual(["a", "l1", "r1"]);
    expect(conflicts).toEqual([]);
  });

  it("aynı satırın adedini iki cihaz da artırdı: delta birleşir", () => {
    const base = { tables: [table("t1", [line("a", 2)])] };
    const local = { tables: [table("t1", [line("a", 3)])] };   // +1
    const remote = { tables: [table("t1", [line("a", 5)])] };  // +3
    expect(mergeStates(base, local, remote).merged.tables[0].items[0].qty).toBe(6);
  });

  it("stok: iki cihaz da düştü → iki düşüm de uygulanır (delta)", () => {
    const base = { ingredients: [ing("i1", 1000)] };
    const local = { ingredients: [ing("i1", 900)] };   // −100
    const remote = { ingredients: [ing("i1", 950)] };  // −50
    expect(mergeStates(base, local, remote).merged.ingredients[0].stock).toBe(850);
  });

  it("yalnızca uzak değişti → uzak alınır; yalnızca yerel değişti → yerel korunur", () => {
    const base = { products: [{ id: "p", name: "A", price: 10 }] };
    expect(mergeStates(base, base, { products: [{ id: "p", name: "A", price: 12 }] }).merged.products[0].price).toBe(12);
    expect(mergeStates(base, { products: [{ id: "p", name: "A", price: 9 }] }, base).merged.products[0].price).toBe(9);
  });

  it("gerçek çakışma (aynı alan farklı değer): yerel kazanır ve yol raporlanır", () => {
    const base = { products: [{ id: "p", name: "A", price: 10 }] };
    const { merged, conflicts } = mergeStates(base, { products: [{ id: "p", name: "A", price: 11 }] }, { products: [{ id: "p", name: "A", price: 13 }] });
    expect(merged.products[0].price).toBe(11);
    expect(conflicts).toEqual(["products[p].price"]);
  });

  it("ikisi farklı alanı değiştirdi: ikisi de uygulanır", () => {
    const base = { products: [{ id: "p", name: "A", price: 10, image: "x" }] };
    const { merged, conflicts } = mergeStates(base, { products: [{ id: "p", name: "A", price: 11, image: "x" }] }, { products: [{ id: "p", name: "B", price: 10, image: "x" }] });
    expect(merged.products[0]).toMatchObject({ name: "B", price: 11 });
    expect(conflicts).toEqual([]);
  });

  it("uzakta silinen, yerelde değişmeyen varlık silinir; yerelde değişmişse korunur ve çakışma bildirilir", () => {
    const base = { staffList: [{ id: "s1", name: "A" }, { id: "s2", name: "B" }] };
    const remote = { staffList: [{ id: "s2", name: "B" }] };
    expect(mergeStates(base, base, remote).merged.staffList.map((x) => x.id)).toEqual(["s2"]);
    const local = { staffList: [{ id: "s1", name: "A2" }, { id: "s2", name: "B" }] };
    const r = mergeStates(base, local, remote);
    expect(r.merged.staffList.map((x) => x.id).sort()).toEqual(["s1", "s2"]);
    expect(r.conflicts).toEqual(["staffList[s1]"]);
  });

  it("yerelde eklenen ve uzakta eklenen varlıklar birlikte kalır", () => {
    const base = { products: [] };
    const { merged } = mergeStates(base, { products: [{ id: "l", name: "L" }] }, { products: [{ id: "r", name: "R" }] });
    expect(merged.products.map((p) => p.id).sort()).toEqual(["l", "r"]);
  });

  it("base yokken (ilk eşitleme) boş liste dolu listeyi ezmez", () => {
    const { merged } = mergeStates(null, { products: [], tables: [table("t1", [line("a", 1)])] }, { products: [{ id: "p", name: "P" }], tables: [] });
    expect(merged.products).toHaveLength(1);
    expect(merged.tables).toHaveLength(1);
  });
});

describe("kümeler, nesneler ve üst veri", () => {
  it("bölge/kategori listeleri: eklemeler birleşir, silmeler uygulanır", () => {
    expect(mergeStringSet(["A", "B"], ["A", "B", "L"], ["A", "B", "R"])).toEqual(["A", "B", "R", "L"]);
    expect(mergeStringSet(["A", "B"], ["A"], ["A", "B", "R"])).toEqual(["A", "R"]);
    expect(mergeStringSet(null, ["x"], ["y"])).toEqual(["y", "x"]);
  });

  it("marka ayarları alan alan birleşir", () => {
    const base = { brandSettings: { businessName: "K", currency: "TRY", customPrimary: "#fff" } };
    const { merged } = mergeStates(base, { brandSettings: { ...base.brandSettings, businessName: "Yeni" } }, { brandSettings: { ...base.brandSettings, currency: "USD" } });
    expect(merged.brandSettings).toMatchObject({ businessName: "Yeni", currency: "USD" });
  });

  it("üst veri (rev, updatedBy) birleşmeye karışmaz; stripMeta temizler", () => {
    const { merged } = mergeStates({ rev: 1 }, { rev: 5, updatedBy: "A", x: 1 }, { rev: 9, updatedBy: "B", y: 2 });
    expect(merged.rev).toBe(5);
    expect(merged).toMatchObject({ x: 1, y: 2 });
    expect(stripMeta({ rev: 1, version: "1", tenantId: "A", a: 1 })).toEqual({ a: 1 });
  });

  it("özdeş durumlar → değişiklik yok", () => {
    const s = { tables: [table("t1")], sales: [sale("s1", 1)], zones: ["A"] };
    const r = mergeStates(s, s, s);
    expect(r.changedRemote).toBe(false);
    expect(r.conflicts).toEqual([]);
  });

  it("birleştirme girdileri değiştirilmez (mutasyon yok)", () => {
    const base = { tables: [table("t1", [line("a", 1)])], ingredients: [ing("i", 10)] };
    const local = { tables: [table("t1", [line("a", 2)])], ingredients: [ing("i", 8)] };
    const remote = { tables: [table("t1", [line("a", 4)])], ingredients: [ing("i", 9)] };
    const snap = JSON.stringify([base, local, remote]);
    mergeStates(base, local, remote);
    expect(JSON.stringify([base, local, remote])).toBe(snap);
  });
});

describe("saldırgan veri (sunucudan/depodan gelebilir)", () => {
  it("__proto__ / constructor anahtarları prototipi kirletmez", () => {
    const evil = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted2":true}},"products":[{"id":"p","__proto__":{"x":1}}]}');
    mergeStates({}, { products: [] }, evil);
    mergeStates(evil, evil, { products: [{ id: "p" }] });
    expect({}.polluted).toBeUndefined();
    expect({}.polluted2).toBeUndefined();
    expect({}.x).toBeUndefined();
  });

  it("tip karışıklığı çökertmez (dizi yerine nesne, null, sayı)", () => {
    for (const bad of [null, 5, "x", [], { tables: "çöp", sales: 7, zones: {}, ingredients: [null, 3] }]) {
      expect(() => mergeStates(bad, { tables: [table("t1")] }, bad)).not.toThrow();
      expect(() => mergeStates({ tables: [table("t1")] }, bad, { tables: [] })).not.toThrow();
    }
  });

  it("çok büyük/derin veri makul sürede birleşir (10k satış, 200 masa)", () => {
    const sales = Array.from({ length: 10000 }, (_, i) => sale(`s${i}`, i, new Date(1.7e12 + i * 1000).toISOString()));
    const tables = Array.from({ length: 200 }, (_, i) => table(`t${i}`));
    const base = { sales, tables };
    const t0 = Date.now();
    const r = mergeStates(base, { sales: [sale("n1", 1), ...sales], tables: tables.map((t, i) => (i === 3 ? table("t3", [line("a", 1)]) : t)) }, { sales: [sale("n2", 2), ...sales], tables });
    expect(Date.now() - t0).toBeLessThan(2500);
    expect(r.merged.sales).toHaveLength(10002);
    expect(r.merged.tables[3].items).toHaveLength(1);
  });

  it("deepEqual: sıra/tür ayrımı", () => {
    expect(deepEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual("1", 1)).toBe(false);
  });

  it("mergeValue: delta yalnızca bilinen sayaç anahtarlarında; diğer sayılarda yerel kazanır", () => {
    expect(mergeValue({ price: 10 }, { price: 12 }, { price: 15 }).value.price).toBe(12);
    expect(mergeValue({ stock: 10 }, { stock: 12 }, { stock: 15 }).value.stock).toBe(17);
  });
});
