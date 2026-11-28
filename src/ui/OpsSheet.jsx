import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { Ic } from "./Ic";
import { Sheet } from "./Sheet";
import { tableSubtotal } from "./hooks";

/** Masa işlemleri: garson, kişi sayısı, indirim, masa taşı. Adisyon panelini sade tutmak için ayrı pencerede. */
export function OpsSheet({ table, onClose }) {
  const { staffList, setTableStaff, changeTableGuests, setTableDiscount, setTransferModalOpen, printTableReceipt, reprintKitchen } = usePos();
  const sub = tableSubtotal(table);
  const [amount, setAmount] = React.useState("");
  const currentStaff = table.staffId || (staffList[0] && staffList[0].id);

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
        <button type="button" className="btn btn-secondary" onClick={() => { onClose(); setTimeout(() => setTransferModalOpen(true), 0); }}><Ic n="right" />Masayı başka masaya taşı</button>
      </div>
    </Sheet>
  );
}
