// Kontrol paneli: form doğrulama ve lisans yardımcıları (sunucu aynı kuralları tekrar uygular).

export const PLANS = { trial: "Deneme", monthly: "Aylık", yearly: "Yıllık", lifetime: "Ömür boyu" };
export const STATUSES = { active: "Aktif", suspended: "Askıda" };

export function normalizeCode(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

/** @returns {Record<string,string>} alan → hata mesajı (boşsa geçerli) */
export function validateTenantForm(form, { isNew } = {}) {
  const errors = {};
  const code = String(form.tenantId || "");
  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) errors.tenantId = "3-40 karakter: A-Z, 0-9, - _";
  const name = String(form.businessName || "").trim();
  if (!name) errors.businessName = "İşletme adı gerekli";
  else if (new TextEncoder().encode(name).length > 120) errors.businessName = "En fazla 120 bayt";
  if (!(form.planType in PLANS)) errors.planType = "Geçersiz paket";
  if (!(form.status in STATUSES)) errors.status = "Geçersiz durum";
  if (form.expiresAt !== "unlimited" && !/^\d{4}-\d{2}-\d{2}$/.test(String(form.expiresAt || ""))) errors.expiresAt = "Tarih seçin ya da sınırsız işaretleyin";
  const pin = String(form.initialPin || "");
  if (pin && !/^\S{4,12}$/u.test(pin)) errors.initialPin = "4-12 karakter, boşluksuz";
  if (isNew && !pin) errors.initialPin = "Yeni işletme için yönetici PIN'i gerekli";
  return errors;
}

/** Kalan gün; sınırsızsa null. */
export function daysLeft(expiresAt, now = Date.now()) {
  if (!expiresAt || expiresAt === "unlimited") return null;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / 86400000);
}

/** Bitiş tarihini (mevcut süreye ekleyerek) uzatır; YYYY-MM-DD döner. */
export function extendExpiry(expiresAt, days, now = Date.now()) {
  const cur = expiresAt && expiresAt !== "unlimited" ? Date.parse(expiresAt) : NaN;
  const base = !Number.isNaN(cur) && cur > now ? cur : now;
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

export function licenseBadge(t, now = Date.now()) {
  if (t.status === "suspended") return { label: "Askıda", tone: "danger" };
  const d = daysLeft(t.expiresAt, now);
  if (d === null) return { label: "Sınırsız", tone: "ok" };
  if (d < 0) return { label: "Süresi doldu", tone: "danger" };
  if (d <= 14) return { label: `${d} gün kaldı`, tone: "warn" };
  return { label: `${d} gün`, tone: "ok" };
}

export function formatBytes(n) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function formatRev(rev) {
  if (!rev) return "Hiç senkron olmadı";
  const d = new Date(Number(rev));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}
