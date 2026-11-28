import React from "react";
import { sendFeedback } from "../../services/apiService";
import { Sheet } from "../../ui/Sheet";

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
    <Sheet
      onClose={() => setOpen(false)}
      title="Geri bildirim"
      foot={<button type="submit" form="feedback-form" disabled={state === "busy" || state === "done"} className="btn btn-primary btn-lg btn-block">{state === "busy" ? "Gönderiliyor…" : "Gönder"}</button>}
    >
      <form id="feedback-form" onSubmit={submit} className="form-grid">
        <p className="label">Bu ekranda ne sorun? Tek dokunuş yeter; isterseniz kısa not ekleyin.</p>
        <div className="ops-row" role="group" aria-label="Tür">
          {FEEDBACK_KINDS.map(([k, label]) => (
            <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>
          ))}
        </div>
        <textarea className="field-input field-area" value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} rows={3} placeholder="Kısa not (isteğe bağlı)" aria-label="Not" />
        {state === "error" && <p role="alert" className="auth-error">Gönderilemedi. Bağlantıyı kontrol edip tekrar deneyin.</p>}
        {state === "done" && <p role="status" className="label">Teşekkürler, kaydedildi.</p>}
      </form>
    </Sheet>
  );
}
