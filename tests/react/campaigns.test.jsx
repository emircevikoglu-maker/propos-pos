import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { isActiveAt, appliesTo, bestPrice, applyCampaign, repriceLine, validateCampaign, discountReport } from "../../src/utils/campaigns";
import { mergeIntoItems, buildOrderLine, editLine } from "../../src/utils/productOptions";

let ctx = {};
vi.mock("../../src/context/PosContext", () => ({ usePos: () => ctx }));
import { Campaigns } from "../../src/ui/settings/Campaigns";

// 2026-11-27 cuma (ISO 5)
const t = (day, h, m = 0) => new Date(2026, 10, day, h, m).getTime();
const base = { id: "c1", name: "Happy hour", active: true, days: [5], from: "15:00", to: "17:00", scope: "all", targets: [], kind: "percent", value: 20 };
const latte = { id: "p1", name: "Latte", price: 100, category: "Kahveler", options: [{ id: "g", name: "Boy", type: "single", required: true, choices: [{ id: "s", name: "Küçük", price: 0 }, { id: "l", name: "Büyük", price: 20 }] }] };

describe("zaman ve kapsam", () => {
  it("saat sınırları: başlangıç dahil, bitiş hariç; gün dışı kapalı", () => {
    expect(isActiveAt(base, t(27, 15))).toBe(true);
    expect(isActiveAt(base, t(27, 16, 59))).toBe(true);
    expect(isActiveAt(base, t(27, 17))).toBe(false);
    expect(isActiveAt(base, t(26, 16))).toBe(false);
    expect(isActiveAt({ ...base, active: false }, t(27, 16))).toBe(false);
  });
  it("gece yarısını aşan aralık başladığı güne bağlıdır", () => {
    const night = { ...base, from: "22:00", to: "02:00" };
    expect(isActiveAt(night, t(27, 23))).toBe(true);
    expect(isActiveAt(night, t(28, 1, 30))).toBe(true);  // cumartesi gecesi = cuma kampanyası
    expect(isActiveAt(night, t(27, 1))).toBe(false);     // perşembe gecesi
    expect(isActiveAt({ ...night, days: [7] }, t(30, 1))).toBe(true); // pazar → pazartesi sarması
  });
  it("tüm gün ve bozuk saat", () => {
    expect(isActiveAt({ ...base, from: "00:00", to: "00:00" }, t(27, 3))).toBe(true);
    expect(isActiveAt({ ...base, from: "25:00" }, t(27, 16))).toBe(false);
  });
  it("kapsam: kategori ve ürün", () => {
    expect(appliesTo({ ...base, scope: "category", targets: ["Kahveler"] }, latte)).toBe(true);
    expect(appliesTo({ ...base, scope: "product", targets: ["p2"] }, latte)).toBe(false);
  });
});

describe("fiyat", () => {
  const now = t(27, 16);
  it("çakışmada en uygunu, birikmez; sabit fiyatta çeşit farkı korunur; negatif olmaz", () => {
    const list = [base, { ...base, id: "c2", name: "Sabit", kind: "price", value: 70 }, { ...base, id: "c3", name: "On lira", kind: "amount", value: 10 }];
    expect(bestPrice(list, latte, 100, now)).toMatchObject({ price: 70, campaign: { id: "c2" } });
    expect(bestPrice(list, latte, 120, now).price).toBe(90);
    expect(bestPrice([{ ...base, kind: "amount", value: 500 }], latte, 100, now).price).toBe(0);
    expect(bestPrice(list, latte, 100, t(27, 18)).campaign).toBe(null);
  });
  it("satıra sabitlenir; kampanyalı ve normal satır birleşmez; çeşit değişince aynı kampanya uygulanır", () => {
    const deal = applyCampaign([base], latte, buildOrderLine(latte, { g: ["s"] }, "a"), now);
    expect(deal).toMatchObject({ price: 80, listPrice: 100, campaignId: "c1", campaignName: "Happy hour −%20" });
    const normal = buildOrderLine(latte, { g: ["s"] }, "b");
    expect(mergeIntoItems([deal], normal)).toHaveLength(2);
    expect(mergeIntoItems([deal], applyCampaign([base], latte, buildOrderLine(latte, { g: ["s"] }, "c"), now))[0].qty).toBe(2);
    const edited = editLine([deal], "a", latte, { selection: { g: ["l"] }, qty: 1 }, (line) => repriceLine([base], latte, line));
    expect(edited.items[0]).toMatchObject({ price: 96, listPrice: 120, campaignId: "c1" });
    expect(repriceLine([], latte, { ...deal, price: 120 })).toEqual(expect.not.objectContaining({ campaignId: "c1" }));
  });
  it("rapor: kampanya, elle indirim ve ikram ayrı", () => {
    const r = discountReport([
      { paymentMethod: "Nakit", discount: 15, items: [{ qty: 2, price: 80, listPrice: 100, campaignId: "c1", campaignName: "HH" }] },
      { paymentMethod: "İkram / İptal", total: 90, items: [] }
    ]);
    expect(r).toMatchObject({ campaign: 40, manual: 15, comp: 90, compCount: 1 });
    expect(r.byCampaign[0]).toMatchObject({ name: "HH", qty: 2, amount: 40 });
  });
  it("doğrulama", () => {
    expect(validateCampaign(base)).toEqual([]);
    expect(validateCampaign({ ...base, name: "", days: [], value: 150, scope: "category", targets: [] })).toHaveLength(4);
  });
});

describe("Kampanyalar ekranı", () => {
  it("yeni kampanya kaydedilir; eksik alanda hata", () => {
    let brand = { campaigns: [] };
    ctx = { brandSettings: brand, setBrandSettings: vi.fn((fn) => { brand = fn(brand); }), categories: ["Kahveler"], products: [latte] };
    render(<MemoryRouter><Campaigns /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Yeni kampanya/ }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByRole("alert").textContent).toContain("Kampanya adını yazın.");
    fireEvent.change(screen.getByPlaceholderText("Happy hour"), { target: { value: "Öğle" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(brand.campaigns[0]).toMatchObject({ name: "Öğle", kind: "percent", value: 20 });
  });
});
