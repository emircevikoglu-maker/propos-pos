import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, getElapsedMinutes } from "../utils/formatters";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { useNow, tableRemaining, tableCount } from "./hooks";

const fmtMin = (m) => (m < 60 ? `${m} dk` : m < 1440 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : "1 g+");

function TableCard({ table, onOpen }) {
  const busy = table.status === "occupied" && table.items.length > 0;
  const sub = table.zone;
  if (!busy) {
    return (
      <button type="button" className="pp-table is-empty pressable" onClick={(e) => onOpen(table, e.currentTarget)}>
        <div className="pp-table-top"><div><div className="pp-table-name">{table.name}</div><div className="pp-table-seats">{sub}</div></div></div>
        <div className="pp-table-empty-hint"><Ic n="plus" className="ic-sm" />Adisyon aç</div>
      </button>
    );
  }
  const min = Math.max(0, getElapsedMinutes(table.openedAt) || 0);
  const long = min >= 60;
  return (
    <button type="button" className={`pp-table is-busy pressable${long ? " is-long" : ""}`} onClick={(e) => onOpen(table, e.currentTarget)}>
      <div className="pp-table-top">
        <div><div className="pp-table-name">{table.name}</div><div className="pp-table-seats">{sub}</div></div>
        <span className="pp-ring" style={{ "--p": Math.min(100, Math.round((min / 90) * 100)) }} title={`${min} dk açık`} />
      </div>
      <div className="pp-table-amount">{formatTL(tableRemaining(table))}</div>
      <div className="pp-table-meta">
        <span className="t-time"><Ic n="clock" />{fmtMin(min)}</span>
        <span><Ic n="receipt" />{tableCount(table)} ürün</span>
      </div>
    </button>
  );
}

export function TablesView() {
  const { tables, zones, selectedZone, setSelectedZone, setActiveTableId, startFastEsnafOrder } = usePos();
  useNow(30000);
  const boxRef = React.useRef(null);
  const zone = selectedZone && (selectedZone === "Tümü" || zones.includes(selectedZone)) ? selectedZone : "Tümü";
  const visible = tables.filter((t) => zone === "Tümü" || t.zone === zone);

  React.useEffect(() => {
    if (!boxRef.current) return;
    boxRef.current.querySelectorAll(".pp-table").forEach((el, i) => M.rise(el, Math.min(i * 18, 220), 8));
  }, [zone]);

  const open = (t, el) => { M.flash(el); setActiveTableId(t.id); };
  const stat = (z) => {
    const list = tables.filter((t) => z === "Tümü" || t.zone === z);
    return `${list.filter((t) => t.status === "occupied" && t.items.length > 0).length}/${list.length}`;
  };

  return (
    <div className="view-pad">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Bölüm">
          {["Tümü", ...zones].map((z) => (
            <button key={z} type="button" aria-pressed={zone === z} onClick={() => setSelectedZone(z)}>
              {z} <span className="seg-count num">{stat(z)}</span>
            </button>
          ))}
        </div>
        <div className="legend">
          <span><i style={{ background: "var(--primary)" }} />Açık</span>
          <span><i style={{ background: "var(--warning)" }} />60 dk+</span>
          <span><i style={{ background: "var(--surface-4)" }} />Boş</span>
        </div>
        <div className="toolbar-spacer" />
        <button type="button" className="btn btn-secondary" onClick={() => startFastEsnafOrder()}><Ic n="bag" />Hızlı satış</button>
      </div>
      <div className="tables" ref={boxRef}>
        {visible.map((t) => <TableCard key={t.id} table={t} onOpen={open} />)}
      </div>
    </div>
  );
}
