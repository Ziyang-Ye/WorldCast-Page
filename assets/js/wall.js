/*!
 * WorldCast project page: the opening wall.
 * A tilted, slowly drifting wall of WorldCast-generated views, drawn from ONE atlas video
 * (32 three-second loops, 8 per map, packed into one 2320x1904 frame: one decoder, one texture upload per
 * video frame; tile list in assets/data/wall.json, rebuilt by tools/build_wall.py). On load, an 8-fold kaleidoscope of the wall
 * opens like an iris onto the wall itself. Backends: WebGL (tiles -> framebuffer -> post pass),
 * Canvas 2D (one affine draw per tile) when WebGL or the video texture is unavailable.
 * With opts.static (reduced motion) it draws the poster once: no video, no drift, no intro.
 * Two streams of the same frames: 'base', a half-size copy of the atlas (WC_WALL.lite, about a tenth of the bytes: it
 * plays within seconds on a slow connection), then 'up', the atlas itself, which takes over once it is buffered to the
 * end. Without WC_WALL.lite the atlas is the base. The page's load queue (assets/js/main.js) gives each stream its
 * sources (video._srcs) when its turn comes.
 */
(function () {
  'use strict';

  // layout of the atlas: window.WC_WALL from assets/media/wall/layout.js (written by tools/build_wall.py from
  // assets/data/wall.json)
  var ATLAS = window.WC_WALL;

  /* ---------- tiny mat4 (column-major) ---------- */
  function m4() { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(o, a, b) {
    var r = new Float32Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
    o.set(r); return o;
  }
  function persp(o, fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf; return o;
  }
  function lookAt(o, e, c) {
    var z0 = e[0] - c[0], z1 = e[1] - c[1], z2 = e[2] - c[2], l = Math.hypot(z0, z1, z2) || 1;
    z0 /= l; z1 /= l; z2 /= l;
    var x0 = z2, x1 = 0, x2 = -z0;
    l = Math.hypot(x0, x1, x2) || 1; x0 /= l; x1 /= l; x2 /= l;
    var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    o[0] = x0; o[1] = y0; o[2] = z0; o[3] = 0;
    o[4] = x1; o[5] = y1; o[6] = z1; o[7] = 0;
    o[8] = x2; o[9] = y2; o[10] = z2; o[11] = 0;
    o[12] = -(x0 * e[0] + x1 * e[1] + x2 * e[2]);
    o[13] = -(y0 * e[0] + y1 * e[1] + y2 * e[2]);
    o[14] = -(z0 * e[0] + z1 * e[1] + z2 * e[2]); o[15] = 1;
    return o;
  }
  function rotXZ(o, rx, rz) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    o.fill(0);
    o[0] = cz; o[1] = cx * sz; o[2] = sx * sz;
    o[4] = -sz; o[5] = cx * cz; o[6] = sx * cz;
    o[9] = -sx; o[10] = cx; o[15] = 1;
    return o;
  }
  function tp(m, x, y, z) {
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
  }
  function inv(o, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],
      b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32,
      d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!d) return null; d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
    return o;
  }
  function hash(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------- shaders ---------- */
  var VS_TILE = [
    'attribute vec3 aPos; attribute vec2 aUv; attribute vec2 aLocal; attribute float aShade;',
    'uniform mat4 uMVP; uniform float uFogNear; uniform float uFogFar;',
    'varying vec2 vUv; varying vec2 vLocal; varying float vShade;',
    'void main(){',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '  float fog = clamp((gl_Position.w - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);',
    '  vUv = aUv; vLocal = aLocal; vShade = aShade * (1.0 - 0.72 * fog);',
    '}'
  ].join('\n');
  function fsTile(deriv) {
    return (deriv ? '#extension GL_OES_standard_derivatives : enable\n' : '') + [
      'precision mediump float;',
      'uniform sampler2D uTex; uniform vec2 uTile; uniform float uRadius;',
      'varying vec2 vUv; varying vec2 vLocal; varying float vShade;',
      'void main(){',
      '  vec2 p = (vLocal - 0.5) * uTile;',
      '  vec2 q = abs(p) - (uTile * 0.5 - uRadius);',
      '  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;',
      deriv ? '  float aa = max(fwidth(d), 1e-4);' : '  float aa = 0.012;',
      '  float a = 1.0 - smoothstep(-aa, aa, d);',
      '  vec3 c = texture2D(uTex, vUv).rgb * vShade;',
      '  float rim = smoothstep(-aa * 3.0, 0.0, d) * 0.08 * vShade;',
      '  gl_FragColor = vec4((c + rim) * a, a);',
      '}'
    ].join('\n');
  }
  var VS_POST = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';
  var FS_POST = [
    'precision highp float;',
    'uniform sampler2D uScene; uniform vec2 uRes; uniform float uKal; uniform float uKalRot; uniform float uTime; uniform float uGrain;',
    'varying vec2 vUv;',
    'vec2 mirror(vec2 u){ return 1.0 - abs(1.0 - mod(u, 2.0)); }',
    'void main(){',
    '  vec3 col = texture2D(uScene, vUv).rgb;',
    '  if (uKal > 0.001) {',
    '    float asp = uRes.x / uRes.y;',
    '    vec2 p = (vUv - 0.5) * vec2(asp, 1.0);',
    '    float r = length(p);',
    '    float a = atan(p.y, p.x) + uKalRot;',
    '    float seg = 6.28318530718 / 8.0;',
    '    a = mod(a, seg); a = abs(a - 0.5 * seg);',
    '    vec2 k = vec2(cos(a), sin(a)) * r * (0.5 + 0.25 * uKal) + vec2(0.16, 0.04);',
    '    vec3 kal = texture2D(uScene, mirror(k / vec2(asp, 1.0) + 0.5)).rgb;',
    '    float hd = 0.5 * length(vec2(asp, 1.0));',
    '    float R = mix(hd + 0.25, -0.12, uKal);',
    '    float m = smoothstep(R - 0.09, R + 0.09, r);',
    '    float rim = exp(-pow((r - R) / 0.018, 2.0)) * 0.2 * smoothstep(0.0, 0.15, uKal);',
    '    col = mix(col, kal * 0.92, m) + rim;',
    '  }',
    '  float n = fract(sin(dot(floor(gl_FragCoord.xy) + fract(uTime * 7.13) * vec2(97.0, 57.0), vec2(12.9898, 78.233))) * 43758.5453);',
    '  col += (n - 0.5) * uGrain;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function create(canvas, opts) {
    opts = opts || {};
    var A = ATLAS;
    var TW = 2.0, TH = TW * A.th / A.tw, G = 0.16, PX = TW + G, PY = TH + G, RADIUS = 0.07;
    var FOV = 38 * Math.PI / 180;
    var intro = opts.static ? 1 : 0;
    var cols = {};
    var time = 0, last = 0, raf = 0, introStart = -1;
    var dpr = 1, W = 0, H = 0, D = 10;
    var M = m4(), V = m4(), P = m4(), VP = m4(), MVP = m4();
    var backend = null, ready = false, texSource = null, newFrame = false, active = false, gotVideo = false;
    var tiles = [];

    var poster = new Image();
    poster.decoding = 'async';
    // video: the stream drawn. A stream gets its sources (MP4 and VP9 WebM: the browser falls back to the second) only
    // when the load queue gives them
    var video = null, streams = null;
    function stream(mp4, webm, mp4Type, webmType) {
      var v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.preload = 'none';
      v._srcs = [[mp4, mp4Type], [webm, webmType]];
      v.addEventListener('loadeddata', function () { if (v === video) newFrame = true; });
      v.addEventListener('emptied', function () { v._cue = 0; });   // (its sources were taken back: cue it again when it returns)
      v.addEventListener('canplay', function () { if (v === video && active && v.paused) playV(v); });   // (sources given after setActive)
      if (v.requestVideoFrameCallback) {
        var cb = function () { if (v === video) newFrame = true; v.requestVideoFrameCallback(cb); };
        v.requestVideoFrameCallback(cb);
      }
      return v;
    }
    if (!opts.static) {
      var full = stream(A.mp4, A.webm, A.mp4Type, A.webmType), L = A.lite;
      streams = { base: L ? stream(L.mp4, L.webm, L.mp4Type || 'video/mp4', L.webmType || 'video/webm') : full, up: L ? full : null };
      video = streams.base;
    }
    function playV(v) { if (!v) return; try { var p = v.play(); if (p && p.catch) p.catch(function () { }); } catch (e) { /* ignore */ } }
    function play() { playV(video); }
    // the atlas takes over from the half-size copy once it is buffered to the end: it waits, paused, 0.3 s ahead of
    // the copy's time and starts when the copy gets there (the same frames, so the change is only in sharpness)
    function whole(v) { var b = v.buffered, d = v.duration; return !!d && b.length === 1 && b.start(0) <= 0.1 && b.end(0) >= d - 0.1; }
    function upgrade() {
      var up = streams && streams.up;
      if (!up || video === up || up.readyState < 3 || !whole(up) || video.readyState < 2) return;
      var d = up.duration || 3, t = (video.currentTime || 0) % d;
      if (!up._cue) { up._cue = 1; up._at = (t + 0.3) % d; up.pause(); try { up.currentTime = up._at; } catch (e) { /* ignore */ } return; }
      if (up.seeking) return;
      var w = t - up._at;
      if (w < -d / 2) w += d; else if (w > d / 2) w -= d;
      if (w < 0) return;                        // not there yet
      if (w > 0.15) { up._cue = 0; return; }    // passed it (a slow frame): wait ahead again
      playV(up);
      var old = video;
      video = up; newFrame = true; old.pause();
      if (opts.onStream) opts.onStream('up', old);
    }

    function colState(c) {
      var s = cols[c];
      if (!s) {
        var h = hash(c, 3.1);
        s = cols[c] = {
          off: (h * 7.0) * PY,
          v: (0.08 + 0.08 * hash(c, 9.7)) * (mod(c, 2) ? -1 : 1),
          z: (hash(c, 5.3) - 0.5) * 0.5
        };
      }
      return s;
    }
    function tileIndex(c, k) { return mod(c * 13 + k * 7, A.n); }
    var UV = [];
    for (var i = 0; i < A.n; i++) {
      var cx = i % A.cols, cy = Math.floor(i / A.cols);
      var x0 = cx * A.cw + A.pad + 1, y0 = cy * A.ch + A.pad + 1, w = A.tw - 2, h = A.th - 2;
      UV.push([x0 / A.w, y0 / A.h, (x0 + w) / A.w, (y0 + h) / A.h, x0, y0, w, h]);
    }

    function update(dt) {
      var it = easeOut3(clamp(intro, 0, 1));
      if (!opts.static) for (var key in cols) cols[key].off += cols[key].v * dt;
      var asp = W / Math.max(H, 1);
      var across = asp >= 1 ? 5.2 : 2.4;
      D = (across * PX) / (2 * Math.tan(FOV / 2) * asp) * 0.94;
      D *= 1 + 0.9 * (1 - it);
      rotXZ(M, 0.42, -0.24 + (1 - it) * 0.42);
      persp(P, FOV, asp, 0.05, 200);
      lookAt(V, [0, 0, D], [0, 0, 0]);
      mul(VP, P, V); mul(MVP, VP, M);
      // visible part of the wall plane: intersect screen-corner rays with z = 0
      var IM = inv(m4(), MVP), xs = [], ys = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1], [0, -1]].forEach(function (q) {
        var a = tp(IM, q[0], q[1], -1), b = tp(IM, q[0], q[1], 1);
        a = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; b = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
        var dz = b[2] - a[2], t = Math.abs(dz) < 1e-6 ? 1 : -a[2] / dz;
        if (!(t > 0)) t = 1; if (t > 1) t = 1;
        xs.push(a[0] + (b[0] - a[0]) * t); ys.push(a[1] + (b[1] - a[1]) * t);
      });
      var xmin = clamp(Math.min.apply(0, xs), -60, 60) - TW, xmax = clamp(Math.max.apply(0, xs), -60, 60) + TW;
      var ymin = clamp(Math.min.apply(0, ys), -60, 60) - TH, ymax = clamp(Math.max.apply(0, ys), -60, 60) + TH;
      tiles.length = 0;
      var cmin = Math.floor(xmin / PX), cmax = Math.ceil(xmax / PX);
      if (cmax - cmin > 40) { cmin = -20; cmax = 20; }
      for (var c = cmin; c <= cmax; c++) {
        var cs = colState(c);
        var kmin = Math.floor((ymin - cs.off) / PY), kmax = Math.ceil((ymax - cs.off) / PY);
        if (kmax - kmin > 60) { kmin = -30; kmax = 30; }
        for (var kk = kmin; kk <= kmax; kk++) {
          tiles.push({ x: c * PX, y: kk * PY + cs.off, z: cs.z, i: tileIndex(c, kk), s: 0.7 + 0.26 * hash(c, kk) });
        }
      }
    }

    /* ---------- WebGL ---------- */
    function makeGL() {
      var gl = null;
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      try { gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs); } catch (err) { gl = null; }
      if (!gl) return null;
      var deriv = !!gl.getExtension('OES_standard_derivatives');
      function sh(type, s) {
        var o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      }
      function prog(vs, fs) {
        var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        return p;
      }
      var pt, pp;
      try { pt = prog(VS_TILE, fsTile(deriv)); pp = prog(VS_POST, FS_POST); } catch (err) { return null; }
      var loc = {
        aPos: gl.getAttribLocation(pt, 'aPos'), aUv: gl.getAttribLocation(pt, 'aUv'), aLocal: gl.getAttribLocation(pt, 'aLocal'), aShade: gl.getAttribLocation(pt, 'aShade'),
        uMVP: gl.getUniformLocation(pt, 'uMVP'), uTex: gl.getUniformLocation(pt, 'uTex'), uTile: gl.getUniformLocation(pt, 'uTile'), uRadius: gl.getUniformLocation(pt, 'uRadius'),
        uFogNear: gl.getUniformLocation(pt, 'uFogNear'), uFogFar: gl.getUniformLocation(pt, 'uFogFar'),
        pPos: gl.getAttribLocation(pp, 'aPos'), uScene: gl.getUniformLocation(pp, 'uScene'), uRes: gl.getUniformLocation(pp, 'uRes'),
        uKal: gl.getUniformLocation(pp, 'uKal'), uKalRot: gl.getUniformLocation(pp, 'uKalRot'), uTime: gl.getUniformLocation(pp, 'uTime'), uGrain: gl.getUniformLocation(pp, 'uGrain')
      };
      var vbuf = gl.createBuffer(), ibuf = gl.createBuffer(), qbuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qbuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var MAXT = 1200, idx = new Uint16Array(MAXT * 6);
      for (var t = 0; t < MAXT; t++) { var b = t * 4; idx.set([b, b + 1, b + 2, b, b + 2, b + 3], t * 6); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      var verts = new Float32Array(MAXT * 32);
      function tex() {
        var tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tx;
      }
      var atlasTex = tex(), fboTex = tex(), fbo = gl.createFramebuffer(), fw = 0, fh = 0;
      function upload(source) {
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source); // may throw SecurityError (file://)
      }
      function quad(arr, o, T, u) {
        var x0 = T.x - TW / 2, x1 = T.x + TW / 2, y0 = T.y - TH / 2, y1 = T.y + TH / 2;
        arr.set([x0, y1, T.z, u[0], u[1], 0, 1, T.s, x1, y1, T.z, u[2], u[1], 1, 1, T.s,
          x1, y0, T.z, u[2], u[3], 1, 0, T.s, x0, y0, T.z, u[0], u[3], 0, 0, T.s], o);
      }
      function resize() {
        if (fw === W && fh === H) return;
        fw = W; fh = H;
        gl.bindTexture(gl.TEXTURE_2D, fboTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      function draw() {
        resize();
        var n = Math.min(tiles.length, MAXT), o = 0;
        for (var j = 0; j < n; j++) { quad(verts, o, tiles[j], UV[tiles[j].i]); o += 32; }
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(pt);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
        gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, o), gl.DYNAMIC_DRAW);
        var st = 32;
        gl.enableVertexAttribArray(loc.aPos); gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, st, 0);
        gl.enableVertexAttribArray(loc.aUv); gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, st, 12);
        gl.enableVertexAttribArray(loc.aLocal); gl.vertexAttribPointer(loc.aLocal, 2, gl.FLOAT, false, st, 20);
        gl.enableVertexAttribArray(loc.aShade); gl.vertexAttribPointer(loc.aShade, 1, gl.FLOAT, false, st, 28);
        gl.uniformMatrix4fv(loc.uMVP, false, MVP);
        gl.uniform2f(loc.uTile, TW, TH); gl.uniform1f(loc.uRadius, RADIUS);
        gl.uniform1f(loc.uFogNear, D * 0.95); gl.uniform1f(loc.uFogFar, D * 2.1);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex); gl.uniform1i(loc.uTex, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
        if (n) gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
        gl.disableVertexAttribArray(loc.aUv); gl.disableVertexAttribArray(loc.aLocal); gl.disableVertexAttribArray(loc.aShade);
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        gl.useProgram(pp);
        gl.bindBuffer(gl.ARRAY_BUFFER, qbuf);
        gl.enableVertexAttribArray(loc.pPos); gl.vertexAttribPointer(loc.pPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.uniform1i(loc.uScene, 0);
        gl.uniform2f(loc.uRes, W, H);
        gl.uniform1f(loc.uKal, 1 - easeInOut(clamp((intro - 0.12) / 0.8, 0, 1)));
        gl.uniform1f(loc.uKalRot, (1 - easeOut3(intro)) * 1.6 + time * 0.05);
        gl.uniform1f(loc.uTime, time);
        gl.uniform1f(loc.uGrain, opts.static ? 0 : 0.035);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); fallback(); }, false);
      return { kind: 'webgl', upload: upload, draw: draw };
    }

    /* ---------- Canvas 2D ---------- */
    function make2D() {
      var ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;
      var buf = document.createElement('canvas'); buf.width = A.w; buf.height = A.h;
      var bctx = buf.getContext('2d');
      function upload(source) { bctx.drawImage(source, 0, 0, A.w, A.h); }
      function proj(x, y, z) { var p = tp(MVP, x, y, z); return [(p[0] / p[3] * 0.5 + 0.5) * W, (0.5 - p[1] / p[3] * 0.5) * H, p[3]]; }
      function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (var j = 0; j < tiles.length; j++) {
          var T = tiles[j], u = UV[T.i];
          var p00 = proj(T.x - TW / 2, T.y + TH / 2, T.z), p10 = proj(T.x + TW / 2, T.y + TH / 2, T.z), p01 = proj(T.x - TW / 2, T.y - TH / 2, T.z);
          if (p00[2] <= 0 || p10[2] <= 0 || p01[2] <= 0) continue;
          var fog = clamp((p00[2] - D * 0.95) / (D * 1.15), 0, 1);
          var alpha = clamp(T.s * (1 - 0.72 * fog), 0, 1);
          if (alpha < 0.02) continue;
          var sw = u[6], shh = u[7];
          ctx.setTransform((p10[0] - p00[0]) / sw, (p10[1] - p00[1]) / sw, (p01[0] - p00[0]) / shh, (p01[1] - p00[1]) / shh, p00[0], p00[1]);
          ctx.globalAlpha = alpha;
          ctx.save(); ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(0, 0, sw, shh, RADIUS / TW * sw); else ctx.rect(0, 0, sw, shh);
          ctx.clip(); ctx.drawImage(buf, u[4], u[5], sw, shh, 0, 0, sw, shh); ctx.restore();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      }
      return { kind: '2d', upload: upload, draw: draw };
    }

    function fallback() {
      if (backend && backend.kind === '2d') return;
      var c2 = document.createElement('canvas');
      c2.className = canvas.className; c2.setAttribute('aria-hidden', 'true');
      canvas.parentNode.replaceChild(c2, canvas);
      canvas = c2;
      backend = make2D();
      sizeCanvas();
      if (texSource && backend) { try { backend.upload(texSource); } catch (e) { /* ignore */ } }
    }
    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 735 ? 1.5 : 1.75);
      var r = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      W = w; H = h;
    }
    function tryUpload(source) {
      if (!backend) return false;
      try { backend.upload(source); texSource = source; return true; }
      catch (err) {
        fallback();
        try { backend.upload(source); texSource = source; return true; } catch (e2) { return false; }
      }
    }
    function render(dt) { if (!ready || !backend) return; update(dt); backend.draw(); }
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
      last = now; time += dt;
      if (ready && intro < 1) {
        if (introStart < 0) introStart = now;
        intro = Math.min(1, (now - introStart) / 3200);
      }
      if (streams && streams.up && video !== streams.up) upgrade();
      if (newFrame && video && video.readyState >= 2) { newFrame = false; if (tryUpload(video)) gotVideo = true; }
      render(dt);
      if (active) raf = requestAnimationFrame(frame);
    }

    backend = makeGL();
    if (!backend) backend = make2D();
    sizeCanvas();
    window.addEventListener('resize', function () { sizeCanvas(); if (!active) render(0); }, { passive: true });

    poster.onload = function () {
      var go = function () {
        if (!gotVideo) tryUpload(poster);
        ready = true;
        if (opts.onReady) opts.onReady();
        render(0.016);
      };
      if (poster.decode) poster.decode().then(go, go); else go();
    };
    poster.src = A.poster;
    if (video && !video.requestVideoFrameCallback) setInterval(function () { if (!video.paused) newFrame = true; }, 62);

    return {
      setActive: function (on) {
        on = !!on;
        if (opts.static) { render(0); return; }
        if (on === active) return;
        active = on;
        if (on) { last = 0; play(); if (!raf) raf = requestAnimationFrame(frame); }
        else { if (streams) { streams.base.pause(); if (streams.up) streams.up.pause(); } if (raf) cancelAnimationFrame(raf); raf = 0; }
      },
      get video() { return video; },
      streams: streams
    };
  }

  window.WorldCastWall = { create: create };
})();
