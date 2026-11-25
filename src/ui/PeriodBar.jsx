import React from "react";
import { usePos } from "../context/PosContext";
import { Seg } from "./page";

export const PERIODS = [["daily", "Bugün"], ["yesterday", "Dün"], ["weekly", "7 Gün"], ["monthly", "30 Gün"], ["all", "Tümü"], ["custom", "Tarih"]];

/** Rapor sayfalarının ortak dönem seçici (Bugün / Dün / 7 Gün / 30 Gün / Tümü / Tarih). Page içinde ilk çocuk olarak kullanılır. */
export function PeriodBar() {
  const { globalPeriod, setGlobalPeriod, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate } = usePos();
  return (
    <div className="toolbar">
      <Seg label="Dönem" value={globalPeriod} onChange={setGlobalPeriod} items={PERIODS} />
      {globalPeriod === "custom" && (
        <>
          <input type="date" className="field-input" style={{ width: "auto" }} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} aria-label="Başlangıç" />
          <input type="date" className="field-input" style={{ width: "auto" }} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} aria-label="Bitiş" />
        </>
      )}
    </div>
  );
}
