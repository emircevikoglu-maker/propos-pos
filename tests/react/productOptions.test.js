import { describe, it, expect } from "vitest";
import {
  sanitizeOptionGroups, defaultSelection, toggleChoice, validateSelection, resolveSelection,
  unitPrice, buildOrderLine, mergeIntoItems, optionSummary, cleanPrice, hasOptions, priceLabelSuffix,
  OPTION_PRESETS, groupFromPreset, MAX_GROUPS, MAX_CHOICES
} from "../../src/utils/productOptions";

const latte = {
  id: "prd-1", name: "Latte", price: 95, options: [
    { id: "og-size", name: "Boy", type: "single", required: true, choices: [{ id: "s", name: "Küçük", price: 0 }, { id: "m", name: "Orta", price: 10 }, { id: "l", name: "Büyük", price: 20 }] },
    { id: "og-milk", name: "Süt", type: "single", required: false, choices: [{ id: "n", name: "Normal", price: 0 }, { id: "oat", name: "Yulaf", price: 15 }] },
    { id: "og-extra", name: "Ekstra", type: "multi", required: false, max: 2, choices: [{ id: "shot", name: "Shot", price: 15 }, { id: "car", name: "Karamel", price: 10 }, { id: "cr", name: "Krema", price: 10 }] }
  ]
};

describe("seçenek fiyatlandırma (normal akış)", () => {
  it("zorunlu tek seçimde ilk seçenek hazır gelir", () => {
    expect(defaultSelection(latte)).toEqual({ "og-size": ["s"], "og-milk": [], "og-extra": [] });
  });

  it("birim fiyat = taban + seçenek farkları", () => {
    let sel = defaultSelection(latte);
    sel = toggleChoice(latte, sel, "og-size", "l");
    sel = toggleChoice(latte, sel, "og-milk", "oat");
    sel = toggleChoice(latte, sel, "og-extra", "shot");
    const line = buildOrderLine(latte, sel, "oi-1");
    expect(line.price).toBe(95 + 20 + 15 + 15);
    expect(line.basePrice).toBe(95);
    expect(optionSummary(line.options)).toBe("Büyük · Yulaf · Shot");
    expect(line.optionKey).toBe("og-size:l|og-milk:oat|og-extra:shot");
  });

  it("aynı ürün + aynı seçenek birleşir, farklı seçenek ayrı satır olur, notlu satıra eklenmez", () => {
    const a = buildOrderLine(latte, defaultSelection(latte), "a");
    const b = buildOrderLine(latte, toggleChoice(latte, defaultSelection(latte), "og-size", "m"), "b");
    let items = mergeIntoItems([], a);
    items = mergeIntoItems(items, { ...a, id: "a2" });
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
    items = mergeIntoItems(items, b);
    expect(items).toHaveLength(2);
    items = mergeIntoItems([{ ...a, note: "sıcak olsun" }], { ...a, id: "a3" });
    expect(items).toHaveLength(2);
  });

  it("seçeneksiz ürün eski davranışı korur (boş optionKey ile birleşir)", () => {
    const tea = { id: "t", name: "Çay", price: 25 };
    expect(hasOptions(tea)).toBe(false);
    const items = mergeIntoItems([{ id: "x", productId: "t", qty: 1, note: "" }], buildOrderLine(tea, {}, "y"));
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
  });

  it("hazır gruplar geçerli gruplar üretir", () => {
    OPTION_PRESETS.forEach((p) => {
      const g = sanitizeOptionGroups([groupFromPreset(p)]);
      expect(g).toHaveLength(1);
      expect(g[0].choices.length).toBe(p.choices.length);
    });
  });

  it("kart fiyat etiketi: artırabilen seçenek varsa '+'", () => {
    expect(priceLabelSuffix(latte)).toBe("+");
    expect(priceLabelSuffix({ price: 10, options: [{ name: "Şeker", choices: [{ name: "Sade", price: 0 }] }] })).toBe("");
  });
});

describe("seçim kuralları", () => {
  it("zorunlu tek seçim boşaltılamaz; isteğe bağlı tek seçim kapatılabilir", () => {
    let sel = defaultSelection(latte);
    sel = toggleChoice(latte, sel, "og-size", "s");
    expect(sel["og-size"]).toEqual(["s"]);
    sel = toggleChoice(latte, sel, "og-milk", "oat");
    sel = toggleChoice(latte, sel, "og-milk", "oat");
    expect(sel["og-milk"]).toEqual([]);
  });

  it("çoklu seçimde en fazla sınırı aşılmaz", () => {
    let sel = defaultSelection(latte);
    ["shot", "car", "cr"].forEach((c) => { sel = toggleChoice(latte, sel, "og-extra", c); });
    expect(sel["og-extra"]).toEqual(["shot", "car"]);
  });

  it("zorunlu grup seçilmeden doğrulama geçmez", () => {
    const v = validateSelection(latte, { "og-size": [] });
    expect(v.ok).toBe(false);
    expect(v.errors["og-size"]).toMatch(/Boy/);
  });
});

describe("saldırgan / bozuk veri (senkrondan gelebilir)", () => {
  it("negatif fiyat farkı birim fiyatı sıfırın altına indiremez", () => {
    const p = { id: "x", name: "X", price: 10, options: [{ id: "g", name: "G", type: "single", required: true, choices: [{ id: "c", name: "İndirim", price: -999 }] }] };
    expect(unitPrice(p, resolveSelection(p, defaultSelection(p)))).toBe(0);
  });

  it("NaN, Infinity, metin fiyatlar 0'a ya da sınıra çekilir", () => {
    expect(cleanPrice("abc")).toBe(0);
    expect(cleanPrice(NaN)).toBe(0);
    expect(cleanPrice(Infinity)).toBe(0);
    expect(cleanPrice(1e12)).toBe(1000000);
    expect(cleanPrice("12.345")).toBe(12.35);
  });

  it("geçersiz seçenek kimliği fiyata eklenmez ve doğrulamadan geçmez", () => {
    const sel = { "og-size": ["s", "hayali-pahali"], "og-extra": ["shot", "shot", "shot"] };
    const resolved = resolveSelection(latte, sel);
    expect(resolved.map((o) => o.choiceId)).toEqual(["s", "shot"]);
    expect(validateSelection(latte, sel).ok).toBe(false);
  });

  it("tek seçimli gruba çok seçim enjekte edilse de yalnızca biri sayılır", () => {
    const resolved = resolveSelection(latte, { "og-size": ["s", "m", "l"] });
    expect(resolved).toHaveLength(1);
    expect(unitPrice(latte, resolved)).toBe(95);
  });

  it("prototip kirliliği: __proto__ kimlikleri ve seçimleri etkisiz", () => {
    const evil = JSON.parse('{"id":"p","name":"P","price":5,"options":[{"id":"__proto__","name":"G","type":"single","required":true,"choices":[{"id":"__proto__","name":"A","price":1}]}]}');
    const groups = sanitizeOptionGroups(evil.options);
    expect(groups[0].id).not.toBe("__proto__");
    const sel = JSON.parse('{"__proto__":{"polluted":true}}');
    resolveSelection(evil, sel);
    toggleChoice(evil, {}, "__proto__", "__proto__");
    expect({}.polluted).toBeUndefined();
  });

  it("bozuk gruplar atılır, sınırlar uygulanır, kontrol karakterleri temizlenir", () => {
    const junk = [null, 5, "x", { name: "" }, { name: "Boş", choices: [] }, { name: "A\u0000\u0007B", choices: [{ name: "c" }, null, { name: "" }] }];
    const g = sanitizeOptionGroups(junk);
    expect(g).toHaveLength(1);
    expect(g[0].name).toBe("AB");
    expect(g[0].choices).toHaveLength(1);
    const many = Array.from({ length: 50 }, (_, i) => ({ name: `G${i}`, choices: Array.from({ length: 50 }, (_, j) => ({ name: `C${j}` })) }));
    const s = sanitizeOptionGroups(many);
    expect(s).toHaveLength(MAX_GROUPS);
    expect(s[0].choices).toHaveLength(MAX_CHOICES);
    expect(sanitizeOptionGroups("<script>")).toEqual([]);
    expect(sanitizeOptionGroups({ length: 3 })).toEqual([]);
  });

  it("aynı kimlikli gruplar/seçenekler tekilleştirilir (seçim karışmaz)", () => {
    const g = sanitizeOptionGroups([{ id: "a", name: "X", choices: [{ id: "c", name: "1" }, { id: "c", name: "2" }] }, { id: "a", name: "Y", choices: [{ id: "c", name: "3" }] }]);
    expect(new Set(g.map((x) => x.id)).size).toBe(2);
    expect(new Set(g[0].choices.map((x) => x.id)).size).toBe(2);
  });

  it("uzun adlar kırpılır", () => {
    const g = sanitizeOptionGroups([{ name: "x".repeat(500), choices: [{ name: "y".repeat(500), price: 1 }] }]);
    expect(g[0].name.length).toBe(40);
    expect(g[0].choices[0].name.length).toBe(40);
  });
});
