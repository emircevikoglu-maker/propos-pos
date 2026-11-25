import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, formatDateShort } from "../utils/formatters";
import { ZReportCard } from "../components/views/ZReportCard";
import { Ic } from "./Ic";
import { Card, Empty, Kpi, Page, Tag } from "./page";
import { PeriodBar } from "./PeriodBar";
import { Sheet, useSheet } from "./Sheet";

const CATEGORIES = ["Toptancı / Malzeme", "Fatura / Sabit Gider", "Kira & Aidat", "Personel Gideri", "Bakım / Ekipman", "Vergi & Diğer"];
const METHODS = ["Nakit", "Kredi Kartı", "Banka / Havale", "Yemek Kartı"];

function ExpenseSheet({ onClose }) {
  const {
    handleAddExpense, editingExpId, newExpTitle, setNewExpTitle, newExpCategory, setNewExpCategory,
    newExpAmount, setNewExpAmount, newExpMethod, setNewExpMethod, newExpNote, setNewExpNote
  } = usePos();
  const submit = (e) => { handleAddExpense(e); onClose(); };
  return (
    <Sheet
      onClose={onClose}
      title={editingExpId ? "Gideri düzenle" : "Yeni gider"}
      foot={<button type="submit" form="expense-form" className="btn btn-primary btn-lg btn-block">{editingExpId ? "Değişikliği kaydet" : "Gideri kaydet ve net kârdan düş"}</button>}
    >
      <form id="expense-form" onSubmit={submit} className="form-grid">
        <label className="field"><span className="ops-title">Başlık</span>
          <input className="field-input" required value={newExpTitle} onChange={(e) => setNewExpTitle(e.target.value)} placeholder="Süt ve kahve alımı, elektrik faturası…" autoFocus />
        </label>
        <label className="field"><span className="ops-title">Tutar (₺)</span>
          <input className="field-input" type="number" required min="1" inputMode="decimal" value={newExpAmount} onChange={(e) => setNewExpAmount(e.target.value)} placeholder="0" />
        </label>
        <div className="field"><span className="ops-title">Kategori</span>
          <div className="ops-row">{CATEGORIES.map((c) => <button key={c} type="button" className="chip" aria-pressed={newExpCategory === c} onClick={() => setNewExpCategory(c)}>{c}</button>)}</div>
        </div>
        <div className="field"><span className="ops-title">Ödeme çıkış yöntemi</span>
          <div className="ops-row">{METHODS.map((m) => <button key={m} type="button" className="chip" aria-pressed={newExpMethod === m} onClick={() => setNewExpMethod(m)}>{m}</button>)}</div>
        </div>
        <label className="field"><span className="ops-title">Not (isteğe bağlı)</span>
          <input className="field-input" value={newExpNote} onChange={(e) => setNewExpNote(e.target.value)} placeholder="Fatura no veya tedarikçi" />
        </label>
      </form>
    </Sheet>
  );
}

export function FinanceView() {
  const { kpiMetrics, filteredExpenses, setExpenses, setEditingExpId, setNewExpTitle, setNewExpCategory, setNewExpAmount, setNewExpMethod, setNewExpNote } = usePos();
  const sheet = useSheet();

  const startNew = () => {
    setEditingExpId(null); setNewExpTitle(""); setNewExpAmount(""); setNewExpNote("");
    sheet.open("gider");
  };
  const startEdit = (exp) => {
    setEditingExpId(exp.id); setNewExpTitle(exp.title); setNewExpCategory(exp.category);
    setNewExpAmount(String(exp.amount)); setNewExpMethod(exp.paymentMethod); setNewExpNote(exp.note || "");
    sheet.open("gider");
  };
  const profit = kpiMetrics.netProfit;

  return (
    <Page
      label="Gelir, gider ve gün sonu"
      title="Finans"
      actions={<button type="button" className="btn btn-primary" onClick={startNew}><Ic n="plus" className="ic-sm" />Yeni gider</button>}
    >
      <PeriodBar />
      <Kpi hero label="Net kâr / kalan" value={formatTL(profit)} tone={profit >= 0 ? undefined : "danger"} sub="Ciro − giderler" />
      <Kpi label="Toplam gelir (ciro)" value={formatTL(kpiMetrics.grossRevenue)} />
      <Kpi label="Toplam gider" value={formatTL(kpiMetrics.totalExpenses)} />
      <Kpi label="Kayıtlı gider" value={String(filteredExpenses.length)} sub="Seçili dönemde" />

      <Card span={12} title="Kayıtlı işletme giderleri">
        {filteredExpenses.length === 0 ? (
          <Empty icon="receipt">Bu dönemde gider yok. "Yeni gider" ile fatura, kira veya toptancı ödemesi ekleyin; net kârdan otomatik düşer.</Empty>
        ) : (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Tarih</th><th>Başlık</th><th>Kategori</th><th>Ödeme</th><th className="r">Tutar</th><th className="r" aria-label="İşlemler" /></tr></thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateShort(exp.timestamp)}</td>
                    <td>{exp.title}{exp.note && <span className="label" style={{ display: "block" }}>{exp.note}</span>}</td>
                    <td><Tag>{exp.category}</Tag></td>
                    <td className="muted">{exp.paymentMethod}</td>
                    <td className="r">−{formatTL(exp.amount)}</td>
                    <td className="r">
                      <span className="row-actions">
                        <button type="button" className="icon-btn" aria-label={`${exp.title} düzenle`} onClick={() => startEdit(exp)}><Ic n="note" /></button>
                        <button type="button" className="icon-btn" aria-label={`${exp.title} sil`} onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== exp.id))}><Ic n="trash" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ZReportCard />
      {sheet.current === "gider" && <ExpenseSheet onClose={sheet.close} />}
    </Page>
  );
}
