// Kutlama denetleyicisi: ayarlar (cihaza özel, senkronlanmaz) + hangi anın kutlanacağını seçen saf fonksiyon.
// Görsel sahneler motion.js içindeki PPCelebrate'te; burada yalnızca "ne zaman" kararı ve veri hesabı var.
import { PPMotion, PPCelebrate } from "./motion";
import { mountIcons } from "./icons";

const KEY = (tid) => `propos_celebrate_v1_${tid || "DEFAULT"}`;
export const DEFAULT_SETTINGS = { enabled: true, motion: "auto", sound: false, goal: 0, autoSimplify: true };
export const NON_REVENUE = ["İkram / İptal", "Esnaf Cariye Yazıldı"];
export const STREAK_STEP = 25;
const MIN_HISTORY_DAYS = 7; // rekor için en az bu kadar geçmiş gün gerekir (ilk günlerde "rekor" sahte olur)
const BIG_TICKET_FACTOR = 2;

export const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function loadCelebrationSettings(tenantId) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(tenantId)) || "{}");
    const s = { ...DEFAULT_SETTINGS };
    if (typeof raw.enabled === "boolean") s.enabled = raw.enabled;
    if (raw.motion === "reduce" || raw.motion === "auto") s.motion = raw.motion;
    if (typeof raw.sound === "boolean") s.sound = raw.sound;
    if (typeof raw.autoSimplify === "boolean") s.autoSimplify = raw.autoSimplify;
    const g = Number(raw.goal);
    if (Number.isFinite(g) && g >= 0 && g <= 1e9) s.goal = g;
    return s;
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveCelebrationSettings(tenantId, settings) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(settings)); } catch (e) {}
}

export function applyCelebrationSettings(tenantId, settings, isBusy) {
  mountIcons();
  PPMotion.setReduced(settings.motion === "reduce" ? true : null);
  PPCelebrate.configure({ enabled: settings.enabled, sound: settings.sound, autoSimplify: settings.autoSimplify, isBusy: isBusy || (() => false) });
}

/** Gelir sayılan satışlar (ikram/iptal ve cariye yazılanlar hariç). */
export const revenueSales = (sales) => (Array.isArray(sales) ? sales : []).filter((s) => s && !NON_REVENUE.includes(s.paymentMethod) && Number.isFinite(Number(s.total)));

/** Son 10 dakikada 8+ ödeme = yoğun saat (kutlamalar sadeleşir). */
export function isBusyNow(sales, now = Date.now()) {
  return revenueSales(sales).filter((s) => now - Date.parse(s.timestamp) < 10 * 60000).length >= 8;
}

/**
 * Yeni satıştan sonra hangi an kutlanır? Öncelik: ilk satış > hedef > rekor > en büyük adisyon > seri.
 * `sales` yeni satışı İÇERİR. Her satışta en fazla bir an döner (ya da null).
 * `already` aynı gün zaten kutlananlar (once: true anlar) — PPCelebrate de kendi içinde engeller, burada çift güvence.
 */
export function pickMoment({ sales, sale, goal = 0, now = Date.now(), already = {} }) {
  const rev = revenueSales(sales);
  if (!sale || NON_REVENUE.includes(sale.paymentMethod)) return null;
  const today = dayKey(now);
  const todays = rev.filter((s) => dayKey(s.timestamp) === today);
  const todayTotal = todays.reduce((a, s) => a + Number(s.total), 0);
  const before = todayTotal - Number(sale.total);

  if (todays.length === 1 && !already.firstSale) return { kind: "firstSale", data: { sub: `${sale.tableName} · ₺${Math.round(sale.total)}` } };
  if (goal > 0 && before < goal && todayTotal >= goal && !already.goal) return { kind: "goal", data: { sub: `₺${Math.round(todayTotal)} / ₺${Math.round(goal)}` } };

  const byDay = {};
  rev.forEach((s) => { const k = dayKey(s.timestamp); if (k !== today) byDay[k] = (byDay[k] || 0) + Number(s.total); });
  const pastTotals = Object.values(byDay);
  if (pastTotals.length >= MIN_HISTORY_DAYS && !already.record) {
    const best = Math.max(...pastTotals);
    if (before <= best && todayTotal > best) return { kind: "record", data: { sub: `₺${Math.round(todayTotal)} · önceki en iyi ₺${Math.round(best)}` } };
  }

  const prevTickets = todays.filter((s) => s !== sale && s.id !== sale.id).map((s) => Number(s.total));
  if (prevTickets.length >= 5) {
    const avg = prevTickets.reduce((a, b) => a + b, 0) / prevTickets.length;
    if (Number(sale.total) >= avg * BIG_TICKET_FACTOR && Number(sale.total) >= Math.max(...prevTickets)) return { kind: "bigTicket", data: { sub: `${sale.tableName} · ₺${Math.round(sale.total)}` } };
  }
  if (todays.length > 0 && todays.length % STREAK_STEP === 0) return { kind: "streak", data: { n: todays.length } };
  return null;
}

let lastDay = null;
/** Yeni satış kaydedildiğinde çağrılır. */
export function celebrateSale({ sales, sale, goal }) {
  const today = dayKey(Date.now());
  if (lastDay !== today) { PPCelebrate.resetDay(); lastDay = today; }
  const m = pickMoment({ sales, sale, goal });
  if (m) PPCelebrate.moment(m.kind, m.data);
  return m;
}

/** Z raporu / gün kapanışı: her zaman çıkar (kutlamalar kapalıysa sade bilgi tostu). */
export function celebrateZReport({ count, net, formatMoney, onClose }) {
  PPCelebrate.moment("zReport", {
    sub: `${count} işlem · net ciro ${formatMoney ? formatMoney(net) : net}`,
    stats: [{ label: "İşlem", value: count }, { label: "Net ciro", value: Math.round(net), fmt: (n) => (formatMoney ? formatMoney(n) : `₺${Math.round(n)}`) }],
    onClose
  });
}

/** Günlük hedef ilerlemesi 0..1 (hedef yoksa null). */
export function goalProgress(sales, goal, now = Date.now()) {
  if (!(goal > 0)) return null;
  const today = dayKey(now);
  const total = revenueSales(sales).filter((s) => dayKey(s.timestamp) === today).reduce((a, s) => a + Number(s.total), 0);
  return Math.min(1, total / goal);
}
