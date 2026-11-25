import React from "react";
import {
  sanitizeOptionGroups, defaultSelection, toggleChoice, validateSelection, resolveSelection, unitPrice
} from "../../utils/productOptions";

/**
 * Ürün eklerken çeşit seçimi (boy, süt, şeker…). Zorunlu gruplarda ilk seçenek hazır gelir;
 * sık durumda "Ekle"ye basmak yeter.
 * props: product, formatPrice(n), onConfirm(selection), onCancel()
 */
export function OptionPicker({ product, formatPrice = (n) => String(n), onConfirm, onCancel }) {
  const groups = React.useMemo(() => sanitizeOptionGroups(product.options), [product]);
  const [selection, setSelection] = React.useState(() => defaultSelection(product));
  const { ok, errors } = validateSelection(product, selection);
  const total = unitPrice(product, resolveSelection(product, selection));

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`${product.name} seçenekleri`}>
      <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-stone-800 bg-[#181512] p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">{product.image}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-white">{product.name}</h3>
            <p className="text-xs text-stone-400">Taban fiyat {formatPrice(product.price)}</p>
          </div>
        </div>
        {groups.map((g) => {
          const cur = selection[g.id] || [];
          return (
            <fieldset key={g.id} className="space-y-2">
              <legend className="text-sm font-medium text-stone-200">
                {g.name}
                <span className="ml-2 text-xs font-normal text-stone-500">
                  {g.required ? "zorunlu" : "isteğe bağlı"}{g.type === "multi" ? ` · en fazla ${g.max}` : ""}
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {g.choices.map((c) => {
                  const active = cur.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelection((s) => toggleChoice(product, s, g.id, c.id))}
                      className={`min-h-[44px] rounded-xl border px-3 text-sm transition-colors ${active ? "border-amber-500 bg-amber-500/15 text-amber-200" : "border-stone-700 bg-stone-900 text-stone-200 hover:border-stone-500"}`}
                    >
                      {c.name}
                      {c.price !== 0 && <span className="ml-1.5 text-xs text-stone-400">{c.price > 0 ? "+" : "−"}{formatPrice(Math.abs(c.price))}</span>}
                    </button>
                  );
                })}
              </div>
              {errors[g.id] && <p className="text-xs text-rose-400">{errors[g.id]}</p>}
            </fieldset>
          );
        })}
        <div className="flex gap-2 pt-1">
          <button type="button" disabled={!ok} onClick={() => onConfirm(selection)} className="flex-1 min-h-[48px] rounded-xl bg-amber-500 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50">
            Ekle — {formatPrice(total)}
          </button>
          <button type="button" onClick={onCancel} className="min-h-[48px] rounded-xl border border-stone-700 px-4 text-sm text-stone-300 hover:bg-stone-800">Vazgeç</button>
        </div>
      </div>
    </div>
  );
}
