import React from "react";
import { formatTL } from "../utils/formatters";
import { VOID_REASONS, removalEffect } from "../utils/voids";
import { Sheet } from "./Sheet";

/** Mutfağa gitmiş ürün eksiltilirken neden: tek dokunuşla iptal edilir (ardından 5 sn geri al). */
export function VoidSheet({ item, delta, onClose, onPick }) {
  const { sentRemoved } = removalEffect(item, delta);
  return (
    <Sheet onClose={onClose} label="Gönderilmiş ürün iptali" title={`${sentRemoved}× ${item.name}`}>
      <p className="label" style={{ marginBottom: 12 }}>Bu ürün bara/mutfağa gitti ({formatTL(item.price * sentRemoved)}). Nedenini seçin; iptal raporuna yazılır.</p>
      <div className="ops-list">
        {VOID_REASONS.map((r) => (
          <button key={r} type="button" className="btn btn-secondary" onClick={() => { onPick(r); onClose(); }}>{r}</button>
        ))}
      </div>
    </Sheet>
  );
}
