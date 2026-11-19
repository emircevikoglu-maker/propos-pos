import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL, formatDateShort } from "../../utils/formatters";
import { CirclePlus, PenLine, Trash2 } from "../Icons";

export function FinanceView() {
  const {
    handleAddExpense,
    newExpTitle,
    setNewExpTitle,
    newExpCategory,
    setNewExpCategory,
    newExpAmount,
    setNewExpAmount,
    newExpMethod,
    setNewExpMethod,
    newExpNote,
    setNewExpNote,
    kpiMetrics,
    filteredExpenses,
    setEditingExpId,
    setExpenses
  } = usePos();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-4 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CirclePlus className="w-5 h-5 text-rose-400" /> Yeni Gider / Fatura Kaydet
        </h3>
        <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
          <div>
            <label className="text-stone-400 font-semibold block mb-1">Gider Başlığı / Açıklama</label>
            <input
              type="text"
              required
              value={newExpTitle}
              onChange={(e) => setNewExpTitle(e.target.value)}
              placeholder="Örn: Süt & Kahve Alımı, Elektrik Faturası..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-stone-400 font-semibold block mb-1">Kategori</label>
              <select
                value={newExpCategory}
                onChange={(e) => setNewExpCategory(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white focus:border-amber-500 focus:outline-none"
              >
                <option>Toptancı / Malzeme</option>
                <option>Fatura / Sabit Gider</option>
                <option>Kira & Aidat</option>
                <option>Personel Gideri</option>
                <option>Bakım / Ekipman</option>
                <option>Vergi & Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-stone-400 font-semibold block mb-1">Tutar (TL)</label>
              <input
                type="number"
                required
                min="1"
                value={newExpAmount}
                onChange={(e) => setNewExpAmount(e.target.value)}
                placeholder="0 ₺"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-stone-400 font-semibold block mb-1">Ödeme Çıkış Yöntemi</label>
            <select
              value={newExpMethod}
              onChange={(e) => setNewExpMethod(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-white focus:border-amber-500 focus:outline-none"
            >
              <option>Nakit</option>
              <option>Kredi Kartı</option>
              <option>Banka / Havale</option>
              <option>Yemek Kartı</option>
            </select>
          </div>
          <div>
            <label className="text-stone-400 font-semibold block mb-1">Not (Opsiyonel)</label>
            <input
              type="text"
              value={newExpNote}
              onChange={(e) => setNewExpNote(e.target.value)}
              placeholder="Fatura no veya tedarikçi adı..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/20 transition-all"
          >
            Gideri Kaydet ve Net Kârdan Düş
          </button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-xs text-emerald-400 font-bold">TOPLAM GELİR (CİRO)</span>
            <p className="text-2xl font-black text-white mt-1">{formatTL(kpiMetrics.grossRevenue)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30">
            <span className="text-xs text-rose-400 font-bold">TOPLAM GİDERLER</span>
            <p className="text-2xl font-black text-white mt-1">{formatTL(kpiMetrics.totalExpenses)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40">
            <span className="text-xs text-amber-400 font-bold">NET KÂR / KALAN</span>
            <p
              className={`text-2xl font-black mt-1 ${
                kpiMetrics.netProfit >= 0 ? "text-amber-400" : "text-rose-400"
              }`}
            >
              {formatTL(kpiMetrics.netProfit)}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
          <h3 className="text-base font-bold text-white">Kayıtlı İşletme Giderleri</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase">
                  <th className="py-3 px-3">Tarih</th>
                  <th className="py-3 px-3">Gider Başlığı</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Ödeme</th>
                  <th className="py-3 px-3 text-right">Tutar</th>
                  <th className="py-3 px-3 text-center">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-900/50">
                    <td className="py-3 px-3 text-stone-400 whitespace-nowrap">{formatDateShort(exp.timestamp)}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-white">{exp.title}</p>
                      {exp.note && <span className="text-[11px] text-stone-500">{exp.note}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-medium">{exp.category}</span>
                    </td>
                    <td className="py-3 px-3 text-stone-300">{exp.paymentMethod}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-rose-400">-{formatTL(exp.amount)}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingExpId(exp.id);
                            setNewExpTitle(exp.title);
                            setNewExpCategory(exp.category);
                            setNewExpAmount(String(exp.amount));
                            setNewExpMethod(exp.paymentMethod);
                            setNewExpNote(exp.note || "");
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-stone-400 hover:text-amber-400"
                        >
                          <PenLine className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== exp.id))}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
