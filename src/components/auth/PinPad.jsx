import React from "react";
import { Ic } from "../../ui/Ic";

/**
 * Yönetici PIN'i girişi (prototipin .pin düzeni). PIN'in uzunluğu istemcide bilinmez (sunucu doğrular);
 * bu yüzden otomatik gönderim yok, "Giriş" ya da Enter ile gönderilir. Klavyeden harf de yazılabilir.
 *
 * props: onSubmit(pin) → Promise<{ok, error?, code?, retryAfter?}>, onCancel(), title, description, footer
 */
export function PinPad({ onSubmit, onSetup, onCancel, title = "Yönetici girişi", description = "", footer = null }) {
  const [pin, setPin] = React.useState("");
  // İlk kurulum: sunucuda PIN yoksa (NO_PIN) girilen PIN iki kez yazılarak kaydedilir.
  const [setupFirst, setSetupFirst] = React.useState(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!pin || busy) return;
    setBusy(true);
    setError("");
    try {
      if (setupFirst !== null) {
        if (pin !== setupFirst) {
          setError("PIN'ler eşleşmedi. Baştan girin.");
          setSetupFirst(null);
          setPin("");
          return;
        }
        if (!/^\S{4,12}$/u.test(pin)) {
          setError("PIN 4-12 karakter olmalı.");
          setSetupFirst(null);
          setPin("");
          return;
        }
        const s = await onSetup(pin);
        if (!s || !s.ok) { setError((s && s.error) || "PIN kaydedilemedi."); setSetupFirst(null); setPin(""); }
        return;
      }
      const r = await onSubmit(pin);
      if (r && r.code === "NO_PIN" && onSetup) {
        setSetupFirst(pin);
        setPin("");
        return;
      }
      if (!r || !r.ok) {
        let msg = (r && r.error) || "PIN hatalı.";
        if (r && r.code === "BAD_PIN" && Number.isFinite(r.attemptsLeft)) msg = `PIN hatalı. Kalan deneme: ${r.attemptsLeft}`;
        setError(msg);
        setPin("");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const press = (d) => { setError(""); setPin((p) => (p + d).slice(0, 12)); };
  const dots = Math.max(4, pin.length);

  return (
    <form onSubmit={submit} aria-label={title} className="pin pin-form">
      <span className="pin-lock"><Ic n="lock" className="ic-lg" /></span>
      <h2>{title}</h2>
      {setupFirst !== null
        ? <p role="status" className="pin-setup">Bu işletmenin henüz yönetici PIN'i yok. Belirlemek için aynı PIN'i tekrar girin.</p>
        : description && <p className="muted">{description}</p>}
      <label className={`pin-field${error ? " is-error" : ""}`}>
        <span className="pin-dots" aria-hidden="true">{Array.from({ length: dots }, (_, i) => <span key={i} className={`pin-dot${i < pin.length ? " is-on" : ""}`} />)}</span>
        <input
          ref={inputRef}
          type="password"
          aria-label="PIN"
          autoFocus
          autoComplete="off"
          inputMode="numeric"
          maxLength={12}
          value={pin}
          onChange={(e) => { setError(""); setPin(e.target.value.replace(/\s/g, "").slice(0, 12)); }}
        />
      </label>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <div className="pin-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="pin-key num">{d}</button>
        ))}
        <button type="button" onClick={() => { setPin(""); setError(""); }} className="pin-key is-small">Temizle</button>
        <button type="button" onClick={() => press("0")} className="pin-key num">0</button>
        <button type="submit" disabled={busy || !pin} className="pin-key is-primary">{busy ? "…" : "Giriş"}</button>
      </div>
      {footer}
      <button type="button" onClick={onCancel} className="btn btn-ghost btn-block">Vazgeç</button>
    </form>
  );
}
