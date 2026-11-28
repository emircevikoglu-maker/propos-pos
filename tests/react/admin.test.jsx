import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginScreen, TenantEditor, UsersCell } from "../../src/admin/AdminApp";
import * as adminApi from "../../src/admin/adminApi";
import { validateTenantForm, extendExpiry, daysLeft, licenseBadge, normalizeCode } from "../../src/admin/validation";

const NOW = Date.parse("2026-11-24T12:00:00Z");

describe("kontrol paneli doğrulama", () => {
  const ok = { tenantId: "KAFE-1", businessName: "Kafe", planType: "yearly", status: "active", expiresAt: "2027-01-01", initialPin: "1234" };

  it("geçerli form hatasız", () => {
    expect(validateTenantForm(ok, { isNew: true })).toEqual({});
  });

  it("hatalı alanlar yakalanır", () => {
    const e = validateTenantForm({ tenantId: "k", businessName: " ", planType: "free", status: "root", expiresAt: "yarın", initialPin: "1 2" }, { isNew: true });
    expect(Object.keys(e).sort()).toEqual(["businessName", "expiresAt", "initialPin", "planType", "status", "tenantId"]);
  });

  it("yeni işletmede PIN zorunlu, düzenlemede değil", () => {
    expect(validateTenantForm({ ...ok, initialPin: "" }, { isNew: true }).initialPin).toBeTruthy();
    expect(validateTenantForm({ ...ok, initialPin: "" }, { isNew: false })).toEqual({});
  });

  it("işletme adı bayt sınırı (Türkçe karakter 2 bayt)", () => {
    expect(validateTenantForm({ ...ok, businessName: "ş".repeat(61) }).businessName).toBeTruthy();
    expect(validateTenantForm({ ...ok, businessName: "ş".repeat(60) }).businessName).toBeUndefined();
  });

  it("kod normalleştirme", () => {
    expect(normalizeCode("kafe 1!<x>")).toBe("KAFE1X");
  });

  it("lisans uzatma: gelecekteki bitişe eklenir, geçmişteyse bugünden", () => {
    expect(extendExpiry("2026-12-24T00:00:00Z", 30, NOW)).toBe("2027-01-23");
    expect(extendExpiry("2020-01-01", 30, NOW)).toBe("2026-12-24");
    expect(extendExpiry("unlimited", 30, NOW)).toBe("2026-12-24");
    expect(extendExpiry("çöp", 1, NOW)).toBe("2026-11-25");
  });

  it("kalan gün ve rozet", () => {
    expect(daysLeft("unlimited", NOW)).toBe(null);
    expect(daysLeft("2026-11-30T12:00:00Z", NOW)).toBe(6);
    expect(licenseBadge({ status: "suspended", expiresAt: "unlimited" }, NOW).tone).toBe("danger");
    expect(licenseBadge({ status: "active", expiresAt: "2026-11-30T12:00:00Z" }, NOW).tone).toBe("warn");
    expect(licenseBadge({ status: "active", expiresAt: "2020-01-01" }, NOW).label).toBe("Süresi doldu");
  });
});

describe("kontrol paneli arayüzü", () => {
  it("giriş: hata ve kilit mesajı; anahtar gizli alan", async () => {
    const onLogin = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("Anahtar hatalı."), { code: "BAD_KEY" }))
      .mockRejectedValueOnce(Object.assign(new Error("x"), { code: "RATE_LIMIT", retryAfter: 120 }));
    render(<LoginScreen onLogin={onLogin} />);
    const input = screen.getByPlaceholderText("PROPOS-XXXX-XXXX-XXXX");
    expect(input.getAttribute("type")).toBe("password");
    fireEvent.change(input, { target: { value: "yanlis" } });
    fireEvent.click(screen.getByRole("button", { name: "Giriş" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Anahtar hatalı."));
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "yanlis2" } });
    fireEvent.click(screen.getByRole("button", { name: "Giriş" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("120 sn"));
  });

  it("yeni işletme formu: geçersizken gönderilmez; kod yazarken normalleşir", async () => {
    const onSave = vi.fn(async () => ({}));
    render(<TenantEditor initial={null} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("KAFE-101"), { target: { value: "kafe 101!" } });
    expect(screen.getByPlaceholderText("KAFE-101").value).toBe("KAFE101");
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("İşletme adı gerekli")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Örn. Kahve Durağı"), { target: { value: "Kahve" } });
    fireEvent.change(screen.getByPlaceholderText("4-12 karakter"), { target: { value: "4826" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ tenantId: "KAFE101", businessName: "Kahve", initialPin: "4826", mustBeNew: true });
  });

  it("düzenleme: kod kilitli, boş PIN gönderilmez, sunucu hatası gösterilir", async () => {
    const onSave = vi.fn(async () => { throw new Error("Geçersiz bitiş tarihi."); });
    render(<TenantEditor initial={{ tenantId: "KAFE-1", businessName: "Kafe", planType: "yearly", status: "active", expiresAt: "unlimited", syncKey: "SYNC-X" }} onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue("KAFE-1").disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Geçersiz bitiş tarihi."));
    expect("initialPin" in onSave.mock.calls[0][0]).toBe(false);
    expect(onSave.mock.calls[0][0].mustBeNew).toBe(false);
  });

  it("adminApi: 401 oturumu siler ve çıkış olayı yayınlar; belirteç sessionStorage'da", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, token: "f.t" }), { status: 200 })));
    await adminApi.login("KEY");
    expect(sessionStorage.getItem("propos_control_token")).toBe("f.t");
    expect(localStorage.length).toBe(0);
    const out = vi.fn();
    window.addEventListener("propos-control-logout", out);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, code: "AUTH" }), { status: 401 })));
    await expect(adminApi.listTenants()).rejects.toThrow();
    expect(sessionStorage.getItem("propos_control_token")).toBe(null);
    expect(out).toHaveBeenCalled();
    window.removeEventListener("propos-control-logout", out);
  });
});

describe("kontrol paneli kullanıcıları (3.9.0)", () => {
  const tenant = { tenantId: "KAFE-1", users: [{ username: "kasa.ali", displayName: "Ali", role: "staff", active: true, lastLoginAt: "" }] };

  it("yeni kullanıcı formu işletme koduyla kaydeder; kısa parolada kaydet kapalı", async () => {
    const spy = vi.spyOn(adminApi, "saveUser").mockResolvedValue({ ok: true, tenants: [] });
    const run = vi.fn((p) => p);
    render(<UsersCell tenant={tenant} run={run} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Kullanıcı" }));
    fireEvent.change(screen.getByLabelText("Kullanıcı adı"), { target: { value: "Garson.Can" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "kisa" } });
    expect(screen.getByRole("button", { name: "Kaydet" }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "parola-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "KAFE-1", username: "garson.can", password: "parola-123", role: "staff" })));
    spy.mockRestore();
  });

  it("kapat düğmesi kullanıcıyı parolasız günceller (aktif=false)", async () => {
    const spy = vi.spyOn(adminApi, "saveUser").mockResolvedValue({ ok: true, tenants: [] });
    render(<UsersCell tenant={tenant} run={(p) => p} />);
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ tenantId: "KAFE-1", username: "kasa.ali", displayName: "Ali", role: "staff", active: false }));
    spy.mockRestore();
  });
});
