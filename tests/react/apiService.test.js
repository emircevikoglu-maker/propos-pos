import { describe, it, expect, beforeEach, vi } from "vitest";
import * as api from "../../src/services/apiService";

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

/** Sıralı yanıt kuyruğu; her çağrının URL ve gövdesini kaydeder. */
function mockFetch(handler) {
  const calls = [];
  const fn = vi.fn(async (url, opts = {}) => {
    calls.push({ url: String(url), opts });
    return handler(String(url), opts, calls.length);
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

const events = (name) => {
  const got = [];
  const h = (e) => got.push(e.detail);
  window.addEventListener(name, h);
  return { got, off: () => window.removeEventListener(name, h) };
};

beforeEach(() => api._resetApiStateForTests());

describe("oturum ve eşleştirme", () => {
  it("belirteç sessionStorage'a yazılır, asla localStorage'a değil", async () => {
    mockFetch(() => json(200, { ok: true, role: "tenant", token: "tok.sig" }));
    const r = await api.loginWithKey("KAFE-1", "SYNC-AAAA-BBBB-CCCC");
    expect(r.ok).toBe(true);
    expect(sessionStorage.getItem("propos_token_KAFE-1")).toBe("tok.sig");
    expect(JSON.stringify({ ...localStorage })).not.toContain("tok.sig");
  });

  it("pairDevice: başarıda anahtar cihaza kaydedilir, hatada kaydedilmez", async () => {
    mockFetch(() => json(401, { ok: false, code: "BAD_KEY", error: "Anahtar hatalı." }));
    const bad = await api.pairDevice("KAFE-1", "SYNC-YANLIS");
    expect(bad.ok).toBe(false);
    expect(api.isDevicePaired("KAFE-1")).toBe(false);

    mockFetch(() => json(200, { ok: true, role: "tenant", token: "t.s" }));
    const ok = await api.pairDevice("KAFE-1", "  SYNC-DOGRU  ");
    expect(ok.ok).toBe(true);
    expect(api.getStoredSyncKey("KAFE-1")).toBe("SYNC-DOGRU");
  });

  it("pairDevice: boş anahtarla ağ çağrısı yapılmaz", async () => {
    const calls = mockFetch(() => json(200, {}));
    expect((await api.pairDevice("A", "   ")).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("yanıt token'ı metin değilse saklanmaz (bozuk/kötü sunucu yanıtı)", async () => {
    mockFetch(() => json(200, { ok: true, role: "tenant", token: { evil: 1 } }));
    expect((await api.loginWithKey("A", "k")).ok).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it("ağ hatası ve bozuk JSON fırlatmaz", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await api.loginWithKey("A", "k")).toMatchObject({ ok: false, code: "NETWORK" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>502</html>", { status: 502 })));
    expect((await api.loginWithKey("A", "k")).ok).toBe(false);
    expect(await api.fetchServerInfo()).toBe(null);
  });

  it("403 LICENSE: lisans olayı yayınlanır", async () => {
    const ev = events("propos-license-blocked");
    mockFetch(() => json(403, { ok: false, code: "LICENSE", error: "Lisans süresi dolmuş." }));
    const r = await api.loginWithKey("A", "k");
    expect(r.code).toBe("LICENSE");
    expect(ev.got[0].message).toMatch(/Lisans/);
    ev.off();
  });

  it("unpairDevice anahtarı ve tüm oturumları siler", () => {
    localStorage.setItem("propos_sync_key_A", "k");
    sessionStorage.setItem("propos_token_A", "t");
    sessionStorage.setItem("propos_mgr_token_A", "m");
    sessionStorage.setItem("propos_founder_token", "f");
    api.unpairDevice("A");
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
});

describe("senkron ve 401/429", () => {
  it("tenantId URL'de kodlanır (parametre enjeksiyonu yok)", async () => {
    sessionStorage.setItem("propos_token_A&tenantId=B", "t");
    const calls = mockFetch(() => json(200, { ok: true, unchanged: true }));
    await api.fetchTenantSync("A&tenantId=B", 5, "dev&x=1");
    expect(calls[0].url).toContain("tenantId=A%26tenantId%3DB");
    expect(calls[0].url).toContain("deviceId=dev%26x%3D1");
    expect(calls[0].url.match(/tenantId=/g)).toHaveLength(1);
  });

  it("since sayı değilse -1 gönderilir", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    const calls = mockFetch(() => json(200, { ok: true }));
    await api.fetchTenantSync("A", "1;DROP", "d");
    expect(calls[0].url).toContain("since=-1");
  });

  it("401 AUTH: oturum silinir, kayıtlı anahtarla bir kez yeniden giriş denenir", async () => {
    localStorage.setItem("propos_sync_key_A", "SYNC-K");
    sessionStorage.setItem("propos_token_A", "eski");
    const calls = mockFetch((url) => {
      if (url.endsWith("/api/login")) return json(200, { ok: true, role: "tenant", token: "yeni" });
      const tokenSent = calls[calls.length - 1].opts.headers["X-ProPos-Token"];
      return tokenSent === "yeni" ? json(200, { ok: true, data: { tables: [] } }) : json(401, { ok: false, code: "AUTH" });
    });
    const out = await api.fetchTenantSync("A", 0, "d");
    expect(out.ok).toBe(true);
    expect(calls.filter((c) => c.url.endsWith("/api/login"))).toHaveLength(1);
  });

  it("401 AUTH ve anahtar yoksa eşleştirme olayı yayınlanır (spam yok)", async () => {
    const ev = events("propos-auth-required");
    mockFetch(() => json(401, { ok: false, code: "AUTH" }));
    await api.fetchTenantSync("A", 0, "d");
    await api.fetchTenantSync("A", 0, "d");
    expect(ev.got).toHaveLength(1);
    ev.off();
  });

  it("429 yoklama: olay + Retry-After süresince istek atılmaz", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    const ev = events("propos-rate-limited");
    const calls = mockFetch(() => json(429, { ok: false, code: "RATE_LIMIT" }, { "Retry-After": "30" }));
    expect(await api.fetchTenantSync("A", 0, "d")).toBe(null);
    expect(ev.got[0]).toEqual({ retryAfter: 30, bucket: "poll" });
    await api.fetchTenantSync("A", 0, "d");
    await api.fetchTenantSync("A", 0, "d");
    expect(calls).toHaveLength(1);
    ev.off();
  });

  it("429 gönderim: son durum saklanır ve süre dolunca bir kez gönderilir", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("propos_token_A", "t");
    let n = 0;
    const calls = mockFetch(() => (++n === 1 ? json(429, { ok: false }, { "Retry-After": "5" }) : json(200, { ok: true, rev: 9 })));
    const r = await api.pushTenantSync("A", "d", 1, '{"v":1}');
    expect(r.rateLimited).toBe(true);
    await api.pushTenantSync("A", "d", 2, '{"v":2}');
    await api.pushTenantSync("A", "d", 3, '{"v":3}');
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(5300);
    expect(calls).toHaveLength(2);
    expect(calls[1].opts.body).toBe('{"v":3}');
  });

  it("Retry-After saçma değerleri sınırlanır", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    const ev = events("propos-rate-limited");
    mockFetch(() => json(429, {}, { "Retry-After": "999999" }));
    await api.fetchTenantSync("A", 0, "d");
    expect(ev.got[0].retryAfter).toBe(300);
    ev.off();
  });
});

describe("yönetici PIN'i", () => {
  it("doğru PIN yönetici belirteci saklar; PIN cihazda saklanmaz", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    mockFetch(() => json(200, { ok: true, role: "manager", token: "mgr.sig" }));
    expect((await api.verifyManagerPin("A", "4826")).ok).toBe(true);
    expect(api.hasManagerSession("A")).toBe(true);
    const dump = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(dump).not.toContain("4826");
  });

  it("yanlış PIN (401 BAD_PIN) cihaz oturumunu SİLMEZ ve kalan hakkı döner", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    mockFetch(() => json(401, { ok: false, code: "BAD_PIN", attemptsLeft: 3, error: "PIN hatalı." }));
    const r = await api.verifyManagerPin("A", "0000");
    expect(r).toMatchObject({ ok: false, code: "BAD_PIN", attemptsLeft: 3 });
    expect(sessionStorage.getItem("propos_token_A")).toBe("t");
  });

  it("PIN kilidi (429) süreyle döner", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    mockFetch(() => json(429, { ok: false, code: "RATE_LIMIT", retryAfter: 200 }, { "Retry-After": "200" }));
    expect(await api.verifyManagerPin("A", "1")).toMatchObject({ code: "RATE_LIMIT", retryAfter: 200 });
  });

  it("PIN değiştirme yönetici belirtecini tercih eder", async () => {
    sessionStorage.setItem("propos_token_A", "cihaz");
    sessionStorage.setItem("propos_mgr_token_A", "yonetici");
    const calls = mockFetch(() => json(200, { ok: true }));
    await api.changeManagerPin("A", "", "9999");
    expect(calls[0].opts.headers["X-ProPos-Token"]).toBe("yonetici");
  });
});
