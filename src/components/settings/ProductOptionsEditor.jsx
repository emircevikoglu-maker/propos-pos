import React from "react";
import { OPTION_PRESETS, MAX_GROUPS, MAX_CHOICES, groupFromPreset, newId } from "../../utils/productOptions";
import { Ic } from "../../ui/Ic";

/**
 * Ürün çeşitleri düzenleyicisi (içecek boyu, süt tipi, şeker, ekstra…).
 * props: value (gruplar), onChange(gruplar)
 */
export function ProductOptionsEditor({ value, onChange, ingredients = [] }) {
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
    <div className="field" data-testid="options-editor">
      <span className="ops-title">Çeşitler / seçenekler (ör. boy, süt, şeker)</span>
      <div className="ops-row">
        {OPTION_PRESETS.map((p) => (
          <button key={p.key} type="button" className="chip" disabled={groups.length >= MAX_GROUPS || existing.has(p.name)} onClick={() => onChange([...groups, groupFromPreset(p)])}>
            + {p.name}
          </button>
        ))}
        <button type="button" className="chip chip-dashed" disabled={groups.length >= MAX_GROUPS}
          onClick={() => onChange([...groups, { id: newId("og"), name: "", type: "single", required: false, max: 1, choices: [{ id: newId("oc"), name: "", price: 0 }] }])}>
          + Boş grup
        </button>
      </div>

      {groups.map((g, gi) => (
        <div key={g.id || gi} className="opt-card">
          <div className="opt-card-head">
            <input className="field-input opt-card-name" aria-label="Grup adı" value={g.name} onChange={(e) => update(gi, { name: e.target.value.slice(0, 40) })} placeholder="Grup adı (ör. Boy)" />
            <button type="button" className="icon-btn" aria-label="Yukarı taşı" onClick={() => move(gi, -1)}>↑</button>
            <button type="button" className="icon-btn" aria-label="Aşağı taşı" onClick={() => move(gi, 1)}>↓</button>
            <button type="button" className="icon-btn" aria-label="Grubu sil" onClick={() => remove(gi)}><Ic n="trash" /></button>
          </div>
          <div className="ops-row">
            <select className="field-input" style={{ width: "auto" }} aria-label="Seçim türü" value={g.type} onChange={(e) => update(gi, { type: e.target.value, max: e.target.value === "single" ? 1 : g.choices.length })}>
              <option value="single">Tek seçim</option>
              <option value="multi">Çoklu seçim</option>
            </select>
            {g.type === "multi" && (
              <label className="opt-card-max">
                <span className="label">en fazla</span>
                <input className="field-input" aria-label="En fazla seçim" type="number" min={1} max={g.choices.length || 1} value={g.max || 1} onChange={(e) => update(gi, { max: Number(e.target.value) || 1 })} />
              </label>
            )}
            <button type="button" className="chip" aria-pressed={!!g.required} onClick={() => update(gi, { required: !g.required })}>Zorunlu</button>
          </div>
          {g.choices.map((c, ci) => (
            <div key={c.id || ci} className="opt-card-choice">
              <input className="field-input" aria-label="Seçenek adı" value={c.name} onChange={(e) => updateChoice(gi, ci, { name: e.target.value.slice(0, 40) })} placeholder="Seçenek (ör. Orta)" />
              <label className="opt-card-price">
                <span className="label">₺ fark</span>
                <input className="field-input" aria-label="Fiyat farkı" type="number" step="0.5" value={c.price} onChange={(e) => updateChoice(gi, ci, { price: e.target.value === "" ? 0 : Number(e.target.value) })} />
              </label>
              <button type="button" className="icon-btn" aria-label="Seçeneği sil" disabled={g.choices.length <= 1} onClick={() => update(gi, { choices: g.choices.filter((_, i) => i !== ci) })}><Ic n="x" /></button>
              {ingredients.length > 0 && <ChoiceRecipe ingredients={ingredients} recipe={c.recipe || []} onChange={(recipe) => updateChoice(gi, ci, { recipe })} />}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" style={{ justifySelf: "start" }} disabled={g.choices.length >= MAX_CHOICES}
            onClick={() => update(gi, { choices: [...g.choices, { id: newId("oc"), name: "", price: 0 }] })}>
            + Seçenek ekle
          </button>
        </div>
      ))}
      {groups.length > 0 && <span className="label">Fiyat farkı taban fiyata eklenir. Boş adlı seçenekler kaydedilmez.</span>}
    </div>
  );
}

/** Seçeneğin ek stok tüketimi (ör. Ekstra shot → +18 g kahve): tek satırlık kompakt düzenleyici. */
function ChoiceRecipe({ ingredients, recipe, onChange }) {
  const [ing, setIng] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const name = (id) => (ingredients.find((i) => i.id === id) || {}).name || id;
  const unit = (id) => (ingredients.find((i) => i.id === id) || {}).unit || "";
  const add = () => {
    const a = Number(amt);
    if (!ing || !Number.isFinite(a) || a <= 0) return;
    onChange([...recipe.filter((r) => r.ingredientId !== ing), { ingredientId: ing, amount: a }]);
    setAmt("");
  };
  return (
    <div className="choice-recipe" title="Bu seçenek seçilince stoktan ek düşülür">
      {recipe.map((r) => (
        <button key={r.ingredientId} type="button" className="chip" aria-label="Stok tüketimini kaldır" onClick={() => onChange(recipe.filter((x) => x.ingredientId !== r.ingredientId))}>
          +{r.amount} {unit(r.ingredientId)} {name(r.ingredientId)} ×
        </button>
      ))}
      {!open ? (
        <button type="button" className="btn btn-ghost choice-recipe-toggle" onClick={() => setOpen(true)}>+ stok tüketimi</button>
      ) : (
        <>
          <select className="field-input" aria-label="Stok malzemesi" value={ing} onChange={(e) => setIng(e.target.value)}>
            <option value="">Malzeme…</option>
            {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <input className="field-input" aria-label="Stok miktarı" type="number" min="0" step="any" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={ing ? unit(ing) : "miktar"} />
          <button type="button" className="btn btn-secondary" aria-label="Stok tüketimi ekle" onClick={add}>Ekle</button>
        </>
      )}
    </div>
  );
}
