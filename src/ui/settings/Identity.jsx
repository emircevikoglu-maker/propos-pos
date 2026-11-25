import React from "react";
import { usePos } from "../../context/PosContext";
import { CURRENCY_OPTIONS, THEME_PRESETS } from "../../constants/initialData";
import { Ic } from "../Ic";
import { Card, Chips, Field, SwitchRow } from "../page";

const LOGO_TYPES = [["text", "Harf"], ["emoji", "Emoji"], ["image", "Görsel"]];
const EMOJIS = ["☕", "🥐", "🍔", "🍕", "🍰", "🍸", "🌿", "🔥", "👑", "💎"];

/** İşletme kimliği: ad, logo, para birimi ve vurgu rengi. Yeni tasarımda tek vurgu rengi vardır (zemin/panel tokenlardan gelir). */
export function Identity() {
  const { brandSettings, setBrandSettings, handleLogoFileUpload, showToast } = usePos();
  const set = (patch) => setBrandSettings((prev) => ({ ...prev, ...patch }));
  return (
    <>
      <Card span={7} title="İşletme adı ve logo" aside={<span className="label">Sol üstte ve başlıkta görünür</span>}>
        <div className="form-grid">
          <Field label="İşletme adı"><input className="field-input" value={brandSettings.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder="Kahve Durağı" /></Field>
          <Field label="Alt başlık"><input className="field-input" value={brandSettings.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Artisan Coffee & Bakery" /></Field>
          <Field label="Rozet etiketi"><input className="field-input" value={brandSettings.badgeText} onChange={(e) => set({ badgeText: e.target.value })} placeholder="PRO" /></Field>
          <div className="field">
            <span className="ops-title">Logo türü</span>
            <Chips value={brandSettings.logoType} onChange={(id) => set({ logoType: id })} items={LOGO_TYPES} />
          </div>
          {brandSettings.logoType === "text" && (
            <Field label="Logo harfi (1-2 karakter)"><input className="field-input" maxLength={2} value={brandSettings.logoText} onChange={(e) => set({ logoText: e.target.value.toUpperCase() })} placeholder="P" /></Field>
          )}
          {brandSettings.logoType === "emoji" && (
            <div className="field">
              <span className="ops-title">Emoji</span>
              <div className="ops-row">
                {EMOJIS.map((em) => <button key={em} type="button" className="chip" aria-pressed={brandSettings.logoEmoji === em} onClick={() => set({ logoEmoji: em })}>{em}</button>)}
                <input className="field-input" style={{ width: 90 }} value={brandSettings.logoEmoji} onChange={(e) => set({ logoEmoji: e.target.value })} aria-label="Özel emoji" />
              </div>
            </div>
          )}
          {brandSettings.logoType === "image" && (
            <div className="field">
              <span className="ops-title">Görsel logo</span>
              <div className="ops-row">
                <label className="btn btn-secondary" style={{ cursor: "pointer" }}><Ic n="plus" className="ic-sm" />Cihazdan seç<input type="file" accept="image/*" onChange={handleLogoFileUpload} hidden /></label>
              </div>
              <input className="field-input" value={brandSettings.logoImageUrl} onChange={(e) => set({ logoImageUrl: e.target.value })} placeholder="veya https://…/logo.png" aria-label="Görsel adresi" />
            </div>
          )}
        </div>
      </Card>

      <div className="span-5 col-stack">
        <Card span={12} title="Para birimi" aside={<span className="label">Tüm adisyon ve raporlar</span>}>
          <div className="ops-row">
            {Object.values(CURRENCY_OPTIONS).map((cur) => (
              <button key={cur.code} type="button" className="chip" aria-pressed={brandSettings.currency === cur.code} onClick={() => { set({ currency: cur.code }); showToast(`Para birimi ${cur.name} olarak güncellendi!`); }}>
                {cur.symbol} {cur.code}
              </button>
            ))}
          </div>
        </Card>
        <Card span={12} title="Vurgu rengi" aside={<span className="label">Düğmeler ve vurgular</span>}>
          <div className="swatches">
            {THEME_PRESETS.map((p) => (
              <button key={p.id} type="button" className="swatch" aria-pressed={brandSettings.customPrimary?.toLowerCase() === p.primary.toLowerCase()} aria-label={p.name} title={p.name}
                style={{ background: p.primary }}
                onClick={() => { set({ themeId: p.id, customPrimary: p.primary, customSecondary: p.secondary, customBg: p.bg, customPanel: p.panel }); showToast(`"${p.name}" rengi uygulandı`); }} />
            ))}
            <label className="swatch is-custom" title="Özel renk">
              <input type="color" value={brandSettings.customPrimary || "#f59e0b"} onChange={(e) => set({ themeId: "custom", customPrimary: e.target.value })} aria-label="Özel vurgu rengi" />
              <Ic n="plus" className="ic-sm" />
            </label>
          </div>
        </Card>
      </div>
    </>
  );
}

/** Kutlamalar ve hareket: yalnızca bu cihazı etkiler (senkronlanmaz). */
export function Feel() {
  const { celebration, updateCelebration } = usePos();
  const [goalText, setGoalText] = React.useState(celebration && celebration.goal ? String(celebration.goal) : "");
  if (!celebration) return null;
  const saveGoal = (e) => {
    e.preventDefault();
    const n = Number(goalText.replace(",", "."));
    updateCelebration({ goal: Number.isFinite(n) && n > 0 ? Math.round(n) : 0 });
  };
  return (
    <>
      <Card span={7} title="Kutlamalar" aside={<span className="label">Yalnızca bu cihaz</span>}>
        <p className="label" style={{ marginBottom: 6 }}>Günün ilk satışı, hedef, rekor ve Z raporunda kısa tebrik. Yoğun saatte kendiliğinden sadeleşir; POS akışını asla bloklamaz.</p>
        <SwitchRow title="Kutlamalar" desc="Kapalıyken yalnızca işlevsel bildirim" checked={celebration.enabled} onChange={(v) => updateCelebration({ enabled: v })} />
        <SwitchRow title="Yoğun saatte sadeleş" desc="10 dk'da 8+ ödeme: afişler tosta iner, konfeti yok" checked={celebration.autoSimplify} onChange={(v) => updateCelebration({ autoSimplify: v })} />
        <SwitchRow title="Ses" desc="Kısa iki nota" checked={celebration.sound} onChange={(v) => updateCelebration({ sound: v })} />
        <div className="set-row">
          <span className="set-text"><span>Hareket</span><span className="set-desc">Sistem = işletim sistemindeki "hareketi azalt" tercihi</span></span>
          <div className="seg" role="group" aria-label="Hareket">
            <button type="button" aria-pressed={celebration.motion === "auto"} onClick={() => updateCelebration({ motion: "auto" })}>Sistem</button>
            <button type="button" aria-pressed={celebration.motion === "reduce"} onClick={() => updateCelebration({ motion: "reduce" })}>Azalt</button>
          </div>
        </div>
      </Card>
      <Card span={5} title="Günlük ciro hedefi" aside={<span className="label">0 = kapalı</span>}>
        <p className="label" style={{ marginBottom: 12 }}>Üst çubukta ilerleme gösterilir, hedefe ulaşınca bir kez kutlanır.</p>
        <form className="ops-row" onSubmit={saveGoal}>
          <input className="field-input" style={{ flex: 1 }} inputMode="decimal" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="Örn. 15000" aria-label="Günlük ciro hedefi" />
          <button type="submit" className="btn btn-primary">Kaydet</button>
        </form>
      </Card>
    </>
  );
}
