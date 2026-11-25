import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { FeedbackSheet } from "../../src/components/auth/FeedbackSheet";
import * as api from "../../src/services/apiService";

const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const open = () => act(() => { window.dispatchEvent(new CustomEvent("propos-open-feedback")); });
beforeEach(() => api._resetApiStateForTests());

describe("FeedbackSheet", () => {
  it("menüden olay gelene kadar görünmez (POS akışını bölmez)", () => {
    render(<FeedbackSheet tenantId="A" screen="pos" />);
    expect(screen.queryByRole("dialog")).toBe(null);
    open();
    expect(screen.getByRole("dialog", { name: "Geri bildirim" })).toBeTruthy();
  });

  it("tür seçip gönderir: gövde tür, not ve ekranı taşır", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackSheet tenantId="A" screen="inventory" />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Yavaş" }));
    fireEvent.change(screen.getByLabelText("Not"), { target: { value: "  Liste geç açılıyor " } });
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Teşekkürler/));
    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain("/api/feedback?tenantId=A");
    expect(JSON.parse(call[1].body)).toEqual({ kind: "slow", text: "Liste geç açılıyor", screen: "inventory" });
  });

  it("not 300 karakterle sınırlı; sunucu hatasında uyarı gösterir ve tekrar denenebilir", async () => {
    sessionStorage.setItem("propos_token_A", "t");
    vi.stubGlobal("fetch", vi.fn(async () => json(500, { ok: false })));
    render(<FeedbackSheet tenantId="A" screen="pos" />);
    open();
    fireEvent.change(screen.getByLabelText("Not"), { target: { value: "x".repeat(900) } });
    expect(screen.getByLabelText("Not").value).toHaveLength(300);
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Gönderilemedi/));
    expect(screen.getByRole("button", { name: "Gönder" }).disabled).toBe(false);
  });

  it("XSS: not metni HTML olarak yorumlanmaz", () => {
    const { container } = render(<FeedbackSheet tenantId="A" screen="pos" />);
    open();
    fireEvent.change(screen.getByLabelText("Not"), { target: { value: "<img src=x onerror=alert(1)>" } });
    expect(container.querySelector("img")).toBe(null);
  });
});
