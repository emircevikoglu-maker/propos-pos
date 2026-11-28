// Hammadde (malzeme) ve reçete kuralları (saf fonksiyonlar).
// Reçete satırı: { ingredientId, amount, fixed? }  amount = 1 adet ürün için düşen miktar (malzemenin biriminde).
// fixed: true → satışta çıkarılamaz (ürünün temeli).

export const UNITS = ["gr", "ml", "adet", "kg", "lt", "dilim", "porsiyon"];

const text = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);

/** "1.234,5", "12,5", 12.5 → sayı; geçersizse NaN. */
export function parseDecimal(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  let s = String(v == null ? "" : v).trim().replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
const inRange = (n) => Number.isFinite(n) && n >= 0 && n <= 1e9;
const norm = (s) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

/**
 * Form girdisini doğrular. Boş sayısal alan 0 sayılır.
 * @returns {{ok:true, value:object} | {ok:false, errors:Record<string,string>}}
 */
export function validateIngredient(input, list = [], editingId = null) {
  const errors = {};
  const name = text(input && input.name, 60);
  const unit = text(input && input.unit, 12);
  if (!name) errors.name = "Malzeme adını yazın.";
  else if (list.some((i) => i.id !== editingId && norm(String(i.name)) === norm(name))) errors.name = "Bu adda bir malzeme zaten var.";
  if (!unit) errors.unit = "Birim seçin.";
  const num = (key, label) => {
    const raw = input ? input[key] : "";
    if (raw === "" || raw == null) return 0;
    const n = parseDecimal(raw);
    if (!inRange(n)) { errors[key] = `${label} 0 ya da daha büyük bir sayı olmalı.`; return 0; }
    return n;
  };
  const stock = num("stock", "Stok");
  const minLimit = num("minLimit", "Kritik sınır");
  const unitCost = num("unitCost", "Birim maliyet");
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, unit, stock: round(stock, 2), minLimit: round(minLimit, 2), unitCost: round(unitCost, 4) } };
}

/** Alış faturasından birim maliyet: 850 ₺ / 1000 gr → 0,85 ₺/gr. */
export function unitCostFromPurchase(price, quantity) {
  const p = parseDecimal(price), q = parseDecimal(quantity);
  return inRange(p) && Number.isFinite(q) && q > 0 ? round(p / q, 4) : null;
}

const recipeHas = (recipe, id) => Array.isArray(recipe) && recipe.some((r) => r && r.ingredientId === id);
const choicesOf = (p) => (Array.isArray(p.options) ? p.options : []).flatMap((g) => (g && Array.isArray(g.choices) ? g.choices : []));

/** Malzemeyi reçetesinde ya da bir çeşit seçeneğinde kullanan ürünler. */
export const ingredientUsage = (products, id) => (products || []).filter((p) => recipeHas(p.recipe, id) || choicesOf(p).some((c) => recipeHas(c.recipe, id)));

/** Silinen malzemeyi tüm reçetelerden çıkarır (kullanmayan ürün nesneleri aynen kalır). */
export function removeIngredientFromProducts(products, id) {
  const used = new Set(ingredientUsage(products, id).map((p) => p.id));
  if (used.size === 0) return products;
  const strip = (recipe) => (Array.isArray(recipe) ? recipe.filter((r) => r.ingredientId !== id) : recipe);
  return products.map((p) => (!used.has(p.id) ? p : {
    ...p,
    recipe: strip(p.recipe),
    ...(Array.isArray(p.options) ? { options: p.options.map((g) => ({ ...g, choices: (g.choices || []).map((c) => (c.recipe ? { ...c, recipe: strip(c.recipe) } : c)) })) } : {})
  }));
}

/** Reçeteye ekler; malzeme zaten varsa miktarını günceller (çift satır olmaz). Geçersiz miktar → reçete aynen. */
export function upsertRecipeRow(recipe, ingredientId, amount) {
  const list = Array.isArray(recipe) ? recipe : [];
  const n = parseDecimal(amount);
  if (!ingredientId || !(n > 0) || n > 1e6) return list;
  const value = round(n, 3);
  return recipeHas(list, ingredientId)
    ? list.map((r) => (r.ingredientId === ingredientId ? { ...r, amount: value } : r))
    : [...list, { ingredientId, amount: value }];
}

/** Kaydetmeden önce: miktarı geçersiz satırlar atılır. */
export const cleanRecipe = (recipe) => (Array.isArray(recipe) ? recipe : [])
  .map((r) => ({ ingredientId: r.ingredientId, amount: round(parseDecimal(r.amount) || 0, 3), ...(r.fixed ? { fixed: true } : {}) }))
  .filter((r) => r.ingredientId && r.amount > 0);
