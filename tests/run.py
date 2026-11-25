#!/usr/bin/env python3
"""ProPos test koşucusu.

PHP ve React testleri kendi klasörlerinde durur; bu betik onları çağırır, sunucuları geçici
veriyle ayağa kaldırır, JSON çıktıları toplayıp tek özet ve çıkış kodu üretir.

  python tests/run.py                  # hepsi
  python tests/run.py --only php       # lint + unit + api + control + security + abuse
  python tests/run.py --only unit,security
  python tests/run.py --only react
  python tests/run.py --filter PIN -v  # adında "PIN" geçen testler, ayrıntılı
  python tests/run.py --build          # ayrıca derleyip POS paketinde panel kodu olmadığını doğrular

Gerçek data/ ve dist/ klasörlerine dokunulmaz: her koşu kendi geçici klasörünü kullanır.
Çıkış kodu: 0 hepsi geçti, 1 başarısız test var, 2 ortam hatası.
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHP_TESTS = ROOT / "tests" / "php" / "index.php"
DEFAULT_PHP = [os.environ.get("PROPOS_PHP", ""), r"C:\faho\projects\xampp\php\php.exe", "php"]
STAGES = ["lint", "unit", "api", "control", "security", "abuse", "react", "build", "supabase"]
DEFAULT_STAGES = ["lint", "unit", "api", "control", "security", "abuse", "react"]

try:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler
except Exception:
    pass
USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None
def c(code: str, s: str) -> str:
    return f"\033[{code}m{s}\033[0m" if USE_COLOR else s

def find_php() -> str:
    for cand in DEFAULT_PHP:
        if not cand:
            continue
        path = shutil.which(cand) or (cand if Path(cand).is_file() else None)
        if path:
            return path
    sys.exit("PHP bulunamadı. PROPOS_PHP ortam değişkeniyle yol verin.")

def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

class Server:
    """php -S süreci; ortam değişkenleriyle izole veri klasörü."""
    def __init__(self, php: str, router: str, env: dict, log: Path):
        self.port = free_port()
        self.url = f"http://127.0.0.1:{self.port}"
        self.log = open(log, "wb")
        self.proc = subprocess.Popen([php, "-S", f"127.0.0.1:{self.port}", str(ROOT / "backend" / router)],
                                     cwd=ROOT, env=env, stdout=self.log, stderr=subprocess.STDOUT)
        deadline = time.time() + 10
        probe = "/api/info" if router == "router.php" else "/"
        while time.time() < deadline:
            try:
                urllib.request.urlopen(self.url + probe, timeout=1).read()
                return
            except Exception:
                if self.proc.poll() is not None:
                    break
                time.sleep(0.1)
        self.stop()
        raise RuntimeError(f"{router} sunucusu açılmadı; günlük: {log}")

    def stop(self):
        if self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        self.log.close()

def server_env(data: Path, dist: Path, founder_key: str, extra: dict | None = None) -> dict:
    env = dict(os.environ)
    env.update({
        "PROPOS_DATA_DIR": str(data), "PROPOS_DIST_DIR": str(dist), "PROPOS_FOUNDER_KEY": founder_key,
        "PROPOS_LOGIN_DELAY_MS": "0", "PROPOS_MAX_DB_BYTES": "262144",
        # Normal suite'ler sınıra takılmasın; sınırlar abuse suite'inde sıkı ayarlanır.
        "PROPOS_RL_POLL": "5000:500", "PROPOS_RL_ACTION": "5000:500", "PROPOS_RL_IP": "20000:2000", "PROPOS_RL_CONTROL": "5000:500",
    })
    env.pop("PROPOS_DEBUG", None)
    # Gerçek .env (Supabase) test koşularına sızmasın; varsayılan depo dosyadır.
    env["PROPOS_NO_DOTENV"] = "1"
    env["PROPOS_STORAGE"] = "file"
    env.update(extra or {})
    return env

def prepare_dist(tmp: Path) -> Path:
    dist = tmp / "dist"
    dist.mkdir(parents=True, exist_ok=True)
    src = ROOT / "dist" / "index.html"
    if src.is_file():
        for f in (ROOT / "dist").iterdir():  # index.html + PWA dosyaları (sw.js, manifest, ikonlar)
            if f.is_file():
                shutil.copy(f, dist / f.name)
    else:
        (dist / "index.html").write_text('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>', encoding="utf-8")
    return dist

def run_php_suite(php: str, suites: str, args: dict, env: dict, flt: str | None) -> list[dict]:
    cmd = [php, str(PHP_TESTS), f"--suite={suites}", "--format=json"] + [f"--{k}={v}" for k, v in args.items()]
    if flt:
        cmd.append(f"--filter={flt}")
    p = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600)
    try:
        out = json.loads(p.stdout)
    except json.JSONDecodeError:
        return [{"suite": suites, "name": "(PHP çıktısı okunamadı)", "status": "failed", "ms": 0,
                 "message": (p.stderr or p.stdout)[-1500:]}]
    if p.stderr.strip():
        out["tests"].append({"suite": suites, "name": "(stderr temiz olmalı: PHP uyarısı yok)", "status": "failed", "ms": 0, "message": p.stderr.strip()[-1500:]})
    return out["tests"]

def stage_lint(php: str) -> list[dict]:
    res = []
    files = sorted(list((ROOT / "backend").rglob("*.php")) + list((ROOT / "tests" / "php").rglob("*.php")) + [ROOT / "api" / "index.php"])
    for f in files:
        t0 = time.time()
        p = subprocess.run([php, "-l", str(f)], capture_output=True, text=True, encoding="utf-8", errors="replace")
        ok = p.returncode == 0
        res.append({"suite": "lint", "name": str(f.relative_to(ROOT)), "status": "passed" if ok else "failed",
                    "ms": int((time.time() - t0) * 1000), "message": "" if ok else (p.stdout + p.stderr).strip()})
    return res

def stage_react(flt: str | None, tmp: Path) -> list[dict]:
    vitest = ROOT / "node_modules" / "vitest" / "vitest.mjs"
    if not vitest.is_file():
        return [{"suite": "react", "name": "(vitest kurulu değil: npm install)", "status": "failed", "ms": 0, "message": ""}]
    out_file = tmp / "vitest.json"
    cmd = ["node", str(vitest), "run", "--reporter=json", f"--outputFile={out_file}"]
    if flt:
        cmd += ["-t", flt]
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600)
    if not out_file.is_file():
        return [{"suite": "react", "name": "(vitest çalışmadı)", "status": "failed", "ms": 0, "message": (p.stderr or p.stdout)[-2000:]}]
    data = json.loads(out_file.read_text(encoding="utf-8"))
    res = []
    for f in data.get("testResults", []):
        rel = Path(f["name"]).name
        if not f.get("assertionResults") and f.get("status") == "failed":
            res.append({"suite": "react", "name": f"{rel} (dosya yüklenemedi)", "status": "failed", "ms": 0, "message": (f.get("message") or "")[-1500:]})
        for a in f.get("assertionResults", []):
            st = {"passed": "passed", "failed": "failed"}.get(a["status"], "skipped")
            res.append({"suite": "react", "name": f"{rel} › {' › '.join(a.get('ancestorTitles') or [])} › {a['title']}".replace(" ›  › ", " › "),
                        "status": st, "ms": int(a.get("duration") or 0), "message": "\n".join(a.get("failureMessages") or [])[:1500]})
    return res

def stage_build() -> list[dict]:
    t0 = time.time()
    npm = shutil.which("npm") or "npm"
    p = subprocess.run([npm, "run", "build"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=os.name == "nt")
    res = [{"suite": "build", "name": "npm run build", "status": "passed" if p.returncode == 0 else "failed", "ms": int((time.time() - t0) * 1000), "message": "" if p.returncode == 0 else p.stderr[-1500:]}]
    if p.returncode == 0:
        pos = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
        adm = (ROOT / "dist-admin" / "index.html").read_text(encoding="utf-8")
        checks = [
            ("POS paketinde kontrol paneli kodu yok", "rotate-key" not in pos and "Kontrol Paneli" not in pos),
            ("Panel paketi panel kodunu içeriyor", "rotate-key" in adm),
            ("Panel paketinde POS kodu yok", "propos-rate-limited" not in adm),
            ("Paketlerde sabit kurucu/senkron anahtarı yok", not any(s in pos + adm for s in ["PICKYS9999", "SYNC-6CMY"])),
            # Paket içindeki "</script" dizeleri kaçışlı olmalı; yalnızca gerçek etiketler kapanır.
            ("</script> kaçışı doğru (POS 1, panel 1 gerçek etiket)", pos.count("</script") == 1 and adm.count("</script") == 1),
        ]
        for name, ok in checks:
            res.append({"suite": "build", "name": name, "status": "passed" if ok else "failed", "ms": 0, "message": ""})
    return res

def main() -> int:
    ap = argparse.ArgumentParser(description="ProPos test koşucusu")
    ap.add_argument("--only", help="virgülle: " + ",".join(STAGES) + " | php | all")
    ap.add_argument("--filter", help="yalnızca adında bu metin geçen testler")
    ap.add_argument("-v", "--verbose", action="store_true", help="geçen testleri de listele")
    ap.add_argument("--build", action="store_true", help="derleme kontrollerini de çalıştır")
    ap.add_argument("--keep", action="store_true", help="geçici klasörleri silme (hata ayıklama)")
    ap.add_argument("--json", metavar="DOSYA", help="tüm sonuçları JSON olarak yaz")
    a = ap.parse_args()

    if a.only in (None, "all"):
        stages = list(DEFAULT_STAGES) + (["build"] if a.build else [])
    else:
        req = [s.strip() for s in a.only.split(",") if s.strip()]
        stages = []
        for s in req:
            stages += ["lint", "unit", "api", "control", "security", "abuse"] if s == "php" else [s]
        bad = [s for s in stages if s not in STAGES]
        if bad:
            ap.error("bilinmeyen aşama: " + ", ".join(bad))

    php = find_php()
    tmp = Path(tempfile.mkdtemp(prefix="propos_test_"))
    results: list[dict] = []
    t_start = time.time()
    founder_key = "PROPOS-TEST-" + secrets.token_hex(8).upper()
    try:
        if "lint" in stages:
            results += stage_lint(php)
        if "unit" in stages:
            env = server_env(tmp / "unit_data", prepare_dist(tmp / "unit"), founder_key)
            results += run_php_suite(php, "unit", {}, env, a.filter)

        http_suites = [s for s in ["api", "control", "security"] if s in stages]
        if http_suites:
            data = tmp / "data_main"
            env = server_env(data, prepare_dist(tmp / "main"), founder_key)
            pos = Server(php, "router.php", env, tmp / "pos.log")
            ctl = Server(php, "control.php", env, tmp / "control.log")
            try:
                results += run_php_suite(php, ",".join(http_suites), {"pos": pos.url, "control": ctl.url, "founder-key": founder_key, "max-db-bytes": "262144"}, dict(os.environ), a.filter)
            finally:
                pos.stop(); ctl.stop()

        if "abuse" in stages:
            env = server_env(tmp / "data_abuse", prepare_dist(tmp / "abuse"), founder_key,
                             {"PROPOS_RL_POLL": "5:0.05", "PROPOS_RL_ACTION": "40:5", "PROPOS_RL_IP": "80:0.5", "PROPOS_RL_PENALTY": "30", "PROPOS_RL_KEEPALIVE": "2:0.0001"})
            pos = Server(php, "router.php", env, tmp / "pos_abuse.log")
            ctl = Server(php, "control.php", env, tmp / "control_abuse.log")
            try:
                results += run_php_suite(php, "abuse", {"pos": pos.url, "control": ctl.url, "founder-key": founder_key}, dict(os.environ), a.filter)
            finally:
                pos.stop(); ctl.stop()

        if "supabase" in stages:
            # Gerçek Supabase projesine karşı sözleşme testleri (yalnızca --only supabase; geçici TEST kayıtları açar ve siler).
            env = dict(os.environ)
            env.pop("PROPOS_NO_DOTENV", None)
            env["PROPOS_STORAGE"] = "supabase"
            env["PROPOS_DATA_DIR"] = str(tmp / "sb_data")
            env["PROPOS_DIST_DIR"] = str(prepare_dist(tmp / "sb"))
            results += run_php_suite(php, "supabase", {}, env, a.filter)

        if "react" in stages:
            results += stage_react(a.filter, tmp)
        if "build" in stages:
            results += stage_build()
    except RuntimeError as e:
        print(c("31", f"Ortam hatası: {e}"))
        return 2
    finally:
        if a.keep:
            print(f"Geçici klasör: {tmp}")
        else:
            shutil.rmtree(tmp, ignore_errors=True)

    # ---- Rapor
    by_suite: dict[str, dict[str, int]] = {}
    for r in results:
        by_suite.setdefault(r["suite"], {"passed": 0, "failed": 0, "skipped": 0})[r["status"]] += 1
    for r in results:
        if r["status"] == "failed":
            print(c("31", "FAIL"), f"{r['suite']} › {r['name']}")
            if r["message"]:
                print("     " + r["message"].replace("\n", "\n     ")[:2000])
        elif a.verbose:
            mark = c("32", "OK  ") if r["status"] == "passed" else c("33", "SKIP")
            print(mark, f"{r['suite']} › {r['name']}" + (f"  ({r['message']})" if r["status"] == "skipped" and r["message"] else ""))
    print()
    print(f"{'aşama':<10} {'geçti':>6} {'başarısız':>10} {'atlandı':>8}")
    for s in STAGES:
        if s in by_suite:
            v = by_suite[s]
            line = f"{s:<10} {v['passed']:>6} {v['failed']:>10} {v['skipped']:>8}"
            print(c("31", line) if v["failed"] else line)
    total_failed = sum(v["failed"] for v in by_suite.values())
    total = sum(sum(v.values()) for v in by_suite.values())
    print(f"\nToplam {total} test, {total_failed} başarısız ({time.time() - t_start:.1f} sn)")
    if a.json:
        Path(a.json).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return 1 if total_failed else 0

if __name__ == "__main__":
    sys.exit(main())
