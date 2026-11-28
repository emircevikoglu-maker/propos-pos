import React from "react";
import { usePos } from "../../context/PosContext";
import { Ic } from "../Ic";
import { Card } from "../page";

const REPORTS = [
  ["overview", "Genel bilanço"], ["products", "Ürün satış ve kâr"], ["receipts", "Adisyon geçmişi"],
  ["expenses", "Gider ve faturalar"], ["staff", "Çalışan ve kasa"], ["esnaf", "Esnaf cari listesi"]
];

/** Yönetici kilidi açıkken mevcut PIN sorulmaz (sunucu yönetici oturumunu doğrular). */
function PinChangeForm({ unlocked, nextValue, setNextValue, onChange }) {
  const [current, setCurrent] = React.useState("");
  const [repeat, setRepeat] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!/^\S{4,12}$/u.test(nextValue || "")) return setMsg("PIN 4-12 karakter olmalı, boşluk içermemeli.");
    if (nextValue !== repeat) return setMsg("Yeni PIN'ler eşleşmiyor.");
    setBusy(true);
    const r = await onChange(unlocked ? "" : current, nextValue);
    setBusy(false);
    if (r && r.ok) { setNextValue(""); setRepeat(""); setCurrent(""); setMsg("PIN güncellendi."); }
    else setMsg((r && r.error) || "PIN değiştirilemedi.");
  };
  return (
    <form onSubmit={submit} className="form-grid">
      {!unlocked && <input className="field-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mevcut PIN" aria-label="Mevcut PIN" />}
      <input className="field-input" type="password" autoComplete="new-password" maxLength={12} value={nextValue} onChange={(e) => setNextValue(e.target.value)} placeholder="Yeni PIN (4-12 karakter)" aria-label="Yeni PIN" />
      <input className="field-input" type="password" autoComplete="new-password" maxLength={12} value={repeat} onChange={(e) => setRepeat(e.target.value)} placeholder="Yeni PIN (tekrar)" aria-label="Yeni PIN tekrar" />
      {msg && <p role="status" className="label">{msg}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary">{busy ? "Kaydediliyor…" : "PIN'i güncelle"}</button>
    </form>
  );
}

export function Security() {
  const {
    isAdminUnlocked, newPinValue, setNewPinValue, handleChangePin, exportExcelByCategory, exportFullBackupFile,
    handleImportBackupFile, setResetConfirmOpen
  } = usePos();
  return (
    <>
      <Card span={5} title="Yönetici PIN'i" aside={<Ic n="lock" className="ic-sm" />}>
        <p className="label" style={{ marginBottom: 14 }}>Raporlar, kasa özeti ve yönetim ekranlarına girişte sorulur. PIN sunucuda şifreli (hash) saklanır; bu cihaz PIN'i bilmez ve gösteremez.</p>
        <PinChangeForm unlocked={isAdminUnlocked} nextValue={newPinValue} setNextValue={setNewPinValue} onChange={handleChangePin} />
      </Card>

      <div className="span-7 col-stack">
        <Card span={12} title="Yedek ve sıfırlama" aside={<span className="label">Kurtarma dosyası</span>}>
          <div className="ops-row">
            <button type="button" className="btn btn-primary" onClick={exportFullBackupFile}><Ic n="receipt" className="ic-sm" />Tam yedek indir (.json)</button>
            <label className="btn btn-secondary" style={{ cursor: "pointer" }}><Ic n="undo" className="ic-sm" />Yedekten geri yükle<input type="file" accept=".json" onChange={handleImportBackupFile} hidden /></label>
            <button type="button" className="btn btn-danger" onClick={() => setResetConfirmOpen(true)}>Demo verilerine sıfırla</button>
          </div>
        </Card>
        <Card span={12} title="Excel raporları" aside={<span className="label">Her tablo ayrı dosya (.xls)</span>}>
          <div className="ops-row">
            {REPORTS.map(([type, label]) => <button key={type} type="button" className="btn btn-secondary" onClick={() => exportExcelByCategory(type)}>{label}</button>)}
          </div>
        </Card>
      </div>
    </>
  );
}
