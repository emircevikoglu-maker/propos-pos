import { describe, it, expect, beforeEach } from "vitest";
import { pickMoment, isBusyNow, goalProgress, loadCelebrationSettings, saveCelebrationSettings, revenueSales, dayKey } from "../../src/design/celebrations";

const NOW = new Date("2026-11-24T15:00:00").getTime();
const at = (daysAgo, h = 12) => new Date(NOW - daysAgo * 86400000 + (h - 15) * 3600000).toISOString();
let n = 0;
const sale = (total, daysAgo = 0, extra = {}) => ({ id: `s${++n}`, timestamp: at(daysAgo), tableName: "Masa 1", paymentMethod: "Nakit", total, ...extra });
const history = (days, perDay) => Array.from({ length: days }, (_, i) => sale(perDay, i + 1));

describe("kutlama kararı (pickMoment)", () => {
  it("günün ilk satışı", () => {
    const s = sale(100);
    expect(pickMoment({ sales: [s], sale: s, now: NOW })?.kind).toBe("firstSale");
  });

  it("ikinci satış ilk satış değildir", () => {
    const a = sale(100), b = sale(50);
    expect(pickMoment({ sales: [b, a], sale: b, now: NOW })).toBe(null);
  });

  it("hedefi geçen satışta 'goal'; hedef zaten geçilmişse tekrar çıkmaz", () => {
    const a = sale(900), b = sale(200);
    expect(pickMoment({ sales: [b, a], sale: b, goal: 1000, now: NOW })?.kind).toBe("goal");
    const c = sale(50);
    expect(pickMoment({ sales: [c, b, a], sale: c, goal: 1000, now: NOW })).toBe(null);
    expect(pickMoment({ sales: [b, a], sale: b, goal: 1000, now: NOW, already: { goal: true } })).toBe(null);
  });

  it("hedef 0 ise hedef kutlaması yok", () => {
    const a = sale(900), b = sale(200);
    expect(pickMoment({ sales: [b, a], sale: b, goal: 0, now: NOW })).toBe(null);
  });

  it("rekor: en az 7 gün geçmiş gerekir (ilk günlerde sahte rekor yok)", () => {
    const a = sale(100), b = sale(400);
    expect(pickMoment({ sales: [b, a, ...history(3, 300)], sale: b, now: NOW })).toBe(null);
    expect(pickMoment({ sales: [b, a, ...history(8, 300)], sale: b, now: NOW })?.kind).toBe("record");
  });

  it("ikram/iptal ve cari satışlar kutlama tetiklemez ve ciroya girmez", () => {
    const x = sale(500, 0, { paymentMethod: "İkram / İptal" });
    expect(pickMoment({ sales: [x], sale: x, now: NOW })).toBe(null);
    expect(revenueSales([x, sale(10, 0, { paymentMethod: "Esnaf Cariye Yazıldı" }), sale(5)]).length).toBe(1);
  });

  it("seri: günün her 25. satışı", () => {
    const sales = Array.from({ length: 25 }, () => sale(60));
    const last = sales[0];
    expect(pickMoment({ sales, sale: last, now: NOW })?.kind).toBe("streak");
    expect(pickMoment({ sales: sales.slice(1), sale: sales[1], now: NOW })).toBe(null);
  });

  it("en büyük adisyon: ortalamanın 2 katı ve günün en büyüğü", () => {
    const base = Array.from({ length: 6 }, () => sale(100));
    const big = sale(450);
    expect(pickMoment({ sales: [big, ...base], sale: big, now: NOW })?.kind).toBe("bigTicket");
    const small = sale(120);
    expect(pickMoment({ sales: [small, ...base], sale: small, now: NOW })).toBe(null);
  });

  it("bozuk veriye dayanıklı", () => {
    const s = sale(100);
    expect(() => pickMoment({ sales: [null, { total: "x" }, undefined, s], sale: s, now: NOW })).not.toThrow();
    expect(pickMoment({ sales: [], sale: null, now: NOW })).toBe(null);
    expect(pickMoment({ sales: "çöp", sale: s, now: NOW })).toBe(null);
  });
});

describe("yoğun saat ve hedef ilerlemesi", () => {
  it("10 dakikada 8+ ödeme yoğun sayılır", () => {
    const mk = (min) => ({ total: 10, paymentMethod: "Nakit", timestamp: new Date(NOW - min * 60000).toISOString() });
    expect(isBusyNow(Array.from({ length: 8 }, (_, i) => mk(i)), NOW)).toBe(true);
    expect(isBusyNow(Array.from({ length: 7 }, (_, i) => mk(i)), NOW)).toBe(false);
    expect(isBusyNow(Array.from({ length: 20 }, (_, i) => mk(30 + i)), NOW)).toBe(false);
  });

  it("hedef ilerlemesi 0..1 aralığında, hedef yoksa null", () => {
    expect(goalProgress([sale(250)], 1000, NOW)).toBe(0.25);
    expect(goalProgress([sale(5000)], 1000, NOW)).toBe(1);
    expect(goalProgress([sale(5000)], 0, NOW)).toBe(null);
    expect(goalProgress([sale(100, 1)], 1000, NOW)).toBe(0);
  });
});

describe("kutlama ayarları (cihaza özel)", () => {
  beforeEach(() => localStorage.clear());

  it("varsayılanlar ve kalıcılık", () => {
    expect(loadCelebrationSettings("A")).toMatchObject({ enabled: true, sound: false, motion: "auto", goal: 0 });
    saveCelebrationSettings("A", { enabled: false, motion: "reduce", sound: true, goal: 5000, autoSimplify: false });
    expect(loadCelebrationSettings("A")).toMatchObject({ enabled: false, motion: "reduce", sound: true, goal: 5000, autoSimplify: false });
    expect(loadCelebrationSettings("B").enabled).toBe(true);
  });

  it("bozuk/saldırgan değerler varsayılana düşer", () => {
    localStorage.setItem("propos_celebrate_v1_A", JSON.stringify({ enabled: "evet", motion: "<script>", goal: -5, sound: 1 }));
    expect(loadCelebrationSettings("A")).toMatchObject({ enabled: true, motion: "auto", goal: 0, sound: false });
    localStorage.setItem("propos_celebrate_v1_A", "{bozuk");
    expect(loadCelebrationSettings("A").enabled).toBe(true);
    localStorage.setItem("propos_celebrate_v1_A", JSON.stringify({ goal: 1e15 }));
    expect(loadCelebrationSettings("A").goal).toBe(0);
  });

  it("dayKey yerel gün", () => {
    expect(dayKey(new Date(2026, 10, 24, 23, 59).getTime())).toBe("2026-11-24");
  });
});
