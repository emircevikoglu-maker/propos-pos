import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL, formatDateShort } from "../utils/formatters";
import { Ic } from "./Ic";
import { Card, Empty, Kpi, Page, Tag } from "./page";
import { PeriodBar } from "./PeriodBar";
import { Sheet, useSheet } from "./Sheet";

function NewCariSheet({ onClose }) {
  const {
    handleQuickCreateEsnaf, quickNewEsnafName, setQuickNewEsnafName, quickNewEsnafPhone, setQuickNewEsnafPhone,
    quickNewEsnafDiscount, setQuickNewEsnafDiscount
  } = usePos();
  const submit = (e) => { handleQuickCreateEsnaf(e); onClose(); };
  return (
    <Sheet
      onClose={onClose}
      title="Yeni cari kartı"
      label="Komşu esnaf"
      foot={<button type="submit" form="cari-form" className="btn btn-primary btn-lg btn-block">Cari listesine kaydet</button>}
    >
      <form id="cari-form" onSubmit={submit} className="form-grid">
        <label className="field"><span className="ops-title">İşletme / esnaf adı</span>
          <input className="field-input" required autoFocus value={quickNewEsnafName} onChange={(e) => setQuickNewEsnafName(e.target.value)} placeholder="Çiçekçi Meltem" />
        </label>
        <label className="field"><span className="ops-title">Telefon</span>
          <input className="field-input" type="tel" inputMode="tel" value={quickNewEsnafPhone} onChange={(e) => setQuickNewEsnafPhone(e.target.value)} placeholder="0532…" />
        </label>
        <label className="field"><span className="ops-title">Esnaf indirimi (%)</span>
          <input className="field-input" type="number" min="0" max="50" inputMode="numeric" value={quickNewEsnafDiscount} onChange={(e) => setQuickNewEsnafDiscount(e.target.value)} placeholder="0" />
        </label>
      </form>
    </Sheet>
  );
}

function StatementSheet({ esnaf, onClose }) {
  const { staffList, setEsnafCollectModal, setEsnafCollectAmount, copyEsnafWhatsAppSummary, startFastEsnafOrder } = usePos();
  const txs = esnaf.transactions || [];
  const collect = () => { setEsnafCollectModal(esnaf); setEsnafCollectAmount(String(esnaf.balance)); };
  const order = () => { onClose(); startFastEsnafOrder(esnaf.id); };
  return (
    <Sheet
      onClose={onClose}
      label={esnaf.shopType}
      title={esnaf.name}
      foot={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => copyEsnafWhatsAppSummary(esnaf)}><Ic n="send" className="ic-sm" />WhatsApp özeti</button>
          {esnaf.balance > 0
            ? <button type="button" className="btn btn-primary btn-lg" onClick={collect}><Ic n="cash" className="ic-sm" />Tahsilat al</button>
            : <button type="button" className="btn btn-primary btn-lg" onClick={order}><Ic n="plus" className="ic-sm" />Sipariş yaz</button>}
        </>
      }
    >
      <div className="ops-section">
        <div className="sum-row"><span>Güncel borç</span><span className="num" style={{ color: esnaf.balance > 0 ? "var(--warning)" : "var(--success)", fontSize: "var(--fs-xl)", fontWeight: "var(--fw-head)" }}>{formatTL(esnaf.balance)}</span></div>
        {esnaf.phone && <div className="sum-row"><span>Telefon</span><span className="num">{esnaf.phone}</span></div>}
      </div>
      <div className="ops-title">Son hareketler ({txs.length})</div>
      {txs.length === 0 ? (
        <Empty icon="note">Henüz cari hareket yok.</Empty>
      ) : (
        <div className="ops-list">
          {txs.map((tx) => {
            const st = staffList.find((s) => s.id === tx.staffId);
            const pay = tx.type === "payment";
            return (
              <div key={tx.id} className="tx-row">
                <div className="tx-head">
                  <span style={{ color: pay ? "var(--success)" : "var(--text-1)" }}>{pay ? `Tahsilat (${tx.paymentMethod})` : "Sipariş yazıldı"}</span>
                  <span className="num" style={{ color: pay ? "var(--success)" : "var(--warning)" }}>{pay ? "−" : "+"}{formatTL(tx.amount)}</span>
                </div>
                {tx.items && tx.items.length > 0 && <span className="label">{tx.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>}
                <span className="label">{formatDateShort(tx.timestamp)} · {st?.name || "Kasa"}{tx.note ? ` · "${tx.note}"` : ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

export function EsnafView() {
  const {
    totalEsnafReceivable, esnafList, kpiMetrics, startFastEsnafOrder, exportExcelByCategory, esnafSearch, setEsnafSearch,
    selectedEsnafDetail, setSelectedEsnafDetail, setEsnafCollectModal, setEsnafCollectAmount
  } = usePos();
  const sheet = useSheet();
  const owing = esnafList.filter((e) => e.balance > 0).length;
  const q = esnafSearch.trim().toLowerCase();
  const list = esnafList.filter((e) => !q || e.name.toLowerCase().includes(q) || e.shopType.toLowerCase().includes(q));
  const detail = selectedEsnafDetail ? esnafList.find((e) => e.id === selectedEsnafDetail.id) || selectedEsnafDetail : null;

  const openStatement = (e) => { setSelectedEsnafDetail(e); sheet.open("ekstre"); };

  return (
    <Page
      label="Komşu esnaf ve cari hesaplar"
      title="Esnaf"
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => exportExcelByCategory("esnaf")}><Ic n="receipt" className="ic-sm" />Excel</button>
          <button type="button" className="btn btn-secondary" onClick={() => sheet.open("yeni")}><Ic n="plus" className="ic-sm" />Yeni cari</button>
          <button type="button" className="btn btn-primary" onClick={() => startFastEsnafOrder()}><Ic n="zap" className="ic-sm" />Hızlı esnaf siparişi</button>
        </>
      }
    >
      <PeriodBar />
      <Kpi hero label="Toplam cari alacak" value={formatTL(totalEsnafReceivable)} sub={`Açık bakiyesi olan ${owing} işletme`} />
      <Kpi label="Dönemde cariye yazılan" value={formatTL(kpiMetrics.cariWrittenTotal)} sub="Açık hesaba işlenen siparişler" />
      <Kpi label="Cari kartı" value={String(esnafList.length)} sub="Kayıtlı komşu işletme" />
      <Kpi label="Borcu olmayan" value={String(esnafList.length - owing)} sub="Hesabı kapalı" />

      <Card span={12} title="Cari hesaplar" aside={<input className="field-input" style={{ width: 240 }} value={esnafSearch} onChange={(e) => setEsnafSearch(e.target.value)} placeholder="Ad veya iş kolu ara" aria-label="Esnaf ara" />}>
        {list.length === 0 ? (
          <Empty icon="bag">{esnafList.length === 0 ? "Henüz cari kartı yok. \"Yeni cari\" ile komşu esnafı ekleyin." : "Aramaya uyan esnaf yok."}</Empty>
        ) : (
          <div className="cari-list">
            {list.map((e) => (
              <div key={e.id} className="cari-row" role="button" tabIndex={0} onClick={() => openStatement(e)} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openStatement(e); } }}>
                <div className="cari-main">
                  <div className="cari-name">
                    <span>{e.name}</span>
                    <Tag>{e.shopType}</Tag>
                    {e.discountRate > 0 && <Tag tone="success">%{e.discountRate} indirim</Tag>}
                  </div>
                  <span className="label">{e.phone}{e.note ? ` · "${e.note}"` : ""}</span>
                </div>
                <div className="cari-side" onClick={(ev) => ev.stopPropagation()}>
                  <div className="cari-bal">
                    <span className="label">Açık bakiye</span>
                    <b style={{ color: e.balance > 0 ? "var(--warning)" : "var(--success)" }}>{formatTL(e.balance)}</b>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => startFastEsnafOrder(e.id)}>Sipariş yaz</button>
                  {e.balance > 0 && <button type="button" className="btn btn-primary" onClick={() => { setEsnafCollectModal(e); setEsnafCollectAmount(String(e.balance)); }}>Tahsilat al</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {sheet.current === "ekstre" && detail && <StatementSheet esnaf={detail} onClose={sheet.close} />}
      {sheet.current === "yeni" && <NewCariSheet onClose={sheet.close} />}
    </Page>
  );
}
