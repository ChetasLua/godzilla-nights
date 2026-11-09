// Shared helpers for the four posters. Classic script; exposes window.GZ.
(() => {
  const GZ = {};
  // deterministic RNG (mulberry32)
  GZ.rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  // 2D value noise + fbm
  const P = new Uint8Array(512); { const r = GZ.rng(1337); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => { const u = (h & 1) ? x : -x, v = (h & 2) ? y : -y; return (h & 4) ? u + v : (u + v) * 0.7071; };
  GZ.noise = (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y); const u = fade(x), v = fade(y); const a = P[X] + Y, b = P[X + 1] + Y; return lerp(lerp(grad(P[a], x, y), grad(P[b], x - 1, y), u), lerp(grad(P[a + 1], x, y - 1), grad(P[b + 1], x - 1, y - 1), u), v); };
  GZ.fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * GZ.noise(x * f, y * f); f *= 2; a *= 0.5; } return s; };
  const lerp = (a, b, t) => a + (b - a) * t; GZ.lerp = lerp;
  GZ.clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  GZ.smooth = (a, b, x) => { const t = GZ.clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  GZ.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  // path from array of [x,y] in unit coords scaled by (sx,sy) + offset
  GZ.poly = (ctx, pts, sx = 1, sy = 1, ox = 0, oy = 0) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(ox + x * sx, oy + y * sy) : ctx.moveTo(ox + x * sx, oy + y * sy)); ctx.closePath(); };
  // smooth closed path through points (Catmull-Rom -> bezier)
  GZ.spline = (ctx, pts, closed = true, k = 0.5) => {
    const n = pts.length; if (n < 2) return; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    const get = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) { const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3, p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3, p2[0], p2[1]); }
    if (closed) ctx.closePath();
  };
  // radial glow
  GZ.glow = (ctx, x, y, r, color, a = 1) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; };
  // 4-point sparkle star
  GZ.sparkle = (ctx, x, y, r, color, a = 1, thin = 0.12) => {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * thin, y - r * thin, x + r, y); ctx.quadraticCurveTo(x + r * thin, y + r * thin, x, y + r);
    ctx.quadraticCurveTo(x - r * thin, y + r * thin, x - r, y); ctx.quadraticCurveTo(x - r * thin, y - r * thin, x, y - r); ctx.fill(); ctx.restore();
  };
  // film grain tile (cached per size)
  const grainCache = {};
  GZ.grain = (ctx, W, H, t, amount = 0.06, size = 256) => {
    let g = grainCache[size]; if (!g) { g = []; for (let k = 0; k < 4; k++) { const c = GZ.canvas(size, size), x = c.getContext('2d'), d = x.createImageData(size, size), r = GZ.rng(99 + k); for (let i = 0; i < d.data.length; i += 4) { const v = (r() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); g.push(c); } grainCache[size] = g; }
    const tile = g[Math.floor(t * 12) % 4]; ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(tile, 'repeat'); ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
  };

  // Subtle living mouth fire: flickering core + licking flame tongues + drifting embers, emitted from (x,y) along (dx,dy).
  // Deterministic in t. o: {len, spread, core, mid, outer (rgb arrays), tongues, embers, seed, power}
  GZ.mouthFire = (ctx, W, t, x, y, dx, dy, o = {}) => {
    const len = o.len || W * 0.06, spread = o.spread || 0.35, pw = o.power == null ? 1 : o.power, seed = o.seed || 1;
    const core = o.core || [255, 250, 230], mid = o.mid || [255, 170, 60], outer = o.outer || [255, 70, 20];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const nx = -dy, ny = dx;
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
    const fl = GZ.noise(t * 3.1 + seed, seed * 7) * 0.5 + GZ.noise(t * 7.3 + seed * 3, 1.7) * 0.25; // -0.75..0.75 flicker
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 1) breathing core glow at the jaws
    const cr = len * (0.42 + 0.08 * Math.sin(t * 2.2 + seed) + 0.06 * fl);
    let g = ctx.createRadialGradient(x, y, 0, x, y, cr);
    g.addColorStop(0, rgba(core, 0.55 * pw)); g.addColorStop(0.35, rgba(mid, 0.28 * pw)); g.addColorStop(1, rgba(outer, 0));
    ctx.fillStyle = g; ctx.fillRect(x - cr, y - cr, cr * 2, cr * 2);
    // 2) flame tongues licking outward
    const N = o.tongues || 7;
    for (let i = 0; i < N; i++) {
      const ph = t * (1.6 + 0.37 * i) + i * 2.17 + seed;
      const life = (ph % 1 + 1) % 1;                                  // each tongue grows then fades, staggered
      const L = len * (0.55 + 0.45 * Math.sin(Math.PI * life)) * (0.7 + 0.3 * GZ.noise(i * 3.3, t * 1.3 + seed));
      const ang = (i / (N - 1) - 0.5) * spread + 0.18 * GZ.noise(t * 2 + i, seed);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const ux = dx * ca - dy * sa, uy = dx * sa + dy * ca, vx = -uy, vy = ux;
      const wob = L * 0.18 * Math.sin(t * 5.3 + i * 1.9);
      const w0 = len * 0.075 * (1 - 0.5 * life);
      const tx = x + ux * L + vx * wob * 0.6, ty = y + uy * L + vy * wob * 0.6;
      const mx1 = x + ux * L * 0.45 + vx * (w0 + wob * 0.5), my1 = y + uy * L * 0.45 + vy * (w0 + wob * 0.5);
      const mx2 = x + ux * L * 0.45 - vx * (w0 - wob * 0.5), my2 = y + uy * L * 0.45 - vy * (w0 - wob * 0.5);
      const a = Math.sin(Math.PI * life) * 0.42 * pw;
      g = ctx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, rgba(core, a)); g.addColorStop(0.35, rgba(mid, a * 0.75)); g.addColorStop(1, rgba(outer, 0));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x + vx * w0 * 0.6, y + vy * w0 * 0.6);
      ctx.quadraticCurveTo(mx1, my1, tx, ty);
      ctx.quadraticCurveTo(mx2, my2, x - vx * w0 * 0.6, y - vy * w0 * 0.6);
      ctx.closePath(); ctx.fill();
    }
    // 3) embers drifting out and fading
    const E = o.embers || 18;
    for (let i = 0; i < E; i++) {
      const r1 = ((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1, r2 = ((Math.sin(i * 39.346 + seed * 11.135) * 24634.6345) % 1 + 1) % 1;
      const life = ((t * (0.35 + 0.3 * r1) + r2) % 1 + 1) % 1;
      const d = len * (0.25 + 1.5 * life), side = (r1 - 0.5) * spread * 1.6 * d + Math.sin(t * 2 + i) * len * 0.05 * life;
      const px = x + dx * d + nx * side, py = y + dy * d + ny * side - life * len * 0.15;
      const a = Math.sin(Math.PI * life) * (0.35 + 0.4 * r2) * pw, rr = W * 0.0012 * (1.2 - 0.6 * life) * (0.7 + r1);
      ctx.fillStyle = rgba(life < 0.4 ? core : mid, a);
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, rr), 0, 6.283); ctx.fill();
    }
    ctx.restore();
  };
  window.GZ = GZ;
})();
