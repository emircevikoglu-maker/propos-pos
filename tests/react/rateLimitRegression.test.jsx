// Gerileme testleri: "React tarafı API'yi patlatıyor" sorunu (giriş fırtınası + tuş başına tam POST).
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/services/apiService";
import { PinPad } from "../../src/components/auth/PinPad";

const json = (s, b, h = {}) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...h } });
beforeEach(() => api._resetApiStateForTests());

describe("giriş fırtınası", () => {
  it("geçersiz kayıtlı anahtar yalnızca BİR kez denenir, sonra silinir (IP kilidi oluşmaz)", async () => {
    localStorage.setItem("propos_sync_key_A", "SYNC-ESKI");
    const fetchMock = vi.fn(async () => json(401, { ok: false, code: "BAD_KEY" }));
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 10; i++) await api.fetchTenantSync("A", 0, "d");
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/api/login"))).toHaveLength(1);
    expect(localStorage.getItem("propos_sync_key_A")).toBe(null);
    expect(api.isDevicePaired("A")).toBe(false);
  });

  it("kilitli pakette gömülü anahtar silinemez ama yine de tekrar denenmez", async () => {
    window.__PROPOS_LOCKED_TENANT__ = "A";
    window.__PROPOS_SYNC_KEY__ = "SYNC-GOMULU";
    const fetchMock = vi.fn(async () => json(401, { ok: false, code: "BAD_KEY" }));
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 5; i++) await api.fetchTenantSync("A", 0, "d");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("yeniden eşleştirme reddedilen anahtar listesini temizler", async () => {
    localStorage.setItem("propos_sync_key_A", "SYNC-X");
    vi.stubGlobal("fetch", vi.fn(async () => json(401, { ok: false, code: "BAD_KEY" })));
    await api.fetchTenantSync("A", 0, "d");
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { ok: true, role: "tenant", token: "t" })));
    expect((await api.pairDevice("A", "SYNC-X")).ok).toBe(true);
    expect(api.getStoredSyncKey("A")).toBe("SYNC-X");
  });

  it("giriş 429 dönerse yoklama ve gönderim Retry-After boyunca durur", async () => {
    localStorage.setItem("propos_sync_key_A", "SYNC-K");
    const fetchMock = vi.fn(async () => json(429, { ok: false, code: "RATE_LIMIT", retryAfter: 120 }, { "Retry-After": "120" }));
    vi.stubGlobal("fetch", fetchMock);
    await api.fetchTenantSync("A", 0, "d");
    await api.fetchTenantSync("A", 0, "d");
    await api.pushTenantSync("A", "d", 1, "{}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("propos_sync_key_A")).toBe("SYNC-K");
  });
});

describe("gönderim kuyruğu (debounce)", () => {
  it("hızlı 20 değişiklik → tek POST, son durumla", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("propos_token_A", "t");
    const fetchMock = vi.fn(async () => json(200, { ok: true, rev: 5 }));
    vi.stubGlobal("fetch", fetchMock);
    const done = vi.fn();
    for (let i = 0; i < 20; i++) { api.queuePush("A", "d", i, `{"v":${i}}`, done); await vi.advanceTimersByTimeAsync(100); }
    expect(api.hasPendingPush()).toBe(true);
    await vi.advanceTimersByTimeAsync(api.PUSH_DEBOUNCE_MS + 50);
    const posts = fetchMock.mock.calls.filter(([, o]) => o && o.method === "POST");
    expect(posts.length).toBeLessThanOrEqual(1 + Math.ceil(2000 / api.PUSH_MAX_WAIT_MS));
    expect(posts.at(-1)[1].body).toBe('{"v":19}');
    expect(done).toHaveBeenCalledWith({ ok: true, rev: 5 });
    expect(api.hasPendingPush()).toBe(false);
  });

  it("sürekli yazmada bile en geç PUSH_MAX_WAIT_MS içinde gönderilir (veri bekletilmez)", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("propos_token_A", "t");
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    for (let t = 0; t < api.PUSH_MAX_WAIT_MS + 400; t += 200) { api.queuePush("A", "d", t, `{"t":${t}}`); await vi.advanceTimersByTimeAsync(200); }
    expect(fetchMock.mock.calls.filter(([, o]) => o && o.method === "POST").length).toBeGreaterThanOrEqual(1);
  });

  it("flushQueuedPush bekleyeni hemen gönderir (sayfa kapanırken)", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    api.queuePush("A", "d", 1, '{"son":1}');
    await api.flushQueuedPush();
    expect(fetchMock.mock.calls[0][1].body).toBe('{"son":1}');
    expect(await api.flushQueuedPush()).toBe(null);
  });
});

describe("ilk PIN kurulumu (veri sıfırlandıktan sonra kilitlenme olmasın)", () => {
  it("NO_PIN → aynı PIN tekrar istenir → onSetup çağrılır", async () => {
    const onSubmit = vi.fn(async () => ({ ok: false, code: "NO_PIN" }));
    const onSetup = vi.fn(async () => ({ ok: true }));
    render(<PinPad onSubmit={onSubmit} onSetup={onSetup} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("PIN");
    fireEvent.change(input, { target: { value: "2468" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/henüz yönetici PIN/));
    fireEvent.change(input, { target: { value: "2468" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(onSetup).toHaveBeenCalledWith("2468"));
  });

  it("ikinci giriş farklıysa kaydedilmez", async () => {
    const onSetup = vi.fn();
    render(<PinPad onSubmit={async () => ({ ok: false, code: "NO_PIN" })} onSetup={onSetup} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("PIN");
    fireEvent.change(input, { target: { value: "2468" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => screen.getByRole("status"));
    fireEvent.change(input, { target: { value: "1357" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/eşleşmedi/));
    expect(onSetup).not.toHaveBeenCalled();
  });
});
