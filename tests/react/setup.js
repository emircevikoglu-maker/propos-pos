import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  delete window.__PROPOS_LOCKED_TENANT__;
  delete window.__PROPOS_SYNC_KEY__;
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
