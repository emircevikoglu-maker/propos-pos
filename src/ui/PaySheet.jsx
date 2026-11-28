import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { Sheet } from "./Sheet";
import { tableRemaining, tableCount } from "./hooks";
import { SwitchRow } from "./page";

const money0 = (n) => formatTL(Math.round(n));

/** Nakit seçenekleri: tam tutar + yukarı yuvarlanmış kupürler (prototip algoritması). */
export function cashChoices(sum) {
  const c = [sum];
  [50, 100, 500, 1000].forEach((step) => { const v = Math.ceil(sum / step) * step; if (v > sum && !c.includes(v) && c.length < 4) c.push(v); });
  while (c.length < 4) c.push(c[c.length - 1] + 500);
  return c;
}

/**
 * Ödeme penceresi (prototip): Nakit / Kart / Böl birincil; diğer yöntemler "Diğer"de (kademeli gösterim).
 * Böl: eşit paylar, her pay seçilen yöntemle kısmi ödeme olarak yazılır; son pay masayı kapatır.
 */
export function PaySheet({ table, onClose }) {
  const {
    completeTableOrder, handlePartialPayment, setPartialPayModalOpen, setEsnafChargeMode, setEsnafChargeModalOpen,
    selectedEsnafForCharge, setSelectedEsnafForCharge, esnafList, printDevice, updatePrintDevice
  } = usePos();
  const sum = tableRemaining(table);
  const [method, setMethod] = React.useState("card");
  const [received, setReceived] = React.useState(sum);
  const [split, setSplit] = React.useState(2);
  const [splitMethod, setSplitMethod] = React.useState("Kredi Kartı");
  const [paid, setPaid] = React.useState(0);
  const panelRef = React.useRef(null);
  const chgRef = React.useRef(null);
  const total0 = React.useRef(sum).current; // pay hesabı pencere açıldığındaki tutardan
  const share = Math.round((total0 / split) * 100) / 100;
  const isLast = method === "split" && paid >= split - 1;

  const pick = (m) => { if (paid) return; setMethod(m); requestAnimationFrame(() => panelRef.current && M.rise(panelRef.current, 0, 6)); };

  // Kapatma, bağlamdaki yönlendirmeyi (masa + pencere girdilerini geri alma) tetikler; ayrıca onClose çağrılmaz.
  const finish = (label) => completeTableOrder(label);

  const go = () => {
    if (method === "cash") return finish("Nakit");
    if (method === "card") return finish("Kredi Kartı");
    if (method === "split") {
      if (isLast) return finish(splitMethod);
      handlePartialPayment(splitMethod, share);
      setPaid((n) => n + 1);
    }
  };

  const cta = method === "split"
    ? `${paid + 1}/${split} payı al · ${isLast ? formatTL(sum) : formatTL(share)}`
    : `Ödemeyi al · ${formatTL(sum)}`;

  const chg = Math.max(0, received - sum);
  React.useEffect(() => { if (chgRef.current && method === "cash") M.bump(chgRef.current, 1.12); }, [received]); // eslint-disable-line react-hooks/exhaustive-deps

  const openLegacy = (fn) => { onClose(); setTimeout(fn, 0); };

  return (
    <Sheet
      onClose={onClose}
      label="Ödeme"
      title={table.name}
      foot={method === "other" ? null : <button type="button" className="btn btn-primary btn-lg btn-block" onClick={go}>{cta}</button>}
    >
      <div className="pay-total"><span className="label">Toplam · {tableCount(table)} ürün</span><span className="money-total">{formatTL(sum)}</span></div>
      <div className="pay-methods is-4" role="group" aria-label="Ödeme yöntemi">
        {[["cash", "cash", "Nakit"], ["card", "card", "Kart"], ["split", "users", "Böl"], ["other", "sliders", "Diğer"]].map(([k, ic, l]) => (
          <button key={k} type="button" className="pay-method pressable" aria-pressed={method === k} onClick={() => pick(k)}><Ic n={ic} />{l}</button>
        ))}
      </div>
      <div className="pay-panel" ref={panelRef}>
        {method === "cash" && (
          <>
            <div className="cash-grid">
              {cashChoices(sum).map((v, i) => (
                <button key={v} type="button" className="chip" aria-pressed={received === v} onClick={() => setReceived(v)}>{i === 0 ? "Tam" : money0(v)}</button>
              ))}
            </div>
            <div className="change"><span className="label" style={{ fontSize: "var(--fs-md)" }}>Para üstü</span><span className="change-v" ref={chgRef}>{formatTL(chg)}</span></div>
          </>
        )}
        {method === "card" && (
          <div className="card-wait"><Ic n="card" className="ic-lg" /><div><div style={{ fontWeight: "var(--fw-label)" }}>Kart ile {formatTL(sum)} tahsil edilecek</div><div className="label">Ödeme cihazında tutarı onaylayın</div></div></div>
        )}
        {method === "split" && (
          <>
            <div className="split-row">
              <span>Kişi sayısı</span>
              <span className="stepper">
                <button type="button" aria-label="Azalt" disabled={paid > 0} onClick={() => setSplit((n) => Math.max(2, n - 1))}><Ic n="minus" className="ic-sm" /></button>
                <span className="num">{split}</span>
                <button type="button" aria-label="Artır" disabled={paid > 0} onClick={() => setSplit((n) => Math.min(8, n + 1))}><Ic n="plus" className="ic-sm" /></button>
              </span>
            </div>
            <div className="split-row">
              <span>Kişi başı <span className="num" style={{ fontWeight: "var(--fw-head)" }}>{formatTL(share)}</span></span>
              <span className="split-dots">
                {Array.from({ length: split }, (_, i) => <span key={i} className={`split-dot${i < paid ? " is-paid" : ""}`}>{i < paid ? <Ic n="check" /> : null}</span>)}
              </span>
            </div>
            <div className="ops-row" style={{ marginTop: 8 }}>
              <span className="label">Her pay</span>
              {[["Nakit", "Nakit"], ["Kredi Kartı", "Kart"]].map(([v, l]) => (
                <button key={v} type="button" className="chip" aria-pressed={splitMethod === v} onClick={() => setSplitMethod(v)}>{l}</button>
              ))}
            </div>
          </>
        )}
        {method === "other" && (
          <div className="pay-other">
            <button type="button" className="btn btn-secondary" onClick={() => finish("Yemek Kartı")}><Ic n="card" />Yemek kartı · {formatTL(sum)}</button>
            <button type="button" className="btn btn-secondary" onClick={() => openLegacy(() => {
              setEsnafChargeMode("full");
              if (!selectedEsnafForCharge && esnafList.length > 0) setSelectedEsnafForCharge(esnafList[0].id);
              setEsnafChargeModalOpen(true);
            })}><Ic n="note" />Esnaf cariye yaz (veresiye)</button>
            <button type="button" className="btn btn-secondary" onClick={() => openLegacy(() => setPartialPayModalOpen(true))}><Ic n="split" />Tutar girerek kısmi ödeme al</button>
            <button type="button" className="btn btn-danger" onClick={() => finish("İkram / İptal")}><Ic n="trash" />İkram / iptal olarak kapat</button>
          </div>
        )}
      </div>
      {printDevice && <SwitchRow title="Ödeme sonrası adisyon yazdır" checked={printDevice.receiptAfterPay} onChange={(receiptAfterPay) => updatePrintDevice({ receiptAfterPay })} />}
    </Sheet>
  );
}
