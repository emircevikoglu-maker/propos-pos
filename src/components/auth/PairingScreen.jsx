import React from "react";
import { normalizeTenantCode } from "../../utils/formatters";

/**
 * Cihaz eşleştirme (bir kez): işletme kodu + bağlantı anahtarı.
 * Sunum bileşeni — ağ çağrısı onPair ile dışarıdan verilir (test edilebilir).
 *
 * props: initialTenantId, locked (kod değiştirilemez), reason (neden tekrar soruluyor),
 *        serverReachable (false → çevrimdışı uyarısı), onPair(tenantId, key) → Promise<{ok, error}>,
 *        onRetry(), onContinueOffline (varsa: yerelde veri var, çevrimdışı devam edilebilir)
 */
export function PairingScreen({ initialTenantId = "", locked = false, reason = "", serverReachable = true, onPair, onRetry, onContinueOffline }) {
  const [code, setCode] = React.useState(initialTenantId === "DEFAULT" ? "" : initialTenantId);
  const [key, setKey] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await onPair(normalizeTenantCode(code), key.trim());
      if (!r || !r.ok) setError((r && r.error) || "Bağlanılamadı.");
    } catch (err) {
      setError("Bağlanılamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#080706] p-4 overflow-y-auto">
      <form onSubmit={submit} aria-label="İşletmeye bağlan" className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-800 bg-stone-900 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400">ProPos</p>
          <h1 className="text-lg font-semibold text-white">Bu cihazı işletmenize bağlayın</h1>
          <p className="mt-1 text-sm leading-relaxed text-stone-400">
            Bir kez yapılır. Kodu ve anahtarı kurulumu yapan bayiden ya da işletme sahibinden alabilirsiniz.
          </p>
        </div>
        {reason && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{reason}</p>}
        {!serverReachable && (
          <p role="status" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Sunucuya ulaşılamıyor. İnternet ya da yerel sunucu bağlantısını kontrol edin.
          </p>
        )}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-300">İşletme kodu</span>
          <input
            value={code}
            disabled={locked}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40))}
            placeholder="Örn. KAFE-101 (ana işletme için boş)"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-3 font-mono text-sm text-white disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-300">Bağlantı anahtarı</span>
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="SYNC-XXXX-XXXX-XXXX"
            className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-3 font-mono text-sm text-white"
          />
        </label>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <button type="submit" disabled={busy || !key.trim()} className="w-full min-h-[44px] rounded-xl bg-amber-500 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50">
          {busy ? "Kontrol ediliyor…" : "Bağlan"}
        </button>
        <div className="flex gap-2">
          {!serverReachable && onRetry && (
            <button type="button" onClick={onRetry} className="flex-1 min-h-[44px] rounded-xl border border-stone-700 text-sm text-stone-200 hover:bg-stone-800">Tekrar dene</button>
          )}
          {onContinueOffline && (
            <button type="button" onClick={onContinueOffline} className="flex-1 min-h-[44px] rounded-xl border border-stone-700 text-sm text-stone-300 hover:bg-stone-800">Çevrimdışı devam et</button>
          )}
        </div>
      </form>
    </div>
  );
}

export function LicenseBlockedScreen({ message, onRetry, onUnpair }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#080706] p-4">
      <div role="alert" className="w-full max-w-sm space-y-4 rounded-2xl border border-rose-500/40 bg-stone-900 p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-400">ProPos</p>
        <h1 className="text-lg font-semibold text-white">Lisans etkin değil</h1>
        <p className="text-sm leading-relaxed text-stone-300">{message || "İşletme lisansı geçersiz. Bayinizle görüşün."}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onRetry} className="flex-1 min-h-[44px] rounded-xl bg-amber-500 text-sm font-semibold text-stone-950">Tekrar dene</button>
          {onUnpair && <button type="button" onClick={onUnpair} className="flex-1 min-h-[44px] rounded-xl border border-stone-700 text-sm text-stone-300">Başka işletme</button>}
        </div>
      </div>
    </div>
  );
}
