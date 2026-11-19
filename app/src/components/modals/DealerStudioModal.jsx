import React from "react";
import { usePos } from "../../context/PosContext";
import { THEME_PRESETS } from "../../constants/initialData";
import { X, Download } from "../Icons";

export function DealerStudioModal() {
  const {
    ACTIVE_TENANT_ID,
    installModalOpen,
    setInstallModalOpen,
    isFounderUnlocked,
    dealerTenants,
    appVersion,
    dealerStudioTab,
    setDealerStudioTab,
    handleCreateCustomerTenant,
    newCustName,
    setNewCustName,
    newCustCode,
    setNewCustCode,
    newCustPin,
    setNewCustPin,
    newCustOwner,
    setNewCustOwner,
    newCustPlan,
    setNewCustPlan,
    newCustTheme,
    setNewCustTheme,
    newCustTemplate,
    setNewCustTemplate,
    handleSwitchToTenant,
    downloadCustomerZipPackage,
    downloadStandaloneAppHtml,
    copyCustomerDeliveryMessage,
    handleToggleCustomerStatus,
    handleExtendCustomerLicense,
    handleDeleteCustomerTenant,
    selectedPackageTenantId,
    setSelectedPackageTenantId,
    downloadOneClickWindowsInstaller,
    githubRepo,
    setGithubRepo,
    nextVersionInput,
    setNextVersionInput,
    releaseNotesInput,
    setReleaseNotesInput,
    publishGithubReleaseFiles,
    founderMasterKey,
    setFounderMasterKey,
    newFounderKeyInput,
    setNewFounderKeyInput,
    switchTenantInput,
    setSwitchTenantInput,
    showToast
  } = usePos();

  if (!installModalOpen || (ACTIVE_TENANT_ID !== "DEFAULT" && !isFounderUnlocked)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#181512] border border-amber-500/40 rounded-3xl max-w-5xl w-full p-4 sm:p-6 space-y-5 shadow-2xl my-auto max-h-[94dvh] overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg shrink-0">
              👑
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SÜPER YÖNETİCİ (BAYİ & LİSANS STÜDYOSU • MÜŞTERİLERE TAMAMEN GİZLİDİR)
              </span>
              <h3 className="text-base sm:text-xl font-black text-white mt-1">
                Müşteri İşletme Yönetimi, Lisans Kontrolü & Kurulum Paketi Üretici
              </h3>
            </div>
          </div>
          <button
            onClick={() => setInstallModalOpen(false)}
            className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800">
          {[
            { id: "tenants", label: `🏢 Müşteri İşletmeler & Lisanslar (${dealerTenants.length})` },
            { id: "packages", label: "📦 Müşteriye Özel Kurulum Paketi (.ZIP / .HTA / Mobil)" },
            { id: "updates", label: `🚀 Uzaktan Güncelleme & GitHub Yayınlama (v${appVersion})` },
            { id: "switch", label: "🔐 Kurucu Master Şifresi & Mağaza Geçişi" }
          ].map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setDealerStudioTab(tb.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                dealerStudioTab === tb.id
                  ? "bg-amber-500 text-stone-950 shadow-lg"
                  : "text-stone-300 hover:text-white hover:bg-stone-800"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {dealerStudioTab === "tenants" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form
              onSubmit={handleCreateCustomerTenant}
              className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-stone-900/95 border border-amber-500/40 space-y-3.5 text-xs"
            >
              <div className="border-b border-stone-800 pb-2.5">
                <span className="text-[10px] font-black uppercase text-amber-400">YENİ MÜŞTERİ HESABI TANIMLA</span>
                <h4 className="text-sm font-black text-white mt-0.5">+ Yeni İşletme & Lisans Oluştur</h4>
              </div>
              <div>
                <label className="text-stone-400 font-bold block mb-1">Müşteri İşletme / Kafe Adı *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Örn: Roast Lab Coffee, Luna Bakery..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">İşletme Kodu (Opsiyonel)</label>
                  <input
                    type="text"
                    value={newCustCode}
                    onChange={(e) => setNewCustCode(e.target.value.toUpperCase())}
                    placeholder="Otomatik (Örn: ROAST-101)"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Yönetici PIN Kodu</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newCustPin}
                    onChange={(e) => setNewCustPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-stone-400 font-bold block mb-1">Yetkili Adı & Telefon</label>
                <input
                  type="text"
                  value={newCustOwner}
                  onChange={(e) => setNewCustOwner(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz - 0532..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Lisans Süresi</label>
                  <select
                    value={newCustPlan}
                    onChange={(e) => setNewCustPlan(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-white font-bold"
                  >
                    <option value="trial_14">14 Gün Demo</option>
                    <option value="monthly">1 Aylık Lisans (30 Gün)</option>
                    <option value="yearly">1 Yıllık Lisans (365 Gün)</option>
                    <option value="lifetime">Süresiz (Ömür Boyu)</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Renk Teması</label>
                  <select
                    value={newCustTheme}
                    onChange={(e) => setNewCustTheme(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-2 text-white"
                  >
                    {THEME_PRESETS.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-stone-400 font-bold block mb-1">Başlangıç Menü & Masa Şablonu</label>
                <select
                  value={newCustTemplate}
                  onChange={(e) => setNewCustTemplate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="clean">Temiz Standart Kafe Şablonu (Ciro/Gider Sıfır)</option>
                  <option value="clone">Mevcut Ürün Menüsünü Kopyala (Satışlar Sıfır)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-black text-xs shadow-lg"
              >
                🚀 Müşteri Hesabını & Lisansını Oluştur
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white">Kayıtlı Müşteri İşletmeler & Uzaktan Lisans Kontrolü</h4>
                <span className="text-[11px] text-emerald-400 font-bold">
                  {dealerTenants.filter((t) => t.status === "active").length} Aktif Lisans
                </span>
              </div>
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {dealerTenants.map((tObj) => {
                  const isMaster = tObj.tenantId === "DEFAULT";
                  const isCurr = tObj.tenantId === ACTIVE_TENANT_ID;
                  const isExp =
                    tObj.expiresAt && tObj.expiresAt !== "unlimited" && new Date(tObj.expiresAt).getTime() < Date.now();
                  const daysLeft =
                    !tObj.expiresAt || tObj.expiresAt === "unlimited"
                      ? "Ömür Boyu Süresiz"
                      : `${Math.max(
                          0,
                          Math.ceil((new Date(tObj.expiresAt).getTime() - Date.now()) / 86400000)
                        )} Gün Kaldı (${new Date(tObj.expiresAt).toLocaleDateString("tr-TR")})`;

                  return (
                    <div
                      key={tObj.tenantId}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isCurr
                          ? "bg-amber-950/20 border-amber-500/60"
                          : tObj.status === "suspended" || isExp
                          ? "bg-rose-950/15 border-rose-500/40"
                          : "bg-stone-900/90 border-stone-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white">{tObj.businessName}</span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-700 font-mono text-[11px] font-black text-amber-400">
                              Kod: {tObj.displayCode || tObj.tenantId}
                            </span>
                            {isCurr && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
                                ŞU AN AÇIK
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400 mt-1">
                            Yetkili: <b className="text-stone-200">{tObj.ownerName || "-"}</b> • PIN:{" "}
                            <b className="text-amber-300 font-mono">{tObj.adminPin || "1234"}</b> • Lisans:{" "}
                            <b className="text-emerald-300">{daysLeft}</b>
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            tObj.status === "suspended"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : isExp
                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {tObj.status === "suspended"
                            ? "⏸️ ASKIDA / PASİF"
                            : isExp
                            ? "⏳ SÜRESİ DOLDU"
                            : "🟢 AKTİF LİSANS"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/80 text-[11px]">
                        {!isCurr && (
                          <button
                            type="button"
                            onClick={() => handleSwitchToTenant(tObj.tenantId)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
                          >
                            🔄 Bu İşletmeye Geç
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadCustomerZipPackage(tObj.tenantId)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black"
                        >
                          📦 Kurulum Paketi (.ZIP) İndir
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadStandaloneAppHtml(tObj.tenantId)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold border border-stone-700"
                        >
                          💻 Tek Dosya (.HTML)
                        </button>
                        <button
                          type="button"
                          onClick={() => copyCustomerDeliveryMessage(tObj)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold border border-stone-700"
                        >
                          💬 WhatsApp Teslimat Kopyala
                        </button>
                        {!isMaster && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleCustomerStatus(tObj.tenantId)}
                              className={`px-2.5 py-1.5 rounded-xl font-bold border ${
                                tObj.status === "suspended"
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                  : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                              }`}
                            >
                              {tObj.status === "suspended" ? "▶️ Aktif Et" : "⏸️ Askıya Al"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtendCustomerLicense(tObj.tenantId, 30)}
                              className="px-2 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold"
                            >
                              +1 Ay
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtendCustomerLicense(tObj.tenantId, 365)}
                              className="px-2 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold"
                            >
                              +1 Yıl
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtendCustomerLicense(tObj.tenantId, "unlimited")}
                              className="px-2 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold"
                            >
                              ∞ Süresiz
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomerTenant(tObj.tenantId)}
                              className="px-2 py-1.5 rounded-xl bg-stone-950 hover:bg-rose-500/20 text-rose-400 font-bold"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {dealerStudioTab === "packages" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-amber-400 font-black uppercase block">
                  PAKETİ ÜRETİLECEK MÜŞTERİ İŞLETMESİNİ SEÇİN:
                </span>
                <p className="text-stone-400 mt-0.5">
                  İndirilen kurulum paketi seçtiğiniz müşterinin İşletme Koduna, temasına ve veritabanına kilitli olarak
                  hazırlanır.
                </p>
              </div>
              <select
                value={selectedPackageTenantId}
                onChange={(e) => setSelectedPackageTenantId(e.target.value)}
                className="bg-stone-950 border border-amber-500/50 rounded-xl px-4 py-2.5 text-sm font-black text-amber-300"
              >
                {dealerTenants.map((t) => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.businessName} ({t.displayCode || t.tenantId})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-stone-900/95 border border-emerald-500/40 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                    📦 1. TAM KURULUM PAKETİ (.ZIP — TAVSİYE)
                  </span>
                  <h4 className="text-sm font-black text-white">PC Kasa + Yerel Mobil Wi-Fi Sunucu Paketi (.ZIP)</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Müşterinin kendi bilgisayarında masaüstü kısayolu oluşturur ve kafedeki garson telefonlarının QR
                    kodla anlık senkronize bağlanmasını sağlayan tüm sistemi tek ZIP halinde indirir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCustomerZipPackage(selectedPackageTenantId)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Müşteri Tam Kurulum (.ZIP) İndir
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900/95 border border-amber-500/40 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                    📱 2. TEK DOSYA UYGULAMA (.HTML)
                  </span>
                  <h4 className="text-sm font-black text-white">WhatsApp&apos;tan Gönderilebilir Tek Dosya POS</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Kurulum gerektirmeyen, müşteriye WhatsApp veya e-posta ile tek dosya olarak gönderebileceğiniz, hem
                    bilgisayarda hem telefonda çift tıkla açılan tam sürüm uygulama.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadStandaloneAppHtml(selectedPackageTenantId)}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Tek Dosya Uygulama (.HTML) İndir
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-900/95 border border-blue-500/40 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase">
                    💻 3. WINDOWS MASAÜSTÜ (.HTA)
                  </span>
                  <h4 className="text-sm font-black text-white">Doğrudan Windows Masaüstü Programı</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Tarayıcı çubuğu olmadan doğrudan Windows uygulama penceresi olarak açılan, müşterinin veritabanı ve
                    lisansı gömülü masaüstü paketi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadOneClickWindowsInstaller(selectedPackageTenantId)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Windows Programı (.HTA) İndir
                </button>
              </div>
            </div>
          </div>
        )}

        {dealerStudioTab === "updates" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
            <div className="lg:col-span-6 p-5 rounded-2xl bg-stone-900/95 border border-emerald-500/40 space-y-4">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-[10px] font-black uppercase text-emerald-400">
                  UZAKTAN OTOMATİK GÜNCELLEME & CANLI LİSANS SUNUCUSU
                </span>
                <h4 className="text-sm font-black text-white mt-0.5">
                  🚀 Yeni Sürüm & Lisans Listesini GitHub Üzerinden Yayınla
                </h4>
              </div>
              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  1. GitHub Kullanıcı Adı / Depo (Repo) Adınız:
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => {
                    setGithubRepo(e.target.value);
                    try {
                      localStorage.setItem("propos_github_repo", e.target.value.trim());
                    } catch (err) {}
                  }}
                  placeholder="Örn: kullaniciadiniz/propos-pos"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-emerald-300 font-mono font-bold"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Bu adres tüm müşteri paketlerine otomatik gömülür. Müşterileriniz bu adresten tek tuşla güncelleme
                  alır.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Mevcut Sürüm:</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-amber-400 font-mono font-black">
                    v{appVersion}
                  </div>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Yayınlanacak Yeni Sürüm No:</label>
                  <input
                    type="text"
                    value={nextVersionInput}
                    onChange={(e) => setNextVersionInput(e.target.value)}
                    placeholder="2.5.0"
                    className="w-full bg-stone-950 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-white font-mono font-black"
                  />
                </div>
              </div>
              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Güncelleme Notu (Müşterilerin Ekranında Görünür):
                </label>
                <input
                  type="text"
                  value={releaseNotesInput}
                  onChange={(e) => setReleaseNotesInput(e.target.value)}
                  placeholder="Örn: Yeni raporlama ekranı ve hız iyileştirmeleri eklendi."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <button
                type="button"
                onClick={publishGithubReleaseFiles}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-stone-950 font-black text-xs shadow-lg flex items-center justify-center gap-2"
              >
                📦 Yeni Sürüm Dosyalarını (index.html + version.json) Hazırla & Kaydet
              </button>
            </div>

            <div className="lg:col-span-6 p-5 rounded-2xl bg-stone-900/95 border border-stone-800 space-y-3.5">
              <h4 className="text-sm font-black text-amber-400">📖 Nasıl Çalışır? (Adım Adım)</h4>
              <ol className="space-y-2.5 text-stone-300 list-decimal list-inside leading-relaxed">
                <li>
                  <b className="text-white">GitHub&apos;da Ücretsiz Depo Açın:</b> github.com üzerinde{" "}
                  <code className="text-amber-300">propos-pos</code> adında Public (Açık) bir depo oluşturun ve adını
                  soldaki kutuya yazın.
                </li>
                <li>
                  <b className="text-white">Tek Tıkla Paket Hazırlayın:</b> Soldaki yeşil butona bastığınızda
                  klasörünüzdeki <code className="text-emerald-300">github-yayin</code> klasörüne güncel{" "}
                  <code className="text-amber-300">index.html</code> ve{" "}
                  <code className="text-amber-300">version.json</code> otomatik kaydedilir.
                </li>
                <li>
                  <b className="text-white">GitHub&apos;a Sürükleyip Bırakın:</b> Bu 2 dosyayı GitHub deponuza
                  sürükleyip <b className="text-emerald-300">Commit changes</b> butonuna basın.
                </li>
                <li>
                  <b className="text-white">Müşterilerde Otomatik Bildirim:</b> Tüm müşterilerinizin ekranında{" "}
                  <b className="text-emerald-400">&quot;✨ Yeni Güncelleme Hazır — Tek Tıkla Güncelle&quot;</b> butonu
                  çıkar. Bastıkları anda hiçbir verileri silinmeden yeni sürüme geçerler!
                </li>
              </ol>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 leading-relaxed">
                💡 <b>Uzaktan Lisans Askıya Alma:</b> Bir müşteriyi Askıya Aldığınızda veya süresini uzattığınızda yeni{" "}
                <code>version.json</code> dosyasını GitHub&apos;a attığınız anda müşterinin bilgisayarındaki lisans
                durumu da uzaktan otomatik güncellenir!
              </div>
            </div>
          </div>
        )}

        {dealerStudioTab === "switch" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-stone-900 border border-amber-500/40 space-y-3">
              <h4 className="text-sm font-black text-amber-400">🔐 Özel Kurucu Master Şifrenizi Belirleyin</h4>
              <p className="text-stone-300 leading-relaxed">
                Müşteriler kendi işletmelerinde PIN olarak <b>9999</b> seçse bile Bayi Paneline{" "}
                <b className="text-rose-400">ASLA erişemezler!</b> Herhangi bir müşteri ekranındayken Bayi Panelini
                açmak isterseniz klavyeden{" "}
                <code className="px-1.5 py-0.5 rounded bg-stone-950 text-amber-300 font-bold">Ctrl + Shift + K</code>{" "}
                tuşlarına basıp bu özel Master şifrenizi girebilirsiniz.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFounderKeyInput}
                  onChange={(e) => setNewFounderKeyInput(e.target.value)}
                  placeholder={`Mevcut: ${founderMasterKey}`}
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newFounderKeyInput || newFounderKeyInput.trim().length < 4) {
                      showToast("Lütfen en az 4 karakterli bir Kurucu Master Şifresi girin.");
                      return;
                    }
                    const cleanKey = newFounderKeyInput.trim();
                    setFounderMasterKey(cleanKey);
                    try {
                      localStorage.setItem("propos_founder_master_key", cleanKey);
                    } catch (e) {}
                    setNewFounderKeyInput("");
                    showToast("🔐 Kurucu Master Şifreniz başarıyla güncellendi!");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
                >
                  Kaydet
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <h4 className="text-sm font-black text-white">🔄 İşletme Kodu ile Mağaza Değiştir</h4>
              <p className="text-stone-300 leading-relaxed">
                Herhangi bir müşterinizin İşletme Kodunu girerek o mağazanın ekranına geçiş yapabilirsiniz:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={switchTenantInput}
                  onChange={(e) => setSwitchTenantInput(e.target.value.toUpperCase())}
                  placeholder="Örn: PICKYS-MASTER veya ROAST-101"
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-amber-400 font-mono font-black text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleSwitchToTenant(switchTenantInput)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black"
                >
                  Bağlan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
