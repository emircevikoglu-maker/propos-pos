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
        <div className="auth-wrap">
          <div className="card auth-card">
            <span className="auth-brand">ProPos</span>
            <h2 className="auth-title">Beklenmeyen bir hata oluştu</h2>
            <pre className="error-pre">{String(this.state.error)}</pre>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => window.location.reload()}>Sayfayı yenile</button>
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
