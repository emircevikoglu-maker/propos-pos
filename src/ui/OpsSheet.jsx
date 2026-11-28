import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { Ic } from "./Ic";
import { Sheet } from "./Sheet";
import { tableSubtotal, tableRemaining } from "./hooks";

/** Masa işlemleri: garson, kişi sayısı, indirim, yazdırma, masa taşı. Adisyon panelini sade tutmak için ayrı pencerede. */
export function OpsSheet({ table, onClose }) {
  const { staffList, setTableStaff, changeTableGuests, setTableDiscount, printTableReceipt, reprintKitchen } = usePos();
  const sub = tableSubtotal(table);
  const [amount, setAmount] = React.useState("");
  const [moving, setMoving] = React.useState(false);
  const currentStaff = table.staffId || (staffList[0] && staffList[0].id);

  if (moving) return <TransferStep table={table} onClose={onClose} onBack={() => setMoving(false)} />;

  return (
    <Sheet onClose={onClose} label="Masa işlemleri" title={table.name}>
      {staffList.length > 0 && (
        <div className="ops-section">
          <div className="ops-title">Garson</div>
          <div className="ops-row">
            {staffList.map((st) => (
              <button key={st.id} type="button" className="chip" aria-pressed={currentStaff === st.id} onClick={() => setTableStaff(st.id)}>{st.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="ops-section">
        <div className="ops-title">Kişi sayısı</div>
        <span className="stepper">
          <button type="button" aria-label="Azalt" onClick={() => changeTableGuests(-1)}><Ic n="minus" className="ic-sm" /></button>
          <span className="num">{table.guests || 0}</span>
          <button type="button" aria-label="Artır" onClick={() => changeTableGuests(1)}><Ic n="plus" className="ic-sm" /></button>
        </span>
      </div>

      <div className="ops-section">
        <div className="ops-title">İndirim {table.discount > 0 ? `· şu an −${formatTL(table.discount)}` : ""}</div>
        <div className="ops-row">
          {[5, 10, 15, 20].map((p) => (
            <button key={p} type="button" className="chip" disabled={sub <= 0} onClick={() => setTableDiscount(Math.round((sub * p) / 100))}>%{p}</button>
          ))}
          {table.discount > 0 && <button type="button" className="chip" onClick={() => setTableDiscount(0)}>Kaldır</button>}
        </div>
        <div className="ops-row" style={{ marginTop: 10 }}>
          <input className="field-input" style={{ flex: 1, minWidth: 140 }} type="number" min="0" inputMode="decimal" placeholder="Tutar (TL)" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="İndirim tutarı" />
          <button type="button" className="btn btn-secondary" disabled={!amount} onClick={() => { setTableDiscount(amount); setAmount(""); }}>Uygula</button>
        </div>
      </div>

      <div className="ops-list">
        <button type="button" className="btn btn-secondary" disabled={table.items.length === 0} onClick={() => { printTableReceipt(); onClose(); }}><Ic n="receipt" />Adisyon yazdır</button>
        <button type="button" className="btn btn-secondary" disabled={table.items.length === 0} onClick={() => { reprintKitchen(); onClose(); }}><Ic n="send" />Mutfak/bar fişini yeniden yazdır</button>
        <button type="button" className="btn btn-secondary" disabled={table.items.length === 0} onClick={() => setMoving(true)}><Ic n="right" />Masayı başka masaya taşı</button>
      </div>
    </Sheet>
  );
}

/** Masa taşı / birleştir: bölüme göre ızgara; dolu masa seçilirse adisyonlar birleşir (5 sn geri al). */
function TransferStep({ table, onClose, onBack }) {
  const { tables, zones, handleTransferTable } = usePos();
  const [zone, setZone] = React.useState(table.zone && zones.includes(table.zone) ? table.zone : "Tümü");
  const list = tables.filter((t) => t.id !== table.id && (zone === "Tümü" || t.zone === zone));
  return (
    <Sheet onClose={onClose} label="Masayı taşı" title={table.name}>
      <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}><Ic n="left" className="ic-sm" />Masa işlemlerine dön</button>
      <div className="seg seg-full" role="group" aria-label="Bölüm" style={{ marginBottom: 12 }}>
        {["Tümü", ...zones].map((z) => <button key={z} type="button" aria-pressed={zone === z} onClick={() => setZone(z)}>{z}</button>)}
      </div>
      <p className="label" style={{ marginBottom: 12 }}>Boş masaya dokununca adisyon taşınır; dolu masaya dokununca iki adisyon birleşir.</p>
      <div className="move-grid">
        {list.map((t) => {
          const busy = t.status === "occupied" && t.items.length > 0;
          return (
            <button key={t.id} type="button" className={`chip move-chip${busy ? " is-busy" : ""}`} onClick={() => handleTransferTable(t.id)}>
              <span>{t.name}</span>
              <span className="label">{busy ? `Birleştir · ${formatTL(tableRemaining(t))}` : "Boş · taşı"}</span>
            </button>
          );
        })}
        {list.length === 0 && <span className="label">Bu bölümde başka masa yok.</span>}
      </div>
    </Sheet>
  );
}
