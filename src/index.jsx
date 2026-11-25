import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { registerServiceWorker } from "./pwa/register";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ProPos ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080706] text-stone-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-stone-900 border border-rose-500/40 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-rose-400">Beklenmeyen Bir Hata Oluştu</h2>
            <pre className="text-xs text-stone-300 bg-stone-950 p-3 rounded-xl overflow-x-auto">
              {String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-stone-950 font-medium text-xs"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function mountProPos() {
  if (window.__PROPOS_MOUNTED__) return;
  window.__PROPOS_MOUNTED__ = true;
  const container = document.getElementById("root");
  if (!container) return;
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

registerServiceWorker();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountProPos);
  } else {
    mountProPos();
  }
}
