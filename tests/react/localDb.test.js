import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import * as db from "../../src/services/localDb";

const state = (extra = {}) => ({ tables: [{ id: "t1" }], products: [{ id: "p1" }], sales: [], ...extra });

beforeEach(() => { globalThis.indexedDB = new IDBFactory(); db._resetForTests(); });

describe("IndexedDB yerel depo", () => {
  it("yaz → oku → sil (yapısal klon: iç içe veri ve Türkçe karakter korunur)", async () => {
    expect(await db.dbSet("k", { a: [1, { b: "Bahçe ş-ğ" }] })).toBe(true);
    expect(await db.dbGet("k")).toEqual({ a: [1, { b: "Bahçe ş-ğ" }] });
    await db.dbDel("k");
    expect(await db.dbGet("k")).toBeUndefined();
  });

  it("durum, taban ve üst veri işletme başına ayrı tutulur", async () => {
    await db.saveState("A", state({ marker: "A" }));
    await db.saveState("B", state({ marker: "B" }));
    await db.saveBase("A", state({ marker: "base" }));
    await db.saveMeta("A", { serverRev: 42, dirty: true });
    const a = await db.loadLocal("A");
    expect(a.state.marker).toBe("A");
    expect(a.base.marker).toBe("base");
    expect(a.meta).toEqual({ serverRev: 42, dirty: true });
    expect((await db.loadLocal("B")).state.marker).toBe("B");
    expect((await db.loadLocal("C")).state).toBe(null);
  });

  it("bozuk/eksik kayıtlar yok sayılır (geçersiz durum null, meta varsayılan)", async () => {
    await db.dbSet("state:A", { tables: "çöp" });
    await db.dbSet("meta:A", { serverRev: "x", dirty: "evet" });
    const r = await db.loadLocal("A");
    expect(r.state).toBe(null);
    expect(r.meta).toEqual({ serverRev: 0, dirty: false });
  });

  it("eski localStorage kopyası bir kez taşınır ve büyük kopya silinir (5 MB kotası serbest)", async () => {
    localStorage.setItem("legacy-key", JSON.stringify(state({ marker: "eski" })));
    const r = await db.loadLocal("A", "legacy-key");
    expect(r.state.marker).toBe("eski");
    expect(localStorage.getItem("legacy-key")).toBe(null);
    expect((await db.dbGet("state:A")).marker).toBe("eski");
    expect((await db.loadLocal("A", "legacy-key")).state.marker).toBe("eski");
  });

  it("bozuk localStorage kopyası çökertmez", async () => {
    localStorage.setItem("legacy-key", "{bozuk");
    expect((await db.loadLocal("A", "legacy-key")).state).toBe(null);
    localStorage.setItem("legacy-key", JSON.stringify({ tables: [] }));
    expect((await db.loadLocal("A", "legacy-key")).state).toBe(null);
  });

  it("clearLocal üç kaydı da siler", async () => {
    await db.saveState("A", state()); await db.saveBase("A", state()); await db.saveMeta("A", { serverRev: 1, dirty: true });
    await db.clearLocal("A");
    const r = await db.loadLocal("A");
    expect(r.state).toBe(null); expect(r.base).toBe(null); expect(r.meta.dirty).toBe(false);
  });

  it("büyük durum (≈5 MB, localStorage tavanını aşar) yazılır", async () => {
    const big = state({ pad: "ç".repeat(2_600_000) });
    expect(await db.saveState("A", big)).toBe(true);
    expect((await db.loadLocal("A")).state.pad.length).toBe(2_600_000);
  });
});

describe("IndexedDB yokken geri dönüş", () => {
  it("localStorage'a düşer ve çalışır", async () => {
    globalThis.indexedDB = undefined;
    db._resetForTests();
    expect(await db.dbSet("k", { a: 1 })).toBe(true);
    expect(db.getMode()).toBe("localstorage");
    expect(await db.dbGet("k")).toEqual({ a: 1 });
    await db.saveState("A", state({ marker: "ls" }));
    expect((await db.loadLocal("A")).state.marker).toBe("ls");
  });

  it("localStorage da yoksa bellekte tutar, hata fırlatmaz", async () => {
    globalThis.indexedDB = undefined;
    db._resetForTests();
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("kota"); };
    try {
      expect(await db.dbSet("k", 5)).toBe(true);
      expect(db.getMode()).toBe("memory");
      expect(await db.dbGet("k")).toBe(5);
    } finally { Storage.prototype.setItem = orig; }
  });
});

describe("açılış ön yüklemesi ve kalıcılık", () => {
  it("preloadLocal sonucu window.__PROPOS_BOOT__'a yazar", async () => {
    await db.saveState("A", state({ marker: "boot" }));
    await db.preloadLocal("A");
    expect(window.__PROPOS_BOOT__.tenantId).toBe("A");
    expect(window.__PROPOS_BOOT__.state.marker).toBe("boot");
    delete window.__PROPOS_BOOT__;
  });

  it("depo takılırsa zaman aşımıyla boş devam eder (uygulama açılışı bloklanmaz)", async () => {
    vi.useFakeTimers();
    globalThis.indexedDB = { open: () => ({}) }; // hiç yanıt vermeyen istek
    db._resetForTests();
    const p = db.preloadLocal("A");
    await vi.advanceTimersByTimeAsync(db.BOOT_TIMEOUT_MS + 10);
    await p;
    expect(window.__PROPOS_BOOT__.state).toBe(null);
    delete window.__PROPOS_BOOT__;
  });

  it("requestPersistence / storageEstimate destek yoksa güvenli döner", async () => {
    const orig = navigator.storage;
    Object.defineProperty(navigator, "storage", { value: undefined, configurable: true });
    expect(await db.requestPersistence()).toBe(false);
    expect(await db.storageEstimate()).toBe(null);
    Object.defineProperty(navigator, "storage", { value: { persisted: async () => false, persist: async () => true, estimate: async () => ({ usage: 50, quota: 200 }) }, configurable: true });
    expect(await db.requestPersistence()).toBe(true);
    expect(await db.storageEstimate()).toEqual({ usage: 50, quota: 200, ratio: 0.25 });
    Object.defineProperty(navigator, "storage", { value: orig, configurable: true });
  });
});
