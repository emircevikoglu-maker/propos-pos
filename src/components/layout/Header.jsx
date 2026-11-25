import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { PPMotion } from "../../design/motion";
import {
  LayoutGrid, Store, Package, ChartColumn, Users, Wallet, Settings, Lock, LockOpen, KeyRound, Zap, RefreshCw
} from "../Icons";

const TITLES = {
  pos: ["Masalar", LayoutGrid],
  esnaf: ["Esnaf & Cari", Store],
  inventory: ["Stok & Reçete", Package],
  analytics: ["Analiz & Raporlar", ChartColumn],
  staff: ["Personel & Kasa", Users],
  finance: ["Ciro & Giderler", Wallet],
  settings: ["Yönetim & Düzenle", Settings]
};
// Dönem filtresi yalnızca rapor ekranlarında anlamlı; POS ekranını sadeleştirir (kademeli gösterim).
const PERIOD_TABS = ["analytics", "staff", "finance", "esnaf"];
const PERIODS = [["daily", "Bugün"], ["yesterday", "Dün"], ["weekly", "7 Gün"], ["monthly", "30 Gün"], ["all", "Tümü"], ["custom", "Tarih"]];

/** Hedef ilerlemesi: genişlik yerine scaleX (kompozitör). */
function GoalPill({ progress, goal, formatMoney }) {
  const ref = React.useRef(null);
  const prev = React.useRef(0);
  React.useEffect(() => {
    if (!ref.current || progress === null) return;
    PPMotion.progress(ref.current, progress, prev.current);
    prev.current = progress;
  }, [progress]);
  if (progress === null) return null;
  return (
    <span className="pp-pill is-primary pp-goal" title={`Günlük hedef ${formatMoney(goal)}`}>
      <span className="pp-goal-bar" aria-hidden="true"><span ref={ref} className="pp-goal-fill" /></span>
      %{Math.round(progress * 100)}
    </span>
  );
}

export function Header() {
  const {
    ACTIVE_TENANT_ID, brandSettings, activeCurrencyObj, openTablesTotalAmount, activeTab, handleTabNavigation,
    activeOccupiedCount, criticalIngredients, isAdminUnlocked, handleLockAdmin, setPendingProtectedTab,
    setPinInput, setPinError, setPinModalOpen, setSyncModalOpen, startFastEsnafOrder, cloudStatus, lastSyncedAt,
    isFounderUnlocked, setInstallModalOpen, setDealerStudioTab, dealerTenants, remoteUpdateInfo, isApplyingUpdate,
    applyRemoteOneClickUpdate, isCheckingUpdate, checkRemoteUpdateFromGithub, appVersion, handleSwitchToTenant,
    globalPeriod, setGlobalPeriod, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate,
    celebration, goalProgressToday
  } = usePos();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const tabs = [
    { id: "pos", label: "Masalar", icon: LayoutGrid, badge: activeOccupiedCount, isProtected: false },
    { id: "esnaf", label: "Esnaf", icon: Store, isProtected: false },
    { id: "inventory", label: "Stok", icon: Package, alertCount: criticalIngredients.length, isProtected: false },
    { id: "analytics", label: "Analiz", icon: ChartColumn, isProtected: true },
    { id: "staff", label: "Personel", icon: Users, isProtected: true },
    { id: "finance", label: "Finans", icon: Wallet, isProtected: true },
    { id: "settings", label: "Yönetim", icon: Settings, isProtected: true }
  ];
  const [title, TitleIcon] = TITLES[activeTab] || TITLES.pos;
  const openPin = () => { setPendingProtectedTab(null); setPinInput(""); setPinError(false); setPinModalOpen(true); };
  const syncLabel = { online: "Senkron", saving: "Kaydediliyor", offline: "Çevrimdışı", connecting: "Bağlanıyor", error: "Yeniden bağlanıyor" }[cloudStatus] || "Senkron";
  const syncTone = cloudStatus === "online" ? "is-ok" : cloudStatus === "saving" ? "is-primary" : "is-warn";
  const lockedPackage = typeof window !== "undefined" && !!window.__PROPOS_LOCKED_TENANT__;
  const item = (onClick, label) => (
    <button type="button" className="pp-menu-item" onClick={() => { setMenuOpen(false); onClick(); }}>{label}</button>
  );

  return (
    <header className="shrink-0 z-20 sticky top-0 lg:static">
      <div className="pp-topbar">
        {/* Mobil marka (masaüstünde kenar çubuğunda) */}
        <div className="flex lg:hidden items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate">{brandSettings.businessName || "ProPos"}</span>
          <span className="pp-pill is-primary pp-tight">{activeCurrencyObj.symbol} {formatTL(openTablesTotalAmount)}</span>
        </div>

        <h2 className="hidden lg:flex items-center gap-2 font-semibold text-white min-w-0">
          <TitleIcon className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="truncate">{title}</span>
        </h2>
        <span className="hidden xl:inline text-xs" style={{ color: "var(--text-3)" }}>
          {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
        </span>

        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          <button type="button" onClick={() => setSyncModalOpen(true)} className={`pp-pill pp-tight ${syncTone}`} title="Senkron durumu ve cihaz bağlama">
            {cloudStatus === "saving" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span className="pp-dot" />}
            <span>{syncLabel}{cloudStatus === "online" && lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </button>
          {celebration && <GoalPill progress={goalProgressToday} goal={celebration.goal} formatMoney={formatTL} />}

          {remoteUpdateInfo && (
            <button type="button" disabled={isApplyingUpdate} onClick={applyRemoteOneClickUpdate} className="pp-pill is-ok pp-tight">
              Yeni sürüm v{remoteUpdateInfo.version} — {isApplyingUpdate ? "yükleniyor…" : "güncelle"}
            </button>
          )}

          <button type="button" onClick={() => startFastEsnafOrder()} className="btn btn-secondary" style={{ minHeight: 40 }}>
            <Zap className="w-4 h-4" /> <span className="hidden sm:inline">Hızlı satış</span>
          </button>

          {isAdminUnlocked ? (
            <button type="button" onClick={handleLockAdmin} className="btn btn-secondary" style={{ minHeight: 40 }} title="Yöneticiyi kilitle">
              <Lock className="w-4 h-4" /> <span className="hidden sm:inline">Kilitle</span>
            </button>
          ) : (
            <button type="button" onClick={openPin} className="btn btn-secondary" style={{ minHeight: 40 }} title="Yönetici girişi">
              <LockOpen className="w-4 h-4" /> <span className="hidden sm:inline">Yönetici</span>
            </button>
          )}

          {/* Sistem menüsü: eski başlıktaki işletme kodu, güncelleme, bayi paneli, ana işletmeye dön */}
          <div className="relative" ref={menuRef}>
            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="btn btn-ghost" style={{ minHeight: 40 }}>
              <KeyRound className="w-4 h-4" /> <span className="hidden sm:inline">Sistem</span>
            </button>
            {menuOpen && (
              <div className="pp-menu" role="menu">
                <div className="px-3 py-2 text-xs" style={{ color: "var(--text-3)" }}>
                  İşletme kodu <span className="font-mono" style={{ color: "var(--text-1)" }}>{ACTIVE_TENANT_ID === "DEFAULT" ? "MASTER" : ACTIVE_TENANT_ID}</span>
                </div>
                {item(() => (isFounderUnlocked ? setInstallModalOpen(true) : setSyncModalOpen(true)), "Cihaz bağlama / QR")}
                {item(() => checkRemoteUpdateFromGithub(false), isCheckingUpdate ? "Kontrol ediliyor…" : `Güncelleme kontrolü (v${appVersion})`)}
                {item(() => window.dispatchEvent(new CustomEvent("propos-open-feedback")), "Geri bildirim gönder")}
                {isFounderUnlocked && item(() => { setDealerStudioTab("tenants"); setInstallModalOpen(true); }, `Bayi & Lisans Paneli (${dealerTenants.length})`)}
                {ACTIVE_TENANT_ID !== "DEFAULT" && !lockedPackage && (<><div className="pp-menu-sep" />{item(() => handleSwitchToTenant("DEFAULT"), "Ana işletmeye dön")}</>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {PERIOD_TABS.includes(activeTab) && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2" style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--line-soft)" }}>
          <div className="pp-seg overflow-x-auto no-scrollbar" role="group" aria-label="Dönem">
            {PERIODS.map(([id, label]) => (
              <button key={id} type="button" className={globalPeriod === id ? "is-on" : ""} onClick={() => setGlobalPeriod(id)}>{label}</button>
            ))}
          </div>
          {globalPeriod === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="rounded-lg px-2 py-1 bg-stone-950 border border-stone-800 text-white" />
              <span>–</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="rounded-lg px-2 py-1 bg-stone-950 border border-stone-800 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Mobil sekme çubuğu (masaüstünde kenar çubuğu var) */}
      <nav className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2" style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--line-soft)" }} aria-label="Sekmeler">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const on = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => handleTabNavigation(tab.id)} className={`pp-nav-item pp-tight ${on ? "is-active" : ""}`} style={{ width: "auto", flex: "none", minHeight: 40 }}>
              <IconComp className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.isProtected && !isAdminUnlocked && <Lock className="w-3 h-3 opacity-70" />}
              {tab.badge > 0 && <span className="pp-nav-badge" style={{ marginLeft: 4 }}>{tab.badge}</span>}
              {tab.alertCount > 0 && <span className="pp-nav-alert" style={{ marginLeft: 4 }}>! {tab.alertCount}</span>}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
