import React from "react";
import { OPTION_PRESETS, MAX_GROUPS, MAX_CHOICES, groupFromPreset, newId } from "../../utils/productOptions";

const input = "bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-xs text-white";

/**
 * Ürün çeşitleri düzenleyicisi (içecek boyu, süt tipi, şeker, ekstra…).
 * props: value (gruplar), onChange(gruplar)
 */
export function ProductOptionsEditor({ value, onChange }) {
  const groups = Array.isArray(value) ? value : [];
  const update = (gi, patch) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updateChoice = (gi, ci, patch) => update(gi, { choices: groups[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });
  const remove = (gi) => onChange(groups.filter((_, i) => i !== gi));
  const move = (gi, d) => {
    const j = gi + d;
    if (j < 0 || j >= groups.length) return;
    const next = [...groups];
    [next[gi], next[j]] = [next[j], next[gi]];
    onChange(next);
  };
  const existing = new Set(groups.map((g) => g.name));

  return (
    <div className="space-y-3" data-testid="options-editor">
      <div>
        <span className="text-[11px] font-medium text-stone-400 block mb-1.5">Çeşitler / seçenekler (ör. boy, süt, şeker)</span>
        <div className="flex flex-wrap gap-1.5">
          {OPTION_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={groups.length >= MAX_GROUPS || existing.has(p.name)}
              onClick={() => onChange([...groups, groupFromPreset(p)])}
              className="px-2.5 py-1.5 rounded-lg border border-stone-700 text-[11px] text-stone-200 hover:border-amber-500 disabled:opacity-40"
            >
              + {p.name}
            </button>
          ))}
          <button
            type="button"
            disabled={groups.length >= MAX_GROUPS}
            onClick={() => onChange([...groups, { id: newId("og"), name: "", type: "single", required: false, max: 1, choices: [{ id: newId("oc"), name: "", price: 0 }] }])}
            className="px-2.5 py-1.5 rounded-lg border border-dashed border-stone-700 text-[11px] text-stone-300 hover:border-amber-500 disabled:opacity-40"
          >
            + Boş grup
          </button>
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={g.id || gi} className="rounded-xl border border-stone-800 bg-stone-900/60 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label="Grup adı" value={g.name} onChange={(e) => update(gi, { name: e.target.value.slice(0, 40) })} placeholder="Grup adı (ör. Boy)" className={`${input} flex-1 min-w-[8rem]`} />
            <select aria-label="Seçim türü" value={g.type} onChange={(e) => update(gi, { type: e.target.value, max: e.target.value === "single" ? 1 : g.choices.length })} className={input}>
              <option value="single">Tek seçim</option>
              <option value="multi">Çoklu seçim</option>
            </select>
            {g.type === "multi" && (
              <label className="flex items-center gap-1 text-[11px] text-stone-400">
                en fazla
                <input aria-label="En fazla seçim" type="number" min={1} max={g.choices.length || 1} value={g.max || 1} onChange={(e) => update(gi, { max: Number(e.target.value) || 1 })} className={`${input} w-14`} />
              </label>
            )}
            <label className="flex items-center gap-1.5 text-[11px] text-stone-300">
              <input type="checkbox" checked={!!g.required} onChange={(e) => update(gi, { required: e.target.checked })} /> Zorunlu
            </label>
            <div className="flex gap-1">
              <button type="button" aria-label="Yukarı taşı" onClick={() => move(gi, -1)} className="px-2 py-1 rounded-lg bg-stone-800 text-stone-300 text-xs">↑</button>
              <button type="button" aria-label="Aşağı taşı" onClick={() => move(gi, 1)} className="px-2 py-1 rounded-lg bg-stone-800 text-stone-300 text-xs">↓</button>
              <button type="button" aria-label="Grubu sil" onClick={() => remove(gi)} className="px-2 py-1 rounded-lg bg-stone-800 text-rose-400 text-xs">Sil</button>
            </div>
          </div>
          {g.choices.map((c, ci) => (
            <div key={c.id || ci} className="flex items-center gap-2">
              <input aria-label="Seçenek adı" value={c.name} onChange={(e) => updateChoice(gi, ci, { name: e.target.value.slice(0, 40) })} placeholder="Seçenek (ör. Orta)" className={`${input} flex-1`} />
              <input aria-label="Fiyat farkı" type="number" step="0.5" value={c.price} onChange={(e) => updateChoice(gi, ci, { price: e.target.value === "" ? 0 : Number(e.target.value) })} className={`${input} w-20`} title="Fiyat farkı (+/−)" />
              <button type="button" aria-label="Seçeneği sil" disabled={g.choices.length <= 1} onClick={() => update(gi, { choices: g.choices.filter((_, i) => i !== ci) })} className="px-2 py-1 rounded-lg bg-stone-800 text-rose-400 text-xs disabled:opacity-40">✕</button>
            </div>
          ))}
          <button
            type="button"
            disabled={g.choices.length >= MAX_CHOICES}
            onClick={() => update(gi, { choices: [...g.choices, { id: newId("oc"), name: "", price: 0 }] })}
            className="text-[11px] text-amber-400 hover:text-amber-300 disabled:opacity-40"
          >
            + Seçenek ekle
          </button>
        </div>
      ))}
      {groups.length > 0 && <p className="text-[10px] text-stone-500">Fiyat farkı taban fiyata eklenir. Boş adlı seçenekler kaydedilmez.</p>}
    </div>
  );
}
