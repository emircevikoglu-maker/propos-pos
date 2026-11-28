// Patron görünümü hesapları (saf fonksiyonlar; yapay zekâ yok, her sayı açıklanabilir).
// Yoğunluk: 15 dk dilimler 08:00–24:00. "Tipik" = aynı hafta gününün son 4 haftadaki medyanı (veri azsa son 28 günün).
import { revenueSales, dayKey } from "../design/celebrations";
import { productLines } from "./ledger";
import { recipeCost } from "./ledger";
import { lineConsumption } from "./productOptions";

export const SLOT0 = 8 * 60;
export const SLOT_MIN = 15;
export const SLOTS = (24 * 60 - SLOT0) / SLOT_MIN;
const DAY = 86400000;
const sum = (list, pick = (x) => x) => list.reduce((s, x) => s + (Number(pick(x)) || 0), 0);

export const slotOf = (date) => Math.floor((date.getHours() * 60 + date.getMinutes() - SLOT0) / SLOT_MIN);
export const slotTime = (i) => { const m = SLOT0 + i * SLOT_MIN; return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

export function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Sipariş = ürün satırı olan, ikram olmayan satış (cariye yazılan dahil; tahsilatlar hariç). */
const orders = (sales) => (sales || []).filter((s) => s && s.paymentMethod !== "İkram / İptal" && productLines(s).length > 0);

const daysBefore = (now, n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };

/** Gün anahtarı → dilim sayıları. */
function slotCounts(list) {
  const days = new Map();
  list.forEach((s) => {
    const d = new Date(s.timestamp);
    const i = slotOf(d);
    if (i < 0 || i >= SLOTS) return;
    const k = dayKey(d);
    if (!days.has(k)) days.set(k, new Array(SLOTS).fill(0));
    days.get(k)[i] += 1;
  });
  return days;
}

export function density(sales, now = Date.now()) {
  const nowDate = new Date(now);
  const days = slotCounts(orders(sales).filter((s) => Date.parse(s.timestamp) <= now));
  const todayRaw = days.get(dayKey(now)) || new Array(SLOTS).fill(0);
  const sameWeekday = [7, 14, 21, 28].map((n) => days.get(dayKey(daysBefore(now, n)))).filter(Boolean);
  const allDays = Array.from({ length: 28 }, (_, i) => days.get(dayKey(daysBefore(now, i + 1)))).filter(Boolean);
  const basis = sameWeekday.length >= 2 ? sameWeekday : allDays;
  const typical = Array.from({ length: SLOTS }, (_, i) => median(basis.map((d) => d[i])));
  // Medyan seyrek veride sıfırlanır; grafik ve tahmin için komşu üç dilimin ortalaması alınır.
  const smooth = typical.map((_, i) => {
    const win = [i - 1, i, i + 1].filter((j) => j >= 0 && j < SLOTS);
    return sum(win, (j) => sum(basis, (d) => d[j]) / Math.max(1, basis.length)) / win.length;
  });
  const nowSlot = Math.max(-1, Math.min(SLOTS - 1, slotOf(nowDate.getHours() < 8 ? new Date(new Date(now).setHours(7, 0, 0, 0)) : nowDate)));
  const today = todayRaw.map((v, i) => (i <= nowSlot ? v : null));
  const pastTypical = sum(smooth.slice(0, nowSlot + 1));
  const pace = pastTypical >= 4 ? Math.max(0.5, Math.min(2, sum(today.slice(0, nowSlot + 1)) / pastTypical)) : 1;
  const forecast = smooth.map((v, i) => (i > nowSlot ? v * pace : null));
  return { today, typical: smooth, forecast, nowSlot, pace, basisDays: basis.length, sameWeekday: sameWeekday.length >= 2 };
}

/** Günün kalanındaki en yoğun 2 saatlik aralık; ortalamanın belirgin üstündeyse uyarı. */
export function headsUp(d, window = 8) {
  const active = d.typical.filter((v) => v > 0);
  const mean = active.length ? sum(active) / active.length : 0;
  let best = null;
  for (let i = d.nowSlot + 1; i + window <= SLOTS; i++) {
    const total = sum(d.forecast.slice(i, i + window));
    if (!best || total > best.total) best = { from: i, total };
  }
  if (!best || best.total < 2 || d.basisDays < 2) return null;
  const ratio = mean > 0 ? best.total / window / mean : 1;
  return { from: slotTime(best.from), to: slotTime(best.from + window), expected: Math.round(best.total), ratio: Math.round(ratio * 10) / 10, hot: ratio >= 1.35 };
}

/** Satılan ürünlerin gerçek malzeme tüketiminden maliyet (çıkarılan malzeme ve çeşit tüketimi dahil). */
export function salesCost(sales, products, ingredients) {
  const unit = new Map((ingredients || []).map((i) => [i.id, Number(i.unitCost) || 0]));
  const byId = new Map((products || []).map((p) => [p.id, p]));
  return sum(sales || [], (s) => sum(productLines(s), (item) => sum(Object.entries(lineConsumption(byId.get(item.productId), item)), ([id, amount]) => (unit.get(id) || 0) * amount)));
}

export function dayKpis({ sales, products, ingredients, tables, now = Date.now() }) {
  const upTo = revenueSales(sales).filter((s) => Date.parse(s.timestamp) <= now);
  const on = (key) => upTo.filter((s) => dayKey(s.timestamp) === key);
  const today = on(dayKey(now));
  const revenue = sum(today, (s) => s.total);
  const lastWeek = sum(on(dayKey(daysBefore(now, 7))), (s) => s.total);
  const ticketSales = today.filter((s) => productLines(s).length > 0);
  const cost = salesCost(ticketSales, products, ingredients);
  const open = (tables || []).filter((t) => t.status === "occupied" && t.items.length > 0);
  return {
    revenue, lastWeek, delta: lastWeek > 0 ? (revenue - lastWeek) / lastWeek : null,
    cost, profit: revenue - cost, margin: revenue > 0 ? (revenue - cost) / revenue : 0,
    orders: ticketSales.length, avgTicket: ticketSales.length ? sum(ticketSales, (s) => s.total) / ticketSales.length : 0,
    biggest: ticketSales.reduce((b, s) => (Number(s.total) > (b ? Number(b.total) : 0) ? s : b), null),
    cash: sum(today.filter((s) => s.paymentMethod === "Nakit"), (s) => s.total),
    card: sum(today.filter((s) => s.paymentMethod === "Kredi Kartı"), (s) => s.total),
    openCount: open.length,
    openSum: sum(open, (t) => Math.max(0, sum(t.items, (i) => i.price * i.qty) - (t.discount || 0) - (t.paidAmount || 0)))
  };
}

export const QUADRANTS = { star: "Yıldız", horse: "Beygir", puzzle: "Bilmece", dog: "Zayıf" };

/** Menü mühendisliği (Kasavana–Smith): satış adedi × adet başı kâr. Bugün az veri varsa son 30 gün. */
export function menuMatrix(sales, products, ingredients, now = Date.now()) {
  const sold = (from) => {
    const map = new Map();
    orders(sales).filter((s) => { const t = Date.parse(s.timestamp); return t <= now && from(s, t); })
      .forEach((s) => productLines(s).forEach((i) => map.set(i.productId, (map.get(i.productId) || 0) + (Number(i.qty) || 0))));
    return map;
  };
  let period = "today";
  let counts = sold((s) => dayKey(s.timestamp) === dayKey(now));
  if (sum([...counts.values()]) < 20) { period = "month"; counts = sold((_, t) => now - t < 30 * DAY); }
  const items = (products || []).map((p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, n: counts.get(p.id) || 0, margin: (Number(p.price) || 0) - recipeCost(p, ingredients) }));
  const avgN = items.length ? sum(items, (x) => x.n) / items.length : 0;
  const avgM = items.length ? sum(items, (x) => x.margin) / items.length : 0;
  const tagged = items.map((x) => ({ ...x, quad: x.n >= avgN && x.n > 0 ? (x.margin >= avgM ? "star" : "horse") : (x.margin >= avgM ? "puzzle" : "dog") }));
  return {
    period, items: tagged, avgN, avgM,
    maxN: Math.max(1, ...tagged.map((x) => x.n)), maxM: Math.max(1, ...tagged.map((x) => x.margin)),
    puzzle: tagged.filter((x) => x.quad === "puzzle").sort((a, b) => b.margin - a.margin)[0] || null,
    horse: tagged.filter((x) => x.quad === "horse").sort((a, b) => b.n - a.n)[0] || null,
    top: tagged.map((x) => ({ ...x, earned: x.n * x.margin })).filter((x) => x.earned > 0).sort((a, b) => b.earned - a.earned).slice(0, 5)
  };
}

const hhmm = (ts) => new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

/** Günün hikâyesi: kutlama anlarının kalıcı izi (yeniden eskiye). */
export function dayStory({ sales, voidLog, goal = 0, now = Date.now(), money = (n) => `₺${Math.round(n)}` }) {
  const today = revenueSales(sales).filter((s) => dayKey(s.timestamp) === dayKey(now) && Date.parse(s.timestamp) <= now)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const events = [];
  const push = (at, icon, text) => events.push({ at: Date.parse(at), time: hhmm(at), icon, text });
  if (today.length) push(today[0].timestamp, "sun", `Günün ilk satışı · ${today[0].tableName} · ${money(today[0].total)}`);
  let running = 0, reached = false;
  today.forEach((s) => {
    running += Number(s.total) || 0;
    if (goal > 0 && !reached && running >= goal) { reached = true; push(s.timestamp, "target", `Günlük hedefe ulaşıldı (${money(goal)})`); }
  });
  const biggest = today.filter((s) => productLines(s).length > 0).reduce((b, s) => (!b || s.total > b.total ? s : b), null);
  if (biggest && today.length > 1) push(biggest.timestamp, "star", `Günün en büyük adisyonu · ${biggest.tableName} · ${money(biggest.total)}`);
  const counts = slotCounts(today).get(dayKey(now));
  if (counts) {
    const peak = counts.indexOf(Math.max(...counts));
    if (counts[peak] >= 3) { const at = new Date(now); at.setHours(0, SLOT0 + peak * SLOT_MIN, 0, 0); push(at.toISOString(), "zap", `Zirve: 15 dakikada ${counts[peak]} sipariş`); }
  }
  (voidLog || []).filter((v) => v.afterSend && dayKey(v.timestamp) === dayKey(now))
    .forEach((v) => push(v.timestamp, "undo", `${v.kind === "receipt" ? "Adisyon kaydı silindi" : `İptal: ${v.qty}× ${v.name}`} · ${v.tableName}`));
  return events.sort((a, b) => b.at - a.at);
}

/** Son `days` günde hedef tuttu mu (eskiden yeniye) ve güncel ardışık gün sayısı (bugün henüz tutmadıysa dünden sayılır). */
export function goalHistory(sales, goal, now = Date.now(), days = 28) {
  const totals = new Map();
  revenueSales(sales).filter((s) => Date.parse(s.timestamp) <= now).forEach((s) => totals.set(dayKey(s.timestamp), (totals.get(dayKey(s.timestamp)) || 0) + Number(s.total)));
  const hits = Array.from({ length: days }, (_, i) => goal > 0 && (totals.get(dayKey(daysBefore(now, days - 1 - i))) || 0) >= goal);
  let run = 0;
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i]) run += 1;
    else if (i !== hits.length - 1) break;
  }
  return { hits, run };
}

export function teamToday(sales, staffList, now = Date.now()) {
  const counts = new Map();
  orders(sales).filter((s) => dayKey(s.timestamp) === dayKey(now) && Date.parse(s.timestamp) <= now).forEach((s) => counts.set(s.staffId, (counts.get(s.staffId) || 0) + 1));
  return (staffList || []).map((p) => ({ id: p.id, name: p.name, role: p.role, orders: counts.get(p.id) || 0 }));
}
