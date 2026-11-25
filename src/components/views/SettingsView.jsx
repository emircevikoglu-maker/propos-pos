import React from "react";
import { usePos } from "../../context/PosContext";
import { CURRENCY_OPTIONS, THEME_PRESETS } from "../../constants/initialData";
import { formatTL } from "../../utils/formatters";
import { ProductOptionsEditor } from "../settings/ProductOptionsEditor";
import {
  Download,
  CircleCheck,
  PenLine,
  Trash2,
  Coffee,
  Zap,
  KeyRound,
  RefreshCw,
  RotateCcw
} from "../Icons";

export function SettingsView() {
  const {
    ACTIVE_TENANT_ID,
    settingsSubTab,
    setSettingsSubTab,
    brandSettings,
    setBrandSettings,
    handleLogoFileUpload,
    showToast,
    handleSaveTable,
    editingTableId,
    setEditingTableId,
    newTableName,
    setNewTableName,
    newTableZone,
    setNewTableZone,
    zones,
    handleSaveZone,
    newZoneName,
    setNewZoneName,
    editingZoneOldName,
    setEditingZoneOldName,
    tables,
    handleDeleteZone,
    handleDeleteTable,
    editingPrdId,
    setEditingPrdId,
    newPrdName,
    setNewPrdName,
    newPrdPrice,
    setNewPrdPrice,
    newPrdRecipe,
    setNewPrdRecipe,
    handleSaveProduct,
    newPrdEmoji,
    setNewPrdEmoji,
    newPrdCategory,
    setNewPrdCategory,
    categories,
    newPrdQuickFav,
    setNewPrdQuickFav,
    selectedRecipeIng,
    setSelectedRecipeIng,
    ingredients,
    selectedRecipeAmt,
    setSelectedRecipeAmt,
    handleSaveCategory,
    newCategoryName,
    setNewCategoryName,
    editingCategoryOldName,
    setEditingCategoryOldName,
    handleDeleteCategory,
    products,
    startEditProduct,
    handleDeleteProduct,
    handleSaveStaff,
    editingStaffId,
    setEditingStaffId,
    newStaffName,
    setNewStaffName,
    newStaffRole,
    setNewStaffRole,
    newStaffColor,
    setNewStaffColor,
    staffList,
    handleDeleteStaff,
    handleSaveEsnafEdit,
    editingEsnafId,
    setEditingEsnafId,
    editEsnafName,
    setEditEsnafName,
    editEsnafShopType,
    setEditEsnafShopType,
    editEsnafDiscount,
    setEditEsnafDiscount,
    editEsnafPhone,
    setEditEsnafPhone,
    editEsnafNote,
    setEditEsnafNote,
    esnafList,
    handleDeleteEsnaf,
    newPinValue,
    setNewPinValue,
    handleChangePin,
    isAdminUnlocked,
    newPrdOptions,
    setNewPrdOptions,
    exportExcelByCategory,
    exportFullBackupFile,
    handleImportBackupFile,
    setResetConfirmOpen,
    isFounderUnlocked,
    setIsFounderUnlocked,
    setInstallModalOpen
  } = usePos();

  const subTabs = [
    { id: "branding", label: "🎨 İşletme Kimliği, Para Birimi & Tema" },
    { id: "tables", label: "🪑 Masalar & Bölgeler" },
    { id: "menu", label: "☕ Menü, Kategoriler & Reçeteler" },
    { id: "staff", label: "👥 Çalışanlar & Görevler" },
    { id: "esnaf", label: "🏪 Esnaf Cari Kartları" },
    { id: "security", label: "🔐 Yönetici Şifresi & Yedekleme" }
  ];

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-2xl bg-[#161412] border border-stone-800 flex flex-wrap items-center gap-2">
        {subTabs.map((st) => (
          <button
            key={st.id}
            onClick={() => setSettingsSubTab(st.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
              settingsSubTab === st.id
                ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
                : "bg-stone-900 text-stone-400 hover:text-white border border-stone-800"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {settingsSubTab === "branding" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">🏢 İşletme Adı & Logo Özelleştirme</h3>
                  <p className="text-xs text-stone-400">
                    Farklı işletmeler için marka adını, unvanı ve sol üst logoyu düzenleyin
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-stone-400 font-semibold block mb-1">İşletme / Kafe Adı</label>
                    <input
                      type="text"
                      value={brandSettings.businessName}
                      onChange={(e) => setBrandSettings((prev) => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Örn: Kahve Durağı, Roast Lab..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 font-semibold block mb-1">Rozet Etiketi</label>
                    <input
                      type="text"
                      value={brandSettings.badgeText}
                      onChange={(e) => setBrandSettings((prev) => ({ ...prev, badgeText: e.target.value }))}
                      placeholder="PRO / VIP"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-amber-400 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-stone-400 font-semibold block mb-1">Alt Başlık / Slogan</label>
                  <input
                    type="text"
                    value={brandSettings.subtitle}
                    onChange={(e) => setBrandSettings((prev) => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Örn: Artisan Coffee & Bakery POS"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div className="pt-2 border-t border-stone-800 space-y-3">
                  <label className="text-stone-400 font-semibold block">Logo Görünüm Tipi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "text", label: "🔤 Harf Monogram" },
                      { id: "emoji", label: "☕ İkon / Emoji" },
                      { id: "image", label: "🖼️ Özel Görsel Logo" }
                    ].map((lt) => (
                      <button
                        key={lt.id}
                        type="button"
                        onClick={() => setBrandSettings((prev) => ({ ...prev, logoType: lt.id }))}
                        className={`py-2.5 px-2 rounded-xl font-medium border transition-all ${
                          brandSettings.logoType === lt.id
                            ? "bg-amber-500 text-stone-950 border-amber-400"
                            : "bg-stone-900 text-stone-300 border-stone-800"
                        }`}
                      >
                        {lt.label}
                      </button>
                    ))}
                  </div>
                  {brandSettings.logoType === "text" && (
                    <div>
                      <label className="text-stone-400 block mb-1">Logo Harfi (1-2 Karakter)</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={brandSettings.logoText}
                        onChange={(e) =>
                          setBrandSettings((prev) => ({ ...prev, logoText: e.target.value.toUpperCase() }))
                        }
                        placeholder="P"
                        className="w-28 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-center text-base font-semibold text-white"
                      />
                    </div>
                  )}
                  {brandSettings.logoType === "emoji" && (
                    <div className="space-y-2">
                      <label className="text-stone-400 block">Hızlı İkon Seç veya Emoji Gir</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {["☕", "🥐", "🍔", "🍕", "🍰", "🍸", "🌿", "🔥", "👑", "💎"].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setBrandSettings((prev) => ({ ...prev, logoEmoji: em }))}
                            className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center ${
                              brandSettings.logoEmoji === em
                                ? "border-amber-500 bg-amber-500/20"
                                : "border-stone-800 bg-stone-900"
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                        <input
                          type="text"
                          value={brandSettings.logoEmoji}
                          onChange={(e) => setBrandSettings((prev) => ({ ...prev, logoEmoji: e.target.value }))}
                          className="w-16 bg-stone-900 border border-stone-800 rounded-xl px-2 py-1.5 text-center text-base"
                        />
                      </div>
                    </div>
                  )}
                  {brandSettings.logoType === "image" && (
                    <div className="space-y-2">
                      <label className="text-stone-400 block">Cihazdan Logo Yükle veya Görsel URL Yapıştır</label>
                      <div className="flex flex-wrap gap-2">
                        <label className="px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-medium cursor-pointer inline-flex items-center gap-1.5">
                          <Download className="w-4 h-4 rotate-180" /> Bilgisayar / Telefondan Logo Seç
                          <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                        </label>
                        <input
                          type="text"
                          value={brandSettings.logoImageUrl}
                          onChange={(e) => setBrandSettings((prev) => ({ ...prev, logoImageUrl: e.target.value }))}
                          placeholder="veya https://.../logo.png yapıştırın"
                          className="flex-1 min-w-[180px] bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">💱 Para Birimi & Kasa Simgesi Seçimi</h3>
                <p className="text-xs text-stone-400">
                  Sol alt paneldeki para simgesini ve tüm menü, adisyon, rapor para birimini anında değiştirir
                  (Varsayılan: Türk Lirası ₺)
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.values(CURRENCY_OPTIONS).map((cur) => {
                  const isSelected = brandSettings.currency === cur.code;
                  return (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => {
                        setBrandSettings((prev) => ({ ...prev, currency: cur.code }));
                        showToast(`Para birimi ${cur.name} olarak güncellendi!`);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-500 text-stone-950 border-amber-400 shadow-lg font-medium"
                          : "bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <span className="text-2xl font-bold">{cur.symbol}</span>
                      <div className="mt-2">
                        <span className="text-xs font-medium block">{cur.code}</span>
                        <span className={`text-[10px] ${isSelected ? "text-stone-900" : "text-stone-400"}`}>
                          {cur.name.split(" ")[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">🎨 Kurumsal Renk Teması & Özel Tasarım</h3>
              <p className="text-xs text-stone-400">
                Tek tıkla hazır kurumsal temalardan birini seçin veya kendi özel renk kodlarınızı belirleyin
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isPicked = brandSettings.themeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBrandSettings((prev) => ({
                        ...prev,
                        themeId: preset.id,
                        customPrimary: preset.primary,
                        customSecondary: preset.secondary,
                        customBg: preset.bg,
                        customPanel: preset.panel
                      }));
                      showToast(`🎨 "${preset.name}" teması uygulandı!`);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isPicked
                        ? "border-white ring-2 ring-white/40 bg-stone-900 shadow-xl"
                        : "border-stone-800 bg-stone-900/70 hover:border-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        <span
                          className="w-6 h-6 rounded-full border border-black/50 shadow"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="w-6 h-6 rounded-full border border-black/50 shadow"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <span
                          className="w-6 h-6 rounded-full border border-stone-700 shadow"
                          style={{ backgroundColor: preset.panel }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{preset.name}</p>
                        <span className="text-[10px] text-stone-400 font-mono">{preset.primary}</span>
                      </div>
                    </div>
                    {isPicked && <CircleCheck className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 text-xs">
              <span className="font-medium text-white block uppercase tracking-wider text-[11px]">
                🖌️ Kendi Özel Renk Paletini Belirle (Canlı Önizlemeli)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Ana Vurgu Rengi", key: "customPrimary" },
                  { label: "İkincil / Geçiş", key: "customSecondary" },
                  { label: "Arka Plan Rengi", key: "customBg" },
                  { label: "Kart / Panel Rengi", key: "customPanel" }
                ].map((clr) => (
                  <label
                    key={clr.key}
                    className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-1.5 cursor-pointer"
                  >
                    <span className="text-[10px] text-stone-400 font-medium">{clr.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandSettings[clr.key]}
                        onChange={(e) =>
                          setBrandSettings((prev) => ({
                            ...prev,
                            themeId: "custom",
                            [clr.key]: e.target.value
                          }))
                        }
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="font-mono text-[11px] text-white">{brandSettings[clr.key]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === "tables" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleSaveTable} className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  {editingTableId ? "✏️ Masayı Düzenle" : "➕ Yeni Masa Ekle"}
                </h3>
                {editingTableId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTableId(null);
                      setNewTableName("");
                    }}
                    className="text-xs text-stone-400 hover:text-white"
                  >
                    İptal
                  </button>
                )}
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-stone-400 block mb-1">Masa Adı</label>
                  <input
                    type="text"
                    required
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Örn: Bahçe 6, VIP Loca..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Bulunduğu Bölge</label>
                  <select
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                  >
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium"
                >
                  {editingTableId ? "Masa Değişikliklerini Kaydet" : "Masayı Plana Ekle"}
                </button>
              </div>
            </form>

            <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
              <h3 className="text-base font-semibold text-white">Kafe Bölgeleri (Bahçe, Salon, Teras)</h3>
              <form onSubmit={handleSaveZone} className="flex gap-2 text-xs">
                <input
                  type="text"
                  required
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder={editingZoneOldName ? "Yeni bölge adı..." : "Yeni bölge ekle (Örn: Üst Kat)"}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-medium">
                  {editingZoneOldName ? "Güncelle" : "+ Ekle"}
                </button>
              </form>
              <div className="space-y-2">
                {zones.map((z) => (
                  <div
                    key={z}
                    className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-white">
                      {z} ({tables.filter((t) => t.zone === z).length} Masa)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingZoneOldName(z);
                          setNewZoneName(z);
                        }}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-400"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteZone(z)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Kayıtlı Masalar ({tables.length} Adet)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[540px] overflow-y-auto pr-1">
              {tables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] font-medium uppercase text-amber-400 block">{tbl.zone}</span>
                    <p className="text-sm font-medium text-white">{tbl.name}</p>
                    <span className={`text-[10px] ${tbl.status === "occupied" ? "text-orange-400" : "text-stone-500"}`}>
                      {tbl.status === "occupied" ? "Şu an Dolu (Adisyon Açık)" : "Boş"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingTableId(tbl.id);
                        setNewTableName(tbl.name);
                        setNewTableZone(tbl.zone);
                      }}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-400"
                      title="Masayı Düzenle"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(tbl)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                      title="Masayı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === "menu" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-amber-500" />
                  {editingPrdId ? "✏️ Ürünü & Reçeteyi Düzenle" : "➕ Yeni Ürün & Reçete Ekle"}
                </h3>
                {editingPrdId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPrdId(null);
                      setNewPrdName("");
                      setNewPrdPrice("");
                      setNewPrdRecipe([]);
                    }}
                    className="text-xs text-stone-400 hover:text-white"
                  >
                    İptal
                  </button>
                )}
              </div>
              <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="col-span-1">
                    <label className="text-stone-400 block mb-1">İkon</label>
                    <input
                      type="text"
                      value={newPrdEmoji}
                      onChange={(e) => setNewPrdEmoji(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-center text-base"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-stone-400 block mb-1">Ürün Adı</label>
                    <input
                      type="text"
                      required
                      value={newPrdName}
                      onChange={(e) => setNewPrdName(e.target.value)}
                      placeholder="Örn: Spanish Latte"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-stone-400 block mb-1">Kategori</label>
                    <select
                      value={newPrdCategory}
                      onChange={(e) => setNewPrdCategory(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-stone-400 block mb-1">Satış Fiyatı (TL)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newPrdPrice}
                      onChange={(e) => setNewPrdPrice(e.target.value)}
                      placeholder="110"
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-medium"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPrdQuickFav}
                    onChange={(e) => setNewPrdQuickFav(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span className="font-medium text-amber-300">⚡ Pratik Tek-Tık Favoriler Barında Göster</span>
                </label>
                <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
                  <span className="text-[11px] font-medium text-amber-400 block">
                    Reçete Bağla (Satıldığında Stoktan Düşecek Malzemeler):
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={selectedRecipeIng}
                      onChange={(e) => setSelectedRecipeIng(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-white"
                    >
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={selectedRecipeAmt}
                      onChange={(e) => setSelectedRecipeAmt(e.target.value)}
                      placeholder="Miktar"
                      className="w-24 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedRecipeAmt || Number(selectedRecipeAmt) <= 0) return;
                        setNewPrdRecipe((prev) => [
                          ...prev,
                          { ingredientId: selectedRecipeIng, amount: Number(selectedRecipeAmt) }
                        ]);
                        setSelectedRecipeAmt("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 font-medium"
                    >
                      + Ekle
                    </button>
                  </div>
                  {newPrdRecipe.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {newPrdRecipe.map((r, idx) => {
                        const ing = ingredients.find((x) => x.id === r.ingredientId);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] bg-stone-950 px-2.5 py-1 rounded"
                          >
                            <span>
                              {ing?.name}: {r.amount} {ing?.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewPrdRecipe((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-400"
                            >
                              Kaldır
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <ProductOptionsEditor value={newPrdOptions} onChange={setNewPrdOptions} />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs"
                >
                  {editingPrdId ? "Ürün Güncellemesini Kaydet" : "Ürünü Menüye Kaydet"}
                </button>
              </form>
            </div>

            <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-3">
              <h3 className="text-sm font-medium text-white">Menü Kategorileri</h3>
              <form onSubmit={handleSaveCategory} className="flex gap-2 text-xs">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={editingCategoryOldName ? "Yeni kategori adı..." : "Yeni kategori ekle..."}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-medium">
                  {editingCategoryOldName ? "Güncelle" : "+ Ekle"}
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <div
                    key={c}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-2 text-xs"
                  >
                    <span className="font-medium text-white">{c}</span>
                    <button
                      onClick={() => {
                        setEditingCategoryOldName(c);
                        setNewCategoryName(c);
                      }}
                      className="text-stone-400 hover:text-amber-400"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCategory(c)} className="text-stone-500 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Mevcut Menü Ürünleri ({products.length} Ürün)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[600px] overflow-y-auto pr-1">
              {products.map((prd) => (
                <div
                  key={prd.id}
                  className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{prd.image}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-white truncate">{prd.name}</p>
                        {prd.isQuickFav && <Zap className="w-3 h-3 text-amber-400 shrink-0" title="Tek Tık Favori" />}
                      </div>
                      <span className="text-[10px] text-stone-400 block">
                        {prd.category} • <span className="text-amber-400 font-semibold">{formatTL(prd.price)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => startEditProduct(prd)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-amber-500/20 text-stone-300 hover:text-amber-400"
                      title="Ürünü Düzenle"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prd.id)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                      title="Ürünü Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === "staff" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveStaff}
            className="lg:col-span-5 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {editingStaffId ? "✏️ Çalışan Bilgilerini Düzenle" : "➕ Yeni Çalışan Ekle"}
              </h3>
              {editingStaffId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaffId(null);
                    setNewStaffName("");
                    setNewStaffRole("Barista");
                  }}
                  className="text-xs text-stone-400 hover:text-white"
                >
                  İptal
                </button>
              )}
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400 block mb-1">Çalışan Adı Soyadı</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Örn: Zeynep Kaya"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Görevi / Pozisyonu</label>
                <input
                  type="text"
                  required
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  placeholder="Örn: Baş Barista, Servis Personeli, Kasa..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Etiket Rengi</label>
                <div className="flex items-center gap-2">
                  {["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"].map((clr) => (
                    <button
                      type="button"
                      key={clr}
                      onClick={() => setNewStaffColor(clr)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        newStaffColor === clr ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: clr }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium"
              >
                {editingStaffId ? "Çalışan Bilgilerini Güncelle" : "Çalışanı Ekibe Ekle"}
              </button>
            </div>
          </form>

          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Kayıtlı Çalışan Ekibi ({staffList.length} Kişi)</h3>
            <div className="space-y-2.5">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-medium text-stone-950"
                      style={{ backgroundColor: st.color }}
                    >
                      {st.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{st.name}</p>
                      <span className="text-xs text-stone-400">{st.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingStaffId(st.id);
                        setNewStaffName(st.name);
                        setNewStaffRole(st.role);
                        setNewStaffColor(st.color);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-amber-500/20 text-xs font-medium text-stone-200 hover:text-amber-400 flex items-center gap-1"
                    >
                      <PenLine className="w-3.5 h-3.5" /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(st.id)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === "esnaf" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveEsnafEdit}
            className="lg:col-span-5 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {editingEsnafId ? "✏️ Esnaf Cari Kartını Düzenle" : "➕ Yeni Esnaf Cari Kartı Aç"}
              </h3>
              {editingEsnafId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingEsnafId(null);
                    setEditEsnafName("");
                  }}
                  className="text-xs text-stone-400 hover:text-white"
                >
                  İptal
                </button>
              )}
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400 block mb-1">Esnaf / İşletme Adı</label>
                <input
                  type="text"
                  required
                  value={editEsnafName}
                  onChange={(e) => setEditEsnafName(e.target.value)}
                  placeholder="Örn: Komşu Berber Salih"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-stone-400 block mb-1">Sektör / Dükkan Tipi</label>
                  <input
                    type="text"
                    value={editEsnafShopType}
                    onChange={(e) => setEditEsnafShopType(e.target.value)}
                    placeholder="Kuaför, Eczane..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-stone-400 block mb-1">Esnaf İndirimi (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editEsnafDiscount}
                    onChange={(e) => setEditEsnafDiscount(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-amber-400 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Telefon</label>
                <input
                  type="text"
                  value={editEsnafPhone}
                  onChange={(e) => setEditEsnafPhone(e.target.value)}
                  placeholder="0532 ..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Özel Not (Çay/Kahve Tercihi)</label>
                <input
                  type="text"
                  value={editEsnafNote}
                  onChange={(e) => setEditEsnafNote(e.target.value)}
                  placeholder="Örn: Çaylar şekersiz ince belli..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium"
              >
                {editingEsnafId ? "Esnaf Bilgilerini Güncelle" : "Esnaf Cari Kartını Kaydet"}
              </button>
            </div>
          </form>

          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Kayıtlı Esnaf Cari Listesi ({esnafList.length})</h3>
            <div className="space-y-2.5">
              {esnafList.map((esn) => (
                <div
                  key={esn.id}
                  className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] font-medium text-amber-400">
                      {esn.shopType} • %{esn.discountRate} İndirim
                    </span>
                    <p className="text-sm font-medium text-white">{esn.name}</p>
                    <span className="text-xs text-stone-400">
                      Açık Bakiye: <span className="text-orange-400 font-semibold">{formatTL(esn.balance)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingEsnafId(esn.id);
                        setEditEsnafName(esn.name);
                        setEditEsnafShopType(esn.shopType);
                        setEditEsnafPhone(esn.phone);
                        setEditEsnafDiscount(String(esn.discountRate));
                        setEditEsnafNote(esn.note || "");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-amber-500/20 text-xs font-medium text-stone-200 hover:text-amber-400 flex items-center gap-1"
                    >
                      <PenLine className="w-3.5 h-3.5" /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteEsnaf(esn.id)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" /> Yönetici PIN Şifresini Değiştir
            </h3>
            <p className="text-xs text-stone-400">
              Raporlar, kasa özeti, ciro/gider ve yönetim ekranlarına girişte sorulan PIN. PIN sunucuda şifreli
              (hash) saklanır; bu cihaz PIN'i bilmez ve gösteremez.
            </p>
            <PinChangeForm
              unlocked={isAdminUnlocked}
              nextValue={newPinValue}
              setNextValue={setNewPinValue}
              onChange={handleChangePin}
            />
          </div>

          <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-3">
            <h3 className="text-base font-semibold text-white">Ayrı Ayrı Excel Raporları & Demo Sıfırlama</h3>
            <p className="text-xs text-stone-400">
              İstediğiniz tabloyu karmaşa olmadan tek başına ayrı bir Excel (.xls) dosyası olarak indirebilirsiniz:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                { type: "overview", label: "1. Genel Günlük Bilanço (.XLS)" },
                { type: "products", label: "2. Ürün Satış & Kâr Raporu (.XLS)" },
                { type: "receipts", label: "3. Adisyon & Satış Geçmişi (.XLS)" },
                { type: "expenses", label: "4. Gider & Faturalar (.XLS)" },
                { type: "staff", label: "5. Çalışan & Kasa Özeti (.XLS)" },
                { type: "esnaf", label: "6. Esnaf Cari Listesi (.XLS)" }
              ].map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => exportExcelByCategory(btn.type)}
                  className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-emerald-600 hover:text-stone-950 border border-stone-800 text-xs font-medium text-emerald-400 flex items-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> {btn.label}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-800/80 space-y-2">
              <span className="text-[11px] font-medium text-amber-400 block">
                🛡️ Tam Sistem Yedeği (PC & Telefon Kurtarma Dosyası)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportFullBackupFile}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Tam Yedek İndir (.JSON)
                </button>
                <label className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Yedekten Geri Yükle
                  <input type="file" accept=".json" onChange={handleImportBackupFile} className="hidden" />
                </label>
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium text-rose-300 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Demo Verilerine Sıfırla
                </button>
              </div>
            </div>

            {(ACTIVE_TENANT_ID === "DEFAULT" || isFounderUnlocked) && (
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-500">
                  👑 Yazılım Sahibi / Bayi Lisans Stüdyosu (Müşterilerde bu alan gizlidir)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsFounderUnlocked(true);
                    setInstallModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] font-medium text-stone-300"
                >
                  Bayi Panelini Aç
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Yönetici kilidi açıkken mevcut PIN sorulmaz (sunucu yönetici oturumunu doğrular). */
function PinChangeForm({ unlocked, nextValue, setNextValue, onChange }) {
  const [current, setCurrent] = React.useState("");
  const [repeat, setRepeat] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!/^\S{4,12}$/u.test(nextValue || "")) return setMsg("PIN 4-12 karakter olmalı, boşluk içermemeli.");
    if (nextValue !== repeat) return setMsg("Yeni PIN'ler eşleşmiyor.");
    setBusy(true);
    const r = await onChange(unlocked ? "" : current, nextValue);
    setBusy(false);
    if (r && r.ok) { setNextValue(""); setRepeat(""); setCurrent(""); setMsg("PIN güncellendi."); }
    else setMsg((r && r.error) || "PIN değiştirilemedi.");
  };
  const cls = "w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm";
  return (
    <form onSubmit={submit} className="space-y-2 text-xs">
      {!unlocked && <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mevcut PIN" className={cls} />}
      <input type="password" autoComplete="new-password" maxLength={12} value={nextValue} onChange={(e) => setNextValue(e.target.value)} placeholder="Yeni PIN (4-12 karakter)" className={cls} />
      <input type="password" autoComplete="new-password" maxLength={12} value={repeat} onChange={(e) => setRepeat(e.target.value)} placeholder="Yeni PIN (tekrar)" className={cls} />
      {msg && <p role="status" className="text-stone-300">{msg}</p>}
      <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-medium disabled:opacity-50">
        {busy ? "Kaydediliyor…" : "PIN'i güncelle"}
      </button>
    </form>
  );
}
