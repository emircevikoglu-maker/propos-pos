import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL, getElapsedMinutes } from "../../utils/formatters";
import {
  Coffee,
  Receipt,
  Zap,
  Search,
  Minus,
  Plus,
  Clock,
  ArrowRightLeft,
  X,
  Percent,
  Store,
  Banknote,
  CreditCard,
  Ticket,
  Gift
} from "../Icons";

export function PosView() {
  const {
    activeTable,
    activeTableId,
    setActiveTableId,
    mobilePosPanel,
    setMobilePosPanel,
    zones,
    selectedZone,
    setSelectedZone,
    tables,
    activeOccupiedCount,
    products,
    addProductToTable,
    updateOrderItemQty,
    posSearch,
    setPosSearch,
    categories,
    posCategory,
    setPosCategory,
    staffList,
    setTransferModalOpen,
    setTableStaff,
    setNoteModalItem,
    setTableDiscount,
    setPartialPayModalOpen,
    setEsnafChargeMode,
    selectedEsnafForCharge,
    setSelectedEsnafForCharge,
    esnafList,
    setEsnafChargeModalOpen,
    completeTableOrder
  } = usePos();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6 items-start">
      {/* Mobil Masa Alt Bar */}
      {activeTable && (
        <div className="xl:hidden col-span-1 glass-panel p-2.5 rounded-2xl border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sticky top-[104px] z-20 shadow-2xl">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              onClick={() => setActiveTableId(null)}
              className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-extrabold text-stone-200 flex items-center gap-1.5"
            >
              ← Masalara Dön
            </button>
            <div className="text-right sm:text-left">
              <span className="text-[10px] font-bold uppercase text-amber-400 block">{activeTable.zone}</span>
              <span className="text-sm font-black text-white">{activeTable.name}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setMobilePosPanel("menu")}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                mobilePosPanel === "menu" ? "bg-amber-500 text-stone-950 shadow" : "text-stone-400 hover:text-white"
              }`}
            >
              <Coffee className="w-3.5 h-3.5" /> Ürün Ekle
            </button>
            <button
              onClick={() => setMobilePosPanel("cart")}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                mobilePosPanel === "cart" ? "bg-amber-500 text-stone-950 shadow" : "text-stone-400 hover:text-white"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Adisyon ({activeTable.items.reduce((s, i) => s + i.qty, 0)})
            </button>
          </div>
        </div>
      )}

      {/* Sol Alan: Bölge Seçimi, Menü Kataloğu ve Masa Planı */}
      <div
        className={`${activeTable ? "xl:col-span-7" : "xl:col-span-12"} ${
          activeTable && mobilePosPanel === "cart" ? "hidden xl:block" : "block"
        } space-y-4 sm:space-y-5`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 glass-panel p-3 sm:p-4 rounded-2xl border border-stone-800/90 shadow-lg">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {["Tümü", ...zones].map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 whitespace-nowrap shrink-0 ${
                  selectedZone === zone
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                    : "bg-stone-900/90 text-stone-400 hover:text-stone-100 border border-stone-800"
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs bg-stone-950/70 px-3 py-2 rounded-xl border border-stone-800/80 shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
              Müsait: {tables.filter((t) => t.status === "empty").length}
            </span>
            <span className="w-px h-3.5 bg-stone-800" />
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Dolu: {activeOccupiedCount}
            </span>
          </div>
        </div>

        {/* Aktif Masa Ürün Ekleme Kataloğu */}
        {activeTable && (
          <div className="bg-[#161412] rounded-2xl border border-amber-500/40 p-3 sm:p-4 space-y-3.5 shadow-xl">
            <div className="p-2.5 sm:p-3 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 shrink-0" /> Hızlı Tek Tık Ekle:
                </span>
                <span className="text-[11px] text-stone-400 truncate">
                  Masa: <strong className="text-white">{activeTable.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {products
                  .filter((p) => p.isQuickFav)
                  .map((fav) => {
                    const inCartQty = activeTable.items
                      .filter((i) => i.productId === fav.id)
                      .reduce((s, i) => s + i.qty, 0);
                    return (
                      <button
                        key={fav.id}
                        onClick={() => addProductToTable(fav)}
                        className="px-2.5 py-2 rounded-xl bg-stone-950 hover:bg-amber-500 hover:text-stone-950 border border-stone-800 hover:border-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap shrink-0"
                      >
                        <span>{fav.image}</span>
                        <span>{fav.name}</span>
                        <span className="opacity-75">({formatTL(fav.price)})</span>
                        {inCartQty > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
                            {inCartQty}x
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Coffee className="w-4 h-4 shrink-0" /> Tüm Menü Kataloğu ({activeTable.name})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  placeholder="Ürün ara (Çay, Latte, Tost...)"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {["Tümü", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPosCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    posCategory === cat
                      ? "bg-stone-100 text-stone-950"
                      : "bg-stone-900 text-stone-400 hover:text-white border border-stone-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
              {products
                .filter(
                  (p) =>
                    (posCategory === "Tümü" || p.category === posCategory) &&
                    p.name.toLowerCase().includes(posSearch.toLowerCase())
                )
                .map((prd) => {
                  const existingItem = activeTable.items.find((i) => i.productId === prd.id && !i.note);
                  return (
                    <div
                      key={prd.id}
                      onClick={() => addProductToTable(prd)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95 ${
                        existingItem
                          ? "bg-amber-950/25 border-amber-500/50"
                          : "bg-stone-900/90 hover:bg-stone-800 border-stone-800 hover:border-amber-500/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xl sm:text-2xl">{prd.image}</span>
                        <span className="text-[11px] sm:text-xs font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-lg">
                          {formatTL(prd.price)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-100 group-hover:text-amber-300 line-clamp-1">
                            {prd.name}
                          </p>
                          <span className="text-[10px] text-stone-500 block truncate">{prd.category}</span>
                        </div>
                        {existingItem && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-0.5 bg-stone-950 px-1 py-0.5 rounded-lg border border-amber-500/40 shrink-0"
                          >
                            <button
                              onClick={() => updateOrderItemQty(existingItem.id, -1)}
                              className="text-stone-400 hover:text-rose-400 p-0.5"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] font-black text-amber-400 px-1">{existingItem.qty}</span>
                            <button
                              onClick={() => updateOrderItemQty(existingItem.id, 1)}
                              className="text-stone-400 hover:text-emerald-400 p-0.5"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Masa Kartları Grid */}
        <div
          className={`grid gap-3 sm:gap-4 ${
            activeTable
              ? "hidden xl:grid xl:grid-cols-3 2xl:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          }`}
        >
          {tables
            .filter((t) => selectedZone === "Tümü" || t.zone === selectedZone)
            .map((table) => {
              const isOccupied = table.status === "occupied";
              const isSelected = activeTableId === table.id;
              const isFastEsnaf = table.id === "tbl-esnaf-fast";
              const tableSubtotal = table.items.reduce((s, i) => s + i.price * i.qty, 0);
              const tableRemaining = Math.max(0, tableSubtotal - (table.discount || 0) - (table.paidAmount || 0));
              const tableStaff = staffList.find((s) => s.id === table.staffId);

              return (
                <button
                  key={table.id}
                  onClick={() => {
                    setActiveTableId(table.id);
                    setMobilePosPanel("menu");
                  }}
                  className={`pos-card-hover group relative text-left p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between min-h-[128px] sm:min-h-[140px] overflow-hidden ${
                    isSelected
                      ? "ring-2 ring-amber-400 bg-gradient-to-b from-stone-900 to-stone-950 border-amber-400 shadow-2xl shadow-amber-500/20"
                      : isOccupied
                      ? "bg-gradient-to-br from-amber-950/45 via-[#171412] to-[#12100e] border-amber-500/45 hover:border-amber-400"
                      : isFastEsnaf
                      ? "bg-gradient-to-br from-orange-950/35 via-[#171412] to-stone-950 border-orange-500/40 hover:border-orange-400"
                      : "glass-panel border-stone-800/90 hover:border-stone-700"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isOccupied
                        ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"
                        : isFastEsnaf
                        ? "bg-orange-500"
                        : "bg-emerald-500/30 group-hover:bg-emerald-400/60"
                    }`}
                  />
                  <div className="flex items-start justify-between gap-1.5 w-full pt-1">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block truncate">
                        {table.zone}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors mt-0.5 truncate">
                        {table.name}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isOccupied
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm"
                          : isFastEsnaf
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isOccupied ? "Dolu" : isFastEsnaf ? "Pratik" : "Müsait"}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="mt-2.5 pt-2 border-t border-stone-800/80 w-full space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-base sm:text-xl font-black text-amber-400 tracking-tight truncate">
                          {formatTL(tableRemaining)}
                        </span>
                        <span className="text-[10px] text-stone-300 bg-stone-950/70 px-1.5 py-0.5 rounded-lg border border-stone-800 flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          {getElapsedMinutes(table.openedAt)}dk
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-stone-400 gap-1">
                        <span className="font-semibold text-stone-300 truncate">
                          {table.items.reduce((s, i) => s + i.qty, 0)} Ürün
                        </span>
                        {tableStaff && (
                          <span className="text-stone-200 font-bold flex items-center gap-1 bg-stone-950/60 px-1.5 py-0.5 rounded-full truncate">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tableStaff.color }} />
                            <span className="truncate">{tableStaff.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-2 border-t border-stone-800/40 flex items-center justify-between text-[11px] sm:text-xs text-stone-500 group-hover:text-stone-300 transition-colors">
                      <span className="font-medium truncate">{isFastEsnaf ? "Esnafa Yaz" : "Adisyon Aç"}</span>
                      <div className="w-6 h-6 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center group-hover:border-amber-500/50 group-hover:text-amber-400 transition-all shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Sağ Alan: Aktif Masa Adisyonu & Tahsilat Paneli */}
      {activeTable && (
        <div
          className={`xl:col-span-5 ${
            mobilePosPanel === "menu" ? "hidden xl:flex" : "flex"
          } bg-[#161412] rounded-2xl border border-stone-800 shadow-2xl flex-col overflow-hidden xl:sticky xl:top-4`}
        >
          <div className="p-3.5 sm:p-4 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                  {activeTable.zone}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white truncate">{activeTable.name} Adisyonu</h3>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 truncate">
                {activeTable.openedAt
                  ? `Açılış: ${new Date(activeTable.openedAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })} (${getElapsedMinutes(activeTable.openedAt)} dk önce)`
                  : "Yeni Sipariş Bekleniyor"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeTable.items.length > 0 && (
                <button
                  onClick={() => setTransferModalOpen(true)}
                  title="Masayı Taşı / Birleştir"
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Masa Taşı</span>
                </button>
              )}
              <button
                onClick={() => setActiveTableId(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3.5 sm:px-4 py-3 bg-stone-950/60 border-b border-stone-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
              İlgilenen / Satışı Yapan Çalışan:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {staffList.map((st) => {
                const isAssigned = activeTable.staffId === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setTableStaff(st.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      isAssigned
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow"
                        : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="truncate">{st.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 flex-1 max-h-[320px] overflow-y-auto space-y-2.5">
            {activeTable.items.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <Coffee className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Bu masada henüz ürün yok.</p>
                <p className="text-xs">Soldaki menüden ürünlere tıklayarak adisyona ekleyebilirsin.</p>
              </div>
            ) : (
              activeTable.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-stone-900 border border-stone-800/90 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <button
                        onClick={() => setNoteModalItem(item)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 hover:text-amber-400"
                      >
                        {item.note ? "Notu Düzenle" : "+ Not"}
                      </button>
                    </div>
                    {item.note && <p className="text-[11px] text-amber-400/90 italic mt-0.5">“{item.note}”</p>}
                    <p className="text-xs text-stone-400 mt-0.5">
                      {formatTL(item.price)} x {item.qty} ={" "}
                      <span className="text-stone-200 font-bold">{formatTL(item.price * item.qty)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
                    <button
                      onClick={() => updateOrderItemQty(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center text-stone-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold text-white">{item.qty}</span>
                    <button
                      onClick={() => updateOrderItemQty(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-amber-500/20 hover:text-amber-400 flex items-center justify-center text-stone-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {activeTable.items.length > 0 &&
            (() => {
              const subtotal = activeTable.items.reduce((s, i) => s + i.price * i.qty, 0);
              const discount = activeTable.discount || 0;
              const paid = activeTable.paidAmount || 0;
              const finalPayable = Math.max(0, subtotal - discount - paid);

              return (
                <div className="p-4 bg-stone-900/95 border-t border-stone-800 space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-stone-400">
                      <span>Ara Toplam:</span>
                      <span className="font-semibold text-stone-200">{formatTL(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-400">
                      <span>İndirim (TL):</span>
                      <input
                        type="number"
                        min="0"
                        value={discount || ""}
                        onChange={(e) => setTableDiscount(e.target.value)}
                        placeholder="0 ₺"
                        className="w-20 text-right bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-xs text-amber-400 font-bold"
                      />
                    </div>
                    {paid > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Alınan Kısmi Ödeme:</span>
                        <span className="font-bold">-{formatTL(paid)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-base">
                      <span className="font-bold text-white">Kalan Tahsilat:</span>
                      <span className="text-2xl font-black text-amber-400">{formatTL(finalPayable)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPartialPayModalOpen(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 flex items-center justify-center gap-1.5"
                    >
                      <Percent className="w-3.5 h-3.5 text-amber-400" /> Alman Usulü / Kısmi Ödeme Al
                    </button>
                    <button
                      onClick={() => setTableDiscount(Math.round(subtotal * 0.1))}
                      className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-amber-400"
                    >
                      %10 İndirim
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Ödeme Yöntemi Seç & Hesabı Kapat (Otomatik Stoktan Düşer):
                    </span>
                    <button
                      onClick={() => {
                        setEsnafChargeMode("full");
                        if (!selectedEsnafForCharge && esnafList.length > 0) {
                          setSelectedEsnafForCharge(esnafList[0].id);
                        }
                        setEsnafChargeModalOpen(true);
                      }}
                      className="w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black text-xs flex items-center justify-between gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Store className="w-4 h-4 shrink-0" />
                        <span className="truncate">ESNAF CARİYE YAZ (VERESİYE)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-950/20 text-[10px] font-extrabold shrink-0">
                        Seç ➔
                      </span>
                    </button>

                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => completeTableOrder("Nakit")}
                        className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <Banknote className="w-4 h-4 shrink-0" /> NAKİT TAHSİLAT
                      </button>
                      <button
                        onClick={() => completeTableOrder("Kredi Kartı")}
                        className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                      >
                        <CreditCard className="w-4 h-4 shrink-0" /> KREDİ KARTI
                      </button>
                      <button
                        onClick={() => completeTableOrder("Yemek Kartı")}
                        className="py-2.5 px-3 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Ticket className="w-4 h-4 shrink-0" /> Yemek Kartı
                      </button>
                      <button
                        onClick={() => completeTableOrder("İkram / İptal")}
                        className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-rose-500/20 hover:text-rose-300 text-stone-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Gift className="w-4 h-4 shrink-0" /> İkram / Zayi Kapat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {/* Mobil Alt Sabit Sepet Butonu */}
      {activeTable && mobilePosPanel === "menu" && (
        <div className="xl:hidden fixed bottom-3 left-3 right-3 z-30">
          <button
            onClick={() => setMobilePosPanel("cart")}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-stone-950 font-black text-xs sm:text-sm flex items-center justify-between shadow-2xl border border-white/20"
          >
            <span className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span>
                {activeTable.name} Adisyonunu Gör & Ödeme Al ({activeTable.items.reduce((s, i) => s + i.qty, 0)} Ürün)
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-stone-950 text-amber-400 text-xs font-black">
              {formatTL(
                Math.max(
                  0,
                  activeTable.items.reduce((s, i) => s + i.price * i.qty, 0) -
                    (activeTable.discount || 0) -
                    (activeTable.paidAmount || 0)
                )
              )}{" "}
              ➔
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
