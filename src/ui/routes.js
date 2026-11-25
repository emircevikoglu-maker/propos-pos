// Yönlendirme sözleşmesi: sekme ve açık masa URL'den türetilir (geri tuşu, yenileme, derin bağlantı).
export const TAB_PATHS = {
  pos: "/masalar",
  esnaf: "/esnaf",
  inventory: "/stok",
  analytics: "/analiz",
  staff: "/personel",
  finance: "/finans",
  settings: "/yonetim"
};

export const tabFromPath = (pathname) =>
  Object.keys(TAB_PATHS).find((k) => pathname === TAB_PATHS[k] || pathname.startsWith(TAB_PATHS[k] + "/")) || "pos";

export const tableIdFromPath = (pathname) => {
  const m = /^\/masalar\/([^/]+)/.exec(pathname || "");
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return null; }
};

export const tablePath = (id) => (id ? `/masalar/${encodeURIComponent(id)}` : "/masalar");

/** Açık pencere (sheet) adı sorgu dizesinde tutulur: ?s=odeme → geri tuşu önce pencereyi kapatır. */
export const SHEET_PARAM = "s";
