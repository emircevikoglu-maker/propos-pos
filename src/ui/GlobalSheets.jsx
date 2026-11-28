import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, formatDateShort } from "../utils/formatters";
import { WASTE_REASONS } from "../utils/stockLog";
import { lineDetails } from "../utils/productOptions";
import { PinPad } from "../components/auth/PinPad";
import { Sheet, useStateSheet } from "./Sheet";
import { Chips, Field, HoldButton, SwitchRow } from "./page";
import { Ic } from "./Ic";

/**
 * Her ekrandan açılabilen pencereler. Açık/kapalı bilgisi bağlamda; URL (?s=…) ile eşlenir, geri tuşu kapatır.
 * (3.9.1'e kadar bunlar `PosModals.jsx` içindeki eski pencerelerdi.)
 */
export function GlobalSheets() {
  return (
    <>
      <SyncSheet />
      <PinGate />
      <StockSheet />
      <CollectSheet />
      <ReceiptSheet />
      <ResetSheet />
    </>
  );
}

function SyncSheet() {
  const { syncModalOpen, setSyncModalOpen } = usePos();
  const sheet = useStateSheet("baglanti", !!syncModalOpen, () => setSyncModalOpen(false));
  return sheet.visible ? <SyncBody onClose={sheet.close} /> : null;
}

function SyncBody({ onClose }) {
  const { ACTIVE_TENANT_ID, clientDeviceId, brandSettings, lastSyncedAt, syncPending, cloudStatus, handleManualForceSync, exportFullBackupFile, handleUnpairDevice, showToast } = usePos();
  // Telefon kendi kullanıcısıyla giriş yapar; adres yalnızca uygulamanın kendisi (işletme kodu/anahtar yok).
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  const url = isLocalHost ? `http://${window.__PROPOS_LAN_IP__ || "192.168.1.8"}:${window.location.port || "8586"}/` : `${window.location.origin}/`;
  const copy = () => { if (navigator.clipboard) navigator.clipboard.writeText(url); showToast(`Bağlantı adresi kopyalandı: ${url}`); };
  const locked = typeof window !== "undefined" && !!window.__PROPOS_LOCKED_TENANT__;
  return (
    <Sheet
      onClose={onClose}
      label={`${brandSettings?.businessName || "ProPos"} · ${ACTIVE_TENANT_ID === "DEFAULT" ? "MASTER" : ACTIVE_TENANT_ID}`}
      title="Senkron ve bağlantı"
      foot={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={exportFullBackupFile}><Ic n="receipt" className="ic-sm" />Yedek al</button>
          <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleManualForceSync}><Ic n="cloud" className="ic-sm" />Şimdi eşitle</button>
        </>
      }
    >
      <div className="qr-box">
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=6&data=${encodeURIComponent(url)}`} alt="Telefondan açmak için QR kod" width="120" height="120" />
        <div className="qr-text">
          <span className="ops-title">Telefondan aç</span>
          <span className="label">QR'ı okutun ya da adresi yazın; telefonda kendi kullanıcı adınızla giriş yapın.</span>
          <button type="button" className="chip qr-url num" onClick={copy}>{url}</button>
        </div>
      </div>
      <div className="sum-row"><span>Durum</span><span>{cloudStatus === "offline" ? "Çevrimdışı" : "Bağlı"}{syncPending ? " · bekleyen değişiklik var" : ""}</span></div>
      <div className="sum-row"><span>Son eşitleme</span><span className="num">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString("tr-TR") : "Az önce"}</span></div>
      <div className="sum-row"><span>Bu cihazın kimliği</span><span className="num">{clientDeviceId}</span></div>
      {!locked && <UnpairButton onConfirm={handleUnpairDevice} />}
    </Sheet>
  );
}

/** Çıkış iki adımlı: yanlış dokunuş oturumu kapatmasın. */
function UnpairButton({ onConfirm }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={`btn ${armed ? "btn-danger" : "btn-ghost"} btn-block`} style={{ marginTop: 12 }} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? "Emin misiniz? Bu cihazdan çıkış yapılacak" : "Bu cihazdan çıkış yap"}
    </button>
  );
}

/** Yönetici PIN'i: sunucuda doğrulanır. */
function PinGate() {
  const { pinModalOpen, setPinModalOpen, setPendingProtectedTab, setPinInput, setPinError, handleVerifyPin, handleSetupFirstPin } = usePos();
  if (!pinModalOpen) return null;
  const cancel = () => { setPinModalOpen(false); setPendingProtectedTab(null); setPinInput(""); setPinError(false); };
  return (
    <div className="sheet-wrap pin-wrap">
      <div className="sheet-back" onClick={cancel} />
      <div className="sheet pin-sheet" role="dialog" aria-modal="true" aria-label="Yönetici girişi" onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}>
        <PinPad
          title="Yönetici girişi"
          description="Raporlar, kasa özeti ve yönetim ekranları için yönetici PIN'ini girin."
          onSubmit={(pin) => handleVerifyPin(pin)}
          onSetup={(pin) => handleSetupFirstPin(pin)}
          onCancel={cancel}
        />
      </div>
    </div>
  );
}

function StockSheet() {
  const { stockModalIng, setStockModalIng } = usePos();
  const sheet = useStateSheet("stok", !!stockModalIng, () => setStockModalIng(null));
  return sheet.visible ? <StockBody ing={stockModalIng} onClose={sheet.close} /> : null;
}

const STOCK_TYPES = [["add", "Giriş (alım)"], ["waste", "Zayi"], ["set", "Sayım"]];

function StockBody({ ing, onClose }) {
  const { handleStockAdjustment, stockAdjustType, setStockAdjustType, stockReason, setStockReason, stockAdjustAmount, setStockAdjustAmount, setStockExpenseCost, recordAsExpense, setRecordAsExpense, stockExpenseCost } = usePos();
  return (
    <Sheet
      onClose={onClose}
      label={`Mevcut: ${ing.stock} ${ing.unit}`}
      title={ing.name}
      foot={<button type="submit" form="stock-form" className="btn btn-primary btn-lg btn-block">Stoku güncelle</button>}
    >
      <form id="stock-form" className="form-grid" onSubmit={handleStockAdjustment}>
        <div className="seg seg-full" role="group" aria-label="İşlem türü">
          {STOCK_TYPES.map(([id, text]) => <button key={id} type="button" aria-pressed={stockAdjustType === id} onClick={() => setStockAdjustType(id)}>{text}</button>)}
        </div>
        <Field label={stockAdjustType === "set" ? `Sayılan miktar (${ing.unit})` : `Miktar (${ing.unit})`}>
          <input
            className="field-input" type="number" required autoFocus inputMode="decimal" step="any" min={stockAdjustType === "set" ? "0" : "0.01"}
            value={stockAdjustAmount}
            onChange={(e) => { setStockAdjustAmount(e.target.value); setStockExpenseCost(String(Math.round(Number(e.target.value) * ing.unitCost))); }}
            placeholder={`Örn. 1000 ${ing.unit}`}
          />
        </Field>
        {stockAdjustType === "waste" && <div className="field"><span className="ops-title">Sebep</span><Chips value={stockReason} onChange={setStockReason} items={WASTE_REASONS} /></div>}
        {stockAdjustType === "set" && <p className="label">Sistemdeki miktarla fark varsa eksik ya da fazla olarak kayda geçer.</p>}
        {stockAdjustType === "add" && (
          <div>
            <SwitchRow title="Giderlere de işle" desc="Alım tutarı net kârdan düşer" checked={recordAsExpense} onChange={setRecordAsExpense} />
            {recordAsExpense && (
              <Field label="Toplam alım tutarı (₺)"><input className="field-input" type="number" min="0" inputMode="decimal" value={stockExpenseCost} onChange={(e) => setStockExpenseCost(e.target.value)} /></Field>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}

function CollectSheet() {
  const { esnafCollectModal, setEsnafCollectModal } = usePos();
  const sheet = useStateSheet("tahsilat", !!esnafCollectModal, () => setEsnafCollectModal(null));
  return sheet.visible ? <CollectBody esnaf={esnafCollectModal} onClose={sheet.close} /> : null;
}

function CollectBody({ esnaf, onClose }) {
  const { handleCollectEsnafPayment, esnafCollectAmount, setEsnafCollectAmount, esnafCollectMethod, setEsnafCollectMethod, esnafCollectStaffId, setEsnafCollectStaffId, esnafCollectNote, setEsnafCollectNote, staffList } = usePos();
  const amount = Number(esnafCollectAmount);
  return (
    <Sheet
      onClose={onClose}
      label="Cari tahsilat"
      title={esnaf.name}
      foot={<button type="submit" form="collect-form" className="btn btn-primary btn-lg btn-block"><Ic n="cash" className="ic-sm" />{amount > 0 ? `${formatTL(amount)} tahsil et` : "Tahsil et"}</button>}
    >
      <form id="collect-form" className="form-grid" onSubmit={handleCollectEsnafPayment}>
        <div className="sum-row"><span>Güncel borç</span><span className="num" style={{ color: "var(--warning)" }}>{formatTL(esnaf.balance)}</span></div>
        <Field label="Tahsil edilen tutar (₺)">
          <input className="field-input" type="number" required min="1" inputMode="decimal" value={esnafCollectAmount} onChange={(e) => setEsnafCollectAmount(e.target.value)} />
        </Field>
        <button type="button" className="chip" style={{ justifySelf: "start" }} onClick={() => setEsnafCollectAmount(String(esnaf.balance))}>Tüm borç · {formatTL(esnaf.balance)}</button>
        <div className="field"><span className="ops-title">Ödeme yöntemi</span><Chips value={esnafCollectMethod} onChange={setEsnafCollectMethod} items={["Nakit", "Kredi Kartı", "Yemek Kartı"]} /></div>
        {staffList.length > 0 && <div className="field"><span className="ops-title">Tahsilatı alan</span><Chips value={esnafCollectStaffId} onChange={setEsnafCollectStaffId} items={staffList.map((s) => [s.id, s.name])} /></div>}
        <Field label="Not (isteğe bağlı)"><input className="field-input" value={esnafCollectNote} onChange={(e) => setEsnafCollectNote(e.target.value)} placeholder="Haftalık hesap" /></Field>
      </form>
    </Sheet>
  );
}

function ReceiptSheet() {
  const { inspectedSale, setInspectedSale } = usePos();
  const sheet = useStateSheet("fis", !!inspectedSale, () => setInspectedSale(null));
  return sheet.visible ? <ReceiptBody sale={inspectedSale} onClose={sheet.close} /> : null;
}

function ReceiptBody({ sale, onClose }) {
  const { staffList, handleDeleteSaleReceipt, printSaleReceipt } = usePos();
  const staff = (staffList || []).find((s) => s.id === sale.staffId);
  return (
    <Sheet
      onClose={onClose}
      label={`${formatDateShort(sale.timestamp)}${staff ? ` · ${staff.name}` : ""}`}
      title={sale.tableName}
      foot={
        <>
          <button type="button" className="btn btn-danger btn-lg" onClick={() => handleDeleteSaleReceipt(sale.id)}><Ic n="trash" className="ic-sm" />Kaydı sil</button>
          <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => printSaleReceipt(sale)}><Ic n="receipt" className="ic-sm" />Adisyon yazdır</button>
        </>
      }
    >
      <div className="ops-list">
        {sale.items.map((item, i) => (
          <div key={i} className="sum-row">
            <span>{item.qty}× {item.name}{lineDetails(item) && <span className="label" style={{ display: "block" }}>{lineDetails(item)}</span>}{item.note && <span className="label" style={{ display: "block" }}>{item.note}</span>}</span>
            <span className="num">{formatTL(item.price * item.qty)}</span>
          </div>
        ))}
      </div>
      <div className="receipt-foot">
        {sale.discount > 0 && <div className="sum-row"><span>İndirim</span><span className="num">−{formatTL(sale.discount)}</span></div>}
        <div className="sum-row"><span>Ödeme yöntemi</span><span>{sale.paymentMethod}</span></div>
        <div className="total-row"><span className="label">Toplam</span><span className="money-total">{formatTL(sale.total)}</span></div>
        <p className="label">Silinen kayıt iptal raporuna yazılır; 5 sn içinde geri alınabilir.</p>
      </div>
    </Sheet>
  );
}

function ResetSheet() {
  const { resetConfirmOpen, setResetConfirmOpen } = usePos();
  const sheet = useStateSheet("sifirla", !!resetConfirmOpen, () => setResetConfirmOpen(false));
  return sheet.visible ? <ResetBody onClose={sheet.close} /> : null;
}

/** Tek geri alınamayan işlem: yazarak onay + basılı tutma. */
function ResetBody({ onClose }) {
  const { handleResetDemoData } = usePos();
  const [word, setWord] = React.useState("");
  const ready = word.trim().toLocaleUpperCase("tr-TR") === "SIFIRLA";
  return (
    <Sheet onClose={onClose} label="Geri alınamaz" title="Demo verilerine sıfırla"
      foot={<HoldButton className="btn btn-danger btn-lg btn-block" disabled={!ready} onConfirm={handleResetDemoData}>Basılı tutun: sıfırla</HoldButton>}
    >
      <div className="form-grid">
        <p className="label">Adisyonlar, satışlar, giderler, menü, masalar ve cari hesaplar başlangıç demo verisiyle değiştirilir. Bu değişiklik tüm cihazlara eşitlenir. Önce Güvenlik ve yedek bölümünden yedek indirin.</p>
        <Field label='Onaylamak için "SIFIRLA" yazın'><input className="field-input" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" /></Field>
      </div>
    </Sheet>
  );
}
