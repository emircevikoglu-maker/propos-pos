import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRealtime } from "../../src/services/realtime";

const CFG = { url: "wss://abc.supabase.co/realtime/v1/websocket", key: "sb_publishable_x", topic: "propos-a-1234" };

class FakeWS {
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeWS.instances.push(this); }
  send(d) { this.sent.push(JSON.parse(d)); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen && this.onopen(); }
  recv(obj) { this.onmessage && this.onmessage({ data: typeof obj === "string" ? obj : JSON.stringify(obj) }); }
  drop() { this.readyState = 3; this.onclose && this.onclose(); }
}
const last = () => FakeWS.instances.at(-1);
const joinOk = (ws) => { const j = ws.sent.find((m) => m.event === "phx_join"); ws.recv({ event: "phx_reply", ref: j.ref, payload: { status: "ok" } }); };

beforeEach(() => { FakeWS.instances = []; vi.useFakeTimers(); });

describe("Realtime sinyal istemcisi", () => {
  it("bağlanır, kanala katılır, bağlı olunca bildirir", () => {
    const onStatus = vi.fn();
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn(), onStatus });
    expect(rt.start(CFG)).toBe(true);
    const ws = last();
    expect(ws.url).toContain("apikey=sb_publishable_x");
    expect(ws.url).toContain("vsn=1.0.0");
    ws.open();
    const join = ws.sent.find((m) => m.event === "phx_join");
    expect(join.topic).toBe("realtime:propos-a-1234");
    expect(join.payload.config.private).toBe(false);
    expect(rt.isConnected()).toBe(false);
    joinOk(ws);
    expect(rt.isConnected()).toBe(true);
    expect(onStatus).toHaveBeenCalledWith(true);
  });

  it("rev sinyalini iletir; geçersiz/kötü mesajları yok sayar", () => {
    const onSignal = vi.fn();
    const rt = createRealtime({ WS: FakeWS, onSignal });
    rt.start(CFG);
    const ws = last(); ws.open(); joinOk(ws);
    ws.recv({ event: "broadcast", payload: { event: "rev", payload: { rev: 1234, by: "dev-1" } } });
    expect(onSignal).toHaveBeenCalledWith({ rev: 1234, by: "dev-1" });
    [
      "{bozuk", "null", "[]", { event: "broadcast", payload: { event: "baska", payload: { rev: 5 } } },
      { event: "broadcast", payload: { event: "rev", payload: { rev: "x" } } },
      { event: "broadcast", payload: { event: "rev", payload: { rev: -3 } } },
      { event: "broadcast", payload: { event: "rev", payload: { rev: 1e999 } } },
      { event: "broadcast" }, { event: "presence_state", payload: {} }
    ].forEach((m) => ws.recv(m));
    expect(onSignal).toHaveBeenCalledTimes(1);
  });

  it("by alanı metin değilse boş olur (tip karışıklığı)", () => {
    const onSignal = vi.fn();
    const rt = createRealtime({ WS: FakeWS, onSignal });
    rt.start(CFG);
    const ws = last(); ws.open(); joinOk(ws);
    ws.recv({ event: "broadcast", payload: { event: "rev", payload: { rev: 7, by: { x: 1 } } } });
    expect(onSignal).toHaveBeenCalledWith({ rev: 7, by: "" });
  });

  it("25 sn'de bir heartbeat gönderir", () => {
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn() });
    rt.start(CFG);
    const ws = last(); ws.open(); joinOk(ws);
    vi.advanceTimersByTime(25000 * 2 + 10);
    expect(ws.sent.filter((m) => m.event === "heartbeat")).toHaveLength(2);
    expect(ws.sent.find((m) => m.event === "heartbeat").topic).toBe("phoenix");
  });

  it("kopunca üstel geri çekilmeyle yeniden bağlanır; bağlanınca sayaç sıfırlanır", () => {
    const onStatus = vi.fn();
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn(), onStatus, random: () => 0.5 });
    rt.start(CFG);
    let ws = last(); ws.open(); joinOk(ws);
    ws.drop();
    expect(rt.isConnected()).toBe(false);
    expect(FakeWS.instances).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(FakeWS.instances).toHaveLength(2);
    ws = last(); ws.drop();               // bağlanamadı
    vi.advanceTimersByTime(1999);
    expect(FakeWS.instances).toHaveLength(2);
    vi.advanceTimersByTime(2);
    expect(FakeWS.instances).toHaveLength(3);
    ws = last(); ws.open(); joinOk(ws);
    expect(rt.isConnected()).toBe(true);
    ws.drop();
    vi.advanceTimersByTime(1000);         // sayaç sıfırlandı: yine 1 sn
    expect(FakeWS.instances).toHaveLength(4);
  });

  it("geri çekilme 30 sn'yi aşmaz", () => {
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn(), random: () => 0.5 });
    rt.start(CFG);
    for (let i = 0; i < 12; i++) { last().drop(); vi.advanceTimersByTime(30000); }
    const n = FakeWS.instances.length;
    last().drop();
    vi.advanceTimersByTime(30001);
    expect(FakeWS.instances.length).toBe(n + 1);
  });

  it("katılım reddedilirse (status error) yeniden dener", () => {
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn(), random: () => 0.5 });
    rt.start(CFG);
    const ws = last(); ws.open();
    const j = ws.sent.find((m) => m.event === "phx_join");
    ws.recv({ event: "phx_reply", ref: j.ref, payload: { status: "error" } });
    expect(rt.isConnected()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(FakeWS.instances).toHaveLength(2);
  });

  it("stop() yeniden bağlanmayı durdurur ve soketi kapatır", () => {
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn() });
    rt.start(CFG);
    const ws = last(); ws.open(); joinOk(ws);
    rt.stop();
    expect(ws.readyState).toBe(3);
    vi.advanceTimersByTime(120000);
    expect(FakeWS.instances).toHaveLength(1);
    expect(rt.isConnected()).toBe(false);
  });

  it("güvensiz ya da eksik yapılandırmayı reddeder (ws://, anahtarsız, kanalsız)", () => {
    const rt = createRealtime({ WS: FakeWS, onSignal: vi.fn() });
    expect(rt.start({ ...CFG, url: "ws://evil.example/x" })).toBe(false);
    expect(rt.start({ ...CFG, url: "https://x" })).toBe(false);
    expect(rt.start({ ...CFG, key: "" })).toBe(false);
    expect(rt.start({ ...CFG, topic: "" })).toBe(false);
    expect(rt.start(null)).toBe(false);
    expect(FakeWS.instances).toHaveLength(0);
  });

  it("WebSocket oluşturucu hata fırlatırsa çökmez, tekrar dener", () => {
    let n = 0;
    class Boom { constructor() { n += 1; throw new Error("blocked"); } }
    const rt = createRealtime({ WS: Boom, onSignal: vi.fn(), random: () => 0.5 });
    expect(() => rt.start(CFG)).not.toThrow();
    vi.advanceTimersByTime(1000);
    expect(n).toBe(2);
  });
});
