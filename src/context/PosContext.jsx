import { useLocation, useNavigate } from "react-router-dom";
import { TAB_PATHS, tabFromPath, tableIdFromPath, tablePath } from "../ui/routes";
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import {
  PROTECTED_TABS, INITIAL_BRAND_SETTINGS,
  INITIAL_ZONES, INITIAL_CATEGORIES, INITIAL_STAFF, INITIAL_INGREDIENTS,
  INITIAL_PRODUCTS, INITIAL_TABLES, INITIAL_ESNAF, generateInitialSales, generateInitialExpenses
} from "../constants/initialData";
import {
  formatTL, formatDateShort, toDateInputValue, isWithinPeriod, setActiveCurrencyCode,
  getActiveCurrencyObj, resolveActiveTenantId, loadInitialProPosDb
} from "../utils/formatters";
import {
  pushState, pullState, verifyManagerPin, changeManagerPin, clearManagerSession, unpairDevice,
  fetchRealtimeConfig
} from "../services/apiService";
import { createSyncEngine } from "../services/syncEngine";
import { saveState as saveLocalState, saveBase as saveLocalBase, saveMeta as saveLocalMeta, requestPersistence, storageEstimate } from "../services/localDb";
import { createRealtime } from "../services/realtime";
import { PPMotion } from "../design/motion";
import {
  loadCelebrationSettings, saveCelebrationSettings, applyCelebrationSettings, celebrateSale, celebrateZReport, goalProgress, isBusyNow
} from "../design/celebrations";
import { sanitizeOptionGroups, buildOrderLine, mergeIntoItems, lineDetails, lineConsumption, needsContentSheet, editLine } from "../utils/productOptions";
import { applyStockAction, appendLog } from "../utils/stockLog";
import { productStats, itemCount, closingTotals, paymentLine } from "../utils/ledger";
import { removeIngredientFromProducts, cleanRecipe } from "../utils/ingredients";
import { buildKitchenTickets, buildTableReceipt, buildSaleReceipt, pendingEntries, markSent, unsentCount } from "../print/model";
import { renderTickets, printHtml } from "../print/render";
import { loadDevicePrint, saveDevicePrint } from "../print/device";
import { findByBarcode, cleanBarcode, barcodeTaken, normalizeGuests } from "../utils/posHelpers";
import { exportExcelByCategory as runExcelExport } from "../utils/excelExport";

const ACTIVE_TENANT_ID = resolveActiveTenantId();
const PosContext = createContext(null);

export const usePos = () => useContext(PosContext);

export function PosProvider({ children }) {
  // Açılış anlık görüntüsü: DeviceGate IndexedDB'den önceden yükler (window.__PROPOS_BOOT__); yoksa eski localStorage.
  const INITIAL_DB_SNAPSHOT = useMemo(() => loadInitialProPosDb(ACTIVE_TENANT_ID), []);
  // Sekme ve açık masa URL'den türetilir (react-router): geri tuşu, yenileme ve derin bağlantı çalışır.
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabFromPath(location.pathname);
  const activeTableId = tableIdFromPath(location.pathname);
  const setActiveTab = (tab) => navigate(TAB_PATHS[tab] || TAB_PATHS.pos);
  // Geçmiş: masalar → masa (itme) → masa?s=pencere (itme). Kapatırken eklenen girdiler geri alınır, böylece geri tuşu
  // kapanmış masaya dönmez; masa listesinden gelinmediyse (yenileme/derin bağlantı) yerine koyulur.
  const setActiveTableId = (id) => {
    const st = location.state || {};
    if (!id) {
      if (st.fromTables) navigate(st.sheet ? -2 : -1);
      else navigate(TAB_PATHS.pos, { replace: true });
      return;
    }
    navigate(tablePath(id), { replace: !!activeTableId, state: { fromTables: activeTableId ? !!st.fromTables : true } });
  };
  const [globalPeriod, setGlobalPeriod] = useState("daily");
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(new Date(Date.now() - 7 * 86400000)));
  const [customEndDate, setCustomEndDate] = useState(() => toDateInputValue(new Date()));
  const [cloudStatus, setCloudStatus] = useState("connecting");
  const [syncPending, setSyncPending] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const clientDeviceIdRef = useRef(`dev-${Math.random().toString(36).slice(2, 9)}`);

  // Security & Admin PIN
  // PIN sunucuda (hash) durur; istemci PIN'i ya da uzunluğunu bilmez. Sayfa yenilenince kilit kapanır.
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => { clearManagerSession(ACTIVE_TENANT_ID); return false; });
  const [pinBusy, setPinBusy] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pendingProtectedTab, setPendingProtectedTab] = useState(null);
  const [newPinValue, setNewPinValue] = useState("");

  // Core POS Database Entities
  const [brandSettings, setBrandSettings] = useState(() => INITIAL_DB_SNAPSHOT?.brandSettings || INITIAL_BRAND_SETTINGS);
  const [zones, setZones] = useState(() => INITIAL_DB_SNAPSHOT?.zones || INITIAL_ZONES);
  const [categories, setCategories] = useState(() => INITIAL_DB_SNAPSHOT?.categories || INITIAL_CATEGORIES);
  const [staffList, setStaffList] = useState(() => INITIAL_DB_SNAPSHOT?.staffList || INITIAL_STAFF);
  const [ingredients, setIngredients] = useState(() => INITIAL_DB_SNAPSHOT?.ingredients || INITIAL_INGREDIENTS);
  const [products, setProducts] = useState(() => INITIAL_DB_SNAPSHOT?.products || INITIAL_PRODUCTS);
  const [tables, setTables] = useState(() => INITIAL_DB_SNAPSHOT?.tables || INITIAL_TABLES);
  const [sales, setSales] = useState(() => INITIAL_DB_SNAPSHOT?.sales || generateInitialSales());
  const [expenses, setExpenses] = useState(() => INITIAL_DB_SNAPSHOT?.expenses || generateInitialExpenses());
  const [esnafList, setEsnafList] = useState(() => INITIAL_DB_SNAPSHOT?.esnafList || INITIAL_ESNAF);
  const [stockLog, setStockLog] = useState(() => (Array.isArray(INITIAL_DB_SNAPSHOT?.stockLog) ? INITIAL_DB_SNAPSHOT.stockLog : []));
  const [stockReason, setStockReason] = useState("Son kullanma");
  const [newPrdBarcode, setNewPrdBarcode] = useState("");

  // Kutlamalar / hareket: cihaza özel (senkronlanmaz)
  const [celebration, setCelebrationState] = useState(() => loadCelebrationSettings(ACTIVE_TENANT_ID));
  const salesRef = useRef([]);
  const updateCelebration = (patch) => {
    setCelebrationState((prev) => { const next = { ...prev, ...patch }; saveCelebrationSettings(ACTIVE_TENANT_ID, next); return next; });
  };

  // Yazdırma: cihaza özel kısım (kağıt, otomatik baskı)
  const [printDevice, setPrintDeviceState] = useState(() => loadDevicePrint(ACTIVE_TENANT_ID));
  const updatePrintDevice = (patch) => setPrintDeviceState((prev) => { const next = { ...prev, ...patch }; saveDevicePrint(ACTIVE_TENANT_ID, next); return next; });

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    // Üst üste gelen bildirimlerde önceki zamanlayıcı yenisini erken kapatmasın.
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  // UI View & Modal States
  const [selectedZone, setSelectedZone] = useState("Tümü");
  const [mobilePosPanel, setMobilePosPanel] = useState("menu");
  const [posCategory, setPosCategory] = useState("Tümü");
  const [posSearch, setPosSearch] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [partialPayModalOpen, setPartialPayModalOpen] = useState(false);
  const [partialPayAmount, setPartialPayAmount] = useState("");
  const [noteModalItem, setNoteModalItem] = useState(null);
  const [inspectedSale, setInspectedSale] = useState(null);
  const [esnafChargeModalOpen, setEsnafChargeModalOpen] = useState(false);
  const [esnafChargeMode, setEsnafChargeMode] = useState("full");
  const [selectedEsnafForCharge, setSelectedEsnafForCharge] = useState(INITIAL_ESNAF[0]?.id || "");
  const [applyEsnafDiscount, setApplyEsnafDiscount] = useState(true);
  const [esnafOrderNote, setEsnafOrderNote] = useState("");
  const [quickNewEsnafName, setQuickNewEsnafName] = useState("");
  const [quickNewEsnafPhone, setQuickNewEsnafPhone] = useState("");
  const [quickNewEsnafDiscount, setQuickNewEsnafDiscount] = useState("10");
  const [esnafSearch, setEsnafSearch] = useState("");
  const [selectedEsnafDetail, setSelectedEsnafDetail] = useState(null);
  const [esnafCollectModal, setEsnafCollectModal] = useState(null);
  const [esnafCollectAmount, setEsnafCollectAmount] = useState("");
  const [esnafCollectMethod, setEsnafCollectMethod] = useState("Nakit");
  const [esnafCollectStaffId, setEsnafCollectStaffId] = useState("st-1");
  const [esnafCollectNote, setEsnafCollectNote] = useState("");
  const [stockModalIng, setStockModalIng] = useState(null);
  const [stockAdjustType, setStockAdjustType] = useState("add");
  const [stockAdjustAmount, setStockAdjustAmount] = useState("");
  const [recordAsExpense, setRecordAsExpense] = useState(true);
  const [stockExpenseCost, setStockExpenseCost] = useState("");
  const [editingExpId, setEditingExpId] = useState(null);
  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpCategory, setNewExpCategory] = useState("Toptancı / Malzeme");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpMethod, setNewExpMethod] = useState("Nakit");
  const [newExpNote, setNewExpNote] = useState("");
  const [analyticsSubTab, setAnalyticsSubTab] = useState("overview");
  const [reportProductSearch, setReportProductSearch] = useState("");
  const [reportProductCategory, setReportProductCategory] = useState("Tümü");
  const [reportProductSort, setReportProductSort] = useState("qty");
  const [reportReceiptSearch, setReportReceiptSearch] = useState("");
  const [reportReceiptMethod, setReportReceiptMethod] = useState("Tümü");
  const [reportReceiptStaff, setReportReceiptStaff] = useState("Tümü");
  const [reportExpenseSearch, setReportExpenseSearch] = useState("");
  const [reportExpenseCategory, setReportExpenseCategory] = useState("Tümü");
  const [settingsSubTab, setSettingsSubTab] = useState("branding");
  const [editingTableId, setEditingTableId] = useState(null);
  const [newTableName, setNewTableName] = useState("");
  const [newTableZone, setNewTableZone] = useState("Bahçe");
  const [newZoneName, setNewZoneName] = useState("");
  const [editingZoneOldName, setEditingZoneOldName] = useState(null);
  const [editingPrdId, setEditingPrdId] = useState(null);
  const [newPrdName, setNewPrdName] = useState("");
  const [newPrdCategory, setNewPrdCategory] = useState("Kahveler");
  const [newPrdPrice, setNewPrdPrice] = useState("");
  const [newPrdEmoji, setNewPrdEmoji] = useState("☕");
  const [newPrdQuickFav, setNewPrdQuickFav] = useState(false);
  const [newPrdAskContent, setNewPrdAskContent] = useState(false);
  const [newPrdRecipe, setNewPrdRecipe] = useState([]);
  const [newPrdOptions, setNewPrdOptions] = useState([]);
  const [optionPickerProduct, setOptionPickerProduct] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryOldName, setEditingCategoryOldName] = useState(null);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Barista");
  const [newStaffColor, setNewStaffColor] = useState("#f59e0b");
  const [editingEsnafId, setEditingEsnafId] = useState(null);
  const [editEsnafName, setEditEsnafName] = useState("");
  const [editEsnafShopType, setEditEsnafShopType] = useState("");
  const [editEsnafPhone, setEditEsnafPhone] = useState("");
  const [editEsnafDiscount, setEditEsnafDiscount] = useState("10");
  const [editEsnafNote, setEditEsnafNote] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  setActiveCurrencyCode(brandSettings?.currency || "TRY");
  const activeCurrencyObj = getActiveCurrencyObj();

  const handleTabNavigation = (tabId) => {
    if (PROTECTED_TABS.includes(tabId) && !isAdminUnlocked) {
      setPendingProtectedTab(tabId);
      setPinInput("");
      setPinError(false);
      setPinModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  };

  // ---- Eşitleme: IndexedDB'de kalıcı yerel durum + sunucuyla üç yönlü birleştirme (services/syncEngine.js) ----
  const stateRef = useRef(null);
  stateRef.current = { brandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, esnafList, stockLog };
  const engineRef = useRef(null);

  const applySyncedState = (st, { remote }) => {
    if (remote) isRemoteUpdateRef.current = true;
    if (st.brandSettings) setBrandSettings(st.brandSettings);
    if (Array.isArray(st.zones)) setZones(st.zones);
    if (Array.isArray(st.categories)) setCategories(st.categories);
    if (Array.isArray(st.staffList)) setStaffList(st.staffList);
    if (Array.isArray(st.ingredients)) setIngredients(st.ingredients);
    if (Array.isArray(st.products)) setProducts(st.products);
    if (Array.isArray(st.tables)) setTables(st.tables);
    if (Array.isArray(st.sales)) setSales(st.sales);
    if (Array.isArray(st.expenses)) setExpenses(st.expenses);
    if (Array.isArray(st.esnafList)) setEsnafList(st.esnafList);
    if (Array.isArray(st.stockLog)) setStockLog(st.stockLog);
    setLastSyncedAt(new Date().toISOString());
    if (remote) setTimeout(() => { isRemoteUpdateRef.current = false; }, 250);
  };

  useEffect(() => {
    let active = true;
    const boot = typeof window !== "undefined" && window.__PROPOS_BOOT__ && window.__PROPOS_BOOT__.tenantId === ACTIVE_TENANT_ID ? window.__PROPOS_BOOT__ : null;
    const engine = createSyncEngine({
      tenantId: ACTIVE_TENANT_ID,
      deviceId: clientDeviceIdRef.current,
      push: (rev, json) => pushState(ACTIVE_TENANT_ID, clientDeviceIdRef.current, rev, json),
      pull: async (since) => {
        const r = await pullState(ACTIVE_TENANT_ID, since, clientDeviceIdRef.current);
        if (r.lanIp) window.__PROPOS_LAN_IP__ = r.lanIp;
        return r;
      },
      store: {
        saveState: (st) => saveLocalState(ACTIVE_TENANT_ID, st),
        saveBase: (b) => saveLocalBase(ACTIVE_TENANT_ID, b),
        saveMeta: (m) => saveLocalMeta(ACTIVE_TENANT_ID, m)
      },
      applyState: (st, info) => applySyncedState(st, info),
      onStatus: ({ status, pending, conflicts }) => {
        if (!active) return;
        setSyncPending(pending);
        setCloudStatus({ synced: "online", pending: "saving", offline: "offline", blocked: "error", connecting: "connecting" }[status] || "connecting");
        if (conflicts && conflicts.length > 0) showToast(`🔀 Başka cihazla ${conflicts.length} çakışma vardı; sizin değişikliğiniz korundu.`, "warning");
      }
    });
    engineRef.current = engine;
    engine.init({ state: boot?.state || stateRef.current, base: boot?.base || null, meta: boot?.meta || { serverRev: 0, dirty: false } });

    // Görünür sekmede 3 sn; gizli sekmede 30 sn. Realtime sinyal kanalı bağlıysa yoklama yalnızca emniyet için
    // (60 sn / 120 sn): değişiklik sinyalle anında gelir, istek sayısı ~20 kat düşer.
    let lastPollAt = 0;
    let rtConnected = false;
    const tick = () => {
      const hidden = typeof document !== "undefined" && document.hidden;
      const gap = rtConnected ? (hidden ? 120000 : 60000) : (hidden ? 30000 : 2900);
      if (Date.now() - lastPollAt < gap) return;
      lastPollAt = Date.now();
      engine.pull();
    };
    let signalTimer = null;
    const realtime = createRealtime({
      onStatus: (c) => { rtConnected = c; if (c) { lastPollAt = 0; engine.onOnline(); } },
      onSignal: ({ rev, by }) => {
        if (by === clientDeviceIdRef.current || rev <= engine.state().serverRev) return;
        if (signalTimer) clearTimeout(signalTimer);
        signalTimer = setTimeout(() => { lastPollAt = Date.now(); engine.pull(); }, 120);
      }
    });
    // Supabase kapalıysa sessizce yoklamaya devam edilir.
    fetchRealtimeConfig(ACTIVE_TENANT_ID).then((cfg) => { if (active && cfg) realtime.start(cfg); }).catch(() => {});
    tick();
    const intervalId = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.hidden) { engine.flushNow(); return; }
      lastPollAt = 0;
      tick();
    };
    const onPageHide = () => { engine.flushNow(); };
    const onNet = (e) => { if (e.detail && e.detail.online) { lastPollAt = 0; engine.onOnline(); } };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("propos-connectivity", onNet);
    // Kalıcı depolama izni + kota (tarayıcı veriyi baskı altında silmesin)
    requestPersistence().then(() => storageEstimate()).then((info) => { if (active && info) setStorageInfo(info); }).catch(() => {});
    return () => {
      active = false;
      engine.destroy();
      engineRef.current = null;
      realtime.stop();
      if (signalTimer) clearTimeout(signalTimer);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("propos-connectivity", onNet);
    };
  }, []);

  // Yerel değişiklik → kalıcı depo (hemen) + eşitleme motoru (debounce ile gönderim)
  useEffect(() => {
    if (isInitialMountRef.current) { isInitialMountRef.current = false; return; }
    if (isRemoteUpdateRef.current) return;
    if (engineRef.current) engineRef.current.localChanged(stateRef.current);
  }, [brandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, esnafList, stockLog]);

  // 429: sunucu "yavaşla" dedi. Kasada pop-up yok, kısa bir bilgi yeter; senkron kendini toparlar.
  useEffect(() => {
    let lastShown = 0;
    const onLimited = (e) => {
      if (Date.now() - lastShown < 10000) return;
      lastShown = Date.now();
      showToast(`⏳ Çok fazla istek. ${e.detail?.retryAfter || 30} sn bekleyin; değişiklikler sonra otomatik gönderilecek.`, "warning");
    };
    window.addEventListener("propos-rate-limited", onLimited);
    return () => window.removeEventListener("propos-rate-limited", onLimited);
  }, []);

  useEffect(() => {
    setCloudStatus(navigator.onLine ? "online" : "offline");
    setLastSyncedAt(new Date().toISOString());
    const onOnline = () => { showToast("🌐 İnternet bağlantısı geri geldi! Bekleyen değişiklikler gönderiliyor."); if (engineRef.current) engineRef.current.onOnline(); };
    const onOffline = () => { setCloudStatus("offline"); showToast("⚠️ İnternet kesildi. Satışa devam edebilirsiniz; değişiklikler bu cihazda saklanır, bağlantı gelince otomatik eşitlenir.", "warning"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  /** PIN sunucuda doğrulanır. */
  const handleVerifyPin = async (attemptPin) => {
    const code = String(attemptPin !== undefined ? attemptPin : pinInput).trim();
    if (!code || pinBusy) return { ok: false, error: "PIN girin." };
    setPinBusy(true);
    try {
      const r = await verifyManagerPin(ACTIVE_TENANT_ID, code);
      if (r.ok) {
        setIsAdminUnlocked(true);
        setPinModalOpen(false); setPinInput(""); setPinError(false);
        if (pendingProtectedTab) { setActiveTab(pendingProtectedTab); setPendingProtectedTab(null); }
        showToast("🔓 Yönetici kilidi açıldı.");
        return r;
      }
      setPinError(true); setPinInput("");
      return r;
    } finally {
      setPinBusy(false);
    }
  };

  /** PIN hiç yokken (yeni kurulum / veri sıfırlama) ilk PIN'i kaydedip kilidi açar. */
  const handleSetupFirstPin = async (pin) => {
    const r = await changeManagerPin(ACTIVE_TENANT_ID, "", pin);
    if (!r.ok) return r;
    showToast("Yönetici PIN'i kaydedildi.");
    return handleVerifyPin(pin);
  };

  useEffect(() => {
    applyCelebrationSettings(ACTIVE_TENANT_ID, celebration, () => isBusyNow(salesRef.current));
  }, [celebration]);
  useEffect(() => { salesRef.current = sales; }, [sales]);

  /** Onay penceresi yerine 5 sn "Geri al": snapshot geri yüklenir, yoksa kalıcı olur (onCommit). */
  const offerUndo = (text, restore, onCommit) => {
    PPMotion.undo(text, restore, { onCommit });
  };

  const handleChangePin = async (current, next) => {
    const r = await changeManagerPin(ACTIVE_TENANT_ID, current, next);
    showToast(r.ok ? "Yönetici PIN'i güncellendi." : `PIN değiştirilemedi: ${r.error}`);
    return r;
  };

  const handleUnpairDevice = () => {
    unpairDevice(ACTIVE_TENANT_ID);
    window.location.reload();
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false); clearManagerSession(ACTIVE_TENANT_ID);
    if (PROTECTED_TABS.includes(activeTab)) setActiveTab("pos");
    showToast("🔒 Yönetici oturumu kilitlendi.");
  };

  // Computed Metrics & Analytics
  const activeTable = useMemo(() => tables.find((t) => t.id === activeTableId) || null, [tables, activeTableId]);
  const criticalIngredients = useMemo(() => ingredients.filter((i) => i.stock <= i.minLimit), [ingredients]);
  const filteredSales = useMemo(() => sales.filter((s) => isWithinPeriod(s.timestamp, globalPeriod, customStartDate, customEndDate)), [sales, globalPeriod, customStartDate, customEndDate]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => isWithinPeriod(e.timestamp, globalPeriod, customStartDate, customEndDate)), [expenses, globalPeriod, customStartDate, customEndDate]);
  const totalEsnafReceivable = useMemo(() => esnafList.reduce((sum, e) => sum + (e.balance || 0), 0), [esnafList]);

  const kpiMetrics = useMemo(() => {
    const byMethod = { Nakit: 0, "Kredi Kartı": 0, "Yemek Kartı": 0, "Esnaf Cariye Yazıldı": 0, "İkram / İptal": 0 };
    let grossRevenue = 0, cariWrittenTotal = 0;
    filteredSales.forEach((s) => {
      byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total;
      if (s.paymentMethod === "Esnaf Cariye Yazıldı") cariWrittenTotal += s.total;
      else if (s.paymentMethod !== "İkram / İptal") grossRevenue += s.total;
    });
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const orderCount = filteredSales.length;
    return { grossRevenue, cariWrittenTotal, totalExpenses, netProfit: grossRevenue - totalExpenses, orderCount, avgTicket: orderCount > 0 ? Math.round((grossRevenue + cariWrittenTotal) / orderCount) : 0, byMethod };
  }, [filteredSales, filteredExpenses]);

  const topProducts = useMemo(() => productStats(filteredSales, products, ingredients), [filteredSales, products, ingredients]);

  const staffPerformance = useMemo(() => {
    const stats = Object.fromEntries(staffList.map((st) => [st.id, { ...st, cash: 0, card: 0, mealCard: 0, cariWritten: 0, comp: 0, total: 0, orderCount: 0, itemCount: 0 }]));
    filteredSales.forEach((s) => {
      const st = stats[s.staffId];
      if (!st) return;
      st.orderCount += 1;
      st.itemCount += itemCount(s);
      if (s.paymentMethod === "Nakit") { st.cash += s.total; st.total += s.total; }
      else if (s.paymentMethod === "Kredi Kartı") { st.card += s.total; st.total += s.total; }
      else if (s.paymentMethod === "Yemek Kartı") { st.mealCard += s.total; st.total += s.total; }
      else if (s.paymentMethod === "Esnaf Cariye Yazıldı") st.cariWritten += s.total;
      else st.comp += s.total;
    });
    return Object.values(stats).sort((a, b) => b.total + b.cariWritten - (a.total + a.cariWritten));
  }, [filteredSales, staffList]);

  const trendChartData = useMemo(() => {
    if (globalPeriod === "daily") {
      const hours = {};
      for (let h = 8; h <= 23; h++) hours[h] = { name: `${String(h).padStart(2, "0")}:00`, Ciro: 0, Adisyon: 0 };
      filteredSales.forEach((s) => {
        if (s.paymentMethod !== "İkram / İptal") {
          const h = new Date(s.timestamp).getHours();
          if (hours[h]) { hours[h].Ciro += s.total; hours[h].Adisyon += 1; }
        }
      });
      return Object.values(hours);
    }
    const daysCount = globalPeriod === "weekly" ? 7 : 15;
    const now = new Date();
    return Array.from({ length: daysCount }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (daysCount - 1 - idx));
      const sameDay = (iso) => { const dt = new Date(iso); return dt.getDate() === d.getDate() && dt.getMonth() === d.getMonth(); };
      return {
        name: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
        Ciro: filteredSales.filter((s) => sameDay(s.timestamp) && s.paymentMethod !== "İkram / İptal").reduce((sum, x) => sum + x.total, 0),
        Gider: filteredExpenses.filter((e) => sameDay(e.timestamp)).reduce((sum, x) => sum + x.amount, 0)
      };
    });
  }, [filteredSales, filteredExpenses, globalPeriod]);

  // POS Table & Order Operations
  /** selection verilmezse ve ürün çeşitliyse (ya da "satışta içerik sor" açıksa) içerik penceresi açılır. */
  const addProductToTable = (product, selection, extra) => {
    if (!activeTable || !product) return;
    if (needsContentSheet(product) && selection === undefined) {
      setOptionPickerProduct(product);
      return;
    }
    const line = buildOrderLine({ ...product, options: sanitizeOptionGroups(product.options) }, selection || {}, undefined, extra);
    setTables((prev) => prev.map((t) => {
      if (t.id !== activeTable.id) return t;
      return { ...t, status: "occupied", openedAt: t.openedAt || new Date().toISOString(), items: mergeIntoItems(t.items, line) };
    }));
  };

  /** Barkod okuyucu klavye gibi yazıp Enter basar: tam eşleşme varsa ürün eklenir; tek sonuç kaldıysa o eklenir. */
  const handleSearchEnter = () => {
    const hit = findByBarcode(products, posSearch);
    if (hit && activeTable) { addProductToTable(hit); setPosSearch(""); return true; }
    return false;
  };

  /** İçerik penceresinden gelen: {selection, without, note, qty}. */
  const confirmOptionPicker = ({ selection, without, note, qty }) => {
    const prd = optionPickerProduct;
    setOptionPickerProduct(null);
    if (prd) addProductToTable(prd, selection, { without, note, qty });
  };

  /** Açık adisyondaki satırın içeriğini değiştirir (adet satırdan azsa satır bölünür). */
  const updateLineContent = (itemId, content) => {
    if (!activeTable) return;
    const item = activeTable.items.find((i) => i.id === itemId);
    const product = item && products.find((x) => x.id === item.productId);
    if (!product) return;
    const tid = activeTable.id;
    setTables((prev) => prev.map((t) => (t.id === tid ? { ...t, items: editLine(t.items, itemId, product, content).items } : t)));
  };

  const updateOrderItemQty = (itemId, delta) => {
    if (!activeTable) return;
    const removing = activeTable.items.find((i) => i.id === itemId && i.qty + delta <= 0);
    if (removing) {
      const prevTable = activeTable;
      const tid = activeTable.id;
      offerUndo(`${removing.name} adisyondan çıkarıldı`, () => setTables((prev) => prev.map((t) => (t.id === tid ? prevTable : t))));
    }
    setTables((prev) => prev.map((t) => {
      if (t.id !== activeTable.id) return t;
      const items = t.items.map((i) => (i.id === itemId ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0);
      const occ = items.length > 0;
      return { ...t, status: occ ? "occupied" : "empty", openedAt: occ ? t.openedAt : null, discount: occ ? t.discount : 0, paidAmount: occ ? t.paidAmount : 0, guests: occ ? t.guests : 0, items };
    }));
  };

  // Göreli değişim (+1/−1): art arda hızlı dokunuşlar kaybolmasın diye önceki durumdan hesaplanır.
  const changeTableGuests = (delta) => activeTable && setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, guests: normalizeGuests((t.guests || 0) + delta) } : t)));
  const setTableStaff = (staffId) => activeTable && setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, staffId } : t)));
  const setTableDiscount = (val) => activeTable && setTables((prev) => prev.map((t) => {
    if (t.id !== activeTable.id) return t;
    const sub = t.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return { ...t, discount: Math.min(sub, Math.max(0, Number(val) || 0)) };
  }));
  const saveItemNote = (itemId, note) => {
    setTables((prev) => prev.map((t) => (t.id !== activeTable?.id ? t : { ...t, items: t.items.map((i) => (i.id === itemId ? { ...i, note } : i)) })));
    setNoteModalItem(null);
  };

  const deductRecipeIngredients = (orderItems) => {
    const deductions = {};
    orderItems.forEach((oi) => {
      const consumption = lineConsumption(products.find((p) => p.id === oi.productId), oi);
      Object.keys(consumption).forEach((id) => { deductions[id] = (deductions[id] || 0) + consumption[id]; });
    });
    setIngredients((prev) => prev.map((ing) => (deductions[ing.id] ? { ...ing, stock: Math.max(0, +(ing.stock - deductions[ing.id]).toFixed(1)) } : ing)));
  };

  const completeTableOrder = (paymentMethod) => {
    if (!activeTable?.items.length) return;
    const { gross, discount, remaining: remainingTotal } = closingTotals(activeTable);
    const newSale = { id: `sl-${Date.now()}`, timestamp: new Date().toISOString(), guests: normalizeGuests(activeTable.guests), tableName: activeTable.name, staffId: activeTable.staffId || staffList[0]?.id, paymentMethod, subtotal: gross, discount, total: remainingTotal, items: activeTable.items };
    const snap = { tables, sales, ingredients };
    const closedName = activeTable.name;
    const staffName = staffList.find((st) => st.id === activeTable.staffId)?.name || "Personel";
    setSales((prev) => [newSale, ...prev]);
    deductRecipeIngredients(activeTable.items);
    if (printDevice.receiptAfterPay && paymentMethod !== "İkram / İptal") printSaleReceipt(newSale);
    setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, status: "empty", openedAt: null, discount: 0, paidAmount: 0, guests: 0, items: [] } : t)));
    setActiveTableId(null);
    // 5 sn içinde geri alınabilir; kutlama yalnızca kalıcılaşınca (geri alınan satış kutlanmaz).
    offerUndo(
      `${closedName} kapatıldı · ${formatTL(remainingTotal)} · ${paymentMethod} · ${staffName}`,
      () => { setTables(snap.tables); setSales(snap.sales); setIngredients(snap.ingredients); },
      () => celebrateSale({ sales: [newSale, ...snap.sales], sale: newSale, goal: celebration.goal })
    );
  };

  // Tutar parametreli: eski pencere state'ten, yeni "Böl" akışı doğrudan hesaplanan paydan çağırır.
  const handlePartialPayment = (paymentMethod, amountOverride) => {
    const amount = Number(amountOverride !== undefined ? amountOverride : partialPayAmount);
    if (!activeTable || !amount || amount <= 0) return;
    const subtotal = activeTable.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    if (amount >= subtotal - (activeTable.discount || 0) - (activeTable.paidAmount || 0)) {
      setPartialPayModalOpen(false); setPartialPayAmount("");
      return completeTableOrder(paymentMethod);
    }
    setSales((prev) => [{ id: `sl-part-${Date.now()}`, timestamp: new Date().toISOString(), tableName: `${activeTable.name} (Kısmi Ödeme)`, staffId: activeTable.staffId || staffList[0]?.id, paymentMethod, subtotal: amount, discount: 0, total: amount, items: [paymentLine("Kısmi Hesap Tahsilatı", amount)] }, ...prev]);
    setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, paidAmount: (t.paidAmount || 0) + amount } : t)));
    showToast(`${activeTable.name} için ${formatTL(amount)} (${paymentMethod}) kısmi ödeme alındı.`);
    setPartialPayAmount(""); setPartialPayModalOpen(false);
  };

  // ---- Mutfak/bar gönderimi ve yazdırma ------------------------------------
  const printTickets = (models) => {
    const list = (Array.isArray(models) ? models : [models]).filter(Boolean);
    if (list.length === 0) return false;
    const ok = printHtml(renderTickets(list, { width: printDevice.width, money: formatTL }));
    if (!ok) showToast("Bu tarayıcıda yazdırma başlatılamadı.", "warning");
    return ok;
  };
  const staffNameOf = (id) => staffList.find((s) => s.id === id)?.name || "";
  const receiptInfo = (staffId) => ({ businessName: brandSettings.businessName, footer: brandSettings.printing?.footer || "", staffName: staffNameOf(staffId) });
  const kitchenTickets = (table, entries, flags = {}) => buildKitchenTickets(entries, {
    tableName: table.name, staffName: staffNameOf(table.staffId), stations: brandSettings.printing?.stations,
    categoryOf: (pid) => products.find((x) => x.id === pid)?.category || "", ...flags
  });

  /** "Gönder": yalnızca henüz gitmemiş adetler istasyonlara gider; bu cihaz otomatik basıyorsa fiş çıkar. */
  const sendOrder = () => {
    if (!activeTable) return;
    const count = unsentCount(activeTable.items);
    if (!count) return;
    const tickets = kitchenTickets(activeTable, pendingEntries(activeTable.items));
    const tid = activeTable.id;
    setTables((prev) => prev.map((t) => (t.id === tid ? { ...t, items: markSent(t.items) } : t)));
    if (printDevice.autoKitchen) printTickets(tickets);
    const where = tickets.map((t) => t.station.toLocaleLowerCase("tr-TR")).join(" + ");
    showToast(where ? `${count} yeni ürün gönderildi (${where}).` : `${count} ürün gönderildi olarak işaretlendi.`);
  };
  const reprintKitchen = () => activeTable && printTickets(kitchenTickets(activeTable, activeTable.items.map((item) => ({ item, qty: item.qty })), { reprint: true }));
  const printTableReceipt = () => activeTable && printTickets(buildTableReceipt(activeTable, receiptInfo(activeTable.staffId)));
  const printSaleReceipt = (sale) => sale && printTickets(buildSaleReceipt(sale, receiptInfo(sale.staffId)));
  const printTestTicket = () => printTickets([
    { kind: "kitchen", station: "Bar", tableName: "Deneme masası", staffName: "", time: new Date().toISOString(), lines: [{ qty: 2, name: "Deneme ürünü", details: "Büyük · Süt yok", note: "Az şekerli" }] },
    buildTableReceipt({ name: "Deneme masası", items: [{ name: "Şğüçöı İĞÜŞÇÖ deneme", price: 100, qty: 1 }] }, receiptInfo(""))
  ]);

  // Esnaf & Cari Operations
  const handleConfirmEsnafCharge = () => {
    const esnaf = esnafList.find((e) => e.id === selectedEsnafForCharge);
    if (!activeTable || !esnaf) return;
    const totals = closingTotals(activeTable);
    const currentRemaining = totals.remaining;
    let chargeAmount = currentRemaining, appliedDiscount = activeTable.discount || 0;
    if (esnafChargeMode === "partial") {
      chargeAmount = Math.min(currentRemaining, Math.max(1, Number(partialPayAmount) || 0));
    } else if (applyEsnafDiscount && esnaf.discountRate > 0 && !activeTable.discount) {
      const disc = Math.round((currentRemaining * esnaf.discountRate) / 100);
      appliedDiscount += disc; chargeAmount = Math.max(0, currentRemaining - disc);
    }
    const txRecord = {
      id: `etr-${Date.now()}`, type: "charge", timestamp: new Date().toISOString(), staffId: activeTable.staffId || staffList[0]?.id, amount: chargeAmount,
      items: esnafChargeMode === "partial" ? [{ name: `${activeTable.name} Kısmi Adisyon Aktarımı`, qty: 1, price: chargeAmount }] : activeTable.items.map((i) => ({ name: lineDetails(i) ? `${i.name} (${lineDetails(i)})` : i.name, qty: i.qty, price: i.price, note: i.note })),
      note: esnafOrderNote.trim() || `${activeTable.name} adisyonu`
    };
    setEsnafList((prev) => prev.map((e) => (e.id === esnaf.id ? { ...e, balance: (e.balance || 0) + chargeAmount, transactions: [txRecord, ...(e.transactions || [])] } : e)));
    setSales((prev) => [{
      id: `sl-cari-${Date.now()}`, timestamp: new Date().toISOString(), tableName: `${activeTable.name} ➔ ${esnaf.name}`, staffId: activeTable.staffId || staffList[0]?.id, paymentMethod: "Esnaf Cariye Yazıldı",
      subtotal: esnafChargeMode === "partial" ? chargeAmount : totals.gross, discount: esnafChargeMode === "partial" ? 0 : Math.min(appliedDiscount, totals.gross), total: chargeAmount,
      items: esnafChargeMode === "partial" ? [paymentLine(`Cari Aktarım (${esnaf.name})`, chargeAmount)] : activeTable.items
    }, ...prev]);

    if (esnafChargeMode === "partial" && chargeAmount < currentRemaining) {
      setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, paidAmount: (t.paidAmount || 0) + chargeAmount } : t)));
      showToast(`${esnaf.name} carisine ${formatTL(chargeAmount)} kısmi hesap yazıldı!`);
    } else {
      deductRecipeIngredients(activeTable.items);
      setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, status: "empty", openedAt: null, discount: 0, paidAmount: 0, guests: 0, items: [] } : t)));
      showToast(`${esnaf.name} hesabına ${formatTL(chargeAmount)} yazıldı ve stoktan düşüldü!`);
      setActiveTableId(null);
    }
    setEsnafChargeModalOpen(false); setPartialPayModalOpen(false); setPartialPayAmount(""); setEsnafOrderNote("");
  };

  const handleQuickCreateEsnaf = (e) => {
    e?.preventDefault?.();
    if (!quickNewEsnafName.trim()) return;
    const newEsnaf = { id: `esn-${Date.now()}`, name: quickNewEsnafName.trim(), shopType: "Çevre Esnaf", phone: quickNewEsnafPhone.trim() || "-", discountRate: Math.max(0, Number(quickNewEsnafDiscount) || 0), balance: 0, note: "", transactions: [] };
    setEsnafList((prev) => [newEsnaf, ...prev]);
    setSelectedEsnafForCharge(newEsnaf.id); setQuickNewEsnafName(""); setQuickNewEsnafPhone("");
    showToast(`${newEsnaf.name} cari listesine eklendi!`);
  };

  const handleCollectEsnafPayment = (e) => {
    e.preventDefault();
    const amount = Number(esnafCollectAmount);
    if (!esnafCollectModal || !amount || amount <= 0) return;
    const paymentTx = { id: `etr-pay-${Date.now()}`, type: "payment", paymentMethod: esnafCollectMethod, timestamp: new Date().toISOString(), staffId: esnafCollectStaffId || staffList[0]?.id, amount, note: esnafCollectNote.trim() || "Cari Hesap Tahsilatı" };
    setEsnafList((prev) => prev.map((esn) => {
      if (esn.id !== esnafCollectModal.id) return esn;
      const updated = { ...esn, balance: Math.max(0, (esn.balance || 0) - amount), transactions: [paymentTx, ...(esn.transactions || [])] };
      if (selectedEsnafDetail?.id === esn.id) setSelectedEsnafDetail(updated);
      return updated;
    }));
    setSales((prev) => [{ id: `sl-col-${Date.now()}`, timestamp: new Date().toISOString(), tableName: `Cari Tahsilat: ${esnafCollectModal.name}`, staffId: esnafCollectStaffId || staffList[0]?.id, paymentMethod: esnafCollectMethod, subtotal: amount, discount: 0, total: amount, items: [paymentLine(`Esnaf Cari Tahsilatı (${esnafCollectModal.name})`, amount)] }, ...prev]);
    showToast(`${esnafCollectModal.name} hesabından ${formatTL(amount)} (${esnafCollectMethod}) tahsilat alındı ve kasaya işlendi!`);
    setEsnafCollectModal(null); setEsnafCollectAmount(""); setEsnafCollectNote("");
  };

  const copyEsnafWhatsAppSummary = (esnaf) => {
    const recentCharges = (esnaf.transactions || []).filter((t) => t.type === "charge").slice(0, 5);
    const lines = [
      `☕ *${brandSettings.businessName} - ESNAF CARİ HESAP ÖZETİ*`, `Sayın *${esnaf.name}*,`, `Güncel Açık Hesap Bakiyeniz: *${formatTL(esnaf.balance)}*`, ``,
      `📌 *Son Sipariş Hareketleriniz:*`, ...recentCharges.map((t) => `• ${formatDateShort(t.timestamp)}: ${(t.items || []).map((i) => `${i.qty}x ${i.name}`).join(", ")} (${formatTL(t.amount)})`), ``, `Hayırlı işler, bol kazançlar dileriz! 🙏`
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
    showToast(`${esnaf.name} için WhatsApp hesap özeti panoya kopyalandı!`);
  };

  const startFastEsnafOrder = (preselectEsnafId = null) => {
    const fastTable = tables.find((t) => t.id === "tbl-esnaf-fast") || tables[tables.length - 1];
    if (fastTable) {
      setActiveTab("pos"); setActiveTableId(fastTable.id);
      if (preselectEsnafId) setSelectedEsnafForCharge(preselectEsnafId);
      showToast("⚡ Hızlı Esnaf / Tezgah adisyonu açıldı! Ürünleri seçip tek tıkla Cariye yazabilirsiniz.");
    }
  };

  const handleTransferTable = (targetTableId) => {
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!activeTable || !targetTable || activeTable.id === targetTableId) return;
    setTables((prev) => prev.map((t) => {
      if (t.id === targetTableId) {
        // Aynı ürün + aynı çeşit + aynı not birleşir; nesne yerinde değiştirilmez (state mutasyonu yok).
        const mergedItems = t.items.map((m) => ({ ...m }));
        activeTable.items.forEach((src) => {
          const ex = mergedItems.find((m) => m.productId === src.productId && (m.note || "") === (src.note || "") && (m.optionKey || "") === (src.optionKey || "") && m.price === src.price);
          if (ex) { ex.qty += src.qty; if (src.sentQty) ex.sentQty = (ex.sentQty || 0) + src.sentQty; } else mergedItems.push({ ...src });
        });
        return { ...t, status: "occupied", openedAt: t.openedAt || activeTable.openedAt || new Date().toISOString(), discount: (t.discount || 0) + (activeTable.discount || 0), paidAmount: (t.paidAmount || 0) + (activeTable.paidAmount || 0), guests: normalizeGuests((t.guests || 0) + (activeTable.guests || 0)), items: mergedItems };
      }
      return t.id === activeTable.id ? { ...t, status: "empty", openedAt: null, discount: 0, paidAmount: 0, guests: 0, items: [] } : t;
    }));
    showToast(`${activeTable.name} adisyonu ${targetTable.name} masasına aktarıldı!`);
    setTransferModalOpen(false); setActiveTableId(targetTableId);
  };

  // Stock, Expense & Settings CRUD Operations
  const handleStockAdjustment = (e) => {
    e.preventDefault();
    if (!stockModalIng) return;
    const res = applyStockAction({ type: stockAdjustType, ingredient: stockModalIng, amount: stockAdjustAmount, reason: stockReason });
    if (!res) return showToast("Geçerli bir miktar girin.");
    const val = Number(stockAdjustAmount);
    setIngredients((prev) => prev.map((ing) => (ing.id !== stockModalIng.id ? ing : { ...ing, stock: +res.newStock.toFixed(2) })));
    if (res.entry) setStockLog((prev) => appendLog(prev, res.entry));
    if (stockAdjustType === "add" && recordAsExpense) {
      const costAmount = Number(stockExpenseCost) || Math.round(val * stockModalIng.unitCost);
      if (costAmount > 0) setExpenses((prev) => [{ id: `exp-stk-${Date.now()}`, title: `Stok Alımı: ${stockModalIng.name} (+${val} ${stockModalIng.unit})`, category: "Toptancı / Malzeme", amount: costAmount, paymentMethod: "Kredi Kartı", timestamp: new Date().toISOString(), note: "Stok modülünden otomatik işlenen alım" }, ...prev]);
    }
    showToast(res.entry ? `${stockModalIng.name}: ${res.entry.kind === "waste" ? "zayi" : "sayım farkı"} kaydedildi.` : `${stockModalIng.name} stok miktarı güncellendi!`);
    setStockModalIng(null); setStockAdjustAmount(""); setStockExpenseCost("");
  };

  /** Yönetim işlemi: kilit kapalıysa PIN ister. */
  const requireAdmin = () => {
    if (isAdminUnlocked) return true;
    setPendingProtectedTab(null); setPinInput(""); setPinError(false); setPinModalOpen(true);
    return false;
  };

  /** Malzeme ekler/günceller; yeni kimliği döndürür. Düzenlemede stok miktarı korunur (stok hareketleri kayıtlı kalsın). */
  const handleSaveIngredient = (value, id) => {
    if (id) {
      setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, ...value, stock: i.stock } : i)));
      showToast(`${value.name} güncellendi.`);
      return id;
    }
    const newId = `ing-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    setIngredients((prev) => [...prev, { id: newId, ...value }]);
    showToast(`${value.name} malzemelere eklendi.`);
    return newId;
  };

  const handleDeleteIngredient = (id) => {
    const target = ingredients.find((i) => i.id === id);
    if (!target) return;
    const snap = { ingredients, products };
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setProducts((prev) => removeIngredientFromProducts(prev, id));
    offerUndo(`${target.name} silindi`, () => { setIngredients(snap.ingredients); setProducts(snap.products); });
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const amt = Number(newExpAmount);
    if (!newExpTitle.trim() || !amt || amt <= 0) return;
    if (editingExpId) {
      setExpenses((prev) => prev.map((ex) => (ex.id === editingExpId ? { ...ex, title: newExpTitle.trim(), category: newExpCategory, amount: amt, paymentMethod: newExpMethod, note: newExpNote.trim() } : ex)));
      showToast("Gider kaydı güncellendi!"); setEditingExpId(null);
    } else {
      setExpenses((prev) => [{ id: `exp-${Date.now()}`, title: newExpTitle.trim(), category: newExpCategory, amount: amt, paymentMethod: newExpMethod, timestamp: new Date().toISOString(), note: newExpNote.trim() }, ...prev]);
      showToast(`Gider kaydı (${formatTL(amt)}) finans tablosuna eklendi.`);
    }
    setNewExpTitle(""); setNewExpAmount(""); setNewExpNote("");
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const price = Number(newPrdPrice);
    if (!newPrdName.trim() || !price || price <= 0) return;
    const barcode = cleanBarcode(newPrdBarcode);
    if (barcode && barcodeTaken(products, barcode, editingPrdId)) return showToast("Bu barkod başka bir üründe kayıtlı.");
    const itemData = { name: newPrdName.trim(), category: newPrdCategory, price, image: newPrdEmoji || "☕", isQuickFav: newPrdQuickFav, askContent: newPrdAskContent, recipe: cleanRecipe(newPrdRecipe), options: sanitizeOptionGroups(newPrdOptions), barcode };
    if (editingPrdId) {
      setProducts((prev) => prev.map((p) => (p.id === editingPrdId ? { ...p, ...itemData } : p)));
      showToast(`${itemData.name} ürünü güncellendi!`); setEditingPrdId(null);
    } else {
      setProducts((prev) => [...prev, { id: `prd-${Date.now()}`, ...itemData }]);
      showToast(`${itemData.name} menüye ve reçete sistemine eklendi!`);
    }
    setNewPrdName(""); setNewPrdPrice(""); setNewPrdEmoji("☕"); setNewPrdQuickFav(false); setNewPrdAskContent(false); setNewPrdRecipe([]); setNewPrdOptions([]); setNewPrdBarcode("");
  };

  const startEditProduct = (prd) => {
    setEditingPrdId(prd.id); setNewPrdName(prd.name); setNewPrdCategory(prd.category);
    setNewPrdPrice(String(prd.price)); setNewPrdEmoji(prd.image || "☕"); setNewPrdQuickFav(Boolean(prd.isQuickFav)); setNewPrdAskContent(Boolean(prd.askContent)); setNewPrdRecipe(prd.recipe || []); setNewPrdOptions(sanitizeOptionGroups(prd.options)); setNewPrdBarcode(prd.barcode || "");
  };

  const handleDeleteProduct = (prdId) => {
    const target = products.find((p) => p.id === prdId);
    setProducts((prev) => prev.filter((p) => p.id !== prdId));
    if (editingPrdId === prdId) setEditingPrdId(null);
    showToast(`${target?.name || "Ürün"} menüden silindi.`);
  };

  const handleSaveTable = (e) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    if (editingTableId) {
      setTables((prev) => prev.map((t) => (t.id === editingTableId ? { ...t, name: newTableName.trim(), zone: newTableZone } : t)));
      showToast("Masa bilgileri güncellendi!"); setEditingTableId(null);
    } else {
      setTables((prev) => [...prev, { id: `tbl-${Date.now()}`, name: newTableName.trim(), zone: newTableZone, status: "empty", openedAt: null, staffId: staffList[0]?.id, discount: 0, paidAmount: 0, items: [] }]);
      showToast(`${newTableName.trim()} masası plana eklendi!`);
    }
    setNewTableName("");
  };

  const handleDeleteTable = (tbl) => {
    if (tbl.status === "occupied" || tbl.items.length > 0) return showToast("Dolu olan ve açık adisyonu bulunan masa silinemez! Önce hesabı kapatın veya taşıyın.");
    setTables((prev) => prev.filter((t) => t.id !== tbl.id));
    if (activeTableId === tbl.id) setActiveTableId(null);
    showToast(`${tbl.name} masası silindi.`);
  };

  const handleSaveZone = (e) => {
    e.preventDefault();
    const trimmed = newZoneName.trim();
    if (!trimmed) return;
    if (editingZoneOldName) {
      setZones((prev) => prev.map((z) => (z === editingZoneOldName ? trimmed : z)));
      setTables((prev) => prev.map((t) => (t.zone === editingZoneOldName ? { ...t, zone: trimmed } : t)));
      setEditingZoneOldName(null); showToast("Bölge adı ve bağlı masalar güncellendi!");
    } else if (!zones.includes(trimmed)) {
      setZones((prev) => [...prev, trimmed]); showToast(`${trimmed} bölgesi eklendi!`);
    }
    setNewZoneName("");
  };

  const handleDeleteZone = (zName) => {
    if (tables.some((t) => t.zone === zName)) return showToast(`"${zName}" bölgesinde kayıtlı masalar var. Önce masaları başka bölgeye taşıyın veya silin.`);
    setZones((prev) => prev.filter((z) => z !== zName));
    showToast(`${zName} bölgesi silindi.`);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (editingCategoryOldName) {
      setCategories((prev) => prev.map((c) => (c === editingCategoryOldName ? trimmed : c)));
      setProducts((prev) => prev.map((p) => (p.category === editingCategoryOldName ? { ...p, category: trimmed } : p)));
      setEditingCategoryOldName(null); showToast("Kategori adı ve bağlı ürünler güncellendi!");
    } else if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]); showToast(`${trimmed} kategorisi eklendi!`);
    }
    setNewCategoryName("");
  };

  const handleDeleteCategory = (catName) => {
    setCategories((prev) => prev.filter((c) => c !== catName));
    showToast(`${catName} kategorisi silindi.`);
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const stData = { name: newStaffName.trim(), role: newStaffRole.trim() || "Barista", color: newStaffColor, avatar: newStaffName.trim()[0].toUpperCase() };
    if (editingStaffId) {
      setStaffList((prev) => prev.map((st) => (st.id === editingStaffId ? { ...st, ...stData } : st)));
      showToast("Çalışan bilgileri güncellendi!"); setEditingStaffId(null);
    } else {
      setStaffList((prev) => [...prev, { id: `st-${Date.now()}`, ...stData }]);
      showToast(`${stData.name} ekibe eklendi!`);
    }
    setNewStaffName(""); setNewStaffRole("Barista");
  };

  const handleDeleteStaff = (stId) => {
    if (staffList.length <= 1) return showToast("Sistemde en az 1 aktif çalışan bulunmalıdır!");
    setStaffList((prev) => prev.filter((s) => s.id !== stId));
    if (editingStaffId === stId) setEditingStaffId(null);
    showToast("Çalışan kaydı silindi.");
  };

  const handleSaveEsnafEdit = (e) => {
    e.preventDefault();
    if (!editEsnafName.trim()) return;
    const esnData = { name: editEsnafName.trim(), shopType: editEsnafShopType.trim() || "Çevre Esnaf", phone: editEsnafPhone.trim() || "-", discountRate: Math.max(0, Number(editEsnafDiscount) || 0), note: editEsnafNote.trim() };
    if (editingEsnafId) {
      setEsnafList((prev) => prev.map((esn) => (esn.id === editingEsnafId ? { ...esn, ...esnData } : esn)));
      showToast("Esnaf cari bilgileri güncellendi!"); setEditingEsnafId(null);
    } else {
      setEsnafList((prev) => [{ id: `esn-${Date.now()}`, balance: 0, transactions: [], ...esnData }, ...prev]);
      showToast(`${esnData.name} cari listesine eklendi!`);
    }
    setEditEsnafName(""); setEditEsnafShopType(""); setEditEsnafPhone(""); setEditEsnafDiscount("10"); setEditEsnafNote("");
  };

  const handleDeleteEsnaf = (esnId) => {
    setEsnafList((prev) => prev.filter((e) => e.id !== esnId));
    if (selectedEsnafDetail?.id === esnId) setSelectedEsnafDetail(null);
    showToast("Esnaf cari kartı silindi.");
  };

  const handleDeleteSaleReceipt = (saleId) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    setInspectedSale(null);
    showToast("Adisyon kaydı satış geçmişinden silindi.");
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 450 * 1024) return showToast("Lütfen 450 KB altında bir logo görseli seçin (Bulut hızı için).");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBrandSettings((prev) => ({ ...prev, logoType: "image", logoImageUrl: ev.target.result }));
      showToast("🖼️ İşletme logosu yüklendi ve tüm cihazlarla eşitlendi!");
    };
    reader.readAsDataURL(file);
  };

  const handleManualForceSync = async () => {
    const eng = engineRef.current;
    if (eng) { await eng.pull(); await eng.flushNow(); }
    const st = eng ? eng.state() : null;
    showToast(st && st.dirty ? "⏳ Bağlantı yok: değişiklikler bu cihazda saklandı, bağlantı gelince gönderilecek." : "☁️ Tüm veriler bağlı cihazlarla eşitlendi!");
  };

  const exportFullBackupFile = () => {
    const backupPayload = { version: "1.0", exportedAt: new Date().toISOString(), brandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, esnafList, stockLog };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: `ProPos_Tam_Sistem_Yedegi_${new Date().toISOString().slice(0, 10)}.json` }).click();
    URL.revokeObjectURL(url);
    showToast("🛡️ ProPos tam sistem güvenlik yedeği cihazınıza indirildi!");
  };

  const handleImportBackupFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const p = JSON.parse(ev.target.result);
        if (!p.tables || !p.products || !p.sales) return showToast("Geçersiz yedek dosyası formatı.");
        if (p.brandSettings) setBrandSettings(p.brandSettings);
        if (p.zones) setZones(p.zones);
        if (p.categories) setCategories(p.categories);
        if (p.staffList) setStaffList(p.staffList);
        if (p.ingredients) setIngredients(p.ingredients);
        if (p.products) setProducts(p.products);
        if (p.tables) setTables(p.tables);
        if (p.sales) setSales(p.sales);
        if (p.expenses) setExpenses(p.expenses);
        if (p.esnafList) setEsnafList(p.esnafList);
        if (Array.isArray(p.stockLog)) setStockLog(p.stockLog);
        showToast("✅ Yedek dosyası başarıyla geri yüklendi ve tüm cihazlarla eşitlendi!");
      } catch (err) {
        showToast("Yedek dosyası okunamadı.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    setBrandSettings(INITIAL_BRAND_SETTINGS); setZones(INITIAL_ZONES); setCategories(INITIAL_CATEGORIES);
    setStaffList(INITIAL_STAFF); setIngredients(INITIAL_INGREDIENTS); setProducts(INITIAL_PRODUCTS);
    setTables(INITIAL_TABLES); setSales(generateInitialSales()); setExpenses(generateInitialExpenses());
    setEsnafList(INITIAL_ESNAF); setResetConfirmOpen(false);
    showToast("Sistem verileri tüm cihazlarda (PC & Telefon) başlangıç demo durumuna sıfırlandı.");
  };

  const exportExcelByCategory = (reportType = "overview") =>
    runExcelExport({ reportType, brandSettings, globalPeriod, customStartDate, customEndDate, filteredSales, filteredExpenses, kpiMetrics, topProducts, staffList, staffPerformance, esnafList, totalEsnafReceivable, showToast });

  const activeOccupiedCount = tables.filter((t) => t.status === "occupied").length;
  const openTablesTotalAmount = tables.reduce((acc, t) => acc + Math.max(0, t.items.reduce((s, i) => s + i.price * i.qty, 0) - (t.discount || 0) - (t.paidAmount || 0)), 0);

  const value = {
    ACTIVE_TENANT_ID, activeCurrencyObj, clientDeviceId: clientDeviceIdRef.current,
    activeTab, setActiveTab, handleTabNavigation, globalPeriod, setGlobalPeriod, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate,
    cloudStatus, lastSyncedAt, syncModalOpen, setSyncModalOpen,
    syncPending, storageInfo, stockLog, stockReason, setStockReason, newPrdBarcode, setNewPrdBarcode, changeTableGuests, handleSearchEnter,
    celebration, updateCelebration, goalProgressToday: goalProgress(sales, celebration.goal), celebrateZReport,
    isAdminUnlocked, pinBusy, handleChangePin, handleSetupFirstPin, handleUnpairDevice,
    optionPickerProduct, setOptionPickerProduct, confirmOptionPicker, newPrdOptions, setNewPrdOptions, setIsAdminUnlocked, pinModalOpen, setPinModalOpen, pinInput, setPinInput, pinError, setPinError, pendingProtectedTab, setPendingProtectedTab, newPinValue, setNewPinValue, handleVerifyPin, handleLockAdmin,
    brandSettings, setBrandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, setExpenses, esnafList, toast, showToast,
    selectedZone, setSelectedZone, activeTableId, setActiveTableId, activeTable, mobilePosPanel, setMobilePosPanel, posCategory, setPosCategory, posSearch, setPosSearch,
    transferModalOpen, setTransferModalOpen, partialPayModalOpen, setPartialPayModalOpen, partialPayAmount, setPartialPayAmount, noteModalItem, setNoteModalItem, inspectedSale, setInspectedSale,
    esnafChargeModalOpen, setEsnafChargeModalOpen, esnafChargeMode, setEsnafChargeMode, selectedEsnafForCharge, setSelectedEsnafForCharge, applyEsnafDiscount, setApplyEsnafDiscount, esnafOrderNote, setEsnafOrderNote,
    quickNewEsnafName, setQuickNewEsnafName, quickNewEsnafPhone, setQuickNewEsnafPhone, quickNewEsnafDiscount, setQuickNewEsnafDiscount, esnafSearch, setEsnafSearch, selectedEsnafDetail, setSelectedEsnafDetail,
    esnafCollectModal, setEsnafCollectModal, esnafCollectAmount, setEsnafCollectAmount, esnafCollectMethod, setEsnafCollectMethod, esnafCollectStaffId, setEsnafCollectStaffId, esnafCollectNote, setEsnafCollectNote,
    stockModalIng, setStockModalIng, stockAdjustType, setStockAdjustType, stockAdjustAmount, setStockAdjustAmount, recordAsExpense, setRecordAsExpense, stockExpenseCost, setStockExpenseCost,
    editingExpId, setEditingExpId, newExpTitle, setNewExpTitle, newExpCategory, setNewExpCategory, newExpAmount, setNewExpAmount, newExpMethod, setNewExpMethod, newExpNote, setNewExpNote,
    analyticsSubTab, setAnalyticsSubTab, reportProductSearch, setReportProductSearch, reportProductCategory, setReportProductCategory, reportProductSort, setReportProductSort,
    reportReceiptSearch, setReportReceiptSearch, reportReceiptMethod, setReportReceiptMethod, reportReceiptStaff, setReportReceiptStaff, reportExpenseSearch, setReportExpenseSearch, reportExpenseCategory, setReportExpenseCategory,
    settingsSubTab, setSettingsSubTab, editingTableId, setEditingTableId, newTableName, setNewTableName, newTableZone, setNewTableZone, newZoneName, setNewZoneName, editingZoneOldName, setEditingZoneOldName,
    editingPrdId, setEditingPrdId, newPrdName, setNewPrdName, newPrdCategory, setNewPrdCategory, newPrdPrice, setNewPrdPrice, newPrdEmoji, setNewPrdEmoji, newPrdQuickFav, setNewPrdQuickFav, newPrdAskContent, setNewPrdAskContent, newPrdRecipe, setNewPrdRecipe,
    newCategoryName, setNewCategoryName, editingCategoryOldName, setEditingCategoryOldName, editingStaffId, setEditingStaffId, newStaffName, setNewStaffName, newStaffRole, setNewStaffRole, newStaffColor, setNewStaffColor,
    editingEsnafId, setEditingEsnafId, editEsnafName, setEditEsnafName, editEsnafShopType, setEditEsnafShopType, editEsnafPhone, setEditEsnafPhone, editEsnafDiscount, setEditEsnafDiscount, editEsnafNote, setEditEsnafNote,
    resetConfirmOpen, setResetConfirmOpen, criticalIngredients, filteredSales, filteredExpenses, totalEsnafReceivable, kpiMetrics, topProducts, staffPerformance, trendChartData, activeOccupiedCount, openTablesTotalAmount,
    printDevice, updatePrintDevice, sendOrder, reprintKitchen, printTableReceipt, printSaleReceipt, printTestTicket,
    addProductToTable, updateLineContent, updateOrderItemQty, setTableStaff, setTableDiscount, saveItemNote, completeTableOrder, handlePartialPayment, handleConfirmEsnafCharge, handleQuickCreateEsnaf, handleCollectEsnafPayment, copyEsnafWhatsAppSummary, startFastEsnafOrder,
    requireAdmin, handleSaveIngredient, handleDeleteIngredient,
    handleTransferTable, handleStockAdjustment, handleAddExpense, handleSaveProduct, startEditProduct, handleDeleteProduct, handleSaveTable, handleDeleteTable, handleSaveZone, handleDeleteZone, handleSaveCategory, handleDeleteCategory,
    handleSaveStaff, handleDeleteStaff, handleSaveEsnafEdit, handleDeleteEsnaf, handleDeleteSaleReceipt, handleLogoFileUpload, handleManualForceSync, exportFullBackupFile, handleImportBackupFile, handleResetDemoData, exportExcelByCategory
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}
