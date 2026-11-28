import React from "react";

/**
 * Giriş (3.9.0): kullanıcı adı + parola. Kullanıcıları kurucu kontrol panelinden ekler.
 * Sunum bileşeni — ağ çağrısı onLogin ile dışarıdan verilir (test edilebilir).
 *
 * props: reason (neden yeniden soruluyor), serverReachable (false → çevrimdışı uyarısı),
 *        onLogin(username, password) → Promise<{ok, error}>, onRetry(), onContinueOffline (yerel veri varsa)
 */
export function LoginScreen({ reason = "", serverReachable = true, onLogin, onRetry, onContinueOffline }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await onLogin(username.trim().toLowerCase(), password);
      if (!r || !r.ok) setError((r && r.error) || "Giriş yapılamadı.");
    } catch (err) {
      setError("Giriş yapılamadı.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} aria-label="Giriş yap">
        <div className="auth-brand">ProPos</div>
        <h1 className="auth-title">Giriş yap</h1>
        <p className="label">Kullanıcı adınızı ve parolanızı işletme sahibiniz ya da bayiniz verir.</p>
        {reason && <p className="auth-note" role="status">{reason}</p>}
        {!serverReachable && (
          <div className="auth-note is-warn" role="status">
            Sunucuya ulaşılamıyor. İnternet bağlantısını kontrol edin.
            {onRetry && <button type="button" className="btn btn-ghost" onClick={onRetry}>Tekrar dene</button>}
          </div>
        )}
        <label className="field">
          <span className="ops-title">Kullanıcı adı</span>
          <input className="field-input" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ornek.kasa" />
        </label>
        <label className="field">
          <span className="ops-title">Parola</span>
          <input className="field-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !username.trim() || !password}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
        {onContinueOffline && (
          <button type="button" className="btn btn-secondary btn-block" onClick={onContinueOffline}>Çevrimdışı devam et</button>
        )}
      </form>
    </div>
  );
}

/** Lisans askıda/bitmiş: uygulamanın üstünde tam ekran (veri yerelde durur, yeniden açılış lisans gelince). */
export function LicenseBlockedScreen({ message = "", onRetry, onUnpair }) {
  return (
    <div className="auth-wrap is-overlay" role="alertdialog" aria-label="Lisans etkin değil">
      <div className="card auth-card">
        <div className="auth-brand">ProPos</div>
        <h1 className="auth-title">Lisans etkin değil</h1>
        <p className="label">{message || "İşletme lisansı askıda ya da süresi dolmuş. Bayinizle görüşün."}</p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onRetry}>Tekrar dene</button>
        {onUnpair && <button type="button" className="btn btn-secondary btn-block" onClick={onUnpair}>Başka kullanıcıyla giriş</button>}
      </div>
    </div>
  );
}
