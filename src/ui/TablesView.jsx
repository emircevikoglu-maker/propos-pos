import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, getElapsedMinutes } from "../utils/formatters";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { useNow, tableRemaining, tableCount, fmtMin } from "./hooks";


/** Masa az önce kapandıysa kartın üstünde bir kez onay işareti (prototip). */
function useClosedFlash(ref, closedAt) {
  React.useEffect(() => {
    if (!closedAt || Date.now() - closedAt > 1500 || !ref.current) return;
    const done = ref.current.querySelector(".pp-table-done");
    if (!done) return;
    M.anim(done, [{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1)", offset: 0.35 }, { opacity: 0, transform: "scale(1)" }], { duration: 600 });
    M.anim(done.querySelector(".ic"), [{ transform: "scale(.4)" }, { transform: "scale(1.15)", offset: 0.5 }, { transform: "scale(1)" }], { duration: 420, easing: M.EASE.spring });
  }, [closedAt, ref]);
}

function TableCard({ table, onOpen, closedAt }) {
  const ref = React.useRef(null);
  useClosedFlash(ref, closedAt);
  const busy = table.status === "occupied" && table.items.length > 0;
  const sub = table.zone;
  if (!busy) {
    return (
      <button type="button" ref={ref} className="pp-table is-empty pressable" onClick={(e) => onOpen(table, e.currentTarget)}>
        <div className="pp-table-top"><div><div className="pp-table-name">{table.name}</div><div className="pp-table-seats">{sub}</div></div></div>
        <div className="pp-table-empty-hint"><Ic n="plus" className="ic-sm" />Adisyon aç</div>
        <span className="pp-table-done" aria-hidden="true"><Ic n="check" /></span>
      </button>
    );
  }
  const min = Math.max(0, getElapsedMinutes(table.openedAt) || 0);
  const long = min >= 60;
  return (
    <button type="button" className={`pp-table is-busy pressable${long ? " is-long" : ""}`} onClick={(e) => onOpen(table, e.currentTarget)}>
      <div className="pp-table-top">
        <div><div className="pp-table-name">{table.name}</div><div className="pp-table-seats">{sub}</div></div>
        <span className="pp-ring" style={{ "--p": Math.min(100, Math.round((min / 90) * 100)) }} title={`${fmtMin(min)} açık`} />
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
  const { tables, zones, selectedZone, setSelectedZone, setActiveTableId, startFastEsnafOrder, sales, activeOccupiedCount, openTablesTotalAmount, lastClosed } = usePos();
  // Eski kenar çubuğundaki "bugünkü kasa / açık masalardaki tutar" özetleri (3.9.0'da geri geldi).
  const todayTotal = React.useMemo(() => {
    const d = new Date().toDateString();
    return (sales || []).reduce((sum, x) => (x.paymentMethod !== "İkram / İptal" && new Date(x.timestamp).toDateString() === d ? sum + (Number(x.total) || 0) : sum), 0);
  }, [sales]);
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
        <div className="table-sums" aria-label="Özet">
          <span><span className="label">Açık masalarda</span><b className="num">{formatTL(openTablesTotalAmount)}</b><span className="label">{activeOccupiedCount} masa</span></span>
          <span><span className="label">Bugün kasa</span><b className="num">{formatTL(todayTotal)}</b></span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => startFastEsnafOrder()}><Ic n="bag" />Hızlı satış</button>
      </div>
      <div className="tables" ref={boxRef}>
        {visible.map((t) => <TableCard key={t.id} table={t} onOpen={open} closedAt={lastClosed && lastClosed.id === t.id ? lastClosed.at : null} />)}
      </div>
    </div>
  );
}
