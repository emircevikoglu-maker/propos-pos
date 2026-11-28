import React from "react";

/** Her `ms` milisaniyede yeniden çizim tetikler (geçen süre halkaları için). */
export function useNow(ms = 30000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export const tableSubtotal = (t) => (t ? t.items.reduce((s, i) => s + i.price * i.qty, 0) : 0);
export const tableRemaining = (t) => (t ? Math.max(0, tableSubtotal(t) - (t.discount || 0) - (t.paidAmount || 0)) : 0);
export const tableCount = (t) => (t ? t.items.reduce((s, i) => s + i.qty, 0) : 0);

/** Açık kalma süresi: 45 dk · 2 sa 5 dk · 3 gün. */
export const fmtMin = (m) => (m < 60 ? `${m} dk` : m < 1440 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${Math.floor(m / 1440)} gün`);
