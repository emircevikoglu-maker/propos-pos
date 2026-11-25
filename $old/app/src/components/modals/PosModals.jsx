import React from "react";
import { usePos } from "../../context/PosContext";
import { QUICK_ORDER_NOTES } from "../../constants/initialData";
import { formatTL, formatDateShort } from "../../utils/formatters";
import { Cloud, X, RefreshCw, Download, Lock, Store } from "../Icons";

export function PosModals() {
  const {
    ACTIVE_TENANT_ID,
    clientDeviceId,
    brandSettings,
    founderPromptOpen,
    setFounderPromptOpen,
    founderPromptInput,
    setFounderPromptInput,
    founderMasterKey,
    setIsAdminUnlocked,
    setIsFounderUnlocked,
    setInstallModalOpen,
    showToast,
    isCurrentTenantBlocked,
    isCurrentTenantExpired,
    currentTenantRecord,
    licenseUnlockInput,
    setLicenseUnlockInput,
    handleToggleCustomerStatus,
    handleSwitchToTenant,
    syncModalOpen,
    setSyncModalOpen,
    lastSyncedAt,
    handleManualForceSync,
    exportFullBackupFile,
    pinModalOpen,
    setPinModalOpen,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    adminPin,
    handleVerifyPin,
    switchTenantInput,
    setSwitchTenantInput,
    setPendingProtectedTab,
    transferModalOpen,
    setTransferModalOpen,
    activeTable,
    tables,
    handleTransferTable,
    partialPayModalOpen,
    setPartialPayModalOpen,
    partialPayAmount,
    setPartialPayAmount,
    handlePartialPayment,
    setEsnafChargeMode,
    selectedEsnafForCharge,
    setSelectedEsnafForCharge,
    esnafList,
    setEsnafChargeModalOpen,
    esnafChargeModalOpen,
    esnafChargeMode,
    applyEsnafDiscount,
    setApplyEsnafDiscount,
    esnafOrderNote,
    setEsnafOrderNote,
    quickNewEsnafName,
    setQuickNewEsnafName,
    handleQuickCreateEsnaf,
    handleConfirmEsnafCharge,
    esnafCollectModal,
    setEsnafCollectModal,
    handleCollectEsnafPayment,
    esnafCollectAmount,
    setEsnafCollectAmount,
    esnafCollectMethod,
    setEsnafCollectMethod,
    esnafCollectStaffId,
    setEsnafCollectStaffId,
    staffList,
    esnafCollectNote,
    setEsnafCollectNote,
    noteModalItem,
    setNoteModalItem,
    saveItemNote,
    stockModalIng,
    setStockModalIng,
    handleStockAdjustment,
    stockAdjustType,
    setStockAdjustType,
    stockAdjustAmount,
    setStockAdjustAmount,
    setStockExpenseCost,
    recordAsExpense,
    setRecordAsExpense,
    stockExpenseCost,
    inspectedSale,
    setInspectedSale,
    resetConfirmOpen,
    setResetConfirmOpen,
    handleResetDemoData
  } = usePos();

  const lanUrl =
    "http://" +
    (window.__PROPOS_LAN_IP__ || "192.168.1.8") +
    ":8586" +
    (ACTIVE_TENANT_ID === "DEFAULT" ? "" : "/?tenant=" + ACTIVE_TENANT_ID);

  return (
    <>
      {/* Kurucu Master Girişi Modalı (Ctrl+Shift+K) */}
      {founderPromptOpen && (
        <div className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-amber-500/50 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">👑 Kurucu Master Girişi</h3>
              <button onClick={() => setFounderPromptOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-300">
              Bayi ve Lisans Yönetim Stüdyosunu açmak için gizli Kurucu Master Şifrenizi girin:
            </p>
            <input
              type="password"
              value={founderPromptInput}
              onChange={(e) => setFounderPromptInput(e.target.value)}
              placeholder="Kurucu Master Şifresi..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    founderPromptInput.trim() === founderMasterKey ||
                    (founderMasterKey === "PICKYS9999" && founderPromptInput.trim() === "9999")
                  ) {
                    setIsAdminUnlocked(true);
                    setIsFounderUnlocked(true);
                    setFounderPromptOpen(false);
                    setFounderPromptInput("");
                    setInstallModalOpen(true);
                    showToast("👑 Kurucu Master yetkisi doğrulandı!");
                  } else {
                    showToast("❌ Hatalı Kurucu Master Şifresi!");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs"
              >
                Doğrula ve Aç
              </button>
              <button
                type="button"
                onClick={() => setFounderPromptOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lisans Askıda / Süresi Doldu Ekranı */}
      {isCurrentTenantBlocked && !isFounderUnlocked && (
        <div className="fixed inset-0 z-[90] bg-[#080706]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161311] border-2 border-rose-500/60 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 text-3xl">
              🔒
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-widest border border-rose-500/30">
                {isCurrentTenantExpired ? "LİSANS SÜRESİ DOLDU" : "LİSANS ASKIYA ALINDI"}
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                {currentTenantRecord?.businessName || brandSettings.businessName}
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Bu işletme hesabının (<b className="text-amber-400 font-mono">{ACTIVE_TENANT_ID}</b>) kullanım lisansı{" "}
                {isCurrentTenantExpired
                  ? "sona ermiştir."
                  : "yazılım yöneticisi tarafından geçici olarak durdurulmuştur."}{" "}
                Hizmete devam etmek için lütfen yazılım sağlayıcınızla iletişime geçin.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2.5 text-left text-xs">
              <label className="text-stone-400 font-bold block">🔑 Lisans Aktivasyon Anahtarı:</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={licenseUnlockInput}
                  onChange={(e) => setLicenseUnlockInput(e.target.value)}
                  placeholder="PROPOS-... Lisans Anahtarınızı girin"
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      licenseUnlockInput.trim() === founderMasterKey ||
                      (currentTenantRecord &&
                        licenseUnlockInput.trim().toUpperCase() === currentTenantRecord.licenseKey)
                    ) {
                      if (currentTenantRecord) handleToggleCustomerStatus(currentTenantRecord.tenantId);
                      setIsAdminUnlocked(true);
                      if (licenseUnlockInput.trim() === founderMasterKey) setIsFounderUnlocked(true);
                      setLicenseUnlockInput("");
                    } else {
                      showToast("❌ Geçersiz Lisans Aktivasyon Anahtarı!");
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs"
                >
                  Etkinleştir
                </button>
              </div>
            </div>
            {!(typeof window !== "undefined" && window.__PROPOS_LOCKED_TENANT__) && (
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchToTenant("DEFAULT")}
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold"
                >
                  🏢 Ana İşletmeye (PICKY&apos;S) Dön
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Canlı Bulut & QR Senkronizasyon Modalı */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-emerald-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Canlı Bulut & Cihaz Senkronizasyonu</h3>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    Aktif İşletme Kodu: {ACTIVE_TENANT_ID === "DEFAULT" ? "PICKYS-MASTER" : ACTIVE_TENANT_ID}
                  </p>
                </div>
              </div>
              <button onClick={() => setSyncModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-stone-900 to-stone-950 border border-amber-500/40 flex flex-col sm:flex-row items-center gap-3.5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=6&data=${encodeURIComponent(
                    lanUrl
                  )}`}
                  alt="Mobil QR"
                  className="w-28 h-28 rounded-xl bg-white p-1.5 shrink-0 shadow-lg"
                />
                <div className="space-y-1.5 text-center sm:text-left min-w-0 flex-1">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    📱 Telefondan Anlık Bağlan (Wi-Fi)
                  </div>
                  <p className="text-[11px] text-stone-300 leading-snug">
                    Telefonunuzun kamerasıyla QR kodu okutun veya tarayıcıya aşağıdaki adresi yazın:
                  </p>
                  <div
                    onClick={() => {
                      if (navigator.clipboard) navigator.clipboard.writeText(lanUrl);
                      showToast("📋 Mobil bağlantı adresi kopyalandı: " + lanUrl);
                    }}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-stone-950 border border-amber-500/50 font-mono text-xs font-black text-emerald-400 hover:border-amber-400 truncate"
                  >
                    {lanUrl}
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                <span className="text-stone-400">Aktif Cihaz Kimliği:</span>
                <span className="font-mono font-bold text-amber-400">{clientDeviceId}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                <span className="text-stone-400">Son Bulut Eşitleme Saati:</span>
                <span className="font-bold text-emerald-400">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString("tr-TR") : "Az önce"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualForceSync}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Şimdi Zorla Eşitle
              </button>
              <button
                type="button"
                onClick={exportFullBackupFile}
                className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold text-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Yedek Al
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yönetici PIN Giriş Modalı */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-amber-500/40 rounded-2xl max-w-xs w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Yönetici Girişi Gerekli</h3>
              <p className="text-xs text-stone-400 mt-1">
                Raporlar, Kasa Özeti ve Yönetim ekranlarına erişmek için işletme PIN kodunuzu girin.
              </p>
            </div>
            <div className="flex justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-11 h-12 rounded-xl border flex items-center justify-center text-xl font-black ${
                    pinError
                      ? "border-rose-500 bg-rose-950/30 text-rose-400"
                      : pinInput.length > i
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-stone-800 bg-stone-900 text-stone-600"
                  }`}
                >
                  {pinInput[i] ? "•" : ""}
                </div>
              ))}
            </div>
            {pinError && <p className="text-xs font-bold text-rose-400">Hatalı PIN kodu! Lütfen tekrar deneyin.</p>}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    setPinError(false);
                    const next = (pinInput + digit).slice(0, 6);
                    setPinInput(next);
                    if (next.length === adminPin.length) handleVerifyPin(next);
                  }}
                  className="py-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-base font-black text-white active:scale-95 transition-all"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPinInput("");
                  setPinError(false);
                }}
                className="py-3 rounded-xl bg-stone-900 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-stone-800"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinError(false);
                  const next = (pinInput + "0").slice(0, 6);
                  setPinInput(next);
                  if (next.length === adminPin.length) handleVerifyPin(next);
                }}
                className="py-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-base font-black text-white active:scale-95 transition-all"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleVerifyPin()}
                className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-stone-950"
              >
                Giriş
              </button>
            </div>
            {!(typeof window !== "undefined" && window.__PROPOS_LOCKED_TENANT__) && (
              <div className="pt-2 border-t border-stone-800 space-y-1.5 text-left">
                <span className="text-[10px] font-bold text-stone-400 block">🏢 Müşteri İşletme Kodu ile Bağlan:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={switchTenantInput}
                    onChange={(e) => setSwitchTenantInput(e.target.value.toUpperCase())}
                    placeholder="İşletme Kodu..."
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSwitchToTenant(switchTenantInput)}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[11px] font-black text-stone-200"
                  >
                    Bağlan
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPinModalOpen(false);
                setPendingProtectedTab(null);
              }}
              className="w-full py-2 rounded-xl bg-stone-800 text-xs font-bold text-stone-400 hover:text-white"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Masa Taşı / Birleştir Modalı */}
      {transferModalOpen && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{activeTable.name} Adisyonunu Başka Masaya Aktar</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Boş bir masa seçerseniz masa taşınır, dolu bir masa seçerseniz iki masanın adisyonu birleştirilir:
            </p>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {tables
                .filter((t) => t.id !== activeTable.id)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTransferTable(t.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      t.status === "occupied"
                        ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                        : "bg-stone-900 border-stone-800 text-stone-200 hover:border-amber-500"
                    }`}
                  >
                    <div>{t.name}</div>
                    <span className="text-[10px] opacity-75">
                      {t.status === "occupied" ? "Dolu (Birleştir)" : "Boş (Taşı)"}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Alman Usulü / Kısmi Ödeme Modalı */}
      {partialPayModalOpen && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-stone-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Alman Usulü / Kısmi Tahsilat</h3>
              <button onClick={() => setPartialPayModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Tahsil Edilecek Tutar (TL)</label>
              <input
                type="number"
                value={partialPayAmount}
                onChange={(e) => setPartialPayAmount(e.target.value)}
                placeholder="Örn: 150"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-lg font-black text-amber-400"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePartialPayment("Nakit")}
                className="py-2.5 rounded-xl bg-emerald-600 text-stone-950 font-extrabold text-xs"
              >
                Nakit Al
              </button>
              <button
                onClick={() => handlePartialPayment("Kredi Kartı")}
                className="py-2.5 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-xs"
              >
                Kartla Al
              </button>
              <button
                onClick={() => handlePartialPayment("Yemek Kartı")}
                className="py-2.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs"
              >
                Yemek Kartı
              </button>
            </div>
            <button
              onClick={() => {
                if (!partialPayAmount || Number(partialPayAmount) <= 0) return;
                setEsnafChargeMode("partial");
                if (!selectedEsnafForCharge && esnafList.length > 0) {
                  setSelectedEsnafForCharge(esnafList[0].id);
                }
                setEsnafChargeModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500 border border-orange-500/40 text-orange-300 hover:text-stone-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Store className="w-4 h-4" /> Bu Kısmi Tutarı Esnaf Cariye Yaz
            </button>
          </div>
        </div>
      )}

      {/* Esnaf Cariye Yazma Modalı */}
      {esnafChargeModalOpen && activeTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-orange-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  {esnafChargeMode === "partial" ? "Kısmi Cari Aktarım" : "Adisyonu Cariye Yaz"}
                </span>
                <h3 className="text-lg font-black text-white mt-1">Hangi Komşu Esnafa Yazılsın?</h3>
              </div>
              <button onClick={() => setEsnafChargeModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {esnafList.map((esn) => {
                const isPicked = selectedEsnafForCharge === esn.id;
                return (
                  <button
                    key={esn.id}
                    type="button"
                    onClick={() => setSelectedEsnafForCharge(esn.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isPicked
                        ? "bg-orange-500/20 border-orange-500 text-white shadow-lg"
                        : "bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-extrabold truncate">{esn.name}</p>
                      <span className="text-[10px] text-amber-400 block">%{esn.discountRate} Esnaf İndirimi</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-400 block">Bakiye</span>
                      <span className="text-xs font-black text-orange-400">{formatTL(esn.balance)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {(() => {
              const pickedEsnaf = esnafList.find((e) => e.id === selectedEsnafForCharge);
              const subtotal = activeTable.items.reduce((s, i) => s + i.price * i.qty, 0);
              const baseRem = Math.max(0, subtotal - (activeTable.discount || 0) - (activeTable.paidAmount || 0));
              const discAmt =
                esnafChargeMode === "full" && applyEsnafDiscount && pickedEsnaf?.discountRate && !activeTable.discount
                  ? Math.round((baseRem * pickedEsnaf.discountRate) / 100)
                  : 0;
              const finalToCharge =
                esnafChargeMode === "partial"
                  ? Math.min(baseRem, Math.max(1, Number(partialPayAmount) || 0))
                  : Math.max(0, baseRem - discAmt);

              return (
                <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-3 text-xs">
                  {esnafChargeMode === "full" && pickedEsnaf?.discountRate > 0 && !activeTable.discount && (
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-stone-200">
                        {pickedEsnaf.name} Özel Esnaf İndirimi (%{pickedEsnaf.discountRate}) Uygulansın mı?
                      </span>
                      <input
                        type="checkbox"
                        checked={applyEsnafDiscount}
                        onChange={(e) => setApplyEsnafDiscount(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                    </label>
                  )}
                  <input
                    type="text"
                    value={esnafOrderNote}
                    onChange={(e) => setEsnafOrderNote(e.target.value)}
                    placeholder="Sipariş notu (Örn: Çırak Ali aldı, 3 çay 1 tost...)"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white"
                  />
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-stone-400 font-bold">Cariye Yazılacak Net Tutar:</span>
                    <span className="text-xl font-black text-orange-400">{formatTL(finalToCharge)}</span>
                  </div>
                </div>
              );
            })()}
            <div className="pt-2 border-t border-stone-800 flex gap-2 text-xs">
              <input
                type="text"
                value={quickNewEsnafName}
                onChange={(e) => setQuickNewEsnafName(e.target.value)}
                placeholder="Listede yoksa hızlı yeni esnaf adı yaz..."
                className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
              />
              <button
                type="button"
                onClick={handleQuickCreateEsnaf}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold"
              >
                + Hızlı Ekle
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEsnafChargeModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmEsnafCharge}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 font-black text-xs shadow-lg shadow-orange-500/20"
              >
                Onayla ve Esnaf Carisine Yaz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Esnaf Tahsilat Modalı */}
      {esnafCollectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCollectEsnafPayment}
            className="bg-[#181512] border border-emerald-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  Cari Hesap Tahsilatı
                </span>
                <h3 className="text-base font-black text-white mt-1">{esnafCollectModal.name}</h3>
                <p className="text-xs text-stone-400">
                  Güncel Borç: <strong className="text-orange-400">{formatTL(esnafCollectModal.balance)}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setEsnafCollectModal(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-stone-400 font-semibold">Tahsil Edilen Tutar (TL)</label>
                  <button
                    type="button"
                    onClick={() => setEsnafCollectAmount(String(esnafCollectModal.balance))}
                    className="text-amber-400 font-bold hover:underline"
                  >
                    Tüm Borcu Seç ({formatTL(esnafCollectModal.balance)})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={esnafCollectAmount}
                  onChange={(e) => setEsnafCollectAmount(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-lg font-black text-emerald-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-stone-400 font-semibold block mb-1">Ödeme Yöntemi</label>
                  <select
                    value={esnafCollectMethod}
                    onChange={(e) => setEsnafCollectMethod(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-bold"
                  >
                    <option>Nakit</option>
                    <option>Kredi Kartı</option>
                    <option>Yemek Kartı</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-400 font-semibold block mb-1">Tahsilatı Alan Çalışan</label>
                  <select
                    value={esnafCollectStaffId}
                    onChange={(e) => setEsnafCollectStaffId(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-bold"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-stone-400 font-semibold block mb-1">Açıklama / Not</label>
                <input
                  type="text"
                  value={esnafCollectNote}
                  onChange={(e) => setEsnafCollectNote(e.target.value)}
                  placeholder="Örn: Haftalık hesap kapatma..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEsnafCollectModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-xs"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs"
              >
                Tahsilatı Onayla & Kasaya İşle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sipariş Notu Modalı */}
      {noteModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-stone-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">{noteModalItem.name} - Sipariş Notu</h3>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ORDER_NOTES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("order-note-input");
                    if (input) input.value = input.value ? `${input.value}, ${chip}` : chip;
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-amber-500 hover:text-stone-950 border border-stone-800 text-[11px] font-bold text-stone-300 transition-all"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <input
              type="text"
              defaultValue={noteModalItem.note}
              id="order-note-input"
              placeholder="Örn: Laktozsuz süt, az buzlu, ekstra sıcak..."
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNoteModalItem(null)} className="px-4 py-2 rounded-xl bg-stone-800 text-xs">
                Vazgeç
              </button>
              <button
                onClick={() => {
                  const val = document.getElementById("order-note-input")?.value || "";
                  saveItemNote(noteModalItem.id, val);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Notu Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stok Düzenleme Modalı */}
      {stockModalIng && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleStockAdjustment}
            className="bg-[#181512] border border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">{stockModalIng.name} Stok İşlemi</h3>
              <button type="button" onClick={() => setStockModalIng(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: "add", label: "+ Stok Girişi (Alım)" },
                { id: "waste", label: "- Zayi / Düşüm" },
                { id: "set", label: "= Sayım Sabitle" }
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setStockAdjustType(t.id)}
                  className={`py-2 px-2 rounded-xl font-bold border ${
                    stockAdjustType === t.id
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-stone-900 border-stone-800 text-stone-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">
                Miktar ({stockModalIng.unit}) - Mevcut: {stockModalIng.stock} {stockModalIng.unit}
              </label>
              <input
                type="number"
                required
                min="1"
                value={stockAdjustAmount}
                onChange={(e) => {
                  setStockAdjustAmount(e.target.value);
                  setStockExpenseCost(String(Math.round(Number(e.target.value) * stockModalIng.unitCost)));
                }}
                placeholder={`Örn: 1000 ${stockModalIng.unit}`}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm font-bold text-white"
              />
            </div>
            {stockAdjustType === "add" && (
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordAsExpense}
                    onChange={(e) => setRecordAsExpense(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span className="font-semibold text-stone-200">Bu alımı Giderler tablosuna da otomatik işle</span>
                </label>
                {recordAsExpense && (
                  <div>
                    <label className="text-stone-400 block mb-1">Toplam Alım Fatura Tutarı (TL)</label>
                    <input
                      type="number"
                      value={stockExpenseCost}
                      onChange={(e) => setStockExpenseCost(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-amber-400 font-bold"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStockModalIng(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-xs"
              >
                İptal
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 text-stone-950 font-extrabold text-xs">
                Stoku Güncelle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Adisyon Fişi İnceleme Modalı */}
      {inspectedSale && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-stone-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{brandSettings.businessName} ADİSYON FİŞİ</h3>
                <p className="text-xs text-stone-400">
                  {formatDateShort(inspectedSale.timestamp)} • {inspectedSale.tableName}
                </p>
              </div>
              <button onClick={() => setInspectedSale(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {inspectedSale.items.map((item, i) => (
                <div key={i} className="flex justify-between text-stone-200">
                  <span>
                    {item.qty}x {item.name}
                  </span>
                  <span className="font-bold">{formatTL(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-stone-800 text-xs space-y-1">
              <div className="flex justify-between text-stone-400">
                <span>Ödeme Yöntemi:</span>
                <span className="font-bold text-white">{inspectedSale.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-base font-black text-amber-400 pt-1">
                <span>TOPLAM:</span>
                <span>{formatTL(inspectedSale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Verilerini Sıfırlama Onay Modalı */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181512] border border-stone-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Verileri Sıfırlamak İstiyor Musunuz?</h3>
            <p className="text-xs text-stone-400">
              Eklediğiniz özel adisyonlar sıfırlanacak ve Pick&apos;s Café başlangıç demo verileri yeniden yüklenecektir.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetConfirmOpen(false)} className="px-4 py-2 rounded-xl bg-stone-800 text-xs">
                Vazgeç
              </button>
              <button
                onClick={handleResetDemoData}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
