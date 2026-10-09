/*!
 * WorldCast project page: wall, synced video groups with live overlays (controls, minimaps, the shared player state
 * table, projected players and the player state field), the scene-state cases, the paper's Figures 2 and 3 animated
 * over the figures themselves (Figure 3 with one real rollout: assets/js/fig3case.js), lightbox. No libraries.
 * Without JavaScript every clip, figure and caption is visible (native video controls, static figures);
 * with reduced motion (or ?motion=off) nothing autoplays and the figures show their whole, static state.
 * Data (window.WC_DATA): .teaser (assets/media/views/track.js), .ps (assets/media/player-state/track.js),
 * .sceneCases (assets/media/scene-state/<case>/case.js), .figs (assets/media/method/figdata.js),
 * .f3c (assets/media/method/fig3/data.js).
 */

/* ------------------------------------------------------------------ *
 *  Links to fill in. While empty, the buttons are disabled ("Soon").  *
 * ------------------------------------------------------------------ */
const PAPER_URL = "https://arxiv.org/pdf/2610.12412";
const CODE_URL = "https://github.com/Ziyang-Ye/WorldCast";
const DEMO_URL = ""; // empty: a disabled "Soon" button
const VIDEO_URL = ""; // the promo film (an https URL or a path under assets/); empty: the Videos button scrolls to the gallery

(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var motion = root.classList.contains('motion');
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var NS = 'http://www.w3.org/2000/svg';
  var DATA = window.WC_DATA || {};
  var COLOR = { A: '#E67F27', B: '#3D94E8', C: '#3FB576' };
  function playSafe(v) { try { var p = v.play(); if (p && p.catch) p.catch(function () { }); } catch (e) { /* ignore */ } }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, cls, text, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------------- Paper / Code / Demo / Video links ---------------- */
  var LINKS = { paper: PAPER_URL, code: CODE_URL, demo: DEMO_URL };
  $$('[data-link]').forEach(function (a) {
    var url = LINKS[a.getAttribute('data-link')];
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; return; }
    a.removeAttribute('href');
    a.setAttribute('role', 'link'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '0');
    var s = document.createElement('span'); s.className = 'soon'; s.textContent = 'Soon'; a.appendChild(s);
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });

  var videoLink = $('#video-link');
  if (videoLink && VIDEO_URL) { videoLink.href = VIDEO_URL; videoLink.target = '_blank'; videoLink.rel = 'noopener'; }

  /* ---------------- Nav ---------------- */
  var nav = $('#nav'), toggle = $('.nav-toggle', nav), hero = $('#top');
  function closeMenu() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  function navVis() { nav.classList.toggle('is-shown', window.scrollY > hero.offsetHeight * 0.55); }
  window.addEventListener('scroll', navVis, { passive: true }); navVis();
  if ('IntersectionObserver' in window) {
    var links = $$('.nav-menu a'), secs = $$('main > section, footer');
    var setActive = function (id) { links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + id); }); };
    // the section under the line at 47.5% of the screen, from every section's box: the observer reports only changes, so
    // after a jump a section that stayed in the band would otherwise keep the highlight
    var activeNow = function () {
      var y = window.innerHeight * 0.475, id = '';
      secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) id = s.id; });
      setActive(id);
    };
    var secIO = new IntersectionObserver(activeNow, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { secIO.observe(s); });
    links.forEach(function (l) { l.addEventListener('click', function () { setActive(l.getAttribute('href').slice(1)); }); });
    window.addEventListener('hashchange', activeNow);
  }

  /* ---------------- Reveal (one fade-up) ---------------- */
  var revealEls = $$('.reveal');
  if (motion && 'IntersectionObserver' in window) {
    var revIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); revIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (x) { revIO.observe(x); });
  } else revealEls.forEach(function (x) { x.classList.add('is-in'); });

  /* ---------------- Media loading: formats, bandwidth and one queue for every clip ---------------- */
  // On a slow connection, clips that load at the same time share the bandwidth and none of them starts in time. So the
  // clips load in queue order: the lightbox when it is open, the sections on screen (the most visible first), the
  // sections less than a screen away (the nearest first, below before above), and last the sharper streams of a
  // section on screen (the wall's atlas after its half-size copy, the multiplayer's row atlases). An entry is given its
  // sources only when every entry before it has buffered AHEAD seconds (or the whole clip); an entry off screen that is
  // not loading by that rule drops its streams again unless they are complete (a paused <video> keeps loading, and over
  // HTTP/1.1 keeps one of the host's six connections). With reduced motion nothing loads until the reader starts a clip.
  var VP9 = (function () { try { return document.createElement('video').canPlayType('video/webm; codecs="vp9"') === 'probably'; } catch (e) { return false; } })();
  var SMALL = !!(window.matchMedia && matchMedia('(max-width: 734px), (max-height: 500px)').matches);
  var SAVE = !!(navigator.connection && navigator.connection.saveData);
  // the connection's speed in bytes/s, from the page's own finished downloads of 100 kB or more (Resource Timing): their
  // bytes over the time any of them was arriving; before that navigator.connection's estimate; 0 while unknown
  try { performance.setResourceTimingBufferSize(1000); } catch (e) { /* ignore */ }
  function bandwidth() {
    var es = [], iv = [], bytes = 0, span = 0, a = -1, b = -1;
    try { es = performance.getEntriesByType('resource'); } catch (e) { /* ignore */ }
    es.forEach(function (e) {
      var n = e.transferSize || 0, t0 = e.responseStart || e.startTime;
      if (n >= 1e5 && e.responseEnd > t0) { bytes += n; iv.push([t0, e.responseEnd]); }
    });
    iv.sort(function (x, y) { return x[0] - y[0]; });
    iv.forEach(function (x) { if (x[0] > b) { span += b - a; a = x[0]; b = x[1]; } else if (x[1] > b) b = x[1]; });
    span += b - a;
    if (bytes >= 3e5 && span > 0) return bytes / (Math.max(span, 1) / 1000);
    var c = navigator.connection;
    return c && c.downlink ? c.downlink * 125000 : 0;
  }
  // Which file of a clip loads first. The MP4s are the higher-quality encodes (H.264 CRF 18 for the 672x384 clips) and
  // load first on a fast connection (FAST bytes/s or more) or where VP9 is not decoded well; otherwise the VP9 WebM, the
  // same frames in a half to a quarter of the bytes. (The multiplayer atlases take VP9 wherever it decodes well: there
  // it is the better encode.)
  var FAST = 4e6;
  function webmFirst() { return VP9 && bandwidth() < FAST; }
  function srcEl(url, type) { var e = document.createElement('source'); e.src = url; if (type) e.type = type; return e; }
  function srcsOf(v) { return v._srcs || $$('source', v).map(function (e) { return [e.getAttribute('src'), e.getAttribute('type') || '']; }); }
  // give a clip its sources and let it load; the file picked the first time is kept when it comes back. A clip that
  // comes back starts again from its beginning: one request (a seek to where it was would need a second one after the
  // reload, which took 3 s over a slow proxy). Only a long stream is ever dropped half loaded (the multiplayer atlas):
  // short clips are complete by then and keep their buffer.
  function attachV(v, webm) {
    if (v._on) return;
    v._on = true;
    var list = srcsOf(v);
    if (!v._picked) {
      v._picked = true;
      if (webm == null) webm = webmFirst();
      var w = list.filter(function (x) { return /webm/.test(x[1]); }), m = list.filter(function (x) { return !/webm/.test(x[1]); });
      list = webm ? w.concat(m) : m.concat(w);
    }
    $$('source', v).forEach(function (e) { v.removeChild(e); });
    list.forEach(function (x) { v.appendChild(srcEl(x[0], x[1])); });
    v._srcs = null;
    v.preload = 'auto';
    try { v.load(); } catch (e) { /* ignore */ }
  }
  // take its sources back: the download stops
  function detachV(v) {
    if (!v._on) return;
    v._on = false;
    v._srcs = srcsOf(v);
    v.pause();
    $$('source', v).forEach(function (e) { v.removeChild(e); });
    v.removeAttribute('src');
    try { v.load(); } catch (e) { /* ignore */ }
  }
  // seconds buffered ahead of the playhead (Infinity: to the end of the clip)
  function aheadOf(v) {
    var r = v.buffered, t = v.currentTime, d = v.duration || 0;
    for (var i = 0; i < r.length; i++) if (r.start(i) <= t + 0.1 && r.end(i) >= t) return d && r.end(i) >= d - 0.1 ? Infinity : r.end(i) - t;
    return 0;
  }
  // buffered from t for `need` seconds (or to the end)
  function bufferedAt(v, t, need) {
    var r = v.buffered, d = v.duration || 0;
    for (var i = 0; i < r.length; i++) if (r.start(i) <= t + 0.05 && r.end(i) >= Math.min(t + need, d - 0.1)) return true;
    return false;
  }
  // the whole clip is buffered
  function whole(v) {
    var r = v.buffered, d = v.duration, e = 0;
    if (!d || !r.length || r.start(0) > 0.1) return false;
    for (var i = 0; i < r.length; i++) { if (r.start(i) > e + 0.05) return false; e = Math.max(e, r.end(i)); }
    return e >= d - 0.1;
  }
  var Q = (function () {
    var units = [], lb = null, raf = 0, AHEAD = 3, AHEAD_LO = 1.5;
    // its turn has passed: every clip whole, or playable with AHEAD seconds ahead (once passed, AHEAD_LO keeps it)
    function ready(u) {
      var vs = u.vids(), need = u.ok ? AHEAD_LO : AHEAD;
      u.ok = vs.length > 0 && vs.every(function (v) { return v._on && (whole(v) || (v.readyState >= 3 && aheadOf(v) >= need)); });
      return u.ok;
    }
    function done(u) { var vs = u.vids(); return vs.every(function (v) { return !v._on || whole(v); }); }
    function update() {
      raf = 0;
      var H = window.innerHeight || 800, list = [];
      units.forEach(function (u) {
        u.seen = false;
        if (u === lb) { list.push([0, 0, u]); return; }
        if (lb && u.owner === lb && (!u.want || u.want())) { list.push([0, 1, u]); return; }
        if (!u.el) return;
        var r = u.el.getBoundingClientRect();
        if (!r.width && !r.height) return;   // (not shown)
        var vis = Math.min(r.bottom, H) - Math.max(r.top, 0), d = r.top >= H ? r.top - H : -1.5 * r.bottom;
        u.seen = vis > 0;
        // coming on screen: wake its paused clips (a seek to where they are). A paused clip off screen is put to sleep
        // by the browser after some seconds and may lose its buffer; woken now, it reloads before it is due to play
        if (u.seen && !u.was) u.vids().forEach(function (v) { if (v._on && v.paused && v.readyState >= 1 && !v.seeking) { try { v.currentTime = v.currentTime; } catch (e) { /* ignore */ } } });
        u.was = u.seen;
        if ((u.want && !u.want()) || (!motion && !u.pin)) return;
        if (u.up) { if (vis > 0) list.push([3, 0, u]); }
        else if (vis > 0 || u.pin) list.push([1, -vis, u]);
        else if (d < H) list.push([2, d, u]);
      });
      list.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var go = [];
      for (var i = 0; i < list.length; i++) { go.push(list[i][2]); if (!ready(list[i][2])) break; }
      units.forEach(function (u) {
        if (go.indexOf(u) >= 0) u.attach();
        else if (!(u.seen && !u.up) && !(u.keep && u.keep()) && !done(u)) { u.ok = false; u.detach(); }
      });
    }
    function kick() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick, { passive: true });
    setInterval(update, 250);
    return {
      add: function (u) { units.push(u); kick(); return u; },
      remove: function (u) { var i = units.indexOf(u); if (i >= 0) units.splice(i, 1); if (lb === u) lb = null; },
      lightbox: function (u) { lb = u || null; update(); },
      now: update
    };
  })();

  /* ---------------- Hero wall ---------------- */
  (function () {
    var wallEl = $('.wall'), canvas = $('.wall-canvas', wallEl);
    if (!window.WorldCastWall || !canvas) return;
    var wall;
    try {
      wall = window.WorldCastWall.create(canvas, { static: !motion, onReady: function () { wallEl.classList.add('is-live'); },
        onStream: function (name, old) { detachV(old); } });   // (the atlas took over: the half-size copy is done)
    } catch (e) { return; }
    // its streams in the load queue: the half-size copy first, the atlas once the wall plays and the sections near it
    // have their start buffered
    var ws = wall.streams;
    if (ws) {
      Q.add({ el: hero, vids: function () { return [wall.video]; }, attach: function () { attachV(wall.video); }, detach: function () { detachV(wall.video); } });
      if (ws.up) Q.add({ el: hero, up: true, want: function () { return wall.video !== ws.up; }, vids: function () { return wall.video !== ws.up ? [ws.up] : []; },
        attach: function () { attachV(ws.up); }, detach: function () { detachV(ws.up); } });
    }
    var inView = true;
    function sync() { wall.setActive(inView && !document.hidden); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[en.length - 1].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  })();

  /* ---------------- Synced video groups ---------------- */
  // Clips of one group have identical frame counts and start at the same instant: they start together, once each has
  // START_AHEAD seconds buffered (or the whole clip), and follow the first clip (small playbackRate nudges; a seek only
  // if far off). If one runs out of data, the whole group holds and goes on together once each has RESUME_AHEAD seconds
  // buffered again. Listeners get the clip time. A group may have extra clips (g.opt: the multiplayer's row atlases)
  // that follow the same clock when they can and never hold the group.
  var PLAY = '<svg class="i-play" viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4.5v11l9-5.5z" fill="currentColor"/></svg>';
  var PAUSE = '<svg class="i-pause" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4.5h2.6v11H6zM11.4 4.5H14v11h-2.6z" fill="currentColor"/></svg>';
  function mmss(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = Math.floor(t - m * 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  var START_AHEAD = 1, RESUME_AHEAD = 2;

  function Group(elm, videos) {
    var self = this;
    this.el = elm;
    this.name = elm.getAttribute('data-group');
    this.videos = videos || $$('video', elm);
    this.clock = null; this.bars = []; this.lastT = 0;
    this.listeners = [];
    this.playing = false; this.userPaused = false; this.inView = false; this.raf = 0; this.starting = false; this.stalled = false;
    $$('video', elm).forEach(function (v) { v.removeAttribute('controls'); });
    this.videos.forEach(function (v) { v.loop = true; v.muted = true; });
    // its clips in the load queue (an atlas group: VP9 first wherever it decodes well)
    this.unit = Q.add({ el: elm, vids: function () { return self.videos; },
      attach: function () { self.videos.forEach(function (v) { attachV(v, self.atlas ? VP9 : null); }); },
      detach: function () { if (self.playing || self.starting) self.pause(); self.videos.forEach(detachV); },
      keep: function () { return self.playing || self.keepAlive; } });
    var bar = $('.group-bar[data-for="' + this.name + '"]');
    if (bar) { this.clock = bar.getAttribute('data-clock'); this.clockOff = +(bar.getAttribute('data-clock-offset') || 0); this.durHint = +(bar.getAttribute('data-duration') || 0); this.addBar(bar); }
    var m = this.videos[0];
    ['seeked', 'loadeddata', 'pause'].forEach(function (ev) {
      m.addEventListener(ev, function () { if (!self.playing) { self.emit(m.currentTime || 0); self.showTime(m.currentTime || 0, m.duration || 0); } });
    });
  }
  // a play/pause button + progress + time; a group can drive several (its own bar and the lightbox's)
  Group.prototype.addBar = function (bar) {
    var self = this;
    bar.innerHTML = '<button class="gb-btn" type="button" aria-label="Play">' + PLAY + PAUSE + '</button>' +
      '<span class="gb-track" aria-hidden="true"><i></i></span><span class="gb-time" aria-hidden="true"></span>';
    var b = { el: bar, btn: $('.gb-btn', bar), fill: $('.gb-track i', bar), time: $('.gb-time', bar) };
    b.btn.addEventListener('click', function () {
      if (self.playing || self.starting) { self.userPaused = true; self.pause(); }
      else { self.userPaused = false; self.start(true); }
    });
    this.bars.push(b);
    if (this.clock === 'round') this.scrubber(b);
    this.showTime(this.lastT, this.videos[0].duration || 0); this.setBtn(this.starting);
    return b;
  };
  // A round-clock group (the multiplayer views) can be scrubbed: click or drag the track, or arrow keys (5 s steps).
  // Every clip of the group is seeked to the same time; playback resumes after the drag if it was playing.
  Group.prototype.scrubber = function (b) {
    var self = this, tr = $('.gb-track', b.el), drag = false, resume = false;
    b.scrub = tr;
    tr.classList.add('gb-scrub'); tr.removeAttribute('aria-hidden');
    tr.setAttribute('role', 'slider'); tr.setAttribute('tabindex', '0'); tr.setAttribute('aria-label', 'Round time');
    function dur() { return self.videos[0].duration || 0; }
    function ready() {
      if (dur()) return true;
      self.userPaused = false; self.start(true);   // not loaded yet: load and play
      return false;
    }
    function seek(t) {
      var d = dur();
      t = clamp(t, 0, d - 0.01);
      self.videos.concat(self.opt || []).forEach(function (v) { if (v.readyState) { try { v.currentTime = t; } catch (e) { /* ignore */ } } });
      self.showTime(t, d); self.emit(t);
    }
    function at(e) { var r = tr.getBoundingClientRect(); return clamp((e.clientX - r.left) / Math.max(r.width, 1), 0, 1) * dur(); }
    tr.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !ready()) return;
      drag = true; resume = self.playing;
      if (resume) self.pause();
      try { tr.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      seek(at(e)); e.preventDefault();
    });
    tr.addEventListener('pointermove', function (e) { if (drag) seek(at(e)); });
    function end() { if (!drag) return; drag = false; if (resume && !self.userPaused) self.start(true); }
    tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
    tr.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
      e.preventDefault(); e.stopPropagation();   // (in the lightbox the arrows would switch views)
      if (!ready()) return;
      var t = self.videos[0].currentTime || 0;
      seek(k === 'Home' ? 0 : k === 'End' ? dur() : t + (k === 'ArrowRight' ? 5 : -5));
    });
  };
  Group.prototype.removeBar = function (b) { var i = this.bars.indexOf(b); if (i >= 0) this.bars.splice(i, 1); };
  Group.prototype.on = function (fn) { this.listeners.push(fn); fn(0, 0); };
  Group.prototype.emit = function (t) { var d = this.videos[0].duration || 0; for (var i = 0; i < this.listeners.length; i++) this.listeners[i](t, d); };
  Group.prototype.showTime = function (t, d) {
    this.lastT = t;
    var o = this.clockOff || 0, dl = d || this.durHint || 0;   // before the clips' metadata: the bar's data-duration
    var html = this.clock === 'round' ? '<span class="gb-k">Round time</span>' + mmss(t + o) + '<small> / ' + (dl ? mmss(dl + o) : '--') + '</small>'
      : t.toFixed(1) + ' / ' + (dl ? dl.toFixed(1) : '--') + ' s';
    var sx = 'scaleX(' + (d ? clamp(t / d, 0, 1) : 0) + ')';
    this.bars.forEach(function (b) {
      if (b.html !== html) { b.html = html; b.time.innerHTML = html; if (b.scrub) b.scrub.setAttribute('aria-valuetext', mmss(t + o)); }
      b.fill.style.transform = sx;
    });
  };
  // every clip can play with `need` seconds buffered ahead (or to the end)
  Group.prototype.canGo = function (need) { return this.videos.every(function (v) { return v._on && v.readyState >= 3 && !v.seeking && aheadOf(v) >= need; }); };
  Group.prototype.start = function (byUser) {
    var self = this;
    if (this.playing || this.starting) return;
    this.starting = true;
    if (byUser) this.unit.pin = true;   // the reader asked for it: it loads whatever else is on screen
    Q.now();   // (on screen it comes first in the load queue)
    this.setBtn(true);
    clearTimeout(this.wt);
    (function check() {
      self.wt = 0;
      if (!self.starting) return;
      if (self.userPaused || (!self.inView && motion && !byUser && !self.keepAlive)) { self.starting = false; self.setBtn(); return; }
      if (!self.canGo(START_AHEAD)) { self.wt = setTimeout(check, 100); return; }
      self.starting = false; self.stalled = false;
      var vs = self.videos, t = vs[0].currentTime || 0;
      vs.forEach(function (v) { if (Math.abs(v.currentTime - t) > 0.05) { try { v.currentTime = t; } catch (e) { /* ignore */ } } playSafe(v); });
      self.playing = true; self.setBtn();
      self.loop();
    })();
  };
  Group.prototype.pause = function () {
    this.starting = false; this.stalled = false; clearTimeout(this.wt); this.unit.pin = false;
    this.videos.concat(this.opt || []).forEach(function (v) { v.pause(); });
    this.playing = false; this.setBtn();
    if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0;
  };
  Group.prototype.setBtn = function (pendingPlay) {
    var on = this.playing || !!pendingPlay;
    this.bars.forEach(function (b) { b.btn.classList.toggle('is-playing', on); b.btn.setAttribute('aria-label', on ? 'Pause' : 'Play'); });
  };
  Group.prototype.loop = function () {
    var self = this, vs = this.videos;
    function step() {
      self.raf = 0;
      if (!self.playing) return;
      var m = vs[0], t = m.currentTime, d = m.duration || 0;
      // a clip ran out of data: every clip holds, then all go on from the first clip's time. Each further stall doubles
      // the buffer it waits for (RESUME_AHEAD, then 4 s, then 6 s: below the 10 s a paused clip loads ahead), so a
      // connection slower than the clips plays in fewer, longer runs
      if (!self.stalled && vs.some(function (v) { return v.readyState < 3 && !v.seeking; })) {
        self.stalled = true;
        self.need = Math.min(self.need ? self.need * 2 : RESUME_AHEAD, 6);
        vs.concat(self.opt || []).forEach(function (v) { v.pause(); });
      }
      if (self.stalled) {
        if (self.canGo(self.need)) {
          self.stalled = false;
          vs.forEach(function (v) { if (v !== m && Math.abs(v.currentTime - t) > 0.04) { try { v.currentTime = t; } catch (e) { /* ignore */ } } playSafe(v); });
        }
        self.showTime(t, d); self.emit(t);
        self.raf = requestAnimationFrame(step);
        return;
      }
      if (self.opt) self.opt.forEach(function (v) { self.follow(v, t, d); });
      for (var i = 1; i < vs.length; i++) {
        var v = vs[i];
        if (v.paused && !v.ended) playSafe(v);
        var diff = v.currentTime - t;
        if (d) { if (diff > d / 2) diff -= d; else if (diff < -d / 2) diff += d; }
        if (Math.abs(diff) > 0.35) { try { v.currentTime = t; } catch (e) { /* ignore */ } v.playbackRate = 1; }
        else if (Math.abs(diff) > 0.015) v.playbackRate = clamp(1 - diff * 1.5, 0.85, 1.15);
        else if (v.playbackRate !== 1) v.playbackRate = 1;
      }
      if (m.paused && !m.ended) playSafe(m);
      self.showTime(t, d);
      self.emit(t);
      self.raf = requestAnimationFrame(step);
    }
    if (!this.raf) this.raf = requestAnimationFrame(step);
  };
  // An extra clip (a row atlas): once it is buffered at the group's time it joins it and keeps in step like the others;
  // it is drawn (v._live) only while within half a frame of the group. Not buffered there yet, it waits paused a few
  // seconds ahead of the group's time, where it loads, and joins when the group gets there; if it runs out of data it
  // drops back to waiting. It never holds the group.
  Group.prototype.follow = function (v, t, d) {
    v._live = false;
    if (!v._on || v.readyState < 1) { v._cue = null; return; }
    var diff = v.currentTime - t;
    if (d) { if (diff > d / 2) diff -= d; else if (diff < -d / 2) diff += d; }
    if (!v.paused) {
      if (v.readyState < 3 && !v.seeking) { v.pause(); v._cue = null; return; }
      if (Math.abs(diff) > 0.35) { if (!v.seeking) { try { v.currentTime = t; } catch (e) { /* ignore */ } } v.playbackRate = 1; return; }
      v.playbackRate = Math.abs(diff) > 0.015 ? clamp(1 - diff * 1.5, 0.85, 1.15) : 1;
      v._live = !v.seeking && v.readyState >= 3 && Math.abs(diff) < 0.04;
      return;
    }
    if (v.seeking) return;
    if (bufferedAt(v, t, 2)) { v._cue = null; try { v.currentTime = t; } catch (e) { /* ignore */ } playSafe(v); return; }
    var wait = v._cue == null ? -1 : v._cue - t;
    if (d) { if (wait > d / 2) wait -= d; else if (wait < -d / 2) wait += d; }
    if (v._cue == null || wait < -0.25 || wait > 10) {
      v._lead = v._cue == null && !v._lead ? 3 : Math.min((v._lead || 3) * 1.5, 9);
      v._cue = d ? (t + v._lead) % d : t + v._lead;
      try { v.currentTime = v._cue; } catch (e) { /* ignore */ }
    }
  };

  // The multiplayer views come from atlas videos (detached <video> elements drawn into one canvas per view), data-cols
  // views per atlas row. Every screen starts from the small atlas (one video holding all ten views at 336x192, cols x
  // rows: 13 MB, a third of the bytes of the two rows), so the views play within seconds. Where a view is shown larger
  // than that (1.25 x 336 px: the grid on a high-density screen, a view in the lightbox) and the connection carries
  // them, the row atlases at the native 672x384 (row1 = views 1-5, row2 = views 6-10) load after it, join its clock
  // (Group.follow) and the views of a row are drawn from them while they keep in step. Phones and Save-Data: the small
  // atlas only (as before). VP9 first wherever it decodes well: at these sizes it holds 2.5-3.6 dB more PSNR than H.264.
  function atlasFor(elm) {
    var cols = +(elm.getAttribute('data-cols') || 4), S = [336, 192], R = [672, 384];
    function mk(b) {
      var v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.preload = 'none';
      v._srcs = [[b + '.mp4', 'video/mp4'], [b + '.webm', 'video/webm']];
      return v;
    }
    var small = mk(elm.getAttribute('data-atlas-small')), rows = elm.getAttribute('data-atlas').split(/\s+/).map(mk);
    function row(k) { return rows[Math.min(Math.floor(k / cols), rows.length - 1)]; }
    return {
      small: small, rows: rows, row: row,
      at: function (k) {
        var v = row(k);
        if (v._live) return { v: v, x: (k % cols) * R[0], y: 0, w: R[0], h: R[1] };
        return { v: small, x: (k % cols) * S[0], y: Math.floor(k / cols) * S[1], w: S[0], h: S[1] };
      }
    };
  }
  // the row atlases wanted now: the connection (bandwidth(), which reads about a quarter low while several files load)
  // must carry 1.25 x their bytes/s (one row atlas: row2, the larger, 32.2 MB VP9 / 51.8 MB H.264 over 59.1 s)
  var ROW_BPS = VP9 ? 5.5e5 : 8.8e5;
  function rowsWanted(g) {
    if (SMALL || SAVE) return [];
    var A = g.atlas, bw = bandwidth();
    if (lbTile) return bw >= 1.25 * ROW_BPS ? [A.row(lbTile.k)] : [];
    var f = $('.frame', g.el), w = f ? f.getBoundingClientRect().width * (window.devicePixelRatio || 1) : 0;
    return w > 1.25 * 336 && bw >= 2.5 * ROW_BPS ? A.rows : [];
  }

  var groups = $$('.vgroup[data-group]').map(function (x) {
    if (!x.hasAttribute('data-atlas')) return new Group(x);
    var A = atlasFor(x), g = new Group(x, [A.small]);
    g.atlas = A; g.opt = A.rows; g.rowsWant = [];
    // the row atlases in the load queue: after everything near the screen, or right after the small atlas in the lightbox
    Q.add({ el: x, up: true, owner: g.unit,
      want: function () { g.rowsWant = rowsWanted(g); return g.rowsWant.length > 0; },
      vids: function () { return g.rowsWant; },
      attach: function () { A.rows.forEach(function (v) { if (g.rowsWant.indexOf(v) >= 0) attachV(v, VP9); else if (!whole(v)) { v._live = false; detachV(v); } }); },
      detach: function () { A.rows.forEach(function (v) { if (!whole(v)) { v._live = false; detachV(v); } }); } });
    return g;
  });
  var groupBy = {}; groups.forEach(function (g) { groupBy[g.name] = g; });
  // in view (a fifth of it on screen): play; out of view: pause (the load queue drops the streams of a group left
  // behind)
  if ('IntersectionObserver' in window) {
    var gIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        var g = e.target._group; if (!g) return;
        g.inView = e.isIntersecting && e.intersectionRatio >= 0.2;
        if (g.inView && motion && !g.userPaused) g.start();
        else if (!e.isIntersecting || e.intersectionRatio < 0.05) { if ((g.playing || g.starting) && !g.keepAlive) g.pause(); }
      });
    }, { threshold: [0, 0.05, 0.2, 0.5] });
    groups.forEach(function (g) { g.el._group = g; gIO.observe(g.el); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) groups.forEach(function (g) { if (g.playing) { g.pause(); g.resume = true; } });
    else groups.forEach(function (g) { if (g.resume) { g.resume = false; if ((g.inView || g.keepAlive) && !g.userPaused) g.start(); } });
  });

  /* ---------------- 2. Multiplayer: paint the views from the atlas ---------------- */
  var mpPaint = (function () {
    var g = groupBy.mp;
    if (!g || !g.atlas) return null;
    var A = g.atlas, targets = [];
    $$('.view', g.el).forEach(function (f, k) {
      var fr = $('.frame', f), c = document.createElement('canvas');
      c.className = 'atlas-view'; c.width = 336; c.height = 192; c.setAttribute('aria-hidden', 'true');
      fr.insertBefore(c, $('.num', fr));
      targets.push({ c: c, ctx: c.getContext('2d'), k: k });
    });
    // each view from the sharpest stream that is in step (A.at), at that stream's size
    function paint() {
      var live = false;
      targets.forEach(function (t) {
        var s = A.at(t.k);
        if (s.v.readyState < 2) return;
        if (t.c.width !== s.w) { t.c.width = s.w; t.c.height = s.h; }
        try { t.ctx.drawImage(s.v, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h); t.live = true; live = true; } catch (e) { /* ignore */ }
      });
      if (live && !g.el.classList.contains('is-live')) g.el.classList.add('is-live');
    }
    g.on(paint);
    ['loadeddata', 'seeked'].forEach(function (ev) { A.small.addEventListener(ev, paint); });
    return {
      group: g, atlas: A, paint: paint,
      add: function (c, k) { var t = { c: c, ctx: c.getContext('2d'), k: k }; targets.push(t); paint(); return t; },
      remove: function (t) { var i = targets.indexOf(t); if (i >= 0) targets.splice(i, 1); }
    };
  })();

  /* ---------------- Controls console (key caps that light up) ---------------- */
  var VERB = { W: 'Forward', S: 'Back', A: 'Strafe left', D: 'Strafe right', Space: 'Jump', Ctrl: 'Crouch', LMB: 'Fire', R: 'Reload', F: 'Inspect' };
  var VERB_S = { A: 'Strafe L', D: 'Strafe R' }, TURN = ['Turn right', 'Turn left'], TURN_S = ['Turn R', 'Turn L'];
  var LMB_VERB = { 3: 'Attack', 4: 'Throw' };   // LMB with the knife (slot 3) or a grenade (slot 4) in hand
  var ORDER = ['W', 'S', 'A', 'D', 'Space', 'Ctrl', 'LMB', 'R', 'F'];
  // the action as words: full ("Strafe right + Turn left") or short ("Strafe R + Turn L"); a line breaks only after a " +"
  function actText(bits, mask, turn, weapon, slot, press, short) {
    if (press) return 'Switch to ' + weapon;
    // opposite keys held together cancel in the game (A + D, W + S), so they are not named
    var both = function (a, b) { return (mask & bits[a]) && (mask & bits[b]); };
    var cancel = { A: both('A', 'D'), D: both('A', 'D'), W: both('W', 'S'), S: both('W', 'S') };
    var parts = ORDER.filter(function (k) { return (mask & bits[k]) && !cancel[k]; }).map(function (k) { return k === 'LMB' && LMB_VERB[slot] || (short && VERB_S[k]) || VERB[k]; });
    if (turn) parts.push((short ? TURN_S : TURN)[turn > 0 ? 1 : 0]);
    return parts.map(function (p) { return p.replace(/ /g, '\u00a0'); }).join('\u00a0+ ');
  }
  var MOUSE = '<svg viewBox="0 0 16 23" aria-hidden="true"><rect class="m-body" x="1" y="1" width="14" height="21" rx="7" stroke-width="1.2"/>' +
    '<path class="m-lmb" d="M8 1.6A6.4 6.4 0 0 0 1.6 8v1.4H8z"/><path d="M8 1.6v7.8M1.6 9.4h12.8" stroke="rgba(255,255,255,.28)" stroke-width="1.1" fill="none"/></svg>';
  var ARR_L = '<svg class="arr arr-l" viewBox="0 0 11 23" aria-hidden="true"><path d="M7.5 7.5L3.5 11.5l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ARR_R = '<svg class="arr arr-r" viewBox="0 0 11 23" aria-hidden="true"><path d="M3.5 7.5l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function Console(box, role, keys) {
    this.box = box; this.bits = {};
    var self = this;
    keys.forEach(function (k, i) { self.bits[k] = 1 << i; });
    box.innerHTML = '<div class="con-top"><span class="con-badge">' + role + '</span><span class="con-act"></span><span class="con-w"></span></div>' +
      '<div class="keys"><span class="kg"><span class="cap" data-k="W">W</span><span class="cap" data-k="A">A</span><span class="cap" data-k="S">S</span><span class="cap" data-k="D">D</span></span>' +
      '<span class="kg"><span class="cap cap-w" data-k="Space">Space</span><span class="cap" data-k="Ctrl">Ctrl</span></span><i class="kbr"></i>' +
      '<span class="kg"><span class="cap" data-k="R">R</span><span class="cap" data-k="F">F</span></span>' +
      '<span class="kg kg-slot"><span class="cap" data-s="1">1</span><span class="cap" data-s="2">2</span><span class="cap" data-s="3">3</span><span class="cap" data-s="4">4</span></span>' +
      '<span class="mouse">' + ARR_L + MOUSE + ARR_R + '</span></div>';
    this.act = $('.con-act', box); this.wpn = $('.con-w', box);
    this.caps = $$('.cap[data-k]', box).map(function (c) { return { el: c, k: c.getAttribute('data-k'), on: false }; });
    // weapon-slot keys 1-4: the slot of the weapon in hand stays softly lit; a change of weapon lights the new slot as a press
    this.slots = $$('.cap[data-s]', box).map(function (c) { return { el: c, s: +c.getAttribute('data-s'), held: false, on: false }; });
    this.mouse = $('.mouse', box); this.al = $('.arr-l', box); this.ar = $('.arr-r', box);
    this.last = ''; this.short = false;
  }
  Console.prototype.set = function (mask, turn, weapon, slot, press) {
    var key = mask + '|' + turn + '|' + weapon + '|' + slot + '|' + press + '|' + this.short;
    if (key === this.last) return; this.last = key;
    var bits = this.bits;
    this.caps.forEach(function (c) { var on = !!(mask & bits[c.k]); if (on !== c.on) { c.on = on; c.el.classList.toggle('on', on); } });
    this.slots.forEach(function (c) {
      var held = c.s === slot, on = held && !!press;
      if (held !== c.held) { c.held = held; c.el.classList.toggle('held', held); }
      if (on !== c.on) { c.on = on; c.el.classList.toggle('on', on); }
    });
    this.mouse.classList.toggle('fire', !!(mask & bits.LMB));
    this.al.classList.toggle('on', turn > 0); this.ar.classList.toggle('on', turn < 0);
    this.wpn.textContent = weapon || '';
    var txt = actText(bits, mask, turn, weapon, slot, press, this.short);
    this.act.textContent = txt || 'Hold';
    this.act.classList.toggle('is-idle', !txt);
  };

  /* ---------------- Minimap (SVG over a top-down map) ---------------- */
  function Minimap(svg, d, opts) {
    this.svg = svg; this.d = d; this.opts = opts;
    var vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    this.vbw = vb[2];
    var m = d.map;
    var defs = el('defs', {}, svg);
    el('image', { href: m.image, x: m.x, y: m.y, width: m.w, height: m.h, preserveAspectRatio: 'none' }, svg);
    this.roles = opts.roles;
    var R = opts.coneR, half = d.hfov / 2 * Math.PI / 180;
    var cone = 'M0 0L' + (R * Math.cos(-half)).toFixed(1) + ' ' + (R * Math.sin(-half)).toFixed(1) +
      'A' + R + ' ' + R + ' 0 0 1 ' + (R * Math.cos(half)).toFixed(1) + ' ' + (R * Math.sin(half)).toFixed(1) + 'Z';
    var gTrail = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    var gSee = el('g', { 'stroke-dasharray': '6 6', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, svg);
    var gCone = el('g', {}, svg);
    var gMark = el('g', {}, svg);
    var self = this;
    this.p = {};
    this.roles.forEach(function (r) {
      var gr = el('radialGradient', { id: 'mmg-' + opts.id + r, cx: 0, cy: 0, r: R, gradientUnits: 'userSpaceOnUse' }, defs);
      el('stop', { offset: 0, 'stop-color': COLOR[r], 'stop-opacity': 0.42 }, gr);
      el('stop', { offset: 1, 'stop-color': COLOR[r], 'stop-opacity': 0.02 }, gr);
      var o = {};
      o.trail = el('polyline', { stroke: COLOR[r], 'stroke-width': 2.5, 'stroke-opacity': 0.55, points: '' }, gTrail);
      o.cone = el('path', { d: cone, fill: 'url(#mmg-' + opts.id + r + ')', stroke: COLOR[r], 'stroke-opacity': 0.55, 'stroke-width': 1.2 }, gCone);
      o.mark = el('g', {}, gMark);
      o.dot = el('circle', { r: 13, fill: COLOR[r], stroke: '#0d0d0f', 'stroke-width': 3 }, o.mark);
      o.txt = el('text', { 'text-anchor': 'middle', y: 5.2, fill: '#0b0b0c', 'font-size': 15, 'font-weight': 700, 'font-family': 'Inter, system-ui, sans-serif' }, o.mark);
      o.txt.textContent = r;
      o.see = {};
      if (opts.sees) self.roles.forEach(function (t) { if (t !== r) o.see[t] = el('line', { stroke: COLOR[r], 'stroke-opacity': 0.8, opacity: 0 }, gSee); });
      self.p[r] = o;
    });
    this.fit();
    window.addEventListener('resize', function () { self.fit(); self.last = -1; self.set(self.f || 0); }, { passive: true });
    this.last = -1;
  }
  Minimap.prototype.fit = function () {
    // keep markers about the same on-screen size at any width
    var w = this.svg.getBoundingClientRect().width || 600;
    this.k = clamp(this.vbw / w, 0.8, 2.2);
    var k = this.k;
    this.roles.forEach(function (r) { var o = this.p[r]; o.scale = k; }, this);
  };
  Minimap.prototype.set = function (f) {
    if (f === this.last) return; this.last = f; this.f = f;
    var d = this.d, self = this;
    this.roles.forEach(function (r) {
      var fr = self.opts.frames(r), o = self.p[r], s = fr[f];
      if (!s) return;
      o.cone.setAttribute('transform', 'translate(' + s[0] + ' ' + s[1] + ') rotate(' + s[2] + ')');
      o.mark.setAttribute('transform', 'translate(' + s[0] + ' ' + s[1] + ') scale(' + o.scale.toFixed(3) + ')');
      var pts = [];
      for (var i = 0; i <= f; i += 2) pts.push(fr[i][0] + ',' + fr[i][1]);
      pts.push(s[0] + ',' + s[1]);
      o.trail.setAttribute('points', pts.join(' '));
      if (self.opts.sees) {
        self.roles.forEach(function (t) {
          if (t === r) return;
          var p = d.proj[r] && d.proj[r][t] ? d.proj[r][t][f] : 0, ln = o.see[t], ts = self.opts.frames(t)[f];
          if (p && ts) {
            // from the observer to 82% of the way (the target's own marker sits at the end)
            ln.setAttribute('x1', s[0]); ln.setAttribute('y1', s[1]);
            ln.setAttribute('x2', lerp(s[0], ts[0], 0.82)); ln.setAttribute('y2', lerp(s[1], ts[1], 0.82));
            ln.setAttribute('opacity', 1);
          } else ln.setAttribute('opacity', 0);
        });
      }
    });
  };

  function frameAt(t, fps, n) { return clamp(Math.floor(t * fps + 1e-3), 0, n - 1); }

  /* ---------------- 1. Views: consoles + minimap ---------------- */
  (function () {
    var d = DATA.teaser, g = groupBy.teaser;
    if (!d || !g) return;
    var cons = {};
    ['A', 'B', 'C'].forEach(function (r) { var b = $('[data-console="' + r + '"]', g.el); if (b) cons[r] = new Console(b, r, d.keys); });
    var svgT = $('[data-minimap="teaser"] svg');
    if (d.map.view) svgT.setAttribute('viewBox', d.map.view.join(' '));
    var mm = new Minimap(svgT, d, {
      id: 't', roles: ['A', 'B', 'C'], coneR: 180, sees: false,
      frames: function (r) { return d.clients[r].frames; }
    });
    // frames: [map x, map y, heading, key mask, turn, weapon, slot (1-4), 1 when the weapon in hand changed on this frame];
    // a change lights the new slot's key for three frames (0.19 s)
    function pressed(fr, f) { for (var k = f; k >= 0 && k > f - 3; k--) if (fr[k][7]) return true; return false; }
    // before the clips load, the posters show clip frame d.poster: show the controls and map of that frame
    var POSTER = d.poster != null ? d.poster : 0, lastT = 0;
    function draw(t) {
      lastT = t;
      var f = g.videos[0].readyState >= 2 ? frameAt(t, d.fps, d.n) : POSTER;
      ['A', 'B', 'C'].forEach(function (r) { var fr = d.clients[r].frames, s = fr[f]; cons[r].set(s[3], s[4], d.weapons[s[5]], s[6] || 0, pressed(fr, f)); });
      mm.set(f);
    }
    // The action labels fit their consoles at every width: full words on one line when every label of the clip fits,
    // else short words (Strafe R, Turn L) on as few lines as they need (the consoles keep one height through the clip).
    var ctx = document.createElement('canvas').getContext('2d');
    function font(e) { var s = getComputedStyle(e); return s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily; }
    function lines(txt, w) {   // greedy wrap after each " +"
      var parts = txt.split('\u00a0+ '), n = 1, cur = '';
      for (var i = 0; i < parts.length; i++) {
        var add = (cur ? cur + '\u00a0+ ' : '') + parts[i] + (i < parts.length - 1 ? '\u00a0+' : '');
        if (cur && ctx.measureText(add).width > w) { n++; cur = parts[i]; } else cur = (cur ? cur + '\u00a0+ ' : '') + parts[i];
      }
      return n;
    }
    function fitActs() {
      var need = { full: 1, short: 1 };
      ['A', 'B', 'C'].forEach(function (r) {
        var c = cons[r], top = c.act.parentNode, badge = $('.con-badge', top), gap = parseFloat(getComputedStyle(top).columnGap) || 0;
        var showW = getComputedStyle(c.wpn).display !== 'none', fr = d.clients[r].frames, bits = c.bits;
        ctx.font = font(c.wpn);
        var ww = showW ? Math.max.apply(null, d.weapons.map(function (w) { return ctx.measureText(w).width; })) + gap : 0;
        var avail = top.clientWidth - badge.offsetWidth - gap - ww - 1;
        ctx.font = font(c.act);
        for (var f = 0; f < fr.length; f++) {
          var s = fr[f], w = d.weapons[s[5]], p = pressed(fr, f);
          var a = actText(bits, s[3], s[4], w, s[6] || 0, p, false), b = actText(bits, s[3], s[4], w, s[6] || 0, p, true);
          if (ctx.measureText(a).width > avail) need.full = 9;
          if (ctx.measureText(b).width > avail) need.short = Math.max(need.short, lines(b, avail));
        }
      });
      var short = need.full > 1, n = short ? Math.min(need.short, 3) : 1;
      ['A', 'B', 'C'].forEach(function (r) { cons[r].short = short; cons[r].box.setAttribute('data-lines', String(n)); });
      draw(lastT);
    }
    g.on(draw);
    fitActs();
    var fitRaf = 0;
    window.addEventListener('resize', function () { if (!fitRaf) fitRaf = requestAnimationFrame(function () { fitRaf = 0; fitActs(); }); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitActs);
  })();

  /* ---------------- 3. Player state: live table, projected players or field, predicted depth, minimap ---------------- */
  (function () {
    var d = DATA.ps, g = groupBy.ps;
    if (!d || !g) return;
    var roles = ['A', 'B', 'C'], wrap = $('.ps', document), W = d.w, H = d.h;
    var GR = d.grid[0], GC = d.grid[1], CELL = d.cell, SIG2 = 2 * d.sigma_px * d.sigma_px;
    var mode = 'proj';
    // the clips start at session frame F0 (the round's frame numbers: the table shows the round's block numbers)
    var F0 = d.f0 || 0;
    function gridPath() {
      var p = '';
      for (var i = 1; i < GR; i++) p += 'M0 ' + i * CELL + 'H' + W;
      for (var j = 1; j < GC; j++) p += 'M' + j * CELL + ' 0V' + H;
      return p;
    }
    function bracket(x, y0, y1, w) {
      var l = Math.min(w, y1 - y0) * 0.3, x0 = x - w / 2, x1 = x + w / 2;
      return 'M' + x0 + ' ' + (y0 + l) + 'V' + y0 + 'H' + (x0 + l) + 'M' + (x1 - l) + ' ' + y0 + 'H' + x1 + 'V' + (y0 + l) +
        'M' + x1 + ' ' + (y1 - l) + 'V' + y1 + 'H' + (x1 - l) + 'M' + (x0 + l) + ' ' + y1 + 'H' + x0 + 'V' + (y1 - l);
    }
    // overlays in each view: projected players (brackets) and the player state field (coverage on the 12x21 token grid)
    var views = {};
    roles.forEach(function (r) {
      var fig = $('.view[data-role="' + r + '"]', g.el), svg = $('svg.marks', fig), v = { marks: {}, ftags: {}, cells: [] };
      v.fld = el('g', { class: 'fld', opacity: 0 }, svg);
      el('path', { class: 'fld-grid', d: gridPath() }, v.fld);
      for (var i = 0; i < GR * GC; i++) {
        v.cells.push({ el: el('rect', { class: 'fld-c', x: (i % GC) * CELL + 1.5, y: Math.floor(i / GC) * CELL + 1.5, width: CELL - 3, height: CELL - 3, rx: 4, 'fill-opacity': 0 }, v.fld), o: 0, c: '' });
      }
      v.prj = el('g', { class: 'prj' }, svg);
      roles.forEach(function (t) {
        if (t === r) return;
        var gg = el('g', { opacity: 0 }, v.prj);
        var bx = el('path', { class: 'mk-box', stroke: COLOR[t] }, gg);
        var tag = el('g', { class: 'mk-tag' }, gg);
        el('rect', { x: -12, y: -22, width: 24, height: 21, rx: 6, fill: COLOR[t] }, tag);
        el('text', { x: 0, y: -6.5, 'text-anchor': 'middle' }, tag).textContent = t;
        v.marks[t] = { g: gg, box: bx, tag: tag, op: -1 };
        var ft = el('g', { class: 'fld-tag', opacity: 0 }, v.fld);
        el('circle', { r: 12, fill: COLOR[t], stroke: '#0b0b0c', 'stroke-width': 2 }, ft);
        el('text', { y: 5.2, 'text-anchor': 'middle' }, ft).textContent = t;
        v.ftags[t] = { g: ft, on: false };
      });
      views[r] = v;
    });
    function P(v, t) { return d.proj[v + '>' + t]; }
    function drawProj(r, f) {
      var v = views[r];
      roles.forEach(function (t) {
        if (t === r) return;
        var p = P(r, t), m = v.marks[t], op = 0;
        if (p.on[f] && p.hx[f] != null) {
          // the bracket where the generator draws the player (bhx...: the camera of the generated frames and a display fit,
          // media.json bracket_source); the field keeps the run's own projection (hx..., cx, rad)
          var b = p.bhy && p.bhy[f] != null, hy = b ? p.bhy[f] : p.hy[f], fy = b ? p.bfy[f] : p.fy[f];
          var y0 = hy - 4, y1 = Math.min(fy, H + 40), x = b ? (p.bhx[f] + p.bfx[f]) / 2 : (p.hx[f] + p.fx[f]) / 2, w = Math.max(2.3 * p.rad[f] * (b ? p.bs || 1 : 1), 12);
          m.box.setAttribute('d', bracket(x, y0, y1, w));
          m.tag.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y0 - 5).toFixed(1) + ')');
          op = p.sees[f] ? 1 : 0;   // only players in the frustum and visible are written for this client
        }
        if (op !== m.op) { m.g.setAttribute('opacity', op); m.op = op; }
      });
    }
    function drawField(r, f) {
      // the field of latent frame k (video frames 4k-3..4k) is built at the camera of frame 4k
      var v = views[r], k = d.latent[f], ff = clamp(4 * k - F0, 0, d.n - 1), pl = [];
      roles.forEach(function (t) {
        if (t === r) return;
        var p = P(r, t), ft = v.ftags[t];
        if (p.sees[ff] && p.cx[ff] != null) {
          // splat centre: the projected position (feet) raised by the projected radius (main.tex App. "Splatting")
          var mx = p.fx[ff], my = p.fy[ff] - p.rad[ff];
          pl.push({ t: t, x: mx, y: my });
          ft.g.setAttribute('transform', 'translate(' + clamp(mx, 14, W - 14).toFixed(1) + ' ' + clamp(my - 34, 14, H - 14).toFixed(1) + ')');
          if (!ft.on) { ft.g.setAttribute('opacity', 1); ft.on = true; }
        } else if (ft.on) { ft.g.setAttribute('opacity', 0); ft.on = false; }
      });
      for (var i = 0; i < v.cells.length; i++) {
        var cx = (i % GC + 0.5) * CELL, cy = (Math.floor(i / GC) + 0.5) * CELL, sum = 0, best = 0, bt = '';
        for (var j = 0; j < pl.length; j++) {
          var dx = cx - pl[j].x, dy = cy - pl[j].y, w = Math.exp(-(dx * dx + dy * dy) / SIG2);
          sum += w; if (w > best) { best = w; bt = pl[j].t; }
        }
        var c = Math.min(1, sum), o = c < 0.02 ? 0 : Math.round((0.18 + 0.72 * c) * 100) / 100, cell = v.cells[i];
        if (o !== cell.o) { cell.el.setAttribute('fill-opacity', o); cell.o = o; }
        if (o && bt !== cell.c) { cell.el.setAttribute('fill', COLOR[bt]); cell.c = bt; }
      }
    }
    // the shared player state table
    var grid = $('.pst-grid', wrap), clock = $('.pst-clock', wrap), rows = {};
    var CAPS = [['forward', 'W'], ['move_left', 'A'], ['back', 'S'], ['move_right', 'D'], ['jump', 'Space'], ['duck', 'Ctrl']];
    var BIT = {}; d.keys.forEach(function (k, i) { BIT[k] = 1 << i; });
    roles.forEach(function (r) {
      var row = h('div', 'pst-row', null, grid); row.setAttribute('data-accent', r.toLowerCase());
      h('span', 'pst-p', r, row);
      var pos = h('span', 'pst-pos', null, row), px = h('span', null, null, pos), py = h('span', null, null, pos), pz = h('span', null, null, pos);
      var face = h('span', 'pst-face', null, row);
      face.innerHTML = '<svg viewBox="-10 -10 20 20" aria-hidden="true"><circle class="ring" r="8.5"/><path class="arr" d="M8 0L-3.5 -5L-1.5 0L-3.5 5Z"/></svg><span></span>';
      var ctl = h('span', 'pst-ctl', null, row), caps = [];
      CAPS.forEach(function (c) { var s = h('span', 'cap' + (c[1] === 'Space' ? ' cap-w' : ''), c[1], ctl); caps.push({ el: s, bit: BIT[c[0]], on: false }); });
      var mouse = h('span', 'mouse', null, ctl); mouse.innerHTML = ARR_L + MOUSE + ARR_R;
      var wp = h('span', 'pst-w', null, row), wn = h('span', null, null, wp), ws = h('small', null, null, wp);
      var view = h('span', 'pst-view', null, row);
      rows[r] = { px: px, py: py, pz: pz, arr: $('.arr', face), fyaw: $('span', face), caps: caps, mouse: mouse, al: $('.arr-l', mouse), ar: $('.arr-r', mouse), wn: wn, ws: ws, view: view, last: {} };
    });
    function num(v) { return (v < 0 ? '−' : '') + Math.abs(Math.round(v)); }
    function setTxt(o, key, e, s) { if (o.last[key] !== s) { o.last[key] = s; e.textContent = s; } }
    function drawTable(f) {
      roles.forEach(function (r) {
        var R = d.rows[r], o = rows[r], k = R.keys[f];
        setTxt(o, 'x', o.px, num(R.x[f])); setTxt(o, 'y', o.py, num(R.y[f])); setTxt(o, 'z', o.pz, num(R.z[f]));
        var yaw = Math.round(R.yaw[f]);
        if (o.last.yaw !== yaw) { o.last.yaw = yaw; o.arr.setAttribute('transform', 'rotate(' + (-yaw) + ')'); o.fyaw.textContent = num(yaw) + '°'; }
        o.caps.forEach(function (c) { var on = !!(k & c.bit); if (on !== c.on) { c.on = on; c.el.classList.toggle('on', on); } });
        var fire = !!(k & BIT.attack), tn = R.turn[f];
        if (o.last.fire !== fire) { o.last.fire = fire; o.mouse.classList.toggle('fire', fire); }
        var ts = tn > 1 ? 1 : tn < -1 ? -1 : 0;
        if (o.last.turn !== ts) { o.last.turn = ts; o.al.classList.toggle('on', ts > 0); o.ar.classList.toggle('on', ts < 0); }
        setTxt(o, 'w', o.wn, d.weapons[R.w[f]] || '');
        var st = R.air[f] ? 'In air' : R.crouch[f] ? 'Crouched' : 'Standing';
        if (o.last.st !== st) { o.last.st = st; o.ws.textContent = st; o.ws.classList.toggle('on', st !== 'Standing'); }
        var seen = roles.filter(function (v) { return v !== r && d.proj[v + '>' + r].sees[f]; }), key = seen.join('');
        if (o.last.view !== key) {
          o.last.view = key;
          o.view.innerHTML = seen.length ? seen.map(function (v) { return '<i style="background:' + COLOR[v] + '">' + v + '</i>'; }).join('') : '<span class="none">—</span>';
        }
      });
      var b = d.block[f];
      var s = f + F0 === 0 ? '<b>Recorded first frame</b>' : 'Block <b>' + b + '</b>';
      if (clock._s !== s) { clock._s = s; clock.innerHTML = s; }
    }
    // minimap (north up): the Minimap helper takes [x, y, rotation] per frame; the view direction is (cos yaw, -sin yaw)
    var svg = $('.ps-map svg', wrap);
    // the map frame takes the height of the table beside it (style.css); the SVG keeps its aspect and shows the whole view
    svg.setAttribute('viewBox', d.map.view.join(' '));
    var md = { map: { image: d.map.image, x: 0, y: 0, w: d.map.w, h: d.map.h }, hfov: d.hfov, proj: {} }, frames = {};
    roles.forEach(function (r) {
      md.proj[r] = {};
      roles.forEach(function (t) { if (t !== r) md.proj[r][t] = d.proj[r + '>' + t].sees; });
      var R = d.rows[r]; frames[r] = R.mx.map(function (x, i) { return [x, R.my[i], -R.yaw[i]]; });
    });
    var mm = new Minimap(svg, md, { id: 'ps', roles: roles, coneR: 150, sees: true, frames: function (r) { return frames[r]; } });
    // mode switch
    var modeBtns = $$('.ps-mode button', wrap), lastF = -1;
    function setMode(m) {
      mode = m; wrap.setAttribute('data-mode', m);
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
      roles.forEach(function (r) { views[r].fld.setAttribute('opacity', m === 'field' ? 1 : 0); views[r].prj.setAttribute('opacity', m === 'field' ? 0 : 1); });
      var f = lastF; lastF = -1; if (f >= 0) draw(f);
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
    function draw(f) {
      if (f === lastF) return; lastF = f;
      roles.forEach(function (r) { if (mode === 'field') drawField(r, f); else drawProj(r, f); });
      drawTable(f); mm.set(f);
    }
    setMode('proj');
    // before the clips load, the posters show clip frame d.poster: draw the overlays of that frame
    var POSTER = d.poster != null ? d.poster : 0;
    g.on(function (t) { draw(g.videos[0].readyState >= 2 ? frameAt(t, d.fps, d.n) : POSTER); });
  })();

  /* ---------------- 4a. Scene state: one client generates a place; another reaches it later (scene state on, off, and the recording) ---------------- */
  // The cases are data: window.WC_DATA.sceneCases (assets/media/scene-state/<case>/case.js, loaded in page order; the markup
  // holds the first case, the no-JS view). With two or more cases, a segmented control above the steps swaps
  // the steps, the times, the four clips and stills and the matched points; a case's clips load only when it is shown in
  // view, and the stacked step lists keep the layout still. Each case plays X's clip (the place, generated earlier by
  // another client), then Y's three clips (recording, on, off) in sync, and holds X's key frame and Y's key frame.
  (function () {
    var box = $('#sc2');
    if (!box) return;
    var CASES = (DATA.sceneCases || []).filter(function (c) { return c && c.x && c.y && c.media && c.steps; });
    var X = $('.sc2-x', box), Ys = $$('.sc2-p', box), vx = $('video', X), vy = Ys.map(function (f) { return $('video', f); });
    var figs = { x: X }; Ys.forEach(function (f) { figs[f.getAttribute('data-mode')] = f; });
    var head = $('.sc2-head', box), nowLab = $('.sc2-now', box), clockX = $('[data-clock="x"]', X), clocksY = Ys.map(function (f) { return $('[data-clock="y"]', f); });
    var atBtns = $$('.sc2-at button', box);
    // without case files: the markup's case (Mirage 2393226 r16: Player 1, then Player 2), without matched points
    var C = CASES[0] || { x: { t: [17.25, 18.0625], key: 17.25 }, y: { t: [24.5, 27.0], early: 25.0, turn: 26.6 }, corr: null };
    var ci = 0, T0, T1, XT, YT, TURN, XKEY, EARLY;
    function setTimes() { XT = C.x.t; XKEY = C.x.key; YT = C.y.t; EARLY = C.y.early; TURN = C.y.turn; T0 = XT[0]; T1 = YT[1]; }
    setTimes();
    function fmt(t) { return t.toFixed(1) + ' s'; }

    // step lists: the markup's list holds the first case; every case's list is written from its data, the others are
    // stacked in the same cell
    var lists = [$('.sc2-steps', box)], stepset = $('.sc2-stepset', box);
    function stepHtml(c) { return c.steps.map(function (s) { return '<li data-step="' + s.step + '"><span class="sc2-when">' + s.when + '</span><p>' + s.html + '</p></li>'; }).join(''); }
    if (CASES.length && lists[0]) lists[0].innerHTML = stepHtml(CASES[0]);
    if (CASES.length > 1 && stepset) {
      CASES.forEach(function (c, k) {
        if (!k) return;
        var ol = h('ol', 'sc2-steps is-off', null, stepset);
        ol.setAttribute('aria-hidden', 'true');
        ol.innerHTML = stepHtml(c);
        lists.push(ol);
      });
    }
    // the caption under the views: one invisible copy per case in the same cell, so its height never changes
    var cap = $('.caption', box);
    function fill(root, c, keep) {
      $$('[data-t]', root).forEach(function (e) { var v = c[e.getAttribute('data-t')]; if (v) e.textContent = String(v).replace(/ /g, '\u00a0'); if (!keep) e.removeAttribute('data-t'); });
    }
    if (cap && CASES.length > 1) {
      var capset = h('div', 'sc2-capset'); cap.parentNode.insertBefore(capset, cap); capset.appendChild(cap);
      CASES.forEach(function (c) { var s = cap.cloneNode(true); s.classList.add('is-sizer'); s.setAttribute('aria-hidden', 'true'); fill(s, c, false); capset.appendChild(s); });
    }
    var steps = {};
    function bindSteps() { steps = {}; $$('li', lists[ci] || lists[0]).forEach(function (li) { steps[li.getAttribute('data-step')] = li; }); }
    bindSteps();

    // Matched points between X's key frame and Y's key frame with scene state on, both generated (the recording is never
    // used; tools/build_scene_cases.py). Undirected (corr.directed false: Y's key block was not served
    // X's entry): each feature lights up in both views at once, a line grows from both ends and meets in the middle, and
    // while the frames hold, light runs along random pairs in either direction. Directed (the run records show that Y's
    // key block was served the entry holding X's key frame): the line grows from X's view to Y's, the feature lights up in
    // Y's view when the line arrives, and the light runs from X to Y. A function of the time since the frames were held.
    var corr = (function () {
      var svg = $('.sc2-corr', box), gridEl = $('.sc2-grid', box);
      var onFig = figs.on;
      if (!svg || !onFig) return null;
      var fa = $('.frame', X), fb = $('.frame', onFig), CA = '#3FB576', CB = '#E67F27';   // Player 1 green, Player 2 orange (client k and client i of Figure 3)
      var defs = el('defs', {}, svg);
      var grad = el('linearGradient', { id: 'sc2-cg', gradientUnits: 'userSpaceOnUse' }, defs);
      el('stop', { offset: 0, 'stop-color': CA }, grad); el('stop', { offset: 0.5, 'stop-color': '#bff5e6' }, grad); el('stop', { offset: 1, 'stop-color': CB }, grad);
      var flt = el('filter', { id: 'sc2-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
      el('feGaussianBlur', { stdDeviation: 2.4 }, flt);
      // the lines pass under the frames' labels: a mask cut out at the chips (and the captions, when the views stack)
      var msk = el('mask', { id: 'sc2-cm', maskUnits: 'userSpaceOnUse' }, defs), mAll = el('rect', { fill: '#fff' }, msk), mHoles = el('g', { fill: '#000' }, msk);
      var gMask = el('g', { mask: 'url(#sc2-cm)' }, svg);
      var gGlow = el('g', { filter: 'url(#sc2-glow)', fill: 'none', stroke: 'url(#sc2-cg)', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, gMask);
      var gLine = el('g', { fill: 'none', stroke: 'url(#sc2-cg)', 'stroke-width': 1, 'stroke-linecap': 'round' }, gMask);
      var gHead = el('g', { fill: '#fff' }, gMask), gPulse = el('g', { fill: '#fff' }, gMask);
      var gHalo = el('g', { filter: 'url(#sc2-glow)' }, svg), gPulseHalo = el('g', { filter: 'url(#sc2-glow)' }, svg);
      var gPt = el('g', {}, svg);
      var D = null, items = [], fewSet = {}, directed = false;
      // phones (the views stack): an even subset of the pairs, by farthest-point sampling on X's frame
      var FEW = 24;
      function fewOf(P) {
        var n = P.length, cx = 0, cy = 0, pick = [], dmin = [];
        if (!n) return {};
        P.forEach(function (p) { cx += p[0] / n; cy += p[1] / n; });
        var s = 0; P.forEach(function (p, k) { if (Math.hypot(p[0] - cx, p[1] - cy) < Math.hypot(P[s][0] - cx, P[s][1] - cy)) s = k; });
        for (var k = 0; k < n; k++) dmin.push(Infinity);
        while (pick.length < Math.min(FEW, n)) {
          pick.push(s);
          var best = -1; P.forEach(function (p, k) { dmin[k] = Math.min(dmin[k], Math.hypot(p[0] - P[s][0], p[1] - P[s][1])); if (best < 0 || dmin[k] > dmin[best]) best = k; });
          s = best;
        }
        var set = {}; pick.forEach(function (k) { set[k] = true; }); return set;
      }
      function build(data) {
        [gGlow, gLine, gHead, gHalo, gPt].forEach(function (g) { g.innerHTML = ''; });
        D = data && data.pts && data.pts.length ? data : null; directed = !!(D && D.directed); geo = null;
        items = (D ? D.pts : []).map(function (p, i) {
          var o = { p: p, i: i, on: true, k: i };
          o.glow = el('line', { opacity: 0 }, gGlow); o.line = el('line', { opacity: 0 }, gLine);
          o.ha = el('circle', { r: 1.9, opacity: 0 }, gHead); o.hb = el('circle', { r: 1.9, opacity: 0 }, gHead);
          ['a', 'b'].forEach(function (s) {
            var c = s === 'a' ? CA : CB;
            o[s + 'h'] = el('circle', { r: 4.2, fill: c, opacity: 0 }, gHalo);
            o[s + 'r'] = el('circle', { r: 0, fill: 'none', stroke: c, 'stroke-width': 1.2, opacity: 0 }, gPt);
            o[s + 'd'] = el('circle', { r: 1.9, fill: '#fff', stroke: c, 'stroke-width': 1.1, opacity: 0 }, gPt);
          });
          return o;
        });
        fewSet = fewOf(D ? D.pts : []);
        shown = items;
      }
      // timing (s): the pairs light up top to bottom; then each pair's line grows (from both ends, or from X's view)
      var A0 = 0.0, AS = 0.022, L0 = 0.5, LS = 0.034, LD = 0.62, END = 3.8;
      var geo = null, t0 = 0, raf = 0, mode = 'off', shown = items;
      function inside(x, y, rs) { for (var k = 0; k < rs.length; k++) { var r = rs[k]; if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true; } return false; }
      function layout() {
        if (!D) return false;
        var g = gridEl.getBoundingClientRect(), a = fa.getBoundingClientRect(), b = fb.getBoundingClientRect();
        if (!g.width || !a.width) return false;
        svg.setAttribute('viewBox', '0 0 ' + g.width.toFixed(1) + ' ' + g.height.toFixed(1));
        mAll.setAttribute('x', -50); mAll.setAttribute('y', -50); mAll.setAttribute('width', g.width + 100); mAll.setAttribute('height', g.height + 100);
        mHoles.innerHTML = '';
        var chips = [];
        [$('.chip', X), $('.chip', onFig), $('figcaption', X)].forEach(function (c, n) {
          var r = c && c.getBoundingClientRect(); if (!r || !r.width) return;
          el('rect', { x: (r.left - g.left - 3).toFixed(1), y: (r.top - g.top - 3).toFixed(1), width: (r.width + 6).toFixed(1), height: (r.height + 6).toFixed(1), rx: 12 }, mHoles);
          if (n < 2) chips.push([r.left - g.left - 7, r.top - g.top - 7, r.right - g.left + 7, r.bottom - g.top + 7]);
        });
        var stacked = b.top >= a.bottom - 1, sa = a.width / D.w, sb = b.width / D.w;
        // views stacked (phones): the lines are drawn only over the two frames, not across the caption between them
        if (stacked) el('rect', { x: -50, y: (a.bottom - g.top + 1).toFixed(1), width: (g.width + 100).toFixed(1), height: Math.max(0, b.top - a.bottom - 2).toFixed(1) }, mHoles);
        items.forEach(function (o) {
          o.ax = a.left - g.left + o.p[0] * sa; o.ay = a.top - g.top + o.p[1] * sa;
          o.bx = b.left - g.left + o.p[2] * sb; o.by = b.top - g.top + o.p[3] * sb;
          // no point under a label; fewer pairs when the views stack
          o.on = !inside(o.ax, o.ay, chips) && !inside(o.bx, o.by, chips) && (!stacked || !!fewSet[o.i]);
          o.L = Math.hypot(o.bx - o.ax, o.by - o.ay);
          [o.line, o.glow].forEach(function (e) {
            e.setAttribute('x1', o.ax.toFixed(1)); e.setAttribute('y1', o.ay.toFixed(1)); e.setAttribute('x2', o.bx.toFixed(1)); e.setAttribute('y2', o.by.toFixed(1));
          });
          ['a', 'b'].forEach(function (s) {
            var x = (s === 'a' ? o.ax : o.bx).toFixed(1), y = (s === 'a' ? o.ay : o.by).toFixed(1);
            [o[s + 'h'], o[s + 'r'], o[s + 'd']].forEach(function (e) { e.setAttribute('cx', x); e.setAttribute('cy', y); });
          });
          o._dash = null;
        });
        shown = items.filter(function (o) { return o.on; });
        shown.forEach(function (o, k) { o.k = k; });
        items.forEach(function (o) { if (!o.on) [o.line, o.glow, o.ha, o.hb, o.ah, o.ar, o.ad, o.bh, o.br, o.bd].forEach(function (e) { op(e, 0); }); });
        var ca = [a.left + a.width / 2 - g.left, a.top + a.height / 2 - g.top], cb = [b.left + b.width / 2 - g.left, b.top + b.height / 2 - g.top];
        grad.setAttribute('x1', ca[0].toFixed(1)); grad.setAttribute('y1', ca[1].toFixed(1)); grad.setAttribute('x2', cb[0].toFixed(1)); grad.setAttribute('y2', cb[1].toFixed(1));
        geo = true; return true;
      }
      function sm(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
      function pop(o, s, u) {   // a keypoint appears: a ring spreads, the dot and its halo stay
        var r = o[s + 'r'], d = o[s + 'd'], hl = o[s + 'h'];
        if (u <= 0) { op(r, 0); op(d, 0); op(hl, 0); return; }
        var q = clamp(u / 0.7, 0, 1);
        r.setAttribute('r', (2 + 9 * sm(q)).toFixed(2)); op(r, q < 1 ? 0.9 * (1 - q) : 0);
        op(d, sm(u / 0.18)); op(hl, 0.7 * sm(u / 0.25) * (1 - 0.5 * sm((u - 0.6) / 0.8)));
      }
      function op(e, a) { var v = a <= 0.002 ? '0' : a >= 0.998 ? '1' : a.toFixed(3); if (e._o !== v) { e._o = v; e.setAttribute('opacity', v); } }
      function dash(o, e) {   // undirected: both ends drawn, each e/2 of the length, meeting in the middle at e = 1; directed: from X's end
        var s;
        if (directed) s = (o.L * e).toFixed(1) + ' ' + (o.L + 10).toFixed(1);
        else { var hh = o.L * e / 2, g = Math.max(0, o.L - 2 * hh); s = hh.toFixed(1) + ' ' + g.toFixed(1) + ' ' + hh.toFixed(1) + ' ' + (o.L + 10).toFixed(1); }
        if (o._dash !== s) { o._dash = s; o.line.setAttribute('stroke-dasharray', s); o.glow.setAttribute('stroke-dasharray', s); }
      }
      function render(t) {
        shown.forEach(function (o) {
          var k = o.k, ta = A0 + AS * k, tl = L0 + LS * k, tb = tl + LD;
          pop(o, 'a', t - ta); pop(o, 'b', directed ? t - tb + 0.12 : t - ta);
          var u = (t - tl) / LD, e = u <= 0 ? 0 : u >= 1 ? 1 : (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
          if (u <= 0) { op(o.line, 0); op(o.glow, 0); op(o.ha, 0); op(o.hb, 0); return; }
          dash(o, e);
          var settle = sm((t - tb) / 1.1);
          op(o.line, 0.9 - 0.72 * settle); op(o.glow, 0.6 - 0.55 * settle);
          if (u < 1) {
            var f = directed ? e : e / 2;
            o.ha.setAttribute('cx', lerp(o.ax, o.bx, f).toFixed(1)); o.ha.setAttribute('cy', lerp(o.ay, o.by, f).toFixed(1)); op(o.ha, 1);
            if (directed) op(o.hb, 0);
            else { o.hb.setAttribute('cx', lerp(o.bx, o.ax, f).toFixed(1)); o.hb.setAttribute('cy', lerp(o.by, o.ay, f).toFixed(1)); op(o.hb, 1); }
          } else { op(o.ha, 0); op(o.hb, 0); }
        });
      }
      // while the frames hold, now and then light runs along a pair (in either direction, or from X to Y when directed)
      var pool = [0, 1, 2].map(function () { return { c: el('circle', { r: 2.2, fill: '#fff', opacity: 0 }, gPulse), g: el('circle', { r: 5, fill: '#bff5e6', opacity: 0 }, gPulseHalo), o: null, t0: 0, dir: 1 }; });
      var nextPulse = 0;
      function pulses(t) {
        if (t >= nextPulse && shown.length) {
          var free = pool.filter(function (q) { return !q.o; })[0];
          if (free) { free.o = shown[Math.floor(Math.random() * shown.length)]; free.t0 = t; free.dir = directed || Math.random() < 0.5 ? 1 : -1; }
          nextPulse = t + 0.4 + Math.random() * 0.4;
        }
        pool.forEach(function (q) {
          if (!q.o) return;
          var u = (t - q.t0) / 0.9, o = q.o, end = q.dir > 0 ? o.bh : o.ah;
          if (u >= 1) { op(q.c, 0); op(q.g, 0); op(end, 0.35); q.o = null; return; }
          var e = sm(q.dir > 0 ? u : 1 - u), x = lerp(o.ax, o.bx, e).toFixed(1), y = lerp(o.ay, o.by, e).toFixed(1), a = Math.min(1, u * 6, (1 - u) * 6);
          q.c.setAttribute('cx', x); q.c.setAttribute('cy', y); q.g.setAttribute('cx', x); q.g.setAttribute('cy', y);
          op(q.c, a); op(q.g, 0.6 * a);
          if (u > 0.85) op(end, 0.35 + 0.5 * (u - 0.85) / 0.15);
        });
      }
      function stopRaf() { if (raf) cancelAnimationFrame(raf); raf = 0; pool.forEach(function (q) { if (q.o) { op(q.dir > 0 ? q.o.bh : q.o.ah, 0.35); } q.o = null; op(q.c, 0); op(q.g, 0); }); }
      function tick(now) {
        raf = 0; var t = (now - t0) / 1000;
        if (t < END) render(t);
        else if (mode === 'play') { if (!settled) { render(END); settled = true; nextPulse = t; } pulses(t); }
        if (t < END || (mode === 'play' && !document.hidden && inView)) raf = requestAnimationFrame(tick);
      }
      var settled = false;
      function relayout() { if (mode !== 'off' && layout()) render(mode === 'static' || settled ? END : (performance.now() - t0) / 1000); }
      window.addEventListener('resize', relayout, { passive: true });
      window.addEventListener('load', relayout);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
      build(C.corr);
      return {
        set: function (data) { stopRaf(); mode = 'off'; svg.classList.remove('is-on'); build(data); },
        play: function () { stopRaf(); if (!layout()) return; mode = 'play'; settled = false; svg.classList.add('is-on'); t0 = performance.now(); render(0); raf = requestAnimationFrame(tick); },
        show: function () { stopRaf(); if (!layout()) return; mode = 'static'; svg.classList.add('is-on'); render(END); },
        hide: function () { stopRaf(); mode = 'off'; svg.classList.remove('is-on'); },
        resume: function () { if (mode === 'play' && settled && !raf) raf = requestAnimationFrame(tick); }
      };
    })();

    // the case's words, times and media into the markup
    var segX = $('.sc2-seg-x', box), segY = $('.sc2-seg-y', box), tickEl = $('.sc2-tick', box), tickLabs = $$('.sc2-ticks span', box);
    var LAB = {
      x: function (a, b) { return C.xname + "'s generated view, " + a + ' to ' + b + ' s'; },
      on: function (a, b) { return C.yname + ' with scene state on, ' + a + ' to ' + b + ' s'; },
      rec: function (a, b) { return 'Recording of ' + C.yname + ', ' + a + ' to ' + b + ' s'; },
      off: function (a, b) { return C.yname + ' with scene state off at inference, ' + a + ' to ' + b + ' s'; }
    };
    function apply() {
      lists.forEach(function (ol, k) { var on = k === ci; ol.classList.toggle('is-off', !on); if (on) ol.removeAttribute('aria-hidden'); else ol.setAttribute('aria-hidden', 'true'); });
      bindSteps();
      fill(box, C, true);
      var pc = function (t) { return (clamp((t - T0) / (T1 - T0), 0, 1) * 100).toFixed(2) + '%'; };
      if (segX) { segX.style.left = '0%'; segX.style.width = pc(XT[1]); }
      if (segY) { segY.style.left = pc(YT[0]); segY.style.right = '0'; }
      if (tickEl) tickEl.style.left = pc(XKEY);
      if (tickLabs[1]) tickLabs[1].style.left = pc(YT[0]);
      atBtns.forEach(function (b) { b.textContent = fmt(b.getAttribute('data-at') === 'early' ? EARLY : T1); });
      Object.keys(figs).forEach(function (m) {
        var f = figs[m], M = C.media && C.media[m], v = $('video', f);
        if (!M || !v) return;
        v.setAttribute('aria-label', LAB[m](m === 'x' ? XT[0].toFixed(1) : YT[0].toFixed(1), m === 'x' ? XT[1].toFixed(1) : YT[1].toFixed(1)));
        var key = $('.sc2-key', f), early = $('.sc2-early', f);
        if (key && M.key && key.getAttribute('src') !== M.key) key.src = M.key;
        if (early && M.early && early.getAttribute('src') !== M.early) early.src = M.early;
        var cur = srcsOf(v), want = cur.map(function (x) { return [/webm/.test(x[1]) ? M.webm : M.mp4, x[1]]; });
        if (cur.some(function (x, i) { return x[0] !== want[i][0]; })) {
          // fetched only when the case plays (prime): its download stops, its sources wait in v._srcs
          detachV(v); v.preload = 'none';
          $$('source', v).forEach(function (e) { v.removeChild(e); });
          v._srcs = want;
          v.setAttribute('poster', M.key);
        }
      });
    }

    var token = 0, raf = 0, timer = 0, timer2 = 0, inView = false, started = false, primed = false;
    [vx].concat(vy).forEach(function (v) { v.removeAttribute('controls'); v.preload = 'none'; });
    function first(m) { return C.media && C.media[m] ? C.media[m].first : null; }
    function show(fig, what) { fig.setAttribute('data-show', what); }
    function step(k) { Object.keys(steps).forEach(function (s) { steps[s].classList.toggle('is-on', s === k); }); }
    function setHead(t) {
      var p = clamp((t - T0) / (T1 - T0), 0, 1);
      setHead.t = t;
      // (moved by a transform, not by left: no layout shift while it runs or when the case changes)
      head.style.transform = 'translateX(' + (p * head.parentNode.clientWidth).toFixed(1) + 'px)'; nowLab.textContent = fmt(t);
      nowLab.style.transform = 'translateX(' + (p < 0.08 ? '-15%' : p > 0.92 ? '-85%' : '-50%') + ')';
    }
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (setHead.t != null) setHead(setHead.t); }).observe(head.parentNode);
    function clockY(t) { clocksY.forEach(function (c) { c.textContent = fmt(t); }); }
    // the clips load: from the load queue (this section on screen or near it), or when the case plays
    function prime() {
      if (!primed) {
        primed = true;
        if (first('x')) vx.poster = first('x');
        Ys.forEach(function (f, i) { var p = first(f.getAttribute('data-mode')); if (p) vy[i].poster = p; });
      }
      [vx].concat(vy).forEach(function (v) { attachV(v); });
    }
    function stop() {
      token++; if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); clearTimeout(timer2);
      [vx].concat(vy).forEach(function (v) { v.pause(); });
    }
    // a clip is ready to play with 1.5 s buffered ahead (or to its end), so that Y's three clips start together and
    // none of them stalls; after 6 s it plays anyway
    function ready(v, cb) {
      var t0 = Date.now();
      attachV(v);
      (function check() {
        if ((v.readyState >= 3 && !v.seeking && aheadOf(v) >= 1.5) || Date.now() - t0 > 6000) cb();
        else setTimeout(check, 50);
      })();
    }
    function readyAll(vs, cb) { var n = vs.length; vs.forEach(function (v) { ready(v, function () { if (--n === 0) cb(); }); }); }
    // the still state: X at its key frame, Y at its key frame (or its early frame)
    function still(at) {
      stop(); box.classList.remove('is-wait');
      show(X, 'key'); clockX.textContent = fmt(XKEY);
      Ys.forEach(function (f) { show(f, at === 'early' ? 'early' : 'key'); });
      clockY(at === 'early' ? EARLY : T1); setHead(at === 'early' ? EARLY : T1);
      step(at === 'early' ? 'y0' : 'y1');
      box.classList.toggle('is-hold', at !== 'early');
      if (corr) { if (at === 'early') corr.hide(); else corr.show(); }
      atBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-at') === at)); });
    }
    function runAll() {
      stop(); prime();
      var my = token;
      box.classList.remove('is-hold'); box.classList.add('is-wait');
      if (corr) corr.hide();
      show(X, 'video'); Ys.forEach(function (f) { show(f, 'video'); });
      [vx].concat(vy).forEach(function (v) { try { v.currentTime = 0; } catch (e) { /* ignore */ } });
      step('x'); setHead(XT[0]); clockX.textContent = fmt(XT[0]); clockY(YT[0]);
      readyAll([vx], function () {
        if (my !== token) return;
        playSafe(vx);
        (function tick() {
          raf = 0; if (my !== token) return;
          var d = vx.duration || (XT[1] - XT[0]), u = clamp(vx.currentTime / d, 0, 1), t = lerp(XT[0], XT[1], u);
          setHead(t); clockX.textContent = fmt(t);
          if (vx.ended || u >= 0.999) {
            show(X, 'key'); clockX.textContent = fmt(XKEY);
            var t0 = performance.now();
            (function gap(now) {
              raf = 0; if (my !== token) return;
              var k = clamp((now - t0) / 450, 0, 1); setHead(lerp(XT[1], YT[0], k));
              if (k >= 1) { runY(my); return; }
              raf = requestAnimationFrame(gap);
            })(t0);
            return;
          }
          raf = requestAnimationFrame(tick);
        })();
      });
    }
    function runY(my) {
      readyAll(vy, function () {
        if (my !== token) return;
        box.classList.remove('is-wait'); step('y0');
        vy.forEach(function (v) { v.playbackRate = 1; try { v.currentTime = 0; } catch (e) { /* ignore */ } playSafe(v); });
        (function tick() {
          raf = 0; if (my !== token) return;
          var m = vy[0], d = m.duration || (YT[1] - YT[0] + 1 / 16), u = clamp(m.currentTime / d, 0, 1), t = lerp(YT[0], YT[1] + 1 / 16, u);
          // (the others follow the first: a seek if more than 0.06 s off, else a small playbackRate nudge, as the groups)
          for (var i = 1; i < vy.length; i++) {
            var df = vy[i].currentTime - m.currentTime;
            if (Math.abs(df) > 0.06) { try { vy[i].currentTime = m.currentTime; } catch (e) { /* ignore */ } }
            else vy[i].playbackRate = Math.abs(df) > 0.015 ? clamp(1 - df * 1.5, 0.85, 1.15) : 1;
          }
          t = Math.min(t, YT[1]);
          setHead(t); clockY(t); if (t >= TURN) step('y1');
          if (m.ended || u >= 0.999) {
            Ys.forEach(function (f) { show(f, 'key'); }); clockY(YT[1]); setHead(YT[1]);
            box.classList.add('is-hold');
            if (corr) timer = setTimeout(function () { if (my === token) corr.play(); }, 450);
            timer2 = setTimeout(function () { if (my !== token) return; if (inView && motion && !document.hidden) runAll(); else started = false; }, 9000);
            return;
          }
          raf = requestAnimationFrame(tick);
        })();
      });
    }
    // the switcher (two or more cases): map and place; the only control this adds
    var caseBtns = [];
    // waiting to play: the key frames, the first step lit and the head at the start (they always agree)
    function cue() { still('key'); step('x'); setHead(T0); box.classList.remove('is-hold'); if (corr) corr.hide(); }
    function setCase(k, byUser) {
      if (k === ci || !CASES[k]) return;
      stop(); ci = k; C = CASES[k]; setTimes(); primed = false;
      if (corr) corr.set(C.corr);
      apply();
      caseBtns.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === k)); });
      if (!motion) { var at = 'key'; atBtns.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') at = b.getAttribute('data-at'); }); still(at); return; }
      // a tap on the switcher plays the new case whenever the box is on screen at all (on phones the box is taller than
      // the screen, so the 30% rule alone left it waiting with the switcher in the lower half)
      var r = box.getBoundingClientRect(), onScreen = r.bottom > 0 && r.top < window.innerHeight;
      if ((inView || (byUser && onScreen)) && !document.hidden) { started = true; runAll(); }
      else { cue(); started = false; }
    }
    var sw = $('.sc2-cases', box);
    if (sw && CASES.length > 1) {
      CASES.forEach(function (c, k) {
        var b = h('button', null, null, sw);
        b.type = 'button'; b.setAttribute('aria-pressed', String(k === 0));
        b.innerHTML = c.map + (c.place ? ' <span class="sc2-place">&middot; ' + c.place + '</span>' : '');
        b.addEventListener('click', function () { setCase(k, true); });
        caseBtns.push(b);
      });
      sw.hidden = false;
    }
    if (CASES.length) apply();
    $('.sc-replay', box).addEventListener('click', function () { runAll(); });
    atBtns.forEach(function (b) { b.addEventListener('click', function () { still(b.getAttribute('data-at')); }); });
    still('key');
    if (!motion) return;
    cue();
    Q.add({ el: box, vids: function () { return [vx].concat(vy); }, attach: prime,
      detach: function () { if (started && !inView) { stop(); started = false; cue(); } [vx].concat(vy).forEach(detachV); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var e = en[en.length - 1];
        inView = e.isIntersecting && e.intersectionRatio >= 0.3;
        if (inView && !started) { started = true; runAll(); }
        else if (inView && corr) corr.resume();
      }, { threshold: [0, 0.3, 0.6] }).observe(box);
    } else { inView = true; started = true; runAll(); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stop(); started = false; }
      else if (inView && !started) { started = true; runAll(); }
    });
  })();

  /* ---------------- 5. Method: the paper's Figures 2 and 3, animated ---------------- */
  // The figure itself is the paper's (an <img> of assets/media/method/fig2.svg / fig3.svg). With motion, a media layer
  // (generated frames in the image slots) and an SVG layer in the figure's own coordinates (assets/media/method/figdata.js)
  // are laid over it: a pale veil that leaves the active modules lit, light travelling along the arrows in the order of
  // main.tex Sec. 3, and the messages between the clients and the shared world. Everything is a function of the loop time
  // t, so the step buttons can jump anywhere; only the videos are kept in step. At the end of every loop the figure is
  // shown as in the paper.
  (function () {
    var FD = DATA.figs, figEls = $$('.ofig[data-fig]');
    if (!FD || !figEls.length || !motion) return;   // no data or reduced motion: the paper's figures, unchanged
    var COL = { i: '#c16c3a', j: '#2b85af', k: '#3a8d6d', l: '#7b5ea7', w: '#1d4f86' };
    var HOT = { i: '#ff7426', j: '#0f9bff', k: '#10b873', l: '#8f5cff', w: '#1f6fff' };
    function sstep(a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
    function env(t, t0, t1, fin, fout) {
      if (t < t0 || t > t1 + fout) return 0;
      return Math.min(sstep(t0, t0 + fin, t), 1 - sstep(t1, t1 + fout, t));
    }
    function easeIO(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
    function ptsD(p) { return 'M' + p.map(function (q) { return q[0] + ' ' + q[1]; }).join('L'); }
    function grow(r, d) { return [r[0] - d, r[1] - d, r[2] + 2 * d, r[3] + 2 * d]; }
    function setRect(e, r) { e.setAttribute('x', r[0]); e.setAttribute('y', r[1]); e.setAttribute('width', Math.max(0, r[2])); e.setAttribute('height', Math.max(0, r[3])); }
    function op(e, a) { var s = a <= 0.001 ? '0' : a >= 0.999 ? '1' : a.toFixed(3); if (e._op !== s) { e._op = s; e.setAttribute('opacity', s); } }
    function vis(e, on) { if (e._vis !== on) { e._vis = on; e.style.display = on ? '' : 'none'; } }

    // noise tile for the denoising steps (coloured Gaussian-like noise, drawn once)
    var NOISE = null;
    function noiseURL() {
      if (NOISE) return NOISE;
      var c = document.createElement('canvas'); c.width = 192; c.height = 108;
      var x = c.getContext('2d'), im = x.createImageData(c.width, c.height), d = im.data;
      for (var i = 0; i < d.length; i += 4) {
        var g = (Math.random() + Math.random() + Math.random()) / 3;
        d[i] = clamp(g * 255 + (Math.random() - 0.5) * 90, 0, 255); d[i + 1] = clamp(g * 255 + (Math.random() - 0.5) * 90, 0, 255);
        d[i + 2] = clamp(g * 255 + (Math.random() - 0.5) * 90, 0, 255); d[i + 3] = 255;
      }
      x.putImageData(im, 0, 0); NOISE = c.toDataURL();
      return NOISE;
    }

    function Stage(fig, D) {
      this.fig = fig; this.D = D; this.vb = D.vb; this.pid = fig.id;
      this.stage = $('.ofig-stage', fig);
      this.media = h('div', 'ofig-media', null, this.stage);
      var vb = D.vb, P = this.pid;
      var svg = this.svg = el('svg', { 'class': 'ofig-fx', viewBox: vb.join(' '), 'aria-hidden': 'true', focusable: 'false' }, this.stage);
      var defs = el('defs', {}, svg);
      var fg = el('filter', { id: P + '-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
      el('feGaussianBlur', { stdDeviation: 2.6 }, fg);
      var fs = el('filter', { id: P + '-soft', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
      el('feGaussianBlur', { stdDeviation: 4.5 }, fs);
      var sg = el('linearGradient', { id: P + '-scan', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
      el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, sg);
      el('stop', { offset: 0.8, 'stop-color': '#fff', 'stop-opacity': 0.55 }, sg);
      el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0.95 }, sg);
      var mk = el('mask', { id: P + '-mask', maskUnits: 'userSpaceOnUse', x: vb[0] - 20, y: vb[1] - 20, width: vb[2] + 40, height: vb[3] + 40 }, defs);
      el('rect', { x: vb[0] - 20, y: vb[1] - 20, width: vb[2] + 40, height: vb[3] + 40, fill: '#fff' }, mk);
      this.gHole = el('g', { filter: 'url(#' + P + '-soft)' }, mk);
      this.veil = el('rect', { x: vb[0] - 2, y: vb[1] - 2, width: vb[2] + 4, height: vb[3] + 4, fill: '#fbfcfe', mask: 'url(#' + P + '-mask)', opacity: 0 }, svg);
      this.gUnder = el('g', {}, svg);     // tints and cover shapes on the figure
      this.gRing = el('g', { fill: 'none' }, svg);
      this.gTrace = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      this.gTop = el('g', {}, svg);
      this.gComet = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      this.gPk = el('g', {}, svg);
      this.cues = []; this.t = 0; this.T = 10; this.playing = false; this.started = false; this.userPaused = false; this.inView = false;
      this.raf = 0; this.last = 0;
    }
    // a mask that hides what passes behind the given figure rectangles (where a drawn line runs under a module)
    Stage.prototype.cut = function (rects) {
      var vb = this.vb, id = this.pid + '-cut' + (this.nCut = (this.nCut || 0) + 1), self = this;
      var m = el('mask', { id: id, maskUnits: 'userSpaceOnUse', x: vb[0] - 20, y: vb[1] - 20, width: vb[2] + 40, height: vb[3] + 40 }, this.svg.firstChild);
      el('rect', { x: vb[0] - 20, y: vb[1] - 20, width: vb[2] + 40, height: vb[3] + 40, fill: '#fff' }, m);
      rects.forEach(function (r) { setRect(el('rect', { rx: 5, fill: '#000' }, m), grow(typeof r === 'string' ? self.box(r) : r, 0.8)); });
      return 'url(#' + id + ')';
    };
    Stage.prototype.box = function (id) { var b = this.D.box[id] || this.D.slot[id]; if (!b) throw new Error('fig box ' + id); return b; };
    Stage.prototype.path = function (id) { var p = this.D.path[id]; if (!p) throw new Error('fig path ' + id); return p; };
    Stage.prototype.place = function (node, r) {
      var vb = this.vb;
      node.style.left = ((r[0] - vb[0]) / vb[2] * 100) + '%'; node.style.top = ((r[1] - vb[1]) / vb[3] * 100) + '%';
      node.style.width = (r[2] / vb[2] * 100) + '%'; node.style.height = (r[3] / vb[3] * 100) + '%';
    };
    // a module lights up: its area is cut out of the veil, and a thin glowing outline in the module's colour
    Stage.prototype.lit = function (ids, c, t0, t1, o) {
      o = o || {};
      var self = this, els = [];
      (Array.isArray(ids) ? ids : [ids]).forEach(function (id) {
        var r = typeof id === 'string' ? self.box(id) : id, pad = o.pad == null ? 3 : o.pad, rr = grow(r, pad);
        var hole = el('rect', { rx: 6, fill: '#000', opacity: 0 }, self.gHole); setRect(hole, grow(r, pad + 2)); els.push(hole);
        if (o.ring !== false) {
          var halo = el('rect', { rx: o.rx || 6, stroke: HOT[c] || c, 'stroke-width': 5, opacity: 0, filter: 'url(#' + self.pid + '-glow)' }, self.gRing); setRect(halo, rr);
          var ring = el('rect', { rx: o.rx || 6, stroke: HOT[c] || c, 'stroke-width': 1.6, opacity: 0 }, self.gRing); setRect(ring, rr);
          halo._k = 0.55; els.push(halo, ring);
        }
        if (o.tint) { var tn = el('rect', { rx: 4, fill: HOT[c] || c, opacity: 0 }, self.gUnder); setRect(tn, grow(r, 1)); tn._k = o.tint; els.push(tn); }
      });
      this.cues.push({ r: function (t) { var a = env(t, t0, t1, o.fin || 0.25, o.fout || 0.4); els.forEach(function (e) { op(e, a * (e._k || 1)); }); } });
    };
    // light travelling along an arrow; the arrow stays lit briefly behind it, and sparks where it arrives
    Stage.prototype.comet = function (pts, c, t0, dur, o) {
      o = o || {};
      if (typeof pts === 'string') pts = this.path(pts);
      var d = ptsD(pts), col = HOT[c] || c, self = this;
      var gT = this.gTrace, gC = this.gComet;
      if (o.cut) { var mk = this.cut(o.cut); gT = el('g', { mask: mk }, gT); gC = el('g', { mask: mk }, gC); }
      var trace = el('path', { d: d, stroke: col, 'stroke-width': o.w || 1.8, opacity: 0 }, gT);
      var halo = o.head === false ? null : el('path', { d: d, stroke: col, 'stroke-width': 7, opacity: 0, filter: 'url(#' + this.pid + '-glow)' }, gC);
      var core = o.head === false ? null : el('path', { d: d, stroke: col, 'stroke-width': 2.6, opacity: 0 }, gC);
      var end = pts[pts.length - 1], spark = o.spark === false ? null : el('circle', { cx: end[0], cy: end[1], r: 0, fill: col, opacity: 0, filter: 'url(#' + this.pid + '-glow)' }, gC);
      var L = 0, hold = o.hold == null ? 0.35 : o.hold;
      this.cues.push({ r: function (t) {
        if (!L) {
          L = trace.getTotalLength() || 1;
          trace.setAttribute('stroke-dasharray', L + ' ' + (L + 1));
          var seg = Math.min(o.seg || 26, L * 0.7);
          if (core) { core.setAttribute('stroke-dasharray', seg + ' ' + (L + seg + 2)); halo.setAttribute('stroke-dasharray', seg + ' ' + (L + seg + 2)); }
          trace._seg = seg;
        }
        var p = (t - t0) / dur;
        if (p < 0 || t > t0 + dur + hold + 0.5) { op(trace, 0); if (core) { op(core, 0); op(halo, 0); } if (spark) op(spark, 0); return; }
        var u = easeIO(clamp(p, 0, 1)), seg = trace._seg;
        trace.setAttribute('stroke-dashoffset', (L * (1 - u)).toFixed(2));
        op(trace, (o.traceOp || 0.9) * (1 - sstep(t0 + dur + hold, t0 + dur + hold + 0.5, t)));
        if (core) {
          var on = p >= 0 && p <= 1;
          var off = (seg - u * (L + seg)).toFixed(2);
          core.setAttribute('stroke-dashoffset', off); halo.setAttribute('stroke-dashoffset', off);
          op(core, on ? 1 : 0); op(halo, on ? 0.6 : 0);
        }
        if (spark) {
          var q = (t - t0 - dur) / 0.45;
          if (q >= 0 && q <= 1) { spark.setAttribute('r', (2 + 6 * q).toFixed(2)); op(spark, 0.7 * (1 - q)); } else op(spark, 0);
        }
      } });
    };
    // the figure's scene-state marker (a map pin), centred on 0 0, s units tall
    function pinGlyph(parent, s, fill, halo) {
      var k = s / 12, g = el('g', { transform: 'scale(' + k.toFixed(3) + ')' }, parent);
      var d = 'M0 6C-2.7 2.7-4.4 0.3-4.4-1.6A4.4 4.4 0 1 1 4.4-1.6C4.4 0.3 2.7 2.7 0 6Z';
      if (halo) el('path', { d: d, fill: '#fff', stroke: '#fff', 'stroke-width': 2.6, 'stroke-linejoin': 'round', opacity: 0.95 }, g);
      el('path', { d: d, fill: fill }, g);
      el('circle', { cx: 0, cy: -1.7, r: 1.55, fill: '#fff' }, g);
      return g;
    }
    // a message travelling along a path (a pill with its size, or o.pin: a memory entry's marker), fading in and out at the ends
    // (o.from: hidden until that fraction of the way; o.cut: hidden behind these modules)
    Stage.prototype.packet = function (pts, t0, dur, o) {
      o = o || {};
      if (typeof pts === 'string') pts = this.path(pts);
      var g = el('g', { opacity: 0 }, o.cut ? el('g', { mask: this.cut(o.cut) }, this.gPk) : this.gPk), P = el('path', { d: ptsD(pts), fill: 'none', stroke: 'none' }, this.gPk);
      var w = o.w || 34, hh = o.h || 12.5, vb = this.vb;
      if (o.pin) { pinGlyph(g, o.pin, o.fill || COL.w, true); w = hh = 0; }
      else {
        el('rect', { x: -w / 2 - 0.5, y: -hh / 2 - 0.5, width: w + 1, height: hh + 1, rx: hh / 2 + 0.5, fill: '#fff', opacity: 0.9 }, g);
        el('rect', { x: -w / 2, y: -hh / 2, width: w, height: hh, rx: hh / 2, fill: o.fill || COL.w }, g);
      }
      if (o.label) {
        var tx = el('text', { x: 0, y: 2.9, 'text-anchor': 'middle', fill: '#fff', 'font-size': o.fs || 8, 'font-weight': 700, 'font-family': 'Inter, system-ui, sans-serif' }, g);
        tx.textContent = o.label;
      }
      var L = 0;
      this.cues.push({ r: function (t) {
        var p = (t - t0) / dur;
        if (p < 0 || p > 1) { op(g, 0); return; }
        if (!L) L = P.getTotalLength() || 1;
        var q = P.getPointAtLength(easeIO(p) * L);
        // the pill stays whole inside the figure where its path runs along an edge
        var qx = clamp(q.x, vb[0] + w / 2 + 2, vb[0] + vb[2] - w / 2 - 2), qy = clamp(q.y, vb[1] + hh / 2 + 2, vb[1] + vb[3] - hh / 2 - 2);
        g.setAttribute('transform', 'translate(' + qx.toFixed(2) + ' ' + qy.toFixed(2) + ')');
        op(g, Math.min(1, (p - (o.from || 0)) / (o.fin || 0.08), (1 - p) / (o.fout || 0.18)));
      } });
    };
    Stage.prototype.fn = function (f) { this.cues.push({ r: f }); };
    // a small label that pops up above a point (the sizes of the message parts)
    Stage.prototype.tag = function (x, y, label, t0, t1, c) {
      var g = el('g', { opacity: 0 }, this.gPk), w = label.length * 4.6 + 8;
      el('rect', { x: x - w / 2, y: y - 6.5, width: w, height: 13, rx: 6.5, fill: c || COL.w }, g);
      var tx = el('text', { x: x, y: y + 3, 'text-anchor': 'middle', fill: '#fff', 'font-size': 8, 'font-weight': 700, 'font-family': 'Inter, system-ui, sans-serif' }, g);
      tx.textContent = label;
      this.cues.push({ r: function (t) {
        var a = env(t, t0, t1, 0.2, 0.3);
        op(g, a); g.setAttribute('transform', 'translate(0 ' + (3 * (1 - a)).toFixed(2) + ')');
      } });
    };
    Stage.prototype.render = function (t) {
      op(this.veil, this.veilAt ? this.veilAt(t) : 0);
      for (var i = 0; i < this.cues.length; i++) this.cues[i].r(t);
      if (this.onFrame) this.onFrame(t);
      this.barAt(t);
      this.follow(t);
    };
    // phones: the figure is wider than its card and scrolls sideways; while it plays, it pans to where the current step
    // happens (focusAt: x in figure units). Touching or scrolling the figure hands it to the reader for 6 s.
    Stage.prototype.initFollow = function () {
      var self = this, sc = this.scroll = $('.ofig-scroll', this.fig);
      this.hold = 0; this.setX = -1; this.lastF = 0;
      var grab = function () { self.hold = performance.now() + 6000; };
      ['touchstart', 'pointerdown', 'wheel'].forEach(function (ev) { sc.addEventListener(ev, grab, { passive: true }); });
      sc.addEventListener('scroll', function () { if (self.setX >= 0 && Math.abs(sc.scrollLeft - self.setX) > 3) grab(); }, { passive: true });
    };
    Stage.prototype.follow = function (t) {
      var sc = this.scroll;
      if (!sc || !this.focusAt || sc.scrollWidth <= sc.clientWidth + 4) return;
      var now = performance.now(), dt = this.lastF ? Math.min(0.1, (now - this.lastF) / 1000) : 0.1; this.lastF = now;
      if (now < this.hold) { this.setX = -1; return; }
      var vb = this.vb, W = this.stage.offsetWidth, max = sc.scrollWidth - sc.clientWidth;
      var target = clamp((this.focusAt(t) - vb[0]) / vb[2] * W - sc.clientWidth / 2, 0, max), cur = sc.scrollLeft;
      if (Math.abs(target - cur) < 0.75) return;
      var next = cur + (target - cur) * (1 - Math.exp(-dt * 3.2));
      sc.scrollLeft = next; this.setX = sc.scrollLeft;
    };
    // the step buttons under the figure
    Stage.prototype.makeBar = function (steps) {
      var self = this, bar = $('.ofig-bar', this.fig);
      bar.removeAttribute('aria-hidden');
      bar.innerHTML = '<button class="gb-btn" type="button" aria-label="Pause">' + PLAY + PAUSE + '</button><div class="ofig-steps" role="group" aria-label="Steps"></div>';
      this.btn = $('.gb-btn', bar);
      var box = $('.ofig-steps', bar);
      this.segs = steps.map(function (s, k) {
        var b = h('button', 'ofig-step', null, box); b.type = 'button';
        b.innerHTML = '<i><b></b></i><span>' + s.label + '</span>';
        b.addEventListener('click', function () { self.seek(self.stepStart(k)); if (!self.playing) { self.userPaused = false; self.play(); } });
        return { el: b, fill: $('b', b), on: false, p: -1 };
      });
      this.btn.addEventListener('click', function () {
        if (self.playing) { self.userPaused = true; self.pause(); } else { self.userPaused = false; self.play(); }
      });
      this.setBtn();
    };
    Stage.prototype.barAt = function (t) {
      if (!this.segs) return;
      var s = this.stepAt(t);
      this.segs.forEach(function (g, k) {
        var p = !s ? 0 : k < s.i ? 1 : k > s.i ? 0 : s.p;
        if (Math.abs(p - g.p) > 0.004) { g.p = p; g.fill.style.transform = 'scaleX(' + p.toFixed(3) + ')'; }
        var on = !!s && k === s.i;
        if (on !== g.on) { g.on = on; g.el.classList.toggle('is-on', on); }
      });
    };
    Stage.prototype.setBtn = function () {
      if (!this.btn) return;
      this.btn.classList.toggle('is-playing', this.playing);
      this.btn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
    };
    Stage.prototype.seek = function (t) { this.t = ((t % this.T) + this.T) % this.T; this.started = true; if (this.onSeek) this.onSeek(this.t); this.render(this.t); };
    Stage.prototype.play = function () {
      var self = this;
      if (this.playing) return;
      this.playing = true; this.started = true; this.setBtn(); this.last = 0;
      if (this.onPlay) this.onPlay();
      function tick(now) {
        if (!self.playing) return;
        var dt = self.last ? Math.min(0.1, (now - self.last) / 1000) : 0; self.last = now;
        self.t += dt; if (self.t >= self.T) { self.t -= self.T; if (self.onSeek) self.onSeek(self.t); }
        self.render(self.t);
        self.raf = requestAnimationFrame(tick);
      }
      this.raf = requestAnimationFrame(tick);
    };
    Stage.prototype.pause = function () {
      this.playing = false; this.setBtn();
      if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0;
      if (this.onPause) this.onPause();
    };
    Stage.prototype.watch = function () {
      var self = this;
      if (!('IntersectionObserver' in window)) { this.play(); return; }
      new IntersectionObserver(function (en) { if (en[en.length - 1].isIntersecting && self.prime) self.prime(); }, { rootMargin: '80% 0px 80% 0px' }).observe(this.fig);
      new IntersectionObserver(function (en) {
        var e = en[en.length - 1];
        self.inView = e.isIntersecting && e.intersectionRatio >= 0.3;
        if (self.inView && !self.userPaused && !document.hidden) self.play();
        else if (!e.isIntersecting || e.intersectionRatio < 0.08) self.pause();
      }, { threshold: [0, 0.08, 0.3, 0.6] }).observe(this.fig);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) self.pause(); else if (self.inView && !self.userPaused) self.play();
      });
    };
    // an HTML element in the media layer at a figure rectangle
    Stage.prototype.mediaBox = function (cls, r) { var d = h('div', 'om ' + (cls || ''), null, this.media); if (r) this.place(d, r); return d; };
    // a figure's clip: its poster when the figure comes near, its sources from the load queue (S.vids)
    function mkVideo(base, poster) {
      var v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'none'; v._poster = poster; v.setAttribute('aria-hidden', 'true');
      v._srcs = [[base + '.mp4', 'video/mp4'], [base + '.webm', 'video/webm']];
      return v;
    }
    // keep a clip at the time the loop wants: 'play' from a time, or 'hold' a frame
    function keep(v, mode, time, playing) {
      if (!v || v.readyState < 1) return;
      if (mode === 'play' && playing) {
        if (Math.abs(v.currentTime - time) > 0.25 && !v.seeking) { try { v.currentTime = time; } catch (e) { /* ignore */ } }
        if (v.paused) playSafe(v);
      } else {
        if (!v.paused) v.pause();
        if (Math.abs(v.currentTime - time) > 0.035 && !v.seeking) { try { v.currentTime = time; } catch (e) { /* ignore */ } }
      }
    }

    /* ----- Figure 2 (b): one block at a time, five blocks of the Nuke round, then a client is added ----- */
    function buildFig2(S) {
      // one block (TB s): read the messages, extrapolate, retrieve one memory entry (in these blocks client i retrieves an earlier
      // entry of client j), generate, state model, publish (main.tex Sec. 3.1 and App. "Deployment protocol")
      var D = S.D, C3 = ['i', 'j', 'k'], TB = 6.2, NB = 5, B0 = 28, TS = 2.4, TR = 2.6, G = 0.6;   // G: generation and later start G s after the retrieval
      var TEND = NB * TB + TS;
      S.T = TEND + TR;
      var Y = { i: 146.88, j: 246.24, k: 345.6 };
      var BASE = 'assets/media/method/fig2/';
      // media: the three clients' views (blocks 28-32 of the round), with the denoising noise over them
      var views = {}, noise = {};
      C3.forEach(function (c) {
        var box = S.mediaBox('om-view', D.slot['view.' + c]);
        var v = mkVideo(BASE + 'view_' + c, BASE + 'view_' + c + '.webp'); box.appendChild(v); views[c] = v;
        var n = h('i', 'om-noise', null, box); noise[c] = n;
      });
      S.prime = function () { if (!noise.i.style.backgroundImage) C3.forEach(function (c) { noise[c].style.backgroundImage = 'url(' + noiseURL() + ')'; views[c].poster = views[c]._poster; }); };
      S.vids = C3.map(function (c) { return views[c]; });
      // views and the timeline stay lit throughout
      C3.forEach(function (c) { S.lit([D.slot['view.' + c]], c, -1, 1e6, { ring: false, pad: 1.5 }); });
      S.lit([[384, 456, 792, 120]], 'w', -1, 1e6, { ring: false, pad: 0 });
      S.veilAt = function (t) { return 0.55 * sstep(0, 0.6, t) * (1 - sstep(TEND, TEND + 0.7, t)); };
      function mediaOp(t) { return sstep(0, 0.5, t) * (1 - sstep(TEND + 0.2, TEND + 0.9, t)); }

      var outer = S.cues;
      // the sync before the first block of the loop (every later block starts right after the previous block's sync)
      var firstSync = []; S.cues = firstSync;
      S.comet('b.t.exchange.1.ij', 'w', 0.0, 0.3, { seg: 8, hold: 0.2 }); S.comet('b.t.exchange.1.jk', 'w', 0.05, 0.3, { seg: 8, hold: 0.2 });
      C3.forEach(function (c, n) { S.lit([[599.3, D.tl.lane_y[c] - 5.6, 11.1, 11.1]], c, 0.02 + 0.05 * n, 0.45, { pad: 1, rx: 6 }); });
      var blockCues = [];   // cues of one block, rendered at the time within the current block
      S.cues = blockCues;
      var ST = { read: [0.2, 1.1], ext: [1.1, 1.6], ret: [1.6, 2.2], gen: [2.2, 3.95], sm: [3.95, 4.75], pub: [4.75, TB] };
      // 1 read: the other clients' latest messages (player state and scene state) reach every client
      S.lit('b.read.badge', 'w', 0.2, 1.1, { pad: 2, rx: 12 });
      S.lit('b.world', 'w', 0.15, 0.95, { pad: 2 });
      C3.forEach(function (c, n) {
        var p = [[555.8, 246.24], [572.4, 246.24], [572.4, Y[c]], [595.4, Y[c]]];
        S.comet(p, 'w', 0.35 + 0.04 * n, 0.55, { seg: 30, hold: 0.5 });
        S.lit('b.lane.' + c + '.read_ctx', c, 0.85, 1.55, { pad: 2 });
      });
      // extrapolate over the block: positions and camera poses from the controls
      C3.forEach(function (c, n) {
        S.comet('b.t.extrapolate.' + c + '.n', c, 1.12 + 0.04 * n, 0.5, { head: false, w: 2.4, hold: 2.2 + G, spark: false, traceOp: 0.95 });
        S.lit('b.t.predicted.' + c + '.n', c, 1.55 + 0.04 * n, 3.4 + G, { pad: 1.5, rx: 5 });
      });
      S.lit('b.t.phase.extrapolation', 'w', 1.1, 3.35 + G, { pad: 2, ring: false, tint: 0.14 });
      // retrieve: with the block's cameras, client i retrieves one memory entry, here an earlier entry of client j (the older
      // entry at the top right of the scene state, its marker in j's colour); the entry leaves the shared world along the
      // figure's own read arrow and lands on the scene-state marker of i's read context
      S.lit('b.world.scene_state.entry.old1', 'j', 1.6, 2.3, { pad: 1.5, rx: 3 });
      var rd = [[555.84, 246.24], [572.4, 246.24], [572.4, Y.i], [595.44, Y.i]];
      S.comet(rd, 'j', 1.7, 0.5, { seg: 24, hold: 0.35 });
      S.packet(rd, 1.7, 0.5, { pin: 11, fill: COL.j, fin: 0.14, fout: 0.14 });
      S.lit([[641.2, 137.8, 16, 19.4]], 'j', 2.14, 2.7, { pad: 1.5, rx: 5 });
      // generate block n on the client's own GPU: context, controls and own history in, four denoising steps, then the frames
      C3.forEach(function (c, n) {
        S.comet('b.lane.' + c + '.ctx_to_G', c, 2.1 + 0.03 * n, 0.25, { seg: 10 });
        S.comet('b.lane.' + c + '.action_to_G', c, 2.2, 0.22, { seg: 8 });
        S.comet('b.lane.' + c + '.history_to_G', c, 2.26, 0.22, { seg: 8 });
        S.lit(['b.lane.' + c + '.G'], c, 1.65 + G, 3.2 + G, { pad: 2.5 });
        S.lit(['b.lane.' + c + '.action', 'b.lane.' + c + '.history'], c, 2.15, 2.6, { pad: 2, rx: 4 });
        S.comet('b.lane.' + c + '.G_to_view', c, 2.22 + G + 0.03 * n, 0.2, { seg: 10 });
        for (var f = 0; f < 4; f++) S.lit('b.t.latent.' + c + '.' + f, c, 2.35 + G + 0.25 * f, 2.35 + G + 0.25 * f + 0.12, { pad: 1, rx: 3, tint: 0.4, fout: 0.8 });
      });
      var GS = 2.35 + G;   // the block's frames play from here, one second (the four latent frames light in turn)
      // state model: own position and depth from the new frames; the extrapolated position is corrected
      var scans = {};
      C3.forEach(function (c, n) {
        var r = D.slot['view.' + c], cp = el('clipPath', { id: S.pid + '-cv' + c }, S.svg.firstChild);
        setRect(el('rect', {}, cp), r);
        var sc = el('rect', { y: r[1], height: r[3], width: 26, fill: 'url(#' + S.pid + '-scan)', 'clip-path': 'url(#' + S.pid + '-cv' + c + ')', opacity: 0 }, S.gTop);
        scans[c] = { el: sc, r: r };
        S.comet('b.lane.' + c + '.view_to_SM', c, 3.35 + G + 0.03 * n, 0.2, { seg: 10 });
        S.lit('b.lane.' + c + '.state_model', c, 3.45 + G, 4.15 + G, { pad: 2.5 });
        S.comet('b.t.correct.' + c + '.n', c, 3.6 + G + 0.04 * n, 0.4, { seg: 16, w: 2.4, hold: 1.2 });
        S.lit([[988.1, D.tl.lane_y[c] - 5.6, 11.1, 11.1]], c, 4.0 + G + 0.04 * n, 5.2 + G, { pad: 1, rx: 6 });
      });
      S.fn(function (t) {
        C3.forEach(function (c) {
          var s = scans[c], u = (t - 3.35 - G) / 0.7;
          if (u < 0 || u > 1) { op(s.el, 0); return; }
          s.el.setAttribute('x', (s.r[0] - 26 + u * (s.r[2] + 26)).toFixed(2)); op(s.el, Math.min(1, u * 5, (1 - u) * 5));
        });
      });
      S.lit('b.t.phase.correction', 'w', 3.5 + G, 4.2 + G, { pad: 2, ring: false, tint: 0.14 });
      // 2 publish: own player state (3.7 kB) and the block as a memory entry (8.3 kB): 12.0 kB per client and block; the
      // messages pass behind the network icon and the message icon that sit on the loop
      var under = ['b.publish.network', 'b.publish.loop_packet'], pb = D.box['b.publish.badge'];
      var underPill = under.concat([[pb[0], 392, pb[2], 40]]);   // the pills also pass behind the publish label on the loop
      S.lit('b.publish.badge', 'w', 4.15 + G, 5.45 + G, { pad: 2, rx: 12 });
      C3.forEach(function (c, n) {
        S.comet('b.lane.' + c + '.SM_to_packet', c, 4.15 + G + 0.03 * n, 0.18, { seg: 10 });
        S.lit('b.lane.' + c + '.packet', c, 4.25 + G, 4.85 + G, { pad: 2 });
        var pth = [[1113.8, Y[c]], [1148.4, Y[c]], [1148.4, 403.2], [471.6, 403.2], [471.6, 383.8]];
        S.comet(pth, 'w', 4.45 + G + 0.17 * n, 0.75, { seg: 40, hold: 0.2, cut: under });
        S.packet(pth, 4.45 + G + 0.17 * n, 0.75, { label: '12.0 kB', fill: COL[c], from: 0.2, fin: 0.06, cut: underPill });   // shown once clear of the message
      });
      var pk = D.box['b.lane.i.packet'];
      S.tag(pk[0] + 13, pk[1] - 8, '3.7 kB', 4.3 + G, 5.0 + G, COL.i);
      S.tag(pk[0] + pk[2] - 13, pk[1] - 8, '8.3 kB', 4.38 + G, 5.0 + G, COL.i);
      S.comet('b.t.exchange.2.ij', 'w', 4.6 + G, 0.3, { seg: 8, hold: 0.3 }); S.comet('b.t.exchange.2.jk', 'w', 4.65 + G, 0.3, { seg: 8, hold: 0.3 });
      S.lit('b.t.label.sync', 'w', 4.55 + G, 5.4 + G, { pad: 2, ring: false, tint: 0.14 });
      S.lit('b.world', 'w', 5.15 + G, TB - 0.05, { pad: 2, fout: 0.3 });
      C3.forEach(function (c, n) {
        var rr = D.box['b.world.player_state.row.' + c], row = [395.6, c === 'i' ? 151.2 : rr[1], 151.9, c === 'i' ? 19.8 : rr[3]];
        S.lit([row], c, 5.2 + G + 0.05 * n, TB - 0.1, { pad: 0, ring: false, tint: 0.22, fout: 0.3 });
        S.lit(['b.world.scene_state.entry.' + c], c, 5.2 + G + 0.05 * n, TB - 0.1, { pad: 2, fout: 0.3 });
      });
      S.cues = outer;

      // the block-end frame of each client becomes its memory entry: it lands on its pin in the scene state
      var pins = {}, ripple = {};
      C3.forEach(function (c) {
        pins[c] = el('image', { preserveAspectRatio: 'xMidYMid slice', opacity: 0 }, S.gUnder);
        setRect(pins[c], D.slot['pin.' + c]);
        ripple[c] = el('rect', { rx: 3, fill: 'none', stroke: HOT[c], 'stroke-width': 1.6, opacity: 0 }, S.gTop);
      });
      // the earlier entry of client j that client i retrieves: the older entry at the top right, its marker in j's colour
      var old1 = el('g', { opacity: 0, transform: 'translate(511.2 277.5)' }, S.gUnder);
      pinGlyph(old1, 9.6, COL.j, false);
      function kf(c, b) { return BASE + 'kf_' + c + '_b' + (b < 10 ? '0' : '') + b + '.webp'; }
      function href(e, u) { if (e._h !== u) { e._h = u; e.setAttribute('href', u); } }

      // steps for the bar (times within a block; the last one is the added client)
      var steps = [
        { label: 'Read', t: ST.read }, { label: 'Extrapolate', t: ST.ext }, { label: 'Retrieve', t: ST.ret }, { label: 'Generate', t: ST.gen },
        { label: 'State model', t: ST.sm }, { label: 'Publish', t: ST.pub }, { label: 'Add a client', t: [NB * TB, TEND] }
      ];
      var NS = steps.length - 1;
      S.stepAt = function (t) {
        if (t >= TEND) return null;
        if (t >= NB * TB) return { i: NS, p: clamp((t - NB * TB) / TS, 0, 1) };
        var tb = t % TB;
        for (var k = 0; k < NS; k++) if (tb < steps[k].t[1] || k === NS - 1) return { i: k, p: clamp((tb - steps[k].t[0]) / (steps[k].t[1] - steps[k].t[0]), 0, 1) };
      };
      S.stepStart = function (k) {
        if (k === NS) return NB * TB;
        var b = S.t < NB * TB ? Math.floor(S.t / TB) : 0;
        return b * TB + steps[k].t[0] - (k === 0 ? 0.2 : 0);
      };
      S.makeBar(steps);
      // phones: the figure pans to where the step happens (x in figure units)
      S.focusAt = function (t) {
        if (t >= NB * TB) return 560;
        var tb = t % TB;
        if (tb < ST.read[1]) return 560;
        if (tb < ST.ext[1]) return 760;
        if (tb < ST.ret[1]) return 600;
        if (tb < ST.gen[1]) return 800;
        if (tb < 4.45 + G) return 950;
        return lerp(950, 560, sstep(4.6 + G, 5.4 + G, tb));
      };

      // adding a client: the new client joins the network; no generator grows
      var scale = [];
      var sc0 = S.cues; S.cues = scale;
      S.lit(['b.scale.unit.l', 'b.scale.new_tag'], 'l', 0.1, 2.0, { pad: 2.5 });
      var units = ['b.scale.unit.i', 'b.scale.unit.j', 'b.scale.unit.k', 'b.scale.unit.l', 'b.scale.network'];
      S.comet([[653, 628.6], [575.9, 628.6]], 'l', 0.35, 0.4, { seg: 24, hold: 0.6, cut: units });
      S.lit('b.scale.network', 'w', 0.7, 1.9, { pad: 2, rx: 20 });
      ['i', 'j', 'k'].forEach(function (c, n) { S.lit('b.scale.unit.' + c, c, 0.95 + 0.12 * n, 1.9, { pad: 2.5 }); });
      S.comet([[535.8, 628.6], [391.7, 628.6]], 'w', 0.9, 0.4, { seg: 20, hold: 0.6, cut: units });
      S.comet([[575.9, 628.6], [581.3, 628.6]], 'w', 0.9, 0.15, { seg: 6, hold: 0.6 });
      S.cues = sc0;

      var LAND = 5.2 + G;
      S.fn(function (t) {
        var inBlocks = t < NB * TB, b = inBlocks ? Math.floor(t / TB) : -1, tb = inBlocks ? t - b * TB : -1;
        for (var i = 0; i < firstSync.length; i++) firstSync[i].r(b === 0 ? tb : -99);
        for (i = 0; i < blockCues.length; i++) blockCues[i].r(inBlocks ? tb : -99);
        var ts = t >= NB * TB ? t - NB * TB : -99;
        for (i = 0; i < scale.length; i++) scale[i].r(ts);
        var mo = mediaOp(t);
        S.media.style.opacity = mo.toFixed(3);
        op(old1, sstep(1.6, 1.9, t) * (1 - sstep(TEND + 0.2, TEND + 0.9, t)));
        C3.forEach(function (c) {
          // the noise of the four denoising steps
          var ns = noise[c], a = 0, n0 = 1.7 + G;
          if (inBlocks && tb >= n0 && tb < GS + 0.05) { var s = Math.floor((tb - n0 - 0.1) / 0.14); a = tb < n0 + 0.1 ? (tb - n0) / 0.1 : [0.95, 0.7, 0.45, 0.2][Math.min(3, s)] || 0.1; ns.style.backgroundPosition = (s * 37 % 97) + 'px ' + (s * 53 % 61) + 'px'; }
          if (ns._a !== a) { ns._a = a; ns.style.opacity = a.toFixed(2); }
          // pins: the latest memory entry of each client (the block-end frame; before the loop's first publish, the block
          // before the window)
          var pe = pins[c], cur;
          if (inBlocks) cur = tb >= LAND ? b : b - 1; else cur = NB - 1;
          if (t < TEND + 0.9) {
            href(pe, kf(c, B0 + cur));
            var drop = inBlocks && tb >= LAND && tb < LAND + 0.35 ? (tb - LAND) / 0.35 : 1;
            var r = D.slot['pin.' + c], k = 1 + 0.35 * (1 - easeIO(drop));
            setRect(pe, [r[0] + r[2] / 2 - r[2] * k / 2, r[1] + r[3] / 2 - r[3] * k / 2, r[2] * k, r[3] * k]);
            op(pe, Math.min(drop * 1.5, 1) * mo);
            var rp = ripple[c], q = inBlocks && tb >= LAND ? (tb - LAND) / 0.6 : 2;
            if (q <= 1) { setRect(rp, grow(r, 1 + 7 * q)); op(rp, 0.9 * (1 - q)); } else op(rp, 0);
          } else { op(pe, 0); op(ripple[c], 0); }
        });
      });
      // the clips follow the loop: hold the frame before the block, play the block (one second), hold its last frame
      S.onFrame = function (t) {
        var inBlocks = t < NB * TB, b = inBlocks ? Math.floor(t / TB) : NB - 1, tb = inBlocks ? t - b * TB : TB;
        var mode = 'hold', time;
        if (tb < 1.8 + G) time = b === 0 ? 0 : b - 1 / 32;
        else if (tb < GS) time = b + 0.001;
        else if (tb < GS + 1) { mode = 'play'; time = b + (tb - GS); }
        else time = b + 1 - 1 / 32;
        C3.forEach(function (c) { keep(views[c], mode, time, S.playing); });
      };
      S.onPause = function () { C3.forEach(function (c) { if (views[c] && !views[c].paused) views[c].pause(); }); };
      S.render(0);
    }

    /* ----- Figure 3: one block of a real rollout, drawn by assets/js/fig3case.js (window.WC_F3CASE) with the machinery above ----- */
    function buildFig3(S) {
      if (typeof window.WC_F3CASE !== 'function') throw new Error('Figure 3: assets/js/fig3case.js not loaded');
      window.WC_F3CASE(S);
    }

    figEls.forEach(function (fig) {
      var D = FD[fig.getAttribute('data-fig')];
      if (!D) return;
      var S = new Stage(fig, D);
      fig._stage = S;   // (for inspection)
      fig.classList.add('is-live');
      try { (fig.getAttribute('data-fig') === 'fig2' ? buildFig2 : buildFig3)(S); } catch (e) { fig.classList.remove('is-live'); fig.classList.add('is-failed'); if (window.console) console.warn(e); return; }
      // its clips in the load queue
      if (S.vids) Q.add({ el: fig, vids: function () { return S.vids; }, attach: function () { if (S.prime) S.prime(); S.vids.forEach(function (v) { attachV(v); }); },
        detach: function () { S.vids.forEach(detachV); } });
      // phones: the figure scrolls sideways inside its card; it starts where the loop starts and then follows the steps
      S.initFollow();
      var sc = S.scroll;
      if (sc.scrollWidth > sc.clientWidth + 4) sc.scrollLeft = clamp((S.focusAt(0) - D.vb[0]) / D.vb[2] * S.stage.offsetWidth - sc.clientWidth / 2, 0, sc.scrollWidth - sc.clientWidth);
      S.watch();
    });
  })();

  /* ---------------- Lightbox ---------------- */
  var lb = $('#lightbox'), lbPanel = $('.lb-panel', lb), lbStage = $('.lb-stage', lb), lbTitle = $('#lb-title');
  var lbItems = [], lbIndex = 0, lbReturn = null, lbPaused = [], lbTile = null, lbUnit = null;
  function lbDropTile() {
    if (!lbTile) return;
    mpPaint.remove(lbTile.target); mpPaint.group.removeBar(lbTile.bar); mpPaint.group.keepAlive = false;
    lbTile = null;
  }
  // the lightbox's clip leaves the load queue (its download stops)
  function lbDropClip() {
    if (!lbUnit) return;
    lbUnit.detach(); Q.remove(lbUnit); lbUnit = null;
  }
  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIndex];
    lbDropTile(); lbDropClip();
    lbStage.innerHTML = '';
    lbPanel.classList.toggle('is-single', lbItems.length < 2);
    if (it.kind === 'tile') {
      // a multiplayer view: drawn live from the same atlases as the grid (same instant); its row atlas loads right after
      // the small atlas (rowsWanted)
      var box = h('div', 'lb-tile', null, lbStage);
      var po = document.createElement('img'); po.src = it.poster; po.alt = ''; box.appendChild(po);
      var c = document.createElement('canvas'); c.width = 336; c.height = 192; c.setAttribute('role', 'img'); c.setAttribute('aria-label', it.title); box.appendChild(c);
      var bar = h('div', 'group-bar group-bar-clock lb-bar', null, lbStage);
      var g = mpPaint.group;
      g.keepAlive = true;
      lbTile = { k: it.k, target: mpPaint.add(c, it.k), bar: g.addBar(bar) };
      Q.lightbox(g.unit);
      if (motion && !g.userPaused && !g.playing) g.start(true);
    } else {
      // the page's own bar (as the multiplayer views have), not the native controls: focus inside those never lets
      // Escape or the arrows reach the page. A click on the video plays or pauses it too
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('aria-label', it.title || 'Video');
      if (it.poster) v.poster = it.poster;
      v._srcs = [[it.mp4, 'video/mp4']].concat(it.webm ? [[it.webm, 'video/webm']] : []);
      lbStage.appendChild(v);
      // first in the load queue while it is open
      lbUnit = Q.add({ vids: function () { return [v]; }, attach: function () { attachV(v); }, detach: function () { detachV(v); } });
      Q.lightbox(lbUnit);
      var vb = h('div', 'group-bar lb-bar', null, lbStage);
      vb.innerHTML = '<button class="gb-btn" type="button" aria-label="Play">' + PLAY + PAUSE + '</button>' +
        '<span class="gb-track" aria-hidden="true"><i></i></span><span class="gb-time" aria-hidden="true"></span>';
      var vbtn = $('.gb-btn', vb), vfill = $('.gb-track i', vb), vtime = $('.gb-time', vb);
      var vsync = function () { var on = !v.paused; vbtn.classList.toggle('is-playing', on); vbtn.setAttribute('aria-label', on ? 'Pause' : 'Play'); };
      var vtoggle = function () { if (v.paused) playSafe(v); else v.pause(); };
      vbtn.addEventListener('click', vtoggle); v.addEventListener('click', vtoggle);
      ['play', 'playing', 'pause'].forEach(function (ev) { v.addEventListener(ev, vsync); });
      v.addEventListener('timeupdate', function () {
        var d = v.duration || 0, t = v.currentTime || 0;
        vfill.style.transform = 'scaleX(' + (d ? clamp(t / d, 0, 1) : 0).toFixed(4) + ')';
        vtime.textContent = t.toFixed(1) + ' / ' + (d ? d.toFixed(1) : '--') + ' s';
      });
      vtime.textContent = '0.0 / -- s';
      if (motion) playSafe(v);
    }
    lbTitle.textContent = it.title || '';
  }
  function lbOpen(items, i, from) {
    lbItems = items; lbReturn = from || document.activeElement;
    lbPaused = groups.filter(function (g) { return g.playing && !(items[0].kind === 'tile' && g === mpPaint.group); });
    lbPaused.forEach(function (g) { g.pause(); });
    lb.hidden = false; document.body.classList.add('lb-open');
    lbShow(i);
    $('.lb-close', lb).focus();
  }
  function lbClose() {
    lb.hidden = true; document.body.classList.remove('lb-open');
    lbDropTile(); lbDropClip(); Q.lightbox(null);
    lbStage.innerHTML = '';
    groups.forEach(function (g) { if (g.playing && !g.inView) g.pause(); });
    lbPaused.forEach(function (g) { if (g.inView && motion && !g.userPaused) g.start(); });
    if (lbReturn && lbReturn.focus) lbReturn.focus();
  }
  $$('[data-close]', lb).forEach(function (b) { b.addEventListener('click', lbClose); });
  $('.lb-prev', lb).addEventListener('click', function () { lbShow(lbIndex - 1); });
  $('.lb-next', lb).addEventListener('click', function () { lbShow(lbIndex + 1); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) { if (e.key === 'Escape') closeMenu(); return; }
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowLeft' && lbItems.length > 1) lbShow(lbIndex - 1);
    else if (e.key === 'ArrowRight' && lbItems.length > 1) lbShow(lbIndex + 1);
    else if (e.key === 'Tab') { // keep focus inside the dialog
      var f = $$('button, video, [href]', lbPanel).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  // gallery
  var tiles = $$('#grid .tile');
  var galleryItems = tiles.map(function (a) {
    return { kind: 'video', mp4: a.getAttribute('href'), webm: a.getAttribute('data-webm'), poster: a.getAttribute('data-poster'), title: a.getAttribute('data-title') };
  });
  tiles.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); lbOpen(galleryItems, i, a); }); });
  // the multiplayer views
  if (mpPaint) {
    var tilesMp = $$('.view', mpPaint.group.el);
    var mpItems = tilesMp.map(function (f, k) {
      return { kind: 'tile', k: k, poster: $('img', f).getAttribute('src'), title: 'View ' + (k + 1) };
    });
    tilesMp.forEach(function (f, i) {
      var fr = $('.frame', f);
      fr.setAttribute('role', 'button'); fr.setAttribute('tabindex', '0'); fr.setAttribute('aria-label', 'Enlarge view ' + (i + 1));
      var open = function () { lbOpen(mpItems, i, fr); };
      fr.addEventListener('click', open);
      fr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  /* ---------------- BibTeX copy ---------------- */
  var copyBtn = $('.copy');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var text = $('#bibtex-code').textContent;
    var done = function () {
      copyBtn.classList.add('is-done'); $('.copy-label', copyBtn).textContent = 'Copied';
      setTimeout(function () { copyBtn.classList.remove('is-done'); $('.copy-label', copyBtn).textContent = 'Copy'; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallbackCopy);
    else fallbackCopy();
    function fallbackCopy() {
      var r = document.createRange(); r.selectNodeContents($('#bibtex-code'));
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { document.execCommand('copy'); done(); } catch (e) { /* the text stays selected */ }
    }
  });
})();
