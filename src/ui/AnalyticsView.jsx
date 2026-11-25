import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, formatDateShort } from "../utils/formatters";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { Bar, Card, Empty, Kpi, Page, Seg, Tag } from "./page";
import { PeriodBar } from "./PeriodBar";

const EXPENSE_CATEGORIES = ["Toptancı / Malzeme", "Fatura / Sabit Gider", "Kira & Aidat", "Personel Gideri", "Bakım / Ekipman", "Vergi & Diğer"];
const METHOD_TONE = { "Nakit": "success", "Kredi Kartı": "primary", "Yemek Kartı": "warning", "Esnaf Cariye Yazıldı": undefined, "İkram / İptal": "danger" };
const EXCEL_LABEL = { overview: "Genel özet", products: "Ürün tablosu", receipts: "Adisyon geçmişi", expenses: "Gider tablosu" };
const has = (text, q) => String(text || "").toLowerCase().includes(q.toLowerCase());

/** Ciro (dolu çubuk) ve gider (çizgi) — prototipin yoğunluk çubuk grafiğiyle aynı bileşen sınıfları. */
function TrendChart({ data, showExpense }) {
  const ref = React.useRef(null);
  const rows = data.length ? data : [{ name: "-", Ciro: 0, Gider: 0 }];
  const max = Math.max(100, ...rows.map((d) => Math.max(d.Ciro || 0, showExpense ? d.Gider || 0 : 0))) * 1.1;
  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll(".heat-bar").forEach((b, i) => M.anim(b, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 320, delay: Math.min(i * 4, 200), fill: "backwards" }));
  }, [rows.length, showExpense]);
  const pick = (i) => rows[Math.min(rows.length - 1, Math.round((i * (rows.length - 1)) / 4))].name;
  return (
    <>
      <div className="heat" ref={ref} role="img" aria-label="Ciro grafiği">
        {rows.map((d, i) => (
          <div key={`${d.name}-${i}`} className="heat-col" title={`${d.name} · Ciro ${formatTL(d.Ciro || 0)}${showExpense ? ` · Gider ${formatTL(d.Gider || 0)}` : ""}`}>
            {showExpense && <span className="heat-typ" style={{ height: `${((d.Gider || 0) / max) * 100}%` }} />}
            <span className="heat-bar" style={{ height: `${((d.Ciro || 0) / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="heat-axis">{[0, 1, 2, 3, 4].map((i) => <span key={i}>{pick(i)}</span>)}</div>
    </>
  );
}

function Overview() {
  const { kpiMetrics, topProducts, globalPeriod, trendChartData, setAnalyticsSubTab } = usePos();
  const by = kpiMetrics.byMethod || {};
  const channels = [
    ["Kredi kartı", by["Kredi Kartı"] || 0, "primary"],
    ["Nakit", by["Nakit"] || 0, "success"],
    ["Yemek kartı", by["Yemek Kartı"] || 0, "warning"],
    ["Esnaf cari", by["Esnaf Cariye Yazıldı"] || 0, "text-2"]
  ];
  const total = Math.max(1, channels.reduce((s, c) => s + c[1], 0));
  const lead = topProducts[0];
  const showExpense = globalPeriod !== "daily";
  const profit = kpiMetrics.netProfit;
  return (
    <>
      <Kpi hero label="Brüt ciro" value={formatTL(kpiMetrics.grossRevenue)} sub={`${kpiMetrics.orderCount} adisyon · +${formatTL(kpiMetrics.cariWrittenTotal)} cari`} />
      <Kpi label="Net işletme kârı" value={formatTL(profit)} tone={profit >= 0 ? undefined : "danger"} sub={`Dönem gideri −${formatTL(kpiMetrics.totalExpenses)}`} />
      <Kpi label="Ortalama adisyon" value={formatTL(kpiMetrics.avgTicket)} sub="Masa başı ortalama harcama" />
      <Kpi label="Lider ürün" value={lead ? lead.name : "—"} sub={lead ? `${lead.qty} adet · ${formatTL(lead.revenue)}` : "Henüz satış yok"} />

      <Card
        span={8}
        title={globalPeriod === "daily" ? "Saatlik ciro" : "Ciro ve gider"}
        aside={<span className="legend"><span><i style={{ background: "var(--primary)" }} />Ciro</span>{showExpense && <span><i style={{ border: "1px solid var(--text-3)" }} />Gider</span>}</span>}
      >
        <TrendChart data={trendChartData} showExpense={showExpense} />
      </Card>

      <Card span={4} title="Ödeme dağılımı" aside={<span className="label">Tahsilat kompozisyonu</span>}>
        <div className="rank">
          {channels.map(([label, amount, tone]) => (
            <div key={label} className="rank-row">
              <span className="rank-name">{label}</span>
              <span className="rank-v">{formatTL(amount)} · %{Math.round((amount / total) * 100)}</span>
              <Bar value={amount / total} tone={tone} />
            </div>
          ))}
        </div>
      </Card>

      <Card span={12} title="En çok tercih edilen ürünler" aside={<button type="button" className="btn btn-ghost" onClick={() => setAnalyticsSubTab("products")}>Tüm ürünler<Ic n="arrow" className="ic-sm" /></button>}>
        {topProducts.length === 0 ? (
          <Empty icon="chart">Bu tarih aralığında ürün satışı yok.</Empty>
        ) : (
          <div className="rank is-2">
            {topProducts.slice(0, 8).map((p, i) => (
              <div key={p.id} className="rank-row">
                <span className="rank-name"><span className="num muted">{i + 1}.</span> {p.name} <span className="label">{p.qty} adet · kâr {formatTL(p.profit)}</span></span>
                <span className="rank-v">{formatTL(p.revenue)}</span>
                <Bar value={Math.max(0.05, p.share / 100)} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function Products() {
  const { topProducts, categories, reportProductSearch, setReportProductSearch, reportProductCategory, setReportProductCategory, reportProductSort, setReportProductSort } = usePos();
  const rows = topProducts
    .filter((p) => (reportProductCategory === "Tümü" || p.category === reportProductCategory) && has(p.name, reportProductSearch))
    .sort((a, b) => b[reportProductSort] - a[reportProductSort]);
  return (
    <>
      <div className="toolbar">
        <input className="field-input" style={{ width: 240 }} value={reportProductSearch} onChange={(e) => setReportProductSearch(e.target.value)} placeholder="Ürün ara" aria-label="Ürün ara" />
        <select className="field-input" style={{ width: "auto" }} value={reportProductCategory} onChange={(e) => setReportProductCategory(e.target.value)} aria-label="Kategori">
          <option value="Tümü">Tüm kategoriler</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="toolbar-spacer" />
        <Seg label="Sıralama" value={reportProductSort} onChange={setReportProductSort} items={[["qty", "Adet"], ["revenue", "Ciro"], ["profit", "Net kâr"]]} />
      </div>
      <Card span={12} title="Ürün satış, ciro ve net kâr" aside={<span className="label">{rows.length} ürün</span>}>
        {rows.length === 0 ? <Empty icon="chart">Filtreye uyan ürün satışı yok.</Empty> : (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>#</th><th>Ürün</th><th>Kategori</th><th className="r">Adet</th><th className="r">Ciro</th><th className="r">Reçete maliyeti</th><th className="r">Net kâr</th><th className="r">Ciro payı</th></tr></thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{p.name}</td>
                    <td className="muted">{p.category}</td>
                    <td className="r">{p.qty}</td>
                    <td className="r">{formatTL(p.revenue)}</td>
                    <td className="r muted">−{formatTL(p.costTotal)}</td>
                    <td className="r" style={{ color: "var(--success)" }}>{formatTL(p.profit)}</td>
                    <td className="r muted">%{p.share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Receipts() {
  const {
    filteredSales, staffList, reportReceiptSearch, setReportReceiptSearch, reportReceiptMethod, setReportReceiptMethod,
    reportReceiptStaff, setReportReceiptStaff, setInspectedSale, handleDeleteSaleReceipt
  } = usePos();
  const rows = filteredSales.filter((s) =>
    (reportReceiptMethod === "Tümü" || s.paymentMethod === reportReceiptMethod) &&
    (reportReceiptStaff === "Tümü" || s.staffId === reportReceiptStaff) &&
    (!reportReceiptSearch || has(s.tableName, reportReceiptSearch) || s.items.some((i) => has(i.name, reportReceiptSearch)))
  );
  return (
    <>
      <div className="toolbar">
        <input className="field-input" style={{ width: 260 }} value={reportReceiptSearch} onChange={(e) => setReportReceiptSearch(e.target.value)} placeholder="Masa, ürün veya esnaf ara" aria-label="Adisyon ara" />
        <select className="field-input" style={{ width: "auto" }} value={reportReceiptMethod} onChange={(e) => setReportReceiptMethod(e.target.value)} aria-label="Ödeme yöntemi">
          <option value="Tümü">Tüm ödeme yöntemleri</option>
          {Object.keys(METHOD_TONE).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="field-input" style={{ width: "auto" }} value={reportReceiptStaff} onChange={(e) => setReportReceiptStaff(e.target.value)} aria-label="Çalışan">
          <option value="Tümü">Tüm çalışanlar</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <Card span={12} title="Adisyon ve satış geçmişi" aside={<span className="label">{rows.length > 60 ? "İlk 60 kayıt · " : ""}{rows.length} kayıt</span>}>
        {rows.length === 0 ? <Empty icon="receipt">Filtreye uyan adisyon yok.</Empty> : (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Tarih</th><th>Masa</th><th>Çalışan</th><th>İçerik</th><th>Ödeme</th><th className="r">Tutar</th><th className="r" aria-label="İşlemler" /></tr></thead>
              <tbody>
                {rows.slice(0, 60).map((s) => {
                  const st = staffList.find((x) => x.id === s.staffId);
                  return (
                    <tr key={s.id}>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateShort(s.timestamp)}</td>
                      <td>{s.tableName}</td>
                      <td>{st?.name || "Kasa"}</td>
                      <td className="muted cell-clip">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                      <td><Tag tone={METHOD_TONE[s.paymentMethod]}>{s.paymentMethod}</Tag></td>
                      <td className="r">{formatTL(s.total)}</td>
                      <td className="r">
                        <span className="row-actions">
                          <button type="button" className="icon-btn" aria-label={`${s.tableName} fişini incele`} onClick={() => setInspectedSale(s)}><Ic n="eye" /></button>
                          <button type="button" className="icon-btn" aria-label={`${s.tableName} kaydını sil`} onClick={() => handleDeleteSaleReceipt(s.id)}><Ic n="trash" /></button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Expenses() {
  const { filteredExpenses, setExpenses, reportExpenseSearch, setReportExpenseSearch, reportExpenseCategory, setReportExpenseCategory } = usePos();
  const rows = filteredExpenses.filter((e) => (reportExpenseCategory === "Tümü" || e.category === reportExpenseCategory) && (has(e.title, reportExpenseSearch) || has(e.note, reportExpenseSearch)));
  return (
    <>
      <div className="toolbar">
        <input className="field-input" style={{ width: 260 }} value={reportExpenseSearch} onChange={(e) => setReportExpenseSearch(e.target.value)} placeholder="Başlık veya not ara" aria-label="Gider ara" />
        <select className="field-input" style={{ width: "auto" }} value={reportExpenseCategory} onChange={(e) => setReportExpenseCategory(e.target.value)} aria-label="Gider kategorisi">
          <option value="Tümü">Tüm gider kategorileri</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <Card span={12} title="Gider ve fatura dökümü" aside={<span className="label">{rows.length} kayıt</span>}>
        {rows.length === 0 ? <Empty icon="receipt">Filtreye uyan gider yok.</Empty> : (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Tarih</th><th>Başlık</th><th>Kategori</th><th>Ödeme</th><th className="r">Tutar</th><th className="r" aria-label="İşlemler" /></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateShort(e.timestamp)}</td>
                    <td>{e.title}{e.note && <span className="label" style={{ display: "block" }}>{e.note}</span>}</td>
                    <td className="muted">{e.category}</td>
                    <td className="muted">{e.paymentMethod}</td>
                    <td className="r">−{formatTL(e.amount)}</td>
                    <td className="r"><button type="button" className="icon-btn" aria-label={`${e.title} sil`} onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== e.id))}><Ic n="trash" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export function AnalyticsView() {
  const { analyticsSubTab, setAnalyticsSubTab, exportExcelByCategory } = usePos();
  const tab = EXCEL_LABEL[analyticsSubTab] ? analyticsSubTab : "overview";
  return (
    <Page
      label="Satış, ürün ve gider raporları"
      title="Analiz"
      actions={<button type="button" className="btn btn-secondary" onClick={() => exportExcelByCategory(tab)}><Ic n="receipt" className="ic-sm" />{EXCEL_LABEL[tab]} Excel (.xls)</button>}
    >
      <PeriodBar />
      <div className="toolbar">
        <Seg label="Rapor bölümü" value={tab} onChange={setAnalyticsSubTab} items={[["overview", "Özet"], ["products", "Ürünler"], ["receipts", "Adisyonlar"], ["expenses", "Giderler"]]} />
      </div>
      {tab === "overview" && <Overview />}
      {tab === "products" && <Products />}
      {tab === "receipts" && <Receipts />}
      {tab === "expenses" && <Expenses />}
    </Page>
  );
}
