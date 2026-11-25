import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSyncEngine } from "../../src/services/syncEngine";

const sale = (id, total, ts) => ({ id, total, timestamp: ts || "2026-11-25T10:00:00Z", paymentMethod: "Nakit" });
const st = (over = {}) => ({ tables: [{ id: "t1", name: "M1", items: [] }], products: [{ id: "p1", name: "Çay", price: 25 }], sales: [], ingredients: [{ id: "i1", name: "Süt", stock: 1000 }], ...over });

/** Sahte sunucu: rev + veri; baseRev uyuşmazsa 409. */
function makeServer(initial = null) {
  const s = { rev: initial ? 100 : 0, data: initial, online: true, attempts: 0, pushes: [], pulls: 0, limited: 0, auth: false, onPush: null };
  s.push = async (baseRev, json) => {
    s.attempts += 1;
    if (!s.online) return { kind: "offline" };
    if (s.auth) return { kind: "auth" };
    if (s.limited > 0) { s.limited -= 1; return { kind: "limited", retryAfter: 5 }; }
    s.pushes.push({ baseRev, body: JSON.parse(json) });
    if (s.onPush) s.onPush();
    if (baseRev !== s.rev) return { kind: "conflict", rev: s.rev, data: s.data };
    s.rev += 1; s.data = JSON.parse(json);
    return { kind: "ok", rev: s.rev };
  };
  s.pull = async (since) => {
    if (!s.online) return { kind: "offline" };
    if (s.auth) return { kind: "auth" };
    s.pulls += 1;
    if (since > 0 && since === s.rev) return { kind: "unchanged" };
    return { kind: "data", rev: s.rev, data: s.data || {} };
  };
  return s;
}

function makeDevice(server, { state = null, base = null, meta = { serverRev: 0, dirty: false } } = {}) {
  const applied = [];
  const statuses = [];
  const store = { state: null, base: null, meta: null, saveState: (x) => { store.state = x; }, saveBase: (x) => { store.base = x; }, saveMeta: (x) => { store.meta = x; } };
  const net = { online: true }; // cihaza özel bağlantı (diğer cihazlar sunucuya erişebilir)
  let engine;
  engine = createSyncEngine({
    tenantId: "T", deviceId: "dev", store,
    push: (b, j) => (net.online ? server.push(b, j) : Promise.resolve({ kind: "offline" })),
    pull: (x) => (net.online ? server.pull(x) : Promise.resolve({ kind: "offline" })),
    applyState: (s, info) => { applied.push({ s, info }); if (!info.remote) engine.localChanged(s); },
    onStatus: (x) => statuses.push(x.status)
  });
  engine.init({ state, base, meta });
  return { engine, applied, statuses, store, net };
}
const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
beforeEach(() => vi.useFakeTimers());

describe("ilk eşitleme", () => {
  it("yeni cihaz sunucudaki durumu uygular, göndermez", async () => {
    const server = makeServer(st({ sales: [sale("s1", 10)] }));
    const d = makeDevice(server);
    await d.engine.pull();
    expect(d.applied).toHaveLength(1);
    expect(d.applied[0].info.remote).toBe(true);
    expect(d.applied[0].s.sales).toHaveLength(1);
    expect(server.pushes).toHaveLength(0);
    expect(d.engine.state()).toMatchObject({ status: "synced", dirty: false, serverRev: 100 });
  });

  it("sunucu boşsa ve yerelde içerik varsa yerel yüklenir (baseRev 0)", async () => {
    const server = makeServer(null);
    const d = makeDevice(server, { state: st({ sales: [sale("s1", 10)] }) });
    await d.engine.pull();
    await tick(1);
    expect(server.pushes).toHaveLength(1);
    expect(server.pushes[0].baseRev).toBe(0);
    expect(server.data.sales).toHaveLength(1);
  });

  it("ilk başarılı pull'dan ÖNCE gönderim yapılmaz (baseRev bilinmeden ezme riski)", async () => {
    const server = makeServer(st({ sales: [sale("uzak", 1)] }));
    server.online = false;
    const d = makeDevice(server, { state: st() });
    d.engine.localChanged(st({ sales: [sale("yerel", 2)] }));
    await tick(5000);
    expect(server.pushes).toHaveLength(0);
    server.online = true;
    d.engine.onOnline();
    await tick(2000);
    expect(server.data.sales.map((s) => s.id).sort()).toEqual(["uzak", "yerel"]);
  });
});

describe("gönderim", () => {
  it("art arda değişiklikler tek gönderime iner (debounce) ve en son durum gider", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    for (let i = 0; i < 10; i++) { d.engine.localChanged(st({ sales: Array.from({ length: i + 1 }, (_, k) => sale(`s${k}`, 1)) })); await tick(100); }
    await tick(1500);
    expect(server.pushes).toHaveLength(1);
    expect(server.data.sales).toHaveLength(10);
    expect(d.engine.state()).toMatchObject({ dirty: false, status: "synced" });
  });

  it("sürekli yazmada bile en geç 3 sn içinde gönderilir", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    for (let t = 0; t < 3600; t += 200) { d.engine.localChanged(st({ marker: t })); await tick(200); }
    expect(server.pushes.length).toBeGreaterThanOrEqual(1);
  });

  it("gönderim sürerken yeni değişiklik olursa ikinci gönderim yapılır, veri kaybolmaz", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    let injected = false;
    server.onPush = () => { if (!injected) { injected = true; d.engine.localChanged(st({ marker: "ikinci" })); } };
    d.engine.localChanged(st({ marker: "birinci" }));
    await tick(5000);
    expect(server.data.marker).toBe("ikinci");
    expect(server.pushes.length).toBe(2);
    expect(d.engine.state().dirty).toBe(false);
  });

  it("her değişiklik kalıcı depoya hemen yazılır (çökmeye karşı), kirli bayrağıyla", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    d.engine.localChanged(st({ marker: "x" }));
    expect(d.store.state.marker).toBe("x");
    expect(d.store.meta.dirty).toBe(true);
    await tick(1000);
    expect(d.store.meta).toEqual({ serverRev: server.rev, dirty: false });
  });
});

describe("çevrimdışı çalışma ve birleştirme", () => {
  it("çevrimdışı satışlar bağlantı gelince başkasının satışlarını EZMEDEN eklenir", async () => {
    const server = makeServer(st({ sales: [sale("ortak", 5)] }));
    const A = makeDevice(server);
    const B = makeDevice(server);
    await A.engine.pull(); await B.engine.pull();

    A.net.online = false;                                      // A'nın interneti koptu
    A.engine.localChanged(st({ sales: [sale("a1", 10), sale("ortak", 5)] }));
    A.engine.localChanged(st({ sales: [sale("a2", 20), sale("a1", 10), sale("ortak", 5)] }));
    await tick(3000);
    expect(A.engine.state()).toMatchObject({ status: "offline", dirty: true });

        B.engine.localChanged(st({ sales: [sale("b1", 7), sale("ortak", 5)] }));
    await tick(1500);
    expect(server.data.sales.map((s) => s.id).sort()).toEqual(["b1", "ortak"]);

    A.net.online = true;
    A.engine.onOnline();                                       // A geri geldi
    await tick(4000);
    expect(server.data.sales.map((s) => s.id).sort()).toEqual(["a1", "a2", "b1", "ortak"]);
    expect(A.engine.state()).toMatchObject({ dirty: false, status: "synced" });
  });

  it("stok: iki cihaz da düştü → iki düşüm birleşir", async () => {
    const server = makeServer(st());
    const A = makeDevice(server), B = makeDevice(server);
    await A.engine.pull(); await B.engine.pull();
    A.net.online = false;
    A.engine.localChanged(st({ ingredients: [{ id: "i1", name: "Süt", stock: 900 }] }));   // −100
    await tick(1000);
    B.engine.localChanged(st({ ingredients: [{ id: "i1", name: "Süt", stock: 950 }] }));   // −50
    await tick(1500);
    A.net.online = true;
    A.engine.onOnline();
    await tick(4000);
    expect(server.data.ingredients[0].stock).toBe(850);
  });

  it("push 409 dönerse birleştirir ve yeniden gönderir (yarış)", async () => {
    const server = makeServer(st());
    const A = makeDevice(server), B = makeDevice(server);
    await A.engine.pull(); await B.engine.pull();
    B.engine.localChanged(st({ sales: [sale("b1", 1)] }));
    await tick(1000);                                          // B yazdı; A bilmiyor
    A.engine.localChanged(st({ sales: [sale("a1", 2)] }));
    await tick(4000);
    expect(server.pushes.some((p) => p.body.sales.some((s) => s.id === "a1") && p.baseRev !== server.rev)).toBe(true);
    expect(server.data.sales.map((s) => s.id).sort()).toEqual(["a1", "b1"]);
    expect(A.applied.at(-1).info.remote).toBe(false);          // birleşik durum arayüze uygulandı
  });

  it("uygulama kapanıp açılınca (kirli meta + taban) ilk pull birleştirip gönderir", async () => {
    const baseState = st({ sales: [sale("ortak", 5)] });
    const server = makeServer(baseState);
    const A = makeDevice(server);
    await A.engine.pull();
    const storedBase = A.store.base;
    // başka cihaz sunucuya yazdı
    const B = makeDevice(server);
    await B.engine.pull();
    B.engine.localChanged(st({ sales: [sale("b1", 7), sale("ortak", 5)] }));
    await tick(1500);
    // A yeniden başlatıldı: yerelde bekleyen değişiklik + taban + meta
    const A2 = makeDevice(server, { state: st({ sales: [sale("a1", 9), sale("ortak", 5)] }), base: storedBase, meta: { serverRev: 100, dirty: true } });
    expect(A2.engine.state()).toMatchObject({ dirty: true, status: "pending" });
    await A2.engine.pull();
    await tick(3000);
    expect(server.data.sales.map((s) => s.id).sort()).toEqual(["a1", "b1", "ortak"]);
  });

  it("kirli değilken sunucudan gelen yeni durum doğrudan uygulanır, geri gönderilmez", async () => {
    const server = makeServer(st());
    const A = makeDevice(server), B = makeDevice(server);
    await A.engine.pull(); await B.engine.pull();
    B.engine.localChanged(st({ sales: [sale("b1", 1)] }));
    await tick(1500);
    const pushesBefore = server.pushes.length;
    await A.engine.pull();
    expect(A.applied.at(-1).info.remote).toBe(true);
    await tick(3000);
    expect(server.pushes.length).toBe(pushesBefore);
  });
});

describe("hata durumları", () => {
  it("çevrimdışıyken üstel geri çekilmeyle dener; onOnline hemen dener", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    server.online = false;
    d.engine.localChanged(st({ marker: 1 }));
    server.attempts = 0;
    await tick(700);   // ilk deneme (3 sn bekleme başlar)
    expect(server.attempts).toBe(1);
    await tick(2800);
    expect(server.attempts).toBe(1);
    await tick(200);   // 3 sn doldu
    expect(server.attempts).toBe(2);
    await tick(6100);  // 6 sn
    expect(server.attempts).toBe(3);
    server.online = true;
    d.engine.onOnline();
    await tick(500);
    expect(server.data.marker).toBe(1);
    expect(d.engine.state().status).toBe("synced");
  });

  it("429 (limited): Retry-After sonrası bir kez dener ve veriyi kaybetmez", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    server.limited = 1;
    d.engine.localChanged(st({ marker: "k" }));
    await tick(1000);
    expect(server.pushes).toHaveLength(0);
    expect(d.engine.state().status).toBe("pending");
    await tick(5500);
    expect(server.data.marker).toBe("k");
  });

  it("yetki/lisans hatasında (auth) yeniden denemez, 'blocked' olur; veri yerelde durur", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    server.auth = true;
    d.engine.localChanged(st({ marker: "z" }));
    await tick(120000);
    expect(d.engine.state().status).toBe("blocked");
    expect(d.store.state.marker).toBe("z");
    expect(d.engine.state().dirty).toBe(true);
  });

  it("sürekli çakışma (uzak her seferinde değişiyor) sonsuz döngüye girmez; sonunda birleşir", async () => {
    const server = makeServer(st());
    const A = makeDevice(server), B = makeDevice(server);
    await A.engine.pull(); await B.engine.pull();
    let n = 0;
    server.onPush = () => { if (n < 3) { n += 1; server.rev += 1; server.data = st({ sales: [sale(`r${n}`, n)] , marker: n }); } };
    A.engine.localChanged(st({ sales: [sale("a1", 1)] }));
    await tick(20000);
    expect(server.pushes.length).toBeLessThan(15);
    expect(server.data.sales.some((s) => s.id === "a1")).toBe(true);
    expect(A.engine.state().dirty).toBe(false);
  });

  it("destroy sonrası zamanlayıcı/gönderim çalışmaz", async () => {
    const server = makeServer(st());
    const d = makeDevice(server);
    await d.engine.pull();
    d.engine.localChanged(st({ marker: "x" }));
    d.engine.destroy();
    await tick(10000);
    expect(server.pushes).toHaveLength(0);
  });

  it("pull ve push istisna fırlatsa bile çökmez, çevrimdışı sayılır", async () => {
    const server = makeServer(st());
    const boom = async () => { throw new Error("ağ"); };
    const store = { saveState() {}, saveBase() {}, saveMeta() {} };
    const statuses = [];
    const e = createSyncEngine({ tenantId: "T", deviceId: "d", push: boom, pull: boom, store, applyState() {}, onStatus: (s) => statuses.push(s.status) });
    e.init({ state: st(), base: null, meta: {} });
    await expect(e.pull()).resolves.toBeUndefined();
    expect(statuses.at(-1)).toBe("offline");
    e.destroy();
  });
});
