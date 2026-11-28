// Fiş modeli → yazdırılabilir HTML (58/80 mm). HER metin esc() ile kaçışlanır.
export const PAPER_WIDTHS = [58, 80];

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function kitchen(m) {
  const head = m.cancel ? "İPTAL" : m.reprint ? "TEKRAR" : "";
  return `<section class="k">${head ? `<div class="flag">${esc(head)}</div>` : ""}<h1>${esc(m.station)}</h1><h2>${esc(m.tableName)}</h2>
<div class="meta">${esc(when(m.time))}${m.staffName ? ` · ${esc(m.staffName)}` : ""}</div>
${m.lines.map((l) => `<div class="kl"><b>${esc(l.qty)}×</b><span>${esc(l.name)}${l.details ? `<em>${esc(l.details)}</em>` : ""}${l.note ? `<mark>${esc(l.note)}</mark>` : ""}</span></div>`).join("")}
${m.reason ? `<div class="meta">Neden: ${esc(m.reason)}</div>` : ""}</section>`;
}

function receipt(m, money) {
  const row = (label, value, cls = "") => `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;
  return `<section><h1>${esc(m.businessName)}</h1><div class="meta">${esc(m.tableName)} · ${esc(when(m.time))}${m.staffName ? ` · ${esc(m.staffName)}` : ""}</div>
<table>${m.lines.map((l) => `<tr><td>${esc(l.qty)}× ${esc(l.name)}${l.details ? `<em>${esc(l.details)}</em>` : ""}${l.note ? `<em>${esc(l.note)}</em>` : ""}</td><td class="r">${esc(money(l.amount))}</td></tr>`).join("")}</table>
<table class="sum">${m.discount > 0 || m.paid > 0 ? row("Ara toplam", money(m.subtotal)) : ""}${m.discount > 0 ? row("İndirim", `-${money(m.discount)}`) : ""}${m.paid > 0 ? row("Alınan kısmi ödeme", `-${money(m.paid)}`) : ""}${row("TOPLAM", money(m.total), "t")}${m.method ? row("Ödeme", m.method) : ""}</table>
${m.footer ? `<p class="foot">${esc(m.footer)}</p>` : ""}<p class="foot">${esc(m.disclaimer)}</p></section>`;
}

/** Bir ya da birden çok fişi tek belgeye koyar (her fiş ayrı sayfa → kesici ayrı keser). */
export function renderTickets(models, { width = 80, money = (n) => `${n} TL` } = {}) {
  const w = PAPER_WIDTHS.includes(Number(width)) ? Number(width) : 80;
  const body = (Array.isArray(models) ? models : [models]).filter(Boolean).map((m) => (m.kind === "kitchen" ? kitchen(m) : receipt(m, money))).join("");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>ProPos fiş</title><style>
@page{size:${w}mm auto;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{width:${w}mm;padding:2mm 3mm;font:${w === 58 ? 11 : 12}px/1.35 "Courier New",monospace;color:#000;background:#fff}
section{padding-bottom:6mm;break-after:page;page-break-after:always}section:last-child{break-after:auto;page-break-after:auto}
h1{font-size:15px;text-align:center}h2{font-size:18px;text-align:center}.meta{text-align:center;margin:1mm 0 2mm}
table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:.6mm 0;overflow-wrap:anywhere}.r{text-align:right;white-space:nowrap;padding-left:2mm}
em{display:block;font-style:normal;padding-left:3mm}.sum{border-top:1px dashed #000;margin-top:2mm}.t td{font-size:15px;font-weight:700}
.foot{text-align:center;margin-top:3mm}
.flag{font-size:20px;font-weight:700;text-align:center;border:2px solid #000;margin-bottom:2mm}
.kl{display:flex;gap:2mm;font-size:16px;padding:1.2mm 0;border-bottom:1px dashed #000}.kl span{flex:1;overflow-wrap:anywhere}.kl em{font-size:13px;padding:0}
mark{display:block;background:#000;color:#fff;padding:0 1mm;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style></head><body>${body}</body></html>`;
}

/**
 * Gizli iframe'e yazıp yazdırır (açılır pencere engeline takılmaz). Sessiz baskı için Chrome --kiosk-printing.
 * @returns {boolean} yazdırma başlatılabildiyse true
 */
export function printHtml(html, doc = typeof document !== "undefined" ? document : null) {
  if (!doc || !doc.body) return false;
  const frame = doc.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("data-print-frame", "");
  frame.setAttribute("sandbox", "allow-same-origin allow-modals");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  doc.querySelectorAll("iframe[data-print-frame]").forEach((f) => f.remove());
  frame.onload = () => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { /* yazdırma desteklenmiyor */ }
    setTimeout(() => frame.remove(), 60000);
  };
  frame.srcdoc = html;
  doc.body.appendChild(frame);
  return true;
}
