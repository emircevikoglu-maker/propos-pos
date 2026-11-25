import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { Banknote, CreditCard, Ticket, Store, Gift, Download } from "../Icons";

export function StaffView() {
  const { kpiMetrics, staffPerformance, exportExcelByCategory } = usePos();

  const maxStaffTotal = Math.max(1, ...staffPerformance.map((s) => s.total + s.cariWritten));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-[#161412] border border-emerald-500/30">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>NAKİT KASA TOPLAMI</span>
            <Banknote className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatTL(kpiMetrics.byMethod["Nakit"] || 0)}</p>
          <p className="text-xs text-stone-400 mt-1">Kasada bulunan nakit giriş</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161412] border border-amber-500/30">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>KREDİ KARTI (POS)</span>
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatTL(kpiMetrics.byMethod["Kredi Kartı"] || 0)}</p>
          <p className="text-xs text-stone-400 mt-1">Banka POS cihazı toplamı</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161412] border border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
            <span>YEMEK KARTI SATIŞI</span>
            <Ticket className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatTL(kpiMetrics.byMethod["Yemek Kartı"] || 0)}</p>
          <p className="text-xs text-stone-400 mt-1">Multinet / Sodexo / Ticket</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161412] border border-orange-500/30">
          <div className="flex items-center justify-between text-xs text-orange-400 font-medium">
            <span>ESNAF CARİYE YAZILAN</span>
            <Store className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatTL(kpiMetrics.byMethod["Esnaf Cariye Yazıldı"] || 0)}
          </p>
          <p className="text-xs text-stone-400 mt-1">Açık hesaba işlenen satışlar</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>İKRAM & İPTAL TUTARI</span>
            <Gift className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-stone-300 mt-2">
            {formatTL(kpiMetrics.byMethod["İkram / İptal"] || 0)}
          </p>
          <p className="text-xs text-stone-500 mt-1">Ciroya dahil edilmeyen ikramlar</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#161412] border border-stone-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Çalışanların Ödeme Yöntemine Göre Satış Dökümü</h3>
            <p className="text-xs text-stone-400">
              Hangi çalışanın Nakit, Kredi Kartı, Yemek Kartı veya Esnaf Cari ile ne kadar satış kapattığını anlık takip
              edin.
            </p>
          </div>
          <button
            onClick={() => exportExcelByCategory("staff")}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" /> Çalışan & Kasa Özeti Excel İndir (.XLS)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-xs text-stone-400 uppercase">
                <th className="py-3.5 px-4">Çalışan</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">Nakit Satış</th>
                <th className="py-3.5 px-4 text-right text-amber-400">Kredi Kartı</th>
                <th className="py-3.5 px-4 text-right text-blue-400">Yemek Kartı</th>
                <th className="py-3.5 px-4 text-right text-orange-400">Esnaf Cariye Yazılan</th>
                <th className="py-3.5 px-4 text-center">Adisyon / Ürün</th>
                <th className="py-3.5 px-4 text-right">Net Kasa Tahsilatı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70">
              {staffPerformance.map((st) => {
                const sharePercent =
                  kpiMetrics.grossRevenue > 0 ? Math.round((st.total / kpiMetrics.grossRevenue) * 100) : 0;
                return (
                  <tr key={st.id} className="hover:bg-stone-900/60">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-medium text-stone-950"
                          style={{ backgroundColor: st.color }}
                        >
                          {st.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-white">{st.name}</p>
                          <span className="text-xs text-stone-400">{st.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-emerald-400">{formatTL(st.cash)}</td>
                    <td className="py-4 px-4 text-right font-medium text-amber-400">{formatTL(st.card)}</td>
                    <td className="py-4 px-4 text-right font-medium text-blue-400">{formatTL(st.mealCard)}</td>
                    <td className="py-4 px-4 text-right font-medium text-orange-400">{formatTL(st.cariWritten)}</td>
                    <td className="py-4 px-4 text-center text-xs text-stone-300">
                      <span className="font-medium text-white">{st.orderCount}</span> Adisyon ({st.itemCount} ürün)
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-base font-semibold text-white">{formatTL(st.total)}</span>
                        <span className="text-[11px] text-amber-400">Net kasanın %{sharePercent}&apos;i</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-stone-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Çalışan Satış & Ödeme Kanalı Karşılaştırma Grafiği
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Nakit
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Kredi Kartı
              </span>
              <span className="flex items-center gap-1 text-blue-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Yemek Kartı
              </span>
              <span className="flex items-center gap-1 text-orange-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" /> Esnaf Cari
              </span>
            </div>
          </div>

          <div className="space-y-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800/80">
            {staffPerformance.map((st) => {
              const combined = st.total + st.cariWritten;
              const cashW = Math.round((st.cash / maxStaffTotal) * 100);
              const cardW = Math.round((st.card / maxStaffTotal) * 100);
              const mealW = Math.round((st.mealCard / maxStaffTotal) * 100);
              const cariW = Math.round((st.cariWritten / maxStaffTotal) * 100);

              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{st.name}</span>
                    <span className="font-medium text-amber-400">{formatTL(combined)}</span>
                  </div>
                  <div className="w-full h-4 bg-stone-900 rounded-lg overflow-hidden flex">
                    {cashW > 0 && (
                      <div
                        style={{ width: `${cashW}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Nakit: ${formatTL(st.cash)}`}
                      />
                    )}
                    {cardW > 0 && (
                      <div
                        style={{ width: `${cardW}%` }}
                        className="bg-amber-500 h-full"
                        title={`Kart: ${formatTL(st.card)}`}
                      />
                    )}
                    {mealW > 0 && (
                      <div
                        style={{ width: `${mealW}%` }}
                        className="bg-blue-500 h-full"
                        title={`Yemek Kartı: ${formatTL(st.mealCard)}`}
                      />
                    )}
                    {cariW > 0 && (
                      <div
                        style={{ width: `${cariW}%` }}
                        className="bg-orange-500 h-full"
                        title={`Esnaf Cari: ${formatTL(st.cariWritten)}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
