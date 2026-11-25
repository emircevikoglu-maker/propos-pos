import React from "react";

/**
 * Yönetici PIN'i girişi. PIN'in uzunluğu istemcide bilinmez (sunucu doğrular);
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

  return (
    <form onSubmit={submit} aria-label={title} className="bg-[#181512] border border-amber-500/40 rounded-2xl max-w-xs w-full p-6 space-y-4 shadow-2xl text-center">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {setupFirst !== null
          ? <p role="status" className="text-xs text-amber-300 mt-1">Bu işletmenin henüz yönetici PIN'i yok. Belirlemek için aynı PIN'i tekrar girin.</p>
          : description && <p className="text-xs text-stone-400 mt-1">{description}</p>}
      </div>
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
        className={`w-full rounded-xl border bg-stone-950 px-3 py-3 text-center font-mono text-xl tracking-[0.4em] text-white ${error ? "border-rose-500" : "border-stone-700"}`}
      />
      {error && <p role="alert" className="text-xs font-medium text-rose-400">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="min-h-[48px] rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-base font-semibold text-white active:scale-95 transition-all">{d}</button>
        ))}
        <button type="button" onClick={() => { setPin(""); setError(""); }} className="min-h-[48px] rounded-xl bg-stone-900 border border-stone-800 text-xs font-medium text-rose-400">Temizle</button>
        <button type="button" onClick={() => press("0")} className="min-h-[48px] rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-base font-semibold text-white active:scale-95 transition-all">0</button>
        <button type="submit" disabled={busy || !pin} className="min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-stone-950 disabled:opacity-50">{busy ? "…" : "Giriş"}</button>
      </div>
      {footer}
      <button type="button" onClick={onCancel} className="w-full min-h-[40px] rounded-xl bg-stone-800 text-xs font-medium text-stone-400 hover:text-white">Vazgeç</button>
    </form>
  );
}
