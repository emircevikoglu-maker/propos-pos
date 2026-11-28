import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { DAY_NAMES, KINDS, SCOPES, isActiveAt, validateCampaign } from "../../utils/campaigns";
import { parseDecimal } from "../../utils/ingredients";
import { Card, Chips, Empty, Field, ItemRow, SwitchRow, Tag } from "../page";
import { Sheet, useSheet } from "../Sheet";
import { Ic } from "../Ic";

const blank = () => ({ id: `cmp-${Date.now().toString(36)}`, name: "", active: true, days: [1, 2, 3, 4, 5, 6, 7], from: "15:00", to: "17:00", scope: "all", targets: [], kind: "percent", value: "20" });

const valueText = (c) => (c.kind === "percent" ? `%${c.value} indirim` : c.kind === "amount" ? `${formatTL(c.value)} indirim` : `sabit ${formatTL(c.value)}`);
const dayText = (days) => (days.length === 7 ? "Her gün" : days.map((d) => DAY_NAMES[d - 1]).join(", "));
const timeText = (c) => (c.from === c.to ? "tüm gün" : `${c.from}–${c.to}`);

function CampaignSheet({ initial, isNew, onClose, onSave }) {
  const { categories, products } = usePos();
  const [form, setForm] = React.useState(initial);
  const [errors, setErrors] = React.useState([]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, v) => set({ [key]: form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v] });
  const submit = (e) => {
    e.preventDefault();
    const clean = { ...form, name: form.name.trim().slice(0, 40), value: parseDecimal(form.value), days: [...form.days].sort((a, b) => a - b) };
    const problems = validateCampaign(clean);
    if (problems.length) { setErrors(problems); return; }
    onSave(clean);
    onClose();
  };
  return (
    <Sheet onClose={onClose} width={560} label="Kampanya / happy hour" title={isNew ? "Yeni kampanya" : "Kampanyayı düzenle"}
      foot={<button type="submit" form="campaign-form" className="btn btn-primary btn-lg btn-block">Kaydet</button>}>
      <form id="campaign-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Ad (adisyonda görünür)"><input className="field-input" autoFocus maxLength={40} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Happy hour" /></Field>
        <div className="field"><span className="ops-title">İndirim türü</span><Chips value={form.kind} onChange={(kind) => set({ kind })} items={KINDS} /></div>
        <Field label={form.kind === "percent" ? "Yüzde" : form.kind === "amount" ? "İndirim tutarı (₺)" : "Kampanya fiyatı (₺, çeşit farkı eklenir)"}>
          <input className="field-input" inputMode="decimal" value={form.value} onChange={(e) => set({ value: e.target.value })} />
        </Field>
        <div className="field">
          <span className="ops-title">Günler</span>
          <div className="ops-row" role="group" aria-label="Günler">
            {DAY_NAMES.map((d, i) => <button key={d} type="button" className="chip" aria-pressed={form.days.includes(i + 1)} onClick={() => toggle("days", i + 1)}>{d}</button>)}
          </div>
        </div>
        <div className="field-pair">
          <Field label="Başlangıç"><input className="field-input" type="time" value={form.from} onChange={(e) => set({ from: e.target.value })} /></Field>
          <Field label="Bitiş (aynıysa tüm gün)"><input className="field-input" type="time" value={form.to} onChange={(e) => set({ to: e.target.value })} /></Field>
        </div>
        <div className="field"><span className="ops-title">Kapsam</span><Chips value={form.scope} onChange={(scope) => set({ scope, targets: [] })} items={SCOPES} /></div>
        {form.scope !== "all" && (
          <div className="ops-row" role="group" aria-label={form.scope === "category" ? "Kategoriler" : "Ürünler"}>
            {(form.scope === "category" ? categories.map((c) => [c, c]) : products.map((p) => [p.id, p.name])).map(([id, name]) => (
              <button key={id} type="button" className="chip" aria-pressed={form.targets.includes(id)} onClick={() => toggle("targets", id)}>{name}</button>
            ))}
          </div>
        )}
        {errors.length > 0 && <div role="alert">{errors.map((e) => <p key={e} className="field-error">{e}</p>)}</div>}
      </form>
    </Sheet>
  );
}

export function Campaigns() {
  const { brandSettings, setBrandSettings } = usePos();
  const list = Array.isArray(brandSettings.campaigns) ? brandSettings.campaigns : [];
  const sheet = useSheet();
  const [editing, setEditing] = React.useState(null);
  const write = (fn) => setBrandSettings((prev) => ({ ...prev, campaigns: fn(Array.isArray(prev.campaigns) ? prev.campaigns : []) }));
  const open = (c) => { setEditing(c ? { form: { ...c, value: String(c.value) }, isNew: false } : { form: blank(), isNew: true }); sheet.open("kampanya"); };
  const save = (c) => write((all) => (all.some((x) => x.id === c.id) ? all.map((x) => (x.id === c.id ? c : x)) : [...all, c]));
  return (
    <>
      <Card span={12} title="Kampanyalar ve happy hour" aside={<button type="button" className="btn btn-primary" onClick={() => open(null)}><Ic n="plus" className="ic-sm" />Yeni kampanya</button>}>
        <p className="label" style={{ marginBottom: 12 }}>Ürün adisyona eklenirken geçerli en uygun kampanya uygulanır (kampanyalar birikmez). Kampanya bitse de açık adisyondaki fiyat değişmez. Saat bu cihazın saatidir.</p>
        {list.length === 0 ? <Empty icon="zap">Henüz kampanya yok. Örnek: hafta içi 15:00–17:00 soğuk içecekler %20.</Empty> : (
          <div className="ops-list">
            {list.map((c) => (
              <div key={c.id}>
                <ItemRow title={c.name} name={c.name}
                  tags={c.active === false ? <Tag>Kapalı</Tag> : isActiveAt(c) ? <Tag tone="success">Şu an geçerli</Tag> : <Tag tone="primary">Zamanı bekliyor</Tag>}
                  sub={`${valueText(c)} · ${dayText(c.days)} · ${timeText(c)} · ${c.scope === "all" ? "tüm menü" : `${c.targets.length} ${c.scope === "category" ? "kategori" : "ürün"}`}`}
                  onEdit={() => open(c)} onDelete={() => write((all) => all.filter((x) => x.id !== c.id))} />
                <SwitchRow title={`${c.name}: etkin`} checked={c.active !== false} onChange={(active) => save({ ...c, active })} />
              </div>
            ))}
          </div>
        )}
      </Card>
      {sheet.current === "kampanya" && editing && <CampaignSheet initial={editing.form} isNew={editing.isNew} onClose={sheet.close} onSave={save} />}
    </>
  );
}
