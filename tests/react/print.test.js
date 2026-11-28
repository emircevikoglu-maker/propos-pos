import { describe, it, expect, vi } from "vitest";
import { stationFor, buildKitchenTickets, buildTableReceipt, buildSaleReceipt, pendingEntries, markSent, unsentCount, DISCLAIMER, NO_STATION } from "../../src/print/model";
import { renderTickets, printHtml } from "../../src/print/render";

const cats = { latte: "Kahveler", tost: "Atıştırmalıklar", su: "Soğuk İçecekler" };
const info = { tableName: "Masa 1", categoryOf: (id) => cats[id] };
const items = [
  { id: "a", productId: "latte", name: "Latte", price: 100, qty: 2, options: [{ groupId: "s", choiceId: "l", name: "Büyük" }], without: [{ ingredientId: "i1", name: "Süt" }], note: "Az şekerli" },
  { id: "b", productId: "tost", name: "Tost", price: 110, qty: 1, sentQty: 1 }
];

describe("istasyon yönlendirme", () => {
  it("ayar öncelikli; ayarsızsa tatlı/atıştırmalık mutfağa, gerisi bara", () => {
    expect(stationFor("Kahveler")).toBe("Bar");
    expect(stationFor("Atıştırmalıklar")).toBe("Mutfak");
    expect(stationFor("TATLILAR")).toBe("Mutfak");
    expect(stationFor("Kahveler", { Kahveler: "Mutfak" })).toBe("Mutfak");
    expect(stationFor("Tatlılar", { Tatlılar: NO_STATION })).toBe(NO_STATION);
    expect(stationFor("Kahveler", { Kahveler: "<x>" })).toBe("Bar");
  });
});

describe("mutfak fişi", () => {
  it("yalnızca yeni adetler; ikinci gönderimde boş, adet artınca yalnızca fark", () => {
    const first = buildKitchenTickets(pendingEntries(items), info);
    expect(first.map((t) => [t.station, t.lines.map((l) => `${l.qty} ${l.name}`)])).toEqual([["Bar", ["2 Latte"]]]);
    expect(first[0].lines[0]).toMatchObject({ details: "Büyük · Süt yok", note: "Az şekerli" });
    const sent = markSent(items);
    expect(unsentCount(sent)).toBe(0);
    expect(sent[1]).toBe(items[1]);
    expect(buildKitchenTickets(pendingEntries(sent), info)).toEqual([]);
    const more = sent.map((i) => (i.id === "b" ? { ...i, qty: 3 } : i));
    expect(buildKitchenTickets(pendingEntries(more), info)[0]).toMatchObject({ station: "Mutfak", lines: [expect.objectContaining({ qty: 2, name: "Tost" })] });
  });

  it("iptal fişi İPTAL başlığı ve nedeniyle basılır; fiş fiyat içermez", () => {
    const html = renderTickets(buildKitchenTickets([{ item: items[1], qty: 1 }], { ...info, cancel: true, reason: "Müşteri vazgeçti" }), { money: (n) => `₺${n}` });
    expect(html).toContain("İPTAL");
    expect(html).toContain("Neden: Müşteri vazgeçti");
    expect(html).not.toContain("₺110");
  });
});

describe("adisyon", () => {
  const table = { name: "Masa 1", items, discount: 10, paidAmount: 50 };
  it("toplamlar, indirim, kısmi ödeme ve mali olmayan ibaresi", () => {
    const m = buildTableReceipt(table, { businessName: "Kafe", footer: "Afiyet olsun" });
    expect(m).toMatchObject({ subtotal: 310, discount: 10, paid: 50, total: 250 });
    const html = renderTickets(m, { width: 58, money: (n) => `₺${n}` });
    expect(html).toContain("size:58mm auto");
    expect(html).toContain("width:58mm");
    expect(html).toContain(DISCLAIMER);
    expect(html).toContain("Süt yok");
    expect(html).toContain("₺250");
  });
  it("geçersiz kağıt genişliği 80 mm'ye düşer", () => {
    expect(renderTickets(buildTableReceipt(table), { width: "9999;}" })).toContain("size:80mm auto");
  });
  it("kapanmış satışın fişinde ödeme türü yazar", () => {
    const m = buildSaleReceipt({ tableName: "Masa 2", timestamp: new Date().toISOString(), items: [{ name: "Çay", price: 25, qty: 4 }], discount: 0, total: 100, paymentMethod: "Nakit" });
    expect(m).toMatchObject({ total: 100, paid: 0, method: "Nakit" });
  });
});

describe("güvenlik", () => {
  it("XSS: ürün adı, not, çıkarılan malzeme, masa ve alt bilgi kaçışlı", () => {
    const bad = '<img src=x onerror="alert(1)">';
    const evil = { name: bad, items: [{ productId: "x", name: bad, price: 1, qty: 1, note: bad, without: [{ ingredientId: "i", name: bad }] }] };
    const html = renderTickets([buildTableReceipt(evil, { businessName: bad, footer: bad, staffName: bad }), ...buildKitchenTickets(pendingEntries(evil.items), { tableName: bad, categoryOf: () => bad, reason: bad })]);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  it("yazdırma çerçevesi betik çalıştıramaz (sandbox) ve tek tutulur", () => {
    expect(printHtml("<p>a</p>")).toBe(true);
    printHtml("<p>b</p>");
    const frames = document.querySelectorAll("iframe[data-print-frame]");
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(frames[0].srcdoc).toContain("<p>b</p>");
    frames[0].remove();
  });
});
