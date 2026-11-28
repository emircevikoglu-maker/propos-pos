import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  buildOrderLine, mergeIntoItems, lineConsumption, removableIngredients, lineDetails, editLine, needsContentSheet, selectionFromLine
} from "../../src/utils/productOptions";
import { ContentSheet } from "../../src/ui/ContentSheet";

const ingredients = [{ id: "i1", name: "Süt" }, { id: "i2", name: "Çekirdek" }, { id: "i3", name: "Bardak" }];
const latte = {
  id: "p1", name: "Latte", price: 95,
  recipe: [{ ingredientId: "i2", amount: 18, fixed: true }, { ingredientId: "i1", amount: 200 }, { ingredientId: "i3", amount: 1 }, { ingredientId: "yok", amount: 5 }],
  options: [{ id: "size", name: "Boy", type: "single", required: true, choices: [{ id: "s", name: "Küçük", price: 0 }, { id: "l", name: "Büyük", price: 20 }] }]
};
const noMilk = [{ ingredientId: "i1", name: "Süt" }];

describe("içerik kuralları", () => {
  it("çıkarılabilirler: sabit ve tanımsız malzeme listede yok", () => {
    expect(removableIngredients(latte, ingredients).map((x) => x.name)).toEqual(["Süt", "Bardak"]);
  });

  it("çıkarılan malzeme stoktan düşmez; sabit malzeme zorla çıkarılsa da düşer", () => {
    const line = buildOrderLine(latte, { size: ["s"] }, "a", { without: [...noMilk, { ingredientId: "i2", name: "Çekirdek" }], qty: 2 });
    expect(lineConsumption(latte, line)).toEqual({ i2: 36, i3: 2, yok: 10 }); // tanımsız malzemenin stokta karşılığı yok
    expect(lineDetails(line)).toBe("Küçük · Süt yok · Çekirdek yok");
  });

  it("farklı içerik ayrı satır; aynı içerik ve not birleşir; notlu ekleme notsuz satıra karışıp notu kaybetmez", () => {
    let items = mergeIntoItems([], buildOrderLine(latte, { size: ["s"] }, "a"));
    items = mergeIntoItems(items, buildOrderLine(latte, { size: ["s"] }, "b", { without: noMilk }));
    items = mergeIntoItems(items, buildOrderLine(latte, { size: ["s"] }, "c", { note: "Az şekerli" }));
    items = mergeIntoItems(items, buildOrderLine(latte, { size: ["s"] }, "d", { without: noMilk, qty: 3 }));
    expect(items.map((i) => [i.id, i.qty, i.note])).toEqual([["a", 1, ""], ["b", 4, ""], ["c", 1, "Az şekerli"]]);
  });

  it("satır bölme: 3 adedin 1'i sütsüz yapılır; fiyat yalnızca çeşit değişince hesaplanır", () => {
    const base = { ...buildOrderLine(latte, { size: ["s"] }, "a", { qty: 3 }), price: 80 }; // kampanyalı sabit fiyat
    const r = editLine([base], "a", latte, { selection: { size: ["s"] }, without: noMilk, note: "", qty: 1 });
    expect(r.items.map((i) => [i.qty, i.price, lineDetails(i)])).toEqual([[2, 80, "Küçük"], [1, 80, "Küçük · Süt yok"]]);
    expect(r.cancelled).toBe(null);
    const big = editLine([base], "a", latte, { selection: { size: ["l"] }, qty: 3 });
    expect(big.items[0]).toMatchObject({ id: "a", qty: 3, price: 115 });
  });

  it("gönderilmiş adetlerin içeriği değişirse iptal edilen adet bildirilir; önce gönderilmemişler değişir", () => {
    const line = { ...buildOrderLine(latte, { size: ["s"] }, "a", { qty: 3 }), sentQty: 2 };
    const one = editLine([line], "a", latte, { selection: { size: ["s"] }, without: noMilk, qty: 1 });
    expect(one.cancelled).toBe(null);
    expect(one.items[0]).toMatchObject({ qty: 2, sentQty: 2 });
    const all = editLine([line], "a", latte, { selection: { size: ["s"] }, without: noMilk, qty: 3 });
    expect(all.cancelled).toMatchObject({ qty: 2 });
    expect(all.items[0].sentQty).toBeUndefined();
  });

  it("değişiklik yoksa satır aynen kalır; aynı içerikli satıra dönüş birleşir", () => {
    const a = buildOrderLine(latte, { size: ["s"] }, "a");
    const b = buildOrderLine(latte, { size: ["s"] }, "b", { without: noMilk });
    const same = editLine([a, b], "a", latte, { selection: selectionFromLine(latte, a), qty: 1 });
    expect(same.items).toEqual([a, b]);
    const merged = editLine([a, b], "b", latte, { selection: { size: ["s"] }, without: [], qty: 1 });
    expect(merged.items.map((i) => [i.id, i.qty])).toEqual([["a", 2]]);
  });

  it("içerik penceresi gereksinimi", () => {
    expect(needsContentSheet(latte)).toBe(true);
    expect(needsContentSheet({ recipe: latte.recipe })).toBe(false);
    expect(needsContentSheet({ askContent: true })).toBe(true);
  });
});

describe("ContentSheet", () => {
  const open = (props = {}) => {
    const onConfirm = vi.fn();
    render(<ContentSheet product={latte} ingredients={ingredients} onClose={vi.fn()} onConfirm={onConfirm} {...props} />);
    return onConfirm;
  };

  it("varsayılanla tek dokunuşta eklenir", () => {
    const onConfirm = open();
    fireEvent.click(screen.getByRole("button", { name: /^Ekle/ }));
    expect(onConfirm.mock.calls[0][0]).toEqual({ selection: { size: ["s"] }, without: [], note: "", qty: 1 });
  });

  it("malzeme çıkarma, hazır + serbest not ve adet birlikte gider; tutar güncellenir", () => {
    const onConfirm = open();
    fireEvent.click(screen.getByRole("button", { name: "Süt" }));
    expect(screen.getByRole("button", { name: "Süt" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Büyük/ }));
    fireEvent.click(screen.getByRole("button", { name: "Laktozsuz" }));
    fireEvent.change(screen.getByLabelText("Serbest not"), { target: { value: "yanında su" } });
    fireEvent.click(screen.getByRole("button", { name: "Adedi artır" }));
    fireEvent.click(screen.getByRole("button", { name: /^Ekle · ₺230/ }));
    expect(onConfirm.mock.calls[0][0]).toEqual({ selection: { size: ["l"] }, without: noMilk, note: "Laktozsuz · yanında su", qty: 2 });
  });

  it("düzenleme: satırdaki seçim geri yüklenir, adet satırı aşamaz", () => {
    const line = buildOrderLine(latte, { size: ["l"] }, "a", { qty: 2, without: noMilk, note: "Sade · özel" });
    open({ line });
    expect(screen.getByRole("button", { name: /Büyük/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Süt" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByLabelText("Serbest not").value).toBe("özel");
    expect(screen.getByRole("button", { name: "Adedi artır" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Adedi azalt" }));
    expect(screen.getByRole("button", { name: /1 adede uygula/ })).toBeTruthy();
  });

  it("XSS: ürün ve malzeme adı metin olarak kalır", () => {
    const evil = { ...latte, name: "<img src=x onerror=alert(1)>", options: [] };
    open({ product: evil, ingredients: [{ id: "i1", name: "<script>alert(1)</script>" }] });
    expect(document.querySelector("img, script")).toBe(null);
  });
});
