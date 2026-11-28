// Ürün seçenekleri (içecek çeşitleri: boy, süt, şeker, ekstra shot…).
// Veri modeli (ürün üzerinde):
//   options: [{ id, name, type: "single"|"multi", required, max, choices: [{ id, name, price }] }]
// Sepet satırı: { productId, name, basePrice, price (birim, seçenekler dahil), qty, note, options: [...], optionKey, without?: [...], sentQty? }
//   without: satışta çıkarılan reçete malzemeleri [{ ingredientId, name }]; optionKey'e de girer (farklı içerik = ayrı satır).
//   sentQty: mutfağa/bara gönderilmiş adet.
// Saf fonksiyonlar: senkrondan gelen bozuk/kötü niyetli veri de buradan geçer.

export const MAX_GROUPS = 10;
export const MAX_CHOICES = 20;
const MAX_PRICE = 1000000;

const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const cleanText = (v, max) => (typeof v === "string" || typeof v === "number" ? String(v) : "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
const cleanId = (v, prefix, i) => {
  const s = cleanText(v, 40).replace(/[^A-Za-z0-9_-]/g, "");
  return s && s !== "__proto__" && s !== "constructor" && s !== "prototype" ? s : `${prefix}-${i}`;
};
export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function cleanPrice(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(-MAX_PRICE, Math.min(MAX_PRICE, n)) * 100) / 100;
}

/** Hazır gruplar: ürün düzenleyicide tek dokunuşla eklenir. */
export const OPTION_PRESETS = [
  { key: "size", name: "Boy", type: "single", required: true, choices: [["Küçük", 0], ["Orta", 10], ["Büyük", 20]] },
  { key: "milk", name: "Süt", type: "single", required: false, choices: [["Normal süt", 0], ["Laktozsuz", 10], ["Yulaf sütü", 15], ["Badem sütü", 15]] },
  { key: "sugar", name: "Şeker", type: "single", required: false, choices: [["Sade", 0], ["Az şekerli", 0], ["Orta", 0], ["Şekerli", 0]] },
  { key: "temp", name: "Sıcaklık", type: "single", required: false, choices: [["Sıcak", 0], ["Buzlu", 5]] },
  { key: "extra", name: "Ekstra", type: "multi", required: false, max: 3, choices: [["Ekstra shot", 15], ["Karamel şurubu", 10], ["Vanilya şurubu", 10], ["Krema", 10]] },
  { key: "tea", name: "Servis", type: "single", required: true, choices: [["Bardak", 0], ["Fincan", 5], ["Demlik (2 kişilik)", 40]] }
];

export function groupFromPreset(preset) {
  return {
    id: newId("og"),
    name: preset.name,
    type: preset.type,
    required: !!preset.required,
    max: preset.type === "multi" ? preset.max || preset.choices.length : 1,
    choices: preset.choices.map(([name, price]) => ({ id: newId("oc"), name, price }))
  };
}

/** Grupları güvenli biçime getirir; geçersiz olanları atar. */
export function sanitizeOptionGroups(groups) {
  if (!Array.isArray(groups)) return [];
  const seen = new Set();
  const out = [];
  groups.slice(0, MAX_GROUPS).forEach((g, gi) => {
    if (!g || typeof g !== "object") return;
    let id = cleanId(g.id, "og", gi);
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);
    const name = cleanText(g.name, 40);
    const seenC = new Set();
    const choices = (Array.isArray(g.choices) ? g.choices : []).slice(0, MAX_CHOICES).map((c, ci) => {
      if (!c || typeof c !== "object") return null;
      const cname = cleanText(c.name, 40);
      if (!cname) return null;
      let cid = cleanId(c.id, "oc", ci);
      while (seenC.has(cid)) cid = `${cid}x`;
      seenC.add(cid);
      return { id: cid, name: cname, price: cleanPrice(c.price), recipe: sanitizeRecipe(c.recipe) };
    }).filter(Boolean);
    if (!name || choices.length === 0) return;
    const type = g.type === "multi" ? "multi" : "single";
    const maxRaw = Math.floor(Number(g.max));
    const max = type === "single" ? 1 : Math.max(1, Math.min(choices.length, Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : choices.length));
    out.push({ id, name, type, required: g.required === true, max, choices });
  });
  return out;
}

/** Seçeneğin ek stok tüketimi: [{ingredientId, amount}] (ör. Ekstra shot → +18 g kahve). */
export function sanitizeRecipe(r) {
  if (!Array.isArray(r)) return [];
  return r.slice(0, 10).map((x) => {
    const id = cleanText(x && x.ingredientId, 40);
    const amount = Number(x && x.amount);
    return id && Number.isFinite(amount) && amount > 0 && amount <= 1e6 ? { ingredientId: id, amount: Math.round(amount * 100) / 100 } : null;
  }).filter(Boolean);
}

/** Satır için toplam stok tüketimi: ürün reçetesi + seçilen çeşitlerin reçeteleri (adet ile çarpılır). */
export function lineConsumption(product, item) {
  const out = {};
  const add = (ingredientId, amount) => { out[ingredientId] = (out[ingredientId] || 0) + amount * (Number(item && item.qty) || 0); };
  const removed = new Set(withoutList(item).map((w) => w.ingredientId));
  ((product && product.recipe) || []).forEach((r) => { if (r.fixed || !removed.has(r.ingredientId)) add(r.ingredientId, Number(r.amount) || 0); });
  const groups = sanitizeOptionGroups(product && product.options);
  ((item && item.options) || []).forEach((o) => {
    const g = groups.find((x) => x.id === (o && o.groupId));
    const c = g && g.choices.find((x) => x.id === o.choiceId);
    (c ? c.recipe : []).forEach((r) => add(r.ingredientId, r.amount));
  });
  return out;
}

export const hasOptions = (product) => sanitizeOptionGroups(product && product.options).length > 0;

/** Zorunlu tek seçimli gruplarda ilk seçenek seçili gelir → çoğu sipariş 2 dokunuş. */
export function defaultSelection(product) {
  const sel = {};
  sanitizeOptionGroups(product && product.options).forEach((g) => {
    sel[g.id] = g.required && g.type === "single" ? [g.choices[0].id] : [];
  });
  return sel;
}

/** Seçimi değiştirir (tek seçimde değiştirir, çokluda aç/kapa, max aşılmaz). Yeni nesne döner. */
export function toggleChoice(product, selection, groupId, choiceId) {
  const g = sanitizeOptionGroups(product && product.options).find((x) => x.id === groupId);
  if (!g || !g.choices.some((c) => c.id === choiceId)) return selection;
  const cur = has(selection, groupId) && Array.isArray(selection[groupId]) ? selection[groupId] : [];
  let next;
  if (g.type === "single") {
    next = cur[0] === choiceId && !g.required ? [] : [choiceId];
  } else if (cur.includes(choiceId)) {
    next = cur.filter((c) => c !== choiceId);
  } else {
    next = cur.length >= g.max ? cur : [...cur, choiceId];
  }
  return { ...selection, [groupId]: next };
}

/** @returns {{ok:boolean, errors:Record<string,string>}} */
export function validateSelection(product, selection) {
  const errors = {};
  const sel = selection && typeof selection === "object" ? selection : {};
  sanitizeOptionGroups(product && product.options).forEach((g) => {
    const raw = has(sel, g.id) && Array.isArray(sel[g.id]) ? sel[g.id] : [];
    const ids = [...new Set(raw)];
    if (ids.some((id) => !g.choices.some((c) => c.id === id))) errors[g.id] = "Geçersiz seçenek";
    else if (g.required && ids.length === 0) errors[g.id] = `${g.name} seçin`;
    else if (ids.length > g.max) errors[g.id] = g.type === "single" ? "Tek seçim yapılabilir" : `En fazla ${g.max} seçim`;
  });
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Seçimi grup sırasına göre çözümlenmiş listeye çevirir (geçersiz kimlikler atılır). */
export function resolveSelection(product, selection) {
  const sel = selection && typeof selection === "object" ? selection : {};
  const out = [];
  sanitizeOptionGroups(product && product.options).forEach((g) => {
    const raw = has(sel, g.id) && Array.isArray(sel[g.id]) ? [...new Set(sel[g.id])] : [];
    g.choices.filter((c) => raw.includes(c.id)).slice(0, g.max).forEach((c) => {
      out.push({ groupId: g.id, groupName: g.name, choiceId: c.id, name: c.name, price: c.price });
    });
  });
  return out;
}

/** Birim fiyat: taban + seçenek farkları; asla negatif olmaz. */
export function unitPrice(product, resolved) {
  const base = cleanPrice(product && product.price);
  const extra = (Array.isArray(resolved) ? resolved : []).reduce((s, o) => s + cleanPrice(o && o.price), 0);
  return Math.max(0, Math.round((base + extra) * 100) / 100);
}

export const optionKey = (resolved) => (Array.isArray(resolved) ? resolved : []).map((o) => `${o.groupId}:${o.choiceId}`).join("|");

export const optionSummary = (options) => (Array.isArray(options) ? options : []).map((o) => cleanText(o && o.name, 40)).filter(Boolean).join(" · ");

// ---- İçerik (reçeteden çıkarma) ------------------------------------------------

export const withoutList = (item) => (item && Array.isArray(item.without) ? item.without.filter((w) => w && typeof w.ingredientId === "string") : []);

/** Satışta çıkarılabilecek malzemeler: reçetede "fixed" olmayan ve malzeme listesinde bulunanlar. */
export function removableIngredients(product, ingredients) {
  const byId = new Map((Array.isArray(ingredients) ? ingredients : []).map((i) => [i.id, i]));
  const seen = new Set();
  return ((product && Array.isArray(product.recipe) && product.recipe) || []).reduce((out, r) => {
    if (!r || r.fixed || seen.has(r.ingredientId) || !byId.has(r.ingredientId)) return out;
    seen.add(r.ingredientId);
    out.push({ ingredientId: r.ingredientId, name: cleanText(byId.get(r.ingredientId).name, 60) });
    return out;
  }, []);
}

/** Dokununca doğrudan eklenmesin, içerik penceresi açılsın mı? */
export const needsContentSheet = (product) => hasOptions(product) || !!(product && product.askContent);

export const withoutSummary = (item) => withoutList(item).map((w) => `${cleanText(w.name, 60)} yok`).join(" · ");

/** Fiş, cari ve listeler için tek satırlık içerik özeti: seçenekler + çıkarılanlar. */
export const lineDetails = (item) => [optionSummary(item && item.options), withoutSummary(item)].filter(Boolean).join(" · ");

const contentKey = (resolved, without) => [optionKey(resolved), ...without.map((w) => `x:${w.ingredientId}`).sort()].filter(Boolean).join("|");

export const MAX_LINE_QTY = 99;
const clampQty = (v) => Math.max(1, Math.min(MAX_LINE_QTY, Math.floor(Number(v)) || 1));

/**
 * @param {object} [extra] { without: çıkarılacak malzeme listesi (removableIngredients'tan), note, qty }
 */
export function buildOrderLine(product, selection, id = newId("oi"), extra = {}) {
  const resolved = resolveSelection(product, selection);
  const without = withoutList(extra);
  return {
    id,
    productId: product.id,
    name: product.name,
    basePrice: cleanPrice(product.price),
    price: unitPrice(product, resolved),
    qty: clampQty(extra.qty),
    note: cleanText(extra.note, 160),
    options: resolved,
    optionKey: contentKey(resolved, without),
    ...(without.length ? { without } : {})
  };
}

const sameContent = (a, b) => a.productId === b.productId && (a.note || "") === (b.note || "") && (a.optionKey || "") === (b.optionKey || "");

/** Aynı ürün + aynı içerik + aynı not varsa adedi artırır, yoksa yeni satır ekler. */
export function mergeIntoItems(items, line) {
  const list = Array.isArray(items) ? items : [];
  const idx = list.findIndex((i) => sameContent(i, line));
  if (idx === -1) return [...list, line];
  return list.map((it, i) => (i === idx ? { ...it, qty: it.qty + (line.qty || 1), ...(line.sentQty ? { sentQty: (it.sentQty || 0) + line.sentQty } : {}) } : it));
}

/** Adisyon satırının seçimini içerik penceresine geri yükler. */
export function selectionFromLine(product, item) {
  const sel = {};
  sanitizeOptionGroups(product && product.options).forEach((g) => {
    sel[g.id] = ((item && item.options) || []).filter((o) => o.groupId === g.id && g.choices.some((c) => c.id === o.choiceId)).map((o) => o.choiceId);
  });
  return sel;
}

/**
 * Açık adisyondaki satırın içeriğini değiştirir. `qty` satırdan azsa satır bölünür (önce gönderilmemiş adetler değişir).
 * Birim fiyat yalnızca seçenekler değiştiyse yeniden hesaplanır (satıra sabitlenen fiyat korunur).
 * @returns {{items: object[], cancelled: object|null}} cancelled: mutfağa gönderilmişken içeriği değişen eski satır (qty ile)
 */
export function editLine(items, itemId, product, { selection, without = [], note = "", qty }) {
  const list = Array.isArray(items) ? items : [];
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx === -1) return { items: list, cancelled: null };
  const old = list[idx];
  const count = Math.min(old.qty, clampQty(qty === undefined ? old.qty : qty));
  const built = buildOrderLine(product, selection, old.id, { without, note });
  const sameOptions = optionKey(old.options) === optionKey(built.options);
  const next = {
    ...old, note: built.note, options: built.options, optionKey: built.optionKey,
    price: sameOptions ? old.price : built.price,
    without: built.without
  };
  if (!next.without) delete next.without;
  if (sameContent(old, next)) return { items: list, cancelled: null };

  const sent = Math.min(old.qty, old.sentQty || 0);
  const sentMoved = Math.max(0, count - (old.qty - sent));
  const edited = { ...next, id: count === old.qty ? old.id : newId("oi"), qty: count };
  delete edited.sentQty;
  const rest = count === old.qty ? [] : [{ ...old, qty: old.qty - count, ...(sent ? { sentQty: sent - sentMoved } : {}) }];
  const others = [...list.slice(0, idx), ...rest, ...list.slice(idx + 1)];
  const twin = others.findIndex((i) => i.id !== old.id && sameContent(i, edited) && i.price === edited.price);
  const out = twin === -1
    ? [...others.slice(0, idx + rest.length), edited, ...others.slice(idx + rest.length)]
    : others.map((i, n) => (n === twin ? { ...i, qty: i.qty + edited.qty } : i));
  return { items: out, cancelled: sentMoved > 0 ? { ...old, qty: sentMoved } : null };
}

/** Kartta gösterilecek fiyat etiketi: seçenekle artabiliyorsa "₺65+" gibi. */
export function priceLabelSuffix(product) {
  return sanitizeOptionGroups(product && product.options).some((g) => g.choices.some((c) => c.price > 0)) ? "+" : "";
}
