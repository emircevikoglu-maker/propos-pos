import React from "react";
import { formatTL } from "../utils/formatters";
import {
  defaultSelection, toggleChoice, validateSelection, resolveSelection, unitPrice, sanitizeOptionGroups,
  removableIngredients, selectionFromLine, withoutList, MAX_LINE_QTY
} from "../utils/productOptions";
import { QUICK_ORDER_NOTES } from "../constants/initialData";
import { PPMotion as M } from "../design/motion";
import { Sheet } from "./Sheet";
import { Ic } from "./Ic";

export const CONTENT_NOTES = [...QUICK_ORDER_NOTES, "Acele"];
const splitNote = (n) => String(n || "").split(" · ").map((x) => x.trim()).filter(Boolean);

/**
 * Ürün içeriği: çeşitler (prototip düzeni) + reçete içeriği (dokununca çıkar) + hazır/serbest not + adet.
 * Zorunlu gruplar ön seçili gelir; sık siparişte "Ekle" tek dokunuş.
 * `line` verilirse açık adisyon satırı düzenlenir; adet satırdan azsa yalnızca o kadarı değişir.
 */
export function ContentSheet({ product, ingredients = [], line = null, onClose, onConfirm }) {
  const groups = React.useMemo(() => sanitizeOptionGroups(product.options), [product]);
  const removable = React.useMemo(() => removableIngredients(product, ingredients), [product, ingredients]);
  const [selection, setSelection] = React.useState(() => (line ? selectionFromLine(product, line) : defaultSelection(product)));
  const [removed, setRemoved] = React.useState(() => withoutList(line).map((w) => w.ingredientId));
  const [notes, setNotes] = React.useState(() => splitNote(line?.note).filter((n) => CONTENT_NOTES.includes(n)));
  const [free, setFree] = React.useState(() => splitNote(line?.note).filter((n) => !CONTENT_NOTES.includes(n)).join(", "));
  const [qty, setQty] = React.useState(line ? line.qty : 1);
  const confirmRef = React.useRef(null);
  const qtyRef = React.useRef(null);

  const { ok, errors } = validateSelection(product, selection);
  const optionsUnchanged = line && JSON.stringify(resolveSelection(product, selection)) === JSON.stringify(resolveSelection(product, selectionFromLine(product, line)));
  const unit = optionsUnchanged ? line.price : unitPrice(product, resolveSelection(product, selection));
  const maxQty = line ? line.qty : MAX_LINE_QTY;

  const toggle = (g, c, el) => {
    const cur = selection[g.id] || [];
    if (g.type === "multi" && !cur.includes(c.id) && cur.length >= g.max) { M.shake(el.parentElement); return; }
    setSelection(toggleChoice(product, selection, g.id, c.id));
    M.bump(el, 1.06);
  };
  const flip = (setter, value) => setter((list) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]));
  const step = (d) => { setQty((n) => Math.max(1, Math.min(maxQty, n + d))); if (qtyRef.current) M.bump(qtyRef.current); };

  const confirm = () => {
    const r = confirmRef.current ? confirmRef.current.getBoundingClientRect() : null;
    const note = [...notes, free.replace(/·/g, " ").trim()].filter(Boolean).join(" · ");
    onConfirm({ selection, without: removable.filter((x) => removed.includes(x.ingredientId)), note, qty }, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
    onClose();
  };

  return (
    <Sheet
      onClose={onClose}
      label={`${groups.length ? "Çeşit ve içerik" : "Ürün içeriği"} · ${formatTL(product.price)}`}
      title={product.name}
      foot={
        <>
          <span className="stepper" role="group" aria-label={line ? "Kaç adede uygulansın" : "Adet"}>
            <button type="button" aria-label="Adedi azalt" disabled={qty <= 1} onClick={() => step(-1)}><Ic n="minus" className="ic-sm" /></button>
            <span className="num" ref={qtyRef}>{qty}</span>
            <button type="button" aria-label="Adedi artır" disabled={qty >= maxQty} onClick={() => step(1)}><Ic n="plus" className="ic-sm" /></button>
          </span>
          <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} ref={confirmRef} disabled={!ok} onClick={confirm}>
            {line ? (qty < line.qty ? `${qty} adede uygula` : "Kaydet") : "Ekle"} · <span className="num">{formatTL(unit * qty)}</span>
          </button>
        </>
      }
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
              {errors[g.id] && <p className="field-error" role="alert">{errors[g.id]}</p>}
            </div>
          );
        })}

        {removable.length > 0 && (
          <div className="opt-group">
            <div className="opt-group-head">
              <span className="opt-group-name">İçindekiler</span>
              <span className="tag">Dokununca çıkar</span>
            </div>
            <div className="opt-choices" role="group" aria-label="İçindekiler">
              {removable.map((x) => {
                const out = removed.includes(x.ingredientId);
                return (
                  <button key={x.ingredientId} type="button" className={`chip${out ? " is-out" : ""}`} aria-pressed={!out} onClick={(e) => { flip(setRemoved, x.ingredientId); M.bump(e.currentTarget, 1.06); }}>
                    {x.name}
                  </button>
                );
              })}
            </div>
            {removed.length > 0 && <p className="label" style={{ marginTop: 8 }}>Çıkarılanlar stoktan düşmez ve fişte "yok" diye yazar.</p>}
          </div>
        )}

        <div className="opt-group">
          <div className="opt-group-head"><span className="opt-group-name">Not</span><span className="tag">İsteğe bağlı</span></div>
          <div className="opt-choices" role="group" aria-label="Hazır notlar">
            {CONTENT_NOTES.map((n) => <button key={n} type="button" className="chip" aria-pressed={notes.includes(n)} onClick={() => flip(setNotes, n)}>{n}</button>)}
          </div>
          <input className="field-input opt-note" maxLength={80} value={free} onChange={(e) => setFree(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ok) confirm(); }} placeholder="Serbest not: yanında su…" aria-label="Serbest not" />
        </div>
      </div>
    </Sheet>
  );
}
