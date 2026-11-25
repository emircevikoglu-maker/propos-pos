/* ProPos service worker — uygulama kabuğu önbelleği (çevrimdışı AÇILIŞ için). __VERSION__ derlemede içerik özetiyle değişir.
   Kurallar:
   - /api/* ASLA önbelleğe alınmaz ve SW tarafından yönlendirilmez (veri güncelliği + kimlik güvenliği).
   - Sayfa gezintisi: ağ-öncelikli (3 sn zaman aşımı) → başarısızsa önbellekteki kabuk ("/").
   - Statik dosyalar: önbellek-öncelikli.
   - Yeni sürüm HEMEN devreye girmez (satış ortasında sayfa yenilenmesin): kullanıcı "Yeni sürümü uygula" der → SKIP_WAITING. */
const VERSION = "__VERSION__";
const CACHE = "propos-shell-" + VERSION;
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("propos-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "GET_VERSION" && event.source) event.source.postMessage({ type: "VERSION", version: VERSION });
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function navigate(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (res && res.ok && res.type === "basic") cache.put("/", res.clone()); // tek sayfa: her yol aynı kabuk
    return res;
  } catch (e) {
    const cached = await cache.match("/");
    if (cached) return cached;
    return new Response("ProPos çevrimdışı ve önbellekte uygulama yok. Bağlantı gelince yeniden açın.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // asla önbellek/yönlendirme yok
  if (req.mode === "navigate") { event.respondWith(navigate(req)); return; }
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (c) => (await c.match(url.pathname)) || fetch(req)));
  }
});
