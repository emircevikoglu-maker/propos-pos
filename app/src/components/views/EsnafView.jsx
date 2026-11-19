import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL, formatDateShort } from "../../utils/formatters";
import { Store, BookOpen, Zap, Download, Search, Phone, Banknote, Copy, CirclePlus } from "../Icons";

export function EsnafView() {
  const {
    totalEsnafReceivable,
    esnafList,
    kpiMetrics,
    startFastEsnafOrder,
    exportExcelByCategory,
    esnafSearch,
    setEsnafSearch,
    selectedEsnafDetail,
    setSelectedEsnafDetail,
    setEsnafCollectModal,
    setEsnafCollectAmount,
    copyEsnafWhatsAppSummary,
    staffList,
    handleQuickCreateEsnaf,
    quickNewEsnafName,
    setQuickNewEsnafName,
    quickNewEsnafPhone,
    setQuickNewEsnafPhone,
    quickNewEsnafDiscount,
    setQuickNewEsnafDiscount
  } = usePos();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-orange-500/30">
          <div className="flex items-center justify-between text-xs text-orange-400 font-bold">
            <span>TOPLAM ESNAF CARİ ALACAK</span>
            <Store className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{formatTL(totalEsnafReceivable)}</p>
          <p className="text-xs text-stone-400 mt-1">
            Açık bakiyesi olan {esnafList.filter((e) => e.balance > 0).length} komşu işletme
          </p>
        </div>

        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-amber-500/30">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>SEÇİLİ DÖNEM CARİYE YAZILAN</span>
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{formatTL(kpiMetrics.cariWrittenTotal)}</p>
          <p className="text-xs text-stone-400 mt-1">Veresiye / açık hesaba işlenen siparişler</p>
        </div>

        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <span className="text-xs text-emerald-400 font-bold block">PRATİK ESNAF AKSİYONU</span>
            <p className="text-xs text-stone-300 mt-1">
              Masa açmadan komşu esnafa hızlı çay, kahve, tost gönderimi veya Excel dökümü:
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => startFastEsnafOrder()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20"
            >
              <Zap className="w-4 h-4" /> Hızlı Esnaf Siparişi
            </button>
            <button
              onClick={() => exportExcelByCategory("esnaf")}
              className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-emerald-600 hover:text-stone-950 border border-stone-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-stone-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Kayıtlı Çevre Esnaf & Cari Hesaplar</h3>
              <p className="text-xs text-stone-400">
                Esnafa tıklayarak hesap ekstresini görebilir veya tahsilat alabilirsiniz
              </p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={esnafSearch}
                onChange={(e) => setEsnafSearch(e.target.value)}
                placeholder="Esnaf ara..."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {esnafList
              .filter(
                (e) =>
                  e.name.toLowerCase().includes(esnafSearch.toLowerCase()) ||
                  e.shopType.toLowerCase().includes(esnafSearch.toLowerCase())
              )
              .map((esnaf) => {
                const isSelected = selectedEsnafDetail?.id === esnaf.id;
                return (
                  <div
                    key={esnaf.id}
                    onClick={() => setSelectedEsnafDetail(esnaf)}
                    className={`pos-card-hover p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-amber-950/25 border-amber-500 ring-1 ring-amber-500/50"
                        : "bg-stone-900/90 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] font-bold text-amber-400">
                          {esnaf.shopType}
                        </span>
                        <h4 className="text-sm font-extrabold text-white">{esnaf.name}</h4>
                        {esnaf.discountRate > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                            %{esnaf.discountRate} Esnaf İndirimi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {esnaf.phone}
                        </span>
                        {esnaf.note && <span className="text-amber-300/80 italic">• “{esnaf.note}”</span>}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-stone-400 block uppercase">Açık Bakiye</span>
                        <span
                          className={`text-lg font-black ${
                            esnaf.balance > 0 ? "text-orange-400" : "text-emerald-400"
                          }`}
                        >
                          {formatTL(esnaf.balance)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => startFastEsnafOrder(esnaf.id)}
                          title="Bu Esnafa Hızlı Sipariş Yaz"
                          className="px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-xs font-bold text-amber-400 transition-all"
                        >
                          + Sipariş Yaz
                        </button>
                        {esnaf.balance > 0 && (
                          <button
                            onClick={() => {
                              setEsnafCollectModal(esnaf);
                              setEsnafCollectAmount(String(esnaf.balance));
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-extrabold transition-all"
                          >
                            Tahsilat Al
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {selectedEsnafDetail ? (
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/40 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-400">{selectedEsnafDetail.shopType}</span>
                  <h3 className="text-lg font-black text-white">{selectedEsnafDetail.name}</h3>
                  <p className="text-xs text-stone-400">{selectedEsnafDetail.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block">Güncel Borç</span>
                  <span className="text-2xl font-black text-orange-400">{formatTL(selectedEsnafDetail.balance)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedEsnafDetail.balance > 0 && (
                  <button
                    onClick={() => {
                      setEsnafCollectModal(selectedEsnafDetail);
                      setEsnafCollectAmount(String(selectedEsnafDetail.balance));
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5"
                  >
                    <Banknote className="w-4 h-4" /> Tahsilat Al (Borç Düş)
                  </button>
                )}
                <button
                  onClick={() => copyEsnafWhatsAppSummary(selectedEsnafDetail)}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" /> WhatsApp Özeti Kopyala
                </button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Son Cari Hesap Hareketleri ({selectedEsnafDetail.transactions?.length || 0})
                </h4>
                {(selectedEsnafDetail.transactions || []).length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center">Henüz cari hareket bulunmuyor.</p>
                ) : (
                  selectedEsnafDetail.transactions.map((tx) => {
                    const st = staffList.find((s) => s.id === tx.staffId);
                    const isPayment = tx.type === "payment";
                    return (
                      <div
                        key={tx.id}
                        className={`p-3 rounded-xl border text-xs ${
                          isPayment ? "bg-emerald-950/20 border-emerald-500/30" : "bg-stone-900 border-stone-800"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className={isPayment ? "text-emerald-400" : "text-orange-400"}>
                            {isPayment ? `✓ Tahsilat (${tx.paymentMethod})` : "☕ Sipariş / Adisyon Yazıldı"}
                          </span>
                          <span className={`text-sm font-black ${isPayment ? "text-emerald-400" : "text-white"}`}>
                            {isPayment ? `-${formatTL(tx.amount)}` : `+${formatTL(tx.amount)}`}
                          </span>
                        </div>
                        {tx.items && tx.items.length > 0 && (
                          <p className="text-stone-300 mt-1">{tx.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1.5 pt-1 border-t border-stone-800/60">
                          <span>
                            {formatDateShort(tx.timestamp)} • {st?.name || "Kasa"}
                          </span>
                          {tx.note && <span className="italic text-stone-400">“{tx.note}”</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-5 rounded-2xl border border-stone-800 text-center py-10 space-y-2">
              <Store className="w-10 h-10 text-amber-500/50 mx-auto" />
              <h4 className="text-sm font-bold text-white">Esnaf Ekstresi Seçilmedi</h4>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Soldaki listeden bir komşu esnafa tıklayarak ne zaman ne içtiğini ve yaptığı ödemeleri detaylı
                görebilirsiniz.
              </p>
            </div>
          )}

          <div className="glass-panel p-5 rounded-2xl border border-stone-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CirclePlus className="w-4 h-4 text-amber-500" /> Yeni Komşu Esnaf Cari Kartı Aç
            </h3>
            <form onSubmit={handleQuickCreateEsnaf} className="space-y-2.5 text-xs">
              <input
                type="text"
                required
                value={quickNewEsnafName}
                onChange={(e) => setQuickNewEsnafName(e.target.value)}
                placeholder="İşletme / Esnaf Adı (Örn: Çiçekçi Meltem)"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={quickNewEsnafPhone}
                  onChange={(e) => setQuickNewEsnafPhone(e.target.value)}
                  placeholder="Telefon (0532...)"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
                />
                <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl px-3 py-2">
                  <span className="text-stone-400 mr-2">İndirim %:</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={quickNewEsnafDiscount}
                    onChange={(e) => setQuickNewEsnafDiscount(e.target.value)}
                    className="w-full bg-transparent text-amber-400 font-bold focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs"
              >
                Esnafı Cari Listesine Kaydet
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
