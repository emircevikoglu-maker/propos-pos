// Supabase Realtime SİNYAL istemcisi (Phoenix protokolü, vsn 1.0.0) — bağımlılıksız (~1 KB'lık sarmalayıcı).
// Yalnızca "rev değişti" bildirimini dinler; veri taşımaz. Veriyi yine /api/sync'ten (yetkili) çeker.
// Bağlantı kopunca üstel geri çekilme (1 sn → 30 sn, sapmalı) ile yeniden dener; çalışmazsa uygulama yoklamaya döner.

const HEARTBEAT_MS = 25000;
const MAX_BACKOFF_MS = 30000;

/**
 * @param {{ WS?: typeof WebSocket, onSignal: (s:{rev:number, by:string}) => void, onStatus?: (connected:boolean) => void, random?: () => number }} opts
 */
export function createRealtime({ WS = typeof WebSocket !== "undefined" ? WebSocket : null, onSignal, onStatus, random = Math.random }) {
  let cfg = null;
  let ws = null;
  let stopped = true;
  let connected = false;
  let attempt = 0;
  let hb = null;
  let retry = null;
  let ref = 0;

  const setConnected = (v) => {
    if (connected === v) return;
    connected = v;
    if (onStatus) onStatus(v);
  };
  const send = (obj) => { try { ws && ws.readyState === 1 && ws.send(JSON.stringify(obj)); } catch (e) {} };

  function cleanup() {
    if (hb) clearInterval(hb);
    hb = null;
    if (ws) {
      try { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; ws.close(); } catch (e) {}
    }
    ws = null;
    setConnected(false);
  }

  function schedule() {
    if (stopped) return;
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(attempt, 5));
    attempt += 1;
    retry = setTimeout(open, Math.round(base * (0.75 + random() * 0.5)));
  }

  function open() {
    if (stopped || !cfg || !WS) return;
    cleanup();
    let url;
    try {
      url = `${cfg.url}?apikey=${encodeURIComponent(cfg.key)}&vsn=1.0.0`;
      ws = new WS(url);
    } catch (e) {
      schedule();
      return;
    }
    const joinRef = String(++ref);
    ws.onopen = () => {
      send({ topic: `realtime:${cfg.topic}`, event: "phx_join", ref: joinRef, join_ref: joinRef,
        payload: { config: { broadcast: { ack: false, self: false }, presence: { key: "" }, postgres_changes: [], private: false } } });
      hb = setInterval(() => send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) }), HEARTBEAT_MS);
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || typeof m !== "object") return;
      if (m.event === "phx_reply" && m.ref === joinRef) {
        if (m.payload && m.payload.status === "ok") { attempt = 0; setConnected(true); } else { cleanup(); schedule(); }
        return;
      }
      if (m.event === "phx_error" || m.event === "phx_close") { cleanup(); schedule(); return; }
      if (m.event === "broadcast" && m.payload && m.payload.event === "rev") {
        const p = m.payload.payload || {};
        const rev = Number(p.rev);
        if (Number.isFinite(rev) && rev > 0) onSignal({ rev, by: typeof p.by === "string" ? p.by : "" });
      }
    };
    ws.onclose = () => { cleanup(); schedule(); };
    ws.onerror = () => { /* onclose yeniden dener */ };
  }

  return {
    start(config) {
      if (!config || typeof config.url !== "string" || !/^wss:\/\//.test(config.url) || !config.key || !config.topic) return false;
      cfg = config;
      stopped = false;
      attempt = 0;
      open();
      return true;
    },
    stop() {
      stopped = true;
      if (retry) clearTimeout(retry);
      retry = null;
      cleanup();
    },
    isConnected: () => connected
  };
}
