import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { UNITS, validateIngredient, unitCostFromPurchase, ingredientUsage } from "../utils/ingredients";
import { Sheet } from "./Sheet";
import { Chips, Field } from "./page";
import { Ic } from "./Ic";

const money = (n) => `${String(n).replace(".", ",")} ₺`;

/** Malzeme ekle / düzenle. Düzenlemede stok miktarı buradan değişmez: stok hareketi (giriş, zayi, sayım) kayıt bırakır. */
export function IngredientSheet({ ingredient, onClose }) {
  const { ingredients, products, handleSaveIngredient, handleDeleteIngredient } = usePos();
  const editing = !!ingredient;
  const [form, setForm] = React.useState(() => ({
    name: ingredient?.name || "", unit: ingredient?.unit || "gr",
    stock: editing ? ingredient.stock : "", minLimit: editing ? ingredient.minLimit : "", unitCost: editing ? ingredient.unitCost : ""
  }));
  const [errors, setErrors] = React.useState({});
  const [buy, setBuy] = React.useState({ price: "", quantity: "" });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const used = editing ? ingredientUsage(products, ingredient.id) : [];
  const computed = unitCostFromPurchase(buy.price, buy.quantity);
  const units = UNITS.includes(form.unit) ? UNITS : [...UNITS, form.unit].filter(Boolean);

  const submit = (e) => {
    e.preventDefault();
    const res = validateIngredient(form, ingredients, ingredient?.id);
    if (!res.ok) { setErrors(res.errors); return; }
    handleSaveIngredient(res.value, ingredient?.id);
    onClose();
  };
  const err = (key) => errors[key] && <span className="field-error" role="alert">{errors[key]}</span>;
  const num = (key, label, placeholder) => (
    <Field label={label}>
      <input className="field-input" inputMode="decimal" value={form[key]} onChange={(e) => set({ [key]: e.target.value })} placeholder={placeholder} />
      {err(key)}
    </Field>
  );

  return (
    <Sheet
      onClose={onClose}
      label="Hammadde"
      title={editing ? "Malzemeyi düzenle" : "Yeni malzeme"}
      foot={
        <>
          {editing && <button type="button" className="btn btn-danger btn-lg" onClick={() => { handleDeleteIngredient(ingredient.id); onClose(); }}><Ic n="trash" className="ic-sm" />Sil</button>}
          <button type="submit" form="ingredient-form" className="btn btn-primary btn-lg" style={{ flex: 1 }}>{editing ? "Değişikliği kaydet" : "Malzemeyi ekle"}</button>
        </>
      }
    >
      <form id="ingredient-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Malzeme adı">
          <input className="field-input" autoFocus maxLength={60} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Yulaf sütü" />
          {err("name")}
        </Field>
        <div className="field">
          <span className="ops-title">Birim (reçetede ve stokta kullanılır)</span>
          <Chips value={form.unit} onChange={(unit) => set({ unit })} items={units} />
          {err("unit")}
        </div>
        <div className="field-pair">
          {!editing && num("stock", `Eldeki stok (${form.unit})`, "0")}
          {num("minLimit", `Kritik sınır (${form.unit})`, "0")}
        </div>
        {num("unitCost", `Birim maliyet (₺ / ${form.unit})`, "0,85")}
        <div className="field">
          <span className="ops-title">Alıştan hesapla (isteğe bağlı)</span>
          <div className="ops-row">
            <input className="field-input" style={{ flex: 1, minWidth: 120 }} inputMode="decimal" value={buy.price} onChange={(e) => setBuy({ ...buy, price: e.target.value })} placeholder="Ödenen ₺" aria-label="Alışta ödenen tutar" />
            <input className="field-input" style={{ flex: 1, minWidth: 120 }} inputMode="decimal" value={buy.quantity} onChange={(e) => setBuy({ ...buy, quantity: e.target.value })} placeholder={`Alınan ${form.unit}`} aria-label="Alınan miktar" />
            <button type="button" className="btn btn-secondary" disabled={computed === null} onClick={() => set({ unitCost: String(computed).replace(".", ",") })}>
              {computed === null ? "Uygula" : `${money(computed)} uygula`}
            </button>
          </div>
        </div>
        {editing && (
          <p className="label">
            Stok {ingredient.stock} {ingredient.unit} · değeri {formatTL(ingredient.stock * ingredient.unitCost)}. Miktarı "Stok gir" ile değiştirin.
            {used.length > 0 ? ` ${used.length} ürünün reçetesinde kullanılıyor; silerseniz reçetelerden de çıkar (5 sn içinde geri alınabilir).` : ""}
          </p>
        )}
      </form>
    </Sheet>
  );
}
