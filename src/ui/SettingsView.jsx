import React from "react";
import { usePos } from "../context/PosContext";
import { Page, Seg } from "./page";
import { Feel, Identity } from "./settings/Identity";
import { Menu, Tables } from "./settings/Venue";
import { EsnafCards, Staff } from "./settings/People";
import { Security } from "./settings/Security";
import { Printing } from "./settings/Printing";

const SECTIONS = [
  ["branding", "Kimlik"],
  ["tables", "Masalar"],
  ["menu", "Menü"],
  ["staff", "Çalışanlar"],
  ["esnaf", "Esnaf"],
  ["print", "Yazdırma"],
  ["security", "Güvenlik ve yedek"],
  ["feel", "Hareket"]
];
const VIEWS = { branding: Identity, tables: Tables, menu: Menu, staff: Staff, esnaf: EsnafCards, print: Printing, security: Security, feel: Feel };

/** Yönetim: tüm ayarlar tek yerde, bölümler segmentle; ekleme/düzenleme formları pencerede (?s=…). */
export function SettingsView() {
  const { settingsSubTab, setSettingsSubTab } = usePos();
  const tab = VIEWS[settingsSubTab] ? settingsSubTab : "branding";
  const View = VIEWS[tab];
  return (
    <Page label="İşletme ayarları" title="Yönetim">
      <div className="toolbar">
        <Seg label="Ayar bölümü" value={tab} onChange={setSettingsSubTab} items={SECTIONS} />
      </div>
      <View />
    </Page>
  );
}
