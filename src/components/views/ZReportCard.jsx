import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { celebrateZReport } from "../../design/celebrations";
import { coverStats, cashDifference } from "../../utils/posHelpers";
import { summarizeVoids } from "../../utils/voids";
import { Card } from "../../ui/page";

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
  const { sales, expenses, staffList, brandSettings, voidLog } = usePos();
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

  const voids = React.useMemo(() => summarizeVoids((voidLog || []).filter((v) => v.timestamp && dayKey(v.timestamp) === day)), [voidLog, day]);
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
<h2>İptaller</h2><table><tr><td>Kayıt</td><td class="r">${esc(voids.count)}</td></tr><tr><td>Tutar</td><td class="r">${esc(formatTL(voids.amount))}</td></tr><tr><td>Gönderildikten sonra</td><td class="r">${esc(formatTL(voids.afterSendAmount))}</td></tr></table>
<h2>Kasa (nakit)</h2><table><tr><td>Nakit satış</td><td class="r">${esc(formatTL(report.cashIn))}</td></tr><tr><td>Nakit gider</td><td class="r">-${esc(formatTL(report.cashOut))}</td></tr><tr class="t"><td>Çekmecede olması gereken</td><td class="r">${esc(formatTL(report.drawer))}</td></tr></table>
<script>window.onload=function(){window.print()}<\/script></body></html>`;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    celebrateZReport({ count: report.count, net: report.net, formatMoney: formatTL });
  };

  const covers = React.useMemo(() => coverStats((sales || []).filter((s) => s.timestamp && dayKey(s.timestamp) === day)), [sales, day]);
  const countKey = `propos_cashcount_${day}`;
  const [counted, setCounted] = React.useState(() => { try { return localStorage.getItem(countKey) || ""; } catch (e) { return ""; } });
  React.useEffect(() => { try { setCounted(localStorage.getItem(countKey) || ""); } catch (e) { setCounted(""); } }, [countKey]);
  const saveCounted = (v) => { setCounted(v); try { if (v === "") localStorage.removeItem(countKey); else localStorage.setItem(countKey, v); } catch (e) {} };
  const cash = cashDifference(report.drawer, counted === "" ? null : Number(counted));

  const Row = ({ label, value, strong }) => (
    <div className={`sum-row${strong ? " is-strong" : ""}`}><span>{label}</span><span className="num">{formatTL(value)}</span></div>
  );
  const Group = ({ title, pairs }) => (
    <div className="z-col">
      <span className="ops-title">{title}</span>
      {pairs.length === 0 ? <span className="label">Kayıt yok</span> : pairs.map(([k, v]) => <Row key={k} label={k} value={v} />)}
    </div>
  );

  return (
    <Card
      span={12}
      title="Gün sonu (Z raporu)"
      aside={
        <span className="page-actions">
          <input type="date" className="field-input" style={{ width: "auto" }} value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Rapor günü" />
          <button type="button" className="btn btn-primary" onClick={printReport}>Yazdır</button>
        </span>
      }
    >
      <div className="z-grid">
        <div className="z-col">
          <span className="ops-title">Satış · {report.count} işlem</span>
          <Row label="Brüt" value={report.gross} />
          <Row label="İndirim" value={-report.discount} />
          <Row label="Net ciro" value={report.net} strong />
          {voids.count > 0 && <div className="sum-row"><span>İptal ({voids.count} kayıt)</span><span className="num">{formatTL(voids.amount)}</span></div>}
        </div>
        <Group title="Ödeme türü" pairs={report.byMethod} />
        <Group title="Personel" pairs={report.byStaff} />
        <div className="z-col">
          <span className="ops-title">Kasa (nakit)</span>
          <Row label="Nakit satış" value={report.cashIn} />
          <Row label="Nakit gider" value={-report.cashOut} />
          <Row label="Çekmecede olmalı" value={report.drawer} strong />
          <label className="z-count">
            <span className="label">Sayılan nakit</span>
            <input type="number" min="0" step="any" inputMode="decimal" className="field-input" value={counted} onChange={(e) => saveCounted(e.target.value)} aria-label="Sayılan nakit" placeholder="0" />
          </label>
          {cash.status !== "invalid" && (
            <div role="status" className={`tag ${cash.status === "ok" ? "tag-success" : cash.status === "short" ? "tag-danger" : "tag-warning"}`} style={{ justifyContent: "space-between" }}>
              <span>{cash.status === "ok" ? "Kasa tutuyor" : cash.status === "short" ? "Kasa eksik" : "Kasa fazla"}</span>
              <span className="num">{cash.diff > 0 ? "+" : ""}{formatTL(cash.diff)}</span>
            </div>
          )}
          {covers.guests > 0 && (
            <>
              <span className="ops-title" style={{ marginTop: 8 }}>Kuver</span>
              <div className="sum-row"><span>Toplam kişi</span><span className="num">{covers.guests}</span></div>
              <div className="sum-row"><span>Kişi başı ciro</span><span className="num">{formatTL(covers.perGuest)}</span></div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
