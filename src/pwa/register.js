// Service worker kaydı. Yalnızca güvenli bağlamda (HTTPS ya da localhost) çalışır; düz http://LAN-IP'de tarayıcı izin vermez
// (IndexedDB ve çevrimdışı çalışma yine çalışır, yalnızca "çevrimdışıyken sayfayı yeniden aç" ve "kur" özelliği yoktur).
export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      const notify = () => window.dispatchEvent(new CustomEvent("propos-sw-update", {
        detail: { apply: () => { window.__PROPOS_SW_APPLYING__ = true; if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); } }
      }));
      if (reg.waiting && navigator.serviceWorker.controller) notify();
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) notify(); });
      });
      // Yeni SW devralınca (yalnızca kullanıcı onayladıysa) sayfa bir kez yenilenir.
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded || !window.__PROPOS_SW_APPLYING__) return;
        reloaded = true;
        window.location.reload();
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); // saatte bir güncelleme kontrolü
    }).catch(() => {});
  });
}
