import { describe, it, expect } from "vitest";
import { applyStockAction, appendLog, summarizeStockLog, WASTE_REASONS, MAX_LOG } from "../../src/utils/stockLog";
import { findByBarcode, cleanBarcode, barcodeTaken, normalizeGuests, coverStats, cashDifference, MAX_GUESTS } from "../../src/utils/posHelpers";
import { sanitizeOptionGroups, sanitizeRecipe, lineConsumption, buildOrderLine, defaultSelection, toggleChoice } from "../../src/utils/productOptions";

const ing = { id: "ing-1", name: "Espresso Çekirdeği", unit: "gr", stock: 1000, unitCost: 0.5 };
const NOW = new Date("2026-11-25T10:00:00Z");

describe("stok işlemleri (atık / sayım / alım)", () => {
  it("alım stoğu artırır, kayıt üretmez", () => {
    const r = applyStockAction({ type: "add", ingredient: ing, amount: 250, now: NOW });
    expect(r.newStock).toBe(1250);
    expect(r.entry).toBe(null);
  });

  it("zayi: maliyet = miktar × birim maliyet, sebep kaydedilir", () => {
    const r = applyStockAction({ type: "waste", ingredient: ing, amount: 100, reason: "Son kullanma", now: NOW });
    expect(r.newStock).toBe(900);
    expect(r.entry).toMatchObject({ kind: "waste", amount: 100, cost: 50, reason: "Son kullanma", ingredientId: "ing-1" });
  });

  it("zayi stoktan fazlasını düşemez; gerçekten düşen miktar yazılır", () => {
    const r = applyStockAction({ type: "waste", ingredient: { ...ing, stock: 30 }, amount: 500, reason: "Döküldü / kırıldı", now: NOW });
    expect(r.newStock).toBe(0);
    expect(r.entry.amount).toBe(30);
  });

  it("stok zaten 0 ise zayi kayıt üretmez", () => {
    const r = applyStockAction({ type: "waste", ingredient: { ...ing, stock: 0 }, amount: 10, now: NOW });
    expect(r.entry).toBe(null);
    expect(r.newStock).toBe(0);
  });

  it("bilinmeyen sebep 'Diğer'e düşer (serbest metin enjeksiyonu yok)", () => {
    const r = applyStockAction({ type: "waste", ingredient: ing, amount: 1, reason: "<img onerror=x>", now: NOW });
    expect(r.entry.reason).toBe("Diğer");
    expect(WASTE_REASONS).toContain("Diğer");
  });

  it("sayım: eksik ve fazla farkı maliyetiyle; fark yoksa kayıt yok; 0 sayılabilir", () => {
    const short = applyStockAction({ type: "set", ingredient: ing, amount: 940, now: NOW });
    expect(short.newStock).toBe(940);
    expect(short.entry).toMatchObject({ kind: "count", amount: -60, cost: -30, expected: 1000, counted: 940, reason: "Sayım eksiği" });
    expect(applyStockAction({ type: "set", ingredient: ing, amount: 1010, now: NOW }).entry.reason).toBe("Sayım fazlası");
    expect(applyStockAction({ type: "set", ingredient: ing, amount: 1000, now: NOW }).entry).toBe(null);
    expect(applyStockAction({ type: "set", ingredient: ing, amount: 0, now: NOW }).newStock).toBe(0);
  });

  it("geçersiz girdiler reddedilir", () => {
    for (const amount of ["", "abc", NaN, Infinity, null, undefined, -5, 0]) {
      expect(applyStockAction({ type: "waste", ingredient: ing, amount, now: NOW })).toBe(null);
    }
    expect(applyStockAction({ type: "set", ingredient: ing, amount: -1, now: NOW })).toBe(null);
    expect(applyStockAction({ type: "add", ingredient: ing, amount: 0, now: NOW })).toBe(null);
    expect(applyStockAction({ type: "bilinmeyen", ingredient: ing, amount: 5, now: NOW })).toBe(null);
    expect(applyStockAction({ type: "waste", ingredient: null, amount: 5, now: NOW })).toBe(null);
    expect(applyStockAction({ type: "waste", ingredient: { id: "x", stock: "çöp" }, amount: 5, now: NOW })).toBe(null);
  });

  it("maliyeti olmayan malzemede maliyet 0 (NaN değil)", () => {
    const r = applyStockAction({ type: "waste", ingredient: { id: "x", name: "X", unit: "adet", stock: 10 }, amount: 2, now: NOW });
    expect(r.entry.cost).toBe(0);
  });

  it("kayıt listesi en yeniden başlar ve tavanla sınırlanır", () => {
    let log = [];
    for (let i = 0; i < MAX_LOG + 5; i++) log = appendLog(log, { id: String(i) });
    expect(log).toHaveLength(MAX_LOG);
    expect(log[0].id).toBe(String(MAX_LOG + 4));
    expect(appendLog("çöp", null)).toEqual([]);
  });

  it("özet: atık maliyeti, sayım eksik/fazla; tarih aralığı; bozuk kayıtlar atlanır", () => {
    const t = (d) => new Date(Date.parse("2026-11-25T10:00:00Z") - d * 86400000).toISOString();
    const log = [
      { kind: "waste", cost: 50, timestamp: t(1) }, { kind: "waste", cost: 20, timestamp: t(40) },
      { kind: "count", cost: -30, timestamp: t(2) }, { kind: "count", cost: 12.5, timestamp: t(3) },
      null, { kind: "waste", cost: "x", timestamp: t(1) }, { kind: "waste", cost: 5, timestamp: "yok" }
    ];
    const s = summarizeStockLog(log, Date.parse(t(30)), Date.parse("2026-11-26T00:00:00Z"));
    expect(s).toEqual({ wasteCost: 50, shortageCost: -30, surplusCost: 12.5, count: 3 });
    expect(summarizeStockLog("çöp")).toEqual({ wasteCost: 0, shortageCost: 0, surplusCost: 0, count: 0 });
  });
});

describe("barkod", () => {
  const products = [{ id: "a", name: "Su", barcode: "8690001" }, { id: "b", name: "Çay", barcode: " ABC-12 " }, { id: "c", name: "Barkodsuz" }, null];

  it("tam eşleşme; büyük/küçük harf ve boşluk önemsiz", () => {
    expect(findByBarcode(products, "8690001").id).toBe("a");
    expect(findByBarcode(products, " 8690001\n").id).toBe("a");
    expect(findByBarcode(products, "abc-12").id).toBe("b");
  });

  it("kısmi eşleşme, boş girdi ve barkodsuz ürün asla eşleşmez", () => {
    expect(findByBarcode(products, "86900")).toBe(null);
    expect(findByBarcode(products, "")).toBe(null);
    expect(findByBarcode(products, undefined)).toBe(null);
    expect(findByBarcode(products, "undefined")).toBe(null);
    expect(findByBarcode("çöp", "a")).toBe(null);
  });

  it("temizleme ve çakışma kontrolü", () => {
    expect(cleanBarcode(" 86 90<script>01 ")).toBe("8690script01");
    expect(cleanBarcode("x".repeat(100))).toHaveLength(32);
    expect(barcodeTaken(products, "8690001", "b")).toBe(true);
    expect(barcodeTaken(products, "8690001", "a")).toBe(false);
    expect(barcodeTaken(products, "", "a")).toBe(false);
  });
});

describe("kuver ve kasa sayımı", () => {
  it("kişi sayısı sınırlanır, bozuk değer 0 olur", () => {
    expect(normalizeGuests(4)).toBe(4);
    expect(normalizeGuests(-3)).toBe(0);
    expect(normalizeGuests(1e6)).toBe(MAX_GUESTS);
    expect(normalizeGuests("abc")).toBe(0);
    expect(normalizeGuests(2.9)).toBe(2);
    expect(normalizeGuests(NaN)).toBe(0);
  });

  it("kuver raporu: toplam kişi ve kişi başı ciro; kuversiz ve ikram satışlar hariç", () => {
    const s = [{ guests: 2, total: 200, paymentMethod: "Nakit" }, { guests: 3, total: 400, paymentMethod: "Kredi Kartı" }, { total: 999, paymentMethod: "Nakit" }, { guests: 5, total: 50, paymentMethod: "İkram / İptal" }, null, { guests: 2, total: "x", paymentMethod: "Nakit" }];
    expect(coverStats(s)).toEqual({ guests: 5, withGuests: 2, perGuest: 120 });
    expect(coverStats([])).toEqual({ guests: 0, withGuests: 0, perGuest: 0 });
    expect(coverStats("çöp").guests).toBe(0);
  });

  it("kasa farkı: tutuyor / eksik / fazla / geçersiz; kuruş yuvarlama", () => {
    expect(cashDifference(1250, 1250)).toEqual({ diff: 0, status: "ok" });
    expect(cashDifference(1250, 1200)).toEqual({ diff: -50, status: "short" });
    expect(cashDifference(1250, 1262.5)).toEqual({ diff: 12.5, status: "over" });
    expect(cashDifference(0.1 + 0.2, 0.3).status).toBe("ok");
    for (const c of ["", null, undefined, NaN, -5, "abc"]) expect(cashDifference(100, c).status).toBe("invalid");
    expect(cashDifference(NaN, 100).status).toBe("invalid");
  });
});

describe("çeşit → reçete (stok düşümü)", () => {
  const product = {
    id: "p1", name: "Latte", price: 95, recipe: [{ ingredientId: "ing-1", amount: 18 }, { ingredientId: "ing-2", amount: 220 }],
    options: [
      { id: "og-extra", name: "Ekstra", type: "multi", max: 2, choices: [{ id: "shot", name: "Ekstra shot", price: 15, recipe: [{ ingredientId: "ing-1", amount: 18 }] }, { id: "car", name: "Karamel", price: 10, recipe: [{ ingredientId: "ing-9", amount: 15 }] }] },
      { id: "og-milk", name: "Süt", type: "single", choices: [{ id: "oat", name: "Yulaf", price: 15, recipe: [{ ingredientId: "ing-2", amount: -50 }, { ingredientId: "ing-3", amount: 220 }] }, { id: "n", name: "Normal", price: 0 }] }
    ]
  };
  const line = (picks, qty = 1) => {
    let sel = defaultSelection(product);
    picks.forEach(([g, c]) => { sel = toggleChoice(product, sel, g, c); });
    return { ...buildOrderLine(product, sel), qty };
  };

  it("temel reçete + seçilen çeşit reçeteleri toplanır ve adetle çarpılır", () => {
    expect(lineConsumption(product, line([["og-extra", "shot"]], 2))).toEqual({ "ing-1": 72, "ing-2": 440 });
    expect(lineConsumption(product, line([["og-extra", "shot"], ["og-extra", "car"]]))).toEqual({ "ing-1": 36, "ing-2": 220, "ing-9": 15 });
  });

  it("çeşit seçilmezse yalnızca temel reçete; reçetesiz ürün boş döner", () => {
    expect(lineConsumption(product, line([]))).toEqual({ "ing-1": 18, "ing-2": 220 });
    expect(lineConsumption({ id: "x" }, { qty: 3, options: [] })).toEqual({});
    expect(lineConsumption(null, null)).toEqual({});
  });

  it("silinmiş/geçersiz seçenek kimliği stoktan düşürmez", () => {
    const item = { qty: 1, options: [{ groupId: "og-extra", choiceId: "yok" }, { groupId: "yok", choiceId: "shot" }, null] };
    expect(lineConsumption(product, item)).toEqual({ "ing-1": 18, "ing-2": 220 });
  });

  it("reçete temizleme: negatif/NaN/dev miktar ve fazla satır atılır; prototip kirliliği yok", () => {
    expect(sanitizeRecipe([{ ingredientId: "a", amount: 5 }, { ingredientId: "b", amount: -1 }, { ingredientId: "", amount: 3 }, { ingredientId: "c", amount: "x" }, { ingredientId: "d", amount: 1e9 }, null, 5])).toEqual([{ ingredientId: "a", amount: 5 }]);
    expect(sanitizeRecipe("çöp")).toEqual([]);
    expect(sanitizeRecipe(Array.from({ length: 50 }, (_, i) => ({ ingredientId: `i${i}`, amount: 1 })))).toHaveLength(10);
    const g = sanitizeOptionGroups([{ name: "G", choices: [{ name: "A", recipe: [{ ingredientId: "__proto__", amount: 5 }] }] }]);
    expect(g[0].choices[0].recipe[0].ingredientId).toBe("__proto__");
    expect(({}).polluted).toBeUndefined();
    expect(lineConsumption({ options: g }, { qty: 1, options: [{ groupId: g[0].id, choiceId: g[0].choices[0].id }] })).not.toHaveProperty("polluted");
  });
});
