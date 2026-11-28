import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LoginScreen, LicenseBlockedScreen } from "../../src/components/auth/LoginScreen";
import { PinPad } from "../../src/components/auth/PinPad";
import { DeviceGate } from "../../src/components/auth/DeviceGate";
import { normalizeTenantCode, resolveActiveTenantId } from "../../src/utils/formatters";

describe("işletme kodu normalleştirme", () => {
  it("takma adlar, boşluk, özel karakter, uzunluk", () => {
    expect(normalizeTenantCode("")).toBe("DEFAULT");
    expect(normalizeTenantCode("pickys-master")).toBe("DEFAULT");
    expect(normalizeTenantCode(" kafe-1 ")).toBe("KAFE-1");
    expect(normalizeTenantCode("../<script>x")).toBe("SCRIPTX");
    expect(normalizeTenantCode("A".repeat(99))).toHaveLength(40);
    expect(normalizeTenantCode(null)).toBe("DEFAULT");
  });

  it("kilitli paket URL'deki ?tenant= ile başka işletmeye geçirilemez", () => {
    window.history.replaceState(null, "", "/?tenant=BASKA");
    window.__PROPOS_LOCKED_TENANT__ = "KAFE-1";
    expect(resolveActiveTenantId()).toBe("KAFE-1");
  });

  it("localStorage'a yazılmış kötü değer temizlenir", () => {
    localStorage.setItem("propos_active_tenant_id", "x\"><img src=x onerror=alert(1)>");
    expect(resolveActiveTenantId()).toBe("XIMGSRCXONERRORALERT1");
  });
});

describe("LoginScreen", () => {
  const fill = (u, p) => {
    fireEvent.change(screen.getByLabelText("Kullanıcı adı"), { target: { value: u } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: p } });
  };

  it("ürün adı görünür; parola alanı gizli; boş alanlarla gönderilemez", () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    expect(screen.getByText("ProPos")).toBeTruthy();
    expect(screen.getByLabelText("Parola").getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "Giriş yap" }).disabled).toBe(true);
  });

  it("kullanıcı adını küçük harfe indirip onLogin'e verir; hata mesajını gösterir", async () => {
    const onLogin = vi.fn(async () => ({ ok: false, error: "Kullanıcı adı ya da parola hatalı." }));
    render(<LoginScreen onLogin={onLogin} />);
    fill(" Kasa.Ali ", "parola-123");
    fireEvent.click(screen.getByRole("button", { name: "Giriş yap" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Kullanıcı adı ya da parola hatalı."));
    expect(onLogin).toHaveBeenCalledWith("kasa.ali", "parola-123");
  });

  it("çift gönderim iki istek göndermez", async () => {
    let resolve;
    const onLogin = vi.fn(() => new Promise((r) => { resolve = r; }));
    render(<LoginScreen onLogin={onLogin} />);
    fill("a.b", "parola-123");
    const form = screen.getByRole("form", { name: "Giriş yap" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onLogin).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true }));
  });

  it("XSS: neden/mesaj metni HTML olarak yorumlanmaz", () => {
    const { container } = render(<LoginScreen onLogin={vi.fn()} reason={'<img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("img")).toBe(null);
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeTruthy();
    const lic = render(<LicenseBlockedScreen message={"<script>alert(1)</script>"} onRetry={vi.fn()} />);
    expect(lic.container.querySelector("script")).toBe(null);
  });
});

describe("PinPad", () => {
  it("PIN uzunluğu bilinmez: 4 hanede kendiliğinden gönderilmez", () => {
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(<PinPad onSubmit={onSubmit} onCancel={vi.fn()} />);
    ["1", "2", "3", "4"].forEach((d) => fireEvent.click(screen.getByRole("button", { name: d })));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("PIN").value).toBe("1234");
  });

  it("Giriş ile gönderir; yanlışta kalan hak gösterilir ve alan temizlenir", async () => {
    const onSubmit = vi.fn(async () => ({ ok: false, code: "BAD_PIN", attemptsLeft: 2 }));
    render(<PinPad onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "MAMİ35" } });
    fireEvent.click(screen.getByRole("button", { name: "Giriş" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Kalan deneme: 2"));
    expect(onSubmit).toHaveBeenCalledWith("MAMİ35");
    expect(screen.getByLabelText("PIN").value).toBe("");
  });

  it("boşluk ve 12 karakter sınırı", () => {
    render(<PinPad onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "12 34 56 78 90 12 34" } });
    expect(screen.getByLabelText("PIN").value).toBe("123456789012");
  });

  it("boş PIN gönderilmez", () => {
    const onSubmit = vi.fn();
    render(<PinPad onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("DeviceGate (giriş akışı)", () => {
  const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

  it("oturumsuz cihazda POS hiç gösterilmez, giriş ekranı gelir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { ok: true, app: "ProPos" })));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    await waitFor(() => expect(screen.getByRole("form", { name: "Giriş yap" })).toBeTruthy());
    expect(screen.queryByText("POS-ICERIK")).toBe(null);
  });

  it("sunucu yoksa ve yerel veri yoksa çevrimdışı devam seçeneği sunulmaz", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    await waitFor(() => expect(screen.getByText(/Sunucuya ulaşılamıyor/)).toBeTruthy());
    expect(screen.queryByText("Çevrimdışı devam et")).toBe(null);
  });

  it("oturumlu cihazda uygulama açılır; oturum düşünce giriş ekranı üstte açılır (iş kaybolmaz)", async () => {
    localStorage.setItem("propos_session", JSON.stringify({ token: "t", tenantId: "DEFAULT", username: "kasa" }));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    expect(await screen.findByText("POS-ICERIK")).toBeTruthy();
    act(() => { window.dispatchEvent(new CustomEvent("propos-auth-required", { detail: { tenantId: "DEFAULT" } })); });
    expect(screen.getByText(/Oturum sona erdi/)).toBeTruthy();
    expect(screen.getByText("POS-ICERIK")).toBeTruthy();
  });

  it("başarılı giriş oturumu kaydeder ve uygulamayı açar", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => (String(url).includes("/api/auth/login")
      ? json(200, { ok: true, token: "tok", tenantId: "DEFAULT", username: "kasa.ali", userRole: "staff" })
      : json(200, { ok: true, app: "ProPos" }))));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    await screen.findByRole("form", { name: "Giriş yap" });
    fireEvent.change(screen.getByLabelText("Kullanıcı adı"), { target: { value: "kasa.ali" } });
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "parola-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Giriş yap" }));
    expect(await screen.findByText("POS-ICERIK")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("propos_session")).token).toBe("tok");
  });

  it("lisans olayı lisans ekranını açar", async () => {
    localStorage.setItem("propos_session", JSON.stringify({ token: "t", tenantId: "DEFAULT", username: "kasa" }));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    await screen.findByText("POS-ICERIK");
    act(() => { window.dispatchEvent(new CustomEvent("propos-license-blocked", { detail: { message: "Lisans süresi dolmuş." } })); });
    expect(screen.getByText("Lisans etkin değil")).toBeTruthy();
    expect(screen.getByText("Lisans süresi dolmuş.")).toBeTruthy();
  });
});
