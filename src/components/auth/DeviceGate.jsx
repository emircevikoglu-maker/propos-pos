import React from "react";
import { LoginScreen, LicenseBlockedScreen } from "./LoginScreen";
import { fetchServerInfo, isDevicePaired, loginUser, unpairDevice } from "../../services/apiService";
import { getProPosStorageKey, resolveActiveTenantId } from "../../utils/formatters";
import { preloadLocal } from "../../services/localDb";

const hasLocalData = (tid) => { try { return !!localStorage.getItem(getProPosStorageKey(tid)); } catch (e) { return false; } };

/**
 * Giriş kapısı (3.9.0: kullanıcı adı + parola). Oturum yoksa POS hiç gösterilmez.
 *  - oturum var → uygulama (oturum sonradan düşerse giriş ekranı üstte açılır, açık iş kaybolmaz)
 *  - oturum yok → giriş ekranı; sunucu yok + yerel veri varsa "çevrimdışı devam"
 *  - lisans askıda/bitmiş → lisans ekranı
 */
export function DeviceGate({ children }) {
  const tenantId = React.useMemo(() => resolveActiveTenantId(), []);
  const [state, setState] = React.useState(() => (isDevicePaired(tenantId) ? "ready" : "checking"));
  const [reachable, setReachable] = React.useState(true);
  const [reason, setReason] = React.useState("");
  const [licenseMsg, setLicenseMsg] = React.useState("");
  const [offline, setOffline] = React.useState(false);
  const [booted, setBooted] = React.useState(false);

  // IndexedDB'deki son yerel durumu uygulama açılmadan yükle (çevrimdışı açılışta veri hazır olsun).
  React.useEffect(() => {
    let on = true;
    preloadLocal(tenantId, getProPosStorageKey(tenantId)).finally(() => { if (on) setBooted(true); });
    return () => { on = false; };
  }, [tenantId]);

  const probe = React.useCallback(async () => {
    const info = await fetchServerInfo();
    setReachable(!!info);
    setState((s) => (s === "ready" ? s : "login"));
  }, []);

  React.useEffect(() => { if (state === "checking") probe(); }, [state, probe]);

  React.useEffect(() => {
    const onAuth = () => { if (!offline) { setReason("Oturum sona erdi ya da parola değişti. Yeniden giriş yapın."); setState("relogin"); } };
    const onLicense = (e) => { setLicenseMsg((e.detail && e.detail.message) || ""); setState("license"); };
    window.addEventListener("propos-auth-required", onAuth);
    window.addEventListener("propos-license-blocked", onLicense);
    return () => {
      window.removeEventListener("propos-auth-required", onAuth);
      window.removeEventListener("propos-license-blocked", onLicense);
    };
  }, [offline]);

  const onLogin = async (username, password) => {
    const r = await loginUser(username, password);
    if (!r.ok) return r;
    if (r.tenantId !== tenantId && typeof window !== "undefined" && window.__PROPOS_LOCKED_TENANT__) {
      unpairDevice(r.tenantId);
      return { ok: false, error: "Bu kullanıcı bu kurulumdaki işletmeye ait değil." };
    }
    if (r.tenantId !== tenantId) {
      // Başka işletmenin kullanıcısı: o işletmenin verisiyle temiz açılış.
      const url = new URL(window.location.href);
      url.searchParams.delete("tenant");
      window.location.replace(url.toString());
      return r;
    }
    setReason("");
    setState("ready");
    return r;
  };

  const login = (
    <LoginScreen
      reason={reason}
      serverReachable={reachable}
      onLogin={onLogin}
      onRetry={() => { setState("checking"); }}
      onContinueOffline={hasLocalData(tenantId) ? () => { setOffline(true); setState("ready"); } : undefined}
    />
  );

  if (!booted || state === "checking") {
    return <div className="auth-wrap"><span className="label">ProPos açılıyor…</span></div>;
  }
  if (state === "login") return login;
  if (state === "license") {
    return (
      <>
        {children}
        <LicenseBlockedScreen
          message={licenseMsg}
          onRetry={() => window.location.reload()}
          onUnpair={() => { unpairDevice(tenantId); setLicenseMsg(""); setState("login"); }}
        />
      </>
    );
  }
  return (
    <>
      {children}
      {state === "relogin" && <div className="auth-overlay">{login}</div>}
    </>
  );
}
