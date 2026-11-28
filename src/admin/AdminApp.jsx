import React from "react";
import * as api from "./adminApi";
import {
  PLANS, STATUSES, normalizeCode, validateTenantForm, extendExpiry, licenseBadge, formatBytes, formatRev
} from "./validation";

const TONE = {
  ok: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-300 border-rose-500/30"
};

const inputCls = "w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-amber-500";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 min-h-[40px] text-sm font-medium transition-colors disabled:opacity-50";
const btnPrimary = `${btn} bg-amber-500 text-stone-950 hover:bg-amber-400`;
const btnGhost = `${btn} border border-stone-700 text-stone-200 hover:bg-stone-800`;
const btnDanger = `${btn} border border-rose-500/40 text-rose-300 hover:bg-rose-500/10`;

export function LoginScreen({ onLogin }) {
  const [key, setKey] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onLogin(key.trim());
    } catch (err) {
      setError(err.code === "RATE_LIMIT" ? `Çok fazla deneme. ${err.retryAfter || 30} sn sonra tekrar deneyin.` : err.message);
    } finally {
      setBusy(false);
      setKey("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-800 bg-stone-900 p-6" aria-label="Kontrol paneli girişi">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400">ProPos</p>
          <h1 className="text-lg font-semibold text-white">Kontrol Paneli</h1>
          <p className="mt-1 text-sm text-stone-400">Bayi ve lisans yönetimi. Yalnızca kurucu anahtarıyla girilir.</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-300">Kurucu anahtarı</span>
          <input type="password" autoComplete="current-password" autoFocus value={key} onChange={(e) => setKey(e.target.value)} className={`${inputCls} font-mono`} placeholder="PROPOS-XXXX-XXXX-XXXX" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
        <button type="submit" disabled={busy || !key.trim()} className={`${btnPrimary} w-full`}>{busy ? "Kontrol ediliyor…" : "Giriş"}</button>
      </form>
    </div>
  );
}

const emptyForm = () => ({
  tenantId: "", businessName: "", ownerName: "", phone: "", note: "",
  planType: "yearly", status: "active", expiresAt: extendExpiry("unlimited", 365), initialPin: "", currency: "TRY"
});

export function TenantEditor({ initial, onSave, onClose }) {
  const isNew = !initial;
  const [form, setForm] = React.useState(() => (initial
    ? { ...emptyForm(), ...initial, expiresAt: initial.expiresAt === "unlimited" ? "unlimited" : String(initial.expiresAt || "").slice(0, 10), initialPin: "" }
    : emptyForm()));
  const [touched, setTouched] = React.useState(false);
  const [serverError, setServerError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const errors = validateTenantForm(form, { isNew });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    setServerError("");
    try {
      const payload = { ...form, mustBeNew: isNew };
      if (!payload.initialPin) delete payload.initialPin;
      await onSave(payload);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, input) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-300">{label}</span>
      {input}
      {touched && errors[k] && <span className="block text-xs text-rose-400">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={isNew ? "Yeni işletme" : "İşletmeyi düzenle"}>
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-stone-800 bg-stone-900 p-5">
        <h2 className="text-base font-semibold text-white">{isNew ? "Yeni işletme" : `${initial.businessName} — düzenle`}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("tenantId", "İşletme kodu", (
            <input value={form.tenantId} disabled={!isNew} onChange={(e) => setForm((f) => ({ ...f, tenantId: normalizeCode(e.target.value) }))} className={`${inputCls} font-mono disabled:opacity-60`} placeholder="KAFE-101" />
          ))}
          {field("businessName", "İşletme adı", <input value={form.businessName} onChange={set("businessName")} className={inputCls} placeholder="Örn. Kahve Durağı" />)}
          {field("ownerName", "Yetkili", <input value={form.ownerName} onChange={set("ownerName")} className={inputCls} />)}
          {field("phone", "Telefon", <input value={form.phone} onChange={set("phone")} className={inputCls} inputMode="tel" />)}
          {field("planType", "Paket", (
            <select value={form.planType} onChange={set("planType")} className={inputCls}>
              {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          ))}
          {field("status", "Durum", (
            <select value={form.status} onChange={set("status")} className={inputCls}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          ))}
        </div>
        {field("expiresAt", "Lisans bitişi", (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={form.expiresAt === "unlimited" ? "" : form.expiresAt} disabled={form.expiresAt === "unlimited"} onChange={set("expiresAt")} className={`${inputCls} max-w-[11rem]`} />
              <label className="inline-flex items-center gap-2 text-sm text-stone-300">
                <input type="checkbox" checked={form.expiresAt === "unlimited"} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.checked ? "unlimited" : extendExpiry("unlimited", 30) }))} />
                Sınırsız
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {[30, 90, 365].map((d) => (
                <button key={d} type="button" className={btnGhost} onClick={() => setForm((f) => ({ ...f, expiresAt: extendExpiry(f.expiresAt, d) }))}>+{d} gün</button>
              ))}
            </div>
          </div>
        ))}
        {field("initialPin", isNew ? "Yönetici PIN'i" : "Yönetici PIN'ini sıfırla (boş bırakılırsa değişmez)", (
          <input type="password" autoComplete="new-password" value={form.initialPin} onChange={set("initialPin")} className={`${inputCls} font-mono`} placeholder="4-12 karakter" />
        ))}
        {field("note", "Not", <textarea value={form.note} onChange={set("note")} rows={2} className={inputCls} />)}
        {serverError && <p role="alert" className="text-sm text-rose-400">{serverError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={`${btnPrimary} flex-1`}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
          <button type="button" onClick={onClose} className={btnGhost}>Vazgeç</button>
        </div>
      </form>
    </div>
  );
}

/** İki adımlı onay: geri alınamayan işlemler için. */
function ConfirmButton({ label, confirmLabel, onConfirm, className = btnDanger }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed
    ? <button type="button" className={className} onClick={() => { setArmed(false); onConfirm(); }}>{confirmLabel}</button>
    : <button type="button" className={btnGhost} onClick={() => setArmed(true)}>{label}</button>;
}

const ROLES = { owner: "Sahip", staff: "Çalışan" };

/** 3.9.0: işletmenin kullanıcıları (kullanıcı adı + parola ile POS girişi). Parola hiç gösterilmez/geri okunmaz. */
export function UsersCell({ tenant, run }) {
  const empty = { username: "", password: "", displayName: "", role: "staff" };
  const [form, setForm] = React.useState(null); // null: kapalı; {mode:"new"|"reset", ...}
  const users = tenant.users || [];
  const save = (payload, msg) => run(api.saveUser({ tenantId: tenant.tenantId, ...payload }), msg).then(() => setForm(null)).catch(() => {});
  const submit = (e) => {
    e.preventDefault();
    const { mode, ...u } = form;
    save(u, mode === "new" ? `${u.username} eklendi.` : `${u.username}: parola değişti, açık oturumları düştü.`);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-stone-300">Kullanıcılar ({users.length})</span>
        <button type="button" className={btnGhost} onClick={() => setForm({ mode: "new", ...empty })}>+ Kullanıcı</button>
      </div>
      {users.length === 0 && <p className="text-xs text-stone-500">Kullanıcı yok: bu işletmeye kimse giriş yapamaz.</p>}
      {users.map((u) => (
        <div key={u.username} className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-800 px-3 py-2" data-testid={`user-${u.username}`}>
          <span className="font-mono text-xs text-stone-200">{u.username}</span>
          {u.displayName && <span className="text-xs text-stone-400">{u.displayName}</span>}
          <span className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-300">{ROLES[u.role] || u.role}</span>
          {!u.active && <span className={`rounded-full border px-2 py-0.5 text-xs ${TONE.danger}`}>Kapalı</span>}
          <span className="text-xs text-stone-500">{u.lastLoginAt ? `Son giriş ${new Date(u.lastLoginAt).toLocaleString("tr-TR")}` : "Hiç giriş yok"}</span>
          <span className="ml-auto flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={() => setForm({ mode: "reset", username: u.username, displayName: u.displayName, role: u.role, active: u.active, password: "" })}>Parola</button>
            <button type="button" className={btnGhost} onClick={() => save({ username: u.username, displayName: u.displayName, role: u.role, active: !u.active }, u.active ? `${u.username} kapatıldı.` : `${u.username} açıldı.`)}>{u.active ? "Kapat" : "Aç"}</button>
            <ConfirmButton label="Sil" confirmLabel="Kullanıcıyı sil" onConfirm={() => run(api.deleteUser(u.username), `${u.username} silindi.`).catch(() => {})} />
          </span>
        </div>
      ))}
      {form && (
        <form onSubmit={submit} className="grid gap-2 rounded-lg border border-stone-700 p-3 sm:grid-cols-2" aria-label={form.mode === "new" ? "Yeni kullanıcı" : "Parola değiştir"}>
          <input className={inputCls} placeholder="kullanici.adi" aria-label="Kullanıcı adı" value={form.username} disabled={form.mode !== "new"} autoCapitalize="none"
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
          <input className={inputCls} type="password" autoComplete="new-password" placeholder="Parola (en az 8)" aria-label="Parola" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {form.mode === "new" && (
            <>
              <input className={inputCls} placeholder="Görünen ad (isteğe bağlı)" aria-label="Görünen ad" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              <select className={inputCls} aria-label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary} disabled={form.password.length < 8 || (form.mode === "new" && form.username.trim().length < 3)}>Kaydet</button>
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>Vazgeç</button>
          </div>
        </form>
      )}
    </div>
  );
}

function TenantsView({ notify }) {
  const [tenants, setTenants] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState(undefined); // undefined: kapalı, null: yeni, obj: düzenle
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    api.listTenants().then(setTenants).catch((e) => setError(e.message));
  }, []);
  React.useEffect(load, [load]);

  const run = (p, okMsg) => p.then((out) => { if (out && out.tenants) setTenants(out.tenants); if (okMsg) notify(okMsg); return out; })
    .catch((e) => { notify(e.message); throw e; });

  const q = query.trim().toLocaleLowerCase("tr-TR");
  const visible = (tenants || []).filter((t) => !q || `${t.tenantId} ${t.businessName} ${t.ownerName || ""}`.toLocaleLowerCase("tr-TR").includes(q));
  const counts = (tenants || []).reduce((acc, t) => { acc[licenseBadge(t).tone] += 1; return acc; }, { ok: 0, warn: 0, danger: 0 });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara: kod, işletme, yetkili" className={`${inputCls} max-w-xs`} aria-label="İşletme ara" />
        <button type="button" className={btnPrimary} onClick={() => setEditing(null)}>+ Yeni işletme</button>
        <span className="ml-auto text-sm text-stone-400">
          {tenants ? `${tenants.length} işletme · ${counts.warn} yakında bitiyor · ${counts.danger} sorunlu` : "Yükleniyor…"}
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      <div className="space-y-2">
        {visible.map((t) => {
          const badge = licenseBadge(t);
          return (
            <article key={t.tenantId} className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/70 p-4" data-testid={`tenant-${t.tenantId}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-white">{t.businessName}</h3>
                  <p className="text-xs text-stone-400"><span className="font-mono text-stone-300">{t.displayCode || t.tenantId}</span>{t.ownerName ? ` · ${t.ownerName}` : ""}{t.phone ? ` · ${t.phone}` : ""}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${TONE[badge.tone]}`}>{badge.label}</span>
                <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-300">{PLANS[t.planType] || t.planType}</span>
              </div>
              <p className="text-xs text-stone-400">Son senkron: {formatRev(t.stats && t.stats.rev)} · Veri: {formatBytes(t.stats && t.stats.bytes)}{t.note ? ` · ${t.note}` : ""}</p>
              <UsersCell tenant={t} run={run} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => setEditing(t)}>Düzenle</button>
                {t.expiresAt !== "unlimited" && (
                  <button type="button" className={btnGhost} onClick={() => run(api.saveTenant({ ...t, expiresAt: extendExpiry(t.expiresAt, 30), status: "active" }), "Lisans 30 gün uzatıldı.").catch(() => {})}>+30 gün</button>
                )}
                <button type="button" className={btnGhost} onClick={() => run(api.saveTenant({ ...t, status: t.status === "suspended" ? "active" : "suspended" }), t.status === "suspended" ? "Etkinleştirildi." : "Askıya alındı.").catch(() => {})}>
                  {t.status === "suspended" ? "Etkinleştir" : "Askıya al"}
                </button>
                <button type="button" className={btnGhost} onClick={() => api.downloadPackage(t.tenantId, t.businessName).catch((e) => notify(e.message))}>Kurulum paketi</button>
                {t.tenantId !== "DEFAULT" && (
                  <ConfirmButton label="Sil" confirmLabel="Kaydı sil (veri yedeğe taşınır)" onConfirm={() => run(api.deleteTenant(t.tenantId), "Kayıt silindi.").catch(() => {})} />
                )}
              </div>
            </article>
          );
        })}
        {tenants && visible.length === 0 && <p className="text-sm text-stone-400">Eşleşen işletme yok.</p>}
      </div>
      {editing !== undefined && (
        <TenantEditor
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSave={(payload) => run(api.saveTenant(payload), "Kaydedildi.").then(() => setEditing(undefined))}
        />
      )}
    </section>
  );
}

function AuditView() {
  const [lines, setLines] = React.useState(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => { api.fetchAudit().then(setLines).catch((e) => setError(e.message)); }, []);
  if (error) return <p role="alert" className="text-sm text-rose-400">{error}</p>;
  if (!lines) return <p className="text-sm text-stone-400">Yükleniyor…</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-900 text-stone-400"><tr><th className="p-2 font-medium">Zaman</th><th className="p-2 font-medium">IP</th><th className="p-2 font-medium">Olay</th><th className="p-2 font-medium">Ayrıntı</th></tr></thead>
        <tbody>
          {lines.map((l, i) => {
            const [ts, ip, action, detail] = String(l).split("\t");
            return (
              <tr key={i} className={`border-t border-stone-800 ${/fail|license/.test(action || "") ? "text-rose-300" : "text-stone-300"}`}>
                <td className="whitespace-nowrap p-2">{ts ? new Date(ts).toLocaleString("tr-TR") : ""}</td>
                <td className="p-2 font-mono">{ip}</td>
                <td className="p-2 font-mono">{action}</td>
                <td className="p-2">{detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = React.useState(() => !!api.getToken());
  const [tab, setTab] = React.useState("tenants");
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    const out = () => setAuthed(false);
    window.addEventListener("propos-control-logout", out);
    return () => window.removeEventListener("propos-control-logout", out);
  }, []);
  React.useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!authed) return <LoginScreen onLogin={(key) => api.login(key).then(() => setAuthed(true))} />;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400">ProPos</p>
          <h1 className="text-lg font-semibold text-white">Kontrol Paneli</h1>
        </div>
        <nav className="flex gap-1 rounded-lg border border-stone-800 p-1" aria-label="Bölümler">
          {[["tenants", "İşletmeler"], ["audit", "Denetim kaydı"]].map(([k, v]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-3 min-h-[36px] text-sm ${tab === k ? "bg-stone-800 text-white" : "text-stone-400 hover:text-white"}`}>{v}</button>
          ))}
        </nav>
        <button type="button" className={btnGhost} onClick={() => { api.clearToken(); setAuthed(false); }}>Çıkış</button>
      </header>
      {tab === "tenants" ? <TenantsView notify={setToast} /> : <AuditView />}
      {toast && <div role="status" className="fixed bottom-4 right-4 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 shadow-xl">{toast}</div>}
    </div>
  );
}
