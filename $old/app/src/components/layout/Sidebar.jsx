import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL, isWithinPeriod } from "../../utils/formatters";
import {
  LayoutGrid,
  Store,
  Package,
  ChartColumn,
  Users,
  Wallet,
  Settings,
  Lock,
  KeyRound,
  TriangleAlert
} from "../Icons";

export function Sidebar() {
  const {
    brandSettings,
    activeTab,
    handleTabNavigation,
    activeOccupiedCount,
    criticalIngredients,
    isAdminUnlocked,
    openTablesTotalAmount,
    activeCurrencyObj,
    sales,
    handleLockAdmin,
    setPendingProtectedTab,
    setPinInput,
    setPinError,
    setPinModalOpen
  } = usePos();

  const navItems = [
    { id: "pos", label: "Masa & Adisyon", icon: LayoutGrid, badge: `${activeOccupiedCount} Aktif`, isProtected: false },
    { id: "esnaf", label: "Esnaf & Cari Hesap", icon: Store, isProtected: false },
    { id: "inventory", label: "Stok & Reçete", icon: Package, alertCount: criticalIngredients.length, isProtected: false },
    { id: "analytics", label: "Analiz & Raporlar", icon: ChartColumn, isProtected: true },
    { id: "staff", label: "Çalışan & Kasa Özeti", icon: Users, isProtected: true },
    { id: "finance", label: "Ciro & Giderler", icon: Wallet, isProtected: true },
    { id: "settings", label: "Yönetim & Düzenle", icon: Settings, isProtected: true }
  ];

  const todayNetCash = sales
    .filter(
      (s) =>
        isWithinPeriod(s.timestamp, "daily") &&
        s.paymentMethod !== "İkram / İptal" &&
        s.paymentMethod !== "Esnaf Cariye Yazıldı"
    )
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <aside className="hidden lg:flex lg:w-68 xl:w-72 lg:h-screen bg-[#110f0d]/95 backdrop-blur-2xl border-r border-stone-800/80 flex-col justify-between shrink-0 z-30 shadow-2xl overflow-y-auto">
      <div>
        <div className="p-5 flex items-center gap-3.5 border-b border-stone-800/80 relative overflow-hidden">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl text-stone-950 font-black text-xl ring-2 ring-white/20 shrink-0 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${brandSettings.customPrimary}, ${brandSettings.customSecondary})`
            }}
          >
            {brandSettings.logoType === "image" && brandSettings.logoImageUrl ? (
              <img src={brandSettings.logoImageUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : brandSettings.logoType === "emoji" ? (
              <span className="text-2xl">{brandSettings.logoEmoji || "☕"}</span>
            ) : (
              <span>{(brandSettings.logoText || brandSettings.businessName?.[0] || "P").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-white truncate">
                {brandSettings.businessName || "ProPos"}
              </h1>
              {brandSettings.badgeText && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0">
                  {brandSettings.badgeText}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 font-medium tracking-wide truncate">
              {brandSettings.subtitle || "Kurumsal POS & Bulut ERP Sistemi"}
            </p>
          </div>
        </div>

        <nav className="p-3 flex flex-col gap-1.5">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabNavigation(item.id)}
                className={`group relative flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs xl:text-sm font-bold transition-all duration-200 whitespace-nowrap overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-stone-950 shadow-lg shadow-amber-500/25"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/50 border border-transparent hover:border-stone-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? "bg-stone-950/15 text-stone-950" : "bg-stone-900 text-amber-400 border border-stone-800"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="tracking-tight truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.isProtected && !isAdminUnlocked && (
                    <Lock className={`w-3.5 h-3.5 ${isActive ? "text-stone-950" : "text-stone-500 group-hover:text-amber-400"}`} />
                  )}
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isActive
                          ? "bg-stone-950/20 text-stone-950"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.alertCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 ${
                        isActive
                          ? "bg-stone-950 text-amber-400"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                      }`}
                    >
                      <TriangleAlert className="w-3 h-3" /> {item.alertCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-b from-stone-900/90 to-stone-950 border border-stone-800/90 shadow-inner space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-stone-400 block truncate">Açık Masalardaki Tutar</span>
            <p className="text-xl xl:text-2xl font-black text-amber-400 mt-0.5 truncate">
              {formatTL(openTablesTotalAmount)}
            </p>
          </div>
          <div
            title={`Aktif Para Birimi: ${activeCurrencyObj.name}`}
            className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-inner shrink-0"
          >
            <span className="text-lg font-black text-amber-400">{activeCurrencyObj.symbol}</span>
          </div>
        </div>

        {isAdminUnlocked ? (
          <div className="pt-2.5 border-t border-stone-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>Bugünkü Net Kasa:</span>
              <span className="font-extrabold text-emerald-400">{formatTL(todayNetCash)}</span>
            </div>
            <button
              onClick={handleLockAdmin}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" /> Yöneticiyi Kilitle
            </button>
          </div>
        ) : (
          <div className="pt-2.5 border-t border-stone-800/80">
            <button
              onClick={() => {
                setPendingProtectedTab(null);
                setPinInput("");
                setPinError(false);
                setPinModalOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Yönetici Girişi (PIN)
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
