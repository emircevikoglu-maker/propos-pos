import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { removalEffect, lineVoid, receiptVoid, appendVoids, summarizeVoids, cleanStreak, MAX_VOIDS } from "../../src/utils/voids";
import { mergeStates } from "../../src/services/merge";
import { VoidSheet } from "../../src/ui/VoidSheet";
import { pickMoment, STREAK_STEP } from "../../src/design/celebrations";

const table = { id: "t1", name: "Masa 1", staffId: "s1" };
const item = { id: "a", productId: "p", name: "Latte", price: 100, qty: 3, sentQty: 2 };

describe("iptal kuralları", () => {
  it("önce gönderilmemiş adetler eksilir", () => {
    expect(removalEffect(item, -1)).toMatchObject({ removed: 1, sentRemoved: 0, sentQty: 2, wholeLine: false });
    expect(removalEffect(item, -2)).toMatchObject({ sentRemoved: 1, sentQty: 1 });
    expect(removalEffect(item, -99)).toMatchObject({ removed: 3, sentRemoved: 2, sentQty: 0, wholeLine: true });
  });
  it("gönderilmemiş adet düşürmek kayıt üretmez; gönderilmiş ya da tüm satır üretir", () => {
    expect(lineVoid({ table, item, delta: -1 })).toBe(null);
    expect(lineVoid({ table, item, delta: -2, reason: "Yanlış giriş", user: "ali" })).toMatchObject({ qty: 1, amount: 100, afterSend: true, reason: "Yanlış giriş", user: "ali", tableName: "Masa 1" });
    expect(lineVoid({ table, item: { ...item, sentQty: 0 }, delta: -3 })).toMatchObject({ qty: 3, amount: 300, afterSend: false });
  });
  it("özet: gönderildikten sonra ve kişi kırılımı; defter sınırlı", () => {
    const a = lineVoid({ table, item, delta: -3, user: "ali" });
    const b = receiptVoid({ sale: { tableName: "Masa 2", total: 500, items: [{ name: "Çay", qty: 2 }] }, user: "veli" });
    const s = summarizeVoids([a, b]);
    expect(s).toMatchObject({ count: 2, amount: 700, afterSendAmount: 700 });
    expect(s.byPerson[0]).toMatchObject({ name: "veli", amount: 500 });
    expect(appendVoids(Array.from({ length: MAX_VOIDS }, (_, i) => ({ id: String(i) })), [a])).toHaveLength(MAX_VOIDS);
  });
  it("senkron: iki cihazın iptalleri kimlikle birleşir; geri alınan geri gelmez", () => {
    const e = (id) => ({ id, timestamp: new Date().toISOString() });
    expect(mergeStates({ voidLog: [] }, { voidLog: [e("a")] }, { voidLog: [e("b")] }).merged.voidLog.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(mergeStates({ voidLog: [e("a")] }, { voidLog: [] }, { voidLog: [e("a")] }).merged.voidLog).toEqual([]);
  });
});

describe("hatasız sipariş serisi", () => {
  const sale = (min, method = "Nakit", items = [{ productId: "p", name: "Latte", qty: 1, price: 1 }]) => ({ id: `s${min}`, timestamp: new Date(2026, 0, 1, 10, min).toISOString(), paymentMethod: method, total: 1, items });
  it("gönderilmiş iptal ve ikram sıfırlar; tahsilat satırı sayılmaz", () => {
    const sales = [sale(1), sale(2), sale(4), sale(5, "Nakit", [{ productId: "__payment", name: "Kısmi Hesap Tahsilatı", qty: 1, price: 1 }]), sale(6)];
    expect(cleanStreak(sales, [])).toEqual({ current: 4, best: 4 });
    expect(cleanStreak(sales, [{ afterSend: true, timestamp: new Date(2026, 0, 1, 10, 3).toISOString() }])).toEqual({ current: 2, best: 2 });
    expect(cleanStreak(sales, [{ afterSend: false, timestamp: new Date(2026, 0, 1, 10, 3).toISOString() }]).current).toBe(4);
    expect(cleanStreak([...sales, sale(7, "İkram / İptal")], [])).toEqual({ current: 0, best: 4 });
  });
  it("kutlama seriyi kullanır", () => {
    const now = Date.now();
    const s = { id: "x", timestamp: new Date(now).toISOString(), paymentMethod: "Nakit", total: 10, tableName: "M", items: [] };
    const prior = { ...s, id: "y" };
    expect(pickMoment({ sales: [s, prior], sale: s, now, streak: STREAK_STEP })).toEqual({ kind: "streak", data: { n: STREAK_STEP } });
    expect(pickMoment({ sales: [s, prior], sale: s, now, streak: 3 })).toBe(null);
  });
});

describe("VoidSheet", () => {
  it("neden tek dokunuşla seçilir", () => {
    const onPick = vi.fn(), onClose = vi.fn();
    render(<MemoryRouter><VoidSheet item={item} delta={-3} onPick={onPick} onClose={onClose} /></MemoryRouter>);
    expect(screen.getByText("2× Latte")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Müşteri vazgeçti" }));
    expect(onPick).toHaveBeenCalledWith("Müşteri vazgeçti");
    expect(onClose).toHaveBeenCalled();
  });
});
