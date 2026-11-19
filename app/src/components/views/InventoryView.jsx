import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { TriangleAlert } from "../Icons";

export function InventoryView() {
  const {
    criticalIngredients,
    ingredients,
    products,
    setStockModalIng,
    setStockAdjustType,
    setStockAdjustAmount,
    setStockExpenseCost
  } = usePos();

  return (
    <div className="space-y-6">
      {criticalIngredients.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TriangleAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-200">
                Kritik Stok Uyarısı ({criticalIngredients.length} Malzeme Azaldı!)
              </h4>
              <p className="text-xs text-rose-300/80">
                {criticalIngredients.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(" • ")}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-xl">
            Lütfen Tedarik Ekleyin
          </span>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">Kafe Hammadde & Malzeme Stok Durumu</h3>
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
                    <h4 className="text-sm font-bold text-white">{ing.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                    <span className="text-2xl font-black text-amber-400">
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
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-stone-950 text-xs font-bold transition-all"
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
          <h3 className="text-base font-bold text-white">Ürün Reçeteleri & Otomatik Stok Düşüm Haritası</h3>
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
                      <p className="text-xs font-bold text-white">{prd.name}</p>
                      <span className="text-[10px] text-stone-400">Satış: {formatTL(prd.price)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
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
    </div>
  );
}
