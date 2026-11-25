// ProPos PHP Backend API İletişim Servisi

export function getLocalSyncBaseUrl() {
  if (typeof window !== "undefined" && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    return window.location.origin;
  }
  return "http://localhost:8586";
}

export async function fetchTenantSync(tenantId) {
  const res = await fetch(`${getLocalSyncBaseUrl()}/api/sync?tenantId=${encodeURIComponent(tenantId)}&t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
  });
  if (!res.ok) return null;
  return res.json();
}

export async function pushTenantSync(tenantId, deviceId, rev, jsonStr) {
  const syncUrl = `${getLocalSyncBaseUrl()}/api/sync?tenantId=${encodeURIComponent(tenantId)}&deviceId=${encodeURIComponent(deviceId)}&rev=${rev}`;
  const res = await fetch(syncUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: jsonStr,
    keepalive: true
  });
  if (!res.ok) return null;
  return res.json();
}

export async function postDealerTenants(tenantsJson) {
  return fetch(`${getLocalSyncBaseUrl()}/api/tenants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: tenantsJson,
    keepalive: true
  });
}

export async function postPrepareGithubRelease(manifestJson) {
  return fetch(`${getLocalSyncBaseUrl()}/api/prepare-github`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: manifestJson
  });
}

export async function postApplyHtmlUpdate(newHtml) {
  return fetch(`${getLocalSyncBaseUrl()}/api/apply-update`, {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: newHtml
  });
}
