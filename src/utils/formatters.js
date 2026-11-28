import { CURRENCY_OPTIONS } from "../constants/initialData";

let activeCurrencyCode = "TRY";

export function setActiveCurrencyCode(code) {
  activeCurrencyCode = code || "TRY";
}

export function getActiveCurrencyObj() {
  return CURRENCY_OPTIONS[activeCurrencyCode] || CURRENCY_OPTIONS.TRY;
}

export function formatTL(val) {
  const num = Number(val) || 0;
  const cur = getActiveCurrencyObj();
  return new Intl.NumberFormat(cur.locale, {
    style: "currency",
    currency: cur.code,
    maximumFractionDigits: 0
  }).format(num);
}

export function formatDateShort(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getElapsedMinutes(isoStr) {
  if (!isoStr) return 0;
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  return Math.max(1, diff);
}

export function toDateInputValue(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isWithinPeriod(isoStr, period, customStart, customEnd) {
  if (!isoStr) return false;
  const date = new Date(isoStr);
  const now = new Date();

  if (period === "daily") {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
  if (period === "yesterday") {
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    return (
      date.getDate() === yest.getDate() &&
      date.getMonth() === yest.getMonth() &&
      date.getFullYear() === yest.getFullYear()
    );
  }
  if (period === "weekly") {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return date >= sevenDaysAgo;
  }
  if (period === "monthly") {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return date >= thirtyDaysAgo;
  }
  if (period === "custom") {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : new Date(0);
    const end = customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date(864e13);
    return date >= start && date <= end;
  }
  return true;
}

export function hexToRgbTuple(hex) {
  const clean = (hex || "#f59e0b").replace("#", "");
  const expanded = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(expanded, 16);
  if (isNaN(num)) return "245, 158, 11";
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/** Sunucudaki normalizeTenantId ile aynı kural: A-Z 0-9 _ -, en fazla 40; MASTER takma adları → DEFAULT. */
export function normalizeTenantCode(raw) {
  const clean = String(raw == null ? "" : raw).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  if (!clean || clean === "PICKYS-MASTER" || clean === "MASTER" || clean === "DEFAULT") return "DEFAULT";
  return clean;
}

/** Kilitli paket (müşteri kurulumu) her zaman önce gelir; URL ile başka işletmeye geçilemez. */
export function resolveActiveTenantId() {
  try {
    if (typeof window !== "undefined" && window.__PROPOS_LOCKED_TENANT__) {
      return normalizeTenantCode(window.__PROPOS_LOCKED_TENANT__);
    }
    const params = new URLSearchParams(window.location.search);
    const qTenant = params.get("tenant") || params.get("store") || params.get("kod");
    if (qTenant && qTenant.trim()) {
      const norm = normalizeTenantCode(qTenant);
      localStorage.setItem("propos_active_tenant_id", norm);
      return norm;
    }
    const saved = localStorage.getItem("propos_active_tenant_id");
    if (saved && saved.trim()) return normalizeTenantCode(saved);
  } catch (e) {}
  return "DEFAULT";
}

export function getProPosStorageKey(tenantId) {
  return tenantId === "DEFAULT" ? "propos_enterprise_db_v1" : `propos_enterprise_db_tenant_${tenantId}`;
}

export function loadInitialProPosDb(tenantId) {
  const storageKey = getProPosStorageKey(tenantId);
  // IndexedDB'den DeviceGate'in önceden yüklediği son yerel durum (çevrimdışı açılışta da çalışır).
  try {
    const boot = typeof window !== "undefined" ? window.__PROPOS_BOOT__ : null;
    if (boot && boot.tenantId === tenantId && boot.state && boot.state.tables && boot.state.products) return boot.state;
  } catch (e) {}
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tables && parsed.products) return parsed;
    }
  } catch (e) {}
  if (tenantId === "DEFAULT") {
    return typeof window !== "undefined" && window.__PROPOS_BACKUP_SEED__ ? window.__PROPOS_BACKUP_SEED__ : null;
  }
  return typeof window !== "undefined" && window.__PROPOS_TENANT_SEED__ ? window.__PROPOS_TENANT_SEED__ : null;
}
