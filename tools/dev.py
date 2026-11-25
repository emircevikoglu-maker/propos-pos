#!/usr/bin/env python3
"""ProPos geliştirici aracı — tek komutla başlat, veriyi sıfırla, anahtarları gör.

  python tools/dev.py start            # gerekirse npm install + build + ilk kurulum; POS (8586) + panel (8590)
  python tools/dev.py start --no-build # derlemeyi atla
  python tools/dev.py reset            # data/ → _yedek/data-<zaman>/ taşınır, temiz kurulum yapılır (onay sorar)
  python tools/dev.py reset --yes --pin 1234   # onaysız; ana işletmeye başlangıç PIN'i
  python tools/dev.py keys             # kurucu anahtarı (varsa) + işletme bağlantı anahtarları

npm kısayolları: npm start, npm run reset, npm run keys
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ["PROPOS_DATA_DIR"]) if os.environ.get("PROPOS_DATA_DIR") else ROOT / "data"
BACKUPS = DATA.parent / "_yedek"
POS_PORT, CONTROL_PORT = 8586, 8590

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def find_php() -> str:
    for cand in [os.environ.get("PROPOS_PHP", ""), r"C:\faho\projects\xampp\php\php.exe", "php"]:
        if cand and (shutil.which(cand) or Path(cand).is_file()):
            return shutil.which(cand) or cand
    sys.exit("PHP bulunamadı. PROPOS_PHP ortam değişkeniyle php.exe yolunu verin.")


def php_eval(php: str, code: str) -> str:
    """bootstrap yüklü bir PHP parçası çalıştırır (gerçek data/ üzerinde)."""
    script = "require 'backend/bootstrap.php';\n" + code
    p = subprocess.run([php, "-r", script], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        sys.exit("PHP hatası:\n" + (p.stderr or p.stdout))
    return p.stdout.strip()


def port_busy(port: int) -> bool:
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # paket gönderilmez; yalnızca yerel arayüz seçilir
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def needs_build() -> bool:
    out = [ROOT / "dist" / "index.html", ROOT / "dist-admin" / "index.html"]
    if not all(p.is_file() for p in out):
        return True
    built = min(p.stat().st_mtime for p in out)
    watched = list((ROOT / "src").rglob("*")) + [ROOT / "scripts" / "build.js", ROOT / "tailwind.config.js"]
    return any(p.is_file() and p.stat().st_mtime > built for p in watched)


def npm(*args: str) -> None:
    exe = shutil.which("npm") or "npm"
    p = subprocess.run([exe, *args], cwd=ROOT, shell=os.name == "nt")
    if p.returncode != 0:
        sys.exit(f"npm {' '.join(args)} başarısız.")


def ensure_setup(php: str, build: bool) -> None:
    if not (ROOT / "node_modules").is_dir():
        print("• node_modules yok → npm install")
        npm("install")
    if build and needs_build():
        print("• Kaynak değişmiş → npm run build")
        npm("run", "build")
    if not (DATA / "config.json").is_file():
        print("• İlk kurulum (kurucu anahtarı üretiliyor)")
        php_eval(php, "new ProPos\\Services\\AuthService(new ProPos\\Services\\TenantService());")


def tenant_keys(php: str) -> list[dict]:
    out = php_eval(php, "echo json_encode((new ProPos\\Services\\TenantService())->loadRegistry(), JSON_UNESCAPED_UNICODE);")
    return json.loads(out or "[]")


def print_keys(php: str) -> None:
    key_file = DATA / "KURUCU_ANAHTARI.txt"
    print("\nKurucu anahtarı (kontrol paneli):")
    if key_file.is_file():
        lines = [l for l in key_file.read_text(encoding="utf-8", errors="replace").splitlines() if l.strip()]
        print("  " + lines[-1].strip() + "   (data/KURUCU_ANAHTARI.txt — güvenli yere kaydedip silin)")
    else:
        print("  Gizli (dosya silinmiş; yalnızca hash duruyor). Unuttuysanız: python tools/dev.py reset")
    print("\nİşletme bağlantı anahtarları (cihaz eşleştirme):")
    for t in tenant_keys(php):
        code = "boş bırakın (ana işletme)" if t["tenantId"] == "DEFAULT" else t["tenantId"]
        print(f"  {t.get('businessName', '?'):<24} kod: {code:<28} anahtar: {t.get('syncKey')}")


def cmd_start(a) -> None:
    php = find_php()
    ensure_setup(php, build=not a.no_build)
    for port in (POS_PORT, CONTROL_PORT):
        if port_busy(port):
            sys.exit(f"{port} portu kullanımda. Önceki sunucuyu kapatın:\n"
                     f"  Get-NetTCPConnection -LocalPort {port} -State Listen | % {{ Stop-Process -Id $_.OwningProcess }}")
    print_keys(php)
    log_dir = DATA / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    procs = []
    for port, router, host in ((POS_PORT, "router.php", "0.0.0.0"), (CONTROL_PORT, "control.php", "127.0.0.1")):
        log = open(log_dir / f"{router.replace('.php', '')}.log", "ab")
        procs.append((subprocess.Popen([php, "-S", f"{host}:{port}", str(ROOT / "backend" / router)], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT), log))
    time.sleep(0.8)
    for p, _ in procs:
        if p.poll() is not None:
            sys.exit("Sunucu açılamadı; data/logs/ altındaki günlüğe bakın.")
    ip = lan_ip()
    print(f"\nPOS            http://localhost:{POS_PORT}   (ağdaki cihazlar: http://{ip}:{POS_PORT})")
    print(f"Kontrol paneli http://127.0.0.1:{CONTROL_PORT}  (yalnızca bu bilgisayar)")
    print("Günlükler: data/logs/   ·   Durdurmak için Ctrl+C\n")
    try:
        while all(p.poll() is None for p, _ in procs):
            time.sleep(0.5)
        print("Bir sunucu kapandı; data/logs/ kontrol edin.")
    except KeyboardInterrupt:
        print("\nKapatılıyor…")
    finally:
        for p, log in procs:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(5)
                except subprocess.TimeoutExpired:
                    p.kill()
            log.close()


def cmd_reset(a) -> None:
    php = find_php()
    if port_busy(POS_PORT) or port_busy(CONTROL_PORT):
        sys.exit("Önce çalışan sunucuyu durdurun (Ctrl+C).")
    if DATA.exists() and any(DATA.iterdir()):
        target = BACKUPS / f"data-{datetime.now():%Y%m%d-%H%M%S}"
        if not a.yes:
            ans = input(f"data/ klasörü {target} konumuna taşınıp temiz kurulum yapılacak. Devam? [e/H] ")
            if ans.strip().lower() not in ("e", "evet", "y", "yes"):
                sys.exit("Vazgeçildi.")
        BACKUPS.mkdir(exist_ok=True)
        shutil.move(str(DATA), str(target))
        print(f"• Eski veri taşındı: {target}  (geri almak için klasörü data/ olarak geri taşıyın)")
    ensure_setup(php, build=False)
    if a.pin:
        out = php_eval(php, "$ts=new ProPos\\Services\\TenantService(); $r=(new ProPos\\Services\\PinService($ts))->change('DEFAULT', null, "
                            + json.dumps(a.pin) + ", true); echo json_encode($r, JSON_UNESCAPED_UNICODE);")
        r = json.loads(out)
        print("• Ana işletme PIN'i ayarlandı." if r.get("ok") else f"• PIN ayarlanamadı: {r.get('error')}")
    else:
        print("• Ana işletmenin PIN'i yok: ilk 'Yönetici Aç'ta girdiğiniz PIN iki kez yazılınca kaydedilir.")
    print_keys(php)
    print("\nTarayıcıdaki eski anahtar geçersiz sayılır; uygulama eşleştirme ekranını açar, yeni anahtarı girin.")


def cmd_keys(a) -> None:
    print_keys(find_php())


def main() -> None:
    ap = argparse.ArgumentParser(description="ProPos geliştirici aracı")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("start", help="sunucuları başlat")
    s.add_argument("--no-build", action="store_true")
    r = sub.add_parser("reset", help="veriyi yedekleyip temiz kurulum")
    r.add_argument("--yes", action="store_true", help="onay sorma")
    r.add_argument("--pin", help="ana işletmeye başlangıç yönetici PIN'i")
    sub.add_parser("keys", help="anahtarları göster")
    a = ap.parse_args()
    {"start": cmd_start, "reset": cmd_reset, "keys": cmd_keys}[a.cmd](a)


if __name__ == "__main__":
    main()
