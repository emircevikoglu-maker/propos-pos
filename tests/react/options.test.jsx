import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentSheet } from "../../src/ui/ContentSheet";
import { ProductOptionsEditor } from "../../src/components/settings/ProductOptionsEditor";

const latte = {
  id: "prd-1", name: "Latte", price: 95, image: "☕", options: [
    { id: "og-size", name: "Boy", type: "single", required: true, choices: [{ id: "s", name: "Küçük", price: 0 }, { id: "l", name: "Büyük", price: 20 }] },
    { id: "og-extra", name: "Ekstra", type: "multi", required: false, max: 1, choices: [{ id: "shot", name: "Shot", price: 15 }, { id: "car", name: "Karamel", price: 10 }] }
  ]
};

// Eski OptionPicker davranışları (3.10.0'da ContentSheet'e taşındı).
const open = (product, props = {}) => render(<ContentSheet product={product} onClose={vi.fn()} onConfirm={vi.fn()} {...props} />);

describe("çeşit seçimi (ContentSheet)", () => {
  it("varsayılan seçimle hemen eklenebilir (2 dokunuş)", () => {
    const onConfirm = vi.fn();
    open(latte, { onConfirm });
    fireEvent.click(screen.getByRole("button", { name: /Ekle · ₺95/ }));
    expect(onConfirm.mock.calls[0][0].selection).toEqual({ "og-size": ["s"], "og-extra": [] });
  });

  it("seçim toplamı günceller; çoklu grupta sınır aşılmaz", () => {
    open(latte);
    fireEvent.click(screen.getByRole("button", { name: /Büyük/ }));
    fireEvent.click(screen.getByRole("button", { name: /Shot/ }));
    fireEvent.click(screen.getByRole("button", { name: /Karamel/ }));
    expect(screen.getByRole("button", { name: /Ekle · ₺130/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Karamel/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("zorunlu seçim boşaltılamaz", () => {
    open(latte);
    fireEvent.click(screen.getByRole("button", { name: /Küçük/ }));
    expect(screen.getByRole("button", { name: /Küçük/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^Ekle/ }).disabled).toBe(false);
  });

  it("Escape pencereyi kapatır, ekleme yapmaz", () => {
    const onClose = vi.fn(), onConfirm = vi.fn();
    open(latte, { onClose, onConfirm });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("XSS: ürün/seçenek adındaki HTML metin olarak kalır", () => {
    const evil = { ...latte, name: "<img src=x onerror=alert(1)>", options: [{ id: "g", name: "<b>G</b>", type: "single", required: true, choices: [{ id: "c", name: "<script>alert(1)</script>", price: 0 }] }] };
    open(evil);
    expect(document.querySelector(".sheet img, .sheet script, .sheet b")).toBe(null);
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });

  it("bozuk seçenek verisi çökertmez", () => {
    const broken = { id: "x", name: "X", price: "abc", options: [null, { name: "G", choices: "nope" }, { name: "H", choices: [{ name: "c", price: "NaN" }] }] };
    open(broken);
    expect(screen.getByRole("button", { name: /Ekle · ₺0/ })).toBeTruthy();
  });
});

describe("ProductOptionsEditor", () => {
  function Harness({ initial = [], onValue }) {
    const [v, setV] = React.useState(initial);
    return <ProductOptionsEditor value={v} onChange={(n) => { setV(n); onValue && onValue(n); }} />;
  }

  it("hazır 'Boy' grubu eklenir, ikinci kez eklenemez", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Boy" }));
    const groups = onValue.mock.calls.at(-1)[0];
    expect(groups).toHaveLength(1);
    expect(groups[0].choices.map((c) => c.name)).toEqual(["Küçük", "Orta", "Büyük"]);
    expect(screen.getByRole("button", { name: "+ Boy" }).disabled).toBe(true);
  });

  it("seçenek ekleme, fiyat düzenleme ve grup silme", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Süt" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Seçenek ekle" }));
    const names = screen.getAllByLabelText("Seçenek adı");
    fireEvent.change(names.at(-1), { target: { value: "Hindistan cevizi" } });
    fireEvent.change(screen.getAllByLabelText("Fiyat farkı").at(-1), { target: { value: "17.5" } });
    const last = onValue.mock.calls.at(-1)[0][0].choices.at(-1);
    expect(last).toMatchObject({ name: "Hindistan cevizi", price: 17.5 });
    fireEvent.click(screen.getByRole("button", { name: "Grubu sil" }));
    expect(onValue.mock.calls.at(-1)[0]).toEqual([]);
  });

  it("son seçenek silinemez; grup adı 40 karakterle sınırlı", () => {
    render(<Harness initial={[{ id: "g", name: "", type: "single", required: false, max: 1, choices: [{ id: "c", name: "a", price: 0 }] }]} />);
    expect(screen.getByRole("button", { name: "Seçeneği sil" }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Grup adı"), { target: { value: "x".repeat(100) } });
    expect(screen.getByLabelText("Grup adı").value).toHaveLength(40);
  });
});
