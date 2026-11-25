const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const origHtmlPath = path.join(rootDir, "ProPos_Hazir_Uygulama.html");
const seedJsonPath = path.join(rootDir, "ProPos_Canli_Veritabani.json");
const bundleOutPath = path.join(distDir, "app.bundle.js");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Find esbuild binary
const esbuildCandidates = [
  path.join(process.env.LOCALAPPDATA || "", "Programs", "Antigravity IDE", "resources", "app", "node_modules", "@esbuild", "win32-x64", "esbuild.exe"),
  path.join(process.env.LOCALAPPDATA || "", "Programs", "LM Studio", "resources", "app", ".webpack", "bin", "esbuild.exe"),
  "esbuild"
];
const esbuildBin = esbuildCandidates.find((p) => p === "esbuild" || fs.existsSync(p));

// 2. Bundle modular React source code (src/index.jsx)
execFileSync(
  esbuildBin,
  [
    path.join(rootDir, "src", "index.jsx"),
    "--bundle",
    "--format=iife",
    "--global-name=ProPosApp",
    "--jsx=transform",
    "--jsx-factory=React.createElement",
    "--jsx-fragment=React.Fragment",
    "--minify-syntax",
    "--minify-whitespace",
    `--alias:react=${path.join(rootDir, "src", "shims", "react.js")}`,
    `--outfile=${bundleOutPath}`
  ],
  { stdio: "inherit" }
);

const bundledAppJs = fs.readFileSync(bundleOutPath, "utf8");
fs.unlinkSync(bundleOutPath);

// 3. Extract head styles and React/ReactDOM runtime from existing HTML (lines 1-583)
const existingLines = fs.readFileSync(origHtmlPath, "utf8").split(/\r?\n/);
const headerAndReactRuntime = existingLines.slice(0, 583).join("\n");
const seedJson = fs.existsSync(seedJsonPath) ? fs.readFileSync(seedJsonPath, "utf8").trim() : "{}";

const cleanHtml = `${headerAndReactRuntime}
  <script>
    window.__PROPOS_BACKUP_SEED__ = ${seedJson};
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      }).catch(function() {});
    }
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        keys.forEach(function(k) { caches.delete(k); });
      }).catch(function() {});
    }
  </script>
  <script>
${bundledAppJs}
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, "index.html"), cleanHtml, "utf8");
fs.writeFileSync(origHtmlPath, cleanHtml, "utf8");

const totalLines = cleanHtml.split(/\r?\n/).length;
console.log(`Build tamamlandi! Yeni dosya boyutu: ${(Buffer.byteLength(cleanHtml) / 1024).toFixed(1)} KB (${totalLines} satir)`);
