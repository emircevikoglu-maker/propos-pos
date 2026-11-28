// Kaynak taraması: tehlikeli kalıplar ve mimari kurallar (lint benzeri, bağımlılıksız).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "../../src");
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx?|css)$/.test(e.name)) files.push(p);
  }
})(SRC);
const read = (p) => fs.readFileSync(p, "utf8");
const rel = (p) => path.relative(SRC, p).replace(/\\/g, "/");
const grep = (re, filter = () => true) => files.filter(filter).flatMap((f) => read(f).split("\n").map((l, i) => [rel(f), i + 1, l]).filter(([, , l]) => re.test(l)));

describe("kaynak taraması", () => {
  it("innerHTML / eval / new Function yok; document.write yalnızca kaçışlı yazdırma şablonunda", () => {
    expect(grep(/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/, (f) => rel(f) !== "design/motion.js")).toEqual([]);
    const writers = grep(/document\.write\(/).map(([f]) => f);
    expect([...new Set(writers)]).toEqual(writers.length ? ["components/views/ZReportCard.jsx"] : []);
  });

  it("design/motion.js: innerHTML'e giren kullanıcı/işletme metni esc() ile kaçışlı", () => {
    const src = read(path.join(SRC, "design/motion.js"));
    expect(src).toMatch(/function esc\(/);
    // Dinamik alanlar (kicker, title, sub, stat etiketi) HTML dizgesine yalnızca esc(...) içinde girer.
    const lines = src.split("\n").filter((l) => /(s\.kicker|s\.title|s\.sub|st\.label)/.test(l) && /<\/?(span|div|h2|p)/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((l) => {
      const dyn = [...l.matchAll(/(s\.kicker|s\.title|s\.sub|st\.label)/g)];
      dyn.filter((m) => !/^\s*\?/.test(l.slice(m.index + m[0].length))).forEach((m) => expect(l.slice(0, m.index)).toMatch(/esc\(/));
    });
    // Geri al metni innerHTML'e değil textContent'e yazılır.
    expect(src).toMatch(/undo-text'\)\.textContent = text/);
  });

  it("Z raporu yazdırma şablonunda her değer esc() ile kaçışlı", () => {
    const src = read(path.join(SRC, "components/views/ZReportCard.jsx"));
    const tpl = src.slice(src.indexOf("const printReport"), src.indexOf("window.open"));
    const exprs = [...tpl.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1].trim());
    const unsafe = exprs.filter((e) => !/^esc\(/.test(e) && !/^rows\(/.test(e) && e !== "report.count" && !/^pairs\.map/.test(e));
    expect(unsafe).toEqual([]);
    expect(src).toMatch(/const esc = /);
  });

  it("oturum belirteçleri localStorage'a yazılmaz", () => {
    expect(grep(/localStorage\.setItem\([^)]*token/i)).toEqual([]);
  });

  it("yönetici PIN'i senkron paketine ve yedeğe girmez", () => {
    const ctx = read(path.join(SRC, "context/PosContext.jsx"));
    expect(ctx).not.toMatch(/adminPin, brandSettings/);
    expect(ctx).not.toMatch(/setAdminPin/);
    expect(ctx).not.toMatch(/code === adminPin/);
  });

  it("POS kodu kontrol paneli modüllerini içe aktarmaz (paket ayrımı)", () => {
    expect(grep(/from ["'][./]*admin\//, (f) => !rel(f).startsWith("admin/"))).toEqual([]);
  });

  it("kontrol paneli POS bağlamını içe aktarmaz", () => {
    expect(grep(/PosContext|services\/apiService/, (f) => rel(f).startsWith("admin/"))).toEqual([]);
  });

  it("eski marka sabitleri kalmadı (yalnızca geriye uyumlu takma ad listesi)", () => {
    const hits = grep(/pick'?s|picky/i).filter(([, , l]) => !/"PICKYS-MASTER"(, "MASTER"| \|\|)|=== "PICKYS-MASTER"/.test(l));
    expect(hits).toEqual([]);
  });

  it("arayüz kuralı: font-black / font-extrabold kullanılmaz", () => {
    expect(grep(/font-black|font-extrabold/, (f) => rel(f) !== "design/skin.css")).toEqual([]);
  });

  it("arayüz kuralı: POS kodunda ham Tailwind rengi yok (renkler ui.css tokenlarından; kontrol paneli ayrı)", () => {
    expect(grep(/(bg|text|border|from|to|via|ring|accent)-(stone|amber|rose|emerald|orange|blue)-\d/, (f) => !rel(f).startsWith("admin/") && f.endsWith(".jsx"))).toEqual([]);
  });

  it("skin.css POS paketine girmez (yalnızca kontrol paneli)", () => {
    const build = fs.readFileSync(path.resolve(SRC, "../scripts/build.js"), "utf8");
    expect(build).toMatch(/const css = baseCss \+ readDesign\(\["ui\.css", "ui-extra\.css"\]\);/);
  });
});
