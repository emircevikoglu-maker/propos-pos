import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import {
  DEALER_TENANTS_KEY, PROTECTED_TABS, THEME_PRESETS, INITIAL_BRAND_SETTINGS,
  INITIAL_ZONES, INITIAL_CATEGORIES, INITIAL_STAFF, INITIAL_INGREDIENTS,
  INITIAL_PRODUCTS, INITIAL_TABLES, INITIAL_ESNAF, generateInitialSales, generateInitialExpenses
} from "../constants/initialData";
import {
  formatTL, formatDateShort, toDateInputValue, isWithinPeriod, setActiveCurrencyCode,
  getActiveCurrencyObj, resolveActiveTenantId, getProPosStorageKey, loadInitialDealerTenants,
  loadInitialProPosDb, resolveGithubBaseRawUrl
} from "../utils/formatters";
import {
  fetchTenantSync, pushTenantSync, postDealerTenants, postPrepareGithubRelease, postApplyHtmlUpdate,
  loginWithKey, clearFounderSession, hasFounderSession,
  verifyManagerPin, changeManagerPin, clearManagerSession, unpairDevice,
  queuePush, flushQueuedPush, hasPendingPush
} from "../services/apiService";
import { PPMotion } from "../design/motion";
import {
  loadCelebrationSettings, saveCelebrationSettings, applyCelebrationSettings, celebrateSale, celebrateZReport, goalProgress, isBusyNow
} from "../design/celebrations";
import { sanitizeOptionGroups, buildOrderLine, mergeIntoItems, optionSummary } from "../utils/productOptions";
import { exportExcelByCategory as runExcelExport } from "../utils/excelExport";
import {
  copyCustomerDeliveryMessage as copyDeliveryMsg, downloadCustomerZipPackage as dlZipPkg,
  downloadOneClickWindowsInstaller as dlHtaPkg, downloadStandaloneAppHtml as dlHtmlPkg
} from "../utils/packageBuilder";

const ACTIVE_TENANT_ID = resolveActiveTenantId();
const PROPOS_STORAGE_KEY = getProPosStorageKey(ACTIVE_TENANT_ID);
const INITIAL_DB_SNAPSHOT = loadInitialProPosDb(ACTIVE_TENANT_ID);
const PosContext = createContext(null);

export const usePos = () => useContext(PosContext);

export function PosProvider({ children }) {
  const [activeTab, setActiveTab] = useState("pos");
  const [globalPeriod, setGlobalPeriod] = useState("daily");
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(new Date(Date.now() - 7 * 86400000)));
  const [customEndDate, setCustomEndDate] = useState(() => toDateInputValue(new Date()));
  const [cloudStatus, setCloudStatus] = useState("connecting");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const isRemoteUpdateRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const hasHydratedFromServerRef = useRef(false);
  const lastCoreRevRef = useRef(Number(INITIAL_DB_SNAPSHOT?.rev || (INITIAL_DB_SNAPSHOT?.exportedAt ? Date.parse(INITIAL_DB_SNAPSHOT.exportedAt) : 0) || 0));
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

  // Dealer & Multi-Tenant Studio State
  const [dealerTenants, setDealerTenants] = useState(loadInitialDealerTenants);
  const [dealerStudioTab, setDealerStudioTab] = useState("tenants");
  const [newCustName, setNewCustName] = useState("");
  const [newCustOwner, setNewCustOwner] = useState("");
  const [newCustCode, setNewCustCode] = useState("");
  const [newCustPin, setNewCustPin] = useState("1234");
  const [newCustPlan, setNewCustPlan] = useState("yearly");
  const [newCustTheme, setNewCustTheme] = useState("emerald");
  const [newCustCurrency, setNewCustCurrency] = useState("TRY");
  const [newCustTemplate, setNewCustTemplate] = useState("clean");
  const [switchTenantInput, setSwitchTenantInput] = useState(ACTIVE_TENANT_ID === "DEFAULT" ? "MASTER" : ACTIVE_TENANT_ID);
  const [licenseUnlockInput, setLicenseUnlockInput] = useState("");
  const [selectedPackageTenantId, setSelectedPackageTenantId] = useState(ACTIVE_TENANT_ID);
  const [isFounderUnlocked, setIsFounderUnlocked] = useState(false);
  const [founderPromptOpen, setFounderPromptOpen] = useState(false);
  const [founderPromptInput, setFounderPromptInput] = useState("");

  // Remote GitHub Update State
  const [appVersion, setAppVersion] = useState(() => window.__PROPOS_APP_VERSION__ || localStorage.getItem("propos_app_version") || "2.4.0");
  const [githubRepo, setGithubRepo] = useState(() => window.__PROPOS_GITHUB_REPO__ || localStorage.getItem("propos_github_repo") || "");
  const [nextVersionInput, setNextVersionInput] = useState("2.5.0");
  const [releaseNotesInput, setReleaseNotesInput] = useState("Yeni özellikler, performans iyileştirmeleri ve canlı lisans senkronizasyonu eklendi.");
  const [remoteUpdateInfo, setRemoteUpdateInfo] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

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

  // Kutlamalar / hareket: cihaza özel (senkronlanmaz)
  const [celebration, setCelebrationState] = useState(() => loadCelebrationSettings(ACTIVE_TENANT_ID));
  const salesRef = useRef([]);
  const updateCelebration = (patch) => {
    setCelebrationState((prev) => { const next = { ...prev, ...patch }; saveCelebrationSettings(ACTIVE_TENANT_ID, next); return next; });
  };

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
  const [activeTableId, setActiveTableId] = useState(null);
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
  const [newPrdRecipe, setNewPrdRecipe] = useState([]);
  const [newPrdOptions, setNewPrdOptions] = useState([]);
  const [optionPickerProduct, setOptionPickerProduct] = useState(null);
  const [selectedRecipeIng, setSelectedRecipeIng] = useState(INITIAL_INGREDIENTS[0]?.id || "");
  const [selectedRecipeAmt, setSelectedRecipeAmt] = useState("");
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

  // Remote GitHub Update Functions
  const checkRemoteUpdateFromGithub = async (silent = true) => {
    const baseUrl = resolveGithubBaseRawUrl(githubRepo);
    if (!baseUrl) {
      if (!silent) showToast("ℹ️ Önce Bayi Panelinden GitHub Depo Adresinizi (kullaniciadi/repo) tanımlayın.");
      return;
    }
    if (!silent) setIsCheckingUpdate(true);
    try {
      const res = await fetch(`${baseUrl}/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) {
        if (!silent) showToast("⚠️ GitHub üzerinde henüz version.json bulunamadı veya depo gizli (Public olmalı).");
        return;
      }
      const manifest = await res.json();
      if (Array.isArray(manifest?.tenants) && manifest.tenants.length > 0) {
        setDealerTenants((prev) => {
          const merged = prev.map((loc) => {
            const rem = manifest.tenants.find((r) => r.tenantId === loc.tenantId);
            return rem ? { ...loc, status: rem.status || loc.status, expiresAt: rem.expiresAt || loc.expiresAt, planType: rem.planType || loc.planType } : loc;
          });
          localStorage.setItem(DEALER_TENANTS_KEY, JSON.stringify(merged));
          return merged;
        });
      }
      if (manifest?.version && String(manifest.version).trim() !== String(appVersion).trim()) {
        setRemoteUpdateInfo({ version: String(manifest.version).trim(), notes: manifest.notes || "Yeni sistem güncellemesi hazır.", publishedAt: manifest.publishedAt || new Date().toISOString(), baseUrl });
        if (!silent) showToast(`✨ Yeni sürüm bulundu: v${manifest.version}! Tek tıkla güncelleyebilirsiniz.`);
      } else {
        setRemoteUpdateInfo(null);
        if (!silent) showToast(`✅ Sisteminiz güncel! (Sürüm: v${appVersion})`);
      }
    } catch (err) {
      if (!silent) showToast("⚠️ Güncelleme kontrolü sırasında internet/bağlantı hatası oluştu.");
    } finally {
      if (!silent) setIsCheckingUpdate(false);
    }
  };

  const applyRemoteOneClickUpdate = async () => {
    if (!remoteUpdateInfo?.baseUrl) return;
    setIsApplyingUpdate(true);
    try {
      const res = await fetch(`${remoteUpdateInfo.baseUrl}/index.html?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Güncel uygulama dosyası indirilemedi.");
      let newHtml = await res.text();
      if (!newHtml?.includes("<html")) throw new Error("Geçersiz güncelleme paketi.");
      const lockedTenant = window.__PROPOS_LOCKED_TENANT__ || (ACTIVE_TENANT_ID !== "DEFAULT" ? ACTIVE_TENANT_ID : "");
      const lockScript = `<script>\nwindow.__PROPOS_APP_VERSION__ = ${JSON.stringify(remoteUpdateInfo.version)};\nwindow.__PROPOS_GITHUB_REPO__ = ${JSON.stringify(githubRepo)};\n${lockedTenant ? `window.__PROPOS_LOCKED_TENANT__ = ${JSON.stringify(lockedTenant)};` : ""}\n<\/script>\n</head>`;
      newHtml = newHtml.replace("</head>", lockScript);

      let updatedOnDisk = false;
      try {
        const localRes = await postApplyHtmlUpdate(newHtml);
        if (localRes.ok) updatedOnDisk = true;
      } catch (e) {}

      localStorage.setItem("propos_app_version", remoteUpdateInfo.version);
      setAppVersion(remoteUpdateInfo.version);
      setRemoteUpdateInfo(null);

      if (updatedOnDisk || window.location.protocol.startsWith("http")) {
        showToast(`🎉 Sistem v${remoteUpdateInfo.version} sürümüne güncellendi! Yeniden başlatılıyor...`);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const url = URL.createObjectURL(new Blob(["\uFEFF", newHtml], { type: "text/html;charset=utf-8" }));
        const a = Object.assign(document.createElement("a"), { href: url, download: `ProPos_Guncel_v${remoteUpdateInfo.version}.html` });
        a.click();
        URL.revokeObjectURL(url);
        showToast(`🎉 Güncel v${remoteUpdateInfo.version} indirildi! Hiçbir veriniz silinmeden açabilirsiniz.`);
      }
    } catch (err) {
      showToast("❌ Güncelleme uygulanırken hata oluştu: " + (err.message || "Bağlantı hatası"));
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const publishGithubReleaseFiles = async () => {
    const cleanVer = (nextVersionInput || "2.5.0").trim();
    const cleanRepo = (githubRepo || "").trim();
    setAppVersion(cleanVer);
    localStorage.setItem("propos_app_version", cleanVer);
    localStorage.setItem("propos_github_repo", cleanRepo);

    const manifestJson = JSON.stringify({
      version: cleanVer,
      notes: releaseNotesInput.trim() || "Yeni sürüm güncellemesi",
      publishedAt: new Date().toISOString(),
      githubRepo: cleanRepo,
      tenants: dealerTenants.map((t) => ({
        tenantId: t.tenantId, displayCode: t.displayCode || t.tenantId, businessName: t.businessName,
        status: t.status || "active", expiresAt: t.expiresAt || "unlimited", planType: t.planType || "yearly", licenseKey: t.licenseKey || ""
      }))
    }, null, 2);

    let savedLocally = false;
    try {
      const res = await postPrepareGithubRelease(manifestJson);
      if (res.ok) savedLocally = true;
    } catch (e) {}

    const vUrl = URL.createObjectURL(new Blob([manifestJson], { type: "application/json;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: vUrl, download: "version.json" }).click();
    URL.revokeObjectURL(vUrl);

    showToast(savedLocally ? `🚀 v${cleanVer} yayın dosyaları (index.html ve version.json) hazırlandı ve klasöre kaydedildi!` : `🚀 v${cleanVer} için version.json indirildi! GitHub'a yükleyebilirsiniz.`);
  };

  useEffect(() => {
    if (!githubRepo) return;
    checkRemoteUpdateFromGithub(true);
    const timer = setInterval(() => checkRemoteUpdateFromGithub(true), 60000);
    return () => clearInterval(timer);
  }, [githubRepo, appVersion]);

  useEffect(() => {
    const onKeyDown = (ev) => {
      if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setFounderPromptInput("");
        setFounderPromptOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // PHP Backend Live Sync Polling & Auto-Save
  useEffect(() => {
    let active = true;
    const pullFromLocalServer = async () => {
      try {
        const packet = await fetchTenantSync(ACTIVE_TENANT_ID, lastCoreRevRef.current, clientDeviceIdRef.current);
        if (active && packet?.ok && packet.unchanged) { hasHydratedFromServerRef.current = true; setCloudStatus(navigator.onLine ? "online" : "offline"); return; }
        if (!active || !packet?.ok || !packet.data) return;
        // Gönderilmemiş yerel değişiklik varken uzak durumu uygulama (önce bizimki gitsin).
        if (hasPendingPush()) return;
        if (packet.lanIp) window.__PROPOS_LAN_IP__ = packet.lanIp;
        if (Array.isArray(packet.registry) && packet.registry.length > 0) {
          setDealerTenants(packet.registry);
          localStorage.setItem(DEALER_TENANTS_KEY, JSON.stringify(packet.registry));
        }
        const incomingRev = Number(packet.data?.rev || packet.rev || (packet.data?.exportedAt ? Date.parse(packet.data.exportedAt) : 0) || 0);
        if (incomingRev > lastCoreRevRef.current && packet.updatedBy !== clientDeviceIdRef.current) {
          hasHydratedFromServerRef.current = true;
          isRemoteUpdateRef.current = true;
          lastCoreRevRef.current = incomingRev;
          const d = { ...packet.data, rev: incomingRev };
          if (d.brandSettings) setBrandSettings(d.brandSettings);
          if (d.zones) setZones(d.zones);
          if (d.categories) setCategories(d.categories);
          if (d.staffList) setStaffList(d.staffList);
          if (d.ingredients) setIngredients(d.ingredients);
          if (d.products) setProducts(d.products);
          if (d.tables) setTables(d.tables);
          if (d.sales) setSales(d.sales);
          if (d.expenses) setExpenses(d.expenses);
          if (d.esnafList) setEsnafList(d.esnafList);
          localStorage.setItem(PROPOS_STORAGE_KEY, JSON.stringify(d));
          setLastSyncedAt(d.exportedAt || new Date().toISOString());
          setCloudStatus("online");
          setTimeout(() => { isRemoteUpdateRef.current = false; }, 200);
        } else if (lastCoreRevRef.current > incomingRev && !hasHydratedFromServerRef.current) {
          hasHydratedFromServerRef.current = true;
          const localRaw = localStorage.getItem(PROPOS_STORAGE_KEY);
          if (localRaw) pushTenantSync(ACTIVE_TENANT_ID, clientDeviceIdRef.current, lastCoreRevRef.current, localRaw).catch(() => {});
        } else {
          hasHydratedFromServerRef.current = true;
          setCloudStatus("online");
        }
      } catch (e) {
        hasHydratedFromServerRef.current = true;
      }
    };
    // Görünür sekmede 3 sn; gizli sekmede 30 sn (arka plandaki tablet sunucuyu yormasın).
    let lastPollAt = 0;
    const tick = () => {
      const hidden = typeof document !== "undefined" && document.hidden;
      if (Date.now() - lastPollAt < (hidden ? 30000 : 2900)) return;
      lastPollAt = Date.now();
      pullFromLocalServer();
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.hidden) { flushQueuedPush(); return; }
      lastPollAt = 0;
      tick();
    };
    const onPageHide = () => { flushQueuedPush(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      active = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current) { isInitialMountRef.current = false; return; }
    if (isRemoteUpdateRef.current) return;
    const nextRev = Date.now();
    lastCoreRevRef.current = nextRev;
    const payload = {
      version: "1.0", tenantId: ACTIVE_TENANT_ID, rev: nextRev, exportedAt: new Date().toISOString(),
      brandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, esnafList
    };
    const jsonStr = JSON.stringify(payload);
    localStorage.setItem(PROPOS_STORAGE_KEY, jsonStr);
    setLastSyncedAt(payload.exportedAt);
    setCloudStatus(navigator.onLine ? "online" : "offline");
    // Debounce: hızlı art arda değişiklikler (yazma, +/- basma) tek gönderime iner.
    queuePush(ACTIVE_TENANT_ID, clientDeviceIdRef.current, nextRev, jsonStr, (out) => {
      if (out?.rev) lastCoreRevRef.current = Number(out.rev);
      if (out?.ok) setCloudStatus("online");
    });
  }, [brandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, esnafList]);

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
    const onOnline = () => { setCloudStatus("online"); showToast("🌐 İnternet bağlantısı geri geldi! Veriler senkronize ediliyor."); };
    const onOffline = () => { setCloudStatus("offline"); showToast("⚠️ İnternet kesildi! İşlemleriniz güvende, bağlantı gelince otomatik eşitlenecek.", "warning"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // Dealer & Tenant Management Actions
  const saveDealerRegistry = (nextList) => {
    setDealerTenants(nextList);
    const str = JSON.stringify(nextList);
    localStorage.setItem(DEALER_TENANTS_KEY, str);
    return postDealerTenants(str)
      .then((res) => (res.ok ? res.json() : null))
      .then((out) => {
        if (out && Array.isArray(out.tenants)) {
          setDealerTenants(out.tenants);
          localStorage.setItem(DEALER_TENANTS_KEY, JSON.stringify(out.tenants));
        }
        return !!out;
      })
      .catch(() => false);
  };

  // Kurucu anahtarı sunucuda doğrulanır (tarayıcıda saklanmaz / karşılaştırılmaz).
  const verifyFounderKey = async (key) => {
    const clean = String(key || "").trim();
    if (clean.length < 8) return false;
    const r = await loginWithKey("DEFAULT", clean);
    return !!(r.ok && r.role === "founder");
  };

  const currentTenantRecord = dealerTenants.find((t) => t.tenantId === ACTIVE_TENANT_ID) || null;
  const isCurrentTenantExpired = Boolean(currentTenantRecord && currentTenantRecord.tenantId !== "DEFAULT" && currentTenantRecord.expiresAt && currentTenantRecord.expiresAt !== "unlimited" && new Date(currentTenantRecord.expiresAt).getTime() < Date.now());
  const isCurrentTenantBlocked = Boolean(currentTenantRecord && currentTenantRecord.tenantId !== "DEFAULT" && (currentTenantRecord.status === "suspended" || isCurrentTenantExpired));

  const handleSwitchToTenant = (targetTenantId) => {
    const raw = String(targetTenantId || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const norm = !raw || ["PICKYS-MASTER", "MASTER", "DEFAULT"].includes(raw) ? "DEFAULT" : raw;
    localStorage.setItem("propos_active_tenant_id", norm);
    const url = new URL(window.location.href);
    if (norm === "DEFAULT") url.searchParams.delete("tenant");
    else url.searchParams.set("tenant", norm);
    window.location.href = url.toString();
  };

  const handleCreateCustomerTenant = (e) => {
    e?.preventDefault?.();
    const bizTitle = newCustName.trim();
    if (!bizTitle) return showToast("Lütfen müşteri işletme / kafe adını girin.");
    const autoSlug = bizTitle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "KAFE";
    const cleanCode = newCustCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || `${autoSlug}-${Math.floor(100 + Math.random() * 900)}`;
    if (dealerTenants.some((t) => t.tenantId === cleanCode || t.displayCode === cleanCode)) {
      return showToast("Bu İşletme Kodu zaten kullanımda! Lütfen farklı bir kod girin.");
    }
    const now = new Date();
    const planDays = { trial_14: 14, monthly: 30, yearly: 365 }[newCustPlan];
    const expiresAt = planDays ? new Date(now.getTime() + planDays * 86400000).toISOString() : "unlimited";
    const licenseKey = `PROPOS-${now.getFullYear()}-${cleanCode.slice(0, 5)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const preset = THEME_PRESETS.find((p) => p.id === newCustTheme) || THEME_PRESETS[1];

    const initialCustomerDb = {
      version: "1.0", rev: Date.now(), exportedAt: now.toISOString(),
      adminPin: newCustPin?.trim().length >= 4 ? newCustPin.trim() : "1234",
      brandSettings: {
        businessName: bizTitle, subtitle: "Kurumsal POS & Bulut ERP Sistemi", badgeText: "PRO", logoType: "text",
        logoText: bizTitle.slice(0, 2).toUpperCase(), logoEmoji: "☕", logoImageUrl: "", currency: newCustCurrency || "TRY",
        themeId: preset.id, customPrimary: preset.primary, customSecondary: preset.secondary, customBg: preset.bg, customPanel: preset.panel
      },
      zones: newCustTemplate === "clone" ? zones : INITIAL_ZONES,
      categories: newCustTemplate === "clone" ? categories : INITIAL_CATEGORIES,
      staffList: [{ id: "st-1", name: newCustOwner.trim().split(" ")[0] || "Kasa Yönetici", role: "İşletme Sahibi & Kasa", color: preset.primary, avatar: (newCustOwner.trim()[0] || "Y").toUpperCase() }],
      ingredients: newCustTemplate === "clone" ? ingredients : INITIAL_INGREDIENTS,
      products: newCustTemplate === "clone" ? products : INITIAL_PRODUCTS,
      tables: INITIAL_TABLES.map((t) => ({ ...t, status: "empty", openedAt: null, staffId: "st-1", discount: 0, paidAmount: 0, items: [] })),
      sales: [], expenses: [], esnafList: []
    };

    const dbStr = JSON.stringify(initialCustomerDb);
    localStorage.setItem(`propos_enterprise_db_tenant_${cleanCode}`, dbStr);

    saveDealerRegistry([...dealerTenants, {
      tenantId: cleanCode, displayCode: cleanCode, businessName: bizTitle, ownerName: newCustOwner.trim() || "Yetkili",
      adminPin: initialCustomerDb.adminPin, licenseKey, planType: newCustPlan, status: "active",
      createdAt: now.toISOString(), expiresAt, themeId: preset.id, currency: newCustCurrency || "TRY"
    }]).then((saved) => {
      if (saved) pushTenantSync(cleanCode, "dealer-init", initialCustomerDb.rev, dbStr).catch(() => {});
      else showToast("⚠️ Müşteri kaydı sunucuya yazılamadı (kurucu oturumu gerekli).");
    });
    setSelectedPackageTenantId(cleanCode);
    setNewCustName(""); setNewCustOwner(""); setNewCustCode("");
    showToast(`🎉 "${bizTitle}" (${cleanCode}) müşterisi ve izole veritabanı oluşturuldu!`);
  };

  const handleToggleCustomerStatus = (tenantId) => {
    if (tenantId === "DEFAULT") return;
    saveDealerRegistry(dealerTenants.map((t) => {
      if (t.tenantId !== tenantId) return t;
      const nextStatus = t.status === "suspended" ? "active" : "suspended";
      showToast(nextStatus === "active" ? `✅ ${t.businessName} lisansı tekrar AKTİF edildi.` : `⏸️ ${t.businessName} lisansı ASKIYA alındı (Erişim durduruldu).`);
      return { ...t, status: nextStatus };
    }));
  };

  const handleExtendCustomerLicense = (tenantId, mode) => {
    saveDealerRegistry(dealerTenants.map((t) => {
      if (t.tenantId !== tenantId) return t;
      let nextExp = "unlimited";
      if (mode !== "unlimited") {
        const baseTime = t.expiresAt && t.expiresAt !== "unlimited" && new Date(t.expiresAt).getTime() > Date.now() ? new Date(t.expiresAt).getTime() : Date.now();
        nextExp = new Date(baseTime + (Number(mode) || 30) * 86400000).toISOString();
      }
      showToast(`📅 ${t.businessName} lisans süresi güncellendi!`);
      return { ...t, status: "active", expiresAt: nextExp, planType: mode === "unlimited" ? "lifetime" : mode === 365 ? "yearly" : "monthly" };
    }));
  };

  const handleDeleteCustomerTenant = (tenantId) => {
    if (tenantId === "DEFAULT") return;
    const target = dealerTenants.find((t) => t.tenantId === tenantId);
    saveDealerRegistry(dealerTenants.filter((t) => t.tenantId !== tenantId));
    localStorage.removeItem(`propos_enterprise_db_tenant_${tenantId}`);
    if (target) showToast(`🗑️ ${target.businessName} müşteri kaydı silindi.`);
  };

  /** PIN sunucuda doğrulanır. Ana işletmede 12 karakterden uzun giriş kurucu anahtarı sayılır (geçiş dönemi). */
  const handleVerifyPin = async (attemptPin) => {
    const code = String(attemptPin !== undefined ? attemptPin : pinInput).trim();
    if (!code || pinBusy) return { ok: false, error: "PIN girin." };
    setPinBusy(true);
    try {
      if (ACTIVE_TENANT_ID === "DEFAULT" && code.length > 12) {
        if (await verifyFounderKey(code)) {
          setIsAdminUnlocked(true); setIsFounderUnlocked(true); setPinModalOpen(false); setPinInput(""); setPinError(false); setInstallModalOpen(true);
          showToast("👑 Süper Yönetici (Bayi & Lisans Stüdyosu) açıldı!");
          return { ok: true };
        }
        setPinError(true);
        return { ok: false, error: "Anahtar hatalı." };
      }
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
    setIsAdminUnlocked(false); setIsFounderUnlocked(false); clearFounderSession(); clearManagerSession(ACTIVE_TENANT_ID);
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

  const topProducts = useMemo(() => {
    const map = {};
    let totalSoldRevenue = 0;
    filteredSales.forEach((sale) => {
      if (sale.paymentMethod === "İkram / İptal") return;
      sale.items.forEach((item) => {
        if (!map[item.productId]) {
          const prdObj = products.find((p) => p.id === item.productId);
          const unitCost = (prdObj?.recipe || []).reduce((sum, r) => sum + ((ingredients.find((i) => i.id === r.ingredientId)?.unitCost || 0) * r.amount), 0);
          map[item.productId] = { id: item.productId, name: item.name, category: prdObj?.category || "Diğer", image: prdObj?.image || "☕", unitPrice: item.price, unitCost: Math.round(unitCost * 10) / 10, qty: 0, revenue: 0, costTotal: 0, profit: 0 };
        }
        const entry = map[item.productId];
        const rev = item.qty * item.price, cost = item.qty * entry.unitCost;
        entry.qty += item.qty; entry.revenue += rev; entry.costTotal += cost; entry.profit += rev - cost;
        totalSoldRevenue += rev;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).map((p) => ({ ...p, share: totalSoldRevenue > 0 ? Math.round((p.revenue / totalSoldRevenue) * 100) : 0 }));
  }, [filteredSales, products, ingredients]);

  const staffPerformance = useMemo(() => {
    const stats = Object.fromEntries(staffList.map((st) => [st.id, { ...st, cash: 0, card: 0, mealCard: 0, cariWritten: 0, comp: 0, total: 0, orderCount: 0, itemCount: 0 }]));
    filteredSales.forEach((s) => {
      const st = stats[s.staffId];
      if (!st) return;
      st.orderCount += 1;
      st.itemCount += s.items.reduce((sum, i) => sum + i.qty, 0);
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
  /** selection verilmezse ve ürünün çeşitleri varsa seçim penceresi açılır. */
  const addProductToTable = (product, selection) => {
    if (!activeTable || !product) return;
    const groups = sanitizeOptionGroups(product.options);
    if (groups.length > 0 && selection === undefined) {
      setOptionPickerProduct(product);
      return;
    }
    const line = buildOrderLine({ ...product, options: groups }, selection || {});
    setTables((prev) => prev.map((t) => {
      if (t.id !== activeTable.id) return t;
      return { ...t, status: "occupied", openedAt: t.openedAt || new Date().toISOString(), items: mergeIntoItems(t.items, line) };
    }));
  };

  const confirmOptionPicker = (selection) => {
    const prd = optionPickerProduct;
    setOptionPickerProduct(null);
    if (prd) addProductToTable(prd, selection);
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
      return { ...t, status: occ ? "occupied" : "empty", openedAt: occ ? t.openedAt : null, discount: occ ? t.discount : 0, paidAmount: occ ? t.paidAmount : 0, items };
    }));
  };

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
      products.find((p) => p.id === oi.productId)?.recipe?.forEach((r) => {
        deductions[r.ingredientId] = (deductions[r.ingredientId] || 0) + r.amount * oi.qty;
      });
    });
    setIngredients((prev) => prev.map((ing) => (deductions[ing.id] ? { ...ing, stock: Math.max(0, +(ing.stock - deductions[ing.id]).toFixed(1)) } : ing)));
  };

  const completeTableOrder = (paymentMethod) => {
    if (!activeTable?.items.length) return;
    const subtotal = activeTable.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const remainingTotal = Math.max(0, subtotal - (activeTable.discount || 0) - (activeTable.paidAmount || 0));
    // Kısmi ödemeler kendi satış kaydında sayıldı; burada yalnızca kalan brüt yazılır (Z raporu brütü şişmesin).
    const remainingGross = Math.max(0, subtotal - (activeTable.paidAmount || 0));
    const newSale = { id: `sl-${Date.now()}`, timestamp: new Date().toISOString(), tableName: activeTable.name, staffId: activeTable.staffId || staffList[0]?.id, paymentMethod, subtotal: remainingGross, discount: Math.min(activeTable.discount || 0, remainingGross), total: remainingTotal, items: activeTable.items };
    const snap = { tables, sales, ingredients };
    const closedName = activeTable.name;
    const staffName = staffList.find((st) => st.id === activeTable.staffId)?.name || "Personel";
    setSales((prev) => [newSale, ...prev]);
    deductRecipeIngredients(activeTable.items);
    setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, status: "empty", openedAt: null, discount: 0, paidAmount: 0, items: [] } : t)));
    setActiveTableId(null);
    // 5 sn içinde geri alınabilir; kutlama yalnızca kalıcılaşınca (geri alınan satış kutlanmaz).
    offerUndo(
      `${closedName} kapatıldı · ${formatTL(remainingTotal)} · ${paymentMethod} · ${staffName}`,
      () => { setTables(snap.tables); setSales(snap.sales); setIngredients(snap.ingredients); },
      () => celebrateSale({ sales: [newSale, ...snap.sales], sale: newSale, goal: celebration.goal })
    );
  };

  const handlePartialPayment = (paymentMethod) => {
    const amount = Number(partialPayAmount);
    if (!activeTable || !amount || amount <= 0) return;
    const subtotal = activeTable.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    if (amount >= subtotal - (activeTable.discount || 0) - (activeTable.paidAmount || 0)) {
      setPartialPayModalOpen(false); setPartialPayAmount("");
      return completeTableOrder(paymentMethod);
    }
    setSales((prev) => [{ id: `sl-part-${Date.now()}`, timestamp: new Date().toISOString(), tableName: `${activeTable.name} (Kısmi Ödeme)`, staffId: activeTable.staffId || staffList[0]?.id, paymentMethod, subtotal: amount, discount: 0, total: amount, items: [{ productId: "prd-1", name: "Kısmi Hesap Tahsilatı", price: amount, qty: 1 }] }, ...prev]);
    setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, paidAmount: (t.paidAmount || 0) + amount } : t)));
    showToast(`${activeTable.name} için ${formatTL(amount)} (${paymentMethod}) kısmi ödeme alındı.`);
    setPartialPayAmount(""); setPartialPayModalOpen(false);
  };

  // Esnaf & Cari Operations
  const handleConfirmEsnafCharge = () => {
    const esnaf = esnafList.find((e) => e.id === selectedEsnafForCharge);
    if (!activeTable || !esnaf) return;
    const subtotal = activeTable.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const currentRemaining = Math.max(0, subtotal - (activeTable.discount || 0) - (activeTable.paidAmount || 0));
    let chargeAmount = currentRemaining, appliedDiscount = activeTable.discount || 0;
    if (esnafChargeMode === "partial") {
      chargeAmount = Math.min(currentRemaining, Math.max(1, Number(partialPayAmount) || 0));
    } else if (applyEsnafDiscount && esnaf.discountRate > 0 && !activeTable.discount) {
      const disc = Math.round((currentRemaining * esnaf.discountRate) / 100);
      appliedDiscount += disc; chargeAmount = Math.max(0, currentRemaining - disc);
    }
    const txRecord = {
      id: `etr-${Date.now()}`, type: "charge", timestamp: new Date().toISOString(), staffId: activeTable.staffId || staffList[0]?.id, amount: chargeAmount,
      items: esnafChargeMode === "partial" ? [{ name: `${activeTable.name} Kısmi Adisyon Aktarımı`, qty: 1, price: chargeAmount }] : activeTable.items.map((i) => ({ name: i.options && i.options.length ? `${i.name} (${optionSummary(i.options)})` : i.name, qty: i.qty, price: i.price, note: i.note })),
      note: esnafOrderNote.trim() || `${activeTable.name} adisyonu`
    };
    setEsnafList((prev) => prev.map((e) => (e.id === esnaf.id ? { ...e, balance: (e.balance || 0) + chargeAmount, transactions: [txRecord, ...(e.transactions || [])] } : e)));
    setSales((prev) => [{
      id: `sl-cari-${Date.now()}`, timestamp: new Date().toISOString(), tableName: `${activeTable.name} ➔ ${esnaf.name}`, staffId: activeTable.staffId || staffList[0]?.id, paymentMethod: "Esnaf Cariye Yazıldı",
      subtotal: esnafChargeMode === "partial" ? chargeAmount : subtotal, discount: esnafChargeMode === "partial" ? 0 : appliedDiscount, total: chargeAmount,
      items: esnafChargeMode === "partial" ? [{ productId: "prd-17", name: `Cari Aktarım (${esnaf.name})`, price: chargeAmount, qty: 1 }] : activeTable.items
    }, ...prev]);

    if (esnafChargeMode === "partial" && chargeAmount < currentRemaining) {
      setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, paidAmount: (t.paidAmount || 0) + chargeAmount } : t)));
      showToast(`${esnaf.name} carisine ${formatTL(chargeAmount)} kısmi hesap yazıldı!`);
    } else {
      deductRecipeIngredients(activeTable.items);
      setTables((prev) => prev.map((t) => (t.id === activeTable.id ? { ...t, status: "empty", openedAt: null, discount: 0, paidAmount: 0, items: [] } : t)));
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
    setSales((prev) => [{ id: `sl-col-${Date.now()}`, timestamp: new Date().toISOString(), tableName: `Cari Tahsilat: ${esnafCollectModal.name}`, staffId: esnafCollectStaffId || staffList[0]?.id, paymentMethod: esnafCollectMethod, subtotal: amount, discount: 0, total: amount, items: [{ productId: "prd-17", name: `Esnaf Cari Tahsilatı (${esnafCollectModal.name})`, price: amount, qty: 1 }] }, ...prev]);
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
          if (ex) ex.qty += src.qty; else mergedItems.push({ ...src });
        });
        return { ...t, status: "occupied", openedAt: t.openedAt || activeTable.openedAt || new Date().toISOString(), discount: (t.discount || 0) + (activeTable.discount || 0), paidAmount: (t.paidAmount || 0) + (activeTable.paidAmount || 0), items: mergedItems };
      }
      return t.id === activeTable.id ? { ...t, status: "empty", openedAt: null, discount: 0, paidAmount: 0, items: [] } : t;
    }));
    showToast(`${activeTable.name} adisyonu ${targetTable.name} masasına aktarıldı!`);
    setTransferModalOpen(false); setActiveTableId(targetTableId);
  };

  // Stock, Expense & Settings CRUD Operations
  const handleStockAdjustment = (e) => {
    e.preventDefault();
    const val = Number(stockAdjustAmount);
    if (!stockModalIng || isNaN(val) || val <= 0) return;
    setIngredients((prev) => prev.map((ing) => (ing.id !== stockModalIng.id ? ing : { ...ing, stock: stockAdjustType === "add" ? ing.stock + val : stockAdjustType === "waste" ? Math.max(0, ing.stock - val) : val })));
    if (stockAdjustType === "add" && recordAsExpense) {
      const costAmount = Number(stockExpenseCost) || Math.round(val * stockModalIng.unitCost);
      if (costAmount > 0) setExpenses((prev) => [{ id: `exp-stk-${Date.now()}`, title: `Stok Alımı: ${stockModalIng.name} (+${val} ${stockModalIng.unit})`, category: "Toptancı / Malzeme", amount: costAmount, paymentMethod: "Kredi Kartı", timestamp: new Date().toISOString(), note: "Stok modülünden otomatik işlenen alım" }, ...prev]);
    }
    showToast(`${stockModalIng.name} stok miktarı güncellendi!`);
    setStockModalIng(null); setStockAdjustAmount(""); setStockExpenseCost("");
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
    const itemData = { name: newPrdName.trim(), category: newPrdCategory, price, image: newPrdEmoji || "☕", isQuickFav: newPrdQuickFav, recipe: newPrdRecipe, options: sanitizeOptionGroups(newPrdOptions) };
    if (editingPrdId) {
      setProducts((prev) => prev.map((p) => (p.id === editingPrdId ? { ...p, ...itemData } : p)));
      showToast(`${itemData.name} ürünü güncellendi!`); setEditingPrdId(null);
    } else {
      setProducts((prev) => [...prev, { id: `prd-${Date.now()}`, ...itemData }]);
      showToast(`${itemData.name} menüye ve reçete sistemine eklendi!`);
    }
    setNewPrdName(""); setNewPrdPrice(""); setNewPrdEmoji("☕"); setNewPrdQuickFav(false); setNewPrdRecipe([]); setNewPrdOptions([]);
  };

  const startEditProduct = (prd) => {
    setEditingPrdId(prd.id); setNewPrdName(prd.name); setNewPrdCategory(prd.category);
    setNewPrdPrice(String(prd.price)); setNewPrdEmoji(prd.image || "☕"); setNewPrdQuickFav(Boolean(prd.isQuickFav)); setNewPrdRecipe(prd.recipe || []); setNewPrdOptions(sanitizeOptionGroups(prd.options));
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
    setLastSyncedAt(new Date().toISOString());
    setCloudStatus(navigator.onLine ? "online" : "offline");
    const localRaw = localStorage.getItem(PROPOS_STORAGE_KEY);
    if (localRaw) await pushTenantSync(ACTIVE_TENANT_ID, clientDeviceIdRef.current, Date.now(), localRaw).catch(() => {});
    showToast("☁️ Tüm veriler yerel sunucu ve bağlı cihazlarla anında eşitlendi!");
  };

  const exportFullBackupFile = () => {
    const backupPayload = { version: "1.0", exportedAt: new Date().toISOString(), brandSettings, zones, categories, staffList, ingredients, products, tables, sales, expenses, esnafList };
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

  const copyCustomerDeliveryMessage = (tObj) => copyDeliveryMsg(tObj, showToast);
  const downloadCustomerZipPackage = (targetTenantId) => dlZipPkg({ targetTenantId, dealerTenants, brandSettings, githubRepo, appVersion, showToast });
  const downloadOneClickWindowsInstaller = (targetTenantId) => dlHtaPkg({ targetTenantId: targetTenantId || selectedPackageTenantId, dealerTenants, currentTenantRecord, activeTenantId: ACTIVE_TENANT_ID, appVersion, githubRepo, showToast });
  const downloadStandaloneAppHtml = (targetTenantId) => dlHtmlPkg({ targetTenantId: targetTenantId || selectedPackageTenantId, dealerTenants, currentTenantRecord, activeTenantId: ACTIVE_TENANT_ID, appVersion, githubRepo, showToast });

  const activeOccupiedCount = tables.filter((t) => t.status === "occupied").length;
  const openTablesTotalAmount = tables.reduce((acc, t) => acc + Math.max(0, t.items.reduce((s, i) => s + i.price * i.qty, 0) - (t.discount || 0) - (t.paidAmount || 0)), 0);

  const value = {
    ACTIVE_TENANT_ID, activeCurrencyObj, clientDeviceId: clientDeviceIdRef.current,
    activeTab, setActiveTab, handleTabNavigation, globalPeriod, setGlobalPeriod, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate,
    cloudStatus, lastSyncedAt, syncModalOpen, setSyncModalOpen, installModalOpen, setInstallModalOpen,
    celebration, updateCelebration, goalProgressToday: goalProgress(sales, celebration.goal), celebrateZReport,
    isAdminUnlocked, pinBusy, handleChangePin, handleSetupFirstPin, handleUnpairDevice,
    optionPickerProduct, setOptionPickerProduct, confirmOptionPicker, newPrdOptions, setNewPrdOptions, setIsAdminUnlocked, pinModalOpen, setPinModalOpen, pinInput, setPinInput, pinError, setPinError, pendingProtectedTab, setPendingProtectedTab, newPinValue, setNewPinValue, handleVerifyPin, handleLockAdmin,
    dealerTenants, dealerStudioTab, setDealerStudioTab, newCustName, setNewCustName, newCustOwner, setNewCustOwner, newCustCode, setNewCustCode, newCustPin, setNewCustPin, newCustPlan, setNewCustPlan, newCustTheme, setNewCustTheme, newCustCurrency, setNewCustCurrency, newCustTemplate, setNewCustTemplate,
    switchTenantInput, setSwitchTenantInput, licenseUnlockInput, setLicenseUnlockInput, selectedPackageTenantId, setSelectedPackageTenantId,
    isFounderUnlocked, setIsFounderUnlocked, verifyFounderKey, founderPromptOpen, setFounderPromptOpen, founderPromptInput, setFounderPromptInput,
    appVersion, githubRepo, setGithubRepo, nextVersionInput, setNextVersionInput, releaseNotesInput, setReleaseNotesInput, remoteUpdateInfo, isCheckingUpdate, isApplyingUpdate, checkRemoteUpdateFromGithub, applyRemoteOneClickUpdate, publishGithubReleaseFiles,
    currentTenantRecord, isCurrentTenantExpired, isCurrentTenantBlocked, handleSwitchToTenant, handleCreateCustomerTenant, handleToggleCustomerStatus, handleExtendCustomerLicense, handleDeleteCustomerTenant,
    copyCustomerDeliveryMessage, downloadCustomerZipPackage, downloadOneClickWindowsInstaller, downloadStandaloneAppHtml,
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
    editingPrdId, setEditingPrdId, newPrdName, setNewPrdName, newPrdCategory, setNewPrdCategory, newPrdPrice, setNewPrdPrice, newPrdEmoji, setNewPrdEmoji, newPrdQuickFav, setNewPrdQuickFav, newPrdRecipe, setNewPrdRecipe, selectedRecipeIng, setSelectedRecipeIng, selectedRecipeAmt, setSelectedRecipeAmt,
    newCategoryName, setNewCategoryName, editingCategoryOldName, setEditingCategoryOldName, editingStaffId, setEditingStaffId, newStaffName, setNewStaffName, newStaffRole, setNewStaffRole, newStaffColor, setNewStaffColor,
    editingEsnafId, setEditingEsnafId, editEsnafName, setEditEsnafName, editEsnafShopType, setEditEsnafShopType, editEsnafPhone, setEditEsnafPhone, editEsnafDiscount, setEditEsnafDiscount, editEsnafNote, setEditEsnafNote,
    resetConfirmOpen, setResetConfirmOpen, criticalIngredients, filteredSales, filteredExpenses, totalEsnafReceivable, kpiMetrics, topProducts, staffPerformance, trendChartData, activeOccupiedCount, openTablesTotalAmount,
    addProductToTable, updateOrderItemQty, setTableStaff, setTableDiscount, saveItemNote, completeTableOrder, handlePartialPayment, handleConfirmEsnafCharge, handleQuickCreateEsnaf, handleCollectEsnafPayment, copyEsnafWhatsAppSummary, startFastEsnafOrder,
    handleTransferTable, handleStockAdjustment, handleAddExpense, handleSaveProduct, startEditProduct, handleDeleteProduct, handleSaveTable, handleDeleteTable, handleSaveZone, handleDeleteZone, handleSaveCategory, handleDeleteCategory,
    handleSaveStaff, handleDeleteStaff, handleSaveEsnafEdit, handleDeleteEsnaf, handleDeleteSaleReceipt, handleLogoFileUpload, handleManualForceSync, exportFullBackupFile, handleImportBackupFile, handleResetDemoData, exportExcelByCategory
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}
