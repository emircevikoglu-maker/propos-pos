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
