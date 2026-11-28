import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { summarizeStockLog } from "../utils/stockLog";
import { Ic } from "./Ic";
import { Bar, Card, Empty, Page, Seg, Tag } from "./page";
import { useSheet } from "./Sheet";
import { IngredientSheet } from "./IngredientSheet";

const status = (ing) => (ing.stock <= 0 ? ["danger", "Tükendi"] : ing.stock <= ing.minLimit ? ["warning", "Kritik"] : ["success", "Yeterli"]);

function Ingredients({ onEdit, onNew }) {
  const { ingredients, setStockModalIng, setStockAdjustType, setStockAdjustAmount, setStockExpenseCost } = usePos();
  // Kritik olanlar başa: ilk bakışta "neye dikkat etmeli" görünür; kendi içinde ad sırası sabit.
  const list = React.useMemo(
    () => [...ingredients].sort((a, b) => (a.stock <= a.minLimit ? 0 : 1) - (b.stock <= b.minLimit ? 0 : 1) || a.name.localeCompare(b.name, "tr")),
    [ingredients]
  );
  const open = (ing) => { setStockModalIng(ing); setStockAdjustType("add"); setStockAdjustAmount(""); setStockExpenseCost(""); };
  return (
    <Card
      span={12}
      title="Malzemeler"
      aside={<span className="page-actions"><span className="label">Adisyon kapanınca reçeteye göre otomatik düşer</span><button type="button" className="btn btn-primary" onClick={onNew}><Ic n="plus" className="ic-sm" />Yeni malzeme</button></span>}
    >
      {list.length === 0 && <Empty icon="box">Henüz malzeme yok. "Yeni malzeme" ile birim ve maliyetini tanımlayın; ürün reçetelerinde kullanın.</Empty>}
      <div className="stock-grid">
        {list.map((ing) => {
          const [tone, text] = status(ing);
          return (
            <div key={ing.id} className={`stock-item${tone === "danger" ? " is-out" : tone === "warning" ? " is-low" : ""}`}>
              <div className="stock-top"><span className="stock-name">{ing.name}</span><Tag tone={tone}>{text}</Tag></div>
              <div className="stock-qty">{ing.stock}<small>{ing.unit}</small></div>
              <Bar value={ing.stock / (ing.minLimit * 2.5 || 1)} tone={tone} />
              <div className="stock-foot">
                <span className="label">Kritik {ing.minLimit} {ing.unit} · ~{ing.unitCost} ₺/{ing.unit}</span>
                <span className="row-actions">
                  <button type="button" className="icon-btn" aria-label={`${ing.name} malzemesini düzenle`} onClick={() => onEdit(ing)}><Ic n="note" /></button>
                  <button type="button" className="btn btn-secondary" onClick={() => open(ing)}><Ic n="plus" className="ic-sm" />Stok gir</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Recipes() {
  const { products, ingredients } = usePos();
  const byId = React.useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients]);
  return (
    <Card span={12} title="Reçeteler" aside={<span className="label">Satılan 1 adet için stoktan düşenler</span>}>
      <div className="dt-wrap">
        <table className="dt">
          <thead><tr><th>Ürün</th><th className="r">Satış</th><th className="r">Maliyet</th><th className="r">Brüt kâr</th><th>Düşen malzemeler</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const cost = (p.recipe || []).reduce((s, r) => s + (byId[r.ingredientId] ? byId[r.ingredientId].unitCost * r.amount : 0), 0);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="r">{formatTL(p.price)}</td>
                  <td className="r muted">{formatTL(cost)}</td>
                  <td className="r">{formatTL(p.price - cost)}</td>
                  <td className="muted">{(p.recipe || []).map((r) => `${byId[r.ingredientId]?.name || "Malzeme"} −${r.amount} ${byId[r.ingredientId]?.unit || ""}`).join(" · ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Waste() {
  const { stockLog, isAdminUnlocked } = usePos();
  const sum = React.useMemo(() => summarizeStockLog(stockLog, Date.now() - 30 * 86400000), [stockLog]);
  return (
    <Card
      span={12}
      title="Atık ve sayım kaydı"
      aside={isAdminUnlocked && (
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tag tone="warning">Atık {formatTL(sum.wasteCost)}</Tag>
          <Tag tone="warning">Sayım eksiği {formatTL(Math.abs(sum.shortageCost))}</Tag>
          <Tag tone="success">Sayım fazlası {formatTL(sum.surplusCost)}</Tag>
        </span>
      )}
    >
      {!stockLog || stockLog.length === 0 ? (
        <Empty icon="note">Henüz kayıt yok. Malzeme kartından "Stok gir" ile zayi ya da sayım kaydı yapın; her işlem burada görünür.</Empty>
      ) : (
        <div className="dt-wrap">
          <table className="dt">
            <thead><tr><th>Zaman</th><th>Malzeme</th><th>Tür</th><th className="r">Miktar</th><th>Sebep</th>{isAdminUnlocked && <th className="r">Maliyet</th>}</tr></thead>
            <tbody>
              {stockLog.slice(0, 50).map((e) => (
                <tr key={e.id}>
                  <td className="muted">{new Date(e.timestamp).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{e.name}</td>
                  <td>{e.kind === "waste" ? "Zayi" : "Sayım"}</td>
                  <td className="r">{e.amount > 0 && e.kind === "count" ? "+" : ""}{e.amount} {e.unit}</td>
                  <td className="muted">{e.reason}</td>
                  {isAdminUnlocked && <td className="r">{formatTL(e.cost)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function StockView() {
  const { criticalIngredients, ingredients, products, stockLog, requireAdmin } = usePos();
  const [tab, setTab] = React.useState("items");
  const sheet = useSheet();
  const [editing, setEditing] = React.useState(null); // düzenlenen malzemenin kimliği (null = yeni)
  const openSheet = (ing) => { if (!requireAdmin()) return; setEditing(ing ? ing.id : null); sheet.open("malzeme"); };
  return (
    <Page
      label="Hammadde ve reçete"
      title="Stok"
      actions={criticalIngredients.length > 0
        ? <Tag tone="warning"><Ic n="flag" className="ic-sm" />{criticalIngredients.length} malzeme kritik</Tag>
        : <Tag tone="success"><Ic n="check" className="ic-sm" />Stok yeterli</Tag>}
    >
      {criticalIngredients.length > 0 && (
        <div className="span-12">
          <div className="alert">
            <span className="alert-ic"><Ic n="zap" /></span>
            <div>
              <div className="alert-title">Tedarik gerekiyor</div>
              <div className="alert-text">{criticalIngredients.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(" · ")}</div>
            </div>
          </div>
        </div>
      )}
      <div className="toolbar">
        <Seg label="Stok bölümü" value={tab} onChange={setTab} items={[["items", "Malzemeler", ingredients.length], ["recipes", "Reçeteler", products.length], ["waste", "Atık ve sayım", (stockLog || []).length]]} />
      </div>
      {tab === "items" && <Ingredients onEdit={openSheet} onNew={() => openSheet(null)} />}
      {tab === "recipes" && <Recipes />}
      {tab === "waste" && <Waste />}
      {sheet.current === "malzeme" && <IngredientSheet ingredient={ingredients.find((i) => i.id === editing) || null} onClose={sheet.close} />}
    </Page>
  );
}
