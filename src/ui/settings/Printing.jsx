import React from "react";
import { usePos } from "../../context/PosContext";
import { STATIONS, NO_STATION, stationFor } from "../../print/model";
import { PAPER_WIDTHS } from "../../print/render";
import { Card, Chips, Empty, Field, SwitchRow } from "../page";
import { Ic } from "../Ic";

/** Yazdırma: cihaza özel ayarlar solda, işletme geneli istasyon eşlemesi sağda. */
export function Printing() {
  const { brandSettings, setBrandSettings, categories, printDevice, updatePrintDevice, printTestTicket } = usePos();
  const printing = brandSettings.printing || {};
  const set = (patch) => setBrandSettings((prev) => ({ ...prev, printing: { ...(prev.printing || {}), ...patch } }));
  return (
    <>
      <Card span={5} title="Bu cihaz" aside={<span className="label">Senkronlanmaz</span>}>
        <div className="form-grid">
          <div className="field">
            <span className="ops-title">Kağıt genişliği</span>
            <Chips value={printDevice.width} onChange={(width) => updatePrintDevice({ width })} items={PAPER_WIDTHS.map((w) => [w, `${w} mm`])} />
          </div>
          <div>
            <SwitchRow title="Gönderince fiş yazdır" desc="Mutfak/bar fişi; iptaller de basılır" checked={printDevice.autoKitchen} onChange={(autoKitchen) => updatePrintDevice({ autoKitchen })} />
            <SwitchRow title="Ödemeden sonra adisyon yazdır" desc="Ödeme penceresinden de açılıp kapanır" checked={printDevice.receiptAfterPay} onChange={(receiptAfterPay) => updatePrintDevice({ receiptAfterPay })} />
          </div>
          <button type="button" className="btn btn-secondary" onClick={printTestTicket}><Ic n="receipt" className="ic-sm" />Deneme fişi yazdır</button>
          <p className="label">Tarayıcı yazdırma penceresi açılır. Kasada sessiz basmak için Chrome kısayoluna <span className="num">--kiosk-printing</span> ekleyin ve fiş yazıcısını varsayılan yapın. Bu fişler mali belge değildir.</p>
        </div>
      </Card>

      <div className="span-7 col-stack">
        <Card span={12} title="Kategori → istasyon" aside={<span className="label">Tüm cihazlar</span>}>
          {categories.length === 0 ? <Empty icon="box">Henüz kategori yok.</Empty> : (
            <div className="ops-list">
              {categories.map((c) => (
                <div className="set-row" key={c}>
                  <span className="set-text"><span>{c}</span></span>
                  <div className="seg" role="group" aria-label={`${c} istasyonu`}>
                    {[...STATIONS, NO_STATION].map((s) => (
                      <button key={s} type="button" aria-pressed={stationFor(c, printing.stations) === s} onClick={() => set({ stations: { ...(printing.stations || {}), [c]: s } })}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card span={12} title="Adisyon alt bilgisi">
          <Field label="Her adisyonun altında yazar">
            <input className="field-input" maxLength={120} value={printing.footer || ""} onChange={(e) => set({ footer: e.target.value })} placeholder="Afiyet olsun · Wi-Fi: …" />
          </Field>
        </Card>
      </div>
    </>
  );
}
