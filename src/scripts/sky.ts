/*
  Interactive night sky for the home page.
  - a few hundred background stars along a faint Milky Way band (pre-rendered once)
  - twinkling foreground stars and six constellations that react to the pointer:
    stars are pushed aside and spring back, the nearest constellation lights up and shows its name
  - slight parallax, the occasional shooting star
  Pure 2D canvas, no libraries. Respects prefers-reduced-motion and pauses when hidden.
*/

type Pt = [x: number, y: number, mag: number, color?: string];
type Shape = { name: string; pts: Pt[]; lines: [number, number][] };
type Place = { at: [number, number]; size: number; rot?: number };

// Shapes are hand-traced from star charts (x to the right, y downwards, arbitrary units).
// mag: 1 = faint, 3 = very bright.
const SHAPES: Shape[] = [
  {
    name: 'Ursa Major',
    pts: [
      [2.6, 0, 2.6, '#ffe2b8'], [2.6, 0.75, 2.4], [1.75, 0.95, 2.3], [1.72, 0.28, 1.7],
      [1.05, 0.12, 2.6], [0.45, 0.02, 2.4], [-0.25, 0.35, 2.5, '#cfdcff'],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    name: 'Cassiopeia',
    pts: [[0, 0.1, 2.2], [0.55, 0.75, 2.4, '#ffd9a8'], [1.15, 0.35, 2.5], [1.75, 0.95, 2.1], [2.4, 0.55, 2.0]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: 'Orion',
    pts: [
      [0, 0, 3, '#ffb37a'],        // Betelgeuse
      [1.6, 0.2, 2.4, '#d8e2ff'],  // Bellatrix
      [0.85, -0.7, 1.7],           // Meissa
      [0.55, 1.55, 2.3, '#d8e2ff'],// Alnitak
      [0.8, 1.45, 2.4, '#d8e2ff'], // Alnilam
      [1.05, 1.35, 2.2, '#d8e2ff'],// Mintaka
      [0.25, 2.85, 2.2, '#d8e2ff'],// Saiph
      [1.95, 2.65, 3, '#bcd0ff'],  // Rigel
      [-0.35, -0.95, 1.4], [-0.15, -1.55, 1.3],
      [2.35, -0.25, 1.3], [2.55, 0.35, 1.3], [2.45, 0.95, 1.2],
    ],
    lines: [[0, 2], [2, 1], [0, 3], [1, 5], [3, 4], [4, 5], [3, 6], [5, 7], [0, 8], [8, 9], [1, 10], [10, 11], [11, 12]],
  },
  {
    name: 'Cygnus',
    pts: [[0, 0, 2.8, '#eef2ff'], [0.85, 0.85, 2.3, '#ffeccc'], [2, 2.05, 2.1, '#ffd29a'], [0.15, 1.65, 2.2], [1.7, 0.05, 2.1], [-0.35, 2.3, 1.5], [2.45, -0.4, 1.4]],
    lines: [[0, 1], [1, 2], [3, 1], [1, 4], [3, 5], [4, 6]],
  },
  {
    name: 'Lyra',
    pts: [[0, 0, 3, '#dfe8ff'], [0.3, -0.25, 1.3], [0.4, 0.4, 1.5], [0.6, 1.05, 1.5], [1.0, 0.95, 1.8], [0.8, 0.3, 1.8]],
    lines: [[0, 1], [0, 2], [2, 5], [5, 4], [4, 3], [3, 2]],
  },
  {
    name: 'Scorpius',
    pts: [
      [0, 0, 1.8], [0.2, 0.5, 2.2], [0.05, 1.0, 1.7], [0.95, 0.95, 3, '#ff9f6b'], [1.25, 1.35, 1.8],
      [1.45, 1.9, 1.8], [1.55, 2.5, 1.9], [1.35, 3.0, 1.9], [0.95, 3.2, 2.1], [0.55, 3.05, 2.4], [0.4, 2.7, 1.8],
    ],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]],
  },
];

// Where the constellations sit. The name block sits bottom-left, so that corner stays free.
const WIDE: Place[] = [
  { at: [0.2, 0.25], size: 0.3, rot: -0.12 },
  { at: [0.55, 0.17], size: 0.2, rot: 0.1 },
  { at: [0.8, 0.5], size: 0.36, rot: 0.05 },
  { at: [0.57, 0.53], size: 0.24, rot: 0.2 },
  { at: [0.41, 0.38], size: 0.1 },
  { at: [0.9, 0.2], size: 0.22, rot: -0.3 },
];
const TALL: Place[] = [
  { at: [0.3, 0.14], size: 0.34, rot: -0.12 },
  { at: [0.78, 0.09], size: 0.24, rot: 0.1 },
  { at: [0.72, 0.4], size: 0.44, rot: 0.05 },
  { at: [0.26, 0.42], size: 0.3, rot: 0.2 },
  { at: [0.15, 0.28], size: 0.14 },
  { at: [0.85, 0.66], size: 0.24, rot: -0.3 },
];

type Star = {
  hx: number; hy: number; x: number; y: number; vx: number; vy: number;
  r: number; color: string; base: number; tw: number; ph: number; depth: number;
};
type Con = { name: string; stars: Star[]; lines: [number, number][]; glow: number; lx: number; ly: number; cx: number; cy: number };

const PALETTE = ['#a9bcff', '#c4d2ff', '#e2e8ff', '#f6f6ff', '#fff3e6', '#ffe1bd', '#ffc996'];

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sprite(color: string) {
  const s = 64, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.08, color);
  grd.addColorStop(0.22, color + '55');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  return c;
}

export function mountSky(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprites = new Map<string, HTMLCanvasElement>();
  const spr = (c: string) => sprites.get(c) ?? (sprites.set(c, sprite(c)), sprites.get(c)!);

  let W = 0, H = 0, dpr = 1, unit = 1;
  let bg: HTMLCanvasElement | null = null;
  let field: Star[] = [];
  let cons: Con[] = [];
  const pointer = { x: -9999, y: -9999, active: false, last: 0 };
  const par = { x: 0, y: 0 };
  let shoot: { x: number; y: number; vx: number; vy: number; t: number } | null = null;
  let nextShoot = 4000;
  let demoIndex = 0, demoAt = 0;

  function makeStar(x: number, y: number, r: number, color: string, base: number, depth: number, rand: () => number): Star {
    return { hx: x, hy: y, x, y, vx: 0, vy: 0, r, color, base, tw: 0.6 + rand() * 1.8, ph: rand() * 6.28, depth };
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    unit = Math.min(W, H);
    const rand = rng(1386);

    // Background: many faint stars, denser along a diagonal band, plus a very soft glow.
    bg = document.createElement('canvas');
    bg.width = canvas.width; bg.height = canvas.height;
    const b = bg.getContext('2d')!;
    b.scale(dpr, dpr);
    const bandAngle = -0.42, bx = W * 0.55, by = H * 0.5;
    const ca = Math.cos(bandAngle), sa = Math.sin(bandAngle);
    b.save();
    b.translate(bx, by); b.rotate(bandAngle);
    const glow = b.createLinearGradient(0, -unit * 0.35, 0, unit * 0.35);
    glow.addColorStop(0, 'rgba(120,140,190,0)');
    glow.addColorStop(0.5, 'rgba(120,140,190,0.09)');
    glow.addColorStop(1, 'rgba(120,140,190,0)');
    b.fillStyle = glow;
    b.fillRect(-W * 1.5, -unit * 0.35, W * 3, unit * 0.7);
    b.restore();
    const count = Math.round((W * H) / 900);
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      if (rand() < 0.55) {
        // along the band: gaussian-ish offset from the band axis
        const along = (rand() - 0.5) * Math.max(W, H) * 1.6;
        const off = (rand() + rand() + rand() - 1.5) * unit * 0.16;
        x = bx + along * ca - off * sa; y = by + along * sa + off * ca;
      } else { x = rand() * W; y = rand() * H; }
      const a = 0.12 + rand() * 0.45;
      b.fillStyle = `rgba(220,228,245,${a})`;
      b.fillRect(x, y, rand() < 0.9 ? 0.7 : 1.1, rand() < 0.9 ? 0.7 : 1.1);
    }

    // Twinkling field stars
    field = [];
    const fc = Math.round((W * H) / 9000);
    for (let i = 0; i < fc; i++) {
      field.push(makeStar(rand() * W, rand() * H, 0.5 + rand() * 1.1, PALETTE[Math.floor(rand() * PALETTE.length)], 0.35 + rand() * 0.5, 0.3 + rand() * 0.5, rand));
    }

    // Constellations
    const places = W / H > 1.05 ? WIDE : TALL;
    cons = SHAPES.map((sh, i) => {
      const p = places[i];
      const xs = sh.pts.map((q) => q[0]), ys = sh.pts.map((q) => q[1]);
      const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const k = (p.size * unit) / span;
      const rot = p.rot ?? 0, cr = Math.cos(rot), sr = Math.sin(rot);
      const cx = p.at[0] * W, cy = p.at[1] * H;
      const stars = sh.pts.map(([x, y, mag, color]) => {
        const dx = (x - mx) * k, dy = (y - my) * k;
        const sx = cx + dx * cr - dy * sr, sy = cy + dx * sr + dy * cr;
        return makeStar(sx, sy, 0.7 + mag * 0.75, color ?? '#f2f5ff', 0.75 + mag * 0.08, 1, rand);
      });
      const maxY = Math.max(...stars.map((s) => s.hy));
      const minX = Math.min(...stars.map((s) => s.hx));
      return { name: sh.name, stars, lines: sh.lines, glow: 0, lx: minX, ly: maxY + 26, cx, cy };
    });
  }

  function distToSeg(px: number, py: number, a: Star, b: Star) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy));
  }

  function step(s: Star, dt: number, push: number) {
    let tx = s.hx + par.x * s.depth, ty = s.hy + par.y * s.depth;
    if (pointer.active) {
      const dx = s.hx - pointer.x, dy = s.hy - pointer.y;
      const d = Math.hypot(dx, dy), R = unit * 0.15;
      if (d < R && d > 0.01) {
        const f = (1 - d / R) ** 2 * push;
        tx += (dx / d) * f; ty += (dy / d) * f;
      }
    }
    const k = 0.06 * dt, damp = Math.pow(0.78, dt);
    s.vx = (s.vx + (tx - s.x) * k) * damp;
    s.vy = (s.vy + (ty - s.y) * k) * damp;
    s.x += s.vx * dt; s.y += s.vy * dt;
  }

  function drawStar(s: Star, t: number, boost = 0) {
    const tw = reduced ? 1 : 0.78 + 0.22 * Math.sin(t * 0.001 * s.tw * 2 + s.ph);
    const a = Math.min(1, s.base * tw + boost);
    const size = s.r * 8 * (1 + boost * 0.4);
    ctx!.globalAlpha = a;
    ctx!.drawImage(spr(s.color), s.x - size / 2, s.y - size / 2, size, size);
    if (s.r > 1.6) {
      // crisp core for the bright ones
      ctx!.globalAlpha = Math.min(1, a + 0.1);
      ctx!.fillStyle = '#ffffff';
      ctx!.beginPath(); ctx!.arc(s.x, s.y, s.r * 0.42, 0, 6.283); ctx!.fill();
    }
  }

  let last = performance.now();
  let raf = 0, running = false;

  function frame(now: number) {
    const ms = Math.min(50, Math.max(0, now - last));
    const dt = ms / 16.67 || 1;
    last = now;
    const c = ctx!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = '#07090f';
    c.fillRect(0, 0, W, H);

    // parallax follows the pointer gently
    const tx = pointer.active ? -(pointer.x / W - 0.5) * 6 : 0;
    const ty = pointer.active ? -(pointer.y / H - 0.5) * 4 : 0;
    par.x += (tx - par.x) * 0.04 * dt; par.y += (ty - par.y) * 0.04 * dt;

    if (bg) { c.save(); c.setTransform(1, 0, 0, 1, par.x * 0.3 * dpr, par.y * 0.3 * dpr); c.drawImage(bg, 0, 0); c.restore(); c.setTransform(dpr, 0, 0, dpr, 0, 0); }

    c.globalCompositeOperation = 'lighter';
    for (const s of field) { step(s, dt, unit * 0.008); drawStar(s, now); }

    // which constellation is the pointer near?
    let hot = -1, best = unit * 0.09;
    if (pointer.active) {
      cons.forEach((con, i) => {
        for (const [a, b] of con.lines) {
          const d = distToSeg(pointer.x, pointer.y, con.stars[a], con.stars[b]);
          if (d < best) { best = d; hot = i; }
        }
      });
    }
    // with no pointer (touch screens, idle), slowly cycle through the constellations
    if (!pointer.active || now - pointer.last > 6000) {
      if (now - demoAt > 3200) { demoIndex = (demoIndex + 1) % cons.length; demoAt = now; }
      if (hot < 0) hot = demoIndex;
    }

    cons.forEach((con, i) => {
      con.glow += ((i === hot ? 1 : 0) - con.glow) * 0.07 * dt;
      for (const s of con.stars) step(s, dt, unit * 0.012);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 0.16 + con.glow * 0.5;
      c.strokeStyle = '#c9d6f2';
      c.lineWidth = 0.8 + con.glow * 0.4;
      c.beginPath();
      for (const [a, b] of con.lines) {
        const A = con.stars[a], B = con.stars[b];
        // stop the line short of each star so stars sit in a small gap
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, g = Math.min(7, L / 4);
        c.moveTo(A.x + (dx / L) * g, A.y + (dy / L) * g);
        c.lineTo(B.x - (dx / L) * g, B.y - (dy / L) * g);
      }
      c.stroke();
      c.globalCompositeOperation = 'lighter';
      for (const s of con.stars) drawStar(s, now, con.glow * 0.25);
      if (con.glow > 0.02) {
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = con.glow * 0.85;
        c.fillStyle = '#c9d2e3';
        c.font = '500 13px "Archivo Variable", system-ui, sans-serif';
        c.fillText(con.name, con.lx, con.ly);
      }
    });

    // shooting star
    if (!reduced) {
      nextShoot -= ms;
      if (!shoot && nextShoot <= 0) {
        const r = Math.random();
        shoot = { x: W * (0.15 + r * 0.7), y: H * (0.05 + Math.random() * 0.25), vx: 9 + Math.random() * 5, vy: 3.5 + Math.random() * 2.5, t: 0 };
        nextShoot = 9000 + Math.random() * 9000;
      }
      if (shoot) {
        shoot.t += dt;
        const life = 42, p = shoot.t / life;
        const hx = shoot.x + shoot.vx * shoot.t, hy = shoot.y + shoot.vy * shoot.t;
        const len = 16;
        const grd = c.createLinearGradient(hx, hy, hx - shoot.vx * len, hy - shoot.vy * len);
        grd.addColorStop(0, 'rgba(255,255,255,0.9)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = Math.sin(Math.PI * Math.min(1, p));
        c.strokeStyle = grd; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - shoot.vx * len, hy - shoot.vy * len); c.stroke();
        if (p >= 1) shoot = null;
      }
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;

    if (running) raf = requestAnimationFrame(frame);
  }

  function start() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    pointer.active = true; pointer.last = performance.now();
  };
  const onLeave = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.type === 'pointerup' || e.type === 'pointercancel') pointer.active = e.pointerType === 'mouse' ? false : pointer.active; };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(() => { pointer.active = false; }, 900); });

  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = window.setTimeout(() => { build(); if (reduced) frame(performance.now()); }, 120); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  const go = () => { build(); if (reduced) frame(performance.now()); else start(); canvas.classList.add('ready'); };
  // wait for the font so constellation labels use it
  (document.fonts?.ready ?? Promise.resolve()).then(go);
}
