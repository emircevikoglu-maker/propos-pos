// ProPos derleme: React (production) + Tailwind (derlenmiş CSS) -> tek dosya dist/index.html
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
fs.mkdirSync(distDir, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const bundle = (entry) => esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2019",
  jsx: "automatic",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"production"', __APP_VERSION__: JSON.stringify(pkg.version), __API_URL__: JSON.stringify(process.env.PROPOS_API_URL || "") },
  legalComments: "none"
}).outputFiles[0].text;

// 1) JS — POS ve kontrol paneli AYRI paketler (POS paketinde panel kodu yok)
const js = bundle(path.join(root, "src", "index.jsx"));
const adminJs = bundle(path.join(root, "src", "admin", "index.jsx"));

// 2) CSS (yalnızca kullanılan Tailwind sınıfları)
const cssTmp = path.join(distDir, "_app.css");
execFileSync(process.execPath, [
  path.join(root, "node_modules", "tailwindcss", "lib", "cli.js"),
  "-c", path.join(root, "tailwind.config.js"),
  "-i", path.join(root, "src", "styles", "base.css"),
  "-o", cssTmp, "--minify"
], { stdio: "inherit" });
const readDesign = (files) => files.map((f) => fs.readFileSync(path.join(root, "src", "design", f), "utf8")).join(String.fromCharCode(10));
const baseCss = fs.readFileSync(cssTmp, "utf8") + String.fromCharCode(10);
fs.unlinkSync(cssTmp);
// POS yalnızca prototip tasarım sistemiyle; skin.css (eski Tailwind sınıflarını boyayan katman) yalnızca kontrol panelinde kaldı.
const css = baseCss + readDesign(["ui.css", "ui-extra.css"]);
const adminCss = baseCss + readDesign(["ui.css", "ui-extra.css", "skin.css"]);

// 3) Tek dosyada birleştir
const icon = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f59e0b"/><text x="32" y="43" font-size="30" text-anchor="middle" fill="#0c0a09" font-family="Arial" font-weight="600">P</text></svg>'
);
const page = (title, body, scriptText, extraHead = "", style = css) => `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="theme-color" content="#080706">
<link rel="icon" href="${icon}">
${extraHead}<style>${style}</style>
</head>
<body class="${body}">
<div id="root"></div>
<script>${scriptText.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;
const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ProPos — Kurumsal POS &amp; Bulut ERP Sistemi</title>
<meta name="theme-color" content="#080706">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="icon" href="${icon}">
<style>${css}</style>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body class="select-none">
<div id="root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(distDir, "index.html"), html);

// PWA: manifest, ikonlar, service worker (sürüm = HTML özeti → içerik değişince önbellek yenilenir)
const crypto = require("crypto");
const version = crypto.createHash("sha1").update(html).digest("hex").slice(0, 10);
const pwaSrc = path.join(root, "src", "pwa");
for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) fs.copyFileSync(path.join(pwaSrc, f), path.join(distDir, f));
fs.writeFileSync(path.join(distDir, "sw.js"), fs.readFileSync(path.join(pwaSrc, "sw.template.js"), "utf8").replace(/__VERSION__/g, version));
fs.writeFileSync(path.join(distDir, "manifest.webmanifest"), JSON.stringify({
  name: "ProPos — Restoran & Kafe POS", short_name: "ProPos", description: "Masa, adisyon ve stok yönetimi; çevrimdışı çalışır.",
  start_url: "/", scope: "/", display: "standalone", orientation: "any", lang: "tr",
  background_color: "#100e0c", theme_color: "#080706",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2));
console.log(`PWA hazır: sw.js sürüm ${version}`);
const adminDir = path.join(root, "dist-admin");
fs.mkdirSync(adminDir, { recursive: true });
const adminHtml = page("ProPos — Kontrol Paneli", "bg-stone-950 text-stone-100 min-h-screen", adminJs, '<meta name="robots" content="noindex, nofollow">', adminCss);
fs.writeFileSync(path.join(adminDir, "index.html"), adminHtml);
console.log(`dist-admin/index.html hazır: ${(adminHtml.length / 1024).toFixed(0)} KB`);
console.log(`dist/index.html hazır: ${(html.length / 1024).toFixed(0)} KB (v${pkg.version})`);
