/* ProPos prototip — POS akışı (masalar → adisyon → ürün → çeşit → ödeme) + patron görünümü.
   Saf JS, derleme yok. Durum bellekte; yalnızca ayarlar localStorage'da. */
(function () {
  'use strict';
  const D = PP_DATA, M = PPMotion, C = PPCelebrate;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NF = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const NF0 = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
  const money = n => NF.format(Math.round(n * 100) / 100);
  const money0 = n => NF0.format(Math.round(n));
  const PRODUCTS = Object.fromEntries(D.products.map(p => [p.id, p]));
  const TABLES = {}; D.areas.forEach(a => a.tables.forEach(t => { TABLES[t.id] = Object.assign({ area: a.id }, t); }));
  const BIZ = D.brandSettings.businessName;
  const GOAL = D.brandSettings.dailyGoal;
  document.title = BIZ + ' · ProPos';

  /* ---------- Ayarlar ---------- */
  const SKEY = 'propos.proto.settings';
  const settings = Object.assign({ celebrations: true, sound: false, autoSimplify: true, leaderboard: false, motion: 'system', busy: false },
    (() => { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) { return {}; } })());
  const saveSettings = () => { localStorage.setItem(SKEY, JSON.stringify(settings)); applySettings(); };

  /* ---------- Saat (simülasyon 14:20'den akar) ---------- */
  const T0 = Date.now();
  const simNow = () => D.series.nowMin + (Date.now() - T0) / 60000;
  const hhmm = m => { m = Math.floor(m); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

  /* ---------- Durum ---------- */
  const state = { view: 'tables', area: 'salon', table: null, cat: 'kahve', expanded: null, boss: false, day: Object.assign({}, D.day), story: D.story.slice(), orderTimes: [] };
  const tickets = {};

  function optsFromSel(pid, sel) {
    const out = [];
    PRODUCTS[pid].opts.forEach(gid => {
      const g = D.optionGroups[gid], v = sel[gid];
      if (v === undefined || v === null) return;
      (Array.isArray(v) ? v : [v]).forEach(ix => { const c = g.choices[ix]; out.push({ g: gid, gname: g.name, c: ix, name: c[0], price: c[1] }); });
    });
    return out;
  }
  function makeLine(pid, opts, qty) {
    const p = PRODUCTS[pid];
    return { key: pid + '|' + opts.map(o => o.g + ':' + o.c).join(','), pid, name: p.name, unit: p.price + opts.reduce((s, o) => s + o.price, 0), qty, opts, notes: [], sent: 0 };
  }
  Object.keys(D.openTickets).forEach(tid => {
    const t = D.openTickets[tid];
    tickets[tid] = { opened: simNow() - t.min, lines: t.lines.map(([pid, qty, sel]) => { const l = makeLine(pid, optsFromSel(pid, sel || {}), qty); l.sent = qty; return l; }) };
  });
  const total = t => t ? t.lines.reduce((s, l) => s + l.unit * l.qty, 0) : 0;
  const count = t => t ? t.lines.reduce((s, l) => s + l.qty, 0) : 0;
  const costOf = t => t.lines.reduce((s, l) => s + PRODUCTS[l.pid].cost * l.qty, 0);
  const elapsed = t => Math.max(0, Math.round(simNow() - t.opened));
  const optSummary = l => l.opts.map(o => o.name).join(' · ');

  function isBusy() {
    if (settings.busy) return true;
    const now = simNow();
    return state.orderTimes.filter(t => now - t < 10).length >= 8; // 10 dk'da 8+ ödeme
  }

  /* ---------- Bildirim (işlevsel, kutlama değil) ---------- */
  function notify(text, ic) {
    const old = $('.cel-toast'); if (old) old.remove();
    let layer = $('.cel-layer'); if (!layer) { layer = document.createElement('div'); layer.className = 'cel-layer'; document.body.appendChild(layer); }
    const el = document.createElement('div'); el.className = 'cel-toast tone-neutral';
    el.innerHTML = '<span class="cel-toast-ic">' + icon(ic || 'check') + '</span><span class="cel-toast-body"><span class="cel-toast-title">' + esc(text) + '</span></span>';
    layer.appendChild(el);
    M.anim(el, [{ opacity: 0, transform: 'translate(-50%, -10px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 200 });
    el.addEventListener('click', () => el.remove());
    setTimeout(() => { const a = M.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }); if (a) a.finished.then(() => el.remove()); else el.remove(); }, 2000);
  }
  function syncPulse() {
    const s = $('#sync'); if (!s) return;
    s.classList.add('is-pending'); $('.sync-label', s).textContent = 'Kaydediliyor';
    clearTimeout(syncPulse.t);
    syncPulse.t = setTimeout(() => { s.classList.remove('is-pending'); $('.sync-label', s).textContent = 'Kaydedildi'; }, 650);
  }

  /* ---------- Kabuk ---------- */
  function shell() {
    $('#rail').innerHTML =
      '<div class="rail-logo" aria-label="ProPos">P</div>' +
      railBtn('tables', 'grid', 'Masalar') + railBtn('order', 'receipt', 'Adisyon') + railBtn('boss', 'chart', 'Patron') +
      '<a class="rail-btn" href="kutlamalar.html">' + icon('sparkles') + 'Kutlama</a>' +
      '<div class="rail-spacer"></div>' + railBtn('settings', 'sliders', 'Ayarlar');
    $('#topbar').innerHTML =
      '<div class="brand"><span class="brand-name">' + esc(BIZ) + '</span><span class="brand-product">ProPos</span></div>' +
      '<div class="topbar-mid">' +
      '<button class="goal pressable" id="goal" type="button" aria-label="Günlük hedef">' + icon('target') +
      '<span class="goal-body"><span class="goal-row"><span id="goalText"></span><span id="goalPct" class="num"></span></span><span class="bar"><span class="bar-fill" id="goalFill"></span></span></span></button>' +
      '<button class="streak pressable" id="streak" type="button" aria-label="Hatasız sipariş serisi">' + icon('flame') + '<span id="streakN" class="num"></span></button>' +
      '<span class="busy-chip" id="busy" hidden>' + icon('zap', 'ic-sm') + 'Yoğun saat · kutlamalar sade</span>' +
      '</div>' +
      '<div class="topbar-right"><span class="sync" id="sync"><span class="sync-dot"></span><span class="sync-label">Kaydedildi</span></span>' +
      '<span class="clock num" id="clock"></span><span class="avatar" title="' + esc(D.staff.name + ' · ' + D.staff.role) + '">' + esc(D.staff.name[0]) + '</span></div>';
    $('#rail').addEventListener('click', e => {
      const b = e.target.closest('[data-nav]'); if (!b) return;
      const v = b.dataset.nav;
      if (v === 'settings') return openSettings();
      if (v === 'order' && !state.table) { notify('Önce bir masa seçin', 'grid'); return show('tables'); }
      show(v);
    });
    $('#goal').addEventListener('click', () => notify('Hedef ' + money0(GOAL) + ' · kalan ' + money0(Math.max(0, GOAL - state.day.revenue)), 'target'));
    $('#streak').addEventListener('click', () => notify('Senin serin: ' + state.day.streak + ' hatasız sipariş · en iyi ' + state.day.bestStreak, 'flame'));
    updateTop();
    tick();
    setInterval(tick, 20000);
  }
  const railBtn = (v, ic, label) => '<button class="rail-btn" type="button" data-nav="' + v + '">' + icon(ic) + label + '</button>';
  function tick() {
    $('#clock').textContent = hhmm(simNow());
    if (state.view === 'tables' && !document.querySelector('.sheet-wrap')) renderTables(false);
  }
  function updateTop(prevRevenue) {
    const r = state.day.revenue, ratio = r / GOAL;
    $('#goalText').textContent = money0(r) + ' / ' + money0(GOAL);
    $('#goalPct').textContent = '%' + Math.min(999, Math.round(ratio * 100));
    $('#goal').classList.toggle('is-done', ratio >= 1);
    M.progress($('#goalFill'), ratio, prevRevenue !== undefined ? Math.min(1, prevRevenue / GOAL) : undefined);
    $('#streakN').textContent = state.day.streak;
    renderBusy();
  }
  function renderBusy() { const b = $('#busy'); if (b) b.hidden = !isBusy(); }

  function show(v) {
    state.view = v;
    $$('.rail-btn[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav === v ? 'page' : 'false'));
    $$('.view').forEach(s => { s.hidden = s.id !== 'view-' + v; });
    if (v === 'tables') renderTables(true);
    if (v === 'order') renderOrder();
    if (v === 'boss') renderBoss();
    M.anim($('#view-' + v), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200 });
  }

  /* ---------- Masalar ---------- */
  function renderTables(animate) {
    const area = D.areas.find(a => a.id === state.area);
    const seg = D.areas.map(a => {
      const busy = a.tables.filter(t => tickets[t.id]).length;
      return '<button type="button" data-area="' + a.id + '" aria-pressed="' + (a.id === state.area) + '">' + esc(a.name) + ' <span class="seg-count num">' + busy + '/' + a.tables.length + '</span></button>';
    }).join('');
    const cards = area.tables.map(t => tableCard(t)).join('');
    const v = $('#view-tables');
    v.innerHTML = '<div class="view-pad"><div class="toolbar"><div class="seg" role="group" aria-label="Bölüm">' + seg + '</div>' +
      '<div class="legend"><span><i style="background:var(--primary)"></i>Açık</span><span><i style="background:var(--warning)"></i>60 dk+</span><span><i style="background:var(--surface-4)"></i>Boş</span></div>' +
      '<div class="toolbar-spacer"></div><button class="btn btn-secondary" type="button" id="quick">' + icon('bag') + 'Hızlı satış</button></div>' +
      '<div class="tables">' + cards + '</div></div>';
    if (animate) $$('.table', v).forEach((el, i) => M.rise(el, Math.min(i * 18, 220), 8));
    $('.seg', v).addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) { state.area = b.dataset.area; renderTables(true); } });
    $('.tables', v).addEventListener('click', e => { const b = e.target.closest('[data-table]'); if (b) { M.flash(b); openTable(b.dataset.table); } });
    $('#quick').addEventListener('click', () => {
      const free = D.areas.find(a => a.id === 'paket').tables.find(t => !tickets[t.id]) || D.areas[2].tables[0];
      openTable(free.id);
    });
  }
  function tableCard(t) {
    const tk = tickets[t.id];
    if (!tk) {
      return '<button type="button" class="table is-empty pressable" data-table="' + t.id + '"><div class="table-top"><div><div class="table-name">' + esc(t.name) + '</div>' +
        '<div class="table-seats">' + (t.seats ? t.seats + ' kişilik' : 'Paket') + '</div></div></div><div class="table-empty-hint">' + icon('plus', 'ic-sm') + 'Adisyon aç</div><span class="table-done">' + icon('check') + '</span></button>';
    }
    const min = elapsed(tk), long = min >= 60;
    return '<button type="button" class="table is-busy pressable' + (long ? ' is-long' : '') + '" data-table="' + t.id + '"><div class="table-top"><div><div class="table-name">' + esc(t.name) + '</div>' +
      '<div class="table-seats">' + (t.seats ? t.seats + ' kişilik' : 'Paket') + '</div></div><span class="ring" style="--p:' + Math.min(100, Math.round(min / 90 * 100)) + '" title="' + min + ' dk açık"></span></div>' +
      '<div class="table-amount">' + money(total(tk)) + '</div><div class="table-meta"><span class="t-time">' + icon('clock') + min + ' dk</span><span>' + icon('receipt') + count(tk) + ' ürün</span></div>' +
      '<span class="table-done">' + icon('check') + '</span></button>';
  }
  function openTable(tid) {
    state.table = tid; state.expanded = null;
    const p = PRODUCTS[(tickets[tid] && tickets[tid].lines[0] || {}).pid];
    if (p) state.cat = p.cat;
    show('order');
  }

  /* ---------- Adisyon ---------- */
  function renderOrder() {
    const v = $('#view-order');
    const cats = D.categories.map(c => '<button type="button" class="cat pressable" data-cat="' + c.id + '" aria-pressed="' + (c.id === state.cat) + '">' + esc(c.name) +
      '<span class="cat-n num">' + D.products.filter(p => p.cat === c.id).length + '</span></button>').join('');
    v.innerHTML = '<div class="order"><nav class="cats" aria-label="Kategoriler"><button type="button" class="btn btn-ghost order-back" id="back">' + icon('left') + 'Masalar</button>' + cats + '</nav>' +
      '<div class="products" id="products"></div><aside class="ticket" id="ticket" aria-label="Adisyon"></aside>' +
      '<button type="button" class="btn btn-primary btn-lg mobile-ticket-bar" id="mbar"></button></div>';
    $('#back').addEventListener('click', () => show('tables'));
    $('.cats', v).addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      state.cat = b.dataset.cat;
      $$('.cat', v).forEach(x => x.setAttribute('aria-pressed', x === b));
      renderProducts(true);
    });
    $('#products').addEventListener('click', e => {
      const b = e.target.closest('[data-pid]'); if (!b) return;
      const p = PRODUCTS[b.dataset.pid];
      M.flash(b);
      if (p.opts.length) openPicker(p, b); else addLine(p.id, [], 1, b);
    });
    $('#mbar').addEventListener('click', () => $('#ticket').classList.add('is-open'));
    renderProducts(false);
    renderTicket();
  }
  function renderProducts(animate) {
    const tk = tickets[state.table];
    const qtyOf = pid => tk ? tk.lines.filter(l => l.pid === pid).reduce((s, l) => s + l.qty, 0) : 0;
    const box = $('#products');
    box.innerHTML = D.products.filter(p => p.cat === state.cat).map(p => {
      const q = qtyOf(p.id);
      return '<button type="button" class="product pressable" data-pid="' + p.id + '"><span class="product-name">' + esc(p.name) + '</span>' +
        '<span class="product-foot"><span class="product-price">' + money(p.price) + '</span>' + (p.opts.length ? '<span class="product-opt" title="Çeşitli">' + icon('sliders') + '</span>' : '') + '</span>' +
        (q ? '<span class="product-qty num">' + q + '</span>' : '') + '</button>';
    }).join('');
    if (animate) $$('.product', box).forEach((el, i) => M.rise(el, i * 22, 6));
  }
  function updateProductBadge(pid, bump) {
    const b = $('#products [data-pid="' + pid + '"]'); if (!b) return;
    const tk = tickets[state.table];
    const q = tk ? tk.lines.filter(l => l.pid === pid).reduce((s, l) => s + l.qty, 0) : 0;
    let el = $('.product-qty', b);
    if (!q) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('span'); el.className = 'product-qty num'; b.appendChild(el); M.pop(el); }
    el.textContent = q;
    if (bump) M.bump(el);
  }

  function renderTicket(flashKey) {
    const tk = tickets[state.table], t = TABLES[state.table];
    const box = $('#ticket'); if (!box) return;
    const n = count(tk), sum = total(tk);
    const unsent = tk ? tk.lines.reduce((s, l) => s + Math.max(0, l.qty - l.sent), 0) : 0;
    const lines = tk && tk.lines.length ? tk.lines.map(l => {
      const open = state.expanded === l.key;
      return '<div class="line-wrap" data-key="' + esc(l.key) + '"><button type="button" class="line pressable" aria-expanded="' + open + '" data-line="' + esc(l.key) + '">' +
        '<span class="line-qty num">' + l.qty + '</span><span><span class="line-name">' + esc(l.name) + '</span>' +
        (l.opts.length ? '<span class="line-opts" style="display:block">' + esc(optSummary(l)) + '</span>' : '') +
        (l.notes.length ? '<span class="line-note" style="display:block">' + esc(l.notes.join(' · ')) + '</span>' : '') + '</span>' +
        '<span class="line-price">' + money(l.unit * l.qty) + '</span></button>' +
        (open ? '<div class="line-tools"><span class="stepper"><button type="button" data-act="dec" aria-label="Azalt">' + icon('minus', 'ic-sm') + '</button><span class="num">' + l.qty + '</span>' +
          '<button type="button" data-act="inc" aria-label="Artır">' + icon('plus', 'ic-sm') + '</button></span>' +
          ['Acele', 'Az buzlu', 'Paket'].map(nt => '<button type="button" class="chip" data-act="note" data-note="' + nt + '" aria-pressed="' + l.notes.includes(nt) + '">' + nt + '</button>').join('') +
          '<button type="button" class="btn btn-danger btn-icon" data-act="del" aria-label="Satırı sil">' + icon('trash', 'ic-sm') + '</button></div>' : '') + '</div>';
    }).join('') : '<div class="ticket-empty">' + icon('receipt') + '<div>Adisyon boş<br><span class="label">Ürüne dokunun; çeşitli ürünlerde seçim penceresi açılır</span></div></div>';
    box.innerHTML = '<div class="ticket-head"><div><div class="ticket-sub">' + (tk ? 'Açık · ' + elapsed(tk) + ' dk' : 'Yeni adisyon') + '</div><h2 class="ticket-title">' + esc(t.name) + '</h2></div>' +
      '<span style="display:flex;gap:8px;align-items:center"><span class="count-badge num' + (n ? ' has-items' : '') + '" id="countBadge">' + n + '</span>' +
      '<button type="button" class="btn btn-ghost btn-icon mobile-only" id="tclose" aria-label="Kapat">' + icon('x') + '</button></span></div>' +
      '<div class="lines" id="lines">' + lines + '</div>' +
      '<div class="ticket-foot"><div class="sum-row"><span>' + n + ' ürün</span><span>KDV dahil</span></div>' +
      '<div class="total-row"><span class="label" style="font-size:var(--fs-md)">Toplam</span><span class="money-total" id="ticketTotal">' + money(sum) + '</span></div>' +
      '<div class="ticket-actions"><button type="button" class="btn btn-secondary btn-lg" id="send"' + (unsent ? '' : ' disabled') + '>' + icon('send', 'ic-sm') + 'Gönder' + (unsent ? ' <span class="num">(' + unsent + ')</span>' : '') + '</button>' +
      '<button type="button" class="btn btn-primary btn-lg" id="pay"' + (n ? '' : ' disabled') + '>Ödeme' + icon('arrow', 'ic-sm') + '</button></div></div>';
    const mbar = $('#mbar'); if (mbar) mbar.innerHTML = '<span>' + icon('receipt') + ' ' + n + ' ürün</span><span class="money-total">' + money(sum) + '</span>';
    $('#lines').addEventListener('click', onLineClick);
    $('#pay').addEventListener('click', openPayment);
    $('#send').addEventListener('click', () => {
      tk.lines.forEach(l => { l.sent = l.qty; });
      syncPulse(); renderTicket();
      notify('Bara/mutfağa ' + unsent + ' yeni ürün gönderildi', 'send');
    });
    const tc = $('#tclose'); if (tc) tc.addEventListener('click', () => box.classList.remove('is-open'));
    if (flashKey) {
      const w = $('.line-wrap[data-key="' + CSS.escape(flashKey) + '"] .line', box);
      if (w) { M.flash(w); w.scrollIntoView({ block: 'nearest' }); }
    }
  }
  function onLineClick(e) {
    const tk = tickets[state.table];
    const act = e.target.closest('[data-act]');
    const wrap = e.target.closest('.line-wrap'); if (!wrap) return;
    const l = tk.lines.find(x => x.key === wrap.dataset.key); if (!l) return;
    if (!act) { state.expanded = state.expanded === l.key ? null : l.key; renderTicket(); return; }
    const a = act.dataset.act;
    if (a === 'inc') { l.qty++; afterChange(l); }
    else if (a === 'dec') { if (l.qty > 1) { l.qty--; afterChange(l); } else removeLine(l); }
    else if (a === 'del') removeLine(l);
    else if (a === 'note') { const nt = act.dataset.note; l.notes = l.notes.includes(nt) ? l.notes.filter(x => x !== nt) : l.notes.concat(nt); syncPulse(); renderTicket(); }
  }
  function afterChange(l) {
    syncPulse(); renderTicket(); updateProductBadge(l.pid, true);
    M.bump($('#countBadge'));
  }
  function removeLine(l) {
    const tid = state.table, tk = tickets[tid], ix = tk.lines.indexOf(l);
    tk.lines.splice(ix, 1); state.expanded = null;
    if (!tk.lines.length) delete tickets[tid];
    syncPulse(); renderTicket(); updateProductBadge(l.pid);
    // onay penceresi yok: 5 sn geri al
    M.undo(l.qty + '× ' + l.name + ' silindi', () => {
      if (!tickets[tid]) tickets[tid] = tk;
      tk.lines.splice(Math.min(ix, tk.lines.length), 0, l);
      if (state.view === 'order' && state.table === tid) { renderTicket(l.key); updateProductBadge(l.pid, true); }
    }, { icon: 'trash' });
  }
  function addLine(pid, opts, qty, src) {
    const tid = state.table;
    if (!tickets[tid]) tickets[tid] = { opened: simNow(), lines: [] };
    const tk = tickets[tid], nl = makeLine(pid, opts, qty);
    const ex = tk.lines.find(l => l.key === nl.key);
    if (ex) ex.qty += qty; else tk.lines.push(nl);
    syncPulse();
    renderTicket((ex || nl).key);
    updateProductBadge(pid, true);
    const badge = $('#countBadge');
    // iyimser: rakam hemen güncel; uçuş bitince rozet sıçrar
    M.fly(src, badge, { label: qty > 1 ? String(qty) : '' }).then(() => M.bump(badge));
    if (M.reduced()) M.bump(badge);
  }

  /* ---------- Pencere yardımcıları ---------- */
  function openSheet(html, onClose) {
    const w = document.createElement('div'); w.className = 'sheet-wrap';
    w.innerHTML = '<div class="sheet-back"></div><div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(w);
    M.anim($('.sheet-back', w), [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    M.anim($('.sheet', w), [{ opacity: 0, transform: 'translateY(28px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: M.EASE.out });
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; removeEventListener('keydown', key);
      const a = M.anim($('.sheet', w), [{ opacity: 1 }, { opacity: 0, transform: 'translateY(16px)' }], { duration: 150, fill: 'forwards' });
      M.anim($('.sheet-back', w), [{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
      if (a) a.finished.then(() => w.remove()); else w.remove();
      onClose && onClose();
    };
    const key = e => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', key);
    $('.sheet-back', w).addEventListener('click', close);
    return { el: w, close };
  }

  /* ---------- Çeşit seçimi ---------- */
  function openPicker(p, src) {
    const sel = {}; let qty = 1;
    p.opts.forEach(gid => { const g = D.optionGroups[gid]; if (g.type === 'multi') sel[gid] = []; else if (g.required) sel[gid] = g.def || 0; });
    const price = () => (p.price + optsFromSel(p.id, sel).reduce((s, o) => s + o.price, 0)) * qty;
    const groupsHtml = () => p.opts.map(gid => {
      const g = D.optionGroups[gid];
      const tagTxt = g.required ? '<span class="tag tag-primary">Zorunlu</span>' : g.type === 'multi' ? '<span class="tag">En fazla ' + g.max + '</span>' : '<span class="tag">İsteğe bağlı</span>';
      return '<div class="opt-group"><div class="opt-group-head"><span class="opt-group-name">' + esc(g.name) + '</span>' + tagTxt + '</div><div class="opt-choices">' +
        g.choices.map((c, i) => {
          const on = g.type === 'multi' ? sel[gid].includes(i) : sel[gid] === i;
          return '<button type="button" class="chip" data-g="' + gid + '" data-c="' + i + '" aria-pressed="' + on + '">' + esc(c[0]) + (c[1] ? '<span class="chip-price">+' + money(c[1]) + '</span>' : '') + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    const s = openSheet('<div class="sheet-head"><div><div class="label">Çeşit seçimi · ' + money(p.price) + '</div><h2 class="sheet-title">' + esc(p.name) + '</h2></div>' +
      '<button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<div id="groups">' + groupsHtml() + '</div>' +
      '<div class="sheet-foot"><span class="stepper"><button type="button" data-q="-1" aria-label="Azalt">' + icon('minus', 'ic-sm') + '</button><span class="num" id="pq">1</span><button type="button" data-q="1" aria-label="Artır">' + icon('plus', 'ic-sm') + '</button></span>' +
      '<button type="button" class="btn btn-primary btn-lg" id="padd">Ekle · <span class="num" id="pprice">' + money(price()) + '</span></button></div>');
    const el = s.el;
    $('[data-close]', el).addEventListener('click', s.close);
    $('#groups', el).addEventListener('click', e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      const g = D.optionGroups[b.dataset.g], i = +b.dataset.c;
      if (g.type === 'multi') {
        const arr = sel[g.id];
        if (arr.includes(i)) arr.splice(arr.indexOf(i), 1);
        else if (arr.length < g.max) arr.push(i);
        else { M.shake(b.parentElement); return; }
      } else sel[g.id] = (sel[g.id] === i && !g.required) ? null : i;
      $$('[data-g="' + g.id + '"]', el).forEach(x => {
        const on = g.type === 'multi' ? sel[g.id].includes(+x.dataset.c) : sel[g.id] === +x.dataset.c;
        x.setAttribute('aria-pressed', on);
      });
      M.bump(b, 1.06);
      $('#pprice', el).textContent = money(price());
    });
    $$('[data-q]', el).forEach(b => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(20, qty + +b.dataset.q));
      $('#pq', el).textContent = qty; $('#pprice', el).textContent = money(price()); M.bump($('#pq', el));
    }));
    $('#padd', el).addEventListener('click', () => {
      const opts = optsFromSel(p.id, sel), btn = $('#padd', el), r = btn.getBoundingClientRect();
      s.close();
      addLine(p.id, opts, qty, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
  }

  /* ---------- Ödeme ---------- */
  function openPayment() {
    const tid = state.table, tk = tickets[tid]; if (!tk) return;
    const sum = total(tk);
    const pay = { method: 'card', received: sum, split: 2, paid: 0 };
    const cashChoices = () => {
      const c = [sum];
      [50, 100, 500, 1000].forEach(step => { const v = Math.ceil(sum / step) * step; if (v > sum && !c.includes(v) && c.length < 4) c.push(v); });
      while (c.length < 4) c.push(c[c.length - 1] + 500);
      return c;
    };
    const share = () => Math.round(sum / pay.split * 100) / 100;
    const panel = () => {
      if (pay.method === 'cash') {
        return '<div class="cash-grid">' + cashChoices().map((v, i) => '<button type="button" class="chip" data-cash="' + v + '" aria-pressed="' + (pay.received === v) + '">' + (i === 0 ? 'Tam' : money0(v)) + '</button>').join('') + '</div>' +
          '<div class="change"><span class="label" style="font-size:var(--fs-md)">Para üstü</span><span class="change-v" id="chg">' + money(Math.max(0, pay.received - sum)) + '</span></div>';
      }
      if (pay.method === 'card') return '<div class="card-wait">' + icon('card', 'ic-lg') + '<div><div style="font-weight:var(--fw-label)">POS cihazına ' + money(sum) + ' gönderilecek</div><div class="label">Temassız hazır · cihaz: Kasa 1</div></div></div>';
      const dots = Array.from({ length: pay.split }, (_, i) => '<span class="split-dot' + (i < pay.paid ? ' is-paid' : '') + '">' + (i < pay.paid ? icon('check') : '') + '</span>').join('');
      return '<div class="split-row"><span>Kişi sayısı</span><span class="stepper"><button type="button" data-split="-1" aria-label="Azalt"' + (pay.paid ? ' disabled' : '') + '>' + icon('minus', 'ic-sm') + '</button><span class="num">' + pay.split + '</span>' +
        '<button type="button" data-split="1" aria-label="Artır"' + (pay.paid ? ' disabled' : '') + '>' + icon('plus', 'ic-sm') + '</button></span></div>' +
        '<div class="split-row"><span>Kişi başı <span class="num" style="font-weight:var(--fw-head)">' + money(share()) + '</span></span><span class="split-dots" id="sdots">' + dots + '</span></div>';
    };
    const cta = () => pay.method === 'split' ? (pay.paid + 1) + '/' + pay.split + ' payı al · ' + money(share()) : 'Ödemeyi al · ' + money(sum);
    const s = openSheet('<div class="sheet-head"><div><div class="label">Ödeme</div><h2 class="sheet-title">' + esc(TABLES[tid].name) + '</h2></div>' +
      '<button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<div class="pay-total"><span class="label">Toplam · ' + count(tk) + ' ürün</span><span class="money-total">' + money(sum) + '</span></div>' +
      '<div class="pay-methods" role="group" aria-label="Ödeme yöntemi">' +
      [['cash', 'cash', 'Nakit'], ['card', 'card', 'Kart'], ['split', 'users', 'Böl']].map(([k, ic, l]) => '<button type="button" class="pay-method pressable" data-m="' + k + '" aria-pressed="' + (pay.method === k) + '">' + icon(ic) + l + '</button>').join('') +
      '</div><div class="pay-panel" id="ppanel">' + panel() + '</div>' +
      '<button type="button" class="btn btn-primary btn-lg btn-block" id="pdo">' + cta() + '</button>');
    const el = s.el;
    const refresh = () => { $('#ppanel', el).innerHTML = panel(); $('#pdo', el).textContent = cta(); };
    $('[data-close]', el).addEventListener('click', s.close);
    $('.pay-methods', el).addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b || pay.paid) return;
      pay.method = b.dataset.m;
      $$('[data-m]', el).forEach(x => x.setAttribute('aria-pressed', x === b));
      refresh(); M.rise($('#ppanel', el), 0, 6);
    });
    $('#ppanel', el).addEventListener('click', e => {
      const c = e.target.closest('[data-cash]');
      if (c) { pay.received = +c.dataset.cash; $$('[data-cash]', el).forEach(x => x.setAttribute('aria-pressed', x === c)); $('#chg', el).textContent = money(Math.max(0, pay.received - sum)); M.bump($('#chg', el), 1.12); return; }
      const sp = e.target.closest('[data-split]');
      if (sp) { pay.split = Math.max(2, Math.min(8, pay.split + +sp.dataset.split)); refresh(); }
    });
    $('#pdo', el).addEventListener('click', () => {
      if (pay.method === 'split' && pay.paid < pay.split - 1) {
        pay.paid++; refresh(); syncPulse();
        const d = $$('.split-dot', el)[pay.paid - 1]; M.pop(d);
        return;
      }
      s.close();
      closeTable(tid, pay.method === 'cash' ? 'Nakit' : pay.method === 'card' ? 'Kart' : 'Bölünmüş', pay.method === 'cash' ? Math.max(0, pay.received - sum) : 0);
    });
  }

  function closeTable(tid, methodLabel, change) {
    const tk = tickets[tid], amount = total(tk), cost = costOf(tk);
    const prev = Object.assign({}, state.day), storyLen = state.story.length;
    delete tickets[tid];
    const d = state.day;
    d.revenue += amount; d.cost += cost; d.orders++; d.streak++;
    if (methodLabel === 'Nakit') d.cash += amount; else d.card += amount;
    state.orderTimes.push(simNow());
    state.table = null;
    syncPulse();
    state.area = TABLES[tid].area;
    show('tables');
    const card = $('#view-tables [data-table="' + tid + '"]');
    if (card) {
      const done = $('.table-done', card);
      M.anim(done, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)', offset: .35 }, { opacity: 0, transform: 'scale(1)' }], { duration: 600 });
      M.anim($('.ic', done), [{ transform: 'scale(.4)' }, { transform: 'scale(1.15)', offset: .5 }, { transform: 'scale(1)' }], { duration: 420, easing: M.EASE.spring });
    }
    updateTop(prev.revenue);
    M.bump($('#streak'), 1.12);
    M.undo(TABLES[tid].name + ' kapandı · ' + money(amount) + ' · ' + methodLabel + (change ? ' · para üstü ' + money(change) : ''), () => {
      tickets[tid] = tk; state.day = prev; state.story.length = storyLen; state.orderTimes.pop();
      updateTop(); if (state.view === 'tables') renderTables(false); if (state.view === 'boss') renderBoss();
      notify(TABLES[tid].name + ' yeniden açıldı', 'undo');
    }, { icon: 'check' });
    setTimeout(() => celebrateSale(prev, amount, tid), 380);
  }

  /* Satış başına en fazla BİR kutlama (öncelik sırasıyla). Diğerleri yalnız mikro (sayaç sıçraması). */
  function celebrateSale(prev, amount, tid) {
    const d = state.day, t = hhmm(simNow()), name = TABLES[tid].name;
    const cands = [];
    if (prev.orders === 0) cands.push(['firstSale', { sub: name + ' · ' + money(amount) + ' — iyi bir başlangıç' }, 'Günün ilk satışı · ' + name + ' · ' + money(amount), 'sun']);
    if (prev.revenue < GOAL && d.revenue >= GOAL) cands.push(['goal', { sub: money0(GOAL) + ' hedef · saat ' + t + ' · ' + d.orders + ' sipariş' }, 'Günlük hedefe ulaşıldı (' + money0(GOAL) + ')', 'target']);
    if (prev.revenue < d.recordRevenue && d.revenue >= d.recordRevenue) cands.push(['record', { sub: 'Önceki rekor ' + money0(d.recordRevenue) + ' · şu an ' + money0(d.revenue) }, 'Günlük ciro rekoru kırıldı', 'trophy']);
    if (amount > d.biggestTicket) cands.push(['bigTicket', { sub: name + ' · ' + money(amount) }, 'Günün en büyük adisyonu · ' + name + ' · ' + money(amount), 'star']);
    if (d.streak % 25 === 0) cands.push(['streak', { n: d.streak }, D.staff.name + ' ' + d.streak + ' hatasız siparişe ulaştı', 'flame']);
    if (amount > d.biggestTicket) d.biggestTicket = amount;
    for (const [kind, data, storyText, ic] of cands) {
      const r = C.moment(kind, data);
      if (r.tier !== -1) { state.story.push({ t, icon: ic, text: storyText, isNew: true }); break; }
    }
  }

  /* ---------- Patron ---------- */
  function renderBoss() {
    const v = $('#view-boss');
    if (!state.boss) return renderPin(v);
    const d = state.day, S = D.series;
    const profit = d.revenue - d.cost, margin = d.revenue ? profit / d.revenue : 0;
    const avg = d.orders ? d.revenue / d.orders : 0;
    const delta = D.day.lastWeekSameDay ? (d.revenue - D.day.lastWeekSameDay) / D.day.lastWeekSameDay : 0;
    const dateTxt = D.day.date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    const openCount = Object.keys(tickets).length, openSum = Object.values(tickets).reduce((s, t) => s + total(t), 0);

    // yoğunluk
    const vals = S.typical.map((t, i) => S.today[i] !== null ? S.today[i] : S.forecast[i]);
    const max = Math.max.apply(null, vals.concat(S.typical)) * 1.1;
    const nowSlotF = Math.min(S.SLOTS, (simNow() - S.SLOT0) / 15);
    const heat = vals.map((val, i) => {
      const fc = S.today[i] === null, hot = val > S.typical[i] * 1.35;
      return '<div class="heat-col" title="' + hhmm(S.SLOT0 + i * 15) + ' · ' + val + ' sipariş (tipik ' + S.typical[i] + ')"><span class="heat-typ" style="height:' + (S.typical[i] / max * 100) + '%"></span>' +
        '<span class="heat-bar' + (fc ? ' is-fc' : '') + (hot ? ' is-hot' : '') + '" style="height:' + (val / max * 100) + '%"></span></div>';
    }).join('');
    const ev = [44, 45, 46, 47, 48, 49, 50], evF = ev.reduce((s, i) => s + S.forecast[i], 0), evT = ev.reduce((s, i) => s + S.typical[i], 0);

    // menü mühendisliği
    const items = D.products.map(p => ({ p, n: D.soldToday[p.id] || 0, m: p.price - p.cost }));
    const avgN = items.reduce((s, x) => s + x.n, 0) / items.length, avgM = items.reduce((s, x) => s + x.m, 0) / items.length;
    const maxN = Math.max.apply(null, items.map(x => x.n)), maxM = Math.max.apply(null, items.map(x => x.m));
    const W = 360, H = 230, pad = 26;
    const X = n => pad + Math.sqrt(n / maxN) * (W - pad * 2), Y = m => H - pad - (m / maxM) * (H - pad * 2);
    const quad = x => x.n >= avgN ? (x.m >= avgM ? 'star' : 'horse') : (x.m >= avgM ? 'puzzle' : 'dog');
    const fillOf = { star: 'var(--primary)', horse: 'var(--text-2)', puzzle: 'var(--success)', dog: 'var(--surface-4)' };
    const puzzle = items.filter(x => quad(x) === 'puzzle').sort((a, b) => b.m - a.m)[0];
    const horse = items.filter(x => quad(x) === 'horse').sort((a, b) => b.n - a.n)[0];
    const labelSet = new Set([puzzle && puzzle.p.id, horse && horse.p.id, 'latte', 'turk']);
    const dotsSvg = items.map(x => '<circle cx="' + X(x.n).toFixed(1) + '" cy="' + Y(x.m).toFixed(1) + '" r="' + (labelSet.has(x.p.id) ? 6 : 4.5) + '" style="fill:' + fillOf[quad(x)] + '"><title>' + esc(x.p.name) + ' · ' + x.n + ' adet · ' + money(x.m) + ' kâr/adet</title></circle>' +
      (labelSet.has(x.p.id) ? '<text x="' + (X(x.n) > W - 110 ? X(x.n) - 9 : X(x.n) + 9).toFixed(1) + '" y="' + (Y(x.m) + 4).toFixed(1) + '"' + (X(x.n) > W - 110 ? ' text-anchor="end"' : '') + ' style="fill:var(--text-2);font-size:12px">' + esc(x.p.name) + '</text>' : '')).join('');
    const matrix = '<svg class="matrix" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Menü mühendisliği matrisi">' +
      '<line x1="' + X(avgN) + '" y1="' + pad / 2 + '" x2="' + X(avgN) + '" y2="' + (H - pad) + '" style="stroke:var(--line);stroke-dasharray:3 4"/>' +
      '<line x1="' + pad + '" y1="' + Y(avgM) + '" x2="' + (W - pad / 2) + '" y2="' + Y(avgM) + '" style="stroke:var(--line);stroke-dasharray:3 4"/>' +
      '<text x="' + (W - pad / 2) + '" y="16" text-anchor="end" style="fill:var(--primary);font-size:12px;font-weight:500">Yıldız</text>' +
      '<text x="' + pad + '" y="16" style="fill:var(--success);font-size:12px;font-weight:500">Bilmece</text>' +
      '<text x="' + (W - pad / 2) + '" y="' + (H - pad - 6) + '" text-anchor="end" style="fill:var(--text-2);font-size:12px;font-weight:500">Beygir</text>' +
      '<text x="' + pad + '" y="' + (H - pad - 6) + '" style="fill:var(--text-3);font-size:12px;font-weight:500">Zayıf</text>' +
      dotsSvg +
      '<text x="' + (W / 2) + '" y="' + (H - 6) + '" text-anchor="middle" style="fill:var(--text-3);font-size:12px">Satış adedi →</text>' +
      '<text x="12" y="' + (H / 2) + '" text-anchor="middle" transform="rotate(-90 12 ' + (H / 2) + ')" style="fill:var(--text-3);font-size:12px">Adet başı kâr →</text></svg>';

    const top = items.map(x => Object.assign({ pr: x.n * x.m }, x)).sort((a, b) => b.pr - a.pr).slice(0, 5);
    const topMax = top[0].pr;
    const goalHit = d.revenue >= GOAL;
    const hist = D.goalHistory.concat([goalHit]);
    let run = 0; for (let i = hist.length - 1; i >= 0; i--) { if (hist[i]) run++; else if (i === hist.length - 1) continue; else break; }
    const team = settings.leaderboard
      ? D.team.slice().sort((a, b) => b.orders - a.orders).map((p, i) => '<div class="team-row"><span><span class="num muted">' + (i + 1) + '.</span> ' + esc(p.name) + ' <span class="label">' + esc(p.role) + '</span></span><span class="num">' + p.orders + ' sipariş</span></div>').join('')
      : D.team.map(p => '<div class="team-row"><span>' + esc(p.name) + ' <span class="label">' + esc(p.role) + '</span></span><span class="tag tag-success">Aktif</span></div>').join('') +
        '<p class="label" style="margin-top:10px">Sıralama kapalı: kişisel ilerleme yalnızca kişinin kendisine görünür. Ayarlar → Liderlik tablosu.</p>';

    v.innerHTML = '<div class="view-pad"><div class="boss">' +
      '<div class="boss-head"><div><div class="label">Patron görünümü · ' + esc(dateTxt) + '</div><h1>Bugün, ' + esc(BIZ) + '</h1></div>' +
      '<div style="display:flex;gap:8px;align-items:center"><span class="tag tag-success">' + icon('cloud', 'ic-sm') + 'Canlı</span><span class="label">Son satış ' + hhmm(simNow()) + '</span>' +
      '<button type="button" class="btn btn-ghost" id="lock">' + icon('lock', 'ic-sm') + 'Kilitle</button></div></div>' +

      '<div class="card kpi kpi-hero"><span class="label">Ciro</span><span class="kpi-v" data-count="' + d.revenue + '" data-fmt="money">' + money0(0) + '</span>' +
      '<span class="kpi-delta ' + (delta >= 0 ? 'is-up' : 'is-down') + '">' + icon(delta >= 0 ? 'up' : 'down') + '%' + Math.abs(Math.round(delta * 100)) + ' geçen cumaya göre</span>' +
      '<span class="bar" style="margin-top:6px"><span class="bar-fill" data-progress="' + Math.min(1, d.revenue / GOAL) + '"' + (goalHit ? ' style="background:var(--success)"' : '') + '></span></span><span class="label">Hedefin %' + Math.round(d.revenue / GOAL * 100) + '\'i · ' + money0(GOAL) + '</span></div>' +
      '<div class="card kpi"><span class="label">Brüt kâr</span><span class="kpi-v" data-count="' + profit + '" data-fmt="money">' + money0(0) + '</span><span class="kpi-delta is-up">Marj %' + Math.round(margin * 100) + '</span><span class="label">Ürün maliyeti düşülmüş; sabit gider hariç</span></div>' +
      '<div class="card kpi"><span class="label">Ortalama adisyon</span><span class="kpi-v" data-count="' + avg + '" data-fmt="money">' + money0(0) + '</span><span class="label">' + d.orders + ' sipariş · en büyük ' + money0(d.biggestTicket) + '</span></div>' +
      '<div class="card kpi"><span class="label">Şu an açık</span><span class="kpi-v" data-count="' + openSum + '" data-fmt="money">' + money0(0) + '</span><span class="label">' + openCount + ' masa · kasada nakit ' + money0(d.cash) + ', kart ' + money0(d.card) + '</span></div>' +

      '<div class="card span-8"><div class="card-head"><span class="card-title">Yoğunluk · 15 dk dilimler</span><span class="heat-legend"><span><i style="background:var(--primary)"></i>Bugün</span><span><i style="border:1px dashed var(--primary-line);background:var(--primary-soft)"></i>Tahmin</span><span><i style="height:2px;background:var(--text-3)"></i>Tipik (4 hafta medyanı)</span></span></div>' +
      '<div class="heat" id="heat">' + heat + '<span class="heat-now" style="left:' + (nowSlotF / S.SLOTS * 100) + '%"><span>Şimdi ' + hhmm(simNow()) + '</span></span></div>' +
      '<div class="heat-axis"><span>08</span><span>11</span><span>14</span><span>17</span><span>20</span><span>23</span></div></div>' +

      '<div class="card span-4" style="display:flex;flex-direction:column;gap:12px"><span class="card-title">Önden haber</span>' +
      '<div class="alert"><span class="alert-ic">' + icon('zap') + '</span><div><div class="alert-title">19:00–20:45 normalin ' + (evF / evT).toFixed(1).replace('.', ',') + ' katı bekleniyor</div>' +
      '<div class="alert-text">Tahmini ' + evF + ' sipariş (tipik ' + evT + '). Bara 1 kişi daha planlayın; limonata ve cold brew stoğuna bakın.</div>' +
      '<div class="alert-why">Neden: son 4 cumanın aynı saatleri + bugünkü gidiş (+%10) + takvimde işaretli maç akşamı.</div></div></div>' +
      '<div class="quad-hint">' + icon('up') + '<span>Bugün sabah zirvesi tipik günden %18 yüksek geçti; öğle arası normal.</span></div></div>' +

      '<div class="card span-5"><div class="card-head"><span class="card-title">Menü mühendisliği</span><span class="label">Bugün · ' + items.length + ' ürün</span></div>' + matrix +
      (puzzle ? '<div class="quad-hint">' + icon('eye') + '<span><span style="color:var(--success);font-weight:var(--fw-label)">Bilmece:</span> ' + esc(puzzle.p.name) + ' adet başı ' + money0(puzzle.m) + ' kâr bırakıyor ama bugün ' + puzzle.n + ' adet. Menüde üst sıraya alın, garsona önerme notu ekleyin.</span></div>' : '') +
      (horse ? '<div class="quad-hint">' + icon('cash') + '<span><span style="font-weight:var(--fw-label)">Beygir:</span> ' + esc(horse.p.name) + ' çok satıyor, kârı düşük. ₺5 artış günde ≈ ' + money0(horse.n * 5) + ' ek kâr.</span></div>' : '') + '</div>' +

      '<div class="card span-3"><div class="card-head"><span class="card-title">En çok kazandıranlar</span></div><div class="rank">' +
      top.map(x => '<div class="rank-row"><span class="rank-name">' + esc(x.p.name) + '</span><span class="rank-v">' + money0(x.pr) + '</span><span class="bar"><span class="bar-fill" data-progress="' + (x.pr / topMax) + '"></span></span></div>').join('') + '</div></div>' +

      '<div class="card span-4"><div class="card-head"><span class="card-title">Günün hikâyesi</span></div><div class="timeline">' +
      state.story.slice().reverse().slice(0, 6).map(s => '<div class="tl' + (s.isNew ? ' is-new' : '') + '"><span class="tl-t">' + esc(s.t) + '</span><span class="tl-ic">' + icon(s.icon) + '</span><span class="tl-text">' + esc(s.text) + '</span></div>').join('') + '</div></div>' +

      '<div class="card span-4"><div class="card-head"><span class="card-title">Hedef serisi</span><span class="tag tag-primary">' + icon('flame', 'ic-sm') + run + ' gün</span></div>' +
      '<div class="dots">' + hist.map((h, i) => '<span class="dot' + (h ? ' is-hit' : '') + (i === hist.length - 1 ? ' is-today' : '') + '" title="' + (h ? 'Hedef tuttu' : 'Tutmadı') + '"></span>').join('') + '</div>' +
      '<p class="label" style="margin-top:12px">Son 28 gün. Bugün çerçeveli; hedef tutunca dolar.</p></div>' +

      '<div class="card span-4"><div class="card-head"><span class="card-title">Ekip</span><span class="label">' + D.team.length + ' kişi vardiyada</span></div>' + team + '</div>' +

      '<div class="card span-4 zcard"><div><div class="card-head"><span class="card-title">Gün sonu (Z raporu)</span></div>' +
      '<div class="sum-row"><span>Brüt</span><span class="num">' + money(d.revenue) + '</span></div><div class="sum-row"><span>Nakit / Kart</span><span class="num">' + money0(d.cash) + ' / ' + money0(d.card) + '</span></div>' +
      '<div class="sum-row"><span>Açık masa</span><span class="num">' + openCount + ' (ertesi güne devreder)</span></div></div>' +
      '<button type="button" class="btn btn-primary btn-lg btn-block hold" id="zbtn"><span class="hold-fill"></span><span class="hold-label">Basılı tutun: Günü kapat</span></button></div>' +
      '</div></div>';

    // giriş: sayılar 0'dan, çubuklar alttan (≤600 ms, iş akışını beklemez)
    $$('[data-count]', v).forEach(el => M.countUp(el, 0, +el.dataset.count, money0, 600));
    $$('[data-progress]', v).forEach(el => M.progress(el, +el.dataset.progress, 0));
    $$('.heat-bar', v).forEach((b, i) => M.anim(b, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 320, delay: i * 4, fill: 'backwards' }));
    $$('.card', v).forEach((c, i) => M.rise(c, Math.min(i * 30, 240), 8));
    $('#lock').addEventListener('click', () => { state.boss = false; renderBoss(); });
    M.holdToConfirm($('#zbtn'), $('.hold-fill', v), 600, closeDay);
  }

  function closeDay() {
    const d = state.day, pct = d.revenue / GOAL * 100;
    C.moment('zReport', {
      sub: D.day.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) + ' · ' + d.orders + ' sipariş, iptal yok',
      stats: [{ label: 'Ciro', value: d.revenue, fmt: money0 }, { label: 'Brüt kâr', value: d.revenue - d.cost, fmt: money0 }, { label: 'Hedef', value: pct, fmt: n => '%' + Math.round(n) }]
    });
    // yeni gün: sayaçlar sıfır, kişisel seri sürer (Duolingo mantığı), açık masalar devreder
    state.day = Object.assign({}, D.day, { revenue: 0, cost: 0, orders: 0, cash: 0, card: 0, biggestTicket: 0, streak: d.streak, bestStreak: Math.max(d.bestStreak, d.streak) });
    state.story = [{ t: hhmm(simNow()), icon: 'flag', text: 'Z raporu alındı · yeni gün başladı', isNew: true }];
    D.goalHistory.push(d.revenue >= GOAL); D.goalHistory.shift();
    C.resetDay(); C.resetCooldown();
    updateTop(); renderBoss();
  }

  function renderPin(v) {
    let pin = '';
    v.innerHTML = '<div class="view-pad"><div class="pin"><span class="pin-lock">' + icon('lock', 'ic-lg') + '</span><h2>Yönetici PIN\'i</h2>' +
      '<p class="muted">Patron görünümü kilitli. Prototipte herhangi 4 hane açar.</p>' +
      '<div class="pin-dots">' + '<span class="pin-dot"></span>'.repeat(4) + '</div><div class="pin-pad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : '<button type="button" class="pin-key num" data-k="' + k + '"' + (k === '⌫' ? ' aria-label="Sil"' : '') + '>' + k + '</button>').join('') + '</div></div></div>';
    const dots = $$('.pin-dot', v);
    $('.pin-pad', v).addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      if (b.dataset.k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += b.dataset.k;
      dots.forEach((d, i) => d.classList.toggle('is-on', i < pin.length));
      if (b.dataset.k !== '⌫' && pin.length) M.pop(dots[pin.length - 1]);
      if (pin.length === 4) setTimeout(() => { state.boss = true; renderBoss(); }, 160);
    });
  }

  /* ---------- Ayarlar ---------- */
  function openSettings() {
    const w = document.createElement('div'); w.className = 'drawer-wrap';
    const sw = (k, title, desc) => '<div class="set-row"><span class="set-text"><span>' + title + '</span><span class="set-desc">' + desc + '</span></span>' +
      '<button type="button" class="switch-hit" data-k="' + k + '" role="switch" aria-checked="' + !!settings[k] + '" aria-label="' + esc(title) + '"><span class="switch" aria-checked="' + !!settings[k] + '"></span></button></div>';
    w.innerHTML = '<div class="sheet-back"></div><aside class="drawer" role="dialog" aria-label="Ayarlar"><div class="sheet-head"><h2 class="sheet-title">Ayarlar</h2><button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Kapat">' + icon('x') + '</button></div>' +
      '<div class="set-group label">KUTLAMALAR</div>' +
      sw('celebrations', 'Kutlamalar', 'Anlamlı anlarda tebrik; kapalıyken yalnızca işlevsel bildirim') +
      sw('autoSimplify', 'Yoğun saatte sadeleş', '10 dk\'da 8+ ödeme → afişler tosta iner, konfeti yok') +
      sw('sound', 'Ses', 'Varsayılan kapalı; kısa iki nota') +
      '<div class="set-row"><span class="set-text"><span>Hareket</span><span class="set-desc">Sistem = işletim sistemindeki "hareketi azalt" tercihi</span></span><span class="seg" id="motionSeg">' +
      [['system', 'Sistem'], ['reduce', 'Azalt'], ['full', 'Tam']].map(([k, l]) => '<button type="button" data-motion="' + k + '" aria-pressed="' + (settings.motion === k) + '">' + l + '</button>').join('') + '</span></div>' +
      '<div class="set-group label">EKİP</div>' + sw('leaderboard', 'Liderlik tablosu', 'Varsayılan kapalı; açıkken patron görünümünde sıralama') +
      '<div class="set-group label">PROTOTİP</div>' + sw('busy', 'Yoğun saati simüle et', 'Sadeleşmeyi denemek için') +
      '<div class="set-row"><span class="set-text"><span>Günü sıfırla</span><span class="set-desc">Ciro 0 → sonraki ödeme "ilk satış" kutlaması</span></span><button type="button" class="btn btn-secondary" id="resetDay">Sıfırla</button></div>' +
      '<div class="set-row"><span class="set-text"><span>Kutlama demo sayfası</span><span class="set-desc">Tüm anlar, kademeler, cihaz bütçesi</span></span><a class="btn btn-secondary" href="kutlamalar.html">' + icon('external', 'ic-sm') + 'Aç</a></div>' +
      '</aside>';
    document.body.appendChild(w);
    const dr = $('.drawer', w);
    M.anim(dr, [{ transform: 'translateX(-24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240 });
    M.anim($('.sheet-back', w), [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    const close = () => { const a = M.anim(dr, [{ opacity: 1 }, { opacity: 0, transform: 'translateX(-16px)' }], { duration: 150, fill: 'forwards' }); if (a) a.finished.then(() => w.remove()); else w.remove(); };
    $('.sheet-back', w).addEventListener('click', close);
    $('[data-close]', w).addEventListener('click', close);
    w.addEventListener('click', e => {
      const s = e.target.closest('[data-k]');
      if (s) {
        const k = s.dataset.k; settings[k] = !settings[k];
        s.setAttribute('aria-checked', settings[k]); $('.switch', s).setAttribute('aria-checked', settings[k]);
        saveSettings();
        if (k === 'leaderboard' && state.view === 'boss') renderBoss();
        if (k === 'sound' && settings.sound) C.sound.play('tick');
        return;
      }
      const m = e.target.closest('[data-motion]');
      if (m) { settings.motion = m.dataset.motion; $$('[data-motion]', w).forEach(x => x.setAttribute('aria-pressed', x === m)); saveSettings(); }
    });
    $('#resetDay', w).addEventListener('click', () => {
      state.day = Object.assign({}, state.day, { revenue: 0, cost: 0, orders: 0, cash: 0, card: 0, biggestTicket: 0 });
      C.resetDay(); C.resetCooldown(); updateTop(); close(); notify('Gün sıfırlandı — bir masadan ödeme alın', 'sun');
      if (state.view === 'boss') renderBoss();
    });
  }
  function applySettings() {
    M.setReduced(settings.motion === 'system' ? null : settings.motion === 'reduce');
    C.configure({ enabled: settings.celebrations, sound: settings.sound, autoSimplify: settings.autoSimplify, isBusy });
    renderBusy();
  }

  /* ---------- Başlat ---------- */
  applySettings();
  shell();
  // derin bağlantılar (yalnızca prototip/inceleme kolaylığı): #masa=S2, #patron (PIN'i atlar)
  const h = location.hash.slice(1);
  if (h.indexOf('masa=') === 0 && TABLES[h.slice(5)]) openTable(h.slice(5));
  else if (h === 'patron') { state.boss = true; show('boss'); }
  else show('tables');
})();
