// Service worker davranışı: kaynak dosya sahte bir SW ortamında çalıştırılır (vm).
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SRC = fs.readFileSync(path.resolve(__dirname, "../../src/pwa/sw.template.js"), "utf8").replace(/__VERSION__/g, "v-test");

function makeEnv({ network = "ok", existing = {} } = {}) {
  const store = { ...existing }; // cacheName -> Map(url -> Response)
  const listeners = {};
  const fetchCalls = [];
  const env = {
    store, listeners, fetchCalls, skipWaiting: vi.fn(), claimed: false, network,
    self: null
  };
  const cacheApi = {
    open: async (name) => {
      store[name] = store[name] || new Map();
      const m = store[name];
      return {
        addAll: async (urls) => { urls.forEach((u) => m.set(u, new Response(`cached:${u}`))); },
        put: async (k, v) => { m.set(typeof k === "string" ? k : new URL(k.url).pathname, v); },
        match: async (k) => { const r = m.get(typeof k === "string" ? k : new URL(k.url).pathname); return r ? r.clone() : undefined; }
      };
    },
    keys: async () => Object.keys(store),
    delete: async (n) => { delete store[n]; return true; }
  };
  const self = {
    location: { origin: "https://pos.example" },
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: env.skipWaiting,
    clients: { claim: async () => { env.claimed = true; } }
  };
  const ctx = vm.createContext({
    self, caches: cacheApi, URL, Response, Promise, setTimeout, clearTimeout, Error,
    fetch: async (req) => {
      fetchCalls.push(typeof req === "string" ? req : req.url);
      if (env.network === "down") throw new TypeError("offline");
      if (env.network === "hang") return new Promise(() => {});
      const r = new Response("fresh:" + (req.url || req));
      Object.defineProperty(r, "type", { value: "basic" }); // tarayıcıda aynı köken yanıtı "basic"
      return r;
    }
  });
  env.self = self;
  vm.runInContext(SRC, ctx);
  return env;
}

const request = (url, mode = "same-origin", method = "GET") => ({ url, mode, method });
async function dispatchFetch(env, req) {
  let responded = null;
  env.listeners.fetch({ request: req, respondWith: (p) => { responded = Promise.resolve(p); } });
  return responded ? await responded : null;
}
async function waitUntil(env, type, extra = {}) {
  let p = null;
  env.listeners[type]({ waitUntil: (x) => { p = x; }, ...extra });
  await p;
}

describe("service worker", () => {
  it("kurulumda uygulama kabuğunu önbelleğe alır", async () => {
    const env = makeEnv();
    await waitUntil(env, "install");
    expect([...env.store["propos-shell-v-test"].keys()]).toEqual(["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]);
  });

  it("etkinleşince eski sürüm önbelleklerini siler, başka önbelleklere dokunmaz, istemcileri devralır", async () => {
    const env = makeEnv({ existing: { "propos-shell-eski": new Map(), "baska-uygulama": new Map(), "propos-shell-v-test": new Map() } });
    await waitUntil(env, "activate");
    expect(Object.keys(env.store).sort()).toEqual(["baska-uygulama", "propos-shell-v-test"]);
    expect(env.claimed).toBe(true);
  });

  it("/api/* isteklerine HİÇ karışmaz (önbelleğe alma yok, respondWith yok)", async () => {
    const env = makeEnv();
    for (const u of ["https://pos.example/api/sync?tenantId=A", "https://pos.example/api/login", "https://pos.example/api/pin/verify", "https://pos.example/api/keepalive"]) {
      expect(await dispatchFetch(env, request(u))).toBe(null);
      expect(await dispatchFetch(env, request(u, "cors", "POST"))).toBe(null);
    }
    expect(env.fetchCalls).toEqual([]);
    expect(Object.keys(env.store)).toEqual([]);
  });

  it("POST, başka köken ve bilinmeyen statik yollar yönlendirilmez", async () => {
    const env = makeEnv();
    expect(await dispatchFetch(env, request("https://pos.example/", "navigate", "POST"))).toBe(null);
    expect(await dispatchFetch(env, request("https://baska.example/x.js"))).toBe(null);
    expect(await dispatchFetch(env, request("https://pos.example/rastgele.js"))).toBe(null);
  });

  it("sayfa gezintisi: ağ başarılıysa taze sayfa döner ve kabuk güncellenir", async () => {
    const env = makeEnv();
    await waitUntil(env, "install");
    const res = await dispatchFetch(env, request("https://pos.example/?tenant=KAFE-1", "navigate"));
    expect(await res.text()).toContain("fresh:");
    const cached = await env.store["propos-shell-v-test"].get("/").text();
    expect(cached).toContain("fresh:");
  });

  it("çevrimdışı açılış: ağ yoksa önbellekteki kabuk döner (her yol için)", async () => {
    const env = makeEnv();
    await waitUntil(env, "install");
    env.network = "down";
    for (const u of ["https://pos.example/", "https://pos.example/?tenant=X", "https://pos.example/herhangi/yol"]) {
      const res = await dispatchFetch(env, request(u, "navigate"));
      expect(await res.text()).toBe("cached:/");
    }
  });

  it("yavaş/asılı ağda 3 sn sonra önbelleğe düşer (açılış takılmaz)", async () => {
    vi.useFakeTimers();
    const env = makeEnv();
    await waitUntil(env, "install");
    env.network = "hang";
    let responded;
    env.listeners.fetch({ request: request("https://pos.example/", "navigate"), respondWith: (p) => { responded = p; } });
    await vi.advanceTimersByTimeAsync(3100);
    expect(await (await responded).text()).toBe("cached:/");
    vi.useRealTimers();
  });

  it("çevrimdışı ve önbellek boşsa anlaşılır 503 metni (boş ekran yok)", async () => {
    const env = makeEnv();
    env.network = "down";
    const res = await dispatchFetch(env, request("https://pos.example/", "navigate"));
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("çevrimdışı");
  });

  it("statik kabuk dosyaları önbellek-öncelikli", async () => {
    const env = makeEnv();
    await waitUntil(env, "install");
    env.network = "down";
    const res = await dispatchFetch(env, request("https://pos.example/icon-192.png"));
    expect(await res.text()).toBe("cached:/icon-192.png");
  });

  it("SKIP_WAITING mesajı yeni sürümü devreye alır; başka mesaj almaz", () => {
    const env = makeEnv();
    env.listeners.message({ data: { type: "BASKA" } });
    env.listeners.message({ data: null });
    expect(env.skipWaiting).not.toHaveBeenCalled();
    env.listeners.message({ data: { type: "SKIP_WAITING" } });
    expect(env.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it("kendiliğinden skipWaiting yapmaz (satış ortasında yenileme riski)", async () => {
    const env = makeEnv();
    await waitUntil(env, "install");
    expect(env.skipWaiting).not.toHaveBeenCalled();
  });
});

describe("derlenen PWA dosyaları (dist)", () => {
  const dist = path.resolve(__dirname, "../../dist");
  const has = fs.existsSync(path.join(dist, "sw.js"));
  it.skipIf(!has)("manifest geçerli ve kurulabilirlik alanlarını taşır", () => {
    const m = JSON.parse(fs.readFileSync(path.join(dist, "manifest.webmanifest"), "utf8"));
    expect(m).toMatchObject({ name: expect.any(String), short_name: "ProPos", start_url: "/", scope: "/", display: "standalone" });
    const sizes = m.icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(m.icons.some((i) => i.purpose === "maskable")).toBe(true);
    m.icons.forEach((i) => {
      const buf = fs.readFileSync(path.join(dist, i.src.replace(/^\//, "")));
      expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      const w = buf.readUInt32BE(16);
      expect(`${w}x${w}`).toBe(i.sizes);
    });
  });

  it.skipIf(!has)("sw.js sürüm damgalı (yer tutucu kalmamış) ve index.html manifesti bağlar", () => {
    const sw = fs.readFileSync(path.join(dist, "sw.js"), "utf8");
    expect(sw).not.toContain("__VERSION__");
    expect(sw).toMatch(/const VERSION = "[0-9a-f]{10}"/);
    const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).not.toContain("getRegistrations"); // eski "SW'yi sil" betiği kalktı
  });
});
