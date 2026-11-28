import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Yeni rapor/yönetim ekranları (P12-6): bağlamı sahte vererek ekranın bağlandığı kancaları ve görünür davranışı doğrular.
let ctx = {};
vi.mock("../../src/context/PosContext", () => ({ usePos: () => ctx }));

import { StockView } from "../../src/ui/StockView";
import { StaffView } from "../../src/ui/StaffView";
import { EsnafView } from "../../src/ui/EsnafView";
import { FinanceView } from "../../src/ui/FinanceView";
import { AnalyticsView } from "../../src/ui/AnalyticsView";
import { SettingsView } from "../../src/ui/SettingsView";

const wrap = (el, path = "/x") => render(<MemoryRouter initialEntries={[path]}>{el}</MemoryRouter>);
const period = { globalPeriod: "daily", setGlobalPeriod: vi.fn(), customStartDate: "", setCustomStartDate: vi.fn(), customEndDate: "", setCustomEndDate: vi.fn() };

beforeEach(() => { ctx = { ...period }; });

describe("StockView", () => {
  beforeEach(() => {
    const milk = { id: "i1", name: "Süt", stock: 100, minLimit: 400, unit: "ml", unitCost: 0.05 };
    const beans = { id: "i2", name: "Kahve", stock: 5000, minLimit: 1000, unit: "gr", unitCost: 0.8 };
    ctx = {
      ...period, ingredients: [beans, milk], criticalIngredients: [milk], stockLog: [], isAdminUnlocked: true,
      products: [{ id: "p1", name: "Latte", price: 100, recipe: [{ ingredientId: "i1", amount: 200 }, { ingredientId: "i2", amount: 18 }] }],
      setStockModalIng: vi.fn(), setStockAdjustType: vi.fn(), setStockAdjustAmount: vi.fn(), setStockExpenseCost: vi.fn()
    };
  });

  it("kritik malzeme uyarısı gösterir ve kritik olanı başa alır", () => {
    wrap(<StockView />);
    expect(screen.getByText("Tedarik gerekiyor")).toBeTruthy();
    const names = [...document.querySelectorAll(".stock-name")].map((n) => n.textContent);
    expect(names).toEqual(["Süt", "Kahve"]);
  });

  it("Stok gir düğmesi mevcut stok penceresini hazırlar", () => {
    wrap(<StockView />);
    fireEvent.click(screen.getAllByRole("button", { name: /Stok gir/ })[0]);
    expect(ctx.setStockModalIng).toHaveBeenCalledWith(expect.objectContaining({ id: "i1" }));
    expect(ctx.setStockAdjustType).toHaveBeenCalledWith("add");
  });

  it("reçete sekmesi maliyet ve brüt kârı hesaplar; atık sekmesi boş durumu gösterir", async () => {
    wrap(<StockView />);
    fireEvent.click(screen.getByRole("button", { name: /Reçeteler/ }));
    const row = screen.getByText("Latte").closest("tr");
    // Dar ekran kartı için her hücre sütun başlığını taşır (useTableLabels).
    await waitFor(() => expect([...row.children].map((td) => td.getAttribute("data-label"))).toEqual(["Ürün", "Satış", "Maliyet", "Brüt kâr", "Düşen malzemeler"]));
    expect(within(row).getByText(/Süt −200 ml/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Atık ve sayım/ }));
    expect(screen.getByText(/Henüz kayıt yok/)).toBeTruthy();
  });
});

describe("StaffView", () => {
  it("kanal toplamlarını ve çalışan payını gösterir", () => {
    ctx = {
      ...period, exportExcelByCategory: vi.fn(),
      kpiMetrics: { grossRevenue: 1000, byMethod: { Nakit: 600, "Kredi Kartı": 400, "İkram / İptal": 50 } },
      staffPerformance: [{ id: "s1", name: "Emirhan", role: "Barista", avatar: "E", color: "#f59e0b", cash: 600, card: 400, mealCard: 0, cariWritten: 0, total: 1000, orderCount: 4, itemCount: 9 }]
    };
    wrap(<StaffView />);
    expect(screen.getAllByText("Emirhan").length).toBeGreaterThan(0);
    expect(screen.getByText(/kasanın %100/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Excel/ }));
    expect(ctx.exportExcelByCategory).toHaveBeenCalledWith("staff");
  });
});

describe("EsnafView", () => {
  const esnaf = [
    { id: "e1", name: "Berber Salih", shopType: "Kuaför", phone: "0532", discountRate: 15, balance: 485, transactions: [] },
    { id: "e2", name: "Eczane", shopType: "Sağlık", phone: "0533", discountRate: 0, balance: 0, transactions: [] }
  ];
  beforeEach(() => {
    ctx = {
      ...period, esnafList: esnaf, totalEsnafReceivable: 485, kpiMetrics: { cariWrittenTotal: 0 }, staffList: [],
      startFastEsnafOrder: vi.fn(), exportExcelByCategory: vi.fn(), esnafSearch: "", setEsnafSearch: vi.fn(),
      selectedEsnafDetail: null, setSelectedEsnafDetail: vi.fn(), setEsnafCollectModal: vi.fn(), setEsnafCollectAmount: vi.fn(),
      copyEsnafWhatsAppSummary: vi.fn(), handleQuickCreateEsnaf: vi.fn((e) => e.preventDefault()),
      quickNewEsnafName: "", setQuickNewEsnafName: vi.fn(), quickNewEsnafPhone: "", setQuickNewEsnafPhone: vi.fn(), quickNewEsnafDiscount: "", setQuickNewEsnafDiscount: vi.fn()
    };
  });

  it("yalnızca borçlu esnafa Tahsilat al düğmesi çıkar ve tutarı hazırlar", () => {
    wrap(<EsnafView />);
    expect(screen.getAllByRole("button", { name: "Tahsilat al" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Tahsilat al" }));
    expect(ctx.setEsnafCollectModal).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
    expect(ctx.setEsnafCollectAmount).toHaveBeenCalledWith("485");
  });

  it("Sipariş yaz ilgili esnafın kimliğiyle hızlı sipariş açar; satıra tıklamak ekstreyi seçer", () => {
    wrap(<EsnafView />);
    fireEvent.click(screen.getAllByRole("button", { name: "Sipariş yaz" })[0]);
    expect(ctx.startFastEsnafOrder).toHaveBeenCalledWith("e1");
    fireEvent.click(screen.getByText("Berber Salih"));
    expect(ctx.setSelectedEsnafDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });

  it("arama kutusu bağlama yazar", () => {
    wrap(<EsnafView />);
    fireEvent.change(screen.getByLabelText("Esnaf ara"), { target: { value: "ecz" } });
    expect(ctx.setEsnafSearch).toHaveBeenCalledWith("ecz");
  });
});

describe("FinanceView", () => {
  beforeEach(() => {
    ctx = {
      ...period, kpiMetrics: { grossRevenue: 500, totalExpenses: 700, netProfit: -200 }, sales: [], expenses: [], staffList: [], brandSettings: {},
      filteredExpenses: [{ id: "x1", title: "Kira", category: "Kira & Aidat", paymentMethod: "Nakit", amount: 700, timestamp: new Date().toISOString() }],
      setExpenses: vi.fn(), setEditingExpId: vi.fn(), setNewExpTitle: vi.fn(), setNewExpCategory: vi.fn(), setNewExpAmount: vi.fn(), setNewExpMethod: vi.fn(), setNewExpNote: vi.fn(),
      handleAddExpense: vi.fn((e) => e.preventDefault()), editingExpId: null, newExpTitle: "", newExpCategory: "Kira & Aidat", newExpAmount: "", newExpMethod: "Nakit", newExpNote: ""
    };
  });

  it("negatif net kâr gösterilir; gider listesi ve Z raporu aynı sayfada", () => {
    wrap(<FinanceView />);
    expect(screen.getByText("Kira")).toBeTruthy();
    expect(screen.getByText("Gün sonu (Z raporu)")).toBeTruthy();
    expect(document.querySelector(".kpi-hero .kpi-v").getAttribute("style")).toMatch(/danger/);
  });

  it("düzenle düğmesi form alanlarını doldurur; sil gideri listeden çıkarır", () => {
    wrap(<FinanceView />);
    fireEvent.click(screen.getByRole("button", { name: "Kira düzenle" }));
    expect(ctx.setEditingExpId).toHaveBeenCalledWith("x1");
    expect(ctx.setNewExpAmount).toHaveBeenCalledWith("700");
    fireEvent.click(screen.getByRole("button", { name: "Kira sil" }));
    const updater = ctx.setExpenses.mock.calls[0][0];
    expect(updater([{ id: "x1" }, { id: "x2" }])).toEqual([{ id: "x2" }]);
  });
});

describe("AnalyticsView", () => {
  const sale = { id: "s1", tableName: "Masa 1", staffId: "st1", paymentMethod: "Nakit", total: 120, timestamp: new Date().toISOString(), items: [{ qty: 2, name: "Latte" }] };
  const base = () => ({
    ...period, analyticsSubTab: "overview", setAnalyticsSubTab: vi.fn(), exportExcelByCategory: vi.fn(),
    kpiMetrics: { grossRevenue: 1000, orderCount: 4, cariWrittenTotal: 0, netProfit: 600, totalExpenses: 400, avgTicket: 250, byMethod: { Nakit: 600, "Kredi Kartı": 400 } },
    topProducts: [{ id: "p1", name: "Latte", category: "Sıcak", qty: 8, revenue: 800, costTotal: 200, profit: 600, share: 80 }],
    trendChartData: [{ name: "08:00", Ciro: 100 }, { name: "09:00", Ciro: 300 }], categories: ["Sıcak"], staffList: [{ id: "st1", name: "Emirhan" }],
    reportProductSearch: "", setReportProductSearch: vi.fn(), reportProductCategory: "Tümü", setReportProductCategory: vi.fn(), reportProductSort: "qty", setReportProductSort: vi.fn(),
    reportReceiptSearch: "", setReportReceiptSearch: vi.fn(), reportReceiptMethod: "Tümü", setReportReceiptMethod: vi.fn(), reportReceiptStaff: "Tümü", setReportReceiptStaff: vi.fn(),
    filteredSales: [sale], setInspectedSale: vi.fn(), handleDeleteSaleReceipt: vi.fn(),
    reportExpenseSearch: "", setReportExpenseSearch: vi.fn(), reportExpenseCategory: "Tümü", setReportExpenseCategory: vi.fn(), filteredExpenses: [], setExpenses: vi.fn()
  });

  it("özet: KPI, grafik sütunları ve ödeme yüzdeleri; bölüm değişimi bağlama yazar", () => {
    ctx = base();
    wrap(<AnalyticsView />);
    expect(document.querySelectorAll(".heat-col")).toHaveLength(2);
    expect(screen.getByText(/%60/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Adisyonlar" }));
    expect(ctx.setAnalyticsSubTab).toHaveBeenCalledWith("receipts");
    fireEvent.click(screen.getByRole("button", { name: /Genel özet Excel/ }));
    expect(ctx.exportExcelByCategory).toHaveBeenCalledWith("overview");
  });

  it("adisyonlar: fişi incele ve kaydı sil bağlıdır", () => {
    ctx = { ...base(), analyticsSubTab: "receipts" };
    wrap(<AnalyticsView />);
    fireEvent.click(screen.getByRole("button", { name: "Masa 1 fişini incele" }));
    expect(ctx.setInspectedSale).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
    fireEvent.click(screen.getByRole("button", { name: "Masa 1 kaydını sil" }));
    expect(ctx.handleDeleteSaleReceipt).toHaveBeenCalledWith("s1");
  });

  it("ürünler: kategori filtresi ürünü eler", () => {
    ctx = { ...base(), analyticsSubTab: "products", reportProductCategory: "Soğuk" };
    wrap(<AnalyticsView />);
    expect(screen.getByText(/Filtreye uyan ürün satışı yok/)).toBeTruthy();
  });
});

describe("SettingsView (Yönetim)", () => {
  const brand = { businessName: "Kafe", subtitle: "", badgeText: "", logoType: "text", logoText: "K", logoEmoji: "☕", logoImageUrl: "", currency: "TRY", customPrimary: "#f59e0b" };
  const base = (tab) => ({
    ...period, settingsSubTab: tab, setSettingsSubTab: vi.fn(), brandSettings: brand, setBrandSettings: vi.fn(), handleLogoFileUpload: vi.fn(), showToast: vi.fn(),
    celebration: { enabled: true, autoSimplify: true, sound: false, motion: "auto", goal: 0 }, updateCelebration: vi.fn(),
    staffList: [{ id: "s1", name: "Zeynep", role: "Barista", color: "#10b981", avatar: "Z" }], handleDeleteStaff: vi.fn(),
    setEditingStaffId: vi.fn(), setNewStaffName: vi.fn(), setNewStaffRole: vi.fn(), setNewStaffColor: vi.fn(),
    isAdminUnlocked: true, newPinValue: "", setNewPinValue: vi.fn(), handleChangePin: vi.fn(), exportExcelByCategory: vi.fn(), exportFullBackupFile: vi.fn(),
    handleImportBackupFile: vi.fn(), setResetConfirmOpen: vi.fn(), ACTIVE_TENANT_ID: "X"
  });

  it("bölüm segmenti bağlama yazar; kimlik: para birimi değişimi toast gösterir", () => {
    ctx = base("branding");
    wrap(<SettingsView />);
    fireEvent.click(screen.getByRole("button", { name: "Menü" }));
    expect(ctx.setSettingsSubTab).toHaveBeenCalledWith("menu");
    fireEvent.click(screen.getByRole("button", { name: /USD/ }));
    expect(ctx.setBrandSettings).toHaveBeenCalled();
    expect(ctx.showToast).toHaveBeenCalled();
  });

  it("hareket: anahtarlar kutlama ayarını günceller; hedef kaydedilir", () => {
    ctx = base("feel");
    wrap(<SettingsView />);
    fireEvent.click(screen.getByRole("switch", { name: "Kutlamalar" }));
    expect(ctx.updateCelebration).toHaveBeenCalledWith({ enabled: false });
    fireEvent.change(screen.getByLabelText("Günlük ciro hedefi"), { target: { value: "15000" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(ctx.updateCelebration).toHaveBeenCalledWith({ goal: 15000 });
  });

  it("çalışanlar: düzenle alanları doldurur ve pencere açar; sil bağlıdır", () => {
    ctx = base("staff");
    wrap(<SettingsView />);
    fireEvent.click(screen.getByRole("button", { name: "Zeynep düzenle" }));
    expect(ctx.setEditingStaffId).toHaveBeenCalledWith("s1");
    expect(ctx.setNewStaffName).toHaveBeenCalledWith("Zeynep");
    fireEvent.click(screen.getByRole("button", { name: "Zeynep sil" }));
    expect(ctx.handleDeleteStaff).toHaveBeenCalledWith("s1");
  });

  it("güvenlik: PIN'ler eşleşmezse sunucuya gitmez", () => {
    ctx = { ...base("security"), newPinValue: "1234" };
    wrap(<SettingsView />);
    fireEvent.change(screen.getByLabelText("Yeni PIN tekrar"), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "PIN'i güncelle" }));
    expect(screen.getByRole("status").textContent).toMatch(/eşleşmiyor/);
    expect(ctx.handleChangePin).not.toHaveBeenCalled();
  });
});
