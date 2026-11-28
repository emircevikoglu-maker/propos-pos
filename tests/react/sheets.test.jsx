import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";

// 3.9.1'deki eski pencerelerin davranış listesi: yeni pencereler aynısını karşılamalı.
let ctx = {};
vi.mock("../../src/context/PosContext", () => ({ usePos: () => ctx }));
import { GlobalSheets } from "../../src/ui/GlobalSheets";
import { PaySheet } from "../../src/ui/PaySheet";
import { OpsSheet } from "../../src/ui/OpsSheet";

let nav, loc;
function Spy() { nav = useNavigate(); loc = useLocation(); return null; }
const wrap = (el) => render(<MemoryRouter initialEntries={["/stok"]}><Spy />{el}</MemoryRouter>);

const base = () => ({
  syncModalOpen: false, setSyncModalOpen: vi.fn(), pinModalOpen: false, stockModalIng: null, setStockModalIng: vi.fn(),
  esnafCollectModal: null, setEsnafCollectModal: vi.fn(), inspectedSale: null, setInspectedSale: vi.fn(), resetConfirmOpen: false, setResetConfirmOpen: vi.fn()
});
beforeEach(() => { ctx = base(); });

describe("durumla açılan pencereler (URL ile eşli)", () => {
  it("durum açılınca ?s= eklenir; geri tuşu pencereyi kapatıp durumu temizler", () => {
    ctx.inspectedSale = { id: "s1", tableName: "Masa 9", timestamp: new Date().toISOString(), paymentMethod: "Nakit", total: 90, discount: 10, items: [{ name: "Latte", qty: 1, price: 100, without: [{ ingredientId: "i", name: "Süt" }] }] };
    ctx.printSaleReceipt = vi.fn(); ctx.handleDeleteSaleReceipt = vi.fn(); ctx.staffList = [];
    wrap(<GlobalSheets />);
    expect(loc.search).toBe("?s=fis");
    expect(screen.getByRole("dialog", { name: "Masa 9" })).toBeTruthy();
    expect(screen.getByText("Süt yok")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Adisyon yazdır/ }));
    expect(ctx.printSaleReceipt).toHaveBeenCalledWith(ctx.inspectedSale);
    fireEvent.click(screen.getByRole("button", { name: /Kaydı sil/ }));
    expect(ctx.handleDeleteSaleReceipt).toHaveBeenCalledWith("s1");
    act(() => { nav(-1); });
    expect(ctx.setInspectedSale).toHaveBeenCalledWith(null);
    expect(loc.search).toBe("");
  });

  it("stok: tür seçimi, miktar alım tutarını hesaplar, gönderim bağlıdır", () => {
    ctx = { ...base(), stockModalIng: { id: "i1", name: "Süt", unit: "ml", stock: 100, unitCost: 0.05 }, stockAdjustType: "add", setStockAdjustType: vi.fn(), stockReason: "Son kullanma", setStockReason: vi.fn(), stockAdjustAmount: "", setStockAdjustAmount: vi.fn(), setStockExpenseCost: vi.fn(), recordAsExpense: true, setRecordAsExpense: vi.fn(), stockExpenseCost: "", handleStockAdjustment: vi.fn((e) => e.preventDefault()) };
    wrap(<GlobalSheets />);
    fireEvent.change(screen.getByPlaceholderText("Örn. 1000 ml"), { target: { value: "2000" } });
    expect(ctx.setStockExpenseCost).toHaveBeenCalledWith("100");
    fireEvent.click(screen.getByRole("button", { name: "Zayi" }));
    expect(ctx.setStockAdjustType).toHaveBeenCalledWith("waste");
    fireEvent.submit(document.getElementById("stock-form"));
    expect(ctx.handleStockAdjustment).toHaveBeenCalled();
  });

  it("tahsilat: tüm borç kısayolu ve yöntem", () => {
    ctx = { ...base(), esnafCollectModal: { id: "e", name: "Berber", balance: 485 }, esnafCollectAmount: "100", setEsnafCollectAmount: vi.fn(), esnafCollectMethod: "Nakit", setEsnafCollectMethod: vi.fn(), esnafCollectStaffId: "s", setEsnafCollectStaffId: vi.fn(), esnafCollectNote: "", setEsnafCollectNote: vi.fn(), staffList: [{ id: "s", name: "Ali" }], handleCollectEsnafPayment: vi.fn((e) => e.preventDefault()) };
    wrap(<GlobalSheets />);
    fireEvent.click(screen.getByRole("button", { name: /Tüm borç/ }));
    expect(ctx.setEsnafCollectAmount).toHaveBeenCalledWith("485");
    fireEvent.click(screen.getByRole("button", { name: "Kredi Kartı" }));
    expect(ctx.setEsnafCollectMethod).toHaveBeenCalledWith("Kredi Kartı");
    fireEvent.submit(document.getElementById("collect-form"));
    expect(ctx.handleCollectEsnafPayment).toHaveBeenCalled();
  });

  it("sıfırlama: SIFIRLA yazılmadan pasif; tıklama yetmez, Enter ile onaylanır", () => {
    ctx = { ...base(), resetConfirmOpen: true, handleResetDemoData: vi.fn() };
    wrap(<GlobalSheets />);
    const hold = screen.getByRole("button", { name: /Basılı tutun/ });
    expect(hold.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/SIFIRLA/), { target: { value: "sıfırla" } });
    expect(hold.disabled).toBe(false);
    fireEvent.click(hold);
    expect(ctx.handleResetDemoData).not.toHaveBeenCalled();
    fireEvent.keyDown(hold, { key: "Enter" });
    expect(ctx.handleResetDemoData).toHaveBeenCalledTimes(1);
  });

  it("senkron: QR, kimlik, iki adımlı çıkış", () => {
    ctx = { ...base(), syncModalOpen: true, ACTIVE_TENANT_ID: "DEFAULT", clientDeviceId: "dev-abc", brandSettings: { businessName: "Kafe" }, lastSyncedAt: null, syncPending: false, cloudStatus: "online", handleManualForceSync: vi.fn(), exportFullBackupFile: vi.fn(), handleUnpairDevice: vi.fn(), showToast: vi.fn() };
    wrap(<GlobalSheets />);
    expect(screen.getByText("dev-abc")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bu cihazdan çıkış yap" }));
    expect(ctx.handleUnpairDevice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Emin misiniz/ }));
    expect(ctx.handleUnpairDevice).toHaveBeenCalled();
  });
});

describe("ödeme adımları", () => {
  const table = { id: "t", name: "Masa 1", items: [{ price: 100, qty: 3 }], discount: 0, paidAmount: 0 };
  const payCtx = () => ({
    completeTableOrder: vi.fn(), handlePartialPayment: vi.fn(), printDevice: { receiptAfterPay: false }, updatePrintDevice: vi.fn(),
    esnafList: [{ id: "e1", name: "Berber", balance: 50, discountRate: 10 }], selectedEsnafForCharge: "e1", setSelectedEsnafForCharge: vi.fn(),
    applyEsnafDiscount: true, setApplyEsnafDiscount: vi.fn(), esnafOrderNote: "", setEsnafOrderNote: vi.fn(),
    quickNewEsnafName: "", setQuickNewEsnafName: vi.fn(), handleQuickCreateEsnaf: vi.fn(), handleConfirmEsnafCharge: vi.fn(() => "closed")
  });
  const other = () => fireEvent.click(screen.getByRole("button", { name: "Diğer" }));

  it("nakitte para üstü kapanışa iletilir", () => {
    ctx = payCtx();
    wrap(<PaySheet table={table} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Nakit" }));
    fireEvent.click(screen.getByRole("button", { name: /^₺500$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Ödemeyi al/ }));
    expect(ctx.completeTableOrder).toHaveBeenCalledWith("Nakit", { change: 200 });
  });

  it("tutar girerek kısmi ödeme: tutar iletilir, pencere kapanır", () => {
    ctx = payCtx();
    const onClose = vi.fn();
    wrap(<PaySheet table={table} onClose={onClose} />);
    other();
    fireEvent.click(screen.getByRole("button", { name: /Tutar girerek/ }));
    expect(screen.getByRole("button", { name: "Nakit al" }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Tahsil edilecek/), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: /Nakit al/ }));
    expect(ctx.handlePartialPayment).toHaveBeenCalledWith("Nakit", 120);
    expect(onClose).toHaveBeenCalled();
  });

  it("cariye yaz: indirimli tutar ve tam mod; kısmi aktarımda tutar korunur", () => {
    ctx = payCtx();
    const view = wrap(<PaySheet table={table} onClose={vi.fn()} />);
    other();
    fireEvent.click(screen.getByRole("button", { name: /Esnaf cariye yaz/ }));
    fireEvent.click(screen.getByRole("button", { name: /270.*Berber carisine yaz/ }));
    expect(ctx.handleConfirmEsnafCharge).toHaveBeenCalledWith({ mode: "full", amount: 270 });
    view.unmount();
    ctx = { ...payCtx(), handleConfirmEsnafCharge: vi.fn(() => "partial") };
    const onClose = vi.fn();
    wrap(<PaySheet table={table} onClose={onClose} />);
    other();
    fireEvent.click(screen.getByRole("button", { name: /Tutar girerek/ }));
    fireEvent.change(screen.getByLabelText(/Tahsil edilecek/), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: /Bu tutarı esnaf cariye yaz/ }));
    fireEvent.click(screen.getByRole("button", { name: /carisine yaz/ }));
    expect(ctx.handleConfirmEsnafCharge).toHaveBeenCalledWith({ mode: "partial", amount: 50 });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("masa taşıma adımı", () => {
  it("diğer masalar listelenir; dolu masa 'Birleştir', boş masa 'Boş · taşı'", () => {
    const t1 = { id: "a", name: "Bahçe 1", zone: "Bahçe", status: "occupied", items: [{ price: 10, qty: 1 }] };
    ctx = {
      staffList: [], zones: ["Bahçe"], handleTransferTable: vi.fn(), setTableStaff: vi.fn(), changeTableGuests: vi.fn(), setTableDiscount: vi.fn(), printTableReceipt: vi.fn(), reprintKitchen: vi.fn(),
      tables: [t1, { id: "b", name: "Bahçe 2", zone: "Bahçe", status: "empty", items: [] }, { id: "c", name: "Bahçe 3", zone: "Bahçe", status: "occupied", items: [{ price: 5, qty: 1 }] }]
    };
    wrap(<OpsSheet table={t1} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /başka masaya taşı/ }));
    expect(screen.queryByRole("button", { name: /Bahçe 1/ })).toBe(null);
    expect(screen.getByRole("button", { name: /Bahçe 3.*Birleştir/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Bahçe 2.*Boş/ }));
    expect(ctx.handleTransferTable).toHaveBeenCalledWith("b");
  });
});
