import React from "react";
import { formatTL } from "../../utils/formatters";
import { recipeCost } from "../../utils/ledger";
import { UNITS, upsertRecipeRow, validateIngredient } from "../../utils/ingredients";
import { Ic } from "../Ic";

const tl = (n) => `${(Math.round(n * 100) / 100).toLocaleString("tr-TR")} ₺`;

/**
 * Ürün reçetesi: 1 adet satışta stoktan düşenler. Satır başına miktar yerinde düzenlenir;
 * "çıkarılabilir" açık olanlar satışta içerik penceresinde kapatılabilir.
 * Listede olmayan malzeme burada tanımlanır (onCreate yeni kimliği döndürür).
 */
export function RecipeEditor({ value, onChange, ingredients, price, onCreate }) {
  const recipe = Array.isArray(value) ? value : [];
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const [pick, setPick] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [draft, setDraft] = React.useState(null); // yeni malzeme: {name, unit, unitCost}
  const [error, setError] = React.useState("");
  const selected = byId.get(pick) || null;
  const cost = recipeCost({ recipe }, byId);
  const salePrice = Number(price) || 0;

  const add = () => {
    const next = upsertRecipeRow(recipe, pick, amount);
    if (next === recipe) { setError(pick ? "Miktar 0'dan büyük olmalı." : "Önce malzeme seçin."); return; }
    onChange(next);
    setPick(""); setAmount(""); setError("");
  };
  const create = () => {
    const res = validateIngredient(draft, ingredients);
    if (!res.ok) { setError(Object.values(res.errors)[0]); return; }
    const id = onCreate(res.value);
    setDraft(null); setError("");
    setPick(id);
  };
  const onEnter = (fn) => (e) => { if (e.key === "Enter") { e.preventDefault(); fn(); } };
  const patch = (id, p) => onChange(recipe.map((r) => (r.ingredientId === id ? { ...r, ...p } : r)));

  return (
    <div className="field" role="group" aria-label="Reçete">
      <span className="ops-title">Reçete: 1 adet satışta stoktan düşenler</span>

      {recipe.length === 0 && <span className="label">Reçete boş. Malzeme eklerseniz satışta stoktan düşer ve içerik seçilebilir.</span>}
      {recipe.map((r) => {
        const ing = byId.get(r.ingredientId);
        const name = ing?.name || "Silinmiş malzeme";
        return (
          <div className="recipe-row" key={r.ingredientId}>
            <div className="recipe-name">
              <span>{name}</span>
              <span className="label">{ing ? `${tl((Number(r.amount) || 0) * ing.unitCost)} maliyet` : "stoktan düşmez"}</span>
            </div>
            <label className="recipe-amount">
              <input className="field-input" inputMode="decimal" value={r.amount} onChange={(e) => patch(r.ingredientId, { amount: e.target.value })} aria-label={`${name} miktarı`} />
              <span className="label">{ing?.unit || ""}</span>
            </label>
            <button type="button" className="chip" aria-pressed={!r.fixed} aria-label={`${name} satışta çıkarılabilir`} onClick={() => patch(r.ingredientId, { fixed: !r.fixed })}>Çıkarılabilir</button>
            <button type="button" className="icon-btn" aria-label={`${name} reçete satırını sil`} onClick={() => onChange(recipe.filter((x) => x.ingredientId !== r.ingredientId))}><Ic n="trash" /></button>
          </div>
        );
      })}

      <div className="ops-row">
        <select className="field-input" style={{ flex: 1, minWidth: 150 }} value={pick} onChange={(e) => { setPick(e.target.value); setError(""); }} aria-label="Malzeme">
          <option value="">Malzeme seçin…</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
        </select>
        <input className="field-input" style={{ width: 120 }} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={onEnter(add)} placeholder={selected ? `Miktar (${selected.unit})` : "Miktar"} aria-label="Miktar" />
        <button type="button" className="btn btn-secondary" onClick={add}><Ic n="plus" className="ic-sm" />Reçeteye ekle</button>
      </div>

      {draft === null ? (
        onCreate && <button type="button" className="btn btn-ghost" style={{ justifySelf: "start" }} onClick={() => { setDraft({ name: "", unit: "gr", unitCost: "" }); setError(""); }}><Ic n="plus" className="ic-sm" />Listede yok: yeni malzeme tanımla</button>
      ) : (
        <div className="recipe-new" role="group" aria-label="Yeni malzeme tanımı">
          <input className="field-input" autoFocus maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={onEnter(create)} placeholder="Malzeme adı" aria-label="Yeni malzeme adı" />
          <select className="field-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} aria-label="Yeni malzeme birimi">
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <input className="field-input" inputMode="decimal" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} onKeyDown={onEnter(create)} placeholder={`₺ / ${draft.unit}`} aria-label="Yeni malzeme birim maliyeti" />
          <button type="button" className="btn btn-secondary" onClick={create}>Tanımla</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setDraft(null); setError(""); }}>Vazgeç</button>
        </div>
      )}

      {error && <span className="field-error" role="alert">{error}</span>}
      {recipe.length > 0 && (
        <div className="sum-row"><span>1 adedin malzeme maliyeti</span><span className="num">{tl(cost)}{salePrice > 0 ? ` · brüt kâr ${formatTL(salePrice - cost)}` : ""}</span></div>
      )}
    </div>
  );
}
