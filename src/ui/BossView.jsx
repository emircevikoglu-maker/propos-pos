import React from "react";
import { usePos } from "../context/PosContext";
import { formatTL } from "../utils/formatters";
import { PPMotion as M } from "../design/motion";
import { density, headsUp, dayKpis, menuMatrix, dayStory, goalHistory, teamToday, slotTime, QUADRANTS, SLOTS } from "../utils/boss";
import { Ic } from "./Ic";
import { Bar, Card, Empty, HoldButton, Page, Tag } from "./page";
import { useNow } from "./hooks";

const QUAD_FILL = { star: "var(--primary)", horse: "var(--text-2)", puzzle: "var(--success)", dog: "var(--surface-4)" };

function Heat({ d }) {
  const ref = React.useRef(null);
  const values = d.typical.map((t, i) => (d.today[i] !== null ? d.today[i] : d.forecast[i]));
  const max = Math.max(1, ...values, ...d.typical) * 1.1;
  React.useEffect(() => {
    if (ref.current) ref.current.querySelectorAll(".heat-bar").forEach((b, i) => M.anim(b, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 320, delay: Math.min(i * 4, 220), fill: "backwards" }));
  }, []);
  return (
    <>
      <div className="heat" ref={ref} role="img" aria-label="15 dakikalık sipariş yoğunluğu: bugün, tahmin ve tipik">
        {values.map((v, i) => {
          const fc = d.today[i] === null;
          const hot = d.typical[i] >= 0.5 && v > d.typical[i] * 1.35;
          return (
            <div key={i} className="heat-col" title={`${slotTime(i)} · ${fc ? "tahmin " : ""}${Math.round(v * 10) / 10} sipariş (tipik ${Math.round(d.typical[i] * 10) / 10})`}>
              <span className="heat-typ" style={{ height: `${(d.typical[i] / max) * 100}%` }} />
              <span className={`heat-bar${fc ? " is-fc" : ""}${hot ? " is-hot" : ""}`} style={{ height: `${(v / max) * 100}%` }} />
            </div>
          );
        })}
        {d.nowSlot >= 0 && d.nowSlot < SLOTS - 1 && <span className="heat-now" style={{ left: `${((d.nowSlot + 1) / SLOTS) * 100}%` }}><span>Şimdi</span></span>}
      </div>
      <div className="heat-axis">{["08", "12", "16", "20", "24"].map((h) => <span key={h}>{h}</span>)}</div>
    </>
  );
}

function Matrix({ m }) {
  const W = 360, H = 230, pad = 26;
  const X = (n) => pad + Math.sqrt(n / m.maxN) * (W - pad * 2);
  const Y = (v) => H - pad - (Math.max(0, v) / m.maxM) * (H - pad * 2);
  const labelled = new Set([m.puzzle?.id, m.horse?.id, ...m.top.slice(0, 2).map((x) => x.id)]);
  const corner = (x, y, text, color, end) => <text x={x} y={y} textAnchor={end ? "end" : "start"} style={{ fill: color, fontSize: 12, fontWeight: 500 }}>{text}</text>;
  return (
    <svg className="matrix" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Menü mühendisliği matrisi">
      <line x1={X(m.avgN)} y1={pad / 2} x2={X(m.avgN)} y2={H - pad} style={{ stroke: "var(--line)", strokeDasharray: "3 4" }} />
      <line x1={pad} y1={Y(m.avgM)} x2={W - pad / 2} y2={Y(m.avgM)} style={{ stroke: "var(--line)", strokeDasharray: "3 4" }} />
      {corner(W - pad / 2, 16, QUADRANTS.star, "var(--primary)", true)}
      {corner(pad, 16, QUADRANTS.puzzle, "var(--success)")}
      {corner(W - pad / 2, H - pad - 6, QUADRANTS.horse, "var(--text-2)", true)}
      {corner(pad, H - pad - 6, QUADRANTS.dog, "var(--text-3)")}
      {m.items.map((x) => (
        <g key={x.id}>
          <circle cx={X(x.n)} cy={Y(x.margin)} r={labelled.has(x.id) ? 6 : 4.5} style={{ fill: QUAD_FILL[x.quad] }}>
            <title>{`${x.name} · ${x.n} adet · adet başı ${formatTL(x.margin)} · ${QUADRANTS[x.quad]}`}</title>
          </circle>
          {labelled.has(x.id) && <text x={X(x.n) > W - 120 ? X(x.n) - 9 : X(x.n) + 9} y={Y(x.margin) + 4} textAnchor={X(x.n) > W - 120 ? "end" : "start"} style={{ fill: "var(--text-2)", fontSize: 12 }}>{x.name.length > 18 ? `${x.name.slice(0, 17)}…` : x.name}</text>}
        </g>
      ))}
      <text x={W / 2} y={H - 6} textAnchor="middle" style={{ fill: "var(--text-3)", fontSize: 12 }}>Satış adedi →</text>
      <text x="12" y={H / 2} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`} style={{ fill: "var(--text-3)", fontSize: 12 }}>Adet başı kâr →</text>
    </svg>
  );
}

/** Patron görünümü (prototip): bugünün sayıları, yoğunluk, menü mühendisliği, hikâye, hedef serisi, ekip, gün kapanışı. */
export function BossView() {
  const { sales, products, ingredients, tables, staffList, brandSettings, celebration, voidLog, handleLockAdmin, celebrateZReport } = usePos();
  const now = useNow(60000);
  const goal = celebration && celebration.goal > 0 ? celebration.goal : 0;
  const k = React.useMemo(() => dayKpis({ sales, products, ingredients, tables, now }), [sales, products, ingredients, tables, now]);
  const d = React.useMemo(() => density(sales, now), [sales, now]);
  const alert = React.useMemo(() => headsUp(d), [d]);
  const matrix = React.useMemo(() => menuMatrix(sales, products, ingredients, now), [sales, products, ingredients, now]);
  const story = React.useMemo(() => dayStory({ sales, voidLog, goal, now, money: formatTL }), [sales, voidLog, goal, now]);
  const history = React.useMemo(() => goalHistory(sales, goal, now), [sales, goal, now]);
  const team = React.useMemo(() => teamToday(sales, staffList, now), [sales, staffList, now]);
  const date = new Date(now);
  const weekday = date.toLocaleDateString("tr-TR", { weekday: "long" });
  const paceText = d.pace >= 1.1 ? `bugün tipik günden %${Math.round((d.pace - 1) * 100)} yoğun` : d.pace <= 0.9 ? `bugün tipik günden %${Math.round((1 - d.pace) * 100)} sakin` : "bugün tipik gidişte";
  const basisText = d.sameWeekday ? `son ${d.basisDays} ${weekday} gününün aynı saatleri` : `son ${d.basisDays} satış gününün aynı saatleri`;
  const periodText = matrix.period === "today" ? "Bugün" : "Son 30 gün";
  const close = () => celebrateZReport({ count: k.orders, net: k.revenue, formatMoney: formatTL });

  return (
    <Page
      label={`Patron görünümü · ${date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}`}
      title={`Bugün, ${brandSettings.businessName || "ProPos"}`}
      actions={<button type="button" className="btn btn-ghost" onClick={handleLockAdmin}><Ic n="lock" className="ic-sm" />Kilitle</button>}
    >
      <div className="card kpi kpi-hero">
        <span className="label">Ciro</span>
        <span className="kpi-v">{formatTL(k.revenue)}</span>
        {k.delta !== null && <span className={`kpi-delta ${k.delta >= 0 ? "is-up" : "is-down"}`}><Ic n={k.delta >= 0 ? "up" : "down"} />%{Math.abs(Math.round(k.delta * 100))} geçen {weekday} gününe göre</span>}
        {goal > 0 && (<><Bar value={k.revenue / goal} tone={k.revenue >= goal ? "success" : undefined} /><span className="label">Hedefin %{Math.round((k.revenue / goal) * 100)}'i · {formatTL(goal)}</span></>)}
        {goal === 0 && <span className="label">Günlük hedef Yönetim → Hareket bölümünden belirlenir.</span>}
      </div>
      <div className="card kpi"><span className="label">Brüt kâr</span><span className="kpi-v">{formatTL(k.profit)}</span><span className={`kpi-delta ${k.profit >= 0 ? "is-up" : "is-down"}`}>Marj %{Math.round(k.margin * 100)}</span><span className="label">Malzeme maliyeti düşülmüş; sabit gider hariç</span></div>
      <div className="card kpi"><span className="label">Ortalama adisyon</span><span className="kpi-v">{formatTL(k.avgTicket)}</span><span className="label">{k.orders} sipariş{k.biggest ? ` · en büyük ${formatTL(k.biggest.total)}` : ""}</span></div>
      <div className="card kpi"><span className="label">Şu an açık</span><span className="kpi-v">{formatTL(k.openSum)}</span><span className="label">{k.openCount} masa · nakit {formatTL(k.cash)}, kart {formatTL(k.card)}</span></div>

      <Card span={8} title="Yoğunluk · 15 dk dilimler" aside={<span className="heat-legend"><span><i style={{ background: "var(--primary)" }} />Bugün</span><span><i style={{ border: "1px dashed var(--primary-line)", background: "var(--primary-soft)" }} />Tahmin</span><span><i style={{ height: 2, background: "var(--text-3)" }} />Tipik</span></span>}>
        <Heat d={d} />
      </Card>

      <Card span={4} title="Önden haber">
        {alert && alert.hot ? (
          <div className="alert">
            <span className="alert-ic"><Ic n="zap" /></span>
            <div>
              <div className="alert-title">{alert.from}–{alert.to} normalin {String(alert.ratio).replace(".", ",")} katı bekleniyor</div>
              <div className="alert-text">Tahmini {alert.expected} sipariş. Bara ek kişi planlayın, kritik stoklara bakın.</div>
              <div className="alert-why">Neden: {basisText} + {paceText}.</div>
            </div>
          </div>
        ) : alert ? (
          <div className="quad-hint"><Ic n="clock" /><span>Günün kalanında en yoğun aralık {alert.from}–{alert.to}: tahmini {alert.expected} sipariş. Neden: {basisText}.</span></div>
        ) : (
          <div className="quad-hint"><Ic n="clock" /><span>{d.basisDays < 2 ? "Tahmin için en az iki günlük satış geçmişi gerekir." : "Günün kalanında belirgin bir yoğunluk beklenmiyor."}</span></div>
        )}
        <div className="quad-hint"><Ic n={d.pace >= 1 ? "up" : "down"} /><span>Gidiş: {paceText}.</span></div>
      </Card>

      <Card span={5} title="Menü mühendisliği" aside={<span className="label">{periodText} · {matrix.items.length} ürün</span>}>
        {matrix.items.length === 0 ? <Empty icon="chart">Menüde ürün yok.</Empty> : <Matrix m={matrix} />}
        {matrix.puzzle && <div className="quad-hint"><Ic n="eye" /><span><span style={{ color: "var(--success)", fontWeight: "var(--fw-label)" }}>Bilmece:</span> {matrix.puzzle.name} adet başı {formatTL(matrix.puzzle.margin)} kâr bırakıyor ama {matrix.puzzle.n} adet satıldı. Menüde öne alın, garsona önerme notu verin.</span></div>}
        {matrix.horse && <div className="quad-hint"><Ic n="cash" /><span><span style={{ fontWeight: "var(--fw-label)" }}>Beygir:</span> {matrix.horse.name} çok satıyor, kârı düşük. ₺5 artış ≈ {formatTL(matrix.horse.n * 5)} ek kâr ({periodText.toLocaleLowerCase("tr-TR")} adediyle).</span></div>}
      </Card>

      <Card span={3} title="En çok kazandıranlar">
        {matrix.top.length === 0 ? <Empty icon="chart">Henüz satış yok.</Empty> : (
          <div className="rank">
            {matrix.top.map((x) => (
              <div key={x.id} className="rank-row"><span className="rank-name">{x.name}</span><span className="rank-v">{formatTL(x.earned)}</span><Bar value={x.earned / matrix.top[0].earned} /></div>
            ))}
          </div>
        )}
      </Card>

      <Card span={4} title="Günün hikâyesi">
        {story.length === 0 ? <Empty icon="sun">Bugün henüz satış yok.</Empty> : (
          <div className="timeline">
            {story.slice(0, 7).map((e, i) => (
              <div key={`${e.at}-${i}`} className={`tl${i === 0 ? " is-new" : ""}`}><span className="tl-t">{e.time}</span><span className="tl-ic"><Ic n={e.icon} /></span><span className="tl-text">{e.text}</span></div>
            ))}
          </div>
        )}
      </Card>

      <Card span={4} title="Hedef serisi" aside={goal > 0 && <Tag tone="primary"><Ic n="flame" className="ic-sm" />{history.run} gün</Tag>}>
        {goal === 0 ? <Empty icon="target">Günlük ciro hedefi tanımlayınca son 28 gün burada dolar.</Empty> : (
          <>
            <div className="dots">{history.hits.map((h, i) => <span key={i} className={`dot${h ? " is-hit" : ""}${i === history.hits.length - 1 ? " is-today" : ""}`} title={h ? "Hedef tuttu" : "Tutmadı"} />)}</div>
            <p className="label" style={{ marginTop: 12 }}>Son 28 gün. Bugün çerçeveli; hedef tutunca dolar.</p>
          </>
        )}
      </Card>

      <Card span={4} title="Ekip" aside={<span className="label">{team.length} kişi</span>}>
        {team.length === 0 ? <Empty icon="users">Çalışan eklenmemiş.</Empty> : celebration?.leaderboard ? (
          [...team].sort((a, b) => b.orders - a.orders).map((p, i) => (
            <div key={p.id} className="team-row"><span><span className="num muted">{i + 1}.</span> {p.name} <span className="label">{p.role}</span></span><span className="num">{p.orders} sipariş</span></div>
          ))
        ) : (
          <>
            {team.map((p) => <div key={p.id} className="team-row"><span>{p.name} <span className="label">{p.role}</span></span>{p.orders > 0 ? <Tag tone="success">Aktif</Tag> : <Tag>Henüz sipariş yok</Tag>}</div>)}
            <p className="label" style={{ marginTop: 10 }}>Sıralama kapalı. Yönetim → Hareket → Liderlik tablosu ile açılır.</p>
          </>
        )}
      </Card>

      <Card span={4} title="Gün sonu" className="zcard">
        <div>
          <div className="sum-row"><span>Bugünkü ciro</span><span className="num">{formatTL(k.revenue)}</span></div>
          <div className="sum-row"><span>Nakit / Kart</span><span className="num">{formatTL(k.cash)} / {formatTL(k.card)}</span></div>
          <div className="sum-row"><span>Açık masa</span><span className="num">{k.openCount} (devreder)</span></div>
          <p className="label">Ayrıntılı Z raporu ve yazdırma Finans bölümünde.</p>
        </div>
        <HoldButton onConfirm={close}>Basılı tutun: Günü kapat</HoldButton>
      </Card>
    </Page>
  );
}
