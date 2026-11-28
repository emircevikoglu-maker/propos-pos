// Kontrol paneli API istemcisi. Oturum yalnızca sessionStorage'da (sekme kapanınca biter).

const TOKEN_KEY = "propos_control_token";

const safe = (fn, fallback = null) => { try { return fn(); } catch (e) { return fallback; } };
export const getToken = () => safe(() => sessionStorage.getItem(TOKEN_KEY));
export const clearToken = () => safe(() => sessionStorage.removeItem(TOKEN_KEY));
const setToken = (t) => safe(() => sessionStorage.setItem(TOKEN_KEY, t));

export class ApiError extends Error {
  constructor(message, status, code, retryAfter) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function call(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["X-ProPos-Token"] = token;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch (e) {
    throw new ApiError("Sunucuya ulaşılamadı.", 0, "NETWORK");
  }
  const out = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/api/login") {
    clearToken();
    window.dispatchEvent(new CustomEvent("propos-control-logout"));
  }
  if (!res.ok || out.ok === false) {
    const retry = Number(res.headers.get("Retry-After")) || out.retryAfter || 0;
    throw new ApiError(out.error || `İstek başarısız (${res.status}).`, res.status, out.code, retry);
  }
  return out;
}

export async function login(key) {
  const out = await call("/api/login", { method: "POST", body: { key } });
  setToken(out.token);
  return out;
}

export const listTenants = () => call("/api/tenants").then((o) => o.tenants);
export const saveTenant = (tenant) => call("/api/tenants/save", { method: "POST", body: tenant });
export const rotateKey = (tenantId) => call("/api/tenants/rotate-key", { method: "POST", body: { tenantId } });
export const saveUser = (user) => call("/api/users/save", { method: "POST", body: user });
export const deleteUser = (username) => call("/api/users/delete", { method: "POST", body: { username } });
export const deleteTenant = (tenantId) => call("/api/tenants/delete", { method: "POST", body: { tenantId } });
export const fetchAudit = () => call("/api/audit").then((o) => o.lines || []);

export async function downloadPackage(tenantId, businessName) {
  const res = await fetch(`/api/package?tenantId=${encodeURIComponent(tenantId)}`, { headers: { "X-ProPos-Token": getToken() || "" } });
  if (!res.ok) throw new ApiError("Paket indirilemedi.", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ProPos_Kurulum_${String(businessName || tenantId).replace(/[^a-zA-Z0-9_-]/g, "_")}_${tenantId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
