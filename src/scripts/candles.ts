/*
  Candlelight hero.

  One full-screen WebGL fragment shader draws everything: Julian's Milky Way photo as
  the night sky, a few wax candles on a dark table, procedural flames, the light they
  throw on the wax and the table, reflections, and smoke when a flame goes out.

  Interaction
  - Move the pointer through the air near a flame and it leans and flickers.
  - Move fast through a flame (or tap it on a phone) and it goes out.
  - Click or tap a dark candle to light it again. Out candles relight on their own.
  - Blow out every candle and the room goes dark: the sky slowly brightens,
    the way your eyes adapt to the dark.
*/

const MAX = 7;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
#define MAXC ${MAX}
uniform vec2 uRes;
uniform float uTime;
uniform float uMotion;          // 0 = reduced motion
uniform int uN;
uniform vec4 uC[MAXC];          // x, baseY, height, width
uniform vec4 uS[MAXC];          // lit, lean, seed, smokeAge (<0: none)
uniform float uTableY;
uniform float uDark;            // 0..1 dark adaptation
uniform sampler2D uSky;
uniform vec4 uSkyT;             // scale.xy, offset.zw
uniform float uHasSky;
uniform float uScale;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Flame in local units: origin at wick tip, y up, 1.0 = flame height.
vec3 flame(vec2 p, float t, float seed, float lean, float lit) {
  if (lit <= 0.001) return vec3(0.0);
  float m = uMotion;
  float flick = 0.88 + 0.12 * noise(vec2(t * 7.0, seed * 13.0)) * m + 0.05 * sin(t * 23.0 + seed * 6.0) * m;
  float h = flick * mix(0.25, 1.0, lit);
  p.y /= h;
  float sway = (noise(vec2(t * 1.7 + seed * 3.1, 0.0)) - 0.5) * 0.22 * m;
  p.x -= (lean * 0.9 + sway) * p.y * p.y;
  p.x += (noise(vec2(p.y * 5.0 - t * 8.0 * m, seed * 7.0)) - 0.5) * 0.06 * clamp(p.y, 0.0, 1.0) * m;

  float y = p.y;
  float w;
  if (y < 0.24) { float e = (0.24 - y) / 0.27; w = 0.165 * sqrt(max(0.0, 1.0 - e * e)); }
  else { w = 0.165 * pow(max(0.0, 1.0 - (y - 0.24) / 0.76), 1.25); }
  float d = abs(p.x) / max(w, 0.0005);
  float inside = (y > -0.04 && y < 1.0) ? 1.0 : 0.0;

  float body = smoothstep(1.05, 0.55, d) * inside;
  float core = smoothstep(0.62, 0.0, d) * smoothstep(0.78, 0.28, y) * smoothstep(-0.02, 0.16, y) * inside;
  float base = smoothstep(0.17, -0.02, y) * smoothstep(1.0, 0.3, d) * inside;

  vec3 col = vec3(1.0, 0.46, 0.12) * body * 0.9;
  col = mix(col, vec3(1.0, 0.74, 0.36), body * smoothstep(0.75, 0.2, d));
  col += vec3(1.0, 0.96, 0.84) * core * 1.25;
  col = mix(col, vec3(0.22, 0.32, 1.0) * 0.55, base * (1.0 - core) * 0.85);

  float halo = exp(-length(vec2(p.x * 1.25, p.y - 0.32)) * 4.2) * 0.32;
  col += vec3(1.0, 0.55, 0.2) * halo;
  return col * lit;
}

// Everything above the table: sky, candles, flames, smoke. Returns colour.
vec3 scene(vec2 p, bool reflected) {
  float t = uTime;
  vec3 col = vec3(0.0);

  // Light from all flames, used to light wax and table and to wash out the sky
  vec3 light = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < MAXC; i++) {
    if (i >= uN) break;
    vec4 c = uC[i]; vec4 s = uS[i];
    float fh = c.w * 2.1;
    vec2 fc = vec2(c.x + s.y * fh * 0.25, c.y + c.z + fh * 0.4);
    float f = s.x * (0.85 + 0.15 * noise(vec2(t * 6.0, s.z * 9.0)) * uMotion);
    vec2 dv = p - fc;
    light += vec3(1.0, 0.6, 0.28) * f * 0.012 * uScale / (dot(dv, dv) + 0.004 * uScale);
    total += f;
  }

  // Sky
  if (!reflected) {
    vec3 sky = vec3(0.035, 0.03, 0.06);
    if (uHasSky > 0.5) {
      vec2 suv = (gl_FragCoord.xy / uRes) * uSkyT.xy + uSkyT.zw;
      suv = (suv - 0.5) * 0.9 + 0.5 + vec2(sin(t * 0.012) * 0.04 * uMotion, 0.0);
      vec3 photo = texture2D(uSky, suv).rgb;
      float pollute = clamp(total / float(uN), 0.0, 1.0);
      float bright = mix(0.3, 1.05, uDark) * mix(1.0, 0.65, pollute);
      sky = max(sky, photo * bright);
    }
    // horizon haze
    float hz = exp(-max(p.y - uTableY, 0.0) * 6.0);
    sky += vec3(0.08, 0.05, 0.09) * hz * 0.6;
    col = sky + light * 0.06;
  }

  for (int i = 0; i < MAXC; i++) {
    if (i >= uN) break;
    vec4 c = uC[i]; vec4 s = uS[i];
    float cx = c.x, by = c.y, ch = c.z, cw = c.w;
    float top = by + ch;
    float hw = cw * 0.5;
    float u = (p.x - cx) / hw;

    // candle body
    if (abs(u) < 1.0 && p.y > by && p.y < top + hw * 0.18 * sqrt(max(0.0, 1.0 - u * u))) {
      float cyl = sqrt(max(0.0, 1.0 - u * u));
      vec3 wax = mix(vec3(0.95, 0.9, 0.82), vec3(0.93, 0.83, 0.7), fract(s.z * 7.0));
      float below = top - p.y;
      float own = s.x * exp(-below / (cw * 0.9));
      float glow = own * (0.55 + 0.45 * cyl) * (0.9 + 0.1 * noise(vec2(t * 7.0, s.z)) * uMotion);
      float fall = exp(-below / (ch * 0.9 + 0.05));
      vec3 lit = wax * (0.02 + cyl * min(light, vec3(1.2)) * 0.16 * (0.35 + 0.65 * fall)) + vec3(1.0, 0.6, 0.28) * glow * 0.9;
      // rim to show the round shape
      lit *= 0.55 + 0.45 * cyl;
      // drips
      float drip = smoothstep(0.02, 0.0, abs(fract(u * 1.7 + s.z) - 0.5) - 0.12) * smoothstep(top - cw * (0.5 + 0.9 * hash(vec2(floor(u * 1.7 + s.z), s.z))), top, p.y);
      lit += wax * drip * 0.06 * (0.3 + own);
      // wax pool on top
      float topE = (p.y - top) / (hw * 0.18);
      if (topE > -1.0) { lit = mix(lit, vec3(1.0, 0.7, 0.4) * (0.25 + 0.9 * s.x), 0.35 * smoothstep(-1.0, 0.5, topE)); }
      col = lit;
    }

    // wick
    vec2 wp = p - vec2(cx, top);
    if (abs(wp.x) < cw * 0.035 && wp.y > 0.0 && wp.y < cw * 0.28) {
      float ember = s.w >= 0.0 ? exp(-s.w * 1.4) : 0.0;
      col = mix(vec3(0.05, 0.04, 0.04), vec3(1.0, 0.35, 0.08) * 1.6, max(ember, s.x * smoothstep(cw * 0.14, cw * 0.28, wp.y)));
    }

    // flame
    float fh = cw * 2.1;
    vec2 fp = (p - vec2(cx, top + cw * 0.18)) / fh;
    col += flame(fp, t, s.z, s.y, s.x) * (reflected ? 0.55 : 1.0);

    // smoke after a flame goes out
    if (s.w >= 0.0 && s.w < 5.0 && !reflected) {
      vec2 sp = (p - vec2(cx, top + cw * 0.25)) / (cw * 7.0);
      if (sp.y > 0.0) {
        float age = s.w;
        float off = sin(sp.y * 9.0 - age * 2.2 + s.z * 5.0) * 0.06 * sp.y + (noise(vec2(sp.y * 6.0 - age, s.z)) - 0.5) * 0.12 * sp.y;
        float widthS = 0.006 + 0.05 * sp.y;
        float a = exp(-abs(sp.x - off) / widthS) * smoothstep(0.0, 0.03, sp.y) * exp(-sp.y * 2.2);
        a *= smoothstep(age * 0.55 + 0.05, age * 0.55 - 0.15, sp.y);          // rises over time
        a *= (1.0 - smoothstep(1.5, 5.0, age));
        col += vec3(0.62, 0.6, 0.66) * a * 0.55;
      }
    }
  }
  return col;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 col;
  if (p.y >= uTableY) {
    col = scene(p, false);
  } else {
    // table: dark wood-ish surface lit by the candles, with a soft reflection
    float depth = uTableY - p.y;
    vec2 rp = vec2(p.x + (noise(vec2(p.y * 40.0, uTime * 0.3)) - 0.5) * 0.004, uTableY + depth * 1.15);
    vec3 refl = scene(rp, true) * 0.32 * exp(-depth * 5.0);
    vec3 light = vec3(0.0);
    for (int i = 0; i < MAXC; i++) {
      if (i >= uN) break;
      vec4 c = uC[i]; vec4 s = uS[i];
      vec2 lc = vec2(c.x, uTableY);
      vec2 dv = (p - lc) * vec2(0.6, 2.2);
      light += vec3(1.0, 0.55, 0.25) * s.x * 0.0035 * uScale / (dot(dv, dv) + 0.002 * uScale);
    }
    vec3 table = vec3(0.028, 0.022, 0.03) + light * 0.5;
    table *= 0.85 + 0.15 * noise(vec2(p.x * 3.0, p.y * 90.0));
    col = table + refl;
    // edge highlight where table meets the dark
    col += vec3(1.0, 0.6, 0.3) * 0.04 * exp(-depth * 120.0);
  }

  // vignette, filmic curve, grain
  vec2 q = gl_FragCoord.xy / uRes;
  col *= mix(0.55, 1.0, smoothstep(1.15, 0.35, length((q - 0.5) * vec2(1.1, 1.25))));
  col = 1.0 - exp(-col * 1.35);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}
`;

type Candle = { dx: number; h: number; w: number; seed: number };
type State = { lit: number; target: number; lean: number; leanV: number; smoke: number; outAt: number };

const CANDLES: Candle[] = [
  { dx: -0.27, h: 0.17, w: 0.052, seed: 0.13 },
  { dx: -0.14, h: 0.3, w: 0.062, seed: 0.71 },
  { dx: -0.015, h: 0.22, w: 0.058, seed: 0.37 },
  { dx: 0.11, h: 0.36, w: 0.068, seed: 0.92 },
  { dx: 0.235, h: 0.14, w: 0.05, seed: 0.55 },
];

export function mountCandles(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { root.classList.add('no-webgl'); return; }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  } catch (e) {
    console.warn('[candles]', e);
    root.classList.add('no-webgl');
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uTime = U('uTime'), uMotion = U('uMotion'), uN = U('uN'), uC = U('uC'), uS = U('uS');
  const uTableY = U('uTableY'), uDark = U('uDark'), uSky = U('uSky'), uSkyT = U('uSkyT'), uHasSky = U('uHasSky'), uScale = U('uScale');

  // Sky texture from Julian's Milky Way photo
  let skyAspect = 1.5;
  let hasSky = 0;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 7, 14, 255]));
  const skySrc = root.dataset.sky;
  if (skySrc) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      skyAspect = img.naturalWidth / img.naturalHeight;
      hasSky = 1;
      resize();
    };
    img.src = skySrc;
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Layout
  let W = 1, H = 1, aspect = 1, scale = 1, cx0 = 0, tableY = -0.33;
  const pos = new Float32Array(MAX * 4);
  const st = new Float32Array(MAX * 4);
  const states: State[] = CANDLES.map(() => ({ lit: 1, target: 1, lean: 0, leanV: 0, smoke: -1, outAt: 0 }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const r = canvas!.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas!.width = W; canvas!.height = H;
    gl!.viewport(0, 0, W, H);
    aspect = W / H;
    const wide = aspect > 1.05;
    scale = wide ? 1 : Math.min(1, aspect * 1.05);
    cx0 = wide ? Math.min(aspect * 0.5 - 0.42, aspect * 0.2) : 0;
    tableY = wide ? -0.3 : -0.36;
    CANDLES.forEach((c, i) => {
      pos[i * 4] = cx0 + c.dx * scale;
      pos[i * 4 + 1] = tableY;
      pos[i * 4 + 2] = c.h * scale;
      pos[i * 4 + 3] = c.w * scale;
    });
    // sky "cover" mapping
    const sa = aspect, ia = skyAspect;
    let sx = 1, sy = 1;
    if (sa > ia) sy = ia / sa; else sx = sa / ia;
    gl!.uniform4f(uSkyT, sx, sy, (1 - sx) / 2, (1 - sy) / 2);
    gl!.uniform2f(uRes, W, H);
    gl!.uniform1i(uN, CANDLES.length);
    gl!.uniform4fv(uC, pos);
    gl!.uniform1f(uTableY, tableY);
    gl!.uniform1f(uScale, scale);
    gl!.uniform1f(uHasSky, hasSky);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Pointer → scene coordinates
  const ptr = { x: 9, y: 9, vx: 0, vy: 0, t: 0, inside: false };
  const toScene = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width - 0.5) * aspect, y: 0.5 - (e.clientY - r.top) / r.height };
  };
  const flameCenter = (i: number) => ({ x: pos[i * 4], y: tableY + pos[i * 4 + 2] + pos[i * 4 + 3] * 1.1 });
  const flameH = (i: number) => pos[i * 4 + 3] * 2.1;

  let darkUntil = 0;
  let dark = 0;
  const caption = root.querySelector<HTMLElement>('[data-dark-caption]');
  const hint = root.querySelector<HTMLElement>('[data-hint]');
  let interacted = false;

  const blowOut = (i: number, now: number) => {
    const s = states[i];
    if (s.target === 0) return;
    s.target = 0; s.smoke = 0; s.outAt = now;
    if (!interacted && hint) { interacted = true; hint.classList.add('done'); }
    if (states.every((x) => x.target === 0)) {
      darkUntil = now + 9;
      caption?.classList.add('show');
    }
  };
  const relight = (i: number) => { const s = states[i]; s.target = 1; s.smoke = -1; };

  canvas.addEventListener('pointermove', (e) => {
    const p = toScene(e);
    const now = performance.now() / 1000;
    const dt = Math.max(1 / 240, now - ptr.t);
    if (ptr.inside) {
      const vx = (p.x - ptr.x) / dt, vy = (p.y - ptr.y) / dt;
      ptr.vx = ptr.vx * 0.6 + vx * 0.4; ptr.vy = ptr.vy * 0.6 + vy * 0.4;
    }
    ptr.x = p.x; ptr.y = p.y; ptr.t = now; ptr.inside = true;
    const speed = Math.hypot(ptr.vx, ptr.vy);
    states.forEach((s, i) => {
      if (s.target === 0) return;
      const c = flameCenter(i), fh = flameH(i);
      const d = Math.hypot(p.x - c.x, (p.y - c.y) * 0.8);
      const reach = fh * 2.2;
      if (d < reach) {
        const k = Math.exp(-(d * d) / (reach * reach * 0.35));
        s.leanV += ptr.vx * k * 1.6;
        if (speed > 1.15 * scale + 0.3 && d < fh * 0.75) blowOut(i, now);
      }
    });
  });
  canvas.addEventListener('pointerleave', () => { ptr.inside = false; ptr.vx = ptr.vy = 0; });
  canvas.addEventListener('pointerdown', (e) => {
    const p = toScene(e);
    const now = performance.now() / 1000;
    let best = -1, bestD = 1e9;
    states.forEach((_, i) => {
      const c = flameCenter(i);
      const d = Math.hypot(p.x - c.x, (p.y - (c.y + pos[i * 4 + 2] * -0.4)) * 0.5);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0) return;
    const s = states[best];
    const c = flameCenter(best);
    const near = Math.abs(p.x - c.x) < pos[best * 4 + 3] * 1.4 && p.y > tableY && p.y < c.y + flameH(best) * 1.3;
    if (!near) return;
    if (s.target === 0) { relight(best); if (darkUntil) { darkUntil = 0; caption?.classList.remove('show'); } }
    else if (e.pointerType !== 'mouse') blowOut(best, now);
  });

  // Animation loop
  let raf = 0, last = performance.now() / 1000, running = false, visible = true;
  const t0 = last;
  const frame = () => {
    raf = 0;
    if (!running) return;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last); last = now;

    // dark adaptation and relighting
    if (darkUntil && now > darkUntil) {
      darkUntil = 0;
      caption?.classList.remove('show');
      states.forEach((s, i) => setTimeout(() => relight(i), i * 380));
    }
    const wantDark = darkUntil ? 1 : 0;
    dark += (wantDark - dark) * Math.min(1, dt * (wantDark ? 0.35 : 1.2));
    if (!darkUntil) {
      states.forEach((s, i) => { if (s.target === 0 && now - s.outAt > 4 + i * 0.3) relight(i); });
    }

    let glow = 0;
    states.forEach((s, i) => {
      s.lit += (s.target - s.lit) * Math.min(1, dt * (s.target ? 2.2 : 14));
      // spring the lean back to upright
      s.leanV += -s.lean * 38 * dt;
      s.leanV *= Math.exp(-dt * 5);
      s.lean += s.leanV * dt;
      s.lean = Math.max(-1.3, Math.min(1.3, s.lean));
      if (s.smoke >= 0) s.smoke += dt;
      st[i * 4] = s.lit;
      st[i * 4 + 1] = s.lean;
      st[i * 4 + 2] = CANDLES[i].seed;
      st[i * 4 + 3] = s.smoke;
      glow += s.lit;
    });
    ptr.vx *= Math.exp(-dt * 8); ptr.vy *= Math.exp(-dt * 8);

    const flick = reduced ? 1 : 0.9 + Math.random() * 0.1;
    root.style.setProperty('--candle', ((glow / CANDLES.length) * flick).toFixed(3));

    gl!.uniform1f(uTime, reduced ? 12.0 : now - t0);
    gl!.uniform1f(uMotion, reduced ? 0.0 : 1.0);
    gl!.uniform4fv(uS, st);
    gl!.uniform1f(uDark, dark);
    gl!.uniform1f(uHasSky, hasSky);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running || !visible || document.hidden) return; running = true; last = performance.now() / 1000; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  root.classList.add('ready');
  start();
}
