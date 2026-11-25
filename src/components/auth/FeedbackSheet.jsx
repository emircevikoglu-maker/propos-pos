import React from "react";
import { sendFeedback } from "../../services/apiService";

export const FEEDBACK_KINDS = [["confusing", "Kafa karıştırıcı"], ["slow", "Yavaş"], ["bug", "Hata var"], ["idea", "Öneri"]];

/** Çalışan tek dokunuşla "burası kafa karıştırıcı" der; kayıt sunucuda denetim günlüğüne düşer. Menüden açılır (POS akışını bölmez). */
export function FeedbackSheet({ tenantId, screen }) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState("confusing");
  const [text, setText] = React.useState("");
  const [state, setState] = React.useState("idle"); // idle | busy | done | error
  React.useEffect(() => {
    const on = () => { setOpen(true); setState("idle"); };
    window.addEventListener("propos-open-feedback", on);
    return () => window.removeEventListener("propos-open-feedback", on);
  }, []);
  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault();
    setState("busy");
    const r = await sendFeedback(tenantId, { kind, text: text.trim(), screen });
    if (r.ok) { setState("done"); setText(""); setTimeout(() => setOpen(false), 1200); } else setState("error");
  };
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Geri bildirim">
      <form onSubmit={submit} className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-stone-800 bg-[#181512] p-5 space-y-3">
        <h3 className="text-base font-semibold text-white">Geri bildirim</h3>
        <p className="text-xs text-stone-400">Bu ekranda ne sorun? Tek dokunuş yeter; isterseniz kısa not ekleyin.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tür">
          {FEEDBACK_KINDS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              className={`min-h-[44px] px-3 rounded-xl border text-sm ${kind === k ? "border-amber-500 bg-amber-500/15 text-amber-200" : "border-stone-700 bg-stone-900 text-stone-200"}`}>{label}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} rows={3} placeholder="Kısa not (isteğe bağlı)" aria-label="Not"
          className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-white" />
        {state === "error" && <p role="alert" className="text-xs text-rose-400">Gönderilemedi. Bağlantıyı kontrol edip tekrar deneyin.</p>}
        {state === "done" && <p role="status" className="text-xs text-emerald-400">Teşekkürler, kaydedildi.</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={state === "busy" || state === "done"} className="btn btn-primary flex-1" style={{ minHeight: 44 }}>{state === "busy" ? "Gönderiliyor…" : "Gönder"}</button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary" style={{ minHeight: 44 }}>Kapat</button>
        </div>
      </form>
    </div>
  );
}
