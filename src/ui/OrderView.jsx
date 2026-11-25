import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, getElapsedMinutes } from "../utils/formatters";
import {
  hasOptions, optionSummary, defaultSelection, toggleChoice, validateSelection, resolveSelection, unitPrice, sanitizeOptionGroups
} from "../utils/productOptions";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { useSheet, Sheet } from "./Sheet";
import { tableSubtotal, tableRemaining, tableCount } from "./hooks";
import { PaySheet } from "./PaySheet";
import { OpsSheet } from "./OpsSheet";

const FAV = "__fav";
const NOTES = ["Acele", "Az buzlu", "Paket"];
const parseNote = (n) => String(n || "").split(" · ").map((x) => x.trim()).filter(Boolean);

function ProductCard({ product, qty, onAdd }) {
  const prev = React.useRef(qty);
  const badge = React.useRef(null);
  React.useEffect(() => {
    if (badge.current) {
      if (prev.current === 0 && qty > 0) M.pop(badge.current);
      else if (qty > prev.current) M.bump(badge.current);
    }
    prev.current = qty;
  }, [qty]);
  return (
    <button type="button" className="product pressable" onClick={(e) => onAdd(product, e.currentTarget)}>
      <span className="product-name">{product.name}</span>
      <span className="product-foot">
        <span className="product-price">{formatTL(product.price)}</span>
        {hasOptions(product) && <span className="product-opt" title="Çeşitli"><Ic n="sliders" /></span>}
      </span>
      {qty > 0 && <span className="product-qty num" ref={badge}>{qty}</span>}
    </button>
  );
}

function Line({ item, open, onToggle }) {
  const { updateOrderItemQty, saveItemNote } = usePos();
  const notes = parseNote(item.note);
  const toggleNote = (nt) => {
    const next = notes.includes(nt) ? notes.filter((x) => x !== nt) : [...notes, nt];
    saveItemNote(item.id, next.join(" · "));
  };
  const opts = optionSummary(item.options);
  return (
    <div className="line-wrap">
      <button type="button" className="line pressable" aria-expanded={open} onClick={onToggle}>
        <span className="line-qty num">{item.qty}</span>
        <span>
          <span className="line-name">{item.name}</span>
          {opts && <span className="line-opts">{opts}</span>}
          {notes.length > 0 && <span className="line-note">{notes.join(" · ")}</span>}
        </span>
        <span className="line-price">{formatTL(item.price * item.qty)}</span>
      </button>
      {open && (
        <div className="line-tools">
          <span className="stepper">
            <button type="button" aria-label="Azalt" onClick={() => updateOrderItemQty(item.id, -1)}><Ic n="minus" className="ic-sm" /></button>
            <span className="num">{item.qty}</span>
            <button type="button" aria-label="Artır" onClick={() => updateOrderItemQty(item.id, 1)}><Ic n="plus" className="ic-sm" /></button>
          </span>
          {NOTES.map((nt) => (
            <button key={nt} type="button" className="chip" aria-pressed={notes.includes(nt)} onClick={() => toggleNote(nt)}>{nt}</button>
          ))}
          <button type="button" className="btn btn-danger btn-icon" aria-label="Satırı sil" onClick={() => updateOrderItemQty(item.id, -item.qty)}><Ic n="trash" className="ic-sm" /></button>
        </div>
      )}
    </div>
  );
}

export function OrderView() {
  const {
    activeTable: table, activeTableId, products, categories, setActiveTableId, addProductToTable,
    posSearch, setPosSearch, handleSearchEnter, optionPickerProduct, setOptionPickerProduct, confirmOptionPicker
  } = usePos();
  const sheet = useSheet();
  const [cat, setCat] = React.useState(null);
  const [expanded, setExpanded] = React.useState(null);
  const [ticketOpen, setTicketOpen] = React.useState(false);
  const badgeRef = React.useRef(null);
  const productsRef = React.useRef(null);
  const flying = React.useRef(false);
  const lastCount = React.useRef(0);

  const favs = React.useMemo(() => products.filter((p) => p.isQuickFav), [products]);
  const catList = React.useMemo(() => [
    ...(favs.length ? [{ id: FAV, name: "Favoriler", n: favs.length }] : []),
    ...categories.map((c) => ({ id: c, name: c, n: products.filter((p) => p.category === c).length }))
  ], [categories, products, favs]);
  const activeCat = cat && catList.some((c) => c.id === cat) ? cat : (catList[0] && catList[0].id);
  const q = String(posSearch || "").trim().toLowerCase();
  const shown = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || String(p.barcode || "").toLowerCase() === q)
    : activeCat === FAV ? favs : products.filter((p) => p.category === activeCat);

  const qtyOf = (pid) => (table ? table.items.filter((i) => i.productId === pid).reduce((s, i) => s + i.qty, 0) : 0);
  const count = tableCount(table);

  React.useEffect(() => {
    if (productsRef.current) productsRef.current.querySelectorAll(".product").forEach((el, i) => M.rise(el, Math.min(i * 22, 260), 6));
  }, [activeCat, q]);

  // Sayaç sıçraması: ürün uçuşu yoksa (stepper, barkod) rozet doğrudan sıçrar.
  React.useEffect(() => {
    if (count > lastCount.current && !flying.current && badgeRef.current) M.bump(badgeRef.current);
    lastCount.current = count;
  }, [count]);

  // Bağlam, çeşitli ürün seçilince seçim penceresini kendi durumuyla açar; pencere URL ile eşlenir (geri tuşu kapatır).
  React.useEffect(() => { if (optionPickerProduct && sheet.current !== "cesit") sheet.open("cesit"); }, [optionPickerProduct]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (sheet.current !== "cesit" && optionPickerProduct) setOptionPickerProduct(null); }, [sheet.current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!table) {
    return (
      <div className="view-pad" style={{ textAlign: "center", paddingTop: 80 }}>
        <p className="label" style={{ marginBottom: 16 }}>{activeTableId ? "Bu masa bulunamadı." : "Önce bir masa seçin."}</p>
        <button type="button" className="btn btn-primary" onClick={() => setActiveTableId(null)}><Ic n="left" />Masalar</button>
      </div>
    );
  }

  const add = (product, el) => {
    M.flash(el);
    if (hasOptions(product)) { addProductToTable(product); return; }
    addProductToTable(product, undefined);
    flying.current = true;
    const done = () => { flying.current = false; if (badgeRef.current) M.bump(badgeRef.current); };
    M.fly(el, badgeRef.current, {}).then(done, done);
    if (M.reduced()) done();
  };

  const onSearchKey = (e) => { if (e.key === "Enter" && handleSearchEnter()) e.preventDefault(); };
  const sub = tableSubtotal(table), rest = tableRemaining(table);
  const min = table.openedAt ? getElapsedMinutes(table.openedAt) : 0;
  const empty = table.items.length === 0;

  return (
    <div className="order">
      <nav className="cats" aria-label="Kategoriler">
        <button type="button" className="btn btn-ghost order-back" onClick={() => setActiveTableId(null)}><Ic n="left" />Masalar</button>
        <label className="search" style={{ marginBottom: 6 }}>
          <Ic n="eye" className="ic-sm" />
          <input value={posSearch} onChange={(e) => setPosSearch(e.target.value)} onKeyDown={onSearchKey} placeholder="Ürün ara" aria-label="Ürün ara" />
        </label>
        {catList.map((c) => (
          <button key={c.id} type="button" className="cat pressable" aria-pressed={!q && activeCat === c.id} onClick={() => { setPosSearch(""); setCat(c.id); }}>
            {c.id === FAV ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Ic n="star" className="ic-sm" />{c.name}</span> : c.name}
            <span className="cat-n num">{c.n}</span>
          </button>
        ))}
      </nav>

      <div className="products" ref={productsRef}>
        {shown.length === 0 && <p className="label" style={{ gridColumn: "1 / -1", padding: 12 }}>Ürün bulunamadı.</p>}
        {shown.map((p) => <ProductCard key={p.id} product={p} qty={qtyOf(p.id)} onAdd={add} />)}
      </div>

      <aside className={`ticket${ticketOpen ? " is-open" : ""}`} aria-label="Adisyon">
        <div className="ticket-head">
          <div>
            <div className="ticket-sub">{empty ? "Yeni adisyon" : `Açık · ${min} dk`}{table.guests ? ` · ${table.guests} kişi` : ""}</div>
            <h2 className="ticket-title">{table.name}</h2>
          </div>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`count-badge num${count ? " has-items" : ""}`} ref={badgeRef} id="countBadge">{count}</span>
            <button type="button" className="btn btn-ghost btn-icon mobile-only" aria-label="Kapat" onClick={() => setTicketOpen(false)}><Ic n="x" /></button>
          </span>
        </div>
        <div className="lines">
          {empty ? (
            <div className="ticket-empty"><Ic n="receipt" /><div>Adisyon boş<br /><span className="label">Ürüne dokunun; çeşitli ürünlerde seçim penceresi açılır</span></div></div>
          ) : table.items.map((it) => (
            <Line key={it.id} item={it} open={expanded === it.id} onToggle={() => setExpanded(expanded === it.id ? null : it.id)} />
          ))}
        </div>
        <div className="ticket-foot">
          <div className="sum-row"><span>{count} ürün</span><span>{table.discount > 0 ? <span className="ticket-discount">İndirim −{formatTL(table.discount)}</span> : "KDV dahil"}</span></div>
          {table.paidAmount > 0 && <div className="sum-row"><span>Alınan kısmi ödeme</span><span>−{formatTL(table.paidAmount)}</span></div>}
          <div className="total-row"><span className="label" style={{ fontSize: "var(--fs-md)" }}>{table.paidAmount > 0 ? "Kalan" : "Toplam"}</span><span className="money-total">{formatTL(rest)}</span></div>
          <div className="ticket-actions">
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => sheet.open("islem")}><Ic n="sliders" className="ic-sm" />İşlemler</button>
            <button type="button" className="btn btn-primary btn-lg" disabled={empty || (sub <= 0 && rest <= 0 && !table.paidAmount)} onClick={() => sheet.open("odeme")}>Ödeme<Ic n="arrow" className="ic-sm" /></button>
          </div>
        </div>
      </aside>
      <button type="button" className="btn btn-primary btn-lg mobile-ticket-bar" onClick={() => setTicketOpen(true)}>
        <span><Ic n="receipt" /> {count} ürün</span><span className="money-total">{formatTL(rest)}</span>
      </button>

      {sheet.current === "odeme" && <PaySheet table={table} onClose={sheet.close} />}
      {sheet.current === "islem" && <OpsSheet table={table} onClose={sheet.close} />}
      {sheet.current === "cesit" && optionPickerProduct && (
        <PickerSheet product={optionPickerProduct} onClose={sheet.close} onConfirm={(sel, from) => {
          confirmOptionPicker(sel);
          flying.current = true;
          const done = () => { flying.current = false; if (badgeRef.current) M.bump(badgeRef.current); };
          M.fly(from, badgeRef.current, {}).then(done, done);
          if (M.reduced()) done();
        }} />
      )}
    </div>
  );
}

/** Çeşit seçimi (prototip düzeni): zorunlu gruplar ön seçili, "Ekle" tek dokunuş. */
function PickerSheet({ product, onClose, onConfirm }) {
  const groups = React.useMemo(() => sanitizeOptionGroups(product.options), [product]);
  const [selection, setSelection] = React.useState(() => defaultSelection(product));
  const addRef = React.useRef(null);
  const { ok, errors } = validateSelection(product, selection);
  const total = unitPrice(product, resolveSelection(product, selection));

  const toggle = (g, c, el) => {
    const cur = selection[g.id] || [];
    if (g.type === "multi" && !cur.includes(c.id) && cur.length >= g.max) { M.shake(el.parentElement); return; }
    setSelection(toggleChoice(product, selection, g.id, c.id));
    M.bump(el, 1.06);
  };

  const confirm = () => {
    const r = addRef.current ? addRef.current.getBoundingClientRect() : null;
    onConfirm(selection, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
    onClose();
  };

  return (
    <Sheet
      onClose={onClose}
      label={`Çeşit seçimi · ${formatTL(product.price)}`}
      title={product.name}
      foot={<button type="button" className="btn btn-primary btn-lg" ref={addRef} disabled={!ok} onClick={confirm}>Ekle · <span className="num">{formatTL(total)}</span></button>}
    >
      <div>
        {groups.map((g) => {
          const cur = selection[g.id] || [];
          return (
            <div className="opt-group" key={g.id}>
              <div className="opt-group-head">
                <span className="opt-group-name">{g.name}</span>
                {g.required ? <span className="tag tag-primary">Zorunlu</span> : g.type === "multi" ? <span className="tag">En fazla {g.max}</span> : <span className="tag">İsteğe bağlı</span>}
              </div>
              <div className="opt-choices">
                {g.choices.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={cur.includes(c.id)} onClick={(e) => toggle(g, c, e.currentTarget)}>
                    {c.name}{c.price !== 0 && <span className="chip-price">{c.price > 0 ? "+" : "−"}{formatTL(Math.abs(c.price))}</span>}
                  </button>
                ))}
              </div>
              {errors[g.id] && <p className="label" style={{ color: "var(--danger)", marginTop: 8 }}>{errors[g.id]}</p>}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
