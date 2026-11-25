/* ProPos hareket + kutlama modülü — bağımlılıksız, ≈24 KB ham / ≈7,6 KB gzip.
   Kurallar: yalnızca transform/opacity (WAAPI), geçişler ≤600 ms, iş akışını bloklamaz,
   prefers-reduced-motion'a uyar, konfeti tek canvas + rAF + cihaz bütçesi.
   Üç parça: PPMotion (mikro etkileşim), PPConfetti (canvas), PPCelebrate (karar politikası + sahneler). */
import { icon } from './icons';

  const EASE = { out: 'cubic-bezier(.2,.8,.2,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', in: 'cubic-bezier(.4,0,1,1)' };
  const MAX = 600;
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let forced = null; // null = sistem tercihi

  function reduced() { return forced === null ? mq.matches : forced; }
  function syncAttr() { document.documentElement.dataset.motion = reduced() ? 'reduce' : 'full'; }
  if (mq.addEventListener) mq.addEventListener('change', syncAttr);
  syncAttr();

  function anim(el, frames, o) {
    if (!el || !el.animate || reduced()) return null;
    o = o || {};
    return el.animate(frames, { duration: Math.min(o.duration || 200, MAX), easing: o.easing || EASE.out, delay: o.delay || 0, fill: o.fill || 'none' });
  }

  /* ---------- PPMotion ---------- */
  const PPMotion = {
    EASE, reduced,
    setReduced(v) { forced = v; syncAttr(); },
    anim,
    /* sayaç sıçraması: sepet rozeti, seri sayısı */
    bump(el, k) {
      return anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (k || 1.28) + ')', offset: .35 }, { transform: 'scale(1)' }], { duration: 340, easing: EASE.spring });
    },
    /* giriş: kart, satır, rozet */
    pop(el, delay) {
      return anim(el, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: EASE.spring, delay: delay || 0, fill: 'backwards' });
    },
    rise(el, delay, dist) {
      return anim(el, [{ opacity: 0, transform: 'translateY(' + (dist || 10) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: delay || 0, fill: 'backwards' });
    },
    /* yanlış giriş: PIN */
    shake(el) {
      return anim(el, [0, -8, 7, -5, 3, 0].map(x => ({ transform: 'translateX(' + x + 'px)' })), { duration: 360 });
    },
    /* dokunuş parlaması: öğenin içinde tek bir .fx-flash katmanı, yalnızca opacity */
    flash(el, color) {
      if (!el || reduced()) return;
      let f = el.querySelector(':scope > .fx-flash');
      if (!f) { f = document.createElement('span'); f.className = 'fx-flash'; el.appendChild(f); }
      if (color) f.style.background = color;
      anim(f, [{ opacity: .38 }, { opacity: 0 }], { duration: 420 });
    },
    /* ürün → adisyon uçuşu: dış öğe X (doğrusal), iç öğe Y (ease-in) → yay. */
    fly(from, to, opts) {
      if (reduced() || !from || !to) return Promise.resolve();
      const a = from.getBoundingClientRect ? from.getBoundingClientRect() : from;
      const b = to.getBoundingClientRect();
      const sx = (a.x !== undefined && a.width === undefined) ? a.x : a.left + a.width / 2;
      const sy = (a.y !== undefined && a.height === undefined) ? a.y : a.top + a.height / 2;
      const dx = b.left + b.width / 2 - sx, dy = b.top + b.height / 2 - sy;
      const outer = document.createElement('div'); outer.className = 'fx-fly';
      outer.style.left = sx + 'px'; outer.style.top = sy + 'px';
      const inner = document.createElement('div'); inner.className = 'fx-fly-dot';
      if (opts && opts.label) inner.textContent = opts.label;
      outer.appendChild(inner); document.body.appendChild(outer);
      const d = 440;
      outer.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + dx + 'px)' }], { duration: d, easing: 'linear', fill: 'forwards' });
      const an = inner.animate([
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: 'translateY(' + Math.min(-40, dy * .2 - 40) + 'px) scale(1.1)', opacity: 1, offset: .3, easing: EASE.in },
        { transform: 'translateY(' + dy + 'px) scale(.45)', opacity: .5 }
      ], { duration: d, easing: EASE.out, fill: 'forwards' });
      return an.finished.then(() => outer.remove(), () => outer.remove());
    },
    /* sayı tween'i (KPI). Yalnızca textContent; düzen değişmesin diye tabular-nums + min-width. */
    countUp(el, from, to, fmt, dur) {
      fmt = fmt || (n => Math.round(n).toLocaleString('tr-TR'));
      if (reduced() || from === to) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), D = Math.min(dur || 600, MAX);
      const step = t => {
        const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    /* ilerleme çubuğu: scaleX (genişlik değil) */
    progress(el, ratio, animateFrom) {
      const r = Math.max(0, Math.min(1, ratio));
      if (animateFrom !== undefined && !reduced()) anim(el, [{ transform: 'scaleX(' + animateFrom + ')' }, { transform: 'scaleX(' + r + ')' }], { duration: 520, easing: EASE.out });
      el.style.transform = 'scaleX(' + r + ')';
    },
    /* basılı tut = onay (geri alınamayan eylemler için; modal yok). ms ≤ 600 */
    holdToConfirm(btn, fill, ms, onDone) {
      let a = null, timer = 0;
      const D = Math.min(ms || 600, MAX);
      const start = e => {
        if (btn.disabled) return; e.preventDefault();
        btn.classList.add('is-holding');
        if (!reduced()) a = fill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: D, easing: 'linear', fill: 'forwards' });
        timer = setTimeout(() => { cancel(true); onDone(); }, D);
      };
      const cancel = done => {
        clearTimeout(timer); btn.classList.remove('is-holding');
        if (a) { a.cancel(); a = null; }
        if (!done) fill.style.transform = 'scaleX(0)';
      };
      btn.addEventListener('pointerdown', start);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => cancel(false)));
      btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDone(); } });
    },
    /* onay yerine geri al: tek çubuk; yenisi gelince öncekini kalıcılaştırır. */
    undo(text, onUndo, opts) {
      opts = opts || {};
      const ms = opts.ms || 5000;
      const prev = document.querySelector('.undo');
      if (prev) prev._commit();
      const bar = document.createElement('div');
      bar.className = 'undo'; bar.setAttribute('role', 'status');
      bar.innerHTML = '<span class="undo-ic">' + icon(opts.icon || 'check') + '</span><span class="undo-text"></span>' +
        '<button class="btn btn-ghost undo-btn" type="button">' + icon('undo') + 'Geri al</button><span class="undo-timer"></span>';
      bar.querySelector('.undo-text').textContent = text;
      document.body.appendChild(bar);
      const timer = bar.querySelector('.undo-timer');
      // zamanlayıcı göstergesi: 5 sn doğrusal scaleX (geçiş değil, sayaç; kompozitörde çalışır)
      if (!reduced()) timer.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
      anim(bar, [{ opacity: 0, transform: 'translate(-50%, 16px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 220 });
      let done = false;
      const close = () => {
        if (done) return; done = true; clearTimeout(t);
        const a = anim(bar, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, 12px)' }], { duration: 160, fill: 'forwards' });
        if (a) a.finished.then(() => bar.remove()); else bar.remove();
      };
      bar._commit = () => { close(); opts.onCommit && opts.onCommit(); };
      const t = setTimeout(bar._commit, ms);
      bar.querySelector('.undo-btn').addEventListener('click', () => { close(); onUndo && onUndo(); });
      return { close: bar._commit };
    }
  };

  /* ---------- PPConfetti: tek canvas, rAF, uyarlanır bütçe ---------- */
  const PPConfetti = (function () {
    let cv = null, ctx = null, parts = [], raf = 0, last = 0, dpr = 1, W = 0, H = 0, slow = 0;
    function deviceBudget() {
      const c = navigator.hardwareConcurrency || 4, m = navigator.deviceMemory || 4;
      if (c <= 4 || m <= 2) return 45;      // zayıf Android tablet
      if (c <= 6 || m <= 4) return 90;
      return 150;
    }
    let budget = deviceBudget(), manual = null;
    const COLORS = ['#f5a524', '#ffb845', '#ffd27a', '#3ccf7b', '#f6f3ef', '#ff8c4f'];
    function ensure() {
      if (cv) return;
      cv = document.createElement('canvas'); cv.className = 'fx-confetti'; cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv); ctx = cv.getContext('2d');
      resize(); addEventListener('resize', resize);
    }
    function resize() {
      if (!cv) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5); // retina'da 3x çizme
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
    }
    function burst(o) {
      if (PPMotion.reduced()) return 0;
      ensure();
      o = o || {};
      const n = Math.round((manual || budget) * (o.power || 1));
      const x = o.x !== undefined ? o.x : W / 2, y = o.y !== undefined ? o.y : H / 3;
      const spread = o.spread || Math.PI * 2, angle = o.angle !== undefined ? o.angle : -Math.PI / 2;
      const speed = o.speed || 9;
      for (let i = 0; i < n; i++) {
        const a = angle + (Math.random() - .5) * spread, v = speed * (.45 + Math.random() * .75);
        parts.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          r: Math.random() * 6.28, vr: (Math.random() - .5) * .35,
          w: 5 + Math.random() * 5, h: 3 + Math.random() * 4,
          c: (o.colors || COLORS)[i % (o.colors || COLORS).length],
          t: 0, life: 700 + Math.random() * 450, round: Math.random() < .25
        });
      }
      cv.style.display = 'block';
      if (!raf) { last = performance.now(); slow = 0; raf = requestAnimationFrame(frame); }
      return n;
    }
    function frame(now) {
      const dt = Math.min(48, now - last); last = now;
      // uyarlama: art arda yavaş kare → bütçeyi kalıcı düşür, parçacıkların yarısını at
      if (dt > 26) { if (++slow > 4) { budget = Math.max(24, Math.round(budget * .6)); parts = parts.filter((_, i) => i % 2 === 0); slow = 0; } }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const k = dt / 16.7;
      let alive = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.t += dt; if (p.t >= p.life) continue;
        parts[alive++] = p;
        p.vx *= Math.pow(.94, k); p.vy = p.vy * Math.pow(.94, k) + .32 * k;
        p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k;
        const f = p.t / p.life;
        ctx.globalAlpha = f < .7 ? 1 : 1 - (f - .7) / .3;
        const cos = Math.cos(p.r) * dpr, sin = Math.sin(p.r) * dpr;
        ctx.setTransform(cos, sin, -sin * .6, cos * .6 + .4 * dpr, p.x * dpr, p.y * dpr);
        ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h * .7, 0, 6.283); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      parts.length = alive;
      if (alive) raf = requestAnimationFrame(frame);
      else { raf = 0; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    }
    return {
      burst,
      cannons(power) { // iki alt köşeden
        const p = power || 1;
        return burst({ x: 0, y: H || innerHeight, angle: -Math.PI / 3, spread: .9, speed: 17, power: p * .6 }) +
          burst({ x: W || innerWidth, y: H || innerHeight, angle: -Math.PI * 2 / 3, spread: .9, speed: 17, power: p * .6 });
      },
      budget: () => manual || budget,
      deviceBudget,
      setBudget(n) { manual = n; },
      active: () => parts.length
    };
  })();

  /* ---------- Ses (varsayılan KAPALI; dosya yok, WebAudio ile 2 nota) ---------- */
  const Sound = (function () {
    let ac = null;
    function tone(freq, at, dur, gain) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ac.currentTime + at);
      g.gain.linearRampToValueAtTime(gain, ac.currentTime + at + .015);
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + at + dur);
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + at); o.stop(ac.currentTime + at + dur + .02);
    }
    return {
      play(kind) {
        try {
          ac = ac || new (window.AudioContext || window.webkitAudioContext)();
          if (kind === 'tick') tone(880, 0, .09, .05);
          else if (kind === 'big') { tone(523, 0, .18, .07); tone(659, .09, .18, .07); tone(784, .18, .32, .08); }
          else { tone(659, 0, .14, .06); tone(988, .08, .22, .06); }
        } catch (e) { /* ses yoksa sessiz geç */ }
      }
    };
  })();

  /* ---------- PPCelebrate: karar politikası + sahneler ---------- */
  const PPCelebrate = (function () {
    const KICKERS = ['Müthiş!', 'Harika!', 'Süper!', 'Bravo!', 'Efsane!'];
    // tier: 0 mikro (yalnız sayaç), 1 tost, 2 afiş + konfeti, 3 kutlama ekranı
    const MOMENTS = {
      firstSale: { tier: 2, icon: 'sun', kicker: 'Günaydın!', title: 'Günün ilk satışı', once: true, tone: 'primary' },
      streak: { tier: 1, icon: 'flame', title: d => d.n + ' hatasız sipariş', sub: 'Seri sürüyor — iptal yok, düzeltme yok', tone: 'primary' },
      goal: { tier: 2, icon: 'target', title: 'Günlük hedefe ulaşıldı', once: true, tone: 'success' },
      record: { tier: 2, icon: 'trophy', kicker: 'Rekor!', title: 'En yüksek günlük ciro', once: true, tone: 'primary' },
      bigTicket: { tier: 1, icon: 'star', title: 'Günün en büyük adisyonu', tone: 'primary' },
      stockCount: { tier: 2, icon: 'box', title: 'Stok sayımı bitti', tone: 'success' },
      zReport: { tier: 3, icon: 'flag', kicker: 'Gün kapandı', title: 'Z raporu hazır', tone: 'success', always: true }
    };
    const cfg = { enabled: true, sound: false, autoSimplify: true, isBusy: () => false, cooldownMs: 90000, onLog: null };
    const seen = {};
    let lastBig = -Infinity, queue = [], showing = null;

    function resolve(kind) {
      const def = MOMENTS[kind]; if (!def) return { tier: -1, reasons: ['bilinmeyen an'] };
      let tier = def.tier; const reasons = [];
      if (def.once && seen[kind]) return { tier: -1, reasons: ['bugün zaten kutlandı'] };
      if (!cfg.enabled) { reasons.push('kutlamalar kapalı'); tier = def.always ? 'plain' : -1; return { tier, reasons }; }
      if (cfg.autoSimplify && cfg.isBusy() && tier >= 2 && !def.always) { tier = 1; reasons.push('yoğun saat → sade'); }
      if (tier === 2 && performance.now() - lastBig < cfg.cooldownMs) { tier = 1; reasons.push('90 sn içinde büyük an vardı'); }
      if (PPMotion.reduced()) reasons.push('azaltılmış hareket: konfeti yok, yalnız solma');
      return { tier, reasons };
    }

    function text(v, d) { return typeof v === 'function' ? v(d || {}) : v; }

    function moment(kind, data) {
      const r = resolve(kind), def = MOMENTS[kind];
      if (cfg.onLog) cfg.onLog(kind, r);
      if (r.tier === -1 || !def) return r;
      if (def.once) seen[kind] = true;
      const spec = {
        kind, tier: r.tier, icon: def.icon, tone: def.tone,
        kicker: def.kicker || KICKERS[Math.floor(Math.random() * KICKERS.length)],
        title: text((data && data.title) || def.title, data),
        sub: text((data && data.sub) || def.sub, data),
        stats: data && data.stats, onClose: data && data.onClose
      };
      if (r.tier === 2 || r.tier === 3) lastBig = performance.now();
      if (showing && showing.tier >= 2 && r.tier >= 2) { if (queue.length < 3) queue.push(spec); return r; }
      show(spec);
      return r;
    }

    function show(s) {
      if (s.tier === 'plain' || s.tier <= 1) return toast(s);
      if (s.tier === 2) return banner(s);
      return screen(s);
    }
    function next() { showing = null; const s = queue.shift(); if (s) setTimeout(() => show(s), 120); }

    function layer() {
      let l = document.querySelector('.cel-layer');
      if (!l) { l = document.createElement('div'); l.className = 'cel-layer'; l.setAttribute('aria-live', 'polite'); document.body.appendChild(l); }
      return l;
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    function toast(s) {
      const old = document.querySelector('.cel-toast'); if (old) old.remove();
      const el = document.createElement('div');
      el.className = 'cel-toast tone-' + (s.tier === 'plain' ? 'neutral' : s.tone);
      el.innerHTML = '<span class="cel-toast-ic">' + icon(s.icon) + '</span><span class="cel-toast-body"><span class="cel-toast-title">' +
        esc(s.tier === 'plain' ? s.title : (s.kicker + ' ' + s.title)) + '</span>' + (s.sub ? '<span class="cel-toast-sub">' + esc(s.sub) + '</span>' : '') + '</span>';
      layer().appendChild(el);
      const bn = document.querySelector('.cel-banner'); // afiş açıksa altına yerleş, üst üste binme
      if (bn) el.style.top = Math.round(bn.getBoundingClientRect().bottom + 10) + 'px';
      PPMotion.anim(el, [{ opacity: 0, transform: 'translate(-50%, -14px) scale(.96)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 280, easing: EASE.spring });
      PPMotion.bump(el.querySelector('.cel-toast-ic'), 1.35);
      if (cfg.sound && s.tier !== 'plain') Sound.play('tick');
      const close = () => {
        const a = PPMotion.anim(el, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, -8px)' }], { duration: 180, fill: 'forwards' });
        if (a) a.finished.then(() => el.remove()); else el.remove();
      };
      el.addEventListener('click', close);
      setTimeout(close, 2600);
    }

    function banner(s) {
      showing = s;
      const el = document.createElement('div');
      el.className = 'cel-banner tone-' + s.tone; el.setAttribute('role', 'status');
      el.innerHTML = '<span class="cel-badge"><span class="cel-badge-ring"></span>' + icon(s.icon) + '</span>' +
        '<span class="cel-banner-body"><span class="cel-kicker">' + esc(s.kicker) + '</span><span class="cel-title">' + esc(s.title) + '</span>' +
        (s.sub ? '<span class="cel-sub">' + esc(s.sub) + '</span>' : '') + '</span>' +
        '<button class="cel-close" type="button" aria-label="Kapat">' + icon('x') + '</button>';
      layer().appendChild(el);
      PPMotion.anim(el, [{ opacity: 0, transform: 'translate(-50%, -24px) scale(.94)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 360, easing: EASE.spring });
      const badge = el.querySelector('.cel-badge');
      PPMotion.anim(badge, [{ transform: 'scale(.3) rotate(-25deg)' }, { transform: 'scale(1.15) rotate(6deg)', offset: .6 }, { transform: 'scale(1) rotate(0)' }], { duration: 520, easing: EASE.out, delay: 60, fill: 'backwards' });
      PPMotion.anim(el.querySelector('.cel-badge-ring'), [{ opacity: .9, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(1.9)' }], { duration: 600, delay: 140, fill: 'backwards' });
      requestAnimationFrame(() => {
        const b = badge.getBoundingClientRect();
        PPConfetti.burst({ x: b.left + b.width / 2, y: b.top + b.height / 2, angle: Math.PI / 2, spread: Math.PI * 1.5, speed: 10, power: .7 });
      });
      if (cfg.sound) Sound.play('chime');
      let gone = false;
      const close = () => {
        if (gone) return; gone = true;
        const a = PPMotion.anim(el, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, -12px) scale(.98)' }], { duration: 200, fill: 'forwards' });
        const fin = () => { el.remove(); next(); };
        if (a) a.finished.then(fin); else fin();
      };
      el.querySelector('.cel-close').addEventListener('click', close);
      setTimeout(close, 3400);
    }

    function screen(s) {
      showing = s;
      const el = document.createElement('div');
      el.className = 'cel-screen tone-' + s.tone; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', s.title);
      const stats = (s.stats || []).map((st, i) =>
        '<div class="cel-stat"><span class="cel-stat-v" data-i="' + i + '">' + esc(st.fmt ? st.fmt(0) : '0') + '</span><span class="cel-stat-l">' + esc(st.label) + '</span></div>').join('');
      el.innerHTML = '<div class="cel-screen-back"></div><div class="cel-card">' +
        '<span class="cel-badge cel-badge-xl"><span class="cel-badge-ring"></span>' + icon(s.icon) + '</span>' +
        '<span class="cel-kicker">' + esc(s.kicker) + '</span><h2 class="cel-title-xl">' + esc(s.title) + '</h2>' +
        (s.sub ? '<p class="cel-sub">' + esc(s.sub) + '</p>' : '') +
        (stats ? '<div class="cel-stats">' + stats + '</div>' : '') +
        '<button class="btn btn-primary btn-lg cel-continue" type="button">Devam</button>' +
        '<span class="cel-hint">Herhangi bir yere dokunun</span></div>';
      layer().appendChild(el);
      const card = el.querySelector('.cel-card');
      PPMotion.anim(el.querySelector('.cel-screen-back'), [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
      PPMotion.anim(card, [{ opacity: 0, transform: 'translateY(24px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE.spring });
      PPMotion.anim(el.querySelector('.cel-badge'), [{ transform: 'scale(.2) rotate(-30deg)' }, { transform: 'scale(1.12) rotate(5deg)', offset: .6 }, { transform: 'none' }], { duration: 560, delay: 80, fill: 'backwards' });
      PPMotion.anim(el.querySelector('.cel-badge-ring'), [{ opacity: .9, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(2.2)' }], { duration: 600, delay: 200, fill: 'backwards' });
      el.querySelectorAll('.cel-stat').forEach((n, i) => PPMotion.rise(n, 180 + i * 70));
      (s.stats || []).forEach((st, i) => setTimeout(() => PPMotion.countUp(el.querySelector('[data-i="' + i + '"]'), 0, st.value, st.fmt, 600), 200 + i * 70));
      setTimeout(() => PPConfetti.cannons(1), 120);
      if (cfg.sound) Sound.play('big');
      const btn = el.querySelector('.cel-continue');
      btn.focus({ preventScroll: true });
      let gone = false;
      const close = () => {
        if (gone) return; gone = true; removeEventListener('keydown', onKey);
        const a = PPMotion.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
        const fin = () => { el.remove(); next(); s.onClose && s.onClose(); };
        if (a) a.finished.then(fin); else fin();
      };
      const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
      setTimeout(() => { if (!gone) addEventListener('keydown', onKey); }, 0); // tetikleyen Enter'ın kendisi kapatmasın
      el.addEventListener('click', close); // her dokunuş kapatır: akış bloklanmaz
    }

    return {
      MOMENTS, cfg, moment, resolve,
      configure(o) { Object.assign(cfg, o); },
      resetDay() { Object.keys(seen).forEach(k => delete seen[k]); },
      resetCooldown() { lastBig = -Infinity; },
      sound: Sound
    };
  })();

export { PPMotion, PPConfetti, PPCelebrate };
