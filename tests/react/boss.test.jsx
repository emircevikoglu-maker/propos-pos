import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { density, headsUp, dayKpis, menuMatrix, dayStory, goalHistory, teamToday, median, slotOf, slotTime, salesCost, SLOTS } from "../../src/utils/boss";
import { isBusyNow } from "../../src/design/celebrations";
import { generateInitialSales } from "../../src/constants/initialData";

let ctx = {};
vi.mock("../../src/context/PosContext", () => ({ usePos: () => ctx }));
import { BossView } from "../../src/ui/BossView";

const NOW = new Date(2026, 10, 27, 14, 20).getTime(); // cuma 14:20
const at = (daysAgo, h, m = 0) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); };
const ingredients = [{ id: "i1", unitCost: 1 }];
const products = [
  { id: "a", name: "Latte", price: 100, recipe: [{ ingredientId: "i1", amount: 20 }] },
  { id: "b", name: "Çay", price: 20, recipe: [{ ingredientId: "i1", amount: 15 }] },
  { id: "c", name: "Tart", price: 200, recipe: [{ ingredientId: "i1", amount: 10 }] }
];
let n = 0;
const sale = (ts, items = [{ productId: "a", name: "Latte", price: 100, qty: 1 }], extra = {}) => ({ id: `s${++n}`, timestamp: ts, tableName: "Masa 1", staffId: "st1", paymentMethod: "Nakit", total: items.reduce((s, i) => s + i.price * i.qty, 0), items, ...extra });

describe("yoğunluk", () => {
  it("dilim hesabı ve medyan", () => {
    expect(slotOf(new Date(2026, 0, 1, 8, 14))).toBe(0);
    expect(slotOf(new Date(2026, 0, 1, 23, 59))).toBe(SLOTS - 1);
    expect(slotTime(4)).toBe("09:00");
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("geçmiş aynı günlerden tipik eğri, bugünkü gidişle tahmin; gelecekteki satış sayılmaz", () => {
    const history = [7, 14, 21].flatMap((d) => [10, 10, 11, 11, 12, 19, 19, 19, 19, 19, 19].map((h, i) => sale(at(d, h, i % 4 * 15))));
    const today = [10, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12].map((h, i) => sale(at(0, h, i % 4 * 15)));
    const dd = density([...history, ...today, sale(at(0, 20))], NOW);
    expect(dd.sameWeekday).toBe(true);
    expect(dd.basisDays).toBe(3);
    expect(dd.today[slotOf(new Date(at(0, 20)))]).toBe(null);
    expect(dd.pace).toBeGreaterThan(1);
    const up = headsUp(dd);
    expect(up.hot).toBe(true);
    expect(Number(up.from.slice(0, 2))).toBeGreaterThanOrEqual(17);
  });
  it("veri yoksa tahmin ve uyarı üretmez", () => {
    const dd = density([], NOW);
    expect(headsUp(dd)).toBe(null);
    expect(dd.pace).toBe(1);
  });
});

describe("KPI, menü matrisi, hikâye, hedef serisi", () => {
  const sales = [
    sale(at(7, 12), [{ productId: "a", name: "Latte", price: 100, qty: 2 }]),
    sale(at(0, 9), [{ productId: "a", name: "Latte", price: 100, qty: 2, without: [{ ingredientId: "i1", name: "x" }] }]),
    sale(at(0, 10), [{ productId: "b", name: "Çay", price: 20, qty: 25 }]),
    sale(at(0, 11), [{ productId: "c", name: "Tart", price: 200, qty: 1 }], { paymentMethod: "Kredi Kartı" }),
    sale(at(0, 12), [{ productId: "a", name: "Latte", price: 100, qty: 9 }], { paymentMethod: "İkram / İptal" }),
    sale(at(0, 13), [{ productId: "__payment", name: "Kısmi Hesap Tahsilatı", price: 50, qty: 1 }])
  ];
  it("ciro ikramı saymaz; maliyet çıkarılan malzemeyi düşmez; geçen haftaya göre değişim", () => {
    const k = dayKpis({ sales, products, ingredients, tables: [{ status: "occupied", items: [{ price: 50, qty: 2 }], discount: 10 }], now: NOW });
    expect(k).toMatchObject({ revenue: 950, lastWeek: 200, orders: 3, cash: 750, card: 200, openCount: 1, openSum: 90 });
    expect(k.cost).toBe(25 * 15 + 10);
    expect(salesCost([sales[1]], products, ingredients)).toBe(0);
  });
  it("menü matrisi: bugün yeterli adet varsa bugün, değilse 30 gün", () => {
    const m = menuMatrix(sales, products, ingredients, NOW);
    expect(m.period).toBe("today");
    expect(m.items.find((x) => x.id === "b").quad).toBe("horse");
    expect(m.puzzle.id).toBe("c");
    expect(menuMatrix([sales[3]], products, ingredients, NOW).period).toBe("month");
  });
  it("hikâye yeniden eskiye; hedef anı ve gönderilmiş iptal görünür", () => {
    const story = dayStory({ sales, voidLog: [{ afterSend: true, timestamp: at(0, 14), qty: 1, name: "Latte", tableName: "Masa 2", kind: "line" }], goal: 600, now: NOW });
    expect(story[0].text).toContain("İptal: 1× Latte");
    expect(story.some((e) => e.text.includes("hedefe ulaşıldı"))).toBe(true);
    expect(story.at(-1).text).toContain("ilk satışı");
  });
  it("hedef serisi: bugün henüz tutmadıysa dünden sayılır", () => {
    const s = [1, 2, 3].map((d) => sale(at(d, 12), [{ productId: "a", name: "Latte", price: 100, qty: 5 }]));
    expect(goalHistory(s, 500, NOW).run).toBe(3);
    expect(goalHistory([...s, sale(at(0, 9), [{ productId: "a", name: "Latte", price: 100, qty: 5 }])], 500, NOW).run).toBe(4);
    expect(goalHistory(s, 0, NOW).hits.some(Boolean)).toBe(false);
  });
  it("ekip: bugünkü sipariş sayısı", () => {
    expect(teamToday(sales, [{ id: "st1", name: "Ali" }], NOW)[0].orders).toBe(3);
  });
});

describe("yoğun saat ve demo verisi", () => {
  it("gelecek saatli satış yoğun saat saydırmaz", () => {
    const future = Array.from({ length: 10 }, () => sale(new Date(Date.now() + 3600000).toISOString()));
    expect(isBusyNow(future)).toBe(false);
  });
  it("demo satışları gelecek saate yazılmaz", () => {
    expect(generateInitialSales().every((s) => Date.parse(s.timestamp) <= Date.now())).toBe(true);
  });
});

describe("BossView", () => {
  const base = () => ({
    sales: [], products, ingredients, tables: [], staffList: [{ id: "st1", name: "Ali", role: "Barista" }], brandSettings: { businessName: "Kafe" },
    celebration: { goal: 0, leaderboard: false }, voidLog: [], handleLockAdmin: vi.fn(), celebrateZReport: vi.fn()
  });
  it("boş veride açıklayıcı boş durumlar; liderlik kapalıyken sıralama yok", () => {
    ctx = base();
    render(<MemoryRouter><BossView /></MemoryRouter>);
    expect(screen.getByText("Bugün, Kafe")).toBeTruthy();
    expect(screen.getByText(/Tahmin için en az iki günlük/)).toBeTruthy();
    expect(screen.getByText(/Sıralama kapalı/)).toBeTruthy();
    expect(document.querySelectorAll(".heat-col")).toHaveLength(SLOTS);
  });
  it("gün kapanışı tıklamayla değil basılı tutma/Enter ile", () => {
    ctx = base();
    render(<MemoryRouter><BossView /></MemoryRouter>);
    const hold = screen.getByRole("button", { name: /Günü kapat/ });
    fireEvent.click(hold);
    expect(ctx.celebrateZReport).not.toHaveBeenCalled();
    fireEvent.keyDown(hold, { key: "Enter" });
    expect(ctx.celebrateZReport).toHaveBeenCalled();
  });
});
