import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PairingScreen, LicenseBlockedScreen } from "../../src/components/auth/PairingScreen";
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

describe("PairingScreen", () => {
  it("ürün adı ProPos görünür; anahtar alanı gizli; anahtarsız gönderilemez", () => {
    render(<PairingScreen onPair={vi.fn()} />);
    expect(screen.getByText("ProPos")).toBeTruthy();
    const key = screen.getByPlaceholderText("SYNC-XXXX-XXXX-XXXX");
    expect(key.getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "Bağlan" }).disabled).toBe(true);
  });

  it("kodu normalleştirip onPair'e verir; hata mesajını gösterir", async () => {
    const onPair = vi.fn(async () => ({ ok: false, error: "Anahtar hatalı." }));
    render(<PairingScreen onPair={onPair} />);
    fireEvent.change(screen.getByPlaceholderText(/KAFE-101/), { target: { value: "kafe-1!" } });
    fireEvent.change(screen.getByPlaceholderText("SYNC-XXXX-XXXX-XXXX"), { target: { value: " SYNC-A " } });
    fireEvent.click(screen.getByRole("button", { name: "Bağlan" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Anahtar hatalı."));
    expect(onPair).toHaveBeenCalledWith("KAFE-1", "SYNC-A");
  });

  it("boş kod ana işletmeye (DEFAULT) bağlanır", async () => {
    const onPair = vi.fn(async () => ({ ok: true }));
    render(<PairingScreen onPair={onPair} />);
    fireEvent.change(screen.getByPlaceholderText("SYNC-XXXX-XXXX-XXXX"), { target: { value: "K" } });
    fireEvent.click(screen.getByRole("button", { name: "Bağlan" }));
    await waitFor(() => expect(onPair).toHaveBeenCalledWith("DEFAULT", "K"));
  });

  it("çift tıklama iki istek göndermez", async () => {
    let resolve;
    const onPair = vi.fn(() => new Promise((r) => { resolve = r; }));
    render(<PairingScreen onPair={onPair} />);
    fireEvent.change(screen.getByPlaceholderText("SYNC-XXXX-XXXX-XXXX"), { target: { value: "K" } });
    const form = screen.getByRole("form", { name: "İşletmeye bağlan" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onPair).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true }));
  });

  it("kilitli kurulumda kod değiştirilemez", () => {
    render(<PairingScreen onPair={vi.fn()} initialTenantId="KAFE-1" locked />);
    expect(screen.getByDisplayValue("KAFE-1").disabled).toBe(true);
  });

  it("XSS: neden/mesaj metni HTML olarak yorumlanmaz", () => {
    const { container } = render(<PairingScreen onPair={vi.fn()} reason={'<img src=x onerror="alert(1)">'} />);
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

  it("eşleşmemiş cihazda POS hiç gösterilmez, eşleştirme ekranı gelir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { ok: true, app: "ProPos" })));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    await waitFor(() => expect(screen.getByText("Bu cihazı işletmenize bağlayın")).toBeTruthy());
    expect(screen.queryByText("POS-ICERIK")).toBe(null);
  });

  it("sunucu yoksa ve yerel veri yoksa çevrimdışı devam seçeneği sunulmaz", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    await waitFor(() => expect(screen.getByText(/Sunucuya ulaşılamıyor/)).toBeTruthy());
    expect(screen.queryByText("Çevrimdışı devam et")).toBe(null);
  });

  it("eşleşmiş cihazda uygulama açılır; anahtar geçersizleşince eşleştirme ekranı üstte açılır", async () => {
    localStorage.setItem("propos_sync_key_DEFAULT", "SYNC-K");
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    expect(screen.getByText("POS-ICERIK")).toBeTruthy();
    act(() => { window.dispatchEvent(new CustomEvent("propos-auth-required", { detail: { tenantId: "DEFAULT" } })); });
    expect(screen.getByText(/anahtarı geçersiz ya da yenilendi/)).toBeTruthy();
    expect(screen.getByText("POS-ICERIK")).toBeTruthy();
  });

  it("lisans olayı lisans ekranını açar", () => {
    localStorage.setItem("propos_sync_key_DEFAULT", "SYNC-K");
    render(<DeviceGate><div>POS-ICERIK</div></DeviceGate>);
    act(() => { window.dispatchEvent(new CustomEvent("propos-license-blocked", { detail: { message: "Lisans süresi dolmuş." } })); });
    expect(screen.getByText("Lisans etkin değil")).toBeTruthy();
    expect(screen.getByText("Lisans süresi dolmuş.")).toBeTruthy();
  });
});
