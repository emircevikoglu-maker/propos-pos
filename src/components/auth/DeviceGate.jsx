import React from "react";
import { PairingScreen, LicenseBlockedScreen } from "./PairingScreen";
import { fetchServerInfo, isDevicePaired, pairDevice, unpairDevice } from "../../services/apiService";
import { getProPosStorageKey, resolveActiveTenantId } from "../../utils/formatters";
import { preloadLocal } from "../../services/localDb";

const hasLocalData = (tid) => { try { return !!localStorage.getItem(getProPosStorageKey(tid)); } catch (e) { return false; } };

/**
 * Giriş akışının ilk katmanı. Cihaz eşleşmemişse POS'u hiç göstermez.
 *  - eşleşmiş → uygulama (anahtar sonradan geçersizleşirse eşleştirme ekranı üstte açılır)
 *  - eşleşmemiş + sunucu var → eşleştirme ekranı
 *  - eşleşmemiş + sunucu yok → eşleştirme ekranı + (yerel veri varsa) çevrimdışı devam
 *  - lisans askıda/bitmiş → lisans ekranı
 */
export function DeviceGate({ children }) {
  const tenantId = React.useMemo(() => resolveActiveTenantId(), []);
  const locked = typeof window !== "undefined" && !!window.__PROPOS_LOCKED_TENANT__;
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
    setState((s) => (s === "ready" ? s : "pair"));
  }, []);

  React.useEffect(() => { if (state === "checking") probe(); }, [state, probe]);

  React.useEffect(() => {
    const onAuth = () => { if (!offline) { setReason("Bağlantı anahtarı geçersiz ya da yenilendi. Yeni anahtarı girin."); setState("repair"); } };
    const onLicense = (e) => { setLicenseMsg((e.detail && e.detail.message) || ""); setState("license"); };
    window.addEventListener("propos-auth-required", onAuth);
    window.addEventListener("propos-license-blocked", onLicense);
    return () => {
      window.removeEventListener("propos-auth-required", onAuth);
      window.removeEventListener("propos-license-blocked", onLicense);
    };
  }, [offline]);

  const onPair = async (code, key) => {
    const r = await pairDevice(code, key);
    if (!r.ok) return r;
    if (code !== tenantId) {
      // Farklı işletmeye bağlandı: o işletmenin verisiyle temiz açılış.
      try { localStorage.setItem("propos_active_tenant_id", code); } catch (e) {}
      const url = new URL(window.location.href);
      if (code === "DEFAULT") url.searchParams.delete("tenant"); else url.searchParams.set("tenant", code);
      window.location.replace(url.toString());
      return r;
    }
    setReason("");
    setState("ready");
    return r;
  };

  const pairing = (
    <PairingScreen
      initialTenantId={tenantId}
      locked={locked}
      reason={reason}
      serverReachable={reachable}
      onPair={onPair}
      onRetry={() => { setState("checking"); }}
      onContinueOffline={hasLocalData(tenantId) ? () => { setOffline(true); setState("ready"); } : undefined}
    />
  );

  if (!booted) {
    return <div className="fixed inset-0 flex items-center justify-center bg-[#080706] text-sm text-stone-400">ProPos açılıyor…</div>;
  }
  if (state === "checking") {
    return <div className="fixed inset-0 flex items-center justify-center bg-[#080706] text-sm text-stone-400">ProPos açılıyor…</div>;
  }
  if (state === "pair") return pairing;
  if (state === "license") {
    return (
      <>
        {children}
        <LicenseBlockedScreen
          message={licenseMsg}
          onRetry={() => window.location.reload()}
          onUnpair={locked ? undefined : () => { unpairDevice(tenantId); setLicenseMsg(""); setState("pair"); }}
        />
      </>
    );
  }
  return (
    <>
      {children}
      {state === "repair" && pairing}
    </>
  );
}
