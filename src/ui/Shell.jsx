import React from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { usePos } from "../context/PosContext";
import { PROTECTED_TABS } from "../constants/initialData";
import { formatTL, hexToRgbTuple } from "../utils/formatters";
import { isBusyNow } from "../design/celebrations";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { TAB_PATHS } from "./routes";
import { getUserSession } from "../services/apiService";
import { TablesView } from "./TablesView";
import { OrderView } from "./OrderView";
import { EsnafView } from "./EsnafView";
import { StockView } from "./StockView";
import { AnalyticsView } from "./AnalyticsView";
import { StaffView } from "./StaffView";
import { FinanceView } from "./FinanceView";
import { SettingsView } from "./SettingsView";

const NAV = [
  { id: "pos", label: "Masalar", icon: "grid" },
  { id: "inventory", label: "Stok", icon: "box" },
  { id: "esnaf", label: "Esnaf", icon: "bag" },
  { id: "analytics", label: "Analiz", icon: "chart" },
  { id: "staff", label: "Personel", icon: "users" },
  { id: "finance", label: "Finans", icon: "cash" },
  { id: "settings", label: "Yönetim", icon: "sliders" }
];
const hhmm = (d) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const MOBILE_PRIMARY = 4; // dar ekranda alt gezinmede doğrudan görünen sekme sayısı; gerisi "Diğer"de

function Rail() {
  const { activeTab, handleTabNavigation, activeOccupiedCount, criticalIngredients, isAdminUnlocked, handleLockAdmin, setPendingProtectedTab, setPinInput, setPinError, setPinModalOpen, brandSettings } = usePos();
  const [more, setMore] = React.useState(false);
  const openPin = () => { setPendingProtectedTab(null); setPinInput(""); setPinError(false); setPinModalOpen(true); };
  const logo = (brandSettings.logoText || brandSettings.businessName?.[0] || "P").slice(0, 2).toUpperCase();
  const go = (id) => { setMore(false); handleTabNavigation(id); };
  const lockBtn = (cls) => (
    <button type="button" className={`rail-btn ${cls}`} onClick={() => { setMore(false); (isAdminUnlocked ? handleLockAdmin : openPin)(); }}>
      <Ic n={isAdminUnlocked ? "lock" : "eye"} />{isAdminUnlocked ? "Kilitle" : "Yönetici"}
    </button>
  );
  const moreActive = NAV.slice(MOBILE_PRIMARY).some((n) => n.id === activeTab);
  return (
    <nav className="rail" aria-label="Ana gezinme">
      <div className="rail-logo" aria-label="ProPos">{logo}</div>
      {NAV.map((n, i) => {
        const locked = PROTECTED_TABS.includes(n.id) && !isAdminUnlocked;
        const badge = n.id === "pos" ? activeOccupiedCount : 0;
        const alert = n.id === "inventory" ? criticalIngredients.length : 0;
        return (
          <button key={n.id} type="button" className={`rail-btn${i >= MOBILE_PRIMARY ? " rail-secondary" : ""}`} aria-current={activeTab === n.id ? "page" : "false"} onClick={() => go(n.id)}>
            <Ic n={n.icon} />{n.label}
            {badge > 0 && <span className="rail-badge num">{badge}</span>}
            {alert > 0 && <span className="rail-badge is-warn num">{alert}</span>}
            {locked && <span className="rail-lock" aria-label="Kilitli"><Ic n="lock" /></span>}
          </button>
        );
      })}
      <div className="rail-spacer" />
      {lockBtn("rail-secondary")}
      <button type="button" className="rail-btn rail-more" aria-haspopup="menu" aria-expanded={more} aria-current={moreActive ? "page" : "false"} onClick={() => setMore((o) => !o)}>
        <Ic n="grid" />Diğer
      </button>
      {more && (
        <>
          <div className="rail-more-back" onClick={() => setMore(false)} />
          <div className="menu-pop rail-more-pop" role="menu">
            {NAV.slice(MOBILE_PRIMARY).map((n) => (
              <button key={n.id} type="button" role="menuitem" aria-current={activeTab === n.id ? "page" : "false"} onClick={() => go(n.id)}>
                <Ic n={n.icon} /> {n.label}{PROTECTED_TABS.includes(n.id) && !isAdminUnlocked ? " (PIN)" : ""}
              </button>
            ))}
            <hr />
            <button type="button" role="menuitem" onClick={() => { setMore(false); (isAdminUnlocked ? handleLockAdmin : openPin)(); }}>
              <Ic n={isAdminUnlocked ? "lock" : "eye"} /> {isAdminUnlocked ? "Yönetici kilidini kapat" : "Yönetici girişi"}
            </button>
          </div>
        </>
      )}
    </nav>
  );
}

function SystemMenu() {
  const {
    ACTIVE_TENANT_ID, brandSettings, isFounderUnlocked, setInstallModalOpen, setSyncModalOpen, setDealerStudioTab, dealerTenants, remoteUpdateInfo,
    isApplyingUpdate, applyRemoteOneClickUpdate, isCheckingUpdate, checkRemoteUpdateFromGithub, appVersion, handleSwitchToTenant, storageInfo, handleUnpairDevice
  } = usePos();
  const session = getUserSession();
  const [open, setOpen] = React.useState(false);
  const [swUpdate, setSwUpdate] = React.useState(null);
  const [installEvt, setInstallEvt] = React.useState(null);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onUpdate = (e) => setSwUpdate(e.detail || null);
    const onInstall = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("propos-sw-update", onUpdate);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => { window.removeEventListener("propos-sw-update", onUpdate); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);
  React.useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const locked = typeof window !== "undefined" && !!window.__PROPOS_LOCKED_TENANT__;
  const item = (fn, label) => <button type="button" onClick={() => { setOpen(false); fn(); }}>{label}</button>;
  const initial = (brandSettings.logoText || brandSettings.businessName?.[0] || "P").slice(0, 1).toUpperCase();
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button type="button" className="avatar pressable" aria-haspopup="menu" aria-expanded={open} aria-label="Sistem menüsü" onClick={() => setOpen((o) => !o)}>{initial}</button>
      {open && (
        <div className="menu-pop" role="menu">
          <div className="menu-note">İşletme kodu <span className="num" style={{ color: "var(--text-1)" }}>{ACTIVE_TENANT_ID === "DEFAULT" ? "MASTER" : ACTIVE_TENANT_ID}</span></div>
          {session && <div className="menu-note">Kullanıcı <span style={{ color: "var(--text-1)" }}>{session.displayName || session.username}</span></div>}
          {item(() => (isFounderUnlocked ? setInstallModalOpen(true) : setSyncModalOpen(true)), "Senkron ve bağlantı")}
          {item(() => checkRemoteUpdateFromGithub(false), isCheckingUpdate ? "Kontrol ediliyor…" : `Güncelleme kontrolü (v${appVersion})`)}
          {remoteUpdateInfo && item(applyRemoteOneClickUpdate, isApplyingUpdate ? "Yükleniyor…" : `Yeni sürüm v${remoteUpdateInfo.version} — güncelle`)}
          {swUpdate && item(() => swUpdate.apply(), "Yeni sürümü uygula (sayfa yenilenir)")}
          {installEvt && item(() => { installEvt.prompt(); setInstallEvt(null); }, "Uygulamayı cihaza yükle")}
          {item(() => window.dispatchEvent(new CustomEvent("propos-open-feedback")), "Geri bildirim gönder")}
          {isFounderUnlocked && item(() => { setDealerStudioTab("tenants"); setInstallModalOpen(true); }, `Bayi & Lisans Paneli (${dealerTenants.length})`)}
          {ACTIVE_TENANT_ID !== "DEFAULT" && !locked && (<><hr />{item(() => handleSwitchToTenant("DEFAULT"), "Ana işletmeye dön")}</>)}
          <hr />
          {item(handleUnpairDevice, "Çıkış yap")}
          {storageInfo && <div className="menu-note">Yerel depo: %{Math.round(storageInfo.ratio * 1000) / 10} kullanımda</div>}
        </div>
      )}
    </div>
  );
}

function Topbar() {
  const { brandSettings, celebration, goalProgressToday, sales, cloudStatus, syncPending, lastSyncedAt, setSyncModalOpen, showToast } = usePos();
  const fill = React.useRef(null);
  const prev = React.useRef(0);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);
  const progress = goalProgressToday;
  React.useEffect(() => {
    if (!fill.current || progress === null || progress === undefined) return;
    M.progress(fill.current, Math.min(1, progress), Math.min(1, prev.current));
    prev.current = progress;
  }, [progress]);
  const goal = celebration && celebration.goal > 0 ? celebration.goal : 0;
  const busy = celebration && celebration.autoSimplify !== false && isBusyNow(sales);
  const offline = cloudStatus === "offline";
  const label = offline ? (syncPending ? "Çevrimdışı · bekleyen var" : "Çevrimdışı")
    : { online: "Kaydedildi", saving: "Kaydediliyor", connecting: "Bağlanıyor", error: "Yetki gerekli" }[cloudStatus] || "Kaydedildi";
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-name">{brandSettings.businessName || "ProPos"}</span>
        <span className="brand-product">ProPos</span>
      </div>
      <div className="topbar-mid">
        {goal > 0 && progress !== null && progress !== undefined && (
          <button type="button" className={`goal pressable${progress >= 1 ? " is-done" : ""}`} aria-label="Günlük hedef" onClick={() => showToast(`Hedef ${formatTL(goal)} · kalan ${formatTL(Math.max(0, goal * (1 - progress)))}`)}>
            <Ic n="target" />
            <span className="goal-body">
              <span className="goal-row"><span>{formatTL(Math.round(goal * progress))} / {formatTL(goal)}</span><span className="num">%{Math.min(999, Math.round(progress * 100))}</span></span>
              <span className="bar"><span className="bar-fill" ref={fill} /></span>
            </span>
          </button>
        )}
        {busy && <span className="busy-chip"><Ic n="zap" className="ic-sm" />Yoğun saat · kutlamalar sade</span>}
      </div>
      <div className="topbar-right">
        <button type="button" className={`sync${cloudStatus === "saving" ? " is-pending" : ""}`} onClick={() => setSyncModalOpen(true)} title="Senkron durumu ve cihaz bağlama" style={{ minHeight: 44 }}>
          <span className="sync-dot" style={offline || cloudStatus === "error" ? { background: "var(--warning)" } : undefined} />
          <span className="sync-label">{label}{cloudStatus === "online" && lastSyncedAt ? ` · ${hhmm(new Date(lastSyncedAt))}` : ""}</span>
        </button>
        <span className="clock num">{hhmm(now)}</span>
        <SystemMenu />
      </div>
    </header>
  );
}

export function Shell() {
  const { activeTab, isAdminUnlocked, handleTabNavigation, brandSettings, toast } = usePos();
  const navigate = useNavigate();

  // Korumalı sayfaya doğrudan adresle girilirse masalara dön ve PIN iste; doğrulayınca asıl sayfaya geçilir.
  React.useEffect(() => {
    if (PROTECTED_TABS.includes(activeTab) && !isAdminUnlocked) {
      navigate(TAB_PATHS.pos, { replace: true });
      handleTabNavigation(activeTab);
    }
  }, [activeTab, isAdminUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const name = String(brandSettings?.businessName || "").trim();
    document.title = name && name !== "ProPos" ? `${name} · ProPos` : "ProPos";
  }, [brandSettings?.businessName]);

  const brand = brandSettings.customPrimary;
  const brandVars = brand && /^#[0-9a-f]{6}$/i.test(brand) && brand.toLowerCase() !== "#f59e0b"
    ? `:root{--primary:${brand};--primary-strong:${brand};--primary-soft:rgba(${hexToRgbTuple(brand)},.14);--primary-line:rgba(${hexToRgbTuple(brand)},.45);}`
    : "";
  const guard = (ok, el) => (ok ? el : null);

  return (
    <div className="app">
      {brandVars && <style>{brandVars}</style>}
      <Rail />
      <div className="content">
        <Topbar />
        <main className="main">
          <Routes>
            <Route path="/masalar" element={<section className="view" aria-label="Masalar"><TablesView /></section>} />
            <Route path="/masalar/:tableId" element={<section className="view" aria-label="Adisyon" style={{ overflow: "hidden" }}><OrderView /></section>} />
            <Route path="/stok" element={<section className="view"><StockView /></section>} />
            <Route path="/esnaf" element={<section className="view"><EsnafView /></section>} />
            <Route path="/analiz" element={<section className="view">{guard(isAdminUnlocked, <AnalyticsView />)}</section>} />
            <Route path="/personel" element={<section className="view">{guard(isAdminUnlocked, <StaffView />)}</section>} />
            <Route path="/finans" element={<section className="view">{guard(isAdminUnlocked, <FinanceView />)}</section>} />
            <Route path="/yonetim" element={<section className="view">{guard(isAdminUnlocked, <SettingsView />)}</section>} />
            <Route path="*" element={<Navigate to={TAB_PATHS.pos} replace />} />
          </Routes>
        </main>
      </div>
      {toast && (
        <div className="cel-layer" aria-live="polite">
          <div className="cel-toast tone-neutral"><span className="cel-toast-ic"><Ic n="check" /></span><span className="cel-toast-body"><span className="cel-toast-title">{toast.message}</span></span></div>
        </div>
      )}
    </div>
  );
}
