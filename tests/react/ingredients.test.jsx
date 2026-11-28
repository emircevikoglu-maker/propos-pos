import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { validateIngredient, unitCostFromPurchase, removeIngredientFromProducts, ingredientUsage, upsertRecipeRow, cleanRecipe, parseDecimal } from "../../src/utils/ingredients";

let ctx = {};
vi.mock("../../src/context/PosContext", () => ({ usePos: () => ctx }));
import { RecipeEditor } from "../../src/ui/settings/RecipeEditor";
import { IngredientSheet } from "../../src/ui/IngredientSheet";
import { StockView } from "../../src/ui/StockView";

const milk = { id: "i1", name: "Süt", unit: "ml", stock: 1000, minLimit: 100, unitCost: 0.05 };
const beans = { id: "i2", name: "Çekirdek", unit: "gr", stock: 500, minLimit: 50, unitCost: 0.8 };

describe("malzeme kuralları", () => {
  it("doğrulama: ad, birim, negatif sayı, aynı ad (büyük/küçük harf duyarsız, Türkçe)", () => {
    expect(validateIngredient({ name: " ", unit: "" }).errors).toMatchObject({ name: expect.any(String), unit: expect.any(String) });
    expect(validateIngredient({ name: "SÜT", unit: "ml" }, [milk]).ok).toBe(false);
    expect(validateIngredient({ name: "SÜT", unit: "ml" }, [milk], "i1").ok).toBe(true);
    expect(validateIngredient({ name: "Şeker", unit: "gr", unitCost: "-1" }).errors.unitCost).toBeTruthy();
    expect(validateIngredient({ name: "Şeker", unit: "gr", stock: "1.500,5", unitCost: "0,04" }).value).toMatchObject({ stock: 1500.5, minLimit: 0, unitCost: 0.04 });
  });
  it("ondalık virgül ve alıştan birim maliyet", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("abc")).toBeNaN();
    expect(unitCostFromPurchase("850", "1000")).toBe(0.85);
    expect(unitCostFromPurchase("850", "0")).toBe(null);
  });
  it("silinen malzeme ürün ve çeşit reçetelerinden çıkar; ilgisiz ürün aynı nesne kalır", () => {
    const a = { id: "a", recipe: [{ ingredientId: "i1", amount: 1 }, { ingredientId: "i2", amount: 2 }] };
    const b = { id: "b", recipe: [], options: [{ id: "g", choices: [{ id: "c", recipe: [{ ingredientId: "i1", amount: 3 }] }] }] };
    const c = { id: "c", recipe: [{ ingredientId: "i2", amount: 1 }] };
    expect(ingredientUsage([a, b, c], "i1").map((p) => p.id)).toEqual(["a", "b"]);
    const out = removeIngredientFromProducts([a, b, c], "i1");
    expect(out[0].recipe).toEqual([{ ingredientId: "i2", amount: 2 }]);
    expect(out[1].options[0].choices[0].recipe).toEqual([]);
    expect(out[2]).toBe(c);
  });
  it("reçetede aynı malzeme iki kez olmaz; geçersiz miktar yok sayılır", () => {
    const r = upsertRecipeRow([], "i1", "200");
    expect(upsertRecipeRow(r, "i1", "220")).toEqual([{ ingredientId: "i1", amount: 220 }]);
    expect(upsertRecipeRow(r, "i2", "0")).toBe(r);
    expect(cleanRecipe([{ ingredientId: "i1", amount: "18,5", fixed: true }, { ingredientId: "i2", amount: "" }])).toEqual([{ ingredientId: "i1", amount: 18.5, fixed: true }]);
  });
});

describe("RecipeEditor", () => {
  function Harness({ onCreate, onValue }) {
    const [v, setV] = React.useState([{ ingredientId: "i1", amount: 200 }]);
    return <RecipeEditor value={v} onChange={(n) => { setV(n); onValue(n); }} ingredients={[milk, beans]} price="100" onCreate={onCreate} />;
  }
  it("maliyeti gösterir; miktar yerinde değişir; çıkarılabilirlik kapatılır; yeni satır eklenir", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} onCreate={vi.fn()} />);
    expect(screen.getByText(/10 ₺ · brüt kâr/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Süt miktarı"), { target: { value: "250" } });
    expect(onValue.mock.calls.at(-1)[0][0].amount).toBe("250");
    fireEvent.click(screen.getByRole("button", { name: "Süt satışta çıkarılabilir" }));
    expect(onValue.mock.calls.at(-1)[0][0].fixed).toBe(true);
    fireEvent.change(screen.getByLabelText("Malzeme"), { target: { value: "i2" } });
    fireEvent.change(screen.getByLabelText("Miktar"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: /Reçeteye ekle/ }));
    expect(onValue.mock.calls.at(-1)[0].map((r) => r.ingredientId)).toEqual(["i1", "i2"]);
  });
  it("listede olmayan malzeme ürün penceresinden tanımlanır", () => {
    const onCreate = vi.fn(() => "i9");
    render(<Harness onValue={vi.fn()} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: /yeni malzeme tanımla/ }));
    fireEvent.change(screen.getByLabelText("Yeni malzeme adı"), { target: { value: "Yulaf sütü" } });
    fireEvent.change(screen.getByLabelText("Yeni malzeme birim maliyeti"), { target: { value: "0,09" } });
    fireEvent.click(screen.getByRole("button", { name: "Tanımla" }));
    expect(onCreate).toHaveBeenCalledWith({ name: "Yulaf sütü", unit: "gr", stock: 0, minLimit: 0, unitCost: 0.09 });
  });
});

describe("IngredientSheet ve Stok girişi", () => {
  const wrap = (el) => render(<MemoryRouter>{el}</MemoryRouter>);
  it("yeni malzeme: hata gösterir, geçerliyse kaydeder", () => {
    const onClose = vi.fn();
    ctx = { ingredients: [milk], products: [], handleSaveIngredient: vi.fn(), handleDeleteIngredient: vi.fn() };
    wrap(<IngredientSheet ingredient={null} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Malzemeyi ekle" }));
    expect(screen.getByText("Malzeme adını yazın.")).toBeTruthy();
    expect(ctx.handleSaveIngredient).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText("Yulaf sütü"), { target: { value: "Badem sütü" } });
    fireEvent.click(screen.getByRole("button", { name: "ml" }));
    fireEvent.click(screen.getByRole("button", { name: "Malzemeyi ekle" }));
    expect(ctx.handleSaveIngredient).toHaveBeenCalledWith(expect.objectContaining({ name: "Badem sütü", unit: "ml" }), undefined);
    expect(onClose).toHaveBeenCalled();
  });
  it("düzenleme: kullanım sayısı uyarısı ve silme", () => {
    ctx = { ingredients: [milk], products: [{ id: "p", recipe: [{ ingredientId: "i1", amount: 1 }] }], handleSaveIngredient: vi.fn(), handleDeleteIngredient: vi.fn() };
    wrap(<IngredientSheet ingredient={milk} onClose={vi.fn()} />);
    expect(screen.getByText(/1 ürünün reçetesinde/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sil/ }));
    expect(ctx.handleDeleteIngredient).toHaveBeenCalledWith("i1");
  });
  it("yönetici kilidi kapalıyken Yeni malzeme pencere açmaz", () => {
    ctx = { ingredients: [milk], criticalIngredients: [], products: [], stockLog: [], requireAdmin: vi.fn(() => false) };
    wrap(<StockView />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni malzeme/ }));
    expect(ctx.requireAdmin).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBe(null);
  });
});
