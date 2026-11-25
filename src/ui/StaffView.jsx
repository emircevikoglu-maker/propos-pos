import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { Ic } from "./Ic";
import { Card, Kpi, Page, Tag } from "./page";
import { PeriodBar } from "./PeriodBar";

const CHANNELS = [
  ["cash", "Nakit", "success"],
  ["card", "Kredi kartı", "primary"],
  ["mealCard", "Yemek kartı", "warning"],
  ["cariWritten", "Esnaf cari", "text-2"]
];

export function StaffView() {
  const { kpiMetrics, staffPerformance, exportExcelByCategory } = usePos();
  const by = kpiMetrics.byMethod || {};
  const maxTotal = Math.max(1, ...staffPerformance.map((s) => s.total + s.cariWritten));

  return (
    <Page
      label="Ödeme yöntemine göre"
      title="Personel"
      actions={
        <>
          <Tag><Ic n="star" className="ic-sm" />İkram ve iptal {formatTL(by["İkram / İptal"] || 0)}</Tag>
          <button type="button" className="btn btn-secondary" onClick={() => exportExcelByCategory("staff")}><Ic n="receipt" className="ic-sm" />Excel (.xls)</button>
        </>
      }
    >
      <PeriodBar />
      <Kpi label="Nakit kasa" value={formatTL(by["Nakit"] || 0)} sub="Kasada nakit giriş" />
      <Kpi label="Kredi kartı" value={formatTL(by["Kredi Kartı"] || 0)} sub="Banka POS toplamı" />
      <Kpi label="Yemek kartı" value={formatTL(by["Yemek Kartı"] || 0)} sub="Multinet · Sodexo · Ticket" />
      <Kpi label="Cariye yazılan" value={formatTL(by["Esnaf Cariye Yazıldı"] || 0)} sub="Açık hesaba işlenen" />

      <Card span={12} title="Çalışan başına satış" aside={<span className="label">{staffPerformance.length} çalışan</span>}>
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Çalışan</th><th className="r">Nakit</th><th className="r">Kart</th><th className="r">Yemek kartı</th><th className="r">Cariye yazılan</th><th className="r">Adisyon</th><th className="r">Net tahsilat</th>
              </tr>
            </thead>
            <tbody>
              {staffPerformance.map((st) => {
                const share = kpiMetrics.grossRevenue > 0 ? Math.round((st.total / kpiMetrics.grossRevenue) * 100) : 0;
                return (
                  <tr key={st.id}>
                    <td>
                      <span className="person">
                        <span className="avatar" style={{ background: st.color, color: "#1a1206" }}>{st.avatar}</span>
                        <span><span className="person-name">{st.name}</span><span className="label">{st.role}</span></span>
                      </span>
                    </td>
                    <td className="r">{formatTL(st.cash)}</td>
                    <td className="r">{formatTL(st.card)}</td>
                    <td className="r">{formatTL(st.mealCard)}</td>
                    <td className="r">{formatTL(st.cariWritten)}</td>
                    <td className="r">{st.orderCount} <span className="muted">({st.itemCount} ürün)</span></td>
                    <td className="r"><strong>{formatTL(st.total)}</strong><span className="label" style={{ display: "block" }}>kasanın %{share}'i</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        span={12}
        title="Kanal karşılaştırması"
        aside={<span className="legend">{CHANNELS.map(([, text, tone]) => <span key={text}><i style={{ background: `var(--${tone})` }} />{text}</span>)}</span>}
      >
        <div className="stack-list">
          {staffPerformance.map((st) => (
            <div key={st.id} className="stack-row">
              <span className="stack-name">{st.name}</span>
              <span className="stack" role="img" aria-label={`${st.name}: ${CHANNELS.map(([k, t]) => `${t} ${formatTL(st[k])}`).join(", ")}`}>
                {CHANNELS.map(([k, t, tone]) => st[k] > 0 && <i key={k} title={`${t}: ${formatTL(st[k])}`} style={{ width: `${(st[k] / maxTotal) * 100}%`, background: `var(--${tone})` }} />)}
              </span>
              <span className="num">{formatTL(st.total + st.cariWritten)}</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
