/*!
 * WorldCast project page: Figure 3 driven by one real rollout.
 * The figure is the paper's (assets/media/method/fig3.svg); with this JavaScript it is its demo variant
 * (assets/media/method/fig3/fig3_demo.svg, tools/fig3case/build_demo_svg.py): the same figure with its memory bank
 * emptied (as the bank's map, the real area of the case: the doorway of the room on Mirage, north up, the world
 * coordinates of the stage's map), and with the paper's example values that the case replaces left out: the coverage
 * bars' fills and the player state table's values (the case's recorded values are the live table on the map: one
 * table). Above it, in the same card, the shared world (a map of Mirage with clients i and k at their recorded
 * positions) and client i's real generated view. One loop
 * follows block n of client i in the paper's scene-state run (held-out Mirage round, given player states; i = Player 2,
 * k = Player 1; j, Player 3, takes no part in this read and is not drawn): block n = 105 (26.06-27.0 s), where i reaches a
 * doorway and turns to look out, where its recent frames mostly do not reach.
 * From the records in assets/media/method/fig3/data.js and points.js (provenance: assets/media/method/fig3/media.json):
 *   store k        17.06-18.0 s: k backs through that doorway looking out; its depth head reads the block, and the block
 *                  becomes k's memory entry (four latent frames, their depth and cameras), stored in the memory bank: the
 *                  bank, empty until then, gets k's four cameras on its map (their recorded places), its four latent
 *                  frames and their depth; on the stage's map the entry's marker and frame at the doorway
 *   player state   23.1-26.0 s: i walks down the corridor into the room (its recent frames, facing east); the figure's
 *                  table, its content the live table on the map; k marked where it is in i's frames (the camera of the
 *                  generated frames: kview_source)
 *   field          the view holds i's last recent frame (416); the player state field of that frame's camera (the run's
 *                  own projection and splat of the recorded states) lies over it, on k, alone for a while; then how it is
 *                  made: k's recorded position, projected into that camera, splatted. Every field is drawn only over the
 *                  frame of the camera it was computed for (media.json field_source)
 *   missing pixels i's recent frames as the read's 3D points (one per 16x16-px cell, its depth and camera; drawn as its
 *                  2x2 sub-cells at that depth); i walks with block n's recorded cameras (the given player states) to the
 *                  doorway and turns to the door, on the map and in the view, ending in block n's camera of frame 428 (the
 *                  one where k's entry covers the most, and the figure's Missing pixels slot); there the cells no point
 *                  reaches open as dark holes, exactly the read's mask (495 of 1008)
 *   retrieve       the read searches the memory bank: k's entry lights up there; its cameras and depth become its 3D
 *                  points (the figure's arrow from the bank to 3D points, one thin light from there to the view), which
 *                  come out of k's cameras along their rays and land in i's view in the 258 cells it covers (exactly the
 *                  mask), in k's colour, then in their own; as they land, the figure's Missing pixels slot fills and k's
 *                  coverage bar grows with them to its share of the missing pixels (the only entry the bank holds); it is
 *                  the most, the bar is marked as the paper marks the retrieved entry, and k's four latent frames are
 *                  fetched from the bank into the figure's retrieved entry
 *   memory frames  k's four latent frames join i's twelve recent frames and the four target frames
 *   generate       block n, the real generated frames: i turns and looks out at the place of k's memory
 *   depth          the state model's depth head reads the new frames
 *   position       at the map's own scale: the place head and the motion head come in where they are and merge into the
 *                  state model's estimate, a small mark where it is, with a thin ring of one body width around it; i's
 *                  marker lies inside (0.50 body widths from the estimate), and then takes it (the estimate is the state
 *                  model's readout of these generated frames; the run itself generated with the recorded positions and
 *                  published none of these estimates)
 *   store i        block n becomes i's memory entry: latent frames, depth, cameras
 *   publish        i publishes for block n+1 along the figure's publish arrow, one packet after the other, each with
 *                  the icon the arrow's label gives what it carries: its position (the recorded one of frame 432, the end
 *                  of block n: the run was given the recorded positions) from the Own position slot into Player state O,
 *                  where i's row lights, the live table on the map takes it and i's marker, there, takes a soft light;
 *                  then its entry into the scene state: the bank gets i's four cameras at the doorway, its latent frames
 *                  and depth; on the stage's map its marker at i's place; k adds it
 * The map shows only what the current step is about: the two clients with short trails, at most two memory markers, at
 * most two camera fans or seen areas at a time and at most one short label at a time. GT player states: block n's cameras
 * and the other players' positions are the recorded ones, so the figure's Extrapolation box stays unlit. Two clocks: the
 * events are written in story time s; the loop time t equals it except in the Field step, where the story holds at
 * s = FH[0] for FH[1] seconds while the field lies on k (SC, LT). main.js hands its figure machinery (lights on modules,
 * light along arrows, step bar) to window.WC_F3CASE; with reduced motion this file draws one still frame of the case (the
 * bank holding k's entry, retrieved; the map with k's card retrieved for block n; in the view the read of camera 428 with
 * k's points in the cells its entry covers; in the figure k's coverage, marked, and the Missing pixels slot).
 */
(function () {
  'use strict';
  var root = document.documentElement, D = (window.WC_DATA || {}).f3c;
  var fig = document.getElementById('fig3');
  var card = fig ? fig.querySelector('.f3c-card') : null, stageEl = card ? card.querySelector('.f3c-stage') : null;
  if (!D || !stageEl) return;
  var motion = root.classList.contains('motion');
  var BASE = 'assets/media/method/fig3/';
  // the figure: its demo variant, the memory bank emptied (the page's markup keeps the paper's figure for readers without
  // JavaScript; the same size and viewBox, so nothing moves)
  var BK = D.bank, FIGIMG = fig.querySelector('.ofig-base'), PAPER_SRC = FIGIMG ? FIGIMG.getAttribute('src') : '';
  if (FIGIMG && BK) {
    FIGIMG.src = BASE + BK.svg;
    FIGIMG.alt = FIGIMG.alt.replace('the scene state (memory bank with latent frames, cameras and depth)', 'the scene state (a memory bank, drawn empty and filled with the entries of the example: latent frames, cameras and depth)');
  }
  var HOT = { i: '#ff7426', j: '#0f9bff', k: '#10b873', w: '#1f6fff', n: '#1d4f86' };
  var RGB = {};
  Object.keys(HOT).forEach(function (c) { var h = HOT[c]; RGB[c] = [1, 3, 5].map(function (k) { return parseInt(h.substr(k, 2), 16); }); });
  function rgba(c, a) { var q = RGB[c]; return 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')'; }
  var F0 = D.f0, F1 = D.f1, FT = D.ft, IW = D.w, IH = D.h, B = D.blk, ROLES = ['i', 'k'], Q = D.pos, TN = D.turn, PTS = D.pts;
  // (ROLES: the clients drawn; j, Player 3, takes no part in this read and is not drawn)
  var SERIF = '"Times New Roman", Times, serif', SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var NS = 'http://www.w3.org/2000/svg';

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function sstep(a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
  function env(t, t0, t1, fin, fout) {
    fin = fin == null ? 0.3 : fin; fout = fout == null ? 0.4 : fout;
    if (t < t0 || t > t1 + fout) return 0;
    return Math.min(sstep(t0, t0 + fin, t), 1 - sstep(t1, t1 + fout, t));
  }
  function easeIO(u) { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function easeOut(u) { u = clamp(u, 0, 1); return 1 - Math.pow(1 - u, 3); }
  function mk(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function sv(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function lerpAng(a, b, u) { var d = ((b - a) % 360 + 540) % 360 - 180; return a + d * u; }
  function setOp(e, a) { var s = a <= 0.002 ? '0' : a >= 0.998 ? '1' : a.toFixed(3); if (e._o !== s) { e._o = s; e.style.opacity = s; } }
  function hash(k) { var x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function lerpR(a, b, u) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }

  /* ---------------- the loop: steps, and the rollout frame shown at each loop time ---------------- */
  var STEPS = [
    { label: 'Store <em>k</em>', t: [0, 3.9], fx: 150 }, { label: 'Player state', t: [3.9, 6.6], fx: 150 },
    { label: 'Field', t: [6.6, 7.8], fx: 430 }, { label: 'Missing pixels', t: [7.8, 12.3], fx: 410 },
    { label: 'Retrieve', t: [12.3, 16.2], fx: 330 }, { label: 'Memory frames', t: [16.2, 17.9], fx: 760 },
    { label: 'Generate', t: [17.9, 21.4], fx: 800 }, { label: 'Depth', t: [21.4, 22.6], fx: 1120 },
    { label: 'Position', t: [22.6, 24.9], fx: 1400 }, { label: 'Store <em>i</em>', t: [24.9, 26.1], fx: 1240 },
    { label: 'Publish', t: [26.1, 28.4], fx: 400 }
  ];
  var TEND = 28.4, T = 29.6;
  // Two clocks. The steps and events are written in story time s; the loop (the step bar, the lights, the page's clock)
  // runs in loop time t, which equals s except in the Field step: there the story holds at s = FH[0] for FH[1] s, while the
  // view shows the field on k alone and then how it is made (those lights are written in loop time)
  var FH = [7.0, 2.3];
  function SC(t) { return t <= FH[0] ? t : t < FH[0] + FH[1] ? FH[0] : t - FH[1]; }   // loop time -> story time
  function LT(s) { return s <= FH[0] ? s : s + FH[1]; }                               // story time -> loop time
  var STEPS_L = STEPS.map(function (q) { return { label: q.label, t: [LT(q.t[0]), LT(q.t[1])], fx: q.fx }; });
  var TGEN = STEPS[6].t[0];   // the Generate step: no frame of block n (417-432) is shown before it
  // [loop time, frame position]: frame f is shown while the position is in [f, f + 1); a sloped segment plays, a flat one holds.
  // The shared world: k's block of 17.1-18.0 s (frames 273-288) at 0.6x, a hold while k's depth head reads it and the
  // entry is made, the entry written at frame 289 and stored in the bank; the world rests; five seconds pass quickly; i's
  // recent frames (369-416) at 1.5x; a hold while block n is read; block n (417-432); the entry of block n written at
  // frame 433, as it reaches the scene state (Publish). It never runs backwards.
  var WK = [[0, 272.5], [0.3, 272.5], [1.85, 288.5], [2.8, 288.5], [2.9, 289.5], [4.0, 289.5], [4.55, 369.5], [6.5, 416.5],
    [18.0, 416.5], [19.9, 432.5], [27.15, 432.5], [27.25, 433.5], [T, 433.5]];
  // client i's video (frames 369-432): the same clock from frame 369 on (k's block is drawn from its frames); in block n,
  // the walk to the doorway (417-427) quickly, the turn (428-430: yaw -71, -94, -107) slowly, frame by frame; it starts
  // once the generator's input has faded to dark (no frame is ever laid over another)
  var VK = [[0, 369.5], [4.55, 369.5], [6.5, 416.5], [18.2, 416.5], [18.65, 427.99], [19.55, 430.99], [19.95, 432.5], [T, 432.5]];
  function seg(K, t) {
    for (var k = 0; k < K.length - 1; k++) {
      var a = K[k], b = K[k + 1];
      if (t >= a[0] && t < b[0]) return { p: lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0])), rate: (b[1] - a[1]) / (b[0] - a[0]), end: b[1] };
    }
    return { p: K[K.length - 1][1], rate: 0, end: K[K.length - 1][1] };
  }
  function tw(q) {   // the loop time at which the world first shows frame q
    for (var k = 0; k < WK.length - 1; k++) {
      var a = WK[k], b = WK[k + 1];
      if (q <= a[1]) return a[0];
      if (q <= b[1]) return a[0] + (q - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
    }
    return T;
  }
  function fr(p) { return clamp(Math.floor(p), F0, F1); }
  function shown(f) { var h = D.hold[f]; return h == null ? f : h; }   // the clip holds a clean frame over 417-418, 426-427
  var TSAVE = tw(289), TPUB = tw(433);   // k's entry is written at step 73 (frame 289); block n's at step 109 (frame 433)
  // Publish: i's position and its memory entry travel along the figure's publish arrow, one after the other ([departs,
  // travel time], story time): the position from the Own position slot into Player state O, where it arrives at TPOS,
  // while i's marker is still at frame 432; the entry from the memory entry into the scene state, where it arrives as it
  // is written (frame 433: TPUB)
  var PUBP = [26.1, 0.9], PUBE = [TPUB - 0.9, 0.9], TPOS = PUBP[0] + PUBP[1];
  var TLAND = TSAVE + 0.4;               // k's entry lands at its place on the map
  var TBK = TSAVE + 0.5, TBI = TPUB;     // the entries fill the figure's memory bank: k's as its frames land, i's as it arrives
  function tv(q) {   // the loop time at which client i's view first shows frame q of block n (Generate)
    for (var k = 0; k < VK.length - 1; k++) {
      var a = VK[k], b = VK[k + 1];
      if (a[0] >= 18.0 && b[1] > a[1] && q >= a[1] && q <= b[1]) return a[0] + (q - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
    }
    return T;
  }
  var TV420 = tv(420);   // (the figure's Camera projection shows frame 420 from then on)
  // the map's framing: the corridor, the room and the doorway (a); the doorway while block n is read, generated and its
  // position read out, at that one scale (b; no zoom)
  var CAMK = [[0, 'a'], [7.75, 'a'], [8.55, 'b'], [25.3, 'b'], [26.1, 'a'], [T, 'a']];

  /* ---------------- the records ---------------- */
  var PIN = D.pins, K69 = PIN[B.winner], N105 = PIN[B.published_as];
  // (the figure's coverage weighs the entries the bank holds, as the demo draws it: k's; on the map only the entry that is
  // retrieved lights up. The read compared 78 candidates, k's covering the most: media.json coverage_source)
  function bitsOf(h, n) { var o = new Uint8Array(n); for (var k = 0; k < n; k++) o[k] = (parseInt(h.charAt(k >> 2), 16) >> (3 - (k & 3))) & 1; return o; }
  var MOS = B.mos.map(function (m) { return { f: m.f, miss: bitsOf(m.miss, 1008), cov: bitsOf(m.cov, 1008) }; });
  // the figure's Missing pixels slot: block n's camera of frame 428 (the third of its four; D.fill: fill428.webp, i's layer
  // and k's layer)
  var FILL = D.fill, CAM = FILL.cam, MQ = MOS[CAM];
  // its missing cells, each with the moment it is marked (from the left, where the doorway is, to the right: o in [0, 1]),
  // and the cells k's entry covers, each with the moment it is filled (f in [0, 1])
  (function () {
    var mc = [];
    for (var k = 0; k < 1008; k++) if (MQ.miss[k]) mc.push({ k: k, c: k % 42, r: Math.floor(k / 42), d: (k % 42) / 42 + 0.12 * hash(k + 17 * CAM), cov: !!MQ.cov[k] });
    mc.sort(function (a, b) { return a.d - b.d; });
    mc.forEach(function (q, n) { q.o = n / mc.length; q.f = clamp(q.c / 41 * 0.75 + 0.25 * hash(q.k + 3 + 31 * CAM), 0, 1); });
    MQ.mc = mc; MQ.cc = mc.filter(function (q) { return q.cov; });
  })();
  var CC = MQ.cc;

  /* ----- the turn: block n's recorded cameras, the ticks of frames 416-432 (D.turn.poses: x, y, z, yaw, pitch; block n's
     four cameras at D.turn.qi) ----- */
  // the turn ends at block n's camera of frame 428 (s = SEND)
  var SEND = TN.qi[CAM];
  function poseAt(s) {
    var P = TN.poses, k = clamp(Math.floor(s), 0, P.length - 1), k2 = Math.min(P.length - 1, k + 1), w = clamp(s - k, 0, 1), a = P[k], b = P[k2];
    return w <= 0 ? a : [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w), lerpAng(a[3], b[3], w), lerp(a[4], b[4], w)];
  }
  function pos(r, p) {   // GT position and yaw of client r at frame position p
    var T_ = D.tr[r], n = T_.x.length, a = clamp(p - 0.5 - FT, 0, n - 1), k = Math.floor(a), u = a - k, k2 = Math.min(n - 1, k + 1);
    return { x: lerp(T_.x[k], T_.x[k2], u), y: lerp(T_.y[k], T_.y[k2], u), yaw: lerpAng(T_.yaw[k], T_.yaw[k2], u) };
  }
  // the player state field: k splatted on the 12x21 token grid (the run's ATI splat: sigma half a token, centre half a
  // body above the feet). Each is drawn only over the frame of the camera it was computed for: FREC[0], the camera of i's
  // last recent frame 416 (block n - 1), over frame 416 in the Field step; FIELD[0], block n's first camera (420), only in
  // the figure's grid, and over frame 420 once block n is generated to it
  function splat(q) {
    var w = new Float32Array(252);
    w.q = q;
    for (var r = 0; r < 12; r++) for (var c = 0; c < 21; c++) {
      var dx = c + 0.5 - q.u, dy = r + 0.5 - (q.v - q.r);
      w[r * 21 + c] = Math.exp(-(dx * dx + dy * dy) / 0.5);
    }
    return w;
  }
  var FIELD = B.field.map(splat), FREC = B.field_rec.map(splat);
  // what i publishes for block n+1: its position at the end of block n (frame 432), the recorded one (this run was given
  // the recorded positions; the state model's estimate of the Position step lies 0.50 body widths from it: D.pos.i.gt)
  var PUBQ = pos('i', B.frames[1] + 0.5);

  /* ---------------- images (loaded when the figure comes near the screen) ---------------- */
  var IM = {}, onImg = [];
  function img(name) {
    var im = IM[name];
    if (!im) {
      im = IM[name] = new Image(); im.decoding = 'async';
      im.onload = function () { onImg.forEach(function (f) { f(name); }); };
      im.src = BASE + name;
    }
    return im;
  }
  function ok(im) { return !!im && im.complete && im.naturalWidth > 0; }
  function spr(who, f) {
    var s = D.spr[who], k = s.frames.indexOf(f), im = IM[s.img];
    if (k < 0 || !ok(im)) return null;
    return [im, (k % s.cols) * s.w, Math.floor(k / s.cols) * s.h, s.w, s.h];
  }
  function whole(name) { var im = IM[name]; return ok(im) ? [im, 0, 0, im.naturalWidth, im.naturalHeight] : null; }
  // draw a sprite cell into a rectangle, cropped to fill it (object-fit: cover)
  function drawCover(x, q, dx, dy, dw, dh) {
    if (!q) return false;
    var sw = q[3], sh = q[4], ar = dw / dh, sa = sw / sh, cx = q[1], cy = q[2];
    if (ar < sa) { var nw = sh * ar; cx += (sw - nw) / 2; sw = nw; } else { var nh = sw / ar; cy += (sh - nh) / 2; sh = nh; }
    x.drawImage(q[0], cx, cy, sw, sh, dx, dy, dw, dh);
    return true;
  }
  var NOISE = (function () {   // the target frames before generation
    var c = document.createElement('canvas'); c.width = 96; c.height = 55;
    var x = c.getContext('2d'), im = x.createImageData(96, 55), d = im.data;
    for (var i = 0; i < d.length; i += 4) {
      var g = (hash(i) + hash(i + 1.3) + hash(i + 2.7)) / 3;
      d[i] = clamp(g * 255 + (hash(i + 5) - 0.5) * 90, 0, 255); d[i + 1] = clamp(g * 255 + (hash(i + 7) - 0.5) * 90, 0, 255);
      d[i + 2] = clamp(g * 255 + (hash(i + 9) - 0.5) * 90, 0, 255); d[i + 3] = 255;
    }
    x.putImageData(im, 0, 0); return c;
  })();
  function roundRect(x, px, py, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }

  /* ---------------- the figure's memory bank: empty at first, filled with the entries of the case as they are stored ---------------- */
  // fig3_demo.svg is the paper's figure with the bank emptied; its map is the real area of the case (figure units: fx =
  // box.x + (x - wx0) s, fy = box.y + (wy1 - y) s). k's entry p00_s069 lands at TBK (Store k), i's p01_s105 at TBI
  // (Publish): each with its four cameras on the bank's map (their recorded places and headings), its four latent frames
  // in Latent frames (the paper's box and tiles) and their depth in Cameras + depth (the paper's camera glyph, a stack of
  // four). While k's entry is retrieved (BKHI) its cameras glow. The bank of the run held every published block of all
  // clients; the demo draws only the entries of this example (media.json bank_source)
  var BKHI = [12.4, 15.9];
  var BKF = { k: B.mem, i: B.tgt }, BKS = { k: ['kv', 'dk'], i: ['i', 'di'] };   // each entry's latent frames: sprites, depth
  function bankIn(c, t, m, still) {   // how far part m (0..3) of c's entry has come into the bank at loop time t (0..1)
    if (still) return c === 'k' ? 1 : 0;
    var t0 = (c === 'k' ? TBK : TBI) + 0.07 * (m || 0);
    return sstep(t0, t0 + 0.22, t) * (1 - sstep(TEND - 0.2, TEND + 0.4, t));
  }
  function bankHi(c, t, still) { return c !== 'k' ? 0 : still ? 1 : env(t, BKHI[0], BKHI[1], 0.3, 0.5); }
  function bxy(x, y) { var m = BK.map; return [m.box[0] + (x - m.wx0) * m.s, m.box[1] + (m.wy1 - y) * m.s]; }
  function bankCamBox(c) {   // around an entry's cameras on the bank's map (figure units): where the figure lights them
    var b = [1e9, 1e9, -1e9, -1e9];
    BK.cams[c].forEach(function (q) { var p = bxy(q.x, q.y); b = [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])]; });
    return [b[0] - 6, b[1] - 5, b[2] - b[0] + 12, b[3] - b[1] + 13];
  }
  // (what a bank slot shows at t, for its redraw: nothing is told apart from almost nothing, so that the slot is cleared
  // when an entry has faded out, at the loop's end, and never keeps a faint copy into the next loop)
  function lvl(a) { return a <= 0.004 ? 'z' : Math.ceil(20 * a); }
  function bankKey(c, t, still) {
    var k = '';
    for (var m = 0; m < 4; m++) k += lvl(bankIn(c, t, m, still)) + ',';
    return k + lvl(bankHi(c, t, still));
  }
  // a camera on the bank's map, seen from above in the paper glyph's line (its stroke, a dashed axis, the eye as a dot
  // ringed in white): the frustum opens along the camera's recorded heading. sc: canvas px per figure unit
  var GL_LEN = 9.5, GL_HALF = 0.5;
  function camGlyph(x, px, py, yaw, sc, col, a, hot) {
    if (a <= 0.004) return;
    var L = GL_LEN * sc * (0.7 + 0.3 * a), hw = Math.tan(GL_HALF) * L, g = -yaw * Math.PI / 180, ca = Math.cos(g), sa = Math.sin(g);
    var fx = px + ca * L, fy = py + sa * L, lx = -sa * hw, ly = ca * hw, P = BK.player.k;
    x.save(); x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = BK.map.glyph_sw * 0.8 * sc; x.lineJoin = 'round'; x.lineCap = 'round';
    if (hot > 0.01) { x.shadowColor = col; x.shadowBlur = 5 * sc * hot; }
    x.beginPath(); x.moveTo(px, py); x.lineTo(fx + lx, fy + ly); x.lineTo(fx - lx, fy - ly); x.closePath(); x.stroke();
    x.setLineDash([0.8 * sc, 0.8 * sc]); x.beginPath(); x.moveTo(px, py); x.lineTo(fx, fy); x.stroke(); x.setLineDash([]);
    x.shadowBlur = 0;
    x.beginPath(); x.arc(px, py, P.r * 0.8 * sc, 0, 6.2832); x.fillStyle = col; x.fill(); x.lineWidth = P.ring * sc; x.strokeStyle = '#fff'; x.stroke();
    x.restore();
  }
  // the bank's map: the entries' cameras (r: the slot, figure units)
  function bankMapDraw(r) {
    var f = function (x, w, h, t, still) {
      var sc = w / r[2];
      ['k', 'i'].forEach(function (c) {
        var hot = bankHi(c, t, still), col = BK.latent[c].group.stroke;
        BK.cams[c].forEach(function (q, m) {
          var p = bxy(q.x, q.y);
          camGlyph(x, (p[0] - r[0]) * sc, (p[1] - r[1]) * sc, q.yaw, sc, col, bankIn(c, t, m, still), hot);
        });
      });
    };
    f.key = function (t, still) { return bankKey('k', t, still) + '|' + bankKey('i', t, still); };
    return f;
  }
  // Latent frames: the paper's box of the entry and its four tiles, each tile the entry's latent frame (r: the slot)
  function bankLatDraw(c, r) {
    var G = BK.latent[c], fr_ = BKF[c], sp = BKS[c][0];
    var f = function (x, w, h, t, still) {
      var sc = w / r[2], X_ = function (v) { return (v - r[0]) * sc; }, Y_ = function (v) { return (v - r[1]) * sc; };
      var a0 = bankIn(c, t, 0, still), gb = G.group;
      if (a0 <= 0.004) return;
      x.save(); x.globalAlpha = a0;
      roundRect(x, X_(gb.r[0]), Y_(gb.r[1]), gb.r[2] * sc, gb.r[3] * sc, gb.rad * sc); x.fillStyle = gb.fill; x.fill();
      x.lineWidth = gb.sw * sc; x.strokeStyle = gb.stroke; x.stroke(); x.restore();
      G.tiles.forEach(function (tl, m) {
        var a = bankIn(c, t, m, still), q = tl.r;
        if (a <= 0.004) return;
        x.save(); x.globalAlpha = a;
        x.save(); roundRect(x, X_(q[0]), Y_(q[1]), q[2] * sc, q[3] * sc, tl.rad * sc); x.clip();
        if (!drawCover(x, spr(sp, fr_[m]), X_(q[0]), Y_(q[1]), q[2] * sc, q[3] * sc)) { x.fillStyle = tl.fill; x.fill(); }
        x.restore();
        roundRect(x, X_(q[0]), Y_(q[1]), q[2] * sc, q[3] * sc, tl.rad * sc); x.lineWidth = Math.max(1, tl.sw * 1.6 * sc); x.strokeStyle = tl.stroke; x.stroke();
        x.restore();
      });
    };
    f.key = function (t, still) { return bankKey(c, t, still); };
    return f;
  }
  // Cameras + depth: the paper's camera glyph of the entry and its four depth maps, stacked (r: the slot)
  var GLP = {};
  function bankCamDraw(c, r) {
    var gl = BK.glyph[c], dp = BK.depth[c], fr_ = BKF[c], sp = BKS[c][1];
    var f = function (x, w, h, t, still) {
      var sc = w / r[2], a0 = bankIn(c, t, 0, still);
      if (a0 <= 0.004) return;
      x.save(); x.globalAlpha = a0; x.strokeStyle = gl.stroke;
      gl.paths.forEach(function (p, n) {
        var P2 = GLP[c + n] || (GLP[c + n] = new Path2D(p.d));
        x.save(); x.setTransform(sc, 0, 0, sc, -r[0] * sc, -r[1] * sc); x.transform(p.m[0], p.m[1], p.m[2], p.m[3], p.m[4], p.m[5]);
        x.lineWidth = p.sw; x.lineCap = 'butt'; x.lineJoin = 'round'; if (p.dash) x.setLineDash(p.dash);
        x.stroke(P2); x.restore();
      });
      x.restore();
      for (var m = 3; m >= 0; m--) {   // (the entry's first depth map in front, as the paper draws one)
        var a = bankIn(c, t, m, still), q = [dp.r[0] + 1.3 * m, dp.r[1] + 0.9 * m, dp.r[2], dp.r[3]];
        if (a <= 0.004) continue;
        var X0 = (q[0] - r[0]) * sc, Y0 = (q[1] - r[1]) * sc, Wd = q[2] * sc, Hd = q[3] * sc;
        x.save(); x.globalAlpha = a; x.shadowColor = 'rgba(15,30,60,.28)'; x.shadowBlur = 2.5 * sc; x.shadowOffsetY = 0.6 * sc;
        x.fillStyle = '#fff'; x.fillRect(X0, Y0, Wd, Hd); x.shadowColor = 'transparent';
        drawCover(x, spr(sp, fr_[m]), X0, Y0, Wd, Hd);
        x.lineWidth = Math.max(1, dp.sw * sc); x.strokeStyle = dp.stroke; x.strokeRect(X0, Y0, Wd, Hd); x.restore();
      }
    };
    f.key = function (t, still) { return bankKey(c, t, still); };
    return f;
  }

  /* ---------------- the stage ---------------- */
  var mapBox = stageEl.querySelector('.f3c-map'), viewBox = stageEl.querySelector('.f3c-view');
  var mapCv = mapBox.querySelector('canvas'), mx = mapCv.getContext('2d');
  var video = viewBox.querySelector('video'), viewCv = viewBox.querySelector('canvas'), vx = viewCv.getContext('2d');
  var chipSub = viewBox.querySelector('.f3c-sub'), chipEl = viewBox.querySelector('.f3c-chip'), chipWho = chipEl ? chipEl.querySelector('em') : null;
  var pst = mapBox.querySelector('.f3c-pst');
  var M = { W: 1, H: 1, s: 1, vx0: 0, vy1: 0 }, V = { W: 1, H: 1 }, G = {};
  function X(x) { return (x - M.vx0) * M.s; }
  function Y(y) { return (M.vy1 - y) * M.s; }
  function layout() {
    M.W = Math.max(1, mapBox.clientWidth); M.H = Math.max(1, mapBox.clientHeight);
    mapCv.width = Math.round(M.W * DPR); mapCv.height = Math.round(M.H * DPR);
    M.fa = fit(D.map.roi); M.fb = fit(D.map.roi2);
    cam(0, false);
    V.W = Math.max(1, viewBox.clientWidth); V.H = Math.max(1, viewBox.clientHeight);
    viewCv.width = Math.round(V.W * DPR); viewCv.height = Math.round(V.H * DPR);
    gridLayout();
  }
  // the Position step: the estimate is a small mark where it is, with a thin ring of one body width (32 u, data.js pos.bw)
  // around it, at the map's own scale; i's recorded position lies inside the ring (0.50 body widths from the estimate).
  // POSC: the centre of the figure's Own position slot (i's recorded position, the heads' marks and the estimate)
  var RING_R = Q ? Q.bw : 32;
  var POSC = (function () {
    var I = Q ? Q.i : null;
    return I ? [(I.gt[0] + I.est[0] + I.place[0] + I.motion[0]) / 4, (I.gt[1] + I.est[1] + I.place[1] + I.motion[1]) / 4] : [570, 790];
  })();
  function fit(roi, s_) {   // the map framing that shows a region of the map whole (or centred on it at scale s_)
    var s = s_ || Math.min(M.W / (roi[2] - roi[0]), M.H / (roi[3] - roi[1]));
    var vw = M.W / s, vh = M.H / s, cx = (roi[0] + roi[2]) / 2, cy = (roi[1] + roi[3]) / 2;
    var mx0 = D.map.x0, mx1 = mx0 + D.map.w, my1 = D.map.y1, my0 = my1 - D.map.h;
    cx = clamp(cx, mx0 + vw / 2, Math.max(mx0 + vw / 2, mx1 - vw / 2)); cy = clamp(cy, my0 + vh / 2, Math.max(my0 + vh / 2, my1 - vh / 2));
    return { s: s, cx: cx, cy: cy };
  }
  function cam(t, still) {
    var F = { a: M.fa, b: M.fb }, A, Bf, z = 0;
    if (still) { A = Bf = F.b; }
    else {
      var k = 0;
      while (k < CAMK.length - 2 && t >= CAMK[k + 1][0]) k++;
      A = F[CAMK[k][1]]; Bf = F[CAMK[k + 1][1]];
      if (A !== Bf) z = sstep(CAMK[k][0], CAMK[k + 1][0], t);
    }
    var s = Math.exp(lerp(Math.log(A.s), Math.log(Bf.s), z)), cx = lerp(A.cx, Bf.cx, z), cy = lerp(A.cy, Bf.cy, z);
    M.s = s; M.vx0 = cx - M.W / s / 2; M.vy1 = cy + M.H / s / 2;
  }
  // the generator's input in client i's view: 4 memory frames (k), 12 recent context frames (i), 4 target frames
  function gridLayout() {
    var W = V.W, H = V.H, pad = W * (W < 480 ? 0.03 : 0.045), gap = Math.max(2, W * 0.007), Gg = W * (W < 480 ? 0.026 : 0.036);
    var tw_ = (W - 2 * pad - 2 * Gg - 5 * gap) / 8, th = tw_ * 384 / 672, lab = Math.max(13, W * 0.03);
    var hb = 3 * th + 2 * gap, y0 = (H - hb) / 2 + lab * 0.5;
    function grp(x0, cols, rows, yy) { var o = []; for (var k = 0; k < cols * rows; k++) o.push([x0 + (k % cols) * (tw_ + gap), yy + Math.floor(k / cols) * (th + gap), tw_, th]); return o; }
    var xm = pad, xr = xm + 2 * tw_ + gap + Gg, xt = xr + 4 * tw_ + 3 * gap + Gg, y2 = y0 + (hb - (2 * th + gap)) / 2;
    G.mem = grp(xm, 2, 2, y2); G.rec = grp(xr, 4, 3, y0); G.tgt = grp(xt, 2, 2, y2);
    G.box = { mem: [xm, y2, 2 * tw_ + gap, 2 * th + gap], rec: [xr, y0, 4 * tw_ + 3 * gap, hb], tgt: [xt, y2, 2 * tw_ + gap, 2 * th + gap] };
    G.lab = lab;
    // a memory entry, as the figure draws it: depth, latent frames, cameras
    var ew = W * 0.25, eh = ew * 384 / 672, ey = H * 0.5 - eh * 0.5 - H * 0.02;
    G.ent = { depth: [W * 0.5 - ew * 1.28 - ew / 2, ey, ew, eh], frames: [W * 0.5 - ew / 2 - W * 0.02, ey, ew, eh], cams: [W * 0.5 + ew * 0.95, ey, ew * 0.5, eh] };
    // the memory frame of k beside i's generated view (Generate): lower right corner
    var pw = W * (W < 480 ? 0.38 : 0.32), ph = pw * 384 / 672;
    G.pip = [W - pw - W * 0.03, H - ph - H * 0.05, pw, ph];
  }

  /* ----- small drawing helpers ----- */
  function wedge(x, px, py, yaw, R, half) {
    var a = -yaw * Math.PI / 180;
    x.beginPath(); x.moveTo(px, py); x.arc(px, py, R, a - half, a + half); x.closePath();
  }
  var HALF = Math.atan(4 / 3);   // half the horizontal field of view (106.26 deg)
  function ring(x, px, py, r, c, a, w) { if (a <= 0.004) return; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.strokeStyle = rgba(c, a); x.lineWidth = w || 1.6; x.stroke(); }
  // where a thumbnail card attached to a map point goes (map pixels): beside the point, a little below it; side 1: to the
  // right (k's entry, clear of the room and of the doorway), -1: to the left (block n's entry)
  function cardRect(px, py, w, side) {
    var h = w * 9 / 16, bx = side > 0 ? px + 18 : px - 18 - w, by = py + 16;
    return [clamp(bx, 6, M.W - w - 6), clamp(by, 6, M.H - h - 6), w, h];
  }
  // a thumbnail card attached to a point of the map (a memory entry's frame), with a stem to the point
  function thumb(x, q, px, py, w, c, a, side, glowA) {
    if (a <= 0.004 || !q) return null;
    var cr = cardRect(px, py, w, side), h = cr[3], bx = cr[0], by = cr[1];
    x.save(); x.globalAlpha = a;
    x.strokeStyle = rgba(c, 0.9); x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(side > 0 ? bx + 3 : bx + w - 3, by + 3); x.stroke();
    x.shadowColor = glowA > 0 ? rgba(c, 0.85 * glowA) : 'rgba(15,30,60,.3)'; x.shadowBlur = glowA > 0 ? 12 + 10 * glowA : 12; x.shadowOffsetY = glowA > 0 ? 0 : 4;
    roundRect(x, bx - 2, by - 2, w + 4, h + 4, 5); x.fillStyle = '#fff'; x.fill();
    x.shadowColor = 'transparent';
    x.save(); roundRect(x, bx, by, w, h, 3.5); x.clip(); drawCover(x, q, bx, by, w, h); x.restore();
    roundRect(x, bx - 2, by - 2, w + 4, h + 4, 5); x.strokeStyle = rgba(c, 1); x.lineWidth = 1.5; x.stroke();
    x.restore();
    return [bx - 2, by - 2, w + 4, h + 4];
  }
  // a small pill; parts: [[text, italic], ...]; anchor: centre (default), 'left' (starts at px) or 'right' (ends at px)
  function tag(x, px, py, parts, c, a, dark, W, H, anchor) {
    if (a <= 0.004) return null;
    x.save(); x.globalAlpha = a;
    var sm = W < 420, fs = sm ? 10.5 : 11.5, fi = sm ? 12.5 : 13.5, w = sm ? 14 : 16;
    parts.forEach(function (p) { x.font = p[1] ? 'italic 600 ' + fi + 'px ' + SERIF : '600 ' + fs + 'px ' + SANS; p.w = x.measureText(p[0]).width; w += p.w; });
    var h = sm ? 19 : 21, bx = anchor === 'left' ? px : anchor === 'right' ? px - w : px - w / 2;
    bx = Math.round(clamp(bx, 6, W - w - 6)); var by = Math.round(clamp(py - h, 6, H - h - 6));
    roundRect(x, bx, by, w, h, h / 2); x.fillStyle = dark ? 'rgba(22,22,23,.72)' : 'rgba(255,255,255,.93)'; x.fill();
    if (!dark) { x.strokeStyle = rgba(c, 0.85); x.lineWidth = 1; x.stroke(); }
    var cx = bx + w / 2 - (w - (sm ? 14 : 16)) / 2; x.textBaseline = 'middle';
    parts.forEach(function (p) {
      x.font = p[1] ? 'italic 600 ' + fi + 'px ' + SERIF : '600 ' + fs + 'px ' + SANS;
      x.fillStyle = p[1] ? rgba(c, 1) : (dark ? '#f5f5f7' : '#1d1d1f'); x.fillText(p[0], cx, by + h / 2 + 0.5); cx += p.w;
    });
    x.restore();
    return [bx, by, w, h];
  }
  function letter(x, px, py, c, s, a, r) {   // a client's letter in a disc, as the figure writes it
    if (a <= 0.004) return;
    r = r || 10;
    x.save(); x.globalAlpha = a;
    x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 6;
    x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fillStyle = HOT[c]; x.fill(); x.shadowColor = 'transparent';
    x.lineWidth = 1.5; x.strokeStyle = 'rgba(255,255,255,.95)'; x.stroke();
    x.font = 'italic 700 ' + Math.round(r * 1.45) + 'px ' + SERIF; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(s, px - 0.5, py + 0.5);
    x.restore();
  }

  /* ----- the map: the shared world ----- */
  // Only what the current step is about. Always, and quiet: the map and the two clients of the read (i, k) at their
  // recorded positions with short trails. At most two memory markers (k's entry from the moment it is stored; block n's
  // entry once published), at most two camera fans or seen areas at a time, and at most one short label at a time.
  var MS = {};   // what the map drew last, in map pixels (for the links and the flights)
  // when (loop time [from, to, fade in, fade out]): the fans and seen areas, at most two at a time, and the labels, one at
  // a time, each for about a second and a half (tools/fig3case/factcheck.py checks both)
  var MAPFAN = {
    kcam: [0.3, 2.1, 0.35, 0.4],                // scene state: k's camera while it generates the doorway view
    ksaved: [TSAVE - 0.1, 25.8, 0.5, 0.6],      // what k's entry saw, from the moment it is stored (quiet between steps)
    icam: [4.55, 6.3, 0.35, 0.35],              // player state: i's camera while it walks in (its recent frames)
    fcam: [6.7, 7.7, 0.3, 0.3],                 // field: the camera of i's frame 416, whose field the view shows
    iread: [8.95, 16.1, 0.35, 0.45],            // missing pixels, retrieve: i with block n's cameras, walking and turning
    igen: [18.0, 21.3, 0.3, 0.45],              // generate: i's camera while block n is generated
    npub: [TPUB - 0.05, 28.3, 0.4, 0.6]         // publish: what block n's entry saw
  };
  var MAPLAB = {
    savek: [TSAVE + 0.45, 3.7, 0.3, 0.3],       // memory entry of k (gone as the Player state table comes in)
    turn: [9.2, 10.5, 0.3, 0.35],               // block n (i walking and turning with its cameras)
    retr: [14.75, 15.4, 0.3, 0.25],             // retrieved for block n (as its frames are fetched from the bank)
    place: [22.85, 23.1, 0.2, 0.15],            // place head
    motion: [23.25, 23.5, 0.2, 0.15],           // motion head
    est: [23.9, 24.4, 0.2, 0.25],               // estimate
    pubi: [TPUB + 0.1, 28.2, 0.3, 0.3]          // memory entry of i
  };
  function envK(t, e) { return env(t, e[0], e[1], e[2], e[3]); }
  function camFan(x, px, py, yaw, R, c, a, k0) {   // a camera's view on the map: one soft wedge (its horizontal field of view)
    if (a <= 0.004) return;
    var g = x.createRadialGradient(px, py, 0, px, py, R);
    k0 = k0 || 1;
    g.addColorStop(0, rgba(c, 0.32 * k0 * a)); g.addColorStop(0.65, rgba(c, 0.13 * k0 * a)); g.addColorStop(1, rgba(c, 0));
    wedge(x, px, py, yaw, R, HALF); x.fillStyle = g; x.fill();
  }
  function fanLine(x, px, py, yaw, R, c, a) {   // a camera's view as its outline only (fading along its edges)
    if (a <= 0.004) return;
    var g = x.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, rgba(c, 0.9 * a)); g.addColorStop(0.6, rgba(c, 0.35 * a)); g.addColorStop(1, rgba(c, 0));
    wedge(x, px, py, yaw, R, HALF); x.strokeStyle = g; x.lineWidth = 1.4; x.lineJoin = 'round'; x.stroke();
  }
  function seen(x, fans, ex, ey, c, a, k0) {   // what an entry's four cameras saw (its own depth): one soft area, the union of its fans
    if (a <= 0.004) return;
    var px = X(ex), py = Y(ey), R = 1;
    x.beginPath();   // the four fans wind the same way: one path filled nonzero is their union, no seams, no outlines
    fans.forEach(function (pts) {
      pts.forEach(function (q, k) { var qx = X(q[0]), qy = Y(q[1]); R = Math.max(R, Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py))); if (k) x.lineTo(qx, qy); else x.moveTo(qx, qy); });
      x.closePath();
    });
    var g = x.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, rgba(c, (k0 || 0.26) * a)); g.addColorStop(0.35, rgba(c, 0.12 * a)); g.addColorStop(1, rgba(c, 0.015 * a));
    x.fillStyle = g; x.fill('nonzero');
  }
  function glow(x, px, py, R, c, a) {
    if (a <= 0.004) return;
    var g = x.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, rgba(c, 0.55 * a)); g.addColorStop(0.5, rgba(c, 0.24 * a)); g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.beginPath(); x.arc(px, py, R, 0, 6.2832); x.fill();
  }
  function pinMark(x, p, a, r) {   // a memory entry at its camera: a dot and its heading
    if (a <= 0.004) return;
    var px = X(p.x), py = Y(p.y), yr = -p.yaw * Math.PI / 180;
    r = r || 3.6;
    x.save(); x.globalAlpha = a; x.lineCap = 'round';
    x.strokeStyle = HOT[p.p]; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r + 5) * Math.cos(yr), py + (r + 5) * Math.sin(yr)); x.stroke();
    x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fillStyle = HOT[p.p]; x.fill(); x.lineWidth = 1.2; x.strokeStyle = '#fff'; x.stroke();
    x.restore();
  }
  function camMark(x, px, py, yaw, c, a) {   // a recorded camera: a small dot and its heading
    if (a <= 0.004) return;
    var yr = -yaw * Math.PI / 180;
    x.save(); x.globalAlpha = a; x.lineCap = 'round'; x.strokeStyle = HOT[c]; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + 8 * Math.cos(yr), py + 8 * Math.sin(yr)); x.stroke();
    x.beginPath(); x.arc(px, py, 2.4, 0, 6.2832); x.fillStyle = HOT[c]; x.fill(); x.restore();
  }
  // where k's stored memory covers the pixels i's recent frames miss: its 506 covering points (block n's read, all four
  // cameras) as one soft glow in map units, drawn once
  var OV = null;
  function overlap() {
    if (OV) return OV;
    var P = B.cvp, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, S = 1, R = 17, sx = 0, sy = 0;   // (one soft cloud)
    P.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); sx += q[0]; sy += q[1]; });
    x0 -= 2 * R; y0 -= 2 * R; x1 += 2 * R; y1 += 2 * R;
    var c = document.createElement('canvas'); c.width = Math.ceil((x1 - x0) * S); c.height = Math.ceil((y1 - y0) * S);
    var x = c.getContext('2d');
    P.forEach(function (q) {
      var px = (q[0] - x0) * S, py = (y1 - q[1]) * S, g = x.createRadialGradient(px, py, 0, px, py, R * S);
      g.addColorStop(0, rgba('k', 0.045)); g.addColorStop(0.5, rgba('k', 0.025)); g.addColorStop(1, rgba('k', 0));
      x.fillStyle = g; x.fillRect(px - R * S, py - R * S, 2 * R * S, 2 * R * S);
    });
    OV = { c: c, x0: x0, y1: y1, w: x1 - x0, h: y1 - y0, cen: [sx / P.length, sy / P.length] };
    return OV;
  }
  function drawOverlap(x, a) {   // returns its centre (map pixels), where the figure's Coverage points to
    if (a <= 0.004) return null;
    var o = overlap();
    x.save(); x.globalAlpha = Math.min(1, a); x.drawImage(o.c, X(o.x0), Y(o.y1), o.w * M.s, o.h * M.s); x.restore();
    return [X(o.cen[0]) - 8, Y(o.cen[1]) - 8, 16, 16];
  }
  function turnPose(s) {   // the map pose of the turn (the recorded ticks from frame 416 to frame 428, s 0..SEND)
    var p = poseAt(s); return [p[0], p[1], p[3]];
  }
  // The turn: the view and i on the map follow block n's recorded cameras (the given player state of block n), ticks
  // 1664-1712 = frames 416-428: the walk to the doorway (s 0-40, frames 416-426) briskly, then the turn to the door (s
  // 40-48, frames 426-428, yaw -39 to -71) over a second, ending in block n's camera of frame 428. Monotone cubic through
  // the knots [time, s].
  var TURN = [9.0, 11.0], TK = [[0, 0], [0.95, 40], [2.0, 48]];
  var TKM = (function () {   // Fritsch-Carlson tangents, zero at both ends
    var d = [], m = [0];
    for (var k = 0; k < TK.length - 1; k++) d.push((TK[k + 1][1] - TK[k][1]) / (TK[k + 1][0] - TK[k][0]));
    for (k = 1; k < TK.length - 1; k++) {
      var g = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2, a = g / d[k - 1], b = g / d[k], q = a * a + b * b;
      m.push(q > 9 ? g * 3 / Math.sqrt(q) : g);
    }
    m.push(0);
    return m;
  })();
  function turnS(t, still) {
    if (still) return SEND;
    var u = t - TURN[0];
    if (u <= 0) return 0;
    if (u >= TK[TK.length - 1][0]) return SEND;
    var k = 0; while (u > TK[k + 1][0]) k++;
    var h = TK[k + 1][0] - TK[k][0], w = (u - TK[k][0]) / h, w2 = w * w, w3 = w2 * w;
    return (2 * w3 - 3 * w2 + 1) * TK[k][1] + (w3 - 2 * w2 + w) * h * TKM[k] + (-2 * w3 + 3 * w2) * TK[k + 1][1] + (w3 - w2) * h * TKM[k + 1];
  }
  // client i on the map: its recorded positions (the world clock), except that from the turn on it walks with block n's
  // recorded cameras to the doorway (frame 428) and stays there until the world clock, in Generate, reaches it
  function pwI(t, still) {
    if (still) return 416.5 + SEND / 4;
    var p = seg(WK, t).p;
    return t < TURN[0] ? p : Math.max(p, 416.5 + turnS(t) / 4);
  }
  function drawMap(t, still) {
    var x = mx, W = M.W, H = M.H, sm = W < 480;
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
    x.fillStyle = '#e3e7ee'; x.fillRect(0, 0, W, H);
    cam(t, still);
    var mi = IM[D.map.img];
    if (ok(mi)) { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(mi, X(D.map.x0), Y(D.map.y1), D.map.w * M.s, D.map.h * M.s); }
    var pw = still ? 416.5 : seg(WK, t).p, pwi = pwI(t, still), u = M.s;
    var dyn = still ? 1 : Math.min(sstep(0, 0.3, t), 1 - sstep(T - 0.45, T - 0.02, t));
    var P = {}; ROLES.forEach(function (r) { P[r] = pos(r, r === 'i' ? pwi : pw); });
    // i walking and turning with block n's recorded cameras: exactly the view's camera
    var ts = turnS(t, still), onTurn = still || (t >= TURN[0] && pwi > pw + 1e-6);
    if (onTurn) { var tp = turnPose(ts); P.i = { x: tp[0], y: tp[1], yaw: tp[2] }; }
    ROLES.forEach(function (r) { P[r].px = X(P[r].x); P[r].py = Y(P[r].y); });
    MS.P = P;
    var kx = X(K69.x), ky = Y(K69.y), nx = X(N105.x), ny = Y(N105.y);
    MS.kPt = [kx, ky]; MS.nPt = [nx, ny];

    /* k's stored memory: what its cameras saw, from the doorway out, one soft area; brighter while it is made, while i's
       camera turns to it and while it is retrieved, and while block n shows that place; quiet in between */
    var kA = still ? 0.6 : dyn * envK(t, MAPFAN.ksaved) * (0.38 + 0.62 * Math.max(env(t, TSAVE - 0.1, 4.3, 0.3, 0.6), env(t, 9.9, 12.1, 0.6, 0.5), 0.35 * env(t, 12.1, 15.2, 0.3, 0.8), env(t, 18.55, 21.3, 0.4, 0.6)));   // (quieter under the overlap)
    seen(x, B.area[K69.id], K69.x, K69.y, 'k', kA);
    // scene state: k's camera while it generates the view through the doorway
    if (!still) camFan(x, P.k.px, P.k.py, P.k.yaw, 150 * u, 'k', dyn * envK(t, MAPFAN.kcam));
    // player state: i's camera while it walks in (what its recent frames see: the corridor, the room)
    if (!still) camFan(x, P.i.px, P.i.py, P.i.yaw, 170 * u, 'i', dyn * envK(t, MAPFAN.icam));
    // field: the camera of i's frame 416 (the view holds that frame and the field of its camera)
    if (!still) camFan(x, P.i.px, P.i.py, P.i.yaw, 150 * u, 'i', dyn * envK(t, MAPFAN.fcam));
    // missing pixels and retrieve: i with block n's cameras, from frame 416 to the doorway, turning to k's memory
    var ra = still ? 1 : envK(t, MAPFAN.iread);
    MS.fan = null;
    if (ra > 0) {
      // (stronger while it turns; in the Retrieve step its outline only, under k's memory and where it covers)
      var fo = still ? 1 : sstep(12.1, 12.55, t);
      camFan(x, P.i.px, P.i.py, P.i.yaw, 190 * u, 'i', ra * (1 - fo), still ? 1 : 1 + 0.45 * env(t, TURN[0] + 0.85, TURN[1], 0.3, 0.6));
      fanLine(x, P.i.px, P.i.py, P.i.yaw, 190 * u, 'i', ra * fo);
      MS.fan = [P.i.px, P.i.py];
    }
    // generate: i's camera at the doorway, turning with the frames of block n as they are shown
    if (!still) {
      var ga_ = dyn * envK(t, MAPFAN.igen);
      if (ga_ > 0) camFan(x, P.i.px, P.i.py, pos('i', shown(fr(seg(VK, t).p)) + 0.5).yaw, 190 * u, 'i', ga_);
    }
    // publish: what block n's entry saw
    if (!still) seen(x, B.area[N105.id], N105.x, N105.y, 'i', dyn * envK(t, MAPFAN.npub), 0.22);

    /* retrieve: where k's memory covers the pixels i's recent frames miss (all four of block n's cameras), at the doorway */
    var oa = still ? 0.7 : dyn * env(t, 12.1, 15.0, 0.6, 0.7) * (0.8 + 0.2 * Math.sin(Math.max(0, t - 12.1) * 5.2) * (1 - sstep(12.9, 13.3, t)));
    MS.ov = drawOverlap(x, oa);

    /* block n's four cameras (the recorded ones: this run is given the player states): while the field is splatted, while
       i walks with them, while k's entry is weighed against the read of all four and while the ray embedding reads them */
    var qa = still ? 0.9 : Math.max(env(t, 8.85, 11.25, 0.3, 0.4) * 0.7, env(t, 12.35, 13.1, 0.25, 0.4) * 0.8, env(t, 18.0, 18.6, 0.25, 0.35));
    MS.qbox = null;
    if (qa > 0) {
      var qb = [1e9, 1e9, -1e9, -1e9];
      B.query.forEach(function (c, m) {
        var a = qa * (still ? 1 : t < 9.5 ? sstep(8.9 + 0.08 * m, 9.1 + 0.08 * m, t) : t > 12 && t < 14 ? sstep(12.4 + 0.08 * m, 12.6 + 0.08 * m, t) : 1), px = X(c.x), py = Y(c.y);
        camMark(x, px, py, c.yaw, 'i', a);
        qb = [Math.min(qb[0], px), Math.min(qb[1], py), Math.max(qb[2], px), Math.max(qb[3], py)];
      });
      MS.qbox = [qb[0] - 10, qb[1] - 10, qb[2] - qb[0] + 20, qb[3] - qb[1] + 20];
    }
    glow(x, kx, ky, 20, 'k', still ? 0.7 : 0.8 * env(t, 14.7, 15.6, 0.3, 0.5));   // retrieved

    /* the memory entries: k's p00_s069 (from the step k writes it), block n's p01_s105 (from the step it is published) */
    var unz = still ? 1 : 1 - env(t, 22.6, 24.85, 0.35, 0.45);   // (k's marker and card give way to i's position, next to it)
    pinMark(x, K69, still ? 1 : dyn * unz * env(t, TSAVE, T, 0.15, 0.1), 3.8);
    pinMark(x, N105, still ? 0 : dyn * env(t, TPUB - 0.05, T, 0.2, 0.1), 3.8);

    /* the two clients: recorded positions, the last two seconds of their paths */
    ROLES.forEach(function (r) {
      if (still) return;
      x.lineCap = 'round'; x.lineWidth = 2;
      var pr = r === 'i' ? pwi : pw;
      for (var s = 0, n = 20; s < n; s++) {
        var qa0 = pos(r, pr - s * 1.5), qb0 = pos(r, pr - (s + 1) * 1.5);
        if (!s && r === 'i' && onTurn) qa0 = P.i;
        x.strokeStyle = rgba(r, 0.5 * dyn * Math.pow(1 - s / n, 1.5)); x.beginPath(); x.moveTo(X(qa0.x), Y(qa0.y)); x.lineTo(X(qb0.x), Y(qb0.y)); x.stroke();
      }
    });
    // i's marker takes a position: the estimate (Position); the position it publishes for block n+1, where the marker is
    // (Publish: frame 432's), as it reaches Player state O
    var ig = still ? 0 : Math.max(env(t, 24.4, 24.6, 0.2, 0.3), env(t, TPOS, TPOS + 0.15, 0.2, 0.45));
    ROLES.forEach(function (r) {
      var p = P[r], rd = 5.8;   // (the clients' markers keep their size in every step)
      p.rd = rd;
      if (r === 'i' && ig > 0) glow(x, p.px, p.py, rd * 3.4, 'i', 0.55 * ig * dyn);
      x.save(); x.globalAlpha = dyn; x.shadowColor = 'rgba(15,30,60,.3)'; x.shadowBlur = 5; x.shadowOffsetY = 1;
      x.beginPath(); x.arc(p.px, p.py, rd, 0, 6.2832); x.fillStyle = HOT[r]; x.fill(); x.restore();
      x.save(); x.globalAlpha = dyn; x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke();
      x.font = 'italic 700 15px ' + SERIF; x.textBaseline = 'middle'; x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.92)';
      var lx = p.px - rd * 0.72 - 11, ly = p.py - rd * 0.72 - 4; x.strokeText(r, lx, ly); x.fillStyle = HOT[r]; x.fillText(r, lx, ly); x.restore();
    });
    drawPos(x, t, still, P);
    // a client adds a published entry to its scene state in the step it is published: block n's (k)
    if (!still) {
      var q_ = (t - TPUB - 0.05) / 0.8;
      if (q_ >= 0 && q_ <= 1) ring(x, P.k.px, P.k.py, 7 + 11 * easeOut(q_), 'k', 0.6 * (1 - q_) * dyn, 1.5);
    }

    /* the cards: an entry's frame, with a stem to its pin */
    var cw = clamp(W * 0.12, 60, 96);
    MS.cw = cw;
    var kGlow = still ? 0 : Math.max(env(t, 14.7, 15.5, 0.3, 0.45), env(t, 20.1, 21.3, 0.3, 0.4));
    var thA = still ? 1 : env(t, TLAND - 0.1, T, 0.35, 0.1);   // (as k's entry lands in the bank)
    MS.kCard = thumb(x, spr('kv', K69.f), kx, ky, cw, 'k', thA * dyn * unz, 1, kGlow);
    MS.nCard = thumb(x, spr('i', N105.f), nx, ny, cw, 'i', still ? 0 : dyn * env(t, TPUB - 0.05, T, 0.3, 0.1), -1);

    /* the label: one at a time, each for about a second and a half */
    var kc = MS.kCard, kl = kc ? kc[1] + kc[3] + 27 : ky + 60, kxl = kc ? kc[0] + kc[2] / 2 : kx;
    if (!still) {
      tag(x, kxl, kl, [['memory entry of ', 0], ['k', 1]], 'k', envK(t, MAPLAB.savek), false, W, H);
      if (MS.fan) tag(x, MS.fan[0] - 12, MS.fan[1] + 34, [['block ', 0], ['n', 1]], 'i', envK(t, MAPLAB.turn), false, W, H, 'right');
      // (beside the card while the entry is fetched from the bank, when there is room; else under it)
      var rs = kc && kc[0] + kc[2] + 176 < W, rpart = sm ? [['retrieved', 0]] : [['retrieved for block ', 0], ['n', 1]];
      if (rs) tag(x, kc[0] + kc[2] + 8, kc[1] + kc[3] / 2 + 10, rpart, 'k', envK(t, MAPLAB.retr), false, W, H, 'left');
      else tag(x, kxl, kl, rpart, 'k', envK(t, MAPLAB.retr), false, W, H);
      // (under the card, clear of the table, which shows meanwhile the position i publishes)
      var nc = MS.nCard;
      MS.nLab = nc ? tag(x, nc[0] + nc[2] / 2, nc[1] + nc[3] + 27, [['memory entry of ', 0], ['i', 1]], 'i', envK(t, MAPLAB.pubi), false, W, H) : null;
    } else {
      tag(x, kxl, kl, sm ? [['retrieved', 0]] : [['retrieved for block ', 0], ['n', 1]], 'k', 1, false, W, H);
    }
  }

  /* ----- the state model's position of block n on the map (its readout of the generated frames; the run itself used the
     recorded positions and published none of these estimates). At the map's own scale (no zoom, the markers at their own
     size): the place head and the motion head come in where they are and merge into the estimate, drawn where it is
     (never snapped) as a small mark like theirs, with a thin ring of one body width (32 u) around it: i's recorded
     position lies inside the ring (16.0 u from the estimate, 0.50 body widths), and i's marker then takes it (a soft light
     on i's marker). The ring goes with the estimate; no second mark of i, no line. Each label beside its own mark, one at
     a time ----- */
  function headMark(x, px, py, r, a, cin) {   // a head's estimate: a small white mark ringed in i's colour; cin: coming in
    if (a <= 0.004) return;
    x.save(); x.globalAlpha = a;
    if (cin < 1) { x.beginPath(); x.arc(px, py, r + 16 * (1 - easeOut(cin)), 0, 6.2832); x.strokeStyle = rgba('i', 0.8 * (1 - cin)); x.lineWidth = 1.5; x.stroke(); }
    x.beginPath(); x.arc(px, py, r, 0, 6.2832);
    x.shadowColor = 'rgba(15,30,60,.35)'; x.shadowBlur = 4; x.fillStyle = '#fff'; x.fill(); x.shadowColor = 'transparent';
    x.lineWidth = 2; x.strokeStyle = HOT.i; x.stroke();
    x.beginPath(); x.arc(px, py, Math.max(1.4, r * 0.36), 0, 6.2832); x.fillStyle = HOT.i; x.fill();
    x.restore();
  }
  var POS_T = { place: 22.85, motion: 23.2, merge: [23.55, 23.9], est: [23.85, 24.65] };
  function drawPos(x, t, still, P) {
    MS.place = MS.motion = MS.est = null;
    if (still || !Q) return;
    var I = Q.i, W = M.W, H = M.H, sm = W < 480, hr = sm ? 3.6 : 4.4, PT_ = POS_T;
    // the place head, then the motion head's mark (the previous estimate moved by the motion head's step); the
    // complementary filter fuses them (constant 1/2): the two marks meet at the estimate
    var la = env(t, PT_.place, PT_.merge[1], 0.3, 0.1), ma = env(t, PT_.motion, PT_.merge[1], 0.3, 0.1), mu = easeIO((t - PT_.merge[0]) / (PT_.merge[1] - PT_.merge[0]));
    var PL = [X(I.place[0]), Y(I.place[1])], MO = [X(I.motion[0]), Y(I.motion[1])], ES = [X(I.est[0]), Y(I.est[1])];
    if (la > 0 || ma > 0) {
      var pl = [lerp(PL[0], ES[0], mu), lerp(PL[1], ES[1], mu)], mo = [lerp(MO[0], ES[0], mu), lerp(MO[1], ES[1], mu)];
      headMark(x, pl[0], pl[1], hr, la, sstep(PT_.place, PT_.place + 0.35, t));
      headMark(x, mo[0], mo[1], hr, ma, sstep(PT_.motion, PT_.motion + 0.35, t));
      MS.place = la > 0 ? [pl[0] - 7, pl[1] - 7, 14, 14] : null; MS.motion = ma > 0 ? [mo[0] - 7, mo[1] - 7, 14, 14] : null;
      tag(x, PL[0] + 9, PL[1] + 11, [[sm ? 'place' : 'place head', 0]], 'i', envK(t, MAPLAB.place), false, W, H, 'left');
      tag(x, MO[0] - 9, MO[1] + 11, [[sm ? 'motion' : 'motion head', 0]], 'i', envK(t, MAPLAB.motion), false, W, H, 'right');
    }
    // the estimate: a small mark where it is, and a thin ring of one body width around it (it opens out of the fused
    // mark); i's marker inside it; gone before Store i
    var ea = env(t, PT_.est[0], PT_.est[1], 0.1, 0.25);
    if (ea > 0) {
      var er = lerp(hr + 1, RING_R * M.s, easeOut(sstep(PT_.est[0], PT_.est[0] + 0.3, t)));
      x.save(); x.globalAlpha = ea;
      x.beginPath(); x.arc(ES[0], ES[1], er, 0, 6.2832);
      x.lineWidth = 2.6; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
      x.lineWidth = 1.2; x.strokeStyle = HOT.i; x.stroke();
      x.restore();
      headMark(x, ES[0], ES[1], hr, ea, 1);
      MS.est = [ES[0] - er, ES[1] - er, 2 * er, 2 * er];
      tag(x, ES[0], ES[1] + er + 27, [['estimate', 0]], 'i', envK(t, MAPLAB.est), false, W, H);
    }
  }
  /* ----- the clients' views ----- */
  function frameRect(x, q, r, a, c, noise, rad) {
    if (a <= 0.004) return;
    x.save(); x.globalAlpha = a;
    x.save(); roundRect(x, r[0], r[1], r[2], r[3], rad == null ? 2.5 : rad); x.clip();
    if (noise) x.drawImage(NOISE, r[0], r[1], r[2], r[3]); else if (!drawCover(x, q, r[0], r[1], r[2], r[3])) { x.fillStyle = '#1c1c1e'; x.fillRect(r[0], r[1], r[2], r[3]); }
    x.restore();
    if (c) { roundRect(x, r[0] - 0.5, r[1] - 0.5, r[2] + 1, r[3] + 1, (rad == null ? 2.5 : rad) + 0.5); x.strokeStyle = rgba(c, 0.95); x.lineWidth = 1.3; x.stroke(); }
    x.restore();
  }
  function bracket(x, cx, y0, y1, w) {
    var l = Math.min(w, y1 - y0) * 0.28, x0 = cx - w / 2, x1 = cx + w / 2;
    x.beginPath();
    x.moveTo(x0, y0 + l); x.lineTo(x0, y0); x.lineTo(x0 + l, y0); x.moveTo(x1 - l, y0); x.lineTo(x1, y0); x.lineTo(x1, y0 + l);
    x.moveTo(x1, y1 - l); x.lineTo(x1, y1); x.lineTo(x1 - l, y1); x.moveTo(x0 + l, y1); x.lineTo(x0, y1); x.lineTo(x0, y1 - l);
  }
  function kMark(x, f, a, sx, sy) {   // k where the recorded positions put it in i's view, when the labels mark it visible
    var K = D.kin, j = f - F0;
    if (a <= 0.004 || j < 0 || j > F1 - F0 || K.vis.charAt(j) !== '1') return null;
    var hy = K.hy[j] * sy, fy = K.fy[j] * sy, cx = (K.hx[j] + K.fx[j]) / 2 * sx, hgt = fy - hy, w = Math.max(hgt * 0.5, 14), y0 = hy - hgt * 0.08, y1 = Math.min(fy + hgt * 0.04, V.H + 40);
    // only while most of k is inside the view
    var inX = Math.max(0, Math.min(V.W, cx + w / 2) - Math.max(0, cx - w / 2)), inY = Math.max(0, Math.min(V.H, y1) - Math.max(0, y0));
    if (inX * inY < 0.5 * w * (y1 - y0)) return null;
    x.save(); x.globalAlpha = a; x.lineWidth = 2; x.strokeStyle = HOT.k; x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 4; bracket(x, cx, y0, y1, w); x.stroke(); x.restore();
    letter(x, cx, Math.max(13, y0 - 15), 'k', 'k', a, 9.5);
    return [cx - w / 2, y0, w, y1 - y0];
  }
  // the player state field over the frame of its camera (FREC[0]: frame 416, which the view holds): the token grid, and
  // k's splat, on k
  function drawField(x, a, la) {   // la: its letter (k), once the bracket's letter has gone
    if (a <= 0.004) return;
    var w = FREC[0], cw = V.W / 21, ch = V.H / 12;
    x.save(); x.globalAlpha = a;
    x.fillStyle = 'rgba(11,11,13,.3)'; x.fillRect(0, 0, V.W, V.H);
    x.strokeStyle = 'rgba(255,255,255,.26)'; x.lineWidth = 1; x.beginPath();
    for (var r = 1; r < 12; r++) { x.moveTo(0, r * ch); x.lineTo(V.W, r * ch); }
    for (var c = 1; c < 21; c++) { x.moveTo(c * cw, 0); x.lineTo(c * cw, V.H); }
    x.stroke();
    var bx = [1e9, 1e9, -1e9, -1e9];
    for (var k = 0; k < 252; k++) {
      if (w[k] < 0.03) continue;
      var cc = k % 21, rr = Math.floor(k / 21);
      x.fillStyle = rgba('k', 0.2 + 0.62 * Math.min(1, w[k]));
      roundRect(x, cc * cw + 1.5, rr * ch + 1.5, cw - 3, ch - 3, 3); x.fill();
      bx[0] = Math.min(bx[0], cc * cw); bx[1] = Math.min(bx[1], rr * ch); bx[2] = Math.max(bx[2], (cc + 1) * cw); bx[3] = Math.max(bx[3], (rr + 1) * ch);
    }
    x.restore();
    var q = w.q;
    letter(x, q.u * cw, Math.max(13, bx[1] - 14), 'k', 'k', a * la, 9.5);
    V.fieldBox = [bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]];
  }
  // Block n's read, exactly, in the figure's own Missing pixels slot: block n's camera of frame 428 (the third of its four,
  // yaw -71: i turned to the door; D.fill), one cell of the read = 16x16 px of fill428.webp. i's layer (its recent frames
  // 369-416 warped into that camera) is opaque exactly in the cells the recent points reach; the cells no point reaches are
  // the missing pixels, dark (lit in i's colour for a moment when the slot appears). Once k's entry is retrieved, the
  // missing cells it covers take k's layer (k's own frames 273-288 warped into the same camera), cell by cell from the left,
  // under a veil of k's colour so that they read as k's at the slot's size. Nothing is drawn in a missing cell k does not
  // cover. The composite is made at CS px per cell (each the mean of 4x4 px of fill428.webp, inside one cell: F4), 1:1 with
  // no smoothing, and drawn into the slot at the screen's own pixels without smoothing: every screen pixel of the slot
  // shows the one cell it lies in, nothing of its neighbours (sharp at any size).
  var HOLE = '#0b0b0d', KVEIL = 0.45, CS = 4;
  var MARKT = 11.55, FILLT = [13.5, 14.45];   // (the fill: as k's points land in the view, PT.land)
  var COVMAX = 14.45;   // k's coverage complete: marked as the most, and retrieved
  var REV = new Float32Array(1008);   // how far each covered cell has been filled (0..1)
  function fillImg() { var im = IM[FILL.img]; return ok(im) ? im : null; }
  var F4 = null;   // fill428.webp at CS px per cell: the mean of each 4x4 px (both layers; alpha is 0 or 255 per cell)
  function fill4() {
    if (F4) return F4;
    var im = fillImg();
    if (!im) return null;
    var W0 = im.naturalWidth, H0 = im.naturalHeight, f = FILL.cell / CS, w = W0 / f, h = H0 / f;
    var c = document.createElement('canvas'); c.width = W0; c.height = H0;
    var cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0);
    var a = cx.getImageData(0, 0, W0, H0).data, o = document.createElement('canvas'); o.width = w; o.height = h;
    var ox = o.getContext('2d'), out = ox.createImageData(w, h), d = out.data, n2 = f * f;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var r = 0, g = 0, b = 0, al = 0;
      for (var yy = y * f; yy < y * f + f; yy++) for (var xx = x * f; xx < x * f + f; xx++) { var k = (yy * W0 + xx) * 4; r += a[k]; g += a[k + 1]; b += a[k + 2]; al += a[k + 3]; }
      var j = (y * w + x) * 4; d[j] = Math.round(r / n2); d[j + 1] = Math.round(g / n2); d[j + 2] = Math.round(b / n2); d[j + 3] = Math.round(al / n2);
    }
    ox.putImageData(out, 0, 0);
    return (F4 = o);
  }
  // the covered cells' fill at story time t: REV (opacity of k's pixels in each), REV.frac (the share of the covered cells
  // filled: k's coverage bar grows with it), and the key of that state
  function reveal(t, still) {
    var key = still || t >= FILLT[1] + 0.05 ? 'all' : t < FILLT[0] ? 'none' : t.toFixed(3);
    if (key === REV.key) return key;
    REV.key = key;
    var sum = 0;
    for (var n = 0; n < CC.length; n++) {
      var q = CC[n], tf = PT ? PT.land[q.k] : FILLT[0] + q.f * (FILLT[1] - FILLT[0] - 0.3);
      REV[q.k] = key === 'all' ? 1 : key === 'none' ? 0 : sstep(tf, tf + 0.3, t);
      sum += REV[q.k];
    }
    REV.frac = CC.length ? sum / CC.length : 0;
    return key;
  }
  function missMark(t) { return env(t, MARKT, MARKT + 0.12, 0.12, 0.85); }   // the holes, lit in i's colour when marked
  var MW = FILL.w / FILL.cell * CS, MH = FILL.h / FILL.cell * CS;
  var MC = document.createElement('canvas'); MC.width = MW; MC.height = MH;
  var MKEY = '';
  function missComp(t, still) {
    var im = fill4();
    if (!im) return null;
    var rk = reveal(t, still), mk_ = still ? 0 : missMark(t), key = rk + '|' + mk_.toFixed(2);
    if (key === MKEY) return MC;
    MKEY = key;
    var x = MC.getContext('2d'), cs = CS, n, q, lk = FILL.lk[0] / FILL.cell * CS, li = FILL.li[0] / FILL.cell * CS;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    x.fillStyle = HOLE; x.fillRect(0, 0, MW, MH);
    x.drawImage(im, li, 0, MW, MH, 0, 0, MW, MH);   // i's layer (opaque exactly in the reached cells)
    if (mk_ > 0.004) { x.fillStyle = rgba('i', 0.55 * mk_); for (n = 0; n < MQ.mc.length; n++) { q = MQ.mc[n]; x.fillRect(q.c * cs, q.r * cs, cs, cs); } }
    x.fillStyle = rgba('k', KVEIL);
    for (n = 0; n < CC.length; n++) {
      q = CC[n]; var a = REV[q.k];
      if (a <= 0.002) continue;
      x.globalAlpha = a; x.drawImage(im, lk + q.c * cs, q.r * cs, cs, cs, q.c * cs, q.r * cs, cs, cs);
      x.fillRect(q.c * cs, q.r * cs, cs, cs);
    }
    x.globalAlpha = 1;
    return MC;
  }
  // ---------------------------------------------------------------- the point view (Missing pixels, Retrieve)
  // The read of block n as the run makes it (points.js; media.json points_source): the recent latents' points, one per
  // 16x16-px cell (its axial depth along its cell's ray from its camera), each drawn as its 2x2 sub-cells at that depth, in
  // their own colours; and the points of k's entry that land, in block n's camera of frame 428, in the cells it covers.
  // Seen from the recorded cameras of the walk and the turn (TN.poses 0-48), ending in that camera; there the cells no
  // recent point reaches (the read's mask, camera 428) are drawn empty, and k's points are drawn only inside the cells the
  // entry covers (the same mask, per pixel). WebGL: round sprites with a soft glow, sorted far to near every frame; a 2D
  // canvas where WebGL is not available.
  // (i's points: on, lift0, liftStep, liftDur; the holes; k's: klift, kspread, kdur, each point lifted out of its own
  // camera along its ray, as i's are; they settle into their own colours; off: the point view gives way)
  var PV = { on: 8.3, lift0: 8.45, liftStep: 0.045, liftDur: 0.62, hole: [11.05, 11.8], cov: [13.1, 13.5],
    klift: 12.95, kspread: 0.55, kdur: 0.6, settle: 0.3, off: 16.1 };
  var PW = null, PT = null, O3 = [0, 0, 0], SZ = 0.64, KRGB = RGB.k.map(function (v) { return v / 255; });
  function b64(s) { var b = atob(s), o = new Uint8Array(b.length); for (var k = 0; k < b.length; k++) o[k] = b.charCodeAt(k); return o; }
  function holeAt(q) { return clamp((q % 42) / 41 * 0.5 + 0.12 * hash(q + 17 * CAM), 0, 0.62); }   // when each hole opens (0..0.62)
  function camOf(p) {   // a recorded camera [x, y, z, yaw, pitch] -> eye (from O3) and the columns right, down, forward (the run's c2w)
    var yr = p[3] * Math.PI / 180, pr = p[4] * Math.PI / 180, cp = Math.cos(pr);
    var f = [Math.cos(yr) * cp, Math.sin(yr) * cp, -Math.sin(pr)], n = Math.sqrt(f[1] * f[1] + f[0] * f[0]) + 1e-9;
    var r = [f[1] / n, -f[0] / n, 0], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    return { e: [p[0] - O3[0], p[1] - O3[1], p[2] + 64 - O3[2]], r: r, d: [-u[0], -u[1], -u[2]], f: f };
  }
  function proj3(cm, X, Y, Z) {   // -> [u, v, z]: u, v in [-1, 1] (right, down), z axial
    var dx = X - cm.e[0], dy = Y - cm.e[1], dz = Z - cm.e[2], z = dx * cm.f[0] + dy * cm.f[1] + dz * cm.f[2], zs = z > 1 ? z : 1;
    return [(dx * cm.r[0] + dy * cm.r[1] + dz * cm.r[2]) / (zs * PW.tan[0]), (dx * cm.d[0] + dy * cm.d[1] + dz * cm.d[2]) / (zs * PW.tan[1]), z];
  }
  // a group of points (i's or k's): per sprite (the point's sub-cells and the point itself, at its cell's centre, in the
  // mean colour of its cell: every point is drawn where the read has it) its position, the eye it is lifted from, its
  // colour and [footprint (a sub-cell's width at its depth), the moment it appears (i) or lands (k: it leaves its camera
  // PV.kdur before), 0, 0]; per point its centre
  function pointsOf(g, isK) {
    var sub = PW.sub, S2 = sub * sub + 1, n = g.n, fr_ = b64(g.f), cb = b64(g.c), db = b64(g.d), rgb = b64(g.rgb);
    var c16 = new Uint16Array(cb.buffer, 0, n), d32 = new Float32Array(db.buffer, 0, n), th = PW.tan[0], tv = PW.tan[1];
    var N = n * S2, P = new Float32Array(3 * N), E = new Float32Array(3 * N), C = new Float32Array(3 * N), Mt = new Float32Array(4 * N);
    var ctr = new Float64Array(3 * n), del = new Float32Array(n), k, a, b;
    for (k = 0; k < n; k++) {
      var cm = g.cams[fr_[k]], col = c16[k] % 42, row = (c16[k] / 42) | 0, d = d32[k];
      var ex = cm[0] - O3[0], ey = cm[1] - O3[1], ez = cm[2] - O3[2], xc = (col + 0.5) / 21 - 1, yc = (row + 0.5) / 12 - 1;
      ctr[3 * k] = ex + d * (xc * th * cm[3] + yc * tv * cm[6] + cm[9]);
      ctr[3 * k + 1] = ey + d * (xc * th * cm[4] + yc * tv * cm[7] + cm[10]);
      ctr[3 * k + 2] = ez + d * (xc * th * cm[5] + yc * tv * cm[8] + cm[11]);
      // i: frame 416's points are there from the start, the older frames' stream out along their rays, the newest first;
      // k: each point leaves its own camera (the entry's, from the bank) at del and lands at its depth at del + kdur (by
      // frame, 276 first, and a little at random)
      var dl = isK ? PV.klift + PV.kspread * clamp(0.17 * fr_[k] + 0.49 * hash(k * 3.1 + 7), 0, 1)
        : fr_[k] === 11 ? PV.on - 1 : PV.lift0 + PV.liftStep * (10 - fr_[k]);
      del[k] = dl;
      var fp = d * th * 2 / 42 / sub;
      for (a = 0; a < sub; a++) for (b = 0; b < sub; b++) {
        var j = k * S2 + a * sub + b, x = (col + (b + 0.5) / sub) / 21 - 1, y = (row + (a + 0.5) / sub) / 12 - 1;
        P[3 * j] = ex + d * (x * th * cm[3] + y * tv * cm[6] + cm[9]);
        P[3 * j + 1] = ey + d * (x * th * cm[4] + y * tv * cm[7] + cm[10]);
        P[3 * j + 2] = ez + d * (x * th * cm[5] + y * tv * cm[8] + cm[11]);
        E[3 * j] = ex; E[3 * j + 1] = ey; E[3 * j + 2] = ez;
        C[3 * j] = rgb[3 * j] / 255; C[3 * j + 1] = rgb[3 * j + 1] / 255; C[3 * j + 2] = rgb[3 * j + 2] / 255;
        Mt[4 * j] = fp; Mt[4 * j + 1] = isK ? dl + PV.kdur : dl;
      }
      var jc = k * S2 + S2 - 1, j0 = k * S2;   // (the point itself)
      P[3 * jc] = ctr[3 * k]; P[3 * jc + 1] = ctr[3 * k + 1]; P[3 * jc + 2] = ctr[3 * k + 2];
      E[3 * jc] = ex; E[3 * jc + 1] = ey; E[3 * jc + 2] = ez;
      for (a = 0; a < 3; a++) { var sm_ = 0; for (b = 0; b < S2 - 1; b++) sm_ += C[3 * (j0 + b) + a]; C[3 * jc + a] = sm_ / (S2 - 1); }
      Mt[4 * jc] = fp; Mt[4 * jc + 1] = Mt[4 * j0 + 1];
    }
    return { n: n, N: N, S2: S2, P: P, E: E, C: C, M: Mt, ctr: ctr, f: fr_, c: c16, del: del, z: new Float64Array(n), ord: [], idx: new Uint16Array(N), key: '' };
  }
  function loadPts() {
    var W_ = (window.WC_DATA || {}).f3cpts;
    if (!W_ || PT) return !!PT;
    PW = W_;
    var e416 = W_.i.cams[11]; O3 = [e416[0], e416[1], e416[2]];
    PT = { i: pointsOf(W_.i, false), k: pointsOf(W_.k, true) };
    // camera 428: where each of k's points lands (view units), its cell size there, and the moment k's first point lands
    // in each covered cell
    var K = PT.k, c428 = camOf(TN.poses[TN.qi[CAM]]);
    K.uv = new Float32Array(2 * K.n); K.cz = new Float32Array(K.n); PT.land = new Float32Array(1008).fill(1e9);
    for (var k = 0; k < K.n; k++) {
      var q = proj3(c428, K.ctr[3 * k], K.ctr[3 * k + 1], K.ctr[3 * k + 2]), cl = clamp(Math.floor((q[1] + 1) * 12), 0, 23) * 42 + clamp(Math.floor((q[0] + 1) * 21), 0, 41);
      K.uv[2 * k] = q[0]; K.uv[2 * k + 1] = q[1]; K.cz[k] = q[2];
      PT.land[cl] = Math.min(PT.land[cl], K.del[k] + PV.kdur);
    }
    // the mask of camera 428 (42 x 24): r missing, g covered, b the moment the hole opens
    var m = new Uint8Array(1008 * 4);
    for (var c = 0; c < 1008; c++) { m[4 * c] = MQ.miss[c] ? 255 : 0; m[4 * c + 1] = MQ.cov[c] ? 255 : 0; m[4 * c + 2] = Math.round(255 * holeAt(c)); m[4 * c + 3] = 255; }
    PT.mask = m;
    return true;
  }
  var ptsWait = [];
  function ptsLoad(cb) {   // points.js, loaded once when the figure comes near the screen
    if (loadPts()) { cb(); return; }
    ptsWait.push(cb);
    if (ptsWait.length > 1) return;
    var s = document.createElement('script'); s.src = BASE + PTS.js; s.async = true;
    s.onload = function () { if (loadPts()) ptsWait.splice(0).forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  }
  // the camera of the moment: frame 416's until the turn, then the walk and the turn (TN.poses), then block n's of frame 428
  function pvCam(t, still) { return camOf(poseAt(turnS(t, still))); }
  function sortGrp(G, cm) {   // far to near, as seen from cm (by the points' centres)
    var key = cm.e.join(',') + '|' + cm.f.join(',');
    if (G.key === key) return false;
    G.key = key;
    var n = G.n, z = G.z, ord = G.ord, k, s;
    if (ord.length !== n) { ord = G.ord = []; for (k = 0; k < n; k++) ord.push(k); }
    for (k = 0; k < n; k++) { var q = 3 * k; z[k] = (G.ctr[q] - cm.e[0]) * cm.f[0] + (G.ctr[q + 1] - cm.e[1]) * cm.f[1] + (G.ctr[q + 2] - cm.e[2]) * cm.f[2]; }
    ord.sort(function (a, b) { return z[b] - z[a]; });
    var S2 = G.S2, idx = G.idx, j = 0;
    for (k = 0; k < n; k++) { var b0 = ord[k] * S2; for (s = 0; s < S2; s++) idx[j++] = b0 + s; }
    return true;
  }
  var PV_VS = 'attribute vec3 a_p;attribute vec3 a_e;attribute vec3 a_c;attribute vec4 a_m;' +
    'uniform vec3 u_eye,u_r,u_d,u_f,u_kc;uniform vec2 u_tan,u_px;uniform float u_t,u_ld,u_kd,u_sz,u_mn,u_mx,u_a,u_k,u_set;varying vec4 v_c;varying float v_g;varying float v_fl;' +
    'void main(){float lam=u_k>0.5?clamp((u_t-a_m.y+u_kd)/u_kd,0.0,1.0):clamp((u_t-a_m.y)/u_ld,0.0,1.0);float st=1.0-lam;lam=1.0-st*st*st;' +
    'vec3 q=mix(a_e,a_p,lam)-u_eye;float z=dot(q,u_f);' +
    'if(z<2.0){gl_Position=vec4(2.0,2.0,2.0,1.0);gl_PointSize=0.0;v_c=vec4(0.0);v_g=0.0;return;}' +
    'gl_Position=vec4(dot(q,u_r)/(z*u_tan.x),-dot(q,u_d)/(z*u_tan.y),0.0,1.0);' +
    'float s=a_m.x/z*(u_px.x*0.5/u_tan.x);gl_PointSize=clamp(s*u_sz,u_mn,u_mx);' +   // (the sub-cell's size there; at least half a cell of the read, at most one)
    'vec3 c=a_c*1.06*mix(1.0,0.62,smoothstep(120.0,900.0,z));float a=u_a;float g=1.0;' +   // (far points a little darker)
    // (k: in flight from its camera it is not held to the mask; landed, it is drawn only in the cells the entry covers)
    'if(u_k>0.5){a*=smoothstep(a_m.y-u_kd,a_m.y-u_kd+0.08,u_t);float sv=smoothstep(a_m.y+u_set,a_m.y+u_set+0.45,u_t);c=mix(u_kc,c,sv);g=(1.0-sv)*(1.0-smoothstep(a_m.y,a_m.y+0.5,u_t)*0.6)*(1.0-0.45*st);a*=1.0-0.25*st;v_fl=st;}' +
    'else{a*=smoothstep(a_m.y,a_m.y+0.1,u_t);c=mix(c,vec3(1.0),0.35*st);g=0.35+2.5*st;v_fl=0.0;}' +   // (streaming: brighter)
    'v_c=vec4(clamp(c,0.0,1.0),a);v_g=g;}';
  // (the fragment shader has uniforms of its own: a uniform shared with the vertex shader must have the same precision)
  var PV_FS = 'precision mediump float;varying vec4 v_c;varying float v_g;varying float v_fl;uniform sampler2D u_mask;uniform vec2 u_fpx;uniform float u_hole,u_fk,u_glow;' +
    'void main(){vec2 d=gl_PointCoord*2.0-1.0;float r2=dot(d,d);if(r2>1.0)discard;' +
    'vec4 m=texture2D(u_mask,vec2(gl_FragCoord.x/u_fpx.x,1.0-gl_FragCoord.y/u_fpx.y));float a=v_c.a;' +
    'if(u_fk>0.5){if(v_fl<0.02&&m.g<0.5)discard;}else{a*=1.0-m.r*clamp((u_hole-m.b)/0.18,0.0,1.0);}' +
    'vec3 c=v_c.rgb;if(u_glow>0.0){a*=u_glow*v_g*exp(-r2*4.0)*(1.0-r2);}else{a*=1.0-smoothstep(0.8,1.0,r2);c*=1.0+0.14*(1.0-r2);}' +
    'gl_FragColor=vec4(c*a,a);}';
  var GLV = null;
  function pvGL() {
    if (GLV) return GLV.ok ? GLV : null;
    GLV = { ok: false };
    if (!PT) { GLV = null; return null; }
    try {
      var c = document.createElement('canvas'); c.className = 'f3c-pv'; c.setAttribute('aria-hidden', 'true'); c.style.opacity = '0';
      // (reduced motion: drawn once, kept)
      var g = c.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: !motion });
      if (!g) return null;
      var sh = function (type, src) { var s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; };
      var pr = g.createProgram(); g.attachShader(pr, sh(g.VERTEX_SHADER, PV_VS)); g.attachShader(pr, sh(g.FRAGMENT_SHADER, PV_FS)); g.linkProgram(pr);
      if (!g.getProgramParameter(pr, g.LINK_STATUS)) throw new Error('link');
      var u = {}, at = {};
      ['u_eye', 'u_r', 'u_d', 'u_f', 'u_kc', 'u_tan', 'u_px', 'u_t', 'u_ld', 'u_kd', 'u_sz', 'u_mn', 'u_mx', 'u_a', 'u_k', 'u_set', 'u_mask', 'u_hole', 'u_glow', 'u_fk', 'u_fpx'].forEach(function (n) { u[n] = g.getUniformLocation(pr, n); });
      ['a_p', 'a_e', 'a_c', 'a_m'].forEach(function (n) { at[n] = g.getAttribLocation(pr, n); });
      var buf = function (arr) { var b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, arr, g.STATIC_DRAW); return b; };
      var grp = {};
      ['i', 'k'].forEach(function (w) {
        var G_ = PT[w];
        grp[w] = { p: buf(G_.P), e: buf(G_.E), c: buf(G_.C), m: buf(G_.M), ix: g.createBuffer(), n: G_.N, up: '' };
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, grp[w].ix); g.bufferData(g.ELEMENT_ARRAY_BUFFER, G_.idx.byteLength, g.DYNAMIC_DRAW);
      });
      var tx = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tx);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 42, 24, 0, g.RGBA, g.UNSIGNED_BYTE, PT.mask);
      c.addEventListener('webglcontextlost', function (e) { e.preventDefault(); GLV.ok = false; setOp(c, 0); });
      viewBox.insertBefore(c, viewCv);
      GLV = { ok: true, c: c, g: g, pr: pr, u: u, at: at, grp: grp, tx: tx };
      return GLV;
    } catch (e) { if (window.console) console.warn('fig3case: WebGL points', e); GLV = { ok: false }; return null; }
  }
  // the view's points by WebGL at loop time t (still: the end state); returns false without WebGL
  function pvGLDraw(t, still, cm, A) {
    var G_ = pvGL();
    if (!G_) return false;
    var g = G_.g, c = G_.c, w = Math.max(1, Math.round(V.W * DPR)), h = Math.max(1, Math.round(V.H * DPR)), u = G_.u, at = G_.at;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    setOp(c, A);
    g.viewport(0, 0, w, h); g.clearColor(11 / 255, 11 / 255, 13 / 255, 1); g.clear(g.COLOR_BUFFER_BIT);
    g.useProgram(G_.pr);
    g.uniform3f(u.u_eye, cm.e[0], cm.e[1], cm.e[2]); g.uniform3f(u.u_r, cm.r[0], cm.r[1], cm.r[2]); g.uniform3f(u.u_d, cm.d[0], cm.d[1], cm.d[2]); g.uniform3f(u.u_f, cm.f[0], cm.f[1], cm.f[2]);
    g.uniform3f(u.u_kc, KRGB[0], KRGB[1], KRGB[2]); g.uniform2f(u.u_tan, PW.tan[0], PW.tan[1]); g.uniform2f(u.u_px, w, h); g.uniform2f(u.u_fpx, w, h);
    g.uniform1f(u.u_t, still ? 1e4 : t); g.uniform1f(u.u_ld, PV.liftDur); g.uniform1f(u.u_kd, PV.kdur); g.uniform1f(u.u_a, 1); g.uniform1f(u.u_set, PV.settle);
    g.uniform1f(u.u_hole, still ? 9 : Math.max(0, (t - PV.hole[0]) / (PV.hole[1] - PV.hole[0]) * 0.8));
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, G_.tx); g.uniform1i(u.u_mask, 0);
    g.enable(g.BLEND);
    var groups = still || t >= PV.klift ? ['i', 'k'] : ['i'];
    groups.forEach(function (w_) {   // (sorted far to near from this camera)
      var Gp = PT[w_], o = G_.grp[w_];
      sortGrp(Gp, cm);
      if (o.up !== Gp.key) { o.up = Gp.key; g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, o.ix); g.bufferSubData(g.ELEMENT_ARRAY_BUFFER, 0, Gp.idx); }
    });
    var bind = function (o) {
      [['a_p', o.p, 3], ['a_e', o.e, 3], ['a_c', o.c, 3], ['a_m', o.m, 4]].forEach(function (q) { g.bindBuffer(g.ARRAY_BUFFER, q[1]); g.enableVertexAttribArray(at[q[0]]); g.vertexAttribPointer(at[q[0]], q[2], g.FLOAT, false, 0, 0); });
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, o.ix);
    };
    // the points, then their glow (added on top: soft light around each, stronger for k's as they land)
    var cell = w / 42;   // (a cell of the read, in device px)
    [[0, SZ, g.ONE_MINUS_SRC_ALPHA, cell * 0.3, cell * 0.9], [1, SZ * 2.6, g.ONE, cell * 0.8, cell * 2.3]].forEach(function (ps) {
      g.blendFunc(g.ONE, ps[2]); g.uniform1f(u.u_sz, ps[1]); g.uniform1f(u.u_mn, ps[3]); g.uniform1f(u.u_mx, ps[4]);
      groups.forEach(function (w_) {
        var o = G_.grp[w_], isK = w_ === 'k';
        g.uniform1f(u.u_k, isK ? 1 : 0); g.uniform1f(u.u_fk, isK ? 1 : 0);
        g.uniform1f(u.u_mn, isK && !ps[0] ? cell * 0.5 : ps[3]);   // (k's points, mostly far outside the door, fill their cells)
        g.uniform1f(u.u_glow, ps[0] ? (isK ? 0.28 : 0.12) : 0);
        if (ps[0] && !isK && V.W < 480) return;   // (phones: i's points without their glow)
        bind(o); g.drawElements(g.POINTS, o.n, g.UNSIGNED_SHORT, 0);
      });
    });
    return true;
  }
  // without WebGL: the same points on the 2D canvas, as small squares, sorted far to near; in camera 428 the holes are
  // painted over i's points cell by cell, and k's points, once landed, are clipped to the cells its entry covers (exact per
  // cell; in flight out of k's cameras they are not)
  function pv2D(x, W, H, t, still, cm, A) {
    x.save(); x.globalAlpha = A; x.fillStyle = HOLE; x.fillRect(0, 0, W, H);
    var hole = still ? 9 : Math.max(0, (t - PV.hole[0]) / (PV.hole[1] - PV.hole[0]) * 0.8), fx = W * 0.5 / PW.tan[0], cw = W / 42, ch = H / 24;
    var cellR = function (c) { var c0 = c % 42, r0 = (c / 42) | 0; return [Math.round(c0 * cw), Math.round(r0 * ch), Math.round((c0 + 1) * cw) - Math.round(c0 * cw), Math.round((r0 + 1) * ch) - Math.round(r0 * ch)]; };
    var tt = still ? 1e4 : t;
    function sprite(G_, j, isK) {   // one sub-cell or point sprite; returns false for k's that have not landed yet
      var my = G_.M[4 * j + 1], lam = isK ? clamp((tt - my + PV.kdur) / PV.kdur, 0, 1) : clamp((tt - my) / PV.liftDur, 0, 1), st = 1 - lam;
      lam = 1 - st * st * st;
      var X_ = lerp(G_.E[3 * j], G_.P[3 * j], lam), Y_ = lerp(G_.E[3 * j + 1], G_.P[3 * j + 1], lam), Z_ = lerp(G_.E[3 * j + 2], G_.P[3 * j + 2], lam);
      var q = proj3(cm, X_, Y_, Z_);
      if (q[2] < 2 || q[0] < -1.05 || q[0] > 1.05 || q[1] < -1.05 || q[1] > 1.05) return;
      var a = isK ? sstep(my - PV.kdur, my - PV.kdur + 0.08, tt) : sstep(my, my + 0.1, tt);
      if (a <= 0.01) return;
      var s = clamp(G_.M[4 * j] / q[2] * fx * SZ, W / 42 * (isK ? 0.5 : 0.3), W / 42 * 0.9), cc = [G_.C[3 * j], G_.C[3 * j + 1], G_.C[3 * j + 2]];
      if (isK) { var sv_ = sstep(my + PV.settle, my + PV.settle + 0.45, tt); cc = [lerp(KRGB[0], cc[0], sv_), lerp(KRGB[1], cc[1], sv_), lerp(KRGB[2], cc[2], sv_)]; }
      x.globalAlpha = A * a; x.fillStyle = 'rgb(' + Math.round(cc[0] * 255) + ',' + Math.round(cc[1] * 255) + ',' + Math.round(cc[2] * 255) + ')';
      x.fillRect((q[0] + 1) / 2 * W - s / 2, (q[1] + 1) / 2 * H - s / 2, s, s);
    }
    (still || t >= PV.klift ? ['i', 'k'] : ['i']).forEach(function (w_) {
      var G_ = PT[w_], isK = w_ === 'k', n, c, j;
      sortGrp(G_, cm);
      if (isK) {   // (k: in flight, anywhere; landed, only inside the cells its entry covers)
        var landed = [];
        for (n = 0; n < G_.N; n++) { j = G_.idx[n]; if (tt >= G_.M[4 * j + 1]) landed.push(j); else sprite(G_, j, true); }
        x.save(); x.beginPath();
        for (c = 0; c < 1008; c++) if (MQ.cov[c]) { var r_ = cellR(c); x.rect(r_[0], r_[1], r_[2], r_[3]); }
        x.clip();
        for (n = 0; n < landed.length; n++) sprite(G_, landed[n], true);
        x.restore();
        return;
      }
      for (n = 0; n < G_.N; n++) sprite(G_, G_.idx[n], false);
      if (hole > 0) {   // (the holes open over i's points)
        x.fillStyle = HOLE;
        for (c = 0; c < 1008; c++) {
          if (!MQ.miss[c]) continue;
          var hq = clamp((hole - holeAt(c)) / 0.18, 0, 1);
          if (hq <= 0) continue;
          var rc = cellR(c); x.globalAlpha = A * hq; x.fillRect(rc[0], rc[1], rc[2], rc[3]);
        }
      }
    });
    x.restore();
  }
  // the holes of camera 428 (the read's missing cells) on the view: each outlined in i's colour as it opens; while the
  // coverage is weighed, the ones k's entry covers turn to k's colour, and each of those fades as k's first point lands in it
  function holesDraw(x, W, H, t, still, A) {
    if (!still && t < PV.hole[0]) return;
    var cw = W / 42, ch = H / 24, span = PV.hole[1] - PV.hole[0], cv = still ? 1 : sstep(PV.cov[0], PV.cov[1], t), mc = MQ.mc;
    var B_ = {}, F_ = {};   // (one path per colour and alpha: outlines, and the flash of each hole as it opens)
    for (var n = 0; n < mc.length; n++) {
      var q = mc[n], to = PV.hole[0] + holeAt(q.k) / 0.8 * span, a;
      if (still) a = q.cov ? 0.2 : 0.2;
      else {
        if (t < to) continue;
        var fl = env(t, to, to + 0.05, 0.06, 0.5);
        a = 0.2 + 0.55 * fl;
        if (fl > 0.02) { var fk = (Math.round(fl * A * 0.4 * 20) / 20).toFixed(2); (F_[fk] = F_[fk] || []).push(q); }
        if (q.cov) a = lerp(a, 0.5, cv) * (1 - 0.6 * sstep(PT.land[q.k], PT.land[q.k] + 0.4, t));
      }
      a *= A;
      if (a <= 0.01) continue;
      var key = (q.cov && cv > 0.5 ? 'k' : 'i') + (Math.round(a * 20) / 20).toFixed(2);
      (B_[key] = B_[key] || []).push(q);
    }
    x.save(); x.lineWidth = 1;
    Object.keys(F_).forEach(function (key) {
      x.fillStyle = rgba('i', parseFloat(key)); x.beginPath();
      F_[key].forEach(function (q) { x.rect(Math.round(q.c * cw), Math.round(q.r * ch), Math.round((q.c + 1) * cw) - Math.round(q.c * cw), Math.round((q.r + 1) * ch) - Math.round(q.r * ch)); });
      x.fill();
    });
    Object.keys(B_).forEach(function (key) {
      x.strokeStyle = rgba(key.charAt(0), parseFloat(key.slice(1))); x.beginPath();
      B_[key].forEach(function (q) { x.rect(Math.round(q.c * cw) + 1.5, Math.round(q.r * ch) + 1.5, Math.round((q.c + 1) * cw) - Math.round(q.c * cw) - 3, Math.round((q.r + 1) * ch) - Math.round(q.r * ch) - 3); });
      x.stroke();
    });
    x.restore();
  }
  // Retrieve, afterwards: k's four latent frames are fetched from the figure's memory bank into its retrieved entry, one
  // after the other (drawFly)
  function kLift(m) { return 14.85 + 0.1 * m; }   // latent frame m of k's entry leaves the bank
  // the point view on the view (the WebGL canvas under the view's canvas, or the view's canvas itself), its holes, labels
  // and the inset; A: its opacity
  function pointView(x, W, H, t, still, A) {
    if (!PT) { if (GLV && GLV.ok) setOp(GLV.c, 0); return false; }
    var cm = pvCam(t, still);
    V.gl = pvGLDraw(t, still, cm, A);
    if (!V.gl) pv2D(x, W, H, t, still, cm, A);
    holesDraw(x, W, H, t, still, A);
    if (still) {
      V.tag = tag(x, 12, H - 10, [['covered by the memory entry of ', 0], ['k', 1]], 'k', 1, true, W, H, 'left');
      return true;
    }
    V.tag = tag(x, 12, H - 10, [['3D points', 0]], 'w', A * env(t, 8.55, 9.35, 0.25, 0.25), true, W, H, 'left') || V.tag;
    V.tag = tag(x, 12, H - 10, [['missing pixels', 0]], 'i', A * env(t, 11.25, 12.35, 0.3, 0.3), true, W, H, 'left') || V.tag;
    V.tag = tag(x, 12, H - 10, [['covered by the memory entry of ', 0], ['k', 1]], 'k', A * env(t, 13.6, 14.4, 0.25, 0.25), true, W, H, 'left') || V.tag;
    return true;
  }
  function depthAt(who, f) { return spr(who, f); }
  var ENTRY_I = B.tgt;   // block n's four latent frames (420, 424, 428, 432)
  var ENTRY_K = B.mem;   // k's entry p00_s069: its four latent frames (276, 280, 284, 288)
  function stack(x, r, frames, who, a, c, lab, labA) {   // four frames stacked as in the figure's memory entry
    if (a <= 0.004) return;
    for (var m = 3; m >= 0; m--) {
      var off = (3 - m) * r[2] * 0.06;
      frameRect(x, spr(who, frames[m]), [r[0] + off, r[1] + off * 0.55, r[2], r[3]], a, c, false, 3);
    }
    if (labA > 0) {
      x.save(); x.globalAlpha = labA * a; x.font = 'italic 500 ' + Math.round(clamp(V.W * 0.026, 11, 15)) + 'px ' + SERIF; x.textAlign = 'center';
      x.fillStyle = '#d2d2d7'; x.fillText(lab, r[0] + r[2] * 0.59, r[1] + r[3] * 1.18 + 16); x.restore();
    }
  }
  function camIcon(x, px, py, s, c, a) {   // a camera frustum glyph (the figure's "cameras")
    x.save(); x.globalAlpha = a; x.strokeStyle = HOT[c]; x.lineWidth = 1.5; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + s, py - s * 0.55); x.lineTo(px + s, py + s * 0.55); x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(px + s, py - s * 0.55); x.lineTo(px + s * 1.25, py - s * 0.2); x.lineTo(px + s * 1.25, py + s * 0.75); x.lineTo(px + s, py + s * 0.55); x.stroke();
    x.restore();
  }
  // a memory entry as the figure draws it: depth, latent frames, cameras; u: 0 = the whole view, 1 = the entry laid out
  function entry(x, W, H, t, t0, u, c, frames, fr_, dep, dq, fq, fa, A, da) {
    var full = [0, 0, W, H], rd = lerpR(full, G.ent.depth, u), rf = lerpR(full, G.ent.frames, u);
    da = da == null ? 1 : da;
    if (u < 1) {
      frameRect(x, dq, rd, A, null, false, lerp(0, 4, u));
      frameRect(x, fq, rf, A * u, c, false, lerp(0, 4, u));
      return;
    }
    var la = sstep(t0 + 0.4, t0 + 0.65, t);
    stack(x, G.ent.depth, frames, dep, A * da, null, 'depth', la);
    stack(x, G.ent.frames, frames, fr_, A * fa, c, 'latent frames', la);
    var cr = G.ent.cams, cs = cr[2] * 0.42;
    for (var m = 0; m < 4; m++) camIcon(x, cr[0] + m * cs * 0.28, cr[1] + cr[3] * 0.42 + m * cs * 0.12, cs, c, A * sstep(t0 + 0.45 + 0.08 * m, t0 + 0.6 + 0.08 * m, t));
    x.save(); x.globalAlpha = A * la; x.font = 'italic 500 ' + Math.round(clamp(W * 0.026, 11, 15)) + 'px ' + SERIF; x.textAlign = 'center';
    x.fillStyle = '#d2d2d7'; x.fillText('cameras', cr[0] + cs * 0.9, G.ent.frames[1] + G.ent.frames[3] * 1.18 + 16); x.restore();
  }
  function legend(x, W, H, a, top, cw) {   // near to far (the page's depth colours); top: in the upper right corner;
    if (a <= 0.004) return;                 // cw: drawn only left of cw (over the depth a wipe has drawn so far)
    x.save(); if (cw != null && cw < W) { x.beginPath(); x.rect(0, 0, Math.max(0, cw), H); x.clip(); }
    x.globalAlpha = a; var lw = clamp(W * 0.16, 70, 110), lx = W - lw - 14 - 58, ly = top ? 22 : H - 22;
    roundRect(x, lx - 36, ly - 11, lw + 36 + 44, 22, 11); x.fillStyle = 'rgba(22,22,23,.66)'; x.fill();
    var lg = x.createLinearGradient(lx, 0, lx + lw, 0);
    D.depth.stops.forEach(function (st) { lg.addColorStop(st[0], st[1]); });
    roundRect(x, lx, ly - 3, lw, 6, 3); x.fillStyle = lg; x.fill();
    x.font = '600 11px ' + SANS; x.textBaseline = 'middle'; x.fillStyle = '#f5f5f7'; x.textAlign = 'right'; x.fillText('near', lx - 7, ly + 0.5);
    x.textAlign = 'left'; x.fillText('far', lx + lw + 7, ly + 0.5); x.restore();
  }
  function readLine(x, wp, H, a) {
    if (wp >= V.W + 2 || a <= 0.004) return;
    x.save(); x.globalAlpha = a; var g = x.createLinearGradient(wp - 26, 0, wp + 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.85)'); x.fillStyle = g; x.fillRect(wp - 26, 0, 28, H); x.restore();
  }
  function wipeX(t, t0, dur, W) { return easeIO((t - t0) / dur) * (W + 4); }   // how far a wipe has come
  function wipe(x, q, W, H, t0, dur, t, a) {   // a depth image read left to right
    var wp = easeIO((t - t0) / dur) * (W + 4);
    if (!q || a <= 0.004) return;
    x.save(); x.globalAlpha = a; x.beginPath(); x.rect(0, 0, wp, H); x.clip();
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; drawCover(x, q, 0, 0, W, H); x.restore();
    readLine(x, wp, H, a);
  }
  // the scene state step: client k backs through the doorway looking out (its block of 17.1-18.0 s), its depth head reads
  // the block, and the block becomes k's memory entry, which leaves for its place in the shared world
  function drawK(x, W, H, t) {
    var a = 1 - sstep(3.45, 3.85, t);
    if (a <= 0.004) return;
    x.save(); x.globalAlpha = a;
    x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, W, H);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    var kf = clamp(Math.floor(seg(WK, t).p), 273, 288), eu = easeIO((t - 2.25) / 0.5);
    if (t < 2.25) {
      drawCover(x, spr('kv', kf), 0, 0, W, H);
      if (t > 1.85) wipe(x, depthAt('dk', 288), W, H, 1.85, 0.4, t, 1);
      legend(x, W, H, env(t, 1.95, 2.25, 0.15, 0.15), false, wipeX(t, 1.85, 0.4, W));
      V.tag = tag(x, 12, H - 10, [['depth', 0]], 'k', env(t, 1.9, 2.25, 0.2, 0.15), true, W, H, 'left') || V.tag;
    } else {
      // (the entry's latent frames and depth leave for the figure's memory bank as k writes it, frame 289)
      var lv = 1 - sstep(TSAVE - 0.05, TSAVE + 0.05, t);
      entry(x, W, H, t, 2.25, eu, 'k', ENTRY_K, 'kv', 'dk', depthAt('dk', 288), spr('kv', 288), lv, a * (1 - sstep(TSAVE + 0.05, TSAVE + 0.3, t)), lv);
      V.tag = tag(x, 12, H - 10, [['memory entry of ', 0], ['k', 1]], 'k', env(t, 2.4, 3.05, 0.2, 0.2), true, W, H, 'left') || V.tag;
    }
    x.restore();
  }
  function drawView(t, still) {
    var x = vx, W = V.W, H = V.H, sx = W / IW, sy = H / IH;
    x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, W, H);
    V.fieldBox = null; V.kBox = null; V.tag = null; V.pip = null; V.gl = false;
    if (still) { pointView(x, W, H, 0, true, 1); return; }   // the read of camera 428, k's points in the cells its entry covers
    var s = seg(VK, t), f = fr(s.p);
    var bk = 1 - sstep(3.45, 3.9, t);   // k's view gives way to i's (its frame 369)
    if (bk > 0) { x.fillStyle = 'rgba(11,11,13,' + bk.toFixed(3) + ')'; x.fillRect(0, 0, W, H); }
    if (t < 3.85) drawK(x, W, H, t);
    // the other players projected into i's view: k (the only one the run's labels mark visible to i)
    var km = env(t, 4.6, 6.6, 0.3, 0.3);   // (until the field lies over the same frame, on k)
    // (while the clip plays, the frame it presents)
    var fv = f;
    if (S_ && S_.playing && s.rate > STEP_FPS && video.readyState >= 2 && !video.seeking) fv = VF.f >= 0 && performance.now() - VF.at < 250 ? VF.f : clamp(F0 + Math.floor(video.currentTime * D.fps + 1e-3), F0, F1);
    if (km > 0) V.kBox = kMark(x, Math.abs(fv - f) <= 6 ? shown(fv) : shown(f), km, sx, sy);
    // missing pixels and retrieve: the read's points (the WebGL canvas under this one, dark, from 8.3 s; over frame 416,
    // whose points sit on its own pixels); from the read to the generator's input the view stays dark: nothing from before
    // the turn shows through
    var pvA = env(t, PV.on, PV.off, 0.4, 0.3);
    var bg = env(t, 8.5, 18.05, 0.2, 0.2) * (1 - pvA);
    if (bg > 0) { x.fillStyle = 'rgba(11,11,13,' + bg.toFixed(3) + ')'; x.fillRect(0, 0, W, H); }
    if (pvA > 0.002) pointView(x, W, H, t, false, pvA);
    else if (GLV && GLV.ok) setOp(GLV.c, 0);
    // the player state field over frame 416 (the frame the view holds), computed for that frame's camera: on k
    var fa = env(t, 6.65, 7.7, 0.3, 0.3);
    if (fa > 0) drawField(x, fa, 1 - km);
    V.tag = tag(x, 12, H - 10, [['player state field', 0]], 'k', env(t, 6.75, 7.6, 0.25, 0.3), true, W, H, 'left') || V.tag;
    // missing pixels: frame 416's predicted depth, read left to right (i's cameras and depth: the 3D points)
    var dA = env(t, 7.85, 8.45, 0.05, 0.3);
    if (dA > 0) {
      wipe(x, whole(TN.depth), W, H, 7.88, 0.42, t, dA);
      legend(x, W, H, dA * sstep(8.0, 8.2, t), false, wipeX(t, 7.88, 0.42, W));
      V.tag = tag(x, 12, H - 10, [['depth', 0]], 'i', env(t, 7.95, 8.3, 0.2, 0.2), true, W, H, 'left') || V.tag;
    }
    // the generator's input
    var ga = env(t, 16.2, 17.95, 0.35, 0.25);
    if (ga > 0) drawGrid(x, t, false, ga);
    // generate: block n plays; then k's memory frame beside i's generated view: the same place
    var pp = env(t, 20.0, 21.25, 0.35, 0.3);
    if (pp > 0) {
      var r = G.pip, lift = (1 - easeOut((t - 20.0) / 0.45)) * 12;
      x.save(); x.globalAlpha = pp; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 18;
      roundRect(x, r[0], r[1] + lift, r[2], r[3], 6); x.fillStyle = '#000'; x.fill(); x.restore();
      frameRect(x, spr('kv', K69.f), [r[0], r[1] + lift, r[2], r[3]], pp, 'k', false, 6);
      V.pip = [r[0], r[1] + lift, r[2], r[3]];
      V.tag = tag(x, r[0], r[1] + lift - 8, [['memory entry of ', 0], ['k', 1]], 'k', pp, true, W, H, 'left') || V.tag;
    }
    // predicted depth: the state model's depth head reads the generated frames (the view holds block n's last frame)
    var da = env(t, 21.45, 22.55, 0.05, 0.3);
    if (da > 0) {
      wipe(x, depthAt('di', 432), W, H, 21.5, 0.7, t, da);
      legend(x, W, H, da * sstep(21.8, 22.1, t), false, wipeX(t, 21.5, 0.7, W));
      V.tag = tag(x, 12, H - 10, [['depth', 0]], 'i', env(t, 21.65, 22.45, 0.3, 0.3), true, W, H, 'left') || V.tag;
    }
    var dim = env(t, 22.65, 24.9, 0.4, 0.3);
    if (dim > 0) { x.fillStyle = 'rgba(11,11,13,' + (0.32 * dim).toFixed(3) + ')'; x.fillRect(0, 0, W, H); }
    // block n becomes a memory entry: its latent frames, their depth and cameras
    var ea = env(t, 24.95, 26.7, 0.3, 0.25);
    if (ea > 0) {
      x.fillStyle = 'rgba(11,11,13,' + ea.toFixed(3) + ')'; x.fillRect(0, 0, W, H);
      entry(x, W, H, t, 24.95, easeIO((t - 24.95) / 0.55), 'i', ENTRY_I, 'i', 'di', depthAt('di', 432), spr('i', 432), 1, ea);
      V.tag = tag(x, 12, H - 10, [['memory entry of ', 0], ['i', 1]], 'i', env(t, 25.5, 26.4, 0.3, 0.2), true, W, H, 'left') || V.tag;
    }
    // loop edges
    var edge = Math.max(1 - sstep(0, 0.3, t), sstep(T - 0.4, T - 0.02, t));
    if (edge > 0) { x.fillStyle = 'rgba(11,11,13,' + edge.toFixed(3) + ')'; x.fillRect(0, 0, W, H); }
  }
  function drawGrid(x, t, still, ga) {
    var W = V.W, H = V.H;
    ga = still ? 1 : ga;
    x.fillStyle = 'rgba(11,11,13,' + ga.toFixed(3) + ')'; x.fillRect(0, 0, W, H);
    var zs = still ? 1 : 1 + 0.05 * sstep(17.8, 18.2, t);   // it opens onto block n
    x.save(); x.translate(W / 2, H / 2); x.scale(zs, zs); x.translate(-W / 2, -H / 2);
    // memory frames: k's entry, fetched (the flights bring them in; drawn here once they land)
    B.mem.forEach(function (fm, k) {
      var a = still ? 1 : ga * sstep(16.95 + 0.08 * k, 17.05 + 0.08 * k, t);
      frameRect(x, spr('kv', fm), G.mem[k], a, 'k');
    });
    B.rec.forEach(function (fm, k) {
      var a = still ? 1 : ga * sstep(16.35 + 0.03 * k, 16.7 + 0.03 * k, t), r = G.rec[k].slice();
      if (!still) { var d = (1 - easeOut((t - 16.35 - 0.03 * k) / 0.5)) * 10; r[0] += d; }
      frameRect(x, spr('i', fm), r, a, 'i');
    });
    B.tgt.forEach(function (fm, k) {
      // (noise until the Generate step: no frame of block n is shown before it is generated)
      var a = still ? 1 : ga * sstep(16.9 + 0.05 * k, 17.2 + 0.05 * k, t), dn = still ? 1 : sstep(TGEN + 0.03 * k, TGEN + 0.15 + 0.03 * k, t), r = G.tgt[k];
      if (dn < 1) frameRect(x, null, r, a * (1 - dn), null, true);
      if (dn > 0) frameRect(x, spr('i', fm), r, a * dn, 'i');
      if (dn <= 0) { x.save(); x.globalAlpha = a; roundRect(x, r[0] - 0.5, r[1] - 0.5, r[2] + 1, r[3] + 1, 3); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1; x.stroke(); x.restore(); }
    });
    var la = still ? 1 : env(t, 16.4, 17.8, 0.3, 0.2);
    if (la > 0) {
      x.save(); x.globalAlpha = la; x.font = '600 ' + Math.round(clamp(W * 0.022, 10, 13)) + 'px ' + SANS; x.textBaseline = 'alphabetic';
      [['mem', 'Memory frames', 'k'], ['rec', 'Recent context', 'i'], ['tgt', 'Target frames', null]].forEach(function (g) {
        var b = G.box[g[0]]; x.fillStyle = g[2] ? rgba(g[2], 1) : '#d2d2d7'; x.fillText(g[1], b[0], b[1] - 8);
      });
      x.restore();
    }
    x.restore();
  }

  /* ----- the live player state table on the map ----- */
  var PR = null, PRH = null;
  function buildTable() {
    pst.innerHTML = '<span class="h">Client</span><span class="h">Position</span><span class="h">Controls</span><span class="h">Weapon</span>';
    PR = {};
    ROLES.forEach(function (r) {
      var e = mk('em', null, pst); e.textContent = r; e.style.color = HOT[r];
      var p = mk('span', null, pst, '<svg viewBox="-8 -8 16 16" aria-hidden="true"><g><circle r="2.3" fill="' + HOT[r] + '"/><path d="M-5.5 0H4.5M1.6-3L4.6 0L1.6 3" fill="none" stroke="' + HOT[r] + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>');
      PR[r] = { em: e, ps: p, g: p.querySelector('g'), ctl: mk('span', 'ctl', pst), wp: mk('span', 'wp', pst), c: '', w: '', a: 1e9 };
    });
    PRH = mk('div', 'f3c-pst-hi', pst);   // i's position (its client and position cells), lit as the one for block n+1 arrives (Publish)
  }
  function rowBox() {   // i's client and position cells: where the light of the position it publishes lies (its controls and
    // weapon stay those of block n, unlit)
    var e = PR.i.em, q = PR.i.ps, x0 = e.offsetLeft - 5, x1 = q.offsetLeft + q.offsetWidth + 5;
    var y0 = Math.min(e.offsetTop, q.offsetTop) - 3, y1 = Math.max(e.offsetTop + e.offsetHeight, q.offsetTop + q.offsetHeight) + 3;
    var k = [x0, y0, x1, y1].map(Math.round).join(',');
    if (PRH._k !== k) { PRH._k = k; PRH.style.left = Math.round(x0) + 'px'; PRH.style.width = Math.round(x1 - x0) + 'px'; PRH.style.top = Math.round(y0) + 'px'; PRH.style.height = Math.round(y1 - y0) + 'px'; }
  }
  var mapChip = mapBox.querySelector('.f3c-chip');
  // The table: in the Player state step the recorded values frame by frame, up to frame 416 (the player states of block
  // n); in Publish the same table (block n's) again, and as i's position for block n+1 reaches Player state O (TPOS) i's
  // position lights and takes the one i publishes (PUBQ: the recorded position and heading of frame 432)
  var TABP = [26.55, 28.3];
  function drawTable(t) {
    var pub = t > 20, a = pub ? env(t, TABP[0], TABP[1], 0.35, 0.4) : env(t, 3.9, 6.5, 0.35, 0.4), hi = pub ? env(t, TPOS, TABP[1], 0.3, 0.4) : 0;
    setOp(pst, a);
    if (mapChip) setOp(mapChip, M.W < 480 ? 1 - a : 1);   // (phones: the map's name gives way to the table in its corner)
    if (PRH) setOp(PRH, hi);
    if (pst._pub !== pub) { pst._pub = pub; pst.classList.toggle('is-pub', pub); }   // (phones, in Publish: the columns of the position only)
    if (a <= 0 || !PR) return;
    if (hi > 0) rowBox();
    var p = pub ? B.frames[0] - 0.5 : seg(WK, t).p, j = clamp(Math.floor(p), FT, FT + D.tr.i.x.length - 1) - FT;
    ROLES.forEach(function (r) {
      var o = PR[r], q = pos(r, p), h = pub && r === 'i' ? lerpAng(q.yaw, PUBQ.yaw, easeIO((t - TPOS) / 0.6)) : q.yaw, yaw = Math.round(-h);
      if (o.a !== yaw) { o.a = yaw; o.g.setAttribute('transform', 'rotate(' + yaw + ')'); }
      var bits = D.st[r].keys[j], words = [];
      D.ctrl.forEach(function (c, b) { if (bits & (1 << b) && words.length < 2) words.push(c); });
      var cs = words.join(' + ') || '—', ws = D.weapons[D.st[r].w[j]];
      if (o.c !== cs) { o.c = cs; o.ctl.textContent = cs; }
      if (o.w !== ws) { o.w = ws; o.wp.textContent = ws; }
    });
  }

  /* ----- links: light between a module of the figure and the concrete event above it ----- */
  var LSVG = sv('svg', { 'class': 'f3c-links', 'aria-hidden': 'true', focusable: 'false' }, card);
  var ldefs = sv('defs', {}, LSVG), lglow = sv('filter', { id: 'f3c-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, ldefs);
  sv('feGaussianBlur', { stdDeviation: 2.4 }, lglow);
  var LS = [0, 1].map(function (n) {
    var g = sv('g', { opacity: 0 }, LSVG);
    var gr = sv('linearGradient', { id: 'f3c-lg' + n, gradientUnits: 'userSpaceOnUse' }, ldefs);
    var s0 = sv('stop', { offset: 0, 'stop-opacity': 0.15 }, gr), s1 = sv('stop', { offset: 0.45, 'stop-opacity': 0.3 }, gr), s2 = sv('stop', { offset: 1, 'stop-opacity': 0.75 }, gr);
    var o = { g: g, gr: gr, stops: [s0, s1, s2], base: sv('path', { fill: 'none', 'stroke-width': 1.4, 'stroke-linecap': 'round', stroke: 'url(#f3c-lg' + n + ')' }, g),
      glow: sv('path', { fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round', filter: 'url(#f3c-glow)', opacity: 0.7 }, g),
      head: sv('path', { fill: 'none', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g),
      hl: sv('rect', { fill: 'none', 'stroke-width': 1.6, rx: 7 }, g), hlg: sv('rect', { fill: 'none', 'stroke-width': 5, rx: 7, filter: 'url(#f3c-glow)', opacity: 0.55 }, g),
      a0: sv('circle', { r: 3 }, g), c: null, d: '' };
    return o;
  });
  var FIGR = null, FSCR = null;
  function figPt(b, side) {   // a point on a figure box (figure units) in card pixels
    var vb = FIGR.vb, s = FIGR.w / vb[2];
    var x0 = FIGR.x + (b[0] - vb[0]) * s, y0 = FIGR.y + (b[1] - vb[1]) * s;
    return side === 'top' ? [x0 + b[2] * s / 2, y0] : [x0 + b[2] * s / 2, y0 + b[3] * s / 2];
  }
  function inMap(r) { var m = L.map; return r ? [m[0] + clamp(r[0], 0, m[2]), m[1] + clamp(r[1], 0, m[3]), Math.min(r[2], m[2]), Math.min(r[3], m[3])] : null; }
  function inView(r) { var v = L.view; return r ? [v[0] + r[0], v[1] + r[1], r[2], r[3]] : v; }
  var L = { map: [0, 0, 1, 1], view: [0, 0, 1, 1], stage: [0, 0, 1, 1] };
  function rel(el) { var c = card.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - c.left, r.top - c.top, r.width, r.height]; }
  var LINKS = [];
  // (bare: the light ends at a point or a card on the map, which lights itself; no frame is drawn around it)
  // (link: in story time; linkL: in loop time, the Field step's own sequence)
  function linkL(t0, t1, c, fromId, to, bare) { LINKS.push({ t: [t0, t1], c: c, from: fromId, to: to, bare: !!bare }); }
  function link(t0, t1, c, fromId, to, bare) { linkL(LT(t0), LT(t1), c, fromId, to, bare); }
  function drawLinks(t) {
    var act = LINKS.filter(function (l) { return t >= l.t[0] && t <= l.t[1] + 0.45; });
    LS.forEach(function (o, n) {
      var l = act[n];
      if (!l || !FIGR) { setOp(o.g, 0); return; }
      var b = S_.box(l.from), tr = l.to();
      if (!tr) { setOp(o.g, 0); return; }
      var p0 = figPt(b, 'top');
      // phones: only while the module is inside the visible part of the scrolling figure
      var vis = FSCR ? sstep(FSCR[0] - 10, FSCR[0] + 30, p0[0]) * (1 - sstep(FSCR[0] + FSCR[2] - 30, FSCR[0] + FSCR[2] + 10, p0[0])) : 1;
      var a = env(t, l.t[0], l.t[1], 0.25, 0.45) * vis;
      if (a <= 0.004) { setOp(o.g, 0); return; }
      var p1 = [tr[0] + tr[2] / 2, tr[1] + tr[3]], dy = Math.max(30, p0[1] - p1[1]);
      var d = 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'C' + p0[0].toFixed(1) + ' ' + (p0[1] - dy * 0.55).toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + (p1[1] + dy * 0.45).toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
      var col = HOT[l.c];
      if (o.c !== col) { o.c = col; [o.glow, o.head, o.hl, o.hlg].forEach(function (e) { e.setAttribute('stroke', col); }); o.a0.setAttribute('fill', col); o.stops.forEach(function (e) { e.setAttribute('stop-color', col); }); }
      o.gr.setAttribute('x1', p0[0].toFixed(1)); o.gr.setAttribute('y1', p0[1].toFixed(1)); o.gr.setAttribute('x2', p1[0].toFixed(1)); o.gr.setAttribute('y2', p1[1].toFixed(1));
      if (o.d !== d) { o.d = d; [o.base, o.glow, o.head].forEach(function (e) { e.setAttribute('d', d); }); o.len = o.head.getTotalLength() || 1; }
      var Lh = o.len, sg = Math.min(70, Lh * 0.4), u = easeIO((t - l.t[0]) / 0.65);
      o.head.setAttribute('stroke-dasharray', sg.toFixed(1) + ' ' + (Lh + sg).toFixed(1));
      o.head.setAttribute('stroke-dashoffset', (sg - u * (Lh + sg)).toFixed(1));
      o.glow.setAttribute('stroke-dasharray', sg.toFixed(1) + ' ' + (Lh + sg).toFixed(1));
      o.glow.setAttribute('stroke-dashoffset', (sg - u * (Lh + sg)).toFixed(1));
      setOp(o.head, u < 1 ? 1 : 0); setOp(o.glow, u < 1 ? 0.7 : 0);
      o.base.setAttribute('stroke-dasharray', (Lh * u).toFixed(1) + ' ' + (Lh + 2).toFixed(1));
      o.a0.setAttribute('cx', p0[0].toFixed(1)); o.a0.setAttribute('cy', p0[1].toFixed(1));
      var hA = sstep(l.t[0] + 0.45, l.t[0] + 0.7, t);
      [o.hl, o.hlg].forEach(function (e) {
        e.setAttribute('x', (tr[0] - 3).toFixed(1)); e.setAttribute('y', (tr[1] - 3).toFixed(1));
        e.setAttribute('width', Math.max(0, tr[2] + 6).toFixed(1)); e.setAttribute('height', Math.max(0, tr[3] + 6).toFixed(1));
      });
      setOp(o.hl, l.bare ? 0 : hA); setOp(o.hlg, l.bare ? 0 : 0.55 * hA);
      setOp(o.g, a);
    });
  }

  /* ----- flights: k's entry into the figure's memory bank (Store k: its latent frames and depth out of the view); k's
     latent frames out of the bank into the figure's retrieved entry and on into the generator's input (Retrieve, Memory
     frames). k's points come out of its own cameras in the view (the point view); block n's entry travels into the bank
     along the figure's publish arrow (main.js packet) ----- */
  var FLY = mk('div', 'f3c-fly', card);
  function flyEl(c) { var d = mk('div', 'f3c-fl', FLY), cv = mk('canvas', null, d); d.style.setProperty('--c', HOT[c]); return { d: d, cv: cv, key: '' }; }
  var FK = [0, 1, 2, 3].map(function () { return flyEl('k'); });
  var FS = flyEl('k');
  function flyDraw(o, q, w, h) {
    var key = (q ? q[0].src + '#' + q[1] + ',' + q[2] : 'x') + '@' + Math.round(w) + 'x' + Math.round(h);
    if (o.key === key) return;
    o.key = key;
    o.cv.width = Math.max(1, Math.round(w * DPR)); o.cv.height = Math.max(1, Math.round(h * DPR));
    var x = o.cv.getContext('2d'); x.imageSmoothingQuality = 'high';
    if (!drawCover(x, q, 0, 0, o.cv.width, o.cv.height)) o.key = '';
  }
  // fly from rectangle r0 to r1 (card pixels), on an arc; the element is laid out at r1's size (or, big, at r0's) and scaled
  function place(o, r0, r1, u, a, arc, big) {
    if (a <= 0.004) { setOp(o.d, 0); return; }
    var e = easeIO(u), r = lerpR(r0, r1, e), lift = Math.sin(Math.PI * e) * (arc == null ? Math.min(60, Math.abs(r1[1] - r0[1]) * 0.25 + 20) : arc);
    var w0 = big ? r0[2] : r1[2], h0 = big ? r0[3] : r1[3];
    o.d.style.width = w0 + 'px'; o.d.style.height = h0 + 'px';
    o.d.style.transform = 'translate(' + r[0].toFixed(1) + 'px,' + (r[1] - lift).toFixed(1) + 'px) scale(' + (r[2] / w0).toFixed(4) + ',' + (r[3] / h0).toFixed(4) + ')';
    setOp(o.d, a);
  }
  function figRect(b) {
    var vb = FIGR.vb, s = FIGR.w / vb[2];
    return [FIGR.x + (b[0] - vb[0]) * s, FIGR.y + (b[1] - vb[1]) * s, b[2] * s, b[3] * s];
  }
  function stackRect(r, m) { var off = (3 - m) * r[2] * 0.06; return [r[0] + off, r[1] + off * 0.55, r[2], r[3]]; }   // frame m of an entry's stack in the view
  function fitAR(r, ar) { var h = r[3], w = h * ar; return [r[0] + (r[2] - w) / 2, r[1], w, h]; }   // (a rectangle of aspect ar in r's middle, r's height)
  var TFS = 0.65;   // a stored frame's flight into the bank
  function drawFly(t) {
    FK.forEach(function (o, k) {
      // 0 (Store k): the entry's latent frames leave the view as one stack for their box in the figure's memory bank
      var t0 = TSAVE, u0 = k ? -1 : (t - t0) / TFS;
      // 1 (Retrieve): from its tile in the bank into the Retrieved memory entry of the figure, one frame after the other
      var t1 = kLift(k), u1 = (t - t1) / 0.45;
      // 2 (Memory frames): from there into the memory frames of the generator's input (client i's view)
      var t2 = 16.35 + 0.08 * k, u2 = (t - t2) / 0.6;
      if (u0 >= 0 && u0 <= 1 && FIGR) {
        var s0 = inView(stackRect(G.ent.frames, 0)), d0 = fitAR(figRect(BK.latent.k.group.r), IW / IH);
        flyDraw(o, spr('kv', B.mem[k]), s0[2], s0[3]);
        place(o, s0, d0, u0, Math.min(1, u0 * 8, (1 - u0) * 5 + 0.001), 40, true);   // (laid out at the view's size)
      } else if (u1 >= 0 && u1 <= 1 && FIGR) {
        var dst = figRect(S_.D.slot['retrieved.token.' + k]), src = fitAR(figRect(BK.latent.k.tiles[k].r), dst[2] / dst[3]);
        flyDraw(o, spr('kv', B.mem[k]), dst[2], dst[3]);
        place(o, src, dst, u1, Math.min(1, u1 * 6, (1 - u1) * 6 + 0.001), 14);
      } else if (u2 >= 0 && u2 <= 1 && FIGR) {
        var src2 = figRect(S_.D.slot['retrieved.token.' + k]), g = inView(G.mem[k]);
        flyDraw(o, spr('kv', B.mem[k]), g[2], g[3]);
        place(o, src2, g, u2, Math.min(1, u2 * 5, (1 - u2) * 8 + 0.001));
      } else setOp(o.d, 0);
    });
    // (Store k) k's depth leaves the view's entry for Cameras + depth in the bank
    var uk = (t - TSAVE) / TFS;
    if (uk >= 0 && uk <= 1 && FIGR) {
      var sd = inView(stackRect(G.ent.depth, 0)), dd = figRect(BK.depth.k.r);
      flyDraw(FS, spr('dk', B.mem[0]), sd[2], sd[3]);
      place(FS, sd, dd, uk, Math.min(1, uk * 8, (1 - uk) * 5 + 0.001), 40, true);
    } else setOp(FS.d, 0);
  }

  /* ----- the figure's own image slots, filled with the case (in the figure's coordinates) ----- */
  var SLOTS = [], S_ = null;
  function slot(r, cls, draw, alpha) {
    var d = S_.mediaBox('om-slot ' + (cls || ''), r), c = mk('canvas', null, d);
    SLOTS.push({ d: d, c: c, draw: draw, alpha: alpha, key: null });
  }
  function drawSlots(t, tl) {   // t: story time; tl: loop time (the Field step's own sequence)
    SLOTS.forEach(function (o) {
      var a = o.alpha(t, tl);
      setOp(o.d, a);
      if (a <= 0.002) return;
      var w = o.d.clientWidth, h = o.d.clientHeight, key = (o.draw.key ? o.draw.key(t) : '') + w + 'x' + h;
      if (o.key === key) return;
      var sc = o.draw.px ? o.draw.px() : DPR * 1.5, cw = Math.max(1, Math.round(w * sc)), chh = Math.max(1, Math.round(h * sc));
      if (o.c.width !== cw || o.c.height !== chh) { o.c.width = cw; o.c.height = chh; }
      var x = o.c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cw, chh); x.imageSmoothingQuality = 'high';
      o.key = o.draw(x, cw, chh, t) === false ? null : key;
    });
  }
  function frameDraw(who, fm) { return function (x, w, h) { return drawCover(x, spr(who, fm), 0, 0, w, h); }; }
  // the figure's Own position, as the stage's map draws the Position step: the map around client i (OWN_SPAN units across),
  // its recorded path over block n ending in i's marker, and the state model's estimate where it is: a small mark with the
  // thin ring of one body width (32 u at the slot's scale) around it; i's recorded position inside the ring (16.0 u)
  var OWN_SPAN = 150;   // map units across the slot
  function ownPos(x, w, h) {
    var mi = IM[D.map.img];
    if (!ok(mi) || !Q) return false;
    var I = Q.i, s = w / OWN_SPAN, ox = POSC[0] - OWN_SPAN / 2, oy = POSC[1] + h / s / 2;
    function px(v) { return (v - ox) * s; } function py(v) { return (oy - v) * s; }
    x.imageSmoothingEnabled = true; x.drawImage(mi, px(D.map.x0), py(D.map.y1), D.map.w * s, D.map.h * s);
    var tr = D.tr.i, u = w / 140;
    x.lineCap = 'round'; x.lineWidth = 2.2 * u; x.strokeStyle = rgba('i', 0.55); x.beginPath();
    for (var f = 405; f <= 432; f++) { var k = f - FT; if (f === 405) x.moveTo(px(tr.x[k]), py(tr.y[k])); else x.lineTo(px(tr.x[k]), py(tr.y[k])); }
    x.stroke();
    var gx = px(I.gt[0]), gy = py(I.gt[1]), ex = px(I.est[0]), ey = py(I.est[1]), br = RING_R * s, mr = Math.max(3.2 * s, 2.6 * u), hr = 2 * u;
    x.beginPath(); x.arc(ex, ey, br, 0, 6.2832); x.lineWidth = 2.2 * u; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke(); x.lineWidth = 1 * u; x.strokeStyle = HOT.i; x.stroke();
    x.beginPath(); x.arc(gx, gy, mr, 0, 6.2832); x.fillStyle = HOT.i; x.fill(); x.lineWidth = 1.2 * u; x.strokeStyle = '#fff'; x.stroke();
    x.beginPath(); x.arc(ex, ey, hr, 0, 6.2832); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 1.1 * u; x.strokeStyle = HOT.i; x.stroke();
  }

  /* ----- the video: kept at the frame the loop wants ----- */
  // the frame the video presents (requestVideoFrameCallback), where the browser reports it
  var VF = { f: -1, at: 0 }, VS = { hold: -1, at: 0 }, STEP_FPS = 6;
  function watchFrames() {
    if (!video || !video.requestVideoFrameCallback) return;
    var cb = function (now, md) { VF.f = clamp(F0 + Math.floor(md.mediaTime * D.fps + 1e-3), F0, F1); VF.at = performance.now(); video.requestVideoFrameCallback(cb); };
    video.requestVideoFrameCallback(cb);
  }
  function vsync(t, playing) {
    if (!video || video.readyState < 1) return;
    var s = seg(VK, t), want = (s.p - F0) / D.fps;
    // (a slow segment, the turn frame by frame, is stepped: each frame is sought and held, exactly on the loop's clock)
    if (playing && s.rate > STEP_FPS) {
      VS.hold = -1;
      var rate = s.rate / D.fps;
      if (Math.abs(video.playbackRate - rate) > 0.01) video.playbackRate = rate;
      if (Math.abs(video.currentTime - want) > 0.12 && !video.seeking) { try { video.currentTime = want; } catch (e) { /* ignore */ } }
      // stop before the clip runs past the last frame of the segment (the next one holds it)
      var last = (Math.floor(s.end) + 1 - F0) / D.fps, early = video.currentTime + video.playbackRate * 0.07 >= last;
      if (early && !video.paused) video.pause();
      else if (!early && video.paused) { var pr = video.play(); if (pr && pr.catch) pr.catch(function () { }); }
    } else {
      if (!video.paused) video.pause();
      // a hold seeks once to the middle of its frame, whatever the tolerance (a paused clip can present the next frame),
      // and again if the presented frame is not the one held
      var fh = Math.floor(s.p), hold = (fh - F0 + 0.5) / D.fps, now = performance.now();
      var off = VS.hold !== hold || Math.abs(video.currentTime - hold) > 0.02 || (VF.f >= 0 && VF.f !== fh && VF.at > VS.at && now - VS.at > 300);
      if (off && !video.seeking) { try { video.currentTime = hold; VS.hold = hold; VS.at = now; } catch (e) { /* ignore */ } }
    }
  }

  /* ---------------- motion: the loop, handed the figure's machinery by main.js ---------------- */
  function build(S) {
    S_ = S;
    fig._f3c = { MS: MS, M: M };   // (for inspection: what the map drew last, and its framing)
    var Dg = S.D;
    // (the lights on the figure, written in story time; LT turns them into loop time. The Field step's own sequence is
    // written in loop time: S.lit, S.comet, linkL)
    function lit(ids, c, a, b, o) { S.lit(ids, c, LT(a), LT(b), o); }
    function comet(p, c, a, d, o) { S.comet(p, c, LT(a), d, o); }
    S.T = LT(T);
    S.veilAt = function (tl) { var t = SC(tl); return 0.5 * sstep(0, 0.6, t) * (1 - sstep(TEND, TEND + 0.7, t)); };
    buildTable();
    layout();
    var primed = false;
    S.prime = function () {
      if (primed) return; primed = true;
      [D.map.img, D.spr.kv.img, D.spr.dk.img, D.spr.i.img, D.spr.di.img, TN.depth, FILL.img].forEach(img);
      ptsLoad(function () { pvGL(); MKEY = ''; REV.key = null; SLOTS.forEach(function (o) { o.key = null; }); if (!S.playing) S.render(S.t); });
      video.poster = BASE + D.video.poster;
    };
    // the clip's sources: given by the page's load queue (assets/js/main.js) when the figure's turn comes
    video._srcs = [['mp4', 'video/mp4'], ['webm', 'video/webm']].map(function (q) { return [BASE + D.video.base + '.' + q[0], q[1]]; });
    S.vids = [video];
    onImg.push(function (name) { if (name === FILL.img) fill4(); MKEY = '';   // (made when its image arrives, not mid-loop)
      SLOTS.forEach(function (o) { o.key = null; }); FK.forEach(function (o) { o.key = ''; }); FS.key = ''; if (!S.playing) S.render(S.t); });
    watchFrames();
    S.stepAt = function (tl) {   // (loop time: the step bar)
      if (tl >= LT(TEND)) return null;
      for (var k = 0; k < STEPS_L.length; k++) if (tl < STEPS_L[k].t[1] || k === STEPS_L.length - 1) return { i: k, p: clamp((tl - STEPS_L[k].t[0]) / (STEPS_L[k].t[1] - STEPS_L[k].t[0]), 0, 1) };
    };
    S.stepStart = function (k) { return Math.max(0, STEPS_L[k].t[0] + (k ? 0.02 : 0)); };
    S.makeBar(STEPS);
    // phones, from the end of Store i through Publish, the pan runs on a set course (story time) instead of trailing its
    // target (the default follow lags it by about 0.3 s): to the Own position slot as the position is about to leave it
    // (PANF: the entry, then the slot), then along the arrow to the shared world, there before the packets climb its left
    // edge into Player state O and the scene state (the entry's packet in view all the way, the position's but for a moment
    // where it outruns the pan); even speed with eased ends, at most about 150 px per 0.1 s
    var PAN = [25.75, 26.1, 26.15, 26.88], PANF = [1240, 1350];
    function glide(a, b, x) {   // (0 to 1: linear with eased ends, a quarter of the way each: a lower peak speed than sstep)
      var u = clamp((x - a) / (b - a), 0, 1);
      return u < 0.25 ? u * u * 8 / 3 : u > 0.75 ? 1 - (1 - u) * (1 - u) * 8 / 3 : (u - 0.125) * 4 / 3;
    }
    S.focusAt = function (tl) {   // phones: the figure pans to the step's module
      var t = SC(tl);
      if (t >= TEND) return 300;
      var s = S.stepAt(tl), k = s ? s.i : 0;
      if (k === 3) return t < 8.3 ? 200 : 410;
      if (k === 4) return t < 12.85 ? 170 : t < 14.75 ? 360 : 330;   // (k's entry in the bank; its points and coverage; its fetch)
      if (k === 8) return t < 23.2 ? 1340 : t < 23.8 ? 1400 : 1470;
      if (k === 9) return lerp(PANF[0], PANF[1], sstep(PAN[0], PAN[1], t));
      if (k === 10) return lerp(PANF[1], 150, glide(PAN[2], PAN[3], t));
      return STEPS[k].fx;
    };
    var follow0 = S.follow;
    S.follow = function (tl) {   // (the course: on it the figure follows it exactly; after a seek it glides back onto it)
      var t = SC(tl), sc = this.scroll;
      if (t < PAN[0] || t > PAN[3] + 0.3 || !sc || !this.focusAt || sc.scrollWidth <= sc.clientWidth + 4) return follow0.call(this, tl);
      var now = performance.now(), dt = this.lastF ? Math.min(0.1, (now - this.lastF) / 1000) : 0.1; this.lastF = now;
      if (now < this.hold) { this.setX = -1; return; }
      var vb = this.vb, W = this.stage.offsetWidth, max = sc.scrollWidth - sc.clientWidth, cur = sc.scrollLeft;
      var px = function (f) { return clamp((f - vb[0]) / vb[2] * W - sc.clientWidth / 2, 0, max); };
      var goal = t < PAN[1] ? lerp(px(PANF[0]), px(PANF[1]), sstep(PAN[0], PAN[1], t)) : px(PANF[1]) * (1 - glide(PAN[2], PAN[3], t));
      if (Math.abs(goal - cur) < 0.75) return;
      sc.scrollLeft = cur + clamp(goal - cur, -1700 * dt, 1700 * dt); this.setX = sc.scrollLeft;
    };

    /* store k: k generates the view through the doorway; its block becomes a memory entry (four latent frames, their depth
       and cameras) and is stored in the memory bank, empty until then: its cameras on the bank's map at their recorded
       places, its latent frames, their depth; on the stage's map its marker at the doorway */
    lit('world.scene_state', 'w', 0.4, 3.85, { pad: 2 });   // (the bank, empty; nothing runs to it until k's entry lands)
    lit([BK.latent.k.group.r], 'k', TBK - 0.05, 3.85, { pad: 1.5 });
    lit('world.scene_state.camdepth.k', 'k', TBK - 0.05, 3.85, { pad: 1.5 });
    lit([bankCamBox('k')], 'k', TBK - 0.05, 3.85, { pad: 1, rx: 4 });
    link(TLAND - 0.1, 3.85, 'k', 'world.scene_state.map', function () { return MS.kCard ? inMap(MS.kCard) : null; }, true);
    /* player state: i walks in; the figure's table, its content the live table on the map (the case's recorded values:
       the demo figure's table keeps its form, without the paper's example values) */
    lit('world.player_state', 'w', 3.95, 6.55, { pad: 2 });
    ROLES.forEach(function (c, n) { lit('world.player_state.row.' + c, c, 3.95 + 0.12 * n, 6.45, { pad: 1.5, ring: false, tint: 0.2 }); });
    link(4.0, 6.45, 'w', 'world.player_state', function () { return getComputedStyle(pst).display === 'none' ? inMap([MS.P.i.px - 14, MS.P.i.py - 14, 28, 28]) : rel(pst); });
    /* field: the recorded positions and cameras (this run is given the player states, so the Extrapolation box stays
       unlit). The view holds frame 416 with the field of its own camera on k, alone, with the figure's Player state field
       lit and showing the same field (the story holds: FH); then, one at a time, how it is made: k's recorded position
       (from k on the map into the table), projected into that camera (the Camera projection), splatted (the arrow to the
       field), which is what the view shows. The figure's Camera projection and Player state field show that camera until
       block n is generated, then block n's first camera (420): a field is drawn only with the frame of its own camera */
    var FL = FH[0] + FH[1], FC = FL - 0.6;   // (loop time: the story resumes; how the field is made)
    S.lit('read.field', 'k', 6.85, LT(7.75), { pad: 2 });
    S.lit('world.player_state', 'w', FC, FC + 0.55, { pad: 2 });
    S.lit('world.player_state.row.k', 'k', FC, FC + 0.55, { pad: 1.5, ring: false, tint: 0.2 });
    linkL(FC, FC + 0.5, 'k', 'world.player_state', function () { var p = MS.P && MS.P.k; return p ? inMap([p.px - 11, p.py - 11, 22, 22]) : null; }, true);
    S.lit('read.camera_projection', 'i', FC + 0.4, LT(7.75), { pad: 2 });
    S.comet('a.projection_to_field', 'k', FC + 0.65, 0.3, { seg: 18 });
    linkL(FC + 0.9, LT(7.75), 'k', 'read.field', function () { return V.fieldBox ? inView(V.fieldBox) : inView(); });
    // the figure's Camera projection: k's projection into the camera of frame 416 over frame 416; from the Generate step
    // into block n's first camera (frame 420), on a plain ground until block n is generated to it, then on frame 420
    var cpDraw = function (x, w, h, t) {
      var nb = t >= TGEN, f = nb ? 420 : 416, gen = !nb || t >= TV420;
      if (gen) { if (!drawCover(x, spr('i', f), 0, 0, w, h)) return false; }
      else { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#eef1f6'); gr.addColorStop(1, '#dfe4ec'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }
      var K = D.kin, j = f - F0, sx = w / IW, sy = h / IH, cx = (K.hx[j] + K.fx[j]) / 2 * sx, y0 = K.hy[j] * sy, y1 = K.fy[j] * sy, bw = (y1 - y0) * 0.55;
      x.strokeStyle = HOT.k; x.lineWidth = Math.max(1.5, w / 90); bracket(x, cx, y0 - 2, y1 + 2, bw); x.stroke();
    };
    cpDraw.key = function (t) { return t < TGEN ? 'r' : t >= TV420 ? 'g' : 'p'; };
    slot(Dg.slot['camera-projection'], '', cpDraw, function (t, tl) { return env(tl, FC + 0.4, LT(TEND) - 0.2, 0.3, 0.6); });
    var fdDraw = function (x, w, h, t) {   // the field of the figure: the 12x21 grid with k's splat (the same camera)
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      var cw = w / 21, ch = h / 12, fw = t >= TGEN ? FIELD[0] : FREC[0];
      for (var k = 0; k < 252; k++) if (fw[k] >= 0.03) { x.fillStyle = rgba('k', 0.25 + 0.75 * Math.min(1, fw[k])); x.fillRect((k % 21) * cw, Math.floor(k / 21) * ch, cw, ch); }
      x.strokeStyle = 'rgba(29,79,134,.28)'; x.lineWidth = 1; x.beginPath();
      for (var r = 0; r <= 12; r++) { x.moveTo(0, r * ch); x.lineTo(w, r * ch); }
      for (var c = 0; c <= 21; c++) { x.moveTo(c * cw, 0); x.lineTo(c * cw, h); }
      x.stroke();
    };
    fdDraw.key = function (t) { return t >= TGEN ? 'n' : 'r'; };
    slot([455.8, 176.2, 70.4, 40.6], '', fdDraw, function (t, tl) { return env(tl, 6.85, LT(TEND) - 0.2, 0.3, 0.6); });
    /* missing pixels: i's recent frames with their predicted depth and cameras -> 3D points -> i walks with block n's
       cameras to the doorway and turns: the pixels block n's cameras miss */
    lit('read.points', 'w', 7.9, 11.25, { pad: 2 });
    link(7.95, 9.1, 'w', 'read.points', function () { return inView(); });
    link(9.2, 11.1, 'i', 'read.points', function () { return MS.fan ? inMap([MS.fan[0] - 9, MS.fan[1] - 9, 18, 18]) : null; }, true);
    comet('a.points_to_missing', 'w', 11.15, 0.2, { seg: 8 });
    lit('read.missing', 'i', 11.3, 13.0, { pad: 2 });   // (lit on into the Retrieve step, until k's cells fill)
    // (the view has turned to the camera the slot reads: its holes are the slot's missing cells)
    link(11.35, 12.25, 'i', 'read.missing', function () { return inView(); });
    // the figure's Missing pixels: the read of block n's camera of frame 428, exactly (the missing cells lit in i's colour
    // as they are marked; k's covered cells filled in the Retrieve step)
    var miss = function (x, w, h, t) { return missDraw(x, w, h, t); };
    miss.key = function (t) { return reveal(t, false) + '|' + missMark(t).toFixed(2); };
    miss.px = screenPx;   // (the screen's own pixels: see missDraw)
    slot(Dg.slot['missing.img'], 'f3c-miss', miss, function (t) { return env(t, 11.3, TEND - 0.2, 0.3, 0.6); });
    /* retrieve: the read searches the memory bank; k's entry (the one it holds) lights up there; its cameras and depth
       become its 3D points (the figure's arrow from the bank to 3D points; one thin light from there to the view), which
       come out of k's cameras and land in i's view in the cells it covers; as they land, the Missing pixels slot fills
       and k's coverage bar grows with them; it is the most, the bar is marked as the paper marks the retrieved entry,
       and k's four latent frames are fetched from the bank into the retrieved entry */
    lit('world.scene_state', 'w', 12.3, 12.95, { pad: 2 });   // (the bank the read searches)
    lit([BK.latent.k.group.r], 'k', BKHI[0], BKHI[1], { pad: 1.5 });
    lit('world.scene_state.camdepth.k', 'k', BKHI[0], 14.3, { pad: 1.5 });
    lit([bankCamBox('k')], 'k', BKHI[0], 14.3, { pad: 1, rx: 4 });
    comet('a.scene_to_points', 'k', 12.6, 0.25, { seg: 10 });
    lit('read.points', 'k', 12.75, 14.3, { pad: 2 });
    link(12.85, 13.9, 'k', 'read.points', function () { return inView(); });
    comet('a.points_to_missing', 'k', 13.2, 0.2, { seg: 8 });
    // the cells k's entry covers fill with k's pixels in the figure's Missing pixels, each as k's first point lands in it
    lit('read.missing', 'k', FILLT[0] - 0.1, COVMAX + 0.3, { pad: 2 });
    comet('a.missing_to_coverage', 'k', 13.4, 0.2, { seg: 8 });
    lit('read.coverage', 'w', 13.45, 15.1, { pad: 2 });
    // the coverage of the entries the bank holds (k's): its share of i's missing pixels (506 of 1678), growing with the
    // cells its points fill (REV); then filled as the paper fills the retrieved entry's bar (the paper's own track and
    // colours, fig3_demo.svg without the paper's example fills). i and j hold no entry in the bank: their rows keep the
    // paper's chips and empty tracks, dimmed. No numbers
    var CT = Dg.slot['coverage.track.2'], CV = BK.cov;
    var kbar = sv('rect', { x: CT[0], y: CT[1], width: 0, height: CT[3], rx: CV.rx, fill: CV.fill, opacity: 0 }, S.gTop);
    var kmax = sv('rect', { x: CT[0], y: CT[1], width: 0, height: CT[3], rx: CV.rx, fill: CV.max, opacity: 0 }, S.gTop);
    S.fn(function (tl) {
      var t = SC(tl), a = env(t, 13.4, TEND - 0.2, 0.2, 0.6);
      if (a <= 0.002) { setOp(kbar, 0); setOp(kmax, 0); return; }
      reveal(t, false);
      var w = (CT[2] * B.share.k * REV.frac).toFixed(2);
      setOp(kbar, a); kbar.setAttribute('width', w);
      setOp(kmax, a * sstep(COVMAX, COVMAX + 0.25, t)); kmax.setAttribute('width', w);
    });
    // j (Player 3) takes no part in this read: its row of the player state table stays as drawn, dimmed while the figure
    // plays, and is never lit; so do the coverage rows of i and j (no entry of theirs in the bank)
    var dims = [Dg.box['world.player_state.row.j'], Dg.box['read.coverage.bar.i'], Dg.box['read.coverage.bar.j']].map(function (r) {
      return sv('rect', { x: r[0] - 1.5, y: r[1] - 1.5, width: r[2] + 3, height: r[3] + 3, rx: 2, fill: '#fbfcfe', opacity: 0 }, S.gTop);
    });
    S.fn(function (tl) { var t = SC(tl), a = 0.62 * sstep(0, 0.6, t) * (1 - sstep(TEND, TEND + 0.7, t)); dims.forEach(function (r) { setOp(r, a); }); });
    lit([Dg.box['read.coverage.bar.k']], 'k', COVMAX, COVMAX + 0.7, { pad: 1.5, rx: 3 });   // (the most: marked)
    comet('a.coverage_to_retrieved', 'k', COVMAX + 0.2, 0.25, { seg: 10 });
    lit('read.retrieved', 'k', COVMAX + 0.35, 16.45, { pad: 2 });
    B.mem.forEach(function (fm, k) {
      slot(Dg.slot['retrieved.token.' + k], '', frameDraw('kv', fm), function (t) { return env(t, kLift(k) + 0.42, TEND - 0.2, 0.06, 0.6); });
    });
    /* memory frames: k's latent frames join i's recent context and the target frames in the attention */
    lit('read.chip_S', 'k', 16.2, 16.8, { pad: 2 });
    comet('a.retrieved_to_memory_tokens', 'k', 16.25, 0.5, { seg: 22 });
    lit('dit.attention', 'w', 16.4, 17.9, { pad: 2 });
    lit('dit.tokens.memory', 'k', 16.6, 17.9, { pad: 1.5 });
    link(16.7, 17.75, 'w', 'dit.attention', function () { return inView(); });
    B.mem.forEach(function (fm, k) { slot(Dg.box['dit.token.memory.' + k], '', frameDraw('kv', fm), function (t) { return env(t, 16.7 + 0.06 * k, TEND - 0.2, 0.2, 0.6); }); });
    B.rec.forEach(function (fm, k) { slot(Dg.box['dit.token.recent.' + k], '', frameDraw('i', fm), function (t) { return env(t, 16.5 + 0.03 * k, TEND - 0.2, 0.2, 0.6); }); });
    B.tgt.forEach(function (fm, k) {
      // (noise until the Generate step: no frame of block n is shown before it is generated)
      slot(Dg.box['dit.token.target.' + k], '', function (x, w, h) { x.drawImage(NOISE, 0, 0, w, h); }, function (t) { return env(t, 16.9 + 0.05 * k, TGEN + 0.05 + 0.06 * k, 0.2, 0.25); });
      slot(Dg.box['dit.token.target.' + k], '', frameDraw('i', fm), function (t) { return env(t, TGEN + 0.05 + 0.06 * k, TEND - 0.2, 0.25, 0.6); });
    });
    /* generate: block n, with the rays of its cameras (the recorded ones), the field through the state injector, the
       controls through AdaLN; i turns at the doorway and looks out at the place of k's memory */
    lit('dit.ray_embedding', 'i', 17.95, 18.7, { pad: 2 });
    link(17.95, 18.65, 'i', 'dit.ray_embedding', function () { return MS.qbox ? inMap(MS.qbox) : null; }, true);
    lit('dit.patch_embedding', 'w', 18.1, 18.7, { pad: 2 });
    lit('own_controls', 'i', 17.95, 18.9, { pad: 2 });
    comet('a.actions_bus', 'i', 18.0, 0.9, { seg: 40, hold: 0.5 });
    comet('a.rays_to_blocks2', 'i', 18.3, 0.15, { seg: 8 }); comet('a.patch_to_blocks2', 'w', 18.3, 0.15, { seg: 8 });
    lit('dit.blocks_2', 'w', 18.4, 18.95, { pad: 2 });
    comet('a.field_to_conv0', 'k', 18.2, 0.35, { seg: 18 });
    lit('dit.conv0', 'k', 18.45, 19.05, { pad: 2 });
    comet('a.conv0_to_sum', 'k', 18.65, 0.18, { seg: 10 }); comet('a.blocks2_to_sum', 'w', 18.6, 0.2, { seg: 10 });
    comet('a.sum_to_blocks28', 'w', 18.85, 0.2, { seg: 10 });
    lit('dit.attention', 'w', 18.95, 19.7, { pad: 2 });
    lit('dit.tokens.memory', 'k', 18.95, 21.3, { pad: 1.5 });
    lit(['dit.adaln_1', 'dit.adaln_2'], 'i', 18.95, 19.6, { pad: 1.5 });
    lit('dit.ffn', 'w', 19.2, 19.8, { pad: 1.5 });
    lit('dit.tokens.target', 'i', 18.0, 19.95, { pad: 1.5 });
    link(18.75, 19.85, 'i', 'dit.tokens.target', function () { return inView(); });
    link(20.05, 21.2, 'k', 'dit.tokens.memory', function () { return V.pip ? inView(V.pip) : null; });
    comet('a.ffn_to_riser', 'i', 19.7, 0.15, { seg: 8 });
    comet('a.latents_riser', 'i', 19.8, 0.5, { seg: 36, hold: 0.3 });
    /* depth: the state model's depth head reads block n */
    comet('a.latents_to_depth_head', 'i', 21.4, 0.2, { seg: 8 });
    lit('sm.depth_head', 'i', 21.5, 22.5, { pad: 2 });
    comet('a.depth_head_to_depth', 'i', 21.6, 0.3, { seg: 16 });
    lit('sm.depth', 'i', 21.75, 22.6, { pad: 2 });
    link(21.5, 22.45, 'i', 'sm.depth_head', function () { return inView(); });
    slot(Dg.slot['depth.img'], '', function (x, w, h) { return drawCover(x, depthAt('di', 432), 0, 0, w, h); }, function (t) { return env(t, 21.75, TEND - 0.2, 0.3, 0.6); });
    /* position: the state model's position chain reads block n's latents and i's controls; the place head and the motion
       head, fused by the complementary filter, give i's own position (the state model's readout of these frames) */
    comet([[1119.36, 84.04], [1293.96, 84.04], [1293.96, 101.32]], 'i', 22.62, 0.25, { seg: 20 });
    lit('own_controls', 'i', 22.62, 22.95, { pad: 2 });
    comet('a.actions_to_action_encoder', 'i', 22.64, 0.15, { seg: 8 });
    lit(['sm.conv_encoder', 'sm.action_encoder'], 'i', 22.68, 23.0, { pad: 2 });
    comet('a.conv_to_join', 'i', 22.72, 0.12, { seg: 12 }); comet('a.action_to_join', 'i', 22.72, 0.12, { seg: 12 });
    comet('a.join_to_transformer', 'i', 22.8, 0.08, { seg: 6 });
    lit('sm.transformer', 'i', 22.8, 23.1, { pad: 2 });
    comet('a.transformer_to_motion', 'i', 22.84, 0.12, { seg: 12 }); comet('a.transformer_to_place', 'i', 22.84, 0.12, { seg: 12 });
    lit(['sm.motion_head', 'sm.place_head'], 'i', 22.9, 23.75, { pad: 2 });
    link(22.85, 23.2, 'i', 'sm.place_head', function () { return MS.place ? inMap(MS.place) : null; }, true);
    link(23.2, 23.55, 'i', 'sm.motion_head', function () { return MS.motion ? inMap(MS.motion) : null; }, true);
    comet('a.motion_to_join', 'i', 23.55, 0.15, { seg: 12 }); comet('a.place_to_join', 'i', 23.55, 0.15, { seg: 12 });
    comet('a.join_to_filter', 'i', 23.66, 0.1, { seg: 6 });
    lit('sm.filter', 'i', 23.7, 24.5, { pad: 2 });
    link(23.85, 24.5, 'i', 'sm.filter', function () { return MS.est ? inMap(MS.est) : null; }, true);
    comet('a.filter_to_own_position', 'i', 24.1, 0.25, { seg: 12 });
    lit('update.own_position', 'i', 24.3, 25.2, { pad: 2 });
    slot(Dg.slot['own-position-map'], '', ownPos, function (t) { return env(t, 24.3, TEND - 0.2, 0.3, 0.6); });
    /* store i: block n becomes i's memory entry (latent frames, depth, cameras) */
    comet('a.latents_to_memory_entry', 'i', 24.9, 0.2, { seg: 8 });
    comet('a.depth_to_memory_entry', 'i', 24.9, 0.35, { seg: 18 });
    lit('update.memory_entry', 'i', 25.05, 26.4, { pad: 2 });
    link(25.2, 26.0, 'i', 'update.memory_entry', function () { var e = G.ent; return inView([e.depth[0] - 6, e.depth[1] - 6, e.cams[0] + e.cams[2] - e.depth[0] + 12, e.depth[3] * 1.3 + 30]); });
    [0, 1, 2, 3].forEach(function (m) {
      slot(Dg.slot['entry.frame.' + m], '', frameDraw('i', ENTRY_I[m]), function (t) { return env(t, 25.1 + 0.08 * m, TEND - 0.2, 0.25, 0.6); });
      slot(Dg.slot['entry.depth.' + m], '', function (x, w, h) { return drawCover(x, depthAt('di', ENTRY_I[m]), 0, 0, w, h); }, function (t) { return env(t, 25.1 + 0.08 * m, TEND - 0.2, 0.25, 0.6); });
    });
    /* publish: i publishes for block n+1 along the figure's publish arrow, whose label names what it carries (the table:
       Player state O; the pin: Scene state S), one packet after the other: its position, the recorded one (PUBQ: this
       run was given the recorded positions), from the Own position slot into Player state O; its memory entry from the
       memory entry into the scene state */
    // a packet: the arrow's blue pill with the label's icon of what it carries, gliding along the arrow (smoothstep); the
    // arrow lights behind it as far as it has come, then fades; a spark where it arrives. Both pass behind the arrow's label
    var PCUT = S.cut(['publish.chip', 'publish.label']), PGT = sv('g', { mask: PCUT }, S.gTrace), PGP = sv('g', { mask: PCUT }, S.gPk);
    function pubPacket(pts, t0, dur, icon) {
      var d = 'M' + pts.map(function (q) { return q[0] + ' ' + q[1]; }).join('L'), end = pts[pts.length - 1], vb = S.vb, w = 22, hh = 11, L = 0;
      var tr = sv('path', { d: d, fill: 'none', stroke: HOT.w, 'stroke-width': 1.8, opacity: 0 }, PGT);
      var sp = sv('circle', { cx: end[0], cy: end[1], r: 0, fill: HOT.w, opacity: 0, filter: 'url(#' + S.pid + '-glow)' }, S.gComet);
      var g = sv('g', { opacity: 0, 'class': 'f3c-pk f3c-pk-' + icon }, PGP);
      sv('rect', { x: -w / 2 - 0.5, y: -hh / 2 - 0.5, width: w + 1, height: hh + 1, rx: hh / 2 + 0.5, fill: '#fff', opacity: 0.9 }, g);
      sv('rect', { x: -w / 2, y: -hh / 2, width: w, height: hh, rx: hh / 2, fill: HOT.n }, g);
      if (icon === 'table') {   // (the label's table: a frame, its header rule and a column rule)
        sv('rect', { x: -4.3, y: -3.1, width: 8.6, height: 6.2, rx: 0.9, fill: 'none', stroke: '#fff', 'stroke-width': 1 }, g);
        sv('path', { d: 'M-4.3 -1H4.3M-1 -1V3.1', fill: 'none', stroke: '#fff', 'stroke-width': 0.9 }, g);
      } else {                  // (the label's pin)
        sv('path', { d: 'M0 6C-2.7 2.7-4.4 0.3-4.4-1.6A4.4 4.4 0 1 1 4.4-1.6C4.4 0.3 2.7 2.7 0 6Z', fill: '#fff', transform: 'translate(0 0.3) scale(0.64)' }, g);
        sv('circle', { cx: 0, cy: -0.79, r: 1.05, fill: HOT.n }, g);
      }
      S.fn(function (tl) {
        var t = SC(tl), p = (t - t0) / dur;
        if (p < 0 || t > t0 + dur + 0.95) { setOp(tr, 0); setOp(sp, 0); setOp(g, 0); return; }
        if (!L) { L = tr.getTotalLength() || 1; tr.setAttribute('stroke-dasharray', L.toFixed(2) + ' ' + (L + 1).toFixed(2)); }
        var u = sstep(0, 1, p);
        tr.setAttribute('stroke-dashoffset', (L * (1 - u)).toFixed(2));
        setOp(tr, 0.9 * (1 - sstep(t0 + dur + 0.4, t0 + dur + 0.9, t)));
        var s_ = (t - t0 - dur) / 0.45;
        if (s_ >= 0 && s_ <= 1) { sp.setAttribute('r', (2 + 6 * s_).toFixed(2)); setOp(sp, 0.7 * (1 - s_)); } else setOp(sp, 0);
        if (p > 1) { setOp(g, 0); return; }
        var q = tr.getPointAtLength(u * L);
        var qx = clamp(q.x, vb[0] + w / 2 + 2, vb[0] + vb[2] - w / 2 - 2), qy = clamp(q.y, vb[1] + hh / 2 + 2, vb[1] + vb[3] - hh / 2 - 2);
        g.setAttribute('transform', 'translate(' + qx.toFixed(2) + ' ' + qy.toFixed(2) + ')');
        setOp(g, Math.min(1, p / 0.08, (1 - p) / 0.05));   // (whole until it reaches the arrow's tip, where the spark takes over)
      });
    }
    lit('update.own_position', 'i', PUBP[0] - 0.05, PUBP[0] + 0.4, { pad: 2 });
    lit(['publish.chip', 'publish.label'], 'w', 26.1, 27.4, { pad: 2, ring: false, tint: 0.12 });
    var PUBO = Dg.path['a.publish_trunk'];   // the arrow, from the Own position slot into Player state O
    var PUBN = [[1234.56, 474.28], [1234.56, 513.16], [3.36, 513.16], [3.36, 266.81], [26.4, 266.81]];   // from the memory entry into the scene state
    pubPacket(PUBO, PUBP[0], PUBP[1], 'table');
    pubPacket(PUBN, PUBE[0], PUBE[1], 'pin');
    // the position arrives in Player state O (TPOS): i's row lights there and in the live table on the map, where i's
    // position takes the one it publishes; i's marker on the map, at that position, takes a soft light (drawMap: ig)
    lit('world.player_state', 'w', TPOS - 0.05, 28.3, { pad: 2 });
    lit('world.player_state.row.i', 'i', TPOS, 28.3, { pad: 1.5, ring: false, tint: 0.2 });
    link(TPOS, 27.85, 'i', 'world.player_state', function () { return getComputedStyle(pst).display === 'none' ? inMap([MS.P.i.px - 14, MS.P.i.py - 14, 28, 28]) : rel(pst); });
    // the entry arrives in the memory bank as it is written (frame 433): the scene state lights as it arrives (after Player
    // state O, as the packets do); its cameras at the doorway on the bank's map, its latent frames and depth; on the
    // stage's map its marker at i's place, and k adds it
    lit('world.scene_state', 'w', TPUB - 0.05, 28.3, { pad: 2 });
    lit([BK.latent.i.group.r], 'i', TBI, 28.3, { pad: 1.5 });
    lit('world.scene_state.camdepth.i', 'i', TBI, 28.3, { pad: 1.5 });
    lit([bankCamBox('i')], 'i', TBI, 28.3, { pad: 1, rx: 4 });
    link(TBI + 0.15, 28.1, 'i', 'world.scene_state.map', function () { return MS.nCard ? inMap(MS.nCard) : inMap([MS.nPt[0] - 12, MS.nPt[1] - 12, 24, 24]); }, true);
    /* the memory bank's contents (the entries of this example, as they are stored) */
    var BMR = BK.map.box;
    slot(BMR, 'f3c-bank f3c-bank-map', bankMapDraw(BMR), function () { return 1; });
    ['k', 'i'].forEach(function (c) {
      var gr = BK.latent[c].group.r, lr = [gr[0] - 1, gr[1] - 1, gr[2] + 2, gr[3] + 2], cb = Dg.box['world.scene_state.camdepth.' + c], cr = [cb[0] - 1, cb[1] - 1, cb[2] + 7, cb[3] + 6];
      slot(lr, 'f3c-bank f3c-bank-lat-' + c, bankLatDraw(c, lr), function () { return 1; });
      slot(cr, 'f3c-bank f3c-bank-cam-' + c, bankCamDraw(c, cr), function () { return 1; });
    });

    var lastChip = null, lastWho = null;
    S.onFrame = function (tl) {
      var t = SC(tl);
      var cr = card.getBoundingClientRect(), fr_ = S.stage.getBoundingClientRect(), sc = S.scroll || S.stage.parentNode, scr = sc.getBoundingClientRect();
      FIGR = { x: fr_.left - cr.left, y: fr_.top - cr.top, w: fr_.width, vb: Dg.vb };
      FSCR = scr.width + 2 < fr_.width ? [scr.left - cr.left, scr.top - cr.top, scr.width, scr.height] : null;
      drawMap(t, false);
      drawView(t, false);
      drawTable(t);
      drawLinks(tl);
      drawFly(t);
      drawSlots(t, tl);
      vsync(t, S.playing);
      // (what the view shows: block n (its field, the read in its cameras, its generator input and frames); i's frame 416
      // and its points in its own camera, of block n - 1)
      var chip = t < 6.6 || t >= T - 0.4 ? '' : t >= STEPS[2].t[0] && t < TURN[0] ? 'block <em>n</em>\u2009\u2212\u20091' : 'block <em>n</em>', who = t < 3.7 ? 'k' : 'i';
      if (chip !== lastChip) { lastChip = chip; chipSub.innerHTML = chip; }
      if (who !== lastWho) { lastWho = who; if (chipWho) chipWho.textContent = who; if (chipEl) chipEl.style.setProperty('--c', HOT[who]); }
    };
    S.onPause = function () { if (!video.paused) video.pause(); };
    S.onSeek = function (tl) { if (video.readyState >= 1) { try { video.currentTime = (seg(VK, SC(tl)).p - F0) / D.fps; } catch (e) { /* ignore */ } } };
    function relayout() { layout(); L.map = rel(mapBox); L.view = rel(viewBox); L.stage = rel(stageEl); SLOTS.forEach(function (o) { o.key = null; }); FK.forEach(function (o) { o.key = ''; }); FS.key = ''; S.render(S.t); }
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(card); else window.addEventListener('resize', relayout);
    L.map = rel(mapBox); L.view = rel(viewBox); L.stage = rel(stageEl);
    S.render(0);
  }
  // the figure's Missing pixels image: block n's camera of frame 428 at the read's cells (missComp), drawn at the slot's size
  // in screen pixels, without smoothing (each screen pixel shows the cell it lies in)
  function missDraw(x, w, h, t, still) {
    var c = missComp(t, !!still);
    if (!c) return false;
    x.imageSmoothingEnabled = false;
    x.drawImage(c, 0, 0, w, h);
    return true;
  }
  function screenPx() { return clamp(window.devicePixelRatio || 1, 1, 4); }

  /* ---------------- reduced motion: one still frame of the case above the figure ---------------- */
  // The map with k's card retrieved for block n and, in the view, the read of camera 428 with k's points in the cells its
  // entry covers (the point view's end state); in the figure (its demo variant), what the loop shows at that moment: the
  // memory bank holding k's entry, lit as retrieved (its cameras on the bank's map, its latent frames, their depth), its
  // four latent frames fetched into the retrieved entry, k's coverage (the entry the bank holds, marked as retrieved; the
  // rows of i and j dimmed) and the Missing pixels slot (block n's camera of frame 428, k's covered cells filled). The rest
  // of the figure is the demo variant's (the paper's, without its example values).
  function stillFig() {
    var FD3 = ((window.WC_DATA || {}).figs || {}).fig3, st = fig.querySelector('.ofig-stage');
    if (!FD3 || !st) return null;
    var vb = FD3.vb, lay = mk('div', 'ofig-media', st), svg = sv('svg', { 'class': 'ofig-fx', viewBox: vb.join(' '), 'aria-hidden': 'true', focusable: 'false' }, st);
    // (k's coverage, the entry the bank holds: its share of the missing pixels, filled as the paper fills the retrieved
    // entry's bar; the rows of i and j, with no entry in the bank, and j's table row dimmed, as in the loop)
    var CT = FD3.slot['coverage.track.2'];
    sv('rect', { x: CT[0], y: CT[1], width: (CT[2] * B.share.k).toFixed(2), height: CT[3], rx: BK.cov.rx, fill: BK.cov.max }, svg);
    [FD3.box['world.player_state.row.j'], FD3.box['read.coverage.bar.i'], FD3.box['read.coverage.bar.j']].forEach(function (r) {
      sv('rect', { x: r[0] - 1.5, y: r[1] - 1.5, width: r[2] + 3, height: r[3] + 3, rx: 2, fill: '#fbfcfe', opacity: 0.62 }, svg);
    });
    // (k's entry, retrieved: lit in the bank as the loop lights it)
    [BK.latent.k.group.r, FD3.box['world.scene_state.camdepth.k'], bankCamBox('k')].forEach(function (r) {
      sv('rect', { x: r[0] - 2, y: r[1] - 2, width: r[2] + 4, height: r[3] + 4, rx: 4, fill: 'none', stroke: HOT.k, 'stroke-width': 1.3 }, svg);
    });
    function box(r, cls) {
      var d = mk('div', 'om om-slot' + (cls ? ' ' + cls : ''), lay), c = mk('canvas', null, d);
      d.style.left = ((r[0] - vb[0]) / vb[2] * 100) + '%'; d.style.top = ((r[1] - vb[1]) / vb[3] * 100) + '%';
      d.style.width = (r[2] / vb[2] * 100) + '%'; d.style.height = (r[3] / vb[3] * 100) + '%';
      return { d: d, c: c };
    }
    var gr = BK.latent.k.group.r, lr = [gr[0] - 1, gr[1] - 1, gr[2] + 2, gr[3] + 2], cb = FD3.box['world.scene_state.camdepth.k'], cr = [cb[0] - 1, cb[1] - 1, cb[2] + 7, cb[3] + 6];
    var parts = [
      { b: box(FD3.slot['missing.img'], 'f3c-miss'), px: screenPx, draw: function (x, w, h) { return missDraw(x, w, h, 0, true); } },
      { b: box(BK.map.box, 'f3c-bank f3c-bank-map'), draw: bankMapDraw(BK.map.box) }, { b: box(lr, 'f3c-bank f3c-bank-lat-k'), draw: bankLatDraw('k', lr) },
      { b: box(cr, 'f3c-bank f3c-bank-cam-k'), draw: bankCamDraw('k', cr) }
    ];
    B.mem.forEach(function (fm, m) { parts.push({ b: box(FD3.slot['retrieved.token.' + m]), draw: function (x, w, h) { return drawCover(x, spr('kv', fm), 0, 0, w, h); } }); });
    return function () {
      parts.forEach(function (p) {
        var sc = p.px ? p.px() : Math.min(3, (window.devicePixelRatio || 1) * 1.5), c = p.b.c, w = Math.max(1, Math.round(p.b.d.clientWidth * sc)), h = Math.max(1, Math.round(p.b.d.clientHeight * sc));
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
        var x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); x.imageSmoothingQuality = 'high';
        setOp(p.b.d, p.draw(x, w, h, 0, true) === false ? 0 : 1);
      });
    };
  }
  function still() {
    stageEl.classList.add('is-still');
    chipSub.innerHTML = 'block <em>n</em>';
    var figDraw = stillFig();
    function draw() { layout(); drawMap(0, true); drawView(0, true); if (figDraw) figDraw(); }
    var go = function () {
      [D.map.img, D.spr.kv.img, D.spr.dk.img, FILL.img].forEach(img);
      onImg.push(function (name) { if (name === FILL.img) fill4(); MKEY = ''; draw(); }); draw();
      ptsLoad(function () { MKEY = ''; draw(); });
      if ('ResizeObserver' in window) new ResizeObserver(draw).observe(fig); else window.addEventListener('resize', draw);
    };
    video.removeAttribute('aria-label'); video.setAttribute('aria-hidden', 'true');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[en.length - 1].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '80% 0px 80% 0px' });
      io.observe(fig);
    } else go();
  }

  // (should the loop fail to build, main.js shows the figure as it is: then the paper's own)
  if (motion) window.WC_F3CASE = function (S) { try { build(S); } catch (err) { if (FIGIMG && PAPER_SRC) FIGIMG.src = PAPER_SRC; throw err; } };
  else still();
})();
