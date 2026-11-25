import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import {
  LayoutGrid,
  Store,
  Package,
  ChartColumn,
  Users,
  Wallet,
  Settings,
  Lock,
  LockOpen,
  KeyRound,
  Zap,
  RefreshCw,
  Smartphone
} from "../Icons";

export function Header() {
  const {
    ACTIVE_TENANT_ID,
    brandSettings,
    activeCurrencyObj,
    openTablesTotalAmount,
    activeTab,
    handleTabNavigation,
    activeOccupiedCount,
    criticalIngredients,
    isAdminUnlocked,
    handleLockAdmin,
    setPendingProtectedTab,
    setPinInput,
    setPinError,
    setPinModalOpen,
    setSyncModalOpen,
    startFastEsnafOrder,
    cloudStatus,
    lastSyncedAt,
    isFounderUnlocked,
    setInstallModalOpen,
    setDealerStudioTab,
    dealerTenants,
    remoteUpdateInfo,
    isApplyingUpdate,
    applyRemoteOneClickUpdate,
    isCheckingUpdate,
    checkRemoteUpdateFromGithub,
    appVersion,
    handleSwitchToTenant,
    globalPeriod,
    setGlobalPeriod,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate
  } = usePos();

  const tabs = [
    { id: "pos", label: "Masa & Adisyon", icon: LayoutGrid, badge: activeOccupiedCount, isProtected: false },
    { id: "esnaf", label: "Esnaf & Cari", icon: Store, isProtected: false },
    { id: "inventory", label: "Stok & Reçete", icon: Package, alertCount: criticalIngredients.length, isProtected: false },
    { id: "analytics", label: "Analiz & Raporlar", icon: ChartColumn, isProtected: true },
    { id: "staff", label: "Çalışan & Kasa", icon: Users, isProtected: true },
    { id: "finance", label: "Ciro & Giderler", icon: Wallet, isProtected: true },
    { id: "settings", label: "Yönetim & Düzenle", icon: Settings, isProtected: true }
  ];

  return (
    <header className="px-3 sm:px-5 lg:px-7 py-2.5 sm:py-3 bg-[#110f0d]/95 backdrop-blur-xl border-b border-stone-800/80 flex flex-col gap-2.5 shrink-0 z-20 sticky top-0 lg:static">
      {/* Mobil Üst Bar */}
      <div className="flex lg:hidden items-center justify-between gap-2 pb-2 border-b border-stone-800/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-stone-950 font-black text-base ring-1 ring-white/20 shrink-0 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${brandSettings.customPrimary}, ${brandSettings.customSecondary})`
            }}
          >
            {brandSettings.logoType === "image" && brandSettings.logoImageUrl ? (
              <img src={brandSettings.logoImageUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : brandSettings.logoType === "emoji" ? (
              <span className="text-lg">{brandSettings.logoEmoji || "☕"}</span>
            ) : (
              <span>{(brandSettings.logoText || brandSettings.businessName?.[0] || "P").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white truncate">{brandSettings.businessName || "ProPos"}</h1>
              <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/30 shrink-0">
                {activeCurrencyObj.symbol} {formatTL(openTablesTotalAmount)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Canlı Senkron Aktif</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => startFastEsnafOrder()}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 text-[11px] font-black flex items-center gap-1 shadow"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Tezgah /</span> Esnaf
          </button>
          {isAdminUnlocked ? (
            <button
              onClick={handleLockAdmin}
              className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300"
              title="Yöneticiyi Kilitle"
            >
              <Lock className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setPendingProtectedTab(null);
                setPinInput("");
                setPinError(false);
                setPinModalOpen(true);
              }}
              className="p-2 rounded-xl bg-stone-900 border border-stone-700 text-amber-400"
              title="Yönetici Girişi"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Masaüstü Başlık & Küresel Filtreler */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="hidden lg:block min-w-0">
          <h2 className="text-lg xl:text-xl font-black text-white flex items-center gap-2 tracking-tight truncate">
            {activeTab === "pos" && (
              <>
                <LayoutGrid className="w-5 h-5 text-amber-400 shrink-0" /> Masa Düzeni & Adisyon Yönetimi
              </>
            )}
            {activeTab === "esnaf" && (
              <>
                <Store className="w-5 h-5 text-amber-400 shrink-0" /> Çevre Esnaf Cari Hesap & Tahsilat Merkezi
              </>
            )}
            {activeTab === "analytics" && (
              <>
                <ChartColumn className="w-5 h-5 text-amber-400 shrink-0" /> Kurumsal Analiz, Grafik & Raporlama Merkezi
              </>
            )}
            {activeTab === "staff" && (
              <>
                <Users className="w-5 h-5 text-amber-400 shrink-0" /> Personel Performansı & Kasa Dağılımı
              </>
            )}
            {activeTab === "inventory" && (
              <>
                <Package className="w-5 h-5 text-amber-400 shrink-0" /> Reçete Bazlı Stok & Maliyet Kontrolü
              </>
            )}
            {activeTab === "finance" && (
              <>
                <Wallet className="w-5 h-5 text-amber-400 shrink-0" /> Kurumsal Ciro, Giderler & Bilanço
              </>
            )}
            {activeTab === "settings" && (
              <>
                <Settings className="w-5 h-5 text-amber-400 shrink-0" /> Sistem Yapılandırma & Yönetim Paneli
              </>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-0.5">
            <p className="text-xs text-stone-400 font-medium">
              {new Date().toLocaleDateString("tr-TR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </p>
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                cloudStatus === "online"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : cloudStatus === "saving"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-orange-500/20 text-orange-300 border-orange-500/40"
              }`}
            >
              {cloudStatus === "online" && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
              {cloudStatus === "saving" && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}
              <Smartphone className="w-3 h-3" />
              <span>
                {cloudStatus === "online" &&
                  `PC & Mobil Canlı Senkron${
                    lastSyncedAt
                      ? ` • ${new Date(lastSyncedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
                      : ""
                  }`}
                {cloudStatus === "saving" && "Buluta Senkronize Ediliyor..."}
                {cloudStatus === "offline" && "Çevrimdışı Koruma Modu"}
                {cloudStatus === "connecting" && "Sunucuya Bağlanıyor..."}
                {cloudStatus === "error" && "Bağlantı Yenileniyor..."}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (isFounderUnlocked) setInstallModalOpen(true);
                else setSyncModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
            >
              🏢 İşletme Kodu:{" "}
              <span className="font-mono font-black text-white">
                {ACTIVE_TENANT_ID === "DEFAULT" ? "PICKYS-MASTER" : ACTIVE_TENANT_ID}
              </span>
            </button>
            {remoteUpdateInfo ? (
              <button
                type="button"
                disabled={isApplyingUpdate}
                onClick={applyRemoteOneClickUpdate}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-emerald-400 to-teal-400 text-stone-950 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/30 animate-pulse transition-all"
              >
                ✨ Yeni Güncelleme Hazır (v{remoteUpdateInfo.version}) —{" "}
                {isApplyingUpdate ? "Yükleniyor..." : "🚀 Tek Tıkla Güncelle"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isCheckingUpdate}
                onClick={() => checkRemoteUpdateFromGithub(false)}
                title="GitHub üzerinden yeni güncelleme ve lisans durumunu kontrol et"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-900 text-stone-300 border border-stone-700 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? "animate-spin text-emerald-400" : "text-emerald-400"}`} />
                v{appVersion} • {isCheckingUpdate ? "Kontrol Ediliyor..." : "Güncelleme Kontrol"}
              </button>
            )}
            {ACTIVE_TENANT_ID !== "DEFAULT" && !(typeof window !== "undefined" && window.__PROPOS_LOCKED_TENANT__) && (
              <button
                type="button"
                onClick={() => handleSwitchToTenant("DEFAULT")}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-stone-950 hover:bg-emerald-400 transition-all shadow"
              >
                👑 Ana Mağazaya (PICKY&apos;S) Dön
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
          <div className="hidden lg:flex items-center gap-2">
            {isFounderUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setDealerStudioTab("tenants");
                  setInstallModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                👑 Bayi & Müşteri Lisans Paneli ({dealerTenants.length})
              </button>
            )}
            {isAdminUnlocked ? (
              <button
                onClick={handleLockAdmin}
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Yöneticiyi Kilitle
              </button>
            ) : (
              <button
                onClick={() => {
                  setPendingProtectedTab(null);
                  setPinInput("");
                  setPinError(false);
                  setPinModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1.5"
              >
                <LockOpen className="w-3.5 h-3.5 text-amber-400" /> Yönetici Aç
              </button>
            )}
            <button
              onClick={() => startFastEsnafOrder()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4" /> Hızlı Esnaf / Tezgah Satışı
            </button>
          </div>

          <div className="w-full md:w-auto flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 overflow-x-auto no-scrollbar">
            {[
              { id: "daily", label: "Bugün" },
              { id: "yesterday", label: "Dün" },
              { id: "weekly", label: "7 Gün" },
              { id: "monthly", label: "30 Gün" },
              { id: "all", label: "Tümü" },
              { id: "custom", label: "📅 Tarih" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setGlobalPeriod(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  globalPeriod === p.id ? "bg-amber-500 text-stone-950 shadow" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {globalPeriod === "custom" && (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 bg-stone-900 px-2.5 py-1.5 rounded-xl border border-amber-500/40 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full sm:w-auto bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-amber-500"
              />
              <span className="text-stone-500 font-bold">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full sm:w-auto bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sekme Gezinme Çubuğu */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-stone-800/70">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabNavigation(tab.id)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 ${
                isAct
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 shadow-md shadow-amber-500/20"
                  : "bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800"
              }`}
            >
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.isProtected && !isAdminUnlocked && <Lock className="w-3 h-3 opacity-75 shrink-0" />}
              {tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isAct ? "bg-stone-950/20 text-stone-950" : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.alertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                  ! {tab.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
