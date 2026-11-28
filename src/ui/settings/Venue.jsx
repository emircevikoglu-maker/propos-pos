import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { ProductOptionsEditor } from "../../components/settings/ProductOptionsEditor";
import { RecipeEditor } from "./RecipeEditor";
import { Ic } from "../Ic";
import { Card, Chips, Empty, Field, ItemRow, SwitchRow, Tag } from "../page";
import { Sheet, useSheet } from "../Sheet";

/* ───────── Masalar ve bölgeler ───────── */

function TableSheet({ onClose }) {
  const { handleSaveTable, editingTableId, newTableName, setNewTableName, newTableZone, setNewTableZone, zones } = usePos();
  return (
    <Sheet
      onClose={onClose}
      title={editingTableId ? "Masayı düzenle" : "Yeni masa"}
      foot={<button type="submit" form="table-form" className="btn btn-primary btn-lg btn-block">{editingTableId ? "Değişikliği kaydet" : "Masayı plana ekle"}</button>}
    >
      <form id="table-form" className="form-grid" onSubmit={(e) => { handleSaveTable(e); onClose(); }}>
        <Field label="Masa adı"><input className="field-input" required autoFocus value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Bahçe 6, VIP loca…" /></Field>
        <div className="field"><span className="ops-title">Bölge</span><Chips value={newTableZone} onChange={setNewTableZone} items={zones} /></div>
      </form>
    </Sheet>
  );
}

export function Tables() {
  const {
    tables, zones, handleSaveZone, newZoneName, setNewZoneName, editingZoneOldName, setEditingZoneOldName, handleDeleteZone,
    handleDeleteTable, setEditingTableId, setNewTableName, setNewTableZone
  } = usePos();
  const sheet = useSheet();
  const startNew = () => { setEditingTableId(null); setNewTableName(""); if (zones[0]) setNewTableZone(zones[0]); sheet.open("masa"); };
  const startEdit = (t) => { setEditingTableId(t.id); setNewTableName(t.name); setNewTableZone(t.zone); sheet.open("masa"); };
  return (
    <>
      <Card span={5} title="Bölgeler" aside={<span className="label">{zones.length} bölge</span>}>
        <form className="ops-row" style={{ marginBottom: 12 }} onSubmit={handleSaveZone}>
          <input className="field-input" style={{ flex: 1 }} required value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder={editingZoneOldName ? "Yeni bölge adı" : "Yeni bölge (Üst kat)"} aria-label="Bölge adı" />
          <button type="submit" className="btn btn-primary">{editingZoneOldName ? "Güncelle" : "Ekle"}</button>
        </form>
        <div className="ops-list">
          {zones.map((z) => (
            <ItemRow key={z} title={z} sub={`${tables.filter((t) => t.zone === z).length} masa`} onEdit={() => { setEditingZoneOldName(z); setNewZoneName(z); }} onDelete={() => handleDeleteZone(z)} />
          ))}
        </div>
      </Card>

      <Card span={7} title="Masalar" aside={<button type="button" className="btn btn-primary" onClick={startNew}><Ic n="plus" className="ic-sm" />Yeni masa</button>}>
        {tables.length === 0 ? <Empty icon="grid">Henüz masa yok.</Empty> : (
          <div className="ops-list">
            {tables.map((t) => (
              <ItemRow key={t.id} title={t.name} tags={<Tag tone={t.status === "occupied" ? "warning" : undefined}>{t.status === "occupied" ? "Dolu" : "Boş"}</Tag>} sub={t.zone} onEdit={() => startEdit(t)} onDelete={() => handleDeleteTable(t)} />
            ))}
          </div>
        )}
      </Card>
      {sheet.current === "masa" && <TableSheet onClose={sheet.close} />}
    </>
  );
}

/* ───────── Menü, kategoriler, reçeteler ───────── */

function ProductSheet({ onClose }) {
  const {
    handleSaveProduct, editingPrdId, newPrdName, setNewPrdName, newPrdPrice, setNewPrdPrice, newPrdEmoji, setNewPrdEmoji, newPrdBarcode, setNewPrdBarcode,
    newPrdCategory, setNewPrdCategory, categories, newPrdQuickFav, setNewPrdQuickFav, newPrdRecipe, setNewPrdRecipe, ingredients,
    newPrdOptions, setNewPrdOptions, handleSaveIngredient, newPrdAskContent, setNewPrdAskContent
  } = usePos();
  return (
    <Sheet
      onClose={onClose}
      width={560}
      title={editingPrdId ? "Ürünü düzenle" : "Yeni ürün"}
      foot={<button type="submit" form="product-form" className="btn btn-primary btn-lg btn-block">{editingPrdId ? "Güncellemeyi kaydet" : "Ürünü menüye kaydet"}</button>}
    >
      <form id="product-form" className="form-grid" onSubmit={(e) => { handleSaveProduct(e); onClose(); }}>
        <Field label="Ürün adı"><input className="field-input" required autoFocus value={newPrdName} onChange={(e) => setNewPrdName(e.target.value)} placeholder="Spanish Latte" /></Field>
        <Field label="Satış fiyatı (₺)"><input className="field-input" type="number" required min="1" inputMode="decimal" value={newPrdPrice} onChange={(e) => setNewPrdPrice(e.target.value)} placeholder="110" /></Field>
        <div className="field"><span className="ops-title">Kategori</span><Chips value={newPrdCategory} onChange={setNewPrdCategory} items={categories} /></div>
        <SwitchRow title="Favoriler kategorisinde göster" desc="Adisyon ekranında ilk kategori" checked={newPrdQuickFav} onChange={setNewPrdQuickFav} />
        <SwitchRow title="Satışta içeriği sor" desc="Dokununca doğrudan eklenmez; içerik ve not penceresi açılır" checked={!!newPrdAskContent} onChange={setNewPrdAskContent} />

        <RecipeEditor value={newPrdRecipe} onChange={setNewPrdRecipe} ingredients={ingredients} price={newPrdPrice} onCreate={(value) => handleSaveIngredient(value)} />

        <Field label="Barkod (isteğe bağlı)"><input className="field-input" inputMode="numeric" value={newPrdBarcode} onChange={(e) => setNewPrdBarcode(e.target.value.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 32))} placeholder="8690000000012" aria-label="Barkod" /></Field>
        <Field label="İkon (emoji)"><input className="field-input" style={{ width: 96 }} value={newPrdEmoji} onChange={(e) => setNewPrdEmoji(e.target.value)} /></Field>
        <ProductOptionsEditor value={newPrdOptions} onChange={setNewPrdOptions} ingredients={ingredients} />
      </form>
    </Sheet>
  );
}

export function Menu() {
  const {
    products, categories, handleSaveCategory, newCategoryName, setNewCategoryName, editingCategoryOldName, setEditingCategoryOldName, handleDeleteCategory,
    startEditProduct, handleDeleteProduct, setEditingPrdId, setNewPrdName, setNewPrdPrice, setNewPrdRecipe, setNewPrdBarcode, setNewPrdOptions, setNewPrdQuickFav, setNewPrdCategory, setNewPrdAskContent
  } = usePos();
  const sheet = useSheet();
  const startNew = () => {
    setEditingPrdId(null); setNewPrdName(""); setNewPrdPrice(""); setNewPrdRecipe([]); setNewPrdBarcode(""); setNewPrdOptions([]); setNewPrdQuickFav(false); setNewPrdAskContent(false);
    if (categories[0]) setNewPrdCategory(categories[0]);
    sheet.open("urun");
  };
  const startEdit = (p) => { startEditProduct(p); sheet.open("urun"); };
  return (
    <>
      <Card span={4} title="Kategoriler" aside={<span className="label">{categories.length} kategori</span>}>
        <form className="ops-row" style={{ marginBottom: 12 }} onSubmit={handleSaveCategory}>
          <input className="field-input" style={{ flex: 1 }} required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={editingCategoryOldName ? "Yeni kategori adı" : "Yeni kategori"} aria-label="Kategori adı" />
          <button type="submit" className="btn btn-primary">{editingCategoryOldName ? "Güncelle" : "Ekle"}</button>
        </form>
        <div className="ops-list">
          {categories.map((c) => (
            <ItemRow key={c} title={c} sub={`${products.filter((p) => p.category === c).length} ürün`} onEdit={() => { setEditingCategoryOldName(c); setNewCategoryName(c); }} onDelete={() => handleDeleteCategory(c)} />
          ))}
        </div>
      </Card>

      <Card span={8} title="Menü ürünleri" aside={<button type="button" className="btn btn-primary" onClick={startNew}><Ic n="plus" className="ic-sm" />Yeni ürün</button>}>
        {products.length === 0 ? <Empty icon="box">Menüde ürün yok.</Empty> : (
          <div className="dt-wrap">
            <table className="dt">
              <thead><tr><th>Ürün</th><th>Kategori</th><th className="r">Fiyat</th><th className="r" aria-label="İşlemler" /></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name} {p.isQuickFav && <Tag tone="primary"><Ic n="star" className="ic-sm" />Favori</Tag>}</td>
                    <td className="muted">{p.category}</td>
                    <td className="r">{formatTL(p.price)}</td>
                    <td className="r">
                      <span className="row-actions">
                        <button type="button" className="icon-btn" aria-label={`${p.name} düzenle`} onClick={() => startEdit(p)}><Ic n="note" /></button>
                        <button type="button" className="icon-btn" aria-label={`${p.name} sil`} onClick={() => handleDeleteProduct(p.id)}><Ic n="trash" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {sheet.current === "urun" && <ProductSheet onClose={sheet.close} />}
    </>
  );
}
