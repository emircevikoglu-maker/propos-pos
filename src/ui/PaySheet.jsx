import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { PPMotion as M } from "../design/motion";
import { Ic } from "./Ic";
import { Sheet } from "./Sheet";
import { tableRemaining, tableCount } from "./hooks";
import { Chips, Field, SwitchRow } from "./page";

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
 * "Diğer" altındaki tutarlı kısmi ödeme ve cariye yazma aynı pencerede birer adımdır.
 */
export function PaySheet({ table, onClose }) {
  const [step, setStep] = React.useState({ name: "main" }); // main | amount | cari
  const back = () => setStep({ name: "main" });
  if (step.name === "amount") return <AmountStep table={table} onClose={onClose} onBack={back} onCari={(amount) => setStep({ name: "cari", amount })} />;
  if (step.name === "cari") return <CariStep table={table} amount={step.amount} onClose={onClose} onBack={step.amount ? () => setStep({ name: "amount" }) : back} />;
  return <MainStep table={table} onClose={onClose} onAmount={() => setStep({ name: "amount" })} onCari={() => setStep({ name: "cari" })} />;
}

function MainStep({ table, onClose, onAmount, onCari }) {
  const { completeTableOrder, handlePartialPayment, printDevice, updatePrintDevice } = usePos();
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
  const chg = Math.max(0, received - sum);

  const pick = (m) => { if (paid) return; setMethod(m); requestAnimationFrame(() => panelRef.current && M.rise(panelRef.current, 0, 6)); };

  // Kapatma, bağlamdaki yönlendirmeyi (masa + pencere girdilerini geri alma) tetikler; ayrıca onClose çağrılmaz.
  const finish = (label, change) => completeTableOrder(label, change ? { change } : undefined);

  const go = () => {
    if (method === "cash") return finish("Nakit", chg);
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

  React.useEffect(() => { if (chgRef.current && method === "cash") M.bump(chgRef.current, 1.12); }, [received]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <button type="button" className="btn btn-secondary" onClick={onCari}><Ic n="note" />Esnaf cariye yaz (veresiye)</button>
            <button type="button" className="btn btn-secondary" onClick={onAmount}><Ic n="split" />Tutar girerek kısmi ödeme al</button>
            <button type="button" className="btn btn-danger" onClick={() => finish("İkram / İptal")}><Ic n="trash" />İkram / iptal olarak kapat</button>
          </div>
        )}
      </div>
      {printDevice && <SwitchRow title="Ödeme sonrası adisyon yazdır" checked={printDevice.receiptAfterPay} onChange={(receiptAfterPay) => updatePrintDevice({ receiptAfterPay })} />}
    </Sheet>
  );
}

const BackButton = ({ onBack }) => <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}><Ic n="left" className="ic-sm" />Ödemeye dön</button>;

/** Tutar girerek kısmi ödeme; tutar kalanın tamamını karşılıyorsa masa kapanır. */
function AmountStep({ table, onClose, onBack, onCari }) {
  const { handlePartialPayment } = usePos();
  const sum = tableRemaining(table);
  const [text, setText] = React.useState("");
  const amount = Number(String(text).replace(",", "."));
  const valid = Number.isFinite(amount) && amount > 0;
  const closes = valid && amount >= sum;
  const take = (method) => {
    handlePartialPayment(method, Math.min(amount, sum));
    if (!closes) onClose();
  };
  return (
    <Sheet onClose={onClose} label={`Kısmi ödeme · kalan ${formatTL(sum)}`} title={table.name}>
      <BackButton onBack={onBack} />
      <div className="form-grid">
        <Field label="Tahsil edilecek tutar (₺)">
          <input className="field-input field-money" autoFocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" />
        </Field>
        <div className="ops-row">
          {[[2, "Yarısı"], [3, "Üçte biri"], [4, "Dörtte biri"]].map(([n, l]) => <button key={n} type="button" className="chip" onClick={() => setText(String(Math.round(sum / n)))}>{l} · {money0(sum / n)}</button>)}
        </div>
        {closes && <p className="label">Bu tutar kalanın tamamı: masa kapanır.</p>}
        <div className="ops-list">
          {[["Nakit", "cash", "Nakit al"], ["Kredi Kartı", "card", "Kartla al"], ["Yemek Kartı", "card", "Yemek kartıyla al"]].map(([m, ic, l]) => (
            <button key={m} type="button" className="btn btn-secondary" disabled={!valid} onClick={() => take(m)}><Ic n={ic} />{l}{valid ? ` · ${formatTL(Math.min(amount, sum))}` : ""}</button>
          ))}
          <button type="button" className="btn btn-secondary" disabled={!valid} onClick={() => onCari(Math.min(amount, sum))}><Ic n="note" />Bu tutarı esnaf cariye yaz</button>
        </div>
      </div>
    </Sheet>
  );
}

/** Cariye yaz: esnaf seç, indirim, not; listede yoksa satır içinde ekle. */
function CariStep({ table, amount, onClose, onBack }) {
  const {
    esnafList, selectedEsnafForCharge, setSelectedEsnafForCharge, applyEsnafDiscount, setApplyEsnafDiscount, esnafOrderNote, setEsnafOrderNote,
    quickNewEsnafName, setQuickNewEsnafName, handleQuickCreateEsnaf, handleConfirmEsnafCharge
  } = usePos();
  const [query, setQuery] = React.useState("");
  const picked = esnafList.find((e) => e.id === selectedEsnafForCharge) || null;
  const rest = tableRemaining(table);
  const partial = !!amount;
  const discountable = !partial && !!picked && picked.discountRate > 0 && !table.discount;
  const discount = discountable && applyEsnafDiscount ? Math.round((rest * picked.discountRate) / 100) : 0;
  const charge = partial ? Math.min(rest, amount) : Math.max(0, rest - discount);
  const q = query.trim().toLocaleLowerCase("tr-TR");
  const list = esnafList.filter((e) => !q || e.name.toLocaleLowerCase("tr-TR").includes(q));
  const confirm = () => {
    const result = handleConfirmEsnafCharge({ mode: partial ? "partial" : "full", amount: charge });
    // Masa kapandıysa yönlendirme pencereyi de kapatır; kısmi aktarımda pencereyi biz kapatırız.
    if (result === "partial") onClose();
  };
  const create = (e) => { e.preventDefault(); handleQuickCreateEsnaf(e); setQuery(""); };

  return (
    <Sheet
      onClose={onClose}
      label={partial ? "Kısmi cari aktarım" : "Adisyonu cariye yaz"}
      title={table.name}
      foot={<button type="button" className="btn btn-primary btn-lg btn-block" disabled={!picked} onClick={confirm}>{picked ? `${formatTL(charge)} · ${picked.name} carisine yaz` : "Esnaf seçin"}</button>}
    >
      <BackButton onBack={onBack} />
      <div className="form-grid">
        {esnafList.length > 6 && <input className="field-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Esnaf ara" aria-label="Esnaf ara" />}
        <div className="cari-pick" role="group" aria-label="Esnaf">
          {list.map((e) => (
            <button key={e.id} type="button" className="chip cari-chip" aria-pressed={selectedEsnafForCharge === e.id} onClick={() => setSelectedEsnafForCharge(e.id)}>
              <span>{e.name}</span>
              <span className="label">Bakiye {formatTL(e.balance)}{e.discountRate > 0 ? ` · %${e.discountRate}` : ""}</span>
            </button>
          ))}
          {list.length === 0 && <span className="label">Kayıt yok. Aşağıdan ekleyin.</span>}
        </div>
        {discountable && <SwitchRow title={`Esnaf indirimi (%${picked.discountRate})`} desc={discount > 0 ? `−${formatTL(discount)}` : "Uygulanmıyor"} checked={applyEsnafDiscount} onChange={setApplyEsnafDiscount} />}
        <Field label="Not (kim aldı?)"><input className="field-input" value={esnafOrderNote} onChange={(e) => setEsnafOrderNote(e.target.value)} placeholder="Çırak Ali aldı" /></Field>
        <form className="ops-row" onSubmit={create}>
          <input className="field-input" style={{ flex: 1, minWidth: 160 }} value={quickNewEsnafName} onChange={(e) => setQuickNewEsnafName(e.target.value)} placeholder="Listede yoksa: yeni esnaf adı" aria-label="Yeni esnaf adı" />
          <button type="submit" className="btn btn-secondary" disabled={!quickNewEsnafName.trim()}><Ic n="plus" className="ic-sm" />Ekle ve seç</button>
        </form>
      </div>
    </Sheet>
  );
}
