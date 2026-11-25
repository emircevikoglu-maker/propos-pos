import React from "react";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";

/**
 * Prototipin "patron" sayfasındaki kalıp: .view-pad > .boss (12 sütun) > .card.
 * Prototipte olmayan ekranlar (Stok, Esnaf, Finans…) yalnızca bu parçalardan kurulur; yeni görsel dil yok.
 */
export function Page({ label, title, actions, children }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cards = ref.current ? ref.current.querySelectorAll(".card") : [];
    cards.forEach((c, i) => M.rise(c, Math.min(i * 30, 240), 8));
  }, []);
  return (
    <div className="view-pad">
      <div className="boss" ref={ref}>
        <div className="boss-head">
          <div>
            {label && <div className="label">{label}</div>}
            <h1>{title}</h1>
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({ span = 12, title, aside, className = "", children }) {
  return (
    <div className={`card span-${span} ${className}`.trim()}>
      {(title || aside) && (
        <div className="card-head">
          <span className="card-title">{title}</span>
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, tone, hero }) {
  return (
    <div className={`card kpi${hero ? " kpi-hero" : ""}`}>
      <span className="label">{label}</span>
      <span className="kpi-v" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</span>
      {sub && <span className="label">{sub}</span>}
    </div>
  );
}

/** İlerleme çubuğu; prototipteki gibi scaleX ile dolar (M.progress). */
export function Bar({ value, tone }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) M.progress(ref.current, Math.max(0, Math.min(1, value || 0)), 0); }, [value]);
  return (
    <span className="bar">
      <span ref={ref} className="bar-fill" style={tone ? { background: `var(--${tone})` } : undefined} />
    </span>
  );
}

export function Seg({ value, onChange, items, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map(([id, text, count]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
          {text}{count != null && <span className="seg-count">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = "note", children }) {
  return <div className="empty"><Ic n={icon} className="ic-lg" /><p>{children}</p></div>;
}

export function Tag({ tone, children }) {
  return <span className={`tag${tone ? ` tag-${tone}` : ""}`}>{children}</span>;
}

/** Prototipin ayar satırı: başlık + açıklama solda, anahtar sağda. */
export function SwitchRow({ title, desc, checked, onChange }) {
  return (
    <div className="set-row">
      <span className="set-text"><span>{title}</span>{desc && <span className="set-desc">{desc}</span>}</span>
      <button type="button" className="switch-hit" role="switch" aria-checked={!!checked} aria-label={title} onClick={() => onChange(!checked)}>
        <span className="switch" aria-checked={!!checked} />
      </button>
    </div>
  );
}

/** Tek seçimli çip grubu (kategori, ödeme yöntemi, renk…). */
export function Chips({ value, onChange, items }) {
  return (
    <div className="ops-row">
      {items.map((it) => {
        const [id, text] = Array.isArray(it) ? it : [it, it];
        return <button key={id} type="button" className="chip" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>;
      })}
    </div>
  );
}

/** Liste satırı: solda ad/alt bilgi, sağda düzenle + sil. Yönetim listeleri için tek kalıp. */
export function ItemRow({ lead, title, sub, tags, onEdit, onDelete, name }) {
  return (
    <div className="item-row">
      {lead}
      <div className="cari-main">
        <div className="cari-name"><span>{title}</span>{tags}</div>
        {sub && <span className="label">{sub}</span>}
      </div>
      <span className="row-actions">
        {onEdit && <button type="button" className="icon-btn" aria-label={`${name || title} düzenle`} onClick={onEdit}><Ic n="note" /></button>}
        {onDelete && <button type="button" className="icon-btn" aria-label={`${name || title} sil`} onClick={onDelete}><Ic n="trash" /></button>}
      </span>
    </div>
  );
}

/** Sheet içi alan: etiket + girdi. */
export function Field({ label, children }) {
  return <label className="field"><span className="ops-title">{label}</span>{children}</label>;
}
