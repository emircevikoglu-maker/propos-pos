import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL } from "../../utils/formatters";
import { Ic } from "../Ic";
import { Card, Empty, Field, ItemRow, Tag } from "../page";
import { Sheet, useSheet } from "../Sheet";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

function StaffSheet({ onClose }) {
  const { handleSaveStaff, editingStaffId, newStaffName, setNewStaffName, newStaffRole, setNewStaffRole, newStaffColor, setNewStaffColor } = usePos();
  return (
    <Sheet
      onClose={onClose}
      title={editingStaffId ? "Çalışanı düzenle" : "Yeni çalışan"}
      foot={<button type="submit" form="staff-form" className="btn btn-primary btn-lg btn-block">{editingStaffId ? "Bilgileri güncelle" : "Çalışanı ekibe ekle"}</button>}
    >
      <form id="staff-form" className="form-grid" onSubmit={(e) => { handleSaveStaff(e); onClose(); }}>
        <Field label="Ad soyad"><input className="field-input" required autoFocus value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Zeynep Kaya" /></Field>
        <Field label="Görev"><input className="field-input" required value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} placeholder="Baş barista, servis, kasa…" /></Field>
        <div className="field">
          <span className="ops-title">Etiket rengi</span>
          <div className="swatches">
            {COLORS.map((c) => <button key={c} type="button" className="swatch" aria-pressed={newStaffColor === c} aria-label={`Renk ${c}`} style={{ background: c }} onClick={() => setNewStaffColor(c)} />)}
          </div>
        </div>
      </form>
    </Sheet>
  );
}

export function Staff() {
  const { staffList, handleDeleteStaff, setEditingStaffId, setNewStaffName, setNewStaffRole, setNewStaffColor } = usePos();
  const sheet = useSheet();
  const startNew = () => { setEditingStaffId(null); setNewStaffName(""); setNewStaffRole("Barista"); setNewStaffColor(COLORS[0]); sheet.open("calisan"); };
  const startEdit = (s) => { setEditingStaffId(s.id); setNewStaffName(s.name); setNewStaffRole(s.role); setNewStaffColor(s.color); sheet.open("calisan"); };
  return (
    <>
      <Card span={12} title="Ekip" aside={<button type="button" className="btn btn-primary" onClick={startNew}><Ic n="plus" className="ic-sm" />Yeni çalışan</button>}>
        {staffList.length === 0 ? <Empty icon="users">Henüz çalışan yok.</Empty> : (
          <div className="ops-list">
            {staffList.map((s) => (
              <ItemRow key={s.id} lead={<span className="avatar" style={{ background: s.color, color: "#1a1206" }}>{s.avatar}</span>} title={s.name} sub={s.role} onEdit={() => startEdit(s)} onDelete={() => handleDeleteStaff(s.id)} />
            ))}
          </div>
        )}
      </Card>
      {sheet.current === "calisan" && <StaffSheet onClose={sheet.close} />}
    </>
  );
}

function CariSheet({ onClose }) {
  const {
    handleSaveEsnafEdit, editingEsnafId, editEsnafName, setEditEsnafName, editEsnafShopType, setEditEsnafShopType,
    editEsnafDiscount, setEditEsnafDiscount, editEsnafPhone, setEditEsnafPhone, editEsnafNote, setEditEsnafNote
  } = usePos();
  return (
    <Sheet
      onClose={onClose}
      title={editingEsnafId ? "Cari kartını düzenle" : "Yeni cari kartı"}
      foot={<button type="submit" form="cari-edit-form" className="btn btn-primary btn-lg btn-block">{editingEsnafId ? "Bilgileri güncelle" : "Cari kartını kaydet"}</button>}
    >
      <form id="cari-edit-form" className="form-grid" onSubmit={(e) => { handleSaveEsnafEdit(e); onClose(); }}>
        <Field label="Esnaf / işletme adı"><input className="field-input" required autoFocus value={editEsnafName} onChange={(e) => setEditEsnafName(e.target.value)} placeholder="Komşu Berber Salih" /></Field>
        <Field label="Sektör"><input className="field-input" value={editEsnafShopType} onChange={(e) => setEditEsnafShopType(e.target.value)} placeholder="Kuaför, eczane…" /></Field>
        <Field label="Esnaf indirimi (%)"><input className="field-input" type="number" min="0" max="100" inputMode="numeric" value={editEsnafDiscount} onChange={(e) => setEditEsnafDiscount(e.target.value)} /></Field>
        <Field label="Telefon"><input className="field-input" type="tel" inputMode="tel" value={editEsnafPhone} onChange={(e) => setEditEsnafPhone(e.target.value)} placeholder="0532 …" /></Field>
        <Field label="Özel not (çay/kahve tercihi)"><input className="field-input" value={editEsnafNote} onChange={(e) => setEditEsnafNote(e.target.value)} placeholder="Çaylar şekersiz, ince belli" /></Field>
      </form>
    </Sheet>
  );
}

export function EsnafCards() {
  const { esnafList, handleDeleteEsnaf, setEditingEsnafId, setEditEsnafName, setEditEsnafShopType, setEditEsnafDiscount, setEditEsnafPhone, setEditEsnafNote } = usePos();
  const sheet = useSheet();
  const startNew = () => { setEditingEsnafId(null); setEditEsnafName(""); setEditEsnafShopType(""); setEditEsnafDiscount("0"); setEditEsnafPhone(""); setEditEsnafNote(""); sheet.open("cari"); };
  const startEdit = (e) => {
    setEditingEsnafId(e.id); setEditEsnafName(e.name); setEditEsnafShopType(e.shopType); setEditEsnafPhone(e.phone);
    setEditEsnafDiscount(String(e.discountRate)); setEditEsnafNote(e.note || ""); sheet.open("cari");
  };
  return (
    <>
      <Card span={12} title="Cari kartları" aside={<button type="button" className="btn btn-primary" onClick={startNew}><Ic n="plus" className="ic-sm" />Yeni cari</button>}>
        {esnafList.length === 0 ? <Empty icon="bag">Henüz cari kartı yok.</Empty> : (
          <div className="ops-list">
            {esnafList.map((e) => (
              <ItemRow key={e.id} title={e.name} tags={<><Tag>{e.shopType}</Tag>{e.discountRate > 0 && <Tag tone="success">%{e.discountRate} indirim</Tag>}</>}
                sub={`Açık bakiye ${formatTL(e.balance)}`} onEdit={() => startEdit(e)} onDelete={() => handleDeleteEsnaf(e.id)} />
            ))}
          </div>
        )}
      </Card>
      {sheet.current === "cari" && <CariSheet onClose={sheet.close} />}
    </>
  );
}
