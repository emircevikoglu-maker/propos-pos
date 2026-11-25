import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const sum = (list, pick) => list.reduce((t, x) => t + (Number(pick(x)) || 0), 0);
const groupSum = (list, keyOf, pick) => {
  const out = {};
  list.forEach((x) => { const k = keyOf(x) || "Diğer"; out[k] = (out[k] || 0) + (Number(pick(x)) || 0); });
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
};

/** Gün sonu (Z) raporu: seçilen günün ciro, ödeme türü, personel ve kasa özeti. */
export function ZReportCard() {
  const { sales, expenses, staffList, brandSettings } = usePos();
  const today = dayKey(new Date().toISOString());
  const [day, setDay] = React.useState(today);

  const report = React.useMemo(() => {
    const daySales = (sales || []).filter((s) => s.timestamp && dayKey(s.timestamp) === day);
    const dayExp = (expenses || []).filter((e) => e.timestamp && dayKey(e.timestamp) === day);
    const staffName = (id) => (staffList || []).find((s) => s.id === id)?.name || "Bilinmiyor";
    const byMethod = groupSum(daySales, (s) => s.paymentMethod, (s) => s.total);
    const cashIn = sum(daySales.filter((s) => s.paymentMethod === "Nakit"), (s) => s.total);
    const cashOut = sum(dayExp.filter((e) => e.paymentMethod === "Nakit"), (e) => e.amount);
    return {
      count: daySales.length,
      gross: sum(daySales, (s) => s.subtotal ?? s.total),
      discount: sum(daySales, (s) => s.discount),
      net: sum(daySales, (s) => s.total),
      byMethod,
      byStaff: groupSum(daySales, (s) => staffName(s.staffId), (s) => s.total),
      expenseTotal: sum(dayExp, (e) => e.amount),
      expenseByMethod: groupSum(dayExp, (e) => e.paymentMethod, (e) => e.amount),
      cashIn, cashOut, drawer: cashIn - cashOut
    };
  }, [sales, expenses, staffList, day]);

  const printReport = () => {
    const rows = (pairs) => pairs.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${esc(formatTL(v))}</td></tr>`).join("") || '<tr><td colspan="2">Kayıt yok</td></tr>';
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Z Raporu ${esc(day)}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;max-width:340px;margin:16px auto;color:#111}h1{font-size:16px;margin:0}h2{font-size:13px;margin:14px 0 4px;border-bottom:1px solid #999}
table{width:100%;border-collapse:collapse}td{padding:3px 0}.r{text-align:right}.t td{border-top:1px solid #111;font-weight:600}</style></head><body>
<h1>${esc(brandSettings?.businessName || "ProPos")} — Gün Sonu (Z) Raporu</h1><div>${esc(day)} · ${report.count} işlem</div>
<h2>Satış</h2><table><tr><td>Brüt</td><td class="r">${esc(formatTL(report.gross))}</td></tr><tr><td>İndirim</td><td class="r">-${esc(formatTL(report.discount))}</td></tr><tr class="t"><td>Net ciro</td><td class="r">${esc(formatTL(report.net))}</td></tr></table>
<h2>Ödeme türüne göre</h2><table>${rows(report.byMethod)}</table>
<h2>Personele göre</h2><table>${rows(report.byStaff)}</table>
<h2>Giderler</h2><table>${rows(report.expenseByMethod)}<tr class="t"><td>Toplam gider</td><td class="r">${esc(formatTL(report.expenseTotal))}</td></tr></table>
<h2>Kasa (nakit)</h2><table><tr><td>Nakit satış</td><td class="r">${esc(formatTL(report.cashIn))}</td></tr><tr><td>Nakit gider</td><td class="r">-${esc(formatTL(report.cashOut))}</td></tr><tr class="t"><td>Çekmecede olması gereken</td><td class="r">${esc(formatTL(report.drawer))}</td></tr></table>
<script>window.onload=function(){window.print()}<\/script></body></html>`;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const Line = ({ label, value, strong }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-400">{label}</span>
      <span className={strong ? "font-semibold text-amber-400" : "text-stone-200"}>{formatTL(value)}</span>
    </div>
  );
  const List = ({ title, pairs }) => (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{title}</div>
      {pairs.length === 0 ? <div className="text-xs text-stone-600">Kayıt yok</div> : pairs.map(([k, v]) => <Line key={k} label={k} value={v} />)}
    </div>
  );

  return (
    <div className="lg:col-span-12 p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">🧾 Gün Sonu (Z) Raporu</h3>
        <div className="flex items-center gap-2">
          <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)}
            className="rounded-xl border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs text-white" />
          <button type="button" onClick={printReport} className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400">
            Yazdır
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Satış · {report.count} işlem</div>
          <Line label="Brüt" value={report.gross} />
          <Line label="İndirim" value={-report.discount} />
          <Line label="Net ciro" value={report.net} strong />
        </div>
        <List title="Ödeme türü" pairs={report.byMethod} />
        <List title="Personel" pairs={report.byStaff} />
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Kasa (nakit)</div>
          <Line label="Nakit satış" value={report.cashIn} />
          <Line label="Nakit gider" value={-report.cashOut} />
          <Line label="Çekmecede olmalı" value={report.drawer} strong />
        </div>
      </div>
    </div>
  );
}
