import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { TriangleAlert } from "../Icons";
import { summarizeStockLog } from "../../utils/stockLog";

export function InventoryView() {
  const {
    criticalIngredients,
    ingredients,
    products,
    setStockModalIng,
    setStockAdjustType,
    setStockAdjustAmount,
    setStockExpenseCost,
    stockLog,
    isAdminUnlocked
  } = usePos();
  const logSummary = React.useMemo(() => summarizeStockLog(stockLog, Date.now() - 30 * 86400000), [stockLog]);

  return (
    <div className="space-y-6">
      {criticalIngredients.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TriangleAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-rose-200">
                Kritik Stok Uyarısı ({criticalIngredients.length} Malzeme Azaldı!)
              </h4>
              <p className="text-xs text-rose-300/80">
                {criticalIngredients.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(" • ")}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-rose-300 bg-rose-500/20 px-3 py-1 rounded-xl">
            Lütfen Tedarik Ekleyin
          </span>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">Kafe Hammadde & Malzeme Stok Durumu</h3>
            <p className="text-xs text-stone-400">
              Her adisyon kapandığında ürün reçetesine göre (kahve gr, süt ml, tatlı adet) otomatik düşer.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ingredients.map((ing) => {
            const isCritical = ing.stock <= ing.minLimit;
            const ratio = Math.min(100, Math.round((ing.stock / (ing.minLimit * 2.5)) * 100));
            return (
              <div
                key={ing.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                  isCritical ? "bg-rose-950/20 border-rose-500/40" : "bg-stone-900/90 border-stone-800"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white">{ing.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                        ing.stock <= 0
                          ? "bg-rose-600 text-white"
                          : isCritical
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {ing.stock <= 0 ? "Tükendi" : isCritical ? "Kritik Stok" : "Yeterli"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-amber-400">
                      {ing.stock} <span className="text-xs font-semibold text-stone-400">{ing.unit}</span>
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Kritik Sınır: {ing.minLimit} {ing.unit}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${isCritical ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(5, ratio)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">
                    Birim Maliyet: ~{ing.unitCost} ₺/{ing.unit}
                  </span>
                  <button
                    onClick={() => {
                      setStockModalIng(ing);
                      setStockAdjustType("add");
                      setStockAdjustAmount("");
                      setStockExpenseCost("");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-stone-950 text-xs font-medium transition-all"
                  >
                    + Stok Gir / Düzenle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white">Ürün Reçeteleri & Otomatik Stok Düşüm Haritası</h3>
          <p className="text-xs text-stone-400">
            Satılan her 1 adet ürün için stoktan otomatik düşülen malzeme miktarları ve tahmini hammadde maliyeti:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((prd) => {
            const recipeCost = (prd.recipe || []).reduce((sum, r) => {
              const ing = ingredients.find((i) => i.id === r.ingredientId);
              return sum + (ing ? ing.unitCost * r.amount : 0);
            }, 0);
            const margin = prd.price - recipeCost;
            return (
              <div key={prd.id} className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{prd.image}</span>
                    <div>
                      <p className="text-xs font-medium text-white">{prd.name}</p>
                      <span className="text-[10px] text-stone-400">Satış: {formatTL(prd.price)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Brüt Kâr: ~{formatTL(margin)}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 space-y-1 pt-1 border-t border-stone-800/80">
                  {(prd.recipe || []).map((r, i) => {
                    const ing = ingredients.find((x) => x.id === r.ingredientId);
                    return (
                      <div key={i} className="flex justify-between">
                        <span>• {ing?.name || "Malzeme"}</span>
                        <span className="text-amber-400 font-semibold">
                          -{r.amount} {ing?.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-3" aria-label="Atık ve sayım kaydı">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">Atık &amp; sayım kaydı (son 30 gün)</h3>
          {isAdminUnlocked && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="pp-pill is-warn">Atık {formatTL(logSummary.wasteCost)}</span>
              <span className="pp-pill is-warn">Sayım eksiği {formatTL(Math.abs(logSummary.shortageCost))}</span>
              <span className="pp-pill is-ok">Sayım fazlası {formatTL(logSummary.surplusCost)}</span>
            </div>
          )}
        </div>
        {(!stockLog || stockLog.length === 0) ? (
          <p className="text-xs text-stone-400">Henüz kayıt yok. Malzeme kartından "Zayi / Düşüm" ya da "Sayım Sabitle" kullanın; her işlem burada görünür.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-stone-400"><tr><th className="p-2 font-medium">Zaman</th><th className="p-2 font-medium">Malzeme</th><th className="p-2 font-medium">Tür</th><th className="p-2 font-medium">Miktar</th><th className="p-2 font-medium">Sebep</th>{isAdminUnlocked && <th className="p-2 font-medium text-right">Maliyet</th>}</tr></thead>
              <tbody>
                {stockLog.slice(0, 50).map((e) => (
                  <tr key={e.id} className="border-t border-stone-800">
                    <td className="p-2 whitespace-nowrap">{new Date(e.timestamp).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="p-2">{e.name}</td>
                    <td className="p-2">{e.kind === "waste" ? "Zayi" : "Sayım"}</td>
                    <td className="p-2 tabular-nums">{e.amount > 0 && e.kind === "count" ? "+" : ""}{e.amount} {e.unit}</td>
                    <td className="p-2">{e.reason}</td>
                    {isAdminUnlocked && <td className="p-2 text-right tabular-nums">{formatTL(e.cost)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
