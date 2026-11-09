// Poster 4 — "Ink Night" (round 3 rebuild). Inked manga night poster: pitch-black star sky, navy cumulus drawn
// as overlapping puffs whose edges carry stacked brush contour lines (true inward offsets of each puff's scalloped
// silhouette, so every line is unique), an S-curving smoke column lit from inside by the atomic breath, and
// Godzilla roaring up-right behind a dense backlit skyline.
// All geometry is authored in a 1200x2400 reference space (measured from the reference) and scaled by W/1200.
// Static layers are baked in init; draw() composites them and adds the living overlays.
(() => {
  const G = window.GZ;
  const TAU = Math.PI * 2, RW = 1200, RH = 2400;
  const { lerp, clamp, smooth } = G;
  const frac = x => x - Math.floor(x);
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${a})`;
  const rampOf = stops => v => { if (v <= stops[0][0]) return stops[0][1]; for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; return mixc(ca, cb, (v - a) / (b - a)); } return stops[stops.length - 1][1]; };
  const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };

  // ======================= measured geometry (reference px) =======================
  const MOUTH = [500, 1703];
  const BEAM_END = [640, 1548];
  // smoke column centreline [x, y, half-width, inner light]
  const COL = [[612, 1582, 40, 1.5], [655, 1540, 72, 1.4], [700, 1490, 96, 1.2], [752, 1432, 112, 1.0], [800, 1372, 118, 0.9], [830, 1308, 122, 0.85],
    [852, 1242, 126, 0.82], [868, 1176, 134, 0.82], [876, 1106, 148, 0.84], [878, 1036, 164, 0.86], [868, 966, 176, 0.78], [842, 898, 184, 0.66],
    [798, 836, 186, 0.55], [746, 778, 182, 0.44], [690, 724, 170, 0.34]];
  const colAt = u => { const f = clamp(u) * (COL.length - 1), i = Math.min(COL.length - 2, Math.floor(f)), k = f - i, a = COL[i], b = COL[i + 1];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), hw: lerp(a[2], b[2], k), lit: lerp(a[3], b[3], k), tx: tx / tl, ty: ty / tl }; };
  // glowing spine line (head -> tail), hand-placed
  const SP = [[424, 1713], [414, 1722], [398, 1738], [378, 1780], [355, 1818], [328, 1849], [305, 1884], [286, 1918], [271, 1957], [251, 1999], [232, 2045],
    [213, 2080], [194, 2115], [178, 2138], [163, 2180], [152, 2260], [146, 2400]];
  const spAt = u => { const f = clamp(u) * (SP.length - 1), i = Math.min(SP.length - 2, Math.floor(f)), k = f - i, a = SP[i], b = SP[i + 1];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), tx / tl, ty / tl]; };
  const spXatY = y => { for (let i = 0; i < SP.length - 1; i++) if (y <= SP[i + 1][1]) { const a = SP[i], b = SP[i + 1], k = clamp((y - a[1]) / (b[1] - a[1])); return lerp(a[0], b[0], k); } return SP[SP.length - 1][0]; };
  // lit front edge: throat -> chest -> (behind the arm) -> thigh
  const FRONT_RIM = [[498, 1762], [494, 1775], [491, 1792], [487, 1808], [492, 1822], [499, 1838], [502, 1860], [501, 1885], [497, 1908], [493, 1926], [488, 1960], [476, 1990], [488, 2006], [512, 2024], [535, 2054],
    [551, 2088], [559, 2116], [558, 2150], [552, 2200]];
  // body silhouette, clockwise from the back of the skull: skull -> snout hook -> palate -> mouth corner -> lower jaw -> throat -> chest -> thigh -> tail root -> back
  const BODY = [[430, 1709], [436, 1700], [444, 1690], [454, 1681], [466, 1672], [478, 1664], [489, 1658], [498, 1655], [506, 1656.5], [510.5, 1662], [511, 1669], [509, 1675],
    [505, 1669], [497, 1680], [489, 1692], [481, 1703], [476, 1711], [478, 1720], [486, 1724], [500, 1723], [520, 1721], [539, 1717.5], [543, 1723], [540, 1733], [529, 1743], [514, 1749], [504, 1756],
    ...FRONT_RIM, [548, 2400], ...SP.slice().reverse()];
  // forearm + palm (fingers drawn separately)
  const ARM = [[462, 1936], [480, 1924], [498, 1932], [516, 1941], [534, 1946], [549, 1942], [560, 1930], [570, 1918], [582, 1914], [590, 1922], [592, 1945], [590, 1970], [584, 1990], [570, 1992], [552, 1985],
    [532, 1988], [512, 1996], [490, 2001], [472, 1998], [461, 1984], [457, 1960]];
  // fingers: base, knuckle, claw tip, width
  const FINGERS = [[[572, 1919], [593, 1903], [600, 1931], 13], [[580, 1939], [612, 1932], [618, 1954], 13], [[584, 1959], [616, 1959], [620, 1983], 12], [[579, 1980], [604, 1985], [598, 2005], 11]];

  // ======================= light field for clouds =======================
  // [x, y, sigma, strength]
  const LIGHTS = [[720, 82, 125, 1.0], [462, 386, 105, 1.0], [740, 770, 70, 0.55], [600, 720, 70, 0.25], [372, 262, 40, 0.3],
    [610, 2080, 220, 1.0], [1020, 2180, 220, 0.9], [0, 2030, 170, 0.75], [90, 1880, 150, 0.6], [560, 2000, 120, 1.0], [640, 1900, 160, 0.85], [660, 1760, 140, 0.6],
    [620, 1660, 110, 0.55], [190, 1830, 130, 0.55], [140, 1990, 130, 0.55], [290, 1760, 100, 0.3], [720, 2000, 140, 0.6], [900, 2050, 150, 0.6], [900, 1900, 200, 0.45], [1110, 2000, 160, 0.5],
    [1000, 1780, 160, 0.3], [585, 1960, 110, 0.9], [610, 1830, 110, 0.6], [150, 1860, 150, 0.45], [60, 2000, 120, 0.4], [540, 1640, 120, 0.35]];
  COL.forEach(c => LIGHTS.push([c[0] - c[2] * 0.15, c[1], c[2] * 1.1, c[3] * 0.42]));
  const lightAt = (x, y) => { let b = 0; for (const [lx, ly, s, k] of LIGHTS) { const d2 = ((x - lx) ** 2 + (y - ly) ** 2) / (s * s); if (d2 < 9) b += k * Math.exp(-d2); } return b; };
  const CLOUD = rampOf([[0, [13, 14, 28]], [0.2, [30, 32, 62]], [0.45, [50, 58, 114]], [0.7, [60, 88, 180]], [0.95, [66, 122, 228]], [1.25, [110, 168, 248]], [1.7, [205, 228, 255]]]);
  const PLUME = rampOf([[0, [10, 14, 46]], [0.25, [20, 42, 132]], [0.5, [36, 86, 210]], [0.7, [54, 120, 238]], [0.86, [100, 172, 250]], [1.0, [170, 216, 255]], [1.2, [240, 248, 255]]]);

  // ======================= union-of-circles boundary =======================
  // returns arcs [i, a0, a1] (a1 > a0) of each circle's boundary that is not covered by another circle
  function unionArcs(D) {
    const out = [];
    for (let i = 0; i < D.length; i++) {
      const [x, y, r] = D[i]; if (r <= 0.6) continue;
      const iv = []; let full = false;
      for (let j = 0; j < D.length; j++) { if (i === j) continue; const [x2, y2, r2] = D[j]; if (r2 <= 0.6) continue;
        const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy);
        if (d >= r + r2) continue;
        if (d + r <= r2) { if (d + r < r2 - 1e-6 || j < i) { full = true; break; } continue; }
        if (d + r2 <= r) continue;
        const a = Math.acos(clamp((r * r + d * d - r2 * r2) / (2 * r * d), -1, 1)), ph = Math.atan2(dy, dx);
        let a0 = ph - a; a0 = ((a0 % TAU) + TAU) % TAU; const a1 = a0 + 2 * a;
        if (a1 > TAU) { iv.push([a0, TAU]); iv.push([0, a1 - TAU]); } else iv.push([a0, a1]); }
      if (full) continue;
      if (!iv.length) { out.push([i, 0, TAU]); continue; }
      iv.sort((p, q) => p[0] - q[0]);
      const mg = []; for (const v of iv) { if (mg.length && v[0] <= mg[mg.length - 1][1]) mg[mg.length - 1][1] = Math.max(mg[mg.length - 1][1], v[1]); else mg.push([v[0], v[1]]); }
      const free = []; let cur = 0; for (const [a0, a1] of mg) { if (a0 > cur) free.push([cur, a0]); cur = Math.max(cur, a1); } if (cur < TAU) free.push([cur, TAU]);
      if (free.length > 1 && free[0][0] === 0 && free[free.length - 1][1] === TAU) { const l = free.pop(); free[0] = [l[0], free[0][1] + TAU]; }
      for (const [a0, a1] of free) if (a1 - a0 > 0.02) out.push([i, a0, a1]);
    }
    return out;
  }
  // a tapered brush arc on circle (x,y,R) between a0..a1: fat where it faces the light, hair-thin at the ends
  function brushArc(c, x, y, R, a0, a1, w, la, faceLo, endPx) {
    const len = (a1 - a0) * R, n = Math.max(4, Math.min(48, Math.ceil(len / 3)));
    const W = []; let any = false;
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), s = (i / n) * len;
      const end = Math.min(1, s / endPx, (len - s) / endPx), f = smooth(faceLo, faceLo + 0.9, Math.cos(a - la));
      const ww = w * Math.pow(Math.max(0, end), 0.7) * f; W.push(ww); if (ww > 0.12) any = true; }
    if (!any) return;
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); i ? c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R) : c.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); }
    for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n), r2 = R - W[i]; c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
    c.closePath();
  }
  // one inked billow, drawn the way the print does it: overlapping flat scallops laid like roof tiles from the rim inward,
  // each with a brush outline on the side it faces and a few nested hook strokes. The back of the billow stays flat and
  // unlined so neighbouring billows fuse into one mass.
  function drawPuff(c, P) {
    const D = P.disks, asp = P.asp || 1, pr = P.rnd || (() => 0.5), skip = P.skip !== undefined ? P.skip : 0.22;
    c.save();
    if (asp !== 1 || P.rot) { c.translate(P.cx, P.cy); if (P.rot) c.rotate(P.rot); c.scale(1, asp); c.translate(-P.cx, -P.cy); }
    const fill = css(P.top);
    if (P.out) { c.fillStyle = P.ink; c.beginPath(); for (const [x, y, r] of D) { c.moveTo(x + r + P.out, y); c.arc(x, y, r + P.out, 0, TAU); } c.fill(); }
    for (const [x, y, r, fa, base] of D) {
      c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      if (base) continue;
      const h = 1.2 + pr() * 0.55, tw = (pr() - 0.5) * 0.5;
      if (P.rim) { c.fillStyle = P.rim; c.beginPath(); brushArc(c, x, y, r - P.lw * 0.9, fa - h, fa + h, P.rimW || 1.8, P.la, P.rimLo !== undefined ? P.rimLo : 0.1, 8); c.fill(); }
      c.fillStyle = P.line; c.beginPath();
      brushArc(c, x, y, r, fa + tw - h, fa + tw + h, P.lw * (0.85 + pr() * 0.4), fa, -2, 5 + r * 0.35);
      if (r > 6 && pr() > skip) { const n = Math.min(P.nl, 1 + (pr() * P.nl | 0) + (r > 24 ? 1 : 0)), g = P.gap * (0.8 + pr() * 0.45) * clamp(r / 20, 0.7, 1.45), side = pr() < 0.5 ? -1 : 1; let sh = g;
        for (let k = 0; k < n && r - sh > 2.5; k++) { const hk = h * (0.86 - k * 0.15 - pr() * 0.1), ca = fa + tw + side * 0.9, off = sh * 0.42;
          brushArc(c, x - Math.cos(ca) * off, y - Math.sin(ca) * off, r - sh * 0.75, fa + tw - hk, fa + tw + hk, P.lw * (0.95 - k * 0.13), fa, -2, 5 + r * 0.3); sh += g * (0.85 + pr() * 0.35); } }
      c.fill();
    }
    c.restore();
  }
  // a cumulus billow as a draw-ordered list of scallops [x, y, r, facing, isBase]: flat base, outer crown, inner rings, cap.
  // Scallop size is capped so big billows get more lobes (and big quiet flats) rather than giant shells.
  function makePuff(rnd, x, y, R, la = -Math.PI / 2, cap = 25) {
    const S = [[x + (rnd() - 0.5) * R * 0.1, y - Math.sin(la) * R * 0.14, R * 0.8, la, 1]];
    const lr = clamp(R * 0.4, 7, cap), rings = R > 60 ? 2 : R > 30 ? (rnd() < 0.6 ? 2 : 1) : 1;
    for (let q = 0, ringR = R; q < rings && ringR > lr * 0.8; q++) {
      const span = q ? 1.5 + rnd() * 0.6 : 1.95; let a = la - span + rnd() * 0.5 + (q ? (rnd() - 0.5) * 0.8 : 0);
      for (let i = 0; i < 24 && a < la + span; i++) { const rr = lr * (rnd() < 0.42 ? 0.9 + rnd() * 0.4 : 0.42 + rnd() * 0.36) * (1 - 0.28 * Math.sin((a - la) / 2) ** 2);
        a += rr / ringR * 0.8; const d = ringR - rr * (0.78 + rnd() * 0.3);
        S.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.94, rr, la + (a - la) * 0.72 + (rnd() - 0.5) * 0.35, 0]);
        a += rr / ringR * (0.62 + rnd() * 0.55); }
      ringR -= lr * (1.25 + rnd() * 0.5);
    }
    if (R > 12 && rnd() < 0.75) S.push([x + (rnd() - 0.5) * R * 0.3, y + (rnd() - 0.5) * R * 0.3, clamp(R * (0.26 + rnd() * 0.14), 5, cap), la + (rnd() - 0.5) * 0.8, 0]);
    return S;
  }

  // ======================= cloud masses (ellipse unions, measured) =======================
  // [cx, cy, rx, ry] ; r = puff radius range ; dim = value multiplier
  const SKY_MASSES = [
    { e: [[780, 70, 200, 80], [680, 145, 95, 55], [890, 150, 95, 50], [600, 40, 60, 45], [975, 100, 60, 45]], r: [24, 44], dim: 0.9 },
    { e: [[320, 330, 165, 150], [245, 255, 85, 75], [450, 300, 110, 100], [520, 425, 100, 72], [225, 455, 75, 70], [390, 510, 115, 55], [505, 190, 70, 50], [345, 185, 60, 35]], r: [26, 50], dim: 0.95 },
    { e: [[320, 710, 160, 115], [530, 640, 160, 140], [745, 645, 160, 120], [915, 700, 115, 110], [610, 830, 220, 80], [460, 865, 130, 50], [890, 840, 120, 65],
      [1035, 795, 55, 75], [235, 805, 95, 62], [610, 525, 95, 65], [190, 645, 50, 55]], r: [26, 54], dim: 1 },
    { e: [[1115, 965, 85, 105], [1160, 1150, 45, 75], [1020, 1005, 45, 55]], r: [22, 40], dim: 0.85 },
    { e: [[1040, 1500, 140, 48], [1120, 1600, 95, 80], [960, 1620, 115, 42], [1070, 1700, 150, 60]], r: [22, 42], dim: 0.9 },
    { e: [[80, 1810, 140, 100], [55, 1955, 110, 80], [250, 1715, 110, 48], [300, 1820, 95, 66]], r: [22, 42], dim: 1.05 },
    { e: [[660, 1700, 100, 75], [770, 1755, 130, 70], [905, 1820, 160, 80], [1085, 1860, 135, 95], [660, 1860, 80, 75], [1010, 1950, 160, 55], [815, 1935, 100, 42], [1160, 1990, 65, 65], [900, 2040, 330, 90], [1040, 2150, 200, 70], [700, 2010, 110, 70]], r: [22, 44], dim: 1.05 },
  ];
  // streaky wisps: [x0,y0, x1,y1, thickness, bend]
  const WISPS0 = [[-20, 905, 330, 958, 22, -30], [60, 990, 470, 1065, 18, 25], [260, 955, 560, 990, 15, -20], [380, 1050, 600, 1010, 12, -16], [30, 700, 180, 690, 12, -18],
    [-10, 1200, 360, 1180, 16, 14], [60, 1270, 640, 1300, 20, -18], [240, 1245, 520, 1225, 12, 10], [-10, 1395, 250, 1372, 10, 10], [380, 1288, 620, 1248, 10, -14],
    [680, 1560, 930, 1515, 10, 12], [930, 1535, 1210, 1465, 12, -16], [990, 1180, 1210, 1148, 10, 10], [880, 1250, 1210, 1290, 14, -10],
    [300, 40, 430, 22, 10, -12], [900, 175, 1030, 235, 9, 10], [100, 545, 240, 520, 9, -10], [1040, 560, 1180, 600, 9, 10],
    [-10, 1490, 470, 1530, 18, -12], [20, 1580, 420, 1610, 16, 10], [100, 1650, 450, 1640, 14, -8], [700, 1648, 950, 1612, 11, -12], [870, 1420, 1210, 1400, 12, 8]];
  const WISPS = [[-20, 905, 300, 950, 18, -30], [60, 1000, 400, 1060, 13, 28], [30, 700, 170, 688, 9, -18], [-10, 1215, 280, 1180, 12, 22], [900, 1255, 1210, 1300, 11, -18],
    [-10, 1495, 360, 1535, 14, -20], [710, 1648, 940, 1612, 9, -14], [950, 1530, 1210, 1470, 10, -22], [100, 545, 230, 520, 7, -10], [60, 1600, 330, 1630, 11, 14]];
  // hooked cloud fragments: x, y, r, angle
  const CURLS = [[240, 150, 24, -0.4], [920, 412, 36, 0.3], [62, 420, 20, 2.0], [1010, 58, 15, 0], [190, 120, 13, 0.2], [1100, 380, 13, -0.2], [600, 1250, 14, 0.4], [80, 470, 14, 2.4], [960, 440, 18, 0.9]];

  const inMass = (m, x, y, sd) => { let f = -1; for (const [cx, cy, rx, ry] of m.e) f = Math.max(f, 1 - Math.hypot((x - cx) / rx, (y - cy) / ry)); return f + G.fbm(x * 0.009 + sd, y * 0.009, 3) * 0.85 + G.noise(x * 0.03 + sd, y * 0.03) * 0.12; };
  // dart-throwing puff placement inside a mass (no grid => no stamped repetition)
  function placePuffs(rnd, m, out) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [cx, cy, rx, ry] of m.e) { x0 = Math.min(x0, cx - rx); x1 = Math.max(x1, cx + rx); y0 = Math.min(y0, cy - ry); y1 = Math.max(y1, cy + ry); }
    const sd = rnd() * 100, mine = [];
    const tries = Math.round((x1 - x0) * (y1 - y0) / 80);
    for (let i = 0; i < tries; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), f = inMass(m, x, y, sd); if (f < 0.22) continue;
      const R = lerp(m.r[0] * 0.5, m.r[1] * 1.55, Math.pow(rnd(), 2.2)) * 1.0 * lerp(0.5, 1, smooth(0.1, 0.5, f));
      let ok = true; for (const p of mine) { if (Math.hypot(p.x - x, p.y - y) < (p.R + R) * 0.5) { ok = false; break; } }
      if (ok) mine.push({ x, y, R, dim: m.dim });
    }
    out.push(...mine);
  }

  // ======================= init =======================
  function init(ctx, W, H) {
    const s = W / RW, rnd = G.rng(4404);
    const mk = () => { const c = G.canvas(W, H), x = c.getContext('2d'); x.setTransform(s, 0, 0, s, 0, 0); x.lineJoin = 'round'; x.lineCap = 'round'; return [c, x]; };
    const S = { s };

    // ---------- glow sprites ----------
    const GS = 128, glowC = G.canvas(GS, GS), gx = glowC.getContext('2d'), gg = gx.createRadialGradient(GS / 2, GS / 2, 0, GS / 2, GS / 2, GS / 2);
    gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.2, 'rgba(255,255,255,0.55)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.15)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, GS, GS);
    const tint = (col) => { const c = G.canvas(GS, GS), x = c.getContext('2d'); x.drawImage(glowC, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, GS, GS); return c; };
    S.gBlue = tint('rgb(70,140,255)'); S.gIce = tint('rgb(170,215,255)'); S.gWhite = glowC;

    // ---------- SKY + cloud deck ----------
    const [sky, k] = mk();
    k.fillStyle = '#000'; k.fillRect(0, 0, RW, RH);
    // star dust (behind the clouds)
    for (let i = 0; i < 3800; i++) { const x = rnd() * RW, y = rnd() * 2100, m = rnd(), r = m < 0.9 ? 0.45 + rnd() * 0.5 : 1.0 + rnd() * 1.1;
      k.fillStyle = `rgba(${200 + rnd() * 55 | 0},${212 + rnd() * 43 | 0},255,${(0.65 + rnd() * 0.35).toFixed(2)})`; k.beginPath(); k.arc(x, y, r, 0, TAU); k.fill(); }
    // brighter round stars (as in the reference: crisp white dots scattered across the open sky)
    for (const [x, y, r] of [[805, 202, 3.6], [985, 330, 2.6], [550, 392, 3.4], [302, 790, 3], [393, 1030, 3.2], [515, 1078, 2.4], [168, 290, 1.8], [1090, 950, 2.4], [1170, 1190, 2], [645, 1290, 2.2],
      [1075, 1395, 2], [600, 1140, 1.8], [40, 1340, 1.8], [470, 1185, 2.2], [925, 1000, 1.8], [278, 625, 2], [1150, 820, 2], [33, 560, 1.6], [660, 590, 2.6], [512, 1470, 1.8], [1180, 1500, 1.6]]) {
      const rr = r * 1.2; k.globalCompositeOperation = 'lighter'; k.drawImage(S.gBlue, x - rr * 6, y - rr * 6, rr * 12, rr * 12); k.globalCompositeOperation = 'source-over'; k.fillStyle = '#fff'; k.beginPath(); k.arc(x, y, rr, 0, TAU); k.fill(); }
    // nebula pockets glowing inside the cloud deck (the light the clouds are lit by)
    for (const [x, y, r, a] of [[720, 85, 160, 0.75], [462, 386, 150, 0.8], [740, 760, 120, 0.5], [600, 720, 90, 0.25], [840, 1020, 160, 0.3]]) {
      const g = k.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(62,100,235,${a})`); g.addColorStop(0.55, `rgba(40,70,210,${a * 0.7})`); g.addColorStop(1, 'rgba(30,50,160,0)'); k.fillStyle = g; k.fillRect(x - r, y - r, r * 2, r * 2); }

    // streaky wisps: chains of flattened puffs with speed-hatching (drawn first, they sit behind the masses)
    const wispPuffs = [];
    for (const w of WISPS) { const [x0, y0, x1, y1, wd, bend] = w, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, ang = Math.atan2(dy, dx);
      const n = Math.max(4, Math.round(len / (wd * 2.2)));
      for (let i = 0; i < n; i++) { const t = (i + rnd() * 0.6) / n, b = Math.sin(Math.PI * t) * bend, x = x0 + dx * t + nx * b, y = y0 + dy * t + ny * b;
        const R = wd * (0.9 + rnd() * 0.9) * (0.5 + 0.6 * Math.sin(Math.PI * Math.min(1, 0.1 + t)));
        wispPuffs.push({ x, y, R, ang: ang + (rnd() - 0.5) * 0.25, asp: 0.4 + rnd() * 0.15 }); } }
    for (const P of wispPuffs) { const lb = lightAt(P.x, P.y), col = CLOUD(Math.min(0.8, lb * 0.6 + 0.17));
      drawPuff(k, { rnd, disks: makePuff(rnd, P.x, P.y, P.R * 1.6), cx: P.x, cy: P.y, rot: P.ang, asp: P.asp, top: mixc(col, [0, 0, 0], 0.12), line: 'rgba(0,0,5,0.92)', nl: 2, gap: 5, lw: 2.2, skip: 0.45 }); }
    // hatch strokes over the darkest wisp bands (the reference's dry-brush texture)
    k.lineWidth = 0.9;
    for (const [bx, by, bw, bh, n] of [[0, 1160, 300, 120, 30], [0, 1470, 300, 100, 22], [40, 960, 300, 80, 18]]) for (let i = 0; i < n; i++) {
      const x = bx + rnd() * bw, y = by + rnd() * bh, l = 16 + rnd() * 46; k.strokeStyle = `rgba(52,56,100,${(0.12 + rnd() * 0.22).toFixed(2)})`;
      k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + l * 0.5, y - l * 0.22, x + l, y - l * 0.3); k.stroke(); }

    // the cumulus masses
    const massBase = (cx2, m, shrink) => { for (const [cx, cy, rx, ry] of m.e) { const n = 30; cx2.beginPath();
        for (let i = 0; i < n; i++) { const a = i / n * TAU, w = shrink + G.fbm(Math.cos(a) * 1.3 + cx * 0.01, Math.sin(a) * 1.3 + cy * 0.01, 2) * 0.25;
          const px = cx + Math.cos(a) * rx * w, py = cy + Math.sin(a) * ry * w; i ? cx2.lineTo(px, py) : cx2.moveTo(px, py); }
        cx2.closePath(); const lb = lightAt(cx, cy), col = mixc(CLOUD(Math.min(0.62, lb * 0.5 + 0.2)), [0, 0, 0], 0.3);
        const g = cx2.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry)); g.addColorStop(0, css(col)); g.addColorStop(1, css(mixc(col, [8, 8, 22], 0.5)));
        cx2.fillStyle = g; cx2.fill(); } };
    SKY_MASSES.slice(0, 5).forEach(m => massBase(k, m, 0.62));
    k.globalCompositeOperation = 'lighter';
    for (const [x, y, sg, st] of LIGHTS.slice(0, 5)) { const g = k.createRadialGradient(x, y, 0, x, y, sg * 1.3); g.addColorStop(0, `rgba(44,78,215,${st * 0.5})`); g.addColorStop(0.5, `rgba(36,62,190,${st * 0.22})`); g.addColorStop(1, 'rgba(30,50,170,0)'); k.fillStyle = g; k.fillRect(x - sg * 1.3, y - sg * 1.3, sg * 2.6, sg * 2.6); }
    k.globalCompositeOperation = 'source-over';
    const puffs = []; SKY_MASSES.forEach(m => placePuffs(rnd, m, puffs));
    puffs.sort((a, b) => a.y - b.y);
    for (const P of puffs) {
      const lb = lightAt(P.x, P.y - P.R * 0.5);
      // open pockets where the nebula / column light is strongest so the glow reads through the deck
      if (P.y < 1300 && lb > 0.45 && G.noise(P.x * 0.02 + 5, P.y * 0.02) + (lb - 0.45) * 0.8 > 0.5) continue;
      const v = Math.min(P.y < 1300 ? 0.5 : 1.15, Math.max(0.17 + 0.07 * G.noise(P.x * 0.004 + 3, P.y * 0.004), lb * 0.5) * P.dim), top = mixc(CLOUD(v + 0.01), [0, 0, 2], 0.22 * (1 - smooth(0.2, 0.5, v)));
      const lit = v > 0.42;
      drawPuff(k, { rnd, disks: makePuff(rnd, P.x, P.y, P.R), top, line: lit ? 'rgba(2,5,34,0.95)' : 'rgba(0,0,5,0.95)', nl: 4, skip: 0.1, gap: 4.1 + rnd() * 0.8, lw: 2.1 + rnd() * 0.4,
        rim: lb > 0.5 ? css(mixc(top, [150, 190, 255], 0.5), clamp((lb - 0.5) * 0.6, 0.06, 0.5)) : null, rimW: 1.6 });
    }
    // hooked curls
    for (const [x, y, r, a] of CURLS) { k.save(); k.translate(x, y); k.rotate(a); k.fillStyle = 'rgb(28,31,60)'; k.strokeStyle = 'rgb(0,0,5)'; k.lineWidth = 1.8;
      k.beginPath(); k.arc(0, 0, r, Math.PI * 0.95, Math.PI * 2.15); k.quadraticCurveTo(r * 0.55, r * 0.05, r * 0.45, r * 0.35); k.arc(r * 0.12, r * 0.22, r * 0.55, Math.PI * 0.1, Math.PI * 1.0, true); k.closePath(); k.fill(); k.stroke();
      k.fillStyle = 'rgba(0,0,5,0.9)'; k.beginPath(); brushArc(k, 0, 0, r * 0.78, Math.PI * 1.05, Math.PI * 1.95, 1.6, -Math.PI / 2, -0.4, 5); k.fill(); k.restore(); }
    // star clusters caught in the lit pockets (they sit on top of the deck, as in the reference)
    for (const [x, y, rr, n] of [[720, 85, 120, 95], [700, 70, 50, 30], [462, 386, 100, 70], [740, 770, 70, 14], [430, 745, 50, 8], [830, 1020, 100, 16], [600, 140, 60, 10]]) for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * rr; k.fillStyle = `rgba(225,236,255,${(0.45 + rnd() * 0.55).toFixed(2)})`; k.beginPath(); k.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0.6 + rnd() * 1.2, 0, TAU); k.fill(); }
    for (const [x, y, r] of [[718, 84, 4.4], [462, 390, 3.2], [275, 383, 2.8], [740, 762, 2.4], [632, 590, 2.6]]) { k.globalCompositeOperation = 'lighter'; k.drawImage(S.gBlue, x - r * 7, y - r * 7, r * 14, r * 14); k.globalCompositeOperation = 'source-over'; k.fillStyle = '#fff'; k.beginPath(); k.arc(x, y, r, 0, TAU); k.fill(); }
    S.sky = sky;

    // ---------- BACKGLOW + lower cloud banks + fire-lit smoke (behind the creature and the city) ----------
    const [bg, b] = mk();
    b.globalCompositeOperation = 'lighter';
    for (const [x, y, r, c0, a] of [[640, 2120, 300, [190, 210, 255], 0.75], [1010, 2210, 270, [170, 200, 255], 0.65], [0, 2060, 200, [140, 185, 255], 0.6],
      [600, 2010, 130, [210, 228, 255], 0.55], [840, 2150, 200, [150, 175, 245], 0.4], [270, 2150, 200, [70, 110, 230], 0.3], [140, 1880, 200, [40, 80, 220], 0.35], [660, 1760, 200, [40, 80, 220], 0.35], [540, 1700, 230, [60, 110, 240], 0.5], [590, 1960, 150, [170, 205, 255], 0.55]]) {
      const g = b.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, css(c0, a)); g.addColorStop(0.45, css(mixc(c0, [60, 100, 220], 0.6), a * 0.45)); g.addColorStop(1, css([40, 70, 200], 0));
      b.fillStyle = g; b.fillRect(x - r, y - r, r * 2, r * 2); }
    b.globalCompositeOperation = 'source-over';
    // fire-lit smoke tongues: rising, branching white ribbons, blue halo and a broken ink edge
    const stream = (pts, w, lit) => {
      const n = 46, L = [], R = [];
      const at = t => { const f2 = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f2)), q = f2 - i, P0 = pts[Math.max(0, i - 1)], P1 = pts[i], P2 = pts[i + 1], P3 = pts[Math.min(pts.length - 1, i + 2)];
        const cr = (a0, a1, a2, a3) => 0.5 * (2 * a1 + (-a0 + a2) * q + (2 * a0 - 5 * a1 + 4 * a2 - a3) * q * q + (-a0 + 3 * a1 - 3 * a2 + a3) * q * q * q); return [cr(P0[0], P1[0], P2[0], P3[0]), cr(P0[1], P1[1], P2[1], P3[1])]; };
      for (let i = 0; i <= n; i++) { const t = i / n, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.02)), [x1, y1] = at(Math.max(0, t - 0.02)); const dx = x2 - x1, dy = y2 - y1, dl = Math.hypot(dx, dy) || 1;
        const ww = w * Math.pow(1 - t, 0.75) * (0.42 + 0.5 * Math.max(0, G.noise(t * 7 + pts[0][0] * 0.1, 3.3) + 0.35) + 0.12 * Math.sin(t * 51 + pts[0][1])) * 0.5 + 1.2;
        const wob = (G.noise(t * 9 + pts[0][1] * 0.1, 7.1) * 0.5 + G.noise(t * 23 + pts[0][0], 1.3) * 0.2) * w * (0.35 + 0.5 * t); L.push([x - dy / dl * (ww + wob), y + dx / dl * (ww + wob)]); R.push([x + dy / dl * (ww - wob), y - dx / dl * (ww - wob)]); }
      const path = () => { b.beginPath(); L.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); for (let i = R.length - 1; i >= 0; i--) b.lineTo(R[i][0], R[i][1]); b.closePath(); };
      b.save(); b.shadowColor = 'rgba(110,160,255,0.9)'; b.shadowBlur = 14 * s; path(); { const e = pts[pts.length - 1], sg = b.createLinearGradient(pts[0][0], pts[0][1], e[0], e[1]); sg.addColorStop(0, css([190, 212, 255], 0.9 * lit)); sg.addColorStop(0.55, css([120, 160, 245], 0.85 * lit)); sg.addColorStop(1, css([54, 86, 190], 0.7 * lit)); b.fillStyle = sg; } b.fill(); b.restore();
      b.save(); path(); b.clip(); b.lineWidth = w * 0.42; b.strokeStyle = css([245, 248, 255], 0.95 * lit); b.beginPath(); for (let i = 0; i <= n * 0.6; i++) { const [x, y] = at(i / n); i ? b.lineTo(x, y) : b.moveTo(x, y); } b.stroke(); b.restore();
      path(); b.strokeStyle = 'rgba(8,16,60,0.6)'; b.lineWidth = 1.2; b.stroke();
    };
    // lower cloud banks: left band behind the plates, right band over the burning city
    const low = []; [SKY_MASSES[5], SKY_MASSES[6]].forEach(m => placePuffs(rnd, m, low));
    // extra puffs hugging the skyline glow so the city reads as backlit by smoke
    for (let i = 0; i < 14; i++) { const x = 560 + rnd() * 660, y = 2060 + rnd() * 130; low.push({ x, y, R: 20 + rnd() * 30, dim: 1.2, hot: 1 }); }
    for (let i = 0; i < 10; i++) { const x = -20 + rnd() * 150, y = 1990 + rnd() * 170; low.push({ x, y, R: 20 + rnd() * 22, dim: 1.15, hot: 1 }); }
    low.sort((a, b2) => a.y - b2.y);
    const STREAMS = [[[650, 2070], [690, 2000], [672, 1940], [726, 1886], [770, 1850], [800, 1800]], [[712, 2030], [770, 1965], [808, 1905], [796, 1858], [852, 1826], [905, 1832]],
      [[780, 2090], [842, 2036], [884, 1994], [944, 1960], [992, 1912], [1060, 1880]], [[870, 2120], [935, 2075], [1004, 2052], [1062, 2012], [1122, 1990], [1210, 1984]],
      [[930, 2190], [992, 2146], [1062, 2122], [1132, 2084], [1210, 2078]], [[1004, 1960], [1052, 1902], [1110, 1862], [1170, 1830], [1215, 1806]],
      [[1040, 2215], [1086, 2180], [1152, 2170], [1214, 2150]], [[612, 1920], [650, 1870], [700, 1846], [740, 1790]], [[840, 1972], [874, 1918], [930, 1892], [982, 1860]],
      [[22, 2140], [44, 2070], [22, 2004], [56, 1950]], [[112, 2170], [134, 2108], [176, 2072]], [[730, 2100], [748, 2040], [740, 1990]]];
    const half = Math.ceil(low.length * 0.78);
    const drawLow = (L) => {
      const lb = lightAt(L.x, L.y - L.R * 0.6) * (L.dim || 1), g = smooth(1770, 2160, L.y - (L.x - 760) * 0.13);
      const v = L.x > 520 ? Math.min(1.6, (0.18 + 1.4 * g * g * g * (0.45 + 0.55 * Math.exp(-(((L.x - 740) / 340) ** 2))) + 0.1 * G.noise(L.x * 0.006, L.y * 0.006) + (L.y < 1900 ? 0.25 * Math.exp(-(((L.x - 640) / 90) ** 2) - (((L.y - 1760) / 120) ** 2)) : 0)) * (L.dim || 1))
        : Math.min(L.y < 2010 ? 0.8 : 1.45, lb * lerp(0.42, 0.85, smooth(1920, 2120, L.y)));
      const top = CLOUD(v + 0.02), hot = v > 0.8;
      drawPuff(b, { rnd, disks: makePuff(rnd, L.x, L.y, L.R, -Math.PI / 2 - 0.35), top, la: -Math.PI / 2 - 0.35,
        line: hot ? css(mixc(top, [14, 30, 120], 0.72), 0.9) : v > 0.42 ? 'rgba(2,5,36,0.94)' : 'rgba(0,0,6,0.94)', nl: hot ? 2 : 3, gap: 4.6, lw: hot ? 1.9 : 2.3,
        rim: v > 0.45 ? css(mixc(top, [235, 244, 255], 0.7), clamp((v - 0.4) * 0.8, 0.08, 0.9)) : null, rimW: 2.2 });
    };
    // torn ribbons of fire-lit smoke: chains of flat lobes with a white windward edge and two flat shade steps, no gradients
    const crAt = (pts, t) => { const f2 = clamp(t) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f2)), q = f2 - i, P0 = pts[Math.max(0, i - 1)], P1 = pts[i], P2 = pts[i + 1], P3 = pts[Math.min(pts.length - 1, i + 2)];
      const cr = (a0, a1, a2, a3) => 0.5 * (2 * a1 + (-a0 + a2) * q + (2 * a0 - 5 * a1 + 4 * a2 - a3) * q * q + (-a0 + 3 * a1 - 3 * a2 + a3) * q * q * q); return [cr(P0[0], P1[0], P2[0], P3[0]), cr(P0[1], P1[1], P2[1], P3[1])]; };
    const ribbon = (pts, w, c0, c1, c2, seed) => { const rr = G.rng(seed), D = []; let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (let t = 0, n = 0; t < 1 && n < 900; n++) { const [x, y] = crAt(pts, t), [x2, y2] = crAt(pts, t + 0.01), dx = x2 - x, dy = y2 - y, dl = Math.hypot(dx, dy) || 1;
        const env = Math.pow(Math.sin(Math.PI * clamp(t * 0.9 + 0.08)), 1.15), r = Math.max(1.3, w * env * (0.3 + 0.85 * Math.max(0, G.noise(t * 4.3 + seed * 1.7, 2.2) * 0.9 + 0.42)));
        const sway = G.noise(t * 6.1 + seed, 8.4) * w * 0.55 * env; D.push([x - dy / dl * sway, y + dx / dl * sway, r]);
        if (rr() < 0.16 && r > 4) { const br = r * (0.45 + rr() * 0.5); D.push([x - dy / dl * sway + dy / dl * (r * 0.75) * (rr() < 0.8 ? 1 : -1), y + dx / dl * sway - dx / dl * (r * 0.75), br]); }
        t += Math.max(1.2, r * 0.3) / len; }
      // a torn flick off the windward side, two thirds along
      { const t0 = 0.45 + rr() * 0.3, [x, y] = crAt(pts, t0), [x2, y2] = crAt(pts, t0 + 0.02); let a = Math.atan2(y2 - y, x2 - x) - 0.75, cx = x, cy = y; const n = 14 + (rr() * 8 | 0);
        for (let i = 0; i < n; i++) { a += 0.05 + i * 0.012; cx += Math.cos(a) * w * 0.2; cy += Math.sin(a) * w * 0.2; D.push([cx, cy, Math.max(1, w * 0.3 * (1 - i / n))]); } }
      const path = (ox, oy, gr) => { b.beginPath(); for (const [x, y, r] of D) { const q = Math.max(0.4, r + gr); b.moveTo(x + ox + q, y + oy); b.arc(x + ox, y + oy, q, 0, TAU); } };
      b.fillStyle = 'rgba(3,7,40,0.85)'; path(0, 0, 1.1); b.fill();
      b.fillStyle = css(c0); path(0, 0, 0); b.fill();
      b.save(); path(0, 0, 0); b.clip(); b.fillStyle = css(c1); path(w * 0.1, w * 0.17, -0.4); b.fill(); b.fillStyle = css(c2); path(w * 0.42, w * 0.7, -w * 0.1); b.fill(); b.restore(); };
    low.slice(0, half).forEach(drawLow);
    const WH = [248, 251, 255], PA = [176, 200, 252], MB = [104, 134, 226], LV = [126, 128, 186], DL = [70, 74, 132], DB = [34, 44, 104];
    for (const [pts, w, c0, c1, c2] of [
      [[[680, 1700], [760, 1680], [830, 1664], [905, 1648]], 11, [52, 70, 150], DB, [20, 26, 70]],
      [[[976, 1846], [1004, 1818], [1040, 1826], [1066, 1800]], 19, LV, DL, [44, 46, 92]],
      [[[1052, 1806], [1090, 1770], [1130, 1756], [1180, 1722]], 10, [150, 154, 206], LV, DL],
      [[[648, 2030], [700, 1972], [766, 1916], [822, 1852], [878, 1834], [922, 1802], [980, 1784]], 21, WH, PA, MB],
      [[[742, 1968], [770, 1920], [760, 1876], [790, 1838]], 9, WH, PA, MB],
      [[[824, 1996], [896, 1962], [958, 1914], [1006, 1852], [1056, 1794]], 18, WH, PA, MB],
      [[[984, 1988], [1040, 1954], [1090, 1930], [1146, 1962]], 11, WH, PA, MB],
      [[[864, 2100], [936, 2082], [1000, 2064], [1058, 2094], [1122, 2126], [1204, 2096]], 21, WH, PA, MB],
      [[[1008, 2164], [1072, 2170], [1136, 2146], [1204, 2128]], 15, WH, [200, 218, 255], PA],
      [[[568, 2000], [606, 2026], [640, 2068], [690, 2084]], 15, WH, [206, 222, 255], PA],
      [[[1100, 1990], [1150, 1948], [1206, 1930]], 12, PA, MB, [60, 84, 180]],
      [[[14, 2140], [40, 2064], [26, 1996], [52, 1950]], 14, WH, PA, MB],
      [[[96, 2176], [128, 2112], [172, 2076]], 9, WH, PA, MB]]) ribbon(pts, w, c0, c1, c2, 31 + pts.length * 7 + w);
    low.slice(half).forEach(drawLow);
    // hot skyline haze: the fire light floods up from behind the blocks
    b.globalCompositeOperation = 'lighter';
    for (const [x0, x1, a0, yc] of [[540, 900, 0.95, 2180], [860, 1200, 0.7, 2215], [0, 120, 0.45, 2120]]) {
      const g = b.createLinearGradient(0, yc + 80, 0, yc - 200); g.addColorStop(0, `rgba(215,225,255,${a0})`); g.addColorStop(0.35, `rgba(160,180,250,${a0 * 0.5})`); g.addColorStop(1, 'rgba(80,120,230,0)');
      b.fillStyle = g; b.beginPath(); b.ellipse((x0 + x1) / 2, yc, (x1 - x0) / 2 * 1.1, 220, 0, 0, TAU); b.fill(); }
    b.globalCompositeOperation = 'source-over';
    for (const [cx, cy, rx, ry, a] of [[740, 2130, 230, 150, 1], [740, 2150, 150, 90, 1], [620, 2110, 120, 130, 0.9], [1060, 2205, 220, 110, 0.95], [900, 2180, 210, 100, 0.9]]) { b.save(); b.translate(cx, cy); b.scale(rx, ry);
      const g = b.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(250,252,255,${a})`); g.addColorStop(0.45, `rgba(214,226,255,${a * 0.7})`); g.addColorStop(1, 'rgba(150,180,250,0)'); b.fillStyle = g; b.fillRect(-1, -1, 2, 2); b.restore(); }
    S.back = bg;

    // ---------- PLUME (smoke column) ----------
    const [pl, p] = mk();
    const plumeLight = (x, y) => {
      let best = 0;
      for (let u = 0; u <= 1; u += 0.02) { const c = colAt(u), nx = c.ty, ny = -c.tx; // left of travel
        const cx = c.x + nx * c.hw * 0.14, cy = c.y + ny * c.hw * 0.14, d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (c.hw * c.hw * 0.5);
        const v = c.lit * Math.exp(-d2); if (v > best) best = v; }
      return best * 1.08 + 0.6 * Math.exp(-(((x - 660) ** 2) + ((y - 1500) ** 2)) / (85 * 85)) + 0.35 * Math.exp(-(((x - 800) ** 2) + ((y - 1030) ** 2)) / (70 * 70));
    };
    // glowing interior (visible through the gaps between billows)
    for (let u = 0.07; u <= 0.86; u += 0.008) { const c = colAt(u), lb = plumeLight(c.x - c.hw * 0.2, c.y) * 0.82, R = c.hw * (0.8 - smooth(0.6, 0.86, u) * 0.3);
      const hotk = 1 - smooth(0.12, 0.42, u), col = mixc(mixc(PLUME(lb * 1.08), CLOUD(lightAt(c.x, c.y) * 0.8), smooth(0.82, 1, u) * 0.8), [236, 246, 255], hotk);
      const g = p.createRadialGradient(c.x - c.hw * 0.25, c.y, 0, c.x, c.y, R); g.addColorStop(0, css(col)); g.addColorStop(0.65, css(mixc(col, mixc([18, 30, 96], [120, 180, 250], hotk), 0.35))); g.addColorStop(1, css(mixc(col, mixc([6, 10, 40], [70, 130, 240], hotk), 0.75), 0));
      p.fillStyle = g; p.beginPath(); p.arc(c.x, c.y, R, 0, TAU); p.fill(); }
    // billows: placed by dart throwing inside the column envelope
    const pp = [];
    for (let i = 0; i < 4200; i++) { const u = Math.pow(rnd(), 1.05), c = colAt(u), v = (rnd() * 2 - 1), rag = 0.95 + 0.35 * G.noise(u * 7 + (v > 0 ? 3 : 9), 1.7), x = c.x - c.ty * v * c.hw * rag, y = c.y + c.tx * v * c.hw * rag;
      const R = c.hw * (0.11 + Math.pow(rnd(), 1.8) * 0.5) * (1 - Math.abs(v) * 0.3) * (0.85 + 0.6 * Math.max(0, G.noise(u * 11, 5.1))) + 5;
      let ok = true; for (const q of pp) if (Math.hypot(q.x - x, q.y - y) < (q.R + R) * 0.52) { ok = false; break; } if (!ok) continue;
      { const ba = (x - 500) * 0.67 - (y - 1703) * 0.742, bc = (x - 500) * 0.742 + (y - 1703) * 0.67; if (ba < 205 && Math.abs(bc) < 16 + ba * 0.1) continue; }
      const lb = plumeLight(x, y); if (lb > 0.72 && Math.abs(v) < 0.6 && G.noise(x * 0.03, y * 0.03) + (lb - 0.72) > 0.18) continue; // light gaps in the core
      pp.push({ x, y, R, u, v }); }
    // torn edge billows (smaller, ragged flanks)
    for (let u = 0.03; u <= 0.98; u += 0.013) { const c = colAt(u), side = rnd() < 0.62 ? 1 : -1, rag = 0.98 + 0.3 * G.noise(u * 7 + (side > 0 ? 3 : 9), 1.7) + rnd() * 0.1, x = c.x - c.ty * side * c.hw * rag, y = c.y + c.tx * side * c.hw * rag;
      const R = 7 + Math.pow(rnd(), 1.6) * c.hw * 0.3; pp.push({ x, y, R, u, v: side, edge: 1, ax: x + c.ty * side * R * 0.7, ay: y - c.tx * side * R * 0.7 }); }
    S.edgeB = [];
    const edgeCtx = L => { const pad = L.R * 1.8 + 8, n = Math.ceil(pad * 2 * s), cv = G.canvas(n, n), cx = cv.getContext('2d'); cx.setTransform(s, 0, 0, s, -(L.x - pad) * s, -(L.y - pad) * s); cx.lineJoin = 'round'; cx.lineCap = 'round';
      S.edgeB.push([cv, L.x - pad, L.y - pad, pad * 2, L.ax, L.ay, rnd() * TAU, 0.16 + rnd() * 0.22]); return cx; };
    pp.sort((a, b2) => a.y - b2.y);
    for (const L of pp) {
      const lb = plumeLight(L.x, L.y - L.R * 0.4) * (0.9 + rnd() * 0.2) * (1 - 0.72 * smooth(0.3, 0.95, Math.abs(L.v)) * smooth(0.16, 0.4, L.u)), topFade = smooth(0.8, 1.0, L.u);
      const top = mixc(PLUME(lb), CLOUD(lightAt(L.x, L.y) * 0.8), topFade * 0.85), hot = lb > 0.9, mid = lb > 0.42, bot = hot ? PLUME(lb * 0.84) : mixc(PLUME(lb * 0.55), [8, 10, 34], 0.25 + topFade * 0.3);
      // light comes from the column's inner core (left) and from the beam below: tilt the line side accordingly
      const la = -Math.PI / 2 - 0.5 + (L.u < 0.15 ? 0.9 : 0);
      drawPuff(L.edge ? edgeCtx(L) : p, { rnd, disks: makePuff(rnd, L.x, L.y, L.R, la), ink: hot ? css(mixc(top, [30, 70, 170], 0.55)) : mid ? css(mixc(top, [2, 8, 46], 0.85)) : 'rgb(0,1,8)', top, bot,
        line: hot ? css(mixc(top, [40, 96, 210], 0.55), 0.95) : mid ? css(mixc(top, [4, 14, 74], 0.75), 0.95) : 'rgba(0,1,10,0.94)', nl: hot ? 2 : 2 + (rnd() * 3 | 0), skip: 0.12, gap: 4.4 + rnd() * 0.8, lw: hot ? 2 : 2.5,
        rim: lb > 0.4 ? css([225, 240, 255], clamp((lb - 0.4) * 0.7, 0.08, 0.8)) : null, rimW: 2, la });
    }
    // detached torn curls of lit smoke
    for (const [x, y, r, a] of [[662, 1290, 13, 0.5], [646, 1252, 9, -0.2], [960, 1340, 10, 0.8], [985, 1190, 9, 0.3], [690, 1170, 8, 1.2], [930, 1440, 9, 0.4], [600, 1440, 8, 0.9], [1005, 1062, 10, 0.2],
      [655, 1060, 9, -0.6], [1010, 905, 8, 0.4], [616, 980, 7, -0.4]]) {
      p.save(); p.translate(x, y); p.rotate(a); p.fillStyle = 'rgb(48,84,178)'; p.strokeStyle = 'rgb(2,6,34)'; p.lineWidth = 1.5;
      p.beginPath(); p.arc(0, 0, r, Math.PI * 0.9, Math.PI * 2.2); p.quadraticCurveTo(r * 0.5, r * 0.2, r * 0.3, r * 0.5); p.arc(r * 0.1, r * 0.25, r * 0.5, Math.PI * 0.2, Math.PI * 1.0, true); p.closePath(); p.fill(); p.stroke(); p.restore(); }
    // stars caught in the plume
    for (const [x, y, r] of [[780, 1062, 2.4], [836, 1132, 1.9], [748, 1300, 1.7], [880, 980, 1.6], [705, 1395, 1.4], [810, 1220, 1.3], [760, 900, 1.6], [870, 1200, 1.2]]) {
      p.globalCompositeOperation = 'lighter'; p.drawImage(S.gIce, x - r * 5, y - r * 5, r * 10, r * 10); p.globalCompositeOperation = 'source-over'; p.fillStyle = 'rgba(245,250,255,0.98)'; p.beginPath(); p.arc(x, y, r, 0, TAU); p.fill(); }
    S.plume = pl;

    // ---------- GODZILLA ----------
    const [gz, g2] = mk();
    bakeGodzilla(g2, gz, rnd, s);
    S.godz = gz;

    // ---------- CITY ----------
    const [ct, c2] = mk();
    S.windows = bakeCity(c2, rnd);
    S.city = ct;

    // ---------- animated element tables ----------
    const sc = G.canvas(120, 240), sx = sc.getContext('2d'); sx.drawImage(sky, 0, 0, 120, 240); const sd = sx.getImageData(0, 0, 120, 240).data;
    const lumAt = (x, y) => { const i = ((Math.min(239, y / 10 | 0)) * 120 + Math.min(119, x / 10 | 0)) * 4; return sd[i] + sd[i + 1] + sd[i + 2]; };
    S.tw = []; for (let i = 0; i < 8000 && S.tw.length < 280; i++) { const x = rnd() * RW, y = rnd() * 1900; if (lumAt(x, y) < 40 && !(x > 560 && x < 1000 && y > 700 && y < 1600)) S.tw.push([x, y, 0.7 + rnd() * 1.3, rnd() * TAU, 0.6 + rnd() * 2]); }
    // four-point sparkles, measured [x, y, size]
    S.cross = [[75, 208, 34], [862, 335, 22], [1077, 482, 30], [122, 732, 38], [528, 1028, 19], [150, 1140, 21], [1100, 665, 15], [1108, 1396, 14], [330, 96, 13], [968, 1150, 12]];
    S.burst = [[1075, 290, 42], [82, 1100, 34]];
    S.sparks = []; for (let i = 0; i < 150; i++) S.sparks.push([rnd(), 0.15 + rnd() * 0.45, (rnd() - 0.5) * 2.4, 0.7 + rnd() * 2.0, rnd()]);
    S.flicks = []; for (let i = 0; i < 30; i++) S.flicks.push([rnd(), rnd() < 0.5 ? -1 : 1, 16 + rnd() * 36, 0.25 + rnd() * 0.35, rnd()]);
    S.embers = []; for (let i = 0; i < 80; i++) S.embers.push([rnd() < 0.85 ? 480 + rnd() * 720 : rnd() * 160, 2040 + rnd() * 220, 0.04 + rnd() * 0.07, 0.8 + rnd() * 1.4, rnd() * TAU]);
    return S;
  }

  // ======================= Godzilla =======================
  function bodyPath(c) { G.spline(c, BODY, true, 0.3); }
  function armPath(c) { G.spline(c, ARM, true, 0.45); }
  // dorsal plates, hand-placed: [tipX, tipY, rootY on the spine, half-width]. Outer row = the big blades, inner row rides the spine.
  const PLATES_OUT = [[388, 1716, 1752, 13], [354, 1727, 1778, 21], [318, 1735, 1808, 25], [286, 1722, 1840, 27], [212, 1736, 1870, 41], [202, 1794, 1902, 33], [173, 1832, 1936, 36],
    [158, 1878, 1964, 28], [118, 1894, 1994, 43], [142, 1953, 2026, 35], [132, 1999, 2060, 36], [150, 2044, 2092, 31], [165, 2082, 2120, 27], [176, 2112, 2142, 23]];
  const PLATES_IN = [[374, 1746, 1790, 11], [340, 1770, 1826, 15], [308, 1795, 1862, 18], [283, 1831, 1897, 19], [259, 1867, 1931, 20], [241, 1905, 1967, 20], [223, 1945, 2003, 20],
    [205, 1987, 2041, 19], [191, 2029, 2077, 17], [181, 2067, 2107, 15]];
  // one jagged blade: a long main point with barbs swept toward the tip, dark fill, ice-white edge
  function plate(f, tx, ty, rootY, hw, seed, inner) {
    const r2 = G.rng(seed), rx = spXatY(rootY) + 8, ry = rootY;
    const dx0 = tx - rx, dy0 = ty - ry, L = Math.hypot(dx0, dy0), dx = dx0 / L, dy = dy0 / L, px = dy, py = -dx; // lateral + = head side
    const P = (a, c) => [rx + dx * a * L + px * c * hw, ry + dy * a * L + py * c * hw];
    const j = () => (r2() - 0.5) * 0.07, k = () => 0.88 + r2() * 0.26;
    const pts = [P(-0.05, 1.0), P(0.16, 0.92), P(0.31 + j(), 1.3 * k()), P(0.3, 0.74), P(0.47, 0.6), P(0.6 + j(), 0.92 * k()), P(0.6, 0.42), P(0.78, 0.22), P(1, 0),
      P(0.8, -0.2), P(0.66, -0.36), P(0.7 + j(), -0.74 * k()), P(0.5, -0.52), P(0.38, -0.66), P(0.44 + j(), -1.12 * k()), P(0.22, -0.84), P(0.1, -0.94), P(-0.05, -1.0)];
    const path = () => { f.beginPath(); pts.forEach(([x, y], i) => i ? f.lineTo(x, y) : f.moveTo(x, y)); f.closePath(); };
    f.lineJoin = 'miter'; f.miterLimit = 6;
    path(); f.strokeStyle = 'rgb(0,0,5)'; f.lineWidth = 5; f.stroke();
    const g = f.createLinearGradient(rx, ry, tx, ty);
    g.addColorStop(0, inner ? 'rgb(20,42,138)' : 'rgb(15,30,104)'); g.addColorStop(0.3, inner ? 'rgb(10,16,56)' : 'rgb(8,12,42)'); g.addColorStop(1, 'rgb(4,5,18)');
    f.fillStyle = g; f.fill();
    // facet crease + a few energy flecks
    f.save(); path(); f.clip();
    f.strokeStyle = 'rgba(70,120,255,0.24)'; f.lineWidth = 1.1; f.beginPath(); let m0 = P(0.06, 0.1), m1 = P(0.9, 0); f.moveTo(m0[0], m0[1]); f.lineTo(m1[0], m1[1]);
    m0 = P(0.2, 0.05); m1 = P(0.5, 0.75); f.moveTo(m0[0], m0[1]); f.lineTo(m1[0], m1[1]); m0 = P(0.3, 0); m1 = P(0.55, -0.6); f.moveTo(m0[0], m0[1]); f.lineTo(m1[0], m1[1]); f.stroke();
    f.restore();
    // ice edge: bright at the points, dying toward the root
    const rg = f.createLinearGradient(rx, ry, tx, ty); rg.addColorStop(0, 'rgba(90,140,255,0)'); rg.addColorStop(0.22, 'rgba(130,180,255,0.45)'); rg.addColorStop(0.62, 'rgba(215,232,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,1)');
    path(); f.strokeStyle = rg; f.lineWidth = inner ? 1.2 : 1.5; f.stroke();
    f.lineJoin = 'round';
    f.fillStyle = 'rgba(215,232,255,0.9)';
    for (let i = 0; i < (inner ? 2 : 4); i++) { const q = P(0.12 + r2() * 0.45, (r2() - 0.5) * 0.9); f.beginPath(); f.arc(q[0], q[1], 0.6 + r2() * 1.1, 0, TAU); f.fill(); }
  }
  function bakeGodzilla(f, canvas, rnd, s) {
    // ---- blue energy haze behind the plates (tight to the spine) ----
    f.save(); f.globalCompositeOperation = 'lighter';
    for (let u = 0.04; u <= 0.84; u += 0.025) { const [x, y] = spAt(u); const R = 105, cx = x - 46, cy = y - 22; const gr = f.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, 'rgba(26,64,235,0.085)'); gr.addColorStop(1, 'rgba(26,64,235,0)'); f.fillStyle = gr; f.fillRect(cx - R, cy - R, R * 2, R * 2); }
    f.restore();
    let seed = 900;
    PLATES_OUT.forEach(q => plate(f, q[0], q[1], q[2], q[3], seed++, 0));
    // glow at the plate roots, then the inner row on top of it
    f.save(); f.globalCompositeOperation = 'lighter';
    for (let u = 0.04; u <= 0.84; u += 0.02) { const [x, y] = spAt(u); const gr = f.createRadialGradient(x - 20, y - 8, 0, x - 20, y - 8, 50); gr.addColorStop(0, 'rgba(36,88,255,0.2)'); gr.addColorStop(1, 'rgba(36,88,255,0)'); f.fillStyle = gr; f.fillRect(x - 70, y - 58, 100, 100); }
    f.restore();
    PLATES_IN.forEach(q => plate(f, q[0], q[1], q[2], q[3], seed++, 1));
    // crest spike laid back from the skull
    f.fillStyle = 'rgb(8,10,32)'; f.strokeStyle = 'rgb(0,0,5)'; f.lineWidth = 3; f.beginPath(); f.moveTo(432, 1708); f.lineTo(399, 1714); f.lineTo(418, 1727); f.closePath(); f.stroke(); f.fill();
    f.strokeStyle = 'rgba(232,242,255,0.95)'; f.lineWidth = 1.8; f.beginPath(); f.moveTo(430, 1710); f.lineTo(402, 1714.5); f.stroke();
    f.save(); f.globalCompositeOperation = 'lighter';
    { const sr = G.rng(5150); for (let i = 0; i < 46; i++) { const u = 0.06 + sr() * 0.76, [x, y, tx, ty] = spAt(u), off = 6 + Math.pow(sr(), 1.6) * 62; const qx = x + ty * off + (sr() - 0.5) * 10, qy = y - tx * off + (sr() - 0.5) * 10, r = 0.6 + sr() * 1.5;
      f.fillStyle = `rgba(200,228,255,${(0.5 + sr() * 0.5).toFixed(2)})`; f.beginPath(); f.arc(qx, qy, r, 0, TAU); f.fill(); } }
    f.restore();

    // ---- body + arm: per-pixel hide. Flank = belts of small brick scales across the body, chest = big armour cells, thigh = large loose cells ----
    const bx0 = 140, by0 = 1640, bx1 = 640, by1 = 2400;
    const PW = Math.ceil((bx1 - bx0) * s), PH = Math.ceil((by1 - by0) * s);
    const mc = G.canvas(PW, PH), mx = mc.getContext('2d');
    mx.setTransform(s, 0, 0, s, -bx0 * s, -by0 * s); mx.fillStyle = '#f00'; bodyPath(mx); mx.fill(); mx.fillStyle = '#0f0'; armPath(mx); mx.fill();
    const md = mx.getImageData(0, 0, PW, PH), dd = md.data;
    const xr = new Float32Array(PH), xl = new Float32Array(PH);
    for (let y = 0; y < PH; y++) { let a = -1, bq = -1; for (let x = 0; x < PW; x++) { if (dd[(y * PW + x) * 4] > 128) { if (a < 0) a = x; bq = x; } } xl[y] = a; xr[y] = bq; }
    const inv = 1 / s, aa = 0.9 * inv;
    const vor = (qx, qy) => { const cx = Math.floor(qx), cy = Math.floor(qy); let f1 = 9, f2 = 9;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const hx = cx + ox, hy = cy + oy, sx = hx + 0.2 + 0.6 * hash(hx, hy), sy = hy + 0.2 + 0.6 * hash(hx + 101, hy - 37), ddx = qx - sx, ddy = qy - sy, d = ddx * ddx + ddy * ddy;
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
      return [Math.sqrt(f1), Math.sqrt(f2)]; };
    for (let y = 0; y < PH; y++) {
      const Y = by0 + y * inv;
      for (let x = 0; x < PW; x++) {
        const i = (y * PW + x) * 4, isArm = dd[i + 1] > 128, isBody = dd[i] > 128;
        if (!isBody && !isArm) { dd[i + 3] = 0; continue; }
        const X = bx0 + x * inv;
        const chest = !isArm && ((X - 450) / 50) ** 2 + ((Y - 1874) / 57) ** 2 < 1;
        const thighF = isArm ? 0 : smooth(-6, 6, (X - 372) - (2052 - Y) * 0.62) * smooth(1990, 2006, Y + (X - 470) * 0.25);
        let line = 0, shade = 1;
        if (chest || thighF > 0.5) {
          const cs = chest ? 14 : 17, [f1, f2] = vor(X / cs + (chest ? 3.3 : 9.7), Y / (cs * (chest ? 1 : 0.86)) + (chest ? 1.1 : 4.3));
          const lw = chest ? 2.2 : 1.7; line = 1 - smooth(lw * 0.5, lw * 0.5 + aa, (f2 - f1) * cs * 0.5); shade = 1.03 - f1 * 0.12 + 0.1 * (hash(Math.floor(X / cs), Math.floor(Y / cs)) - 0.5);
        } else {
          // spine-aligned frame: a runs down the back, b runs across the body; belts bow toward the tail away from the spine
          const A = isArm ? X * 0.2 + Y * 0.98 : -X * 0.47 + Y * 0.883, B = isArm ? X * 0.98 - Y * 0.2 : X * 0.883 + Y * 0.47;
          const h = isArm ? 8.5 : 11, wob = G.noise(X * 0.012, Y * 0.012) * 15 + G.noise(X * 0.05, Y * 0.05) * 3;
          const ra = (A - (isArm ? 0 : 0.0011 * (B - 1180) * (B - 1180)) + wob) / h, row = Math.floor(ra), fr = ra - row;
          const wd = h * (1.35 + 0.5 * hash(row, 7)), cb = (B + G.noise(X * 0.03 + 9, Y * 0.03) * 7) / wd + hash(row, 3), fc = cb - Math.floor(cb);
          const dRow = Math.min(fr, 1 - fr) * h, dCol = Math.min(fc, 1 - fc) * wd;
          line = Math.max(1 - smooth(0.75, 0.75 + aa, dRow), (1 - smooth(0.5, 0.5 + aa, dCol)) * 0.7);
          shade = 0.9 + 0.22 * fr + 0.1 * (hash(row, Math.floor(cb)) - 0.5);
        }
        // light: blue energy on the back edge, pale fire-glow on belly and thigh, cool rim on the front edge
        const spine = isArm ? 0 : Math.exp(-(x - xl[y]) * inv / 10), front = isArm ? 0 : Math.exp(-(xr[y] - x) * inv / 13) * smooth(1740, 1800, Y) * 1.25;
        const low = isArm ? 0 : smooth(1900, 2140, Y) * 0.34 + thighF * 0.2;
        const armTop = isArm ? Math.exp(-Math.max(0, Y - (1922 + Math.max(0, X - 480) * 0.36 - Math.max(0, X - 540) * 1.5)) / 6) : 0;
        const neck = isArm ? 1 : smooth(1716, 1790, Y);
        let r = 19 * shade + 22 * low + 6 * spine + 40 * front + 46 * armTop, g = 22 * shade + 36 * low + 34 * spine + 62 * front + 70 * armTop, bl = 45 * shade + 70 * low + 150 * spine + 120 * front + 130 * armTop;
        if (isArm) { r *= 0.86; g *= 0.86; bl *= 0.88; }
        const la = line * (0.92 - 0.35 * low) * neck;
        dd[i] = lerp(r, 2, la); dd[i + 1] = lerp(g, 3, la); dd[i + 2] = lerp(bl, 14, la); dd[i + 3] = 255;
      }
    }
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.putImageData(md, 0, 0);
    for (const clipP of [bodyPath, armPath]) { f.save(); clipP(f); f.clip(); f.setTransform(1, 0, 0, 1, 0, 0); f.drawImage(mc, bx0 * s, by0 * s); f.restore(); f.setTransform(s, 0, 0, s, 0, 0); if (clipP === bodyPath) inkBody(f, rnd); }
    inkHead(f);
    inkArm(f);
  }
  function inkBody(f, rnd) {
    f.save(); bodyPath(f); f.clip();
    f.strokeStyle = 'rgba(0,0,6,0.96)'; f.lineCap = 'round';
    // neck: laid-back feather scales (rows of small hooked strokes running down from the skull)
    f.lineWidth = 1.5; const nr = G.rng(321);
    for (let row = 0; row < 9; row++) for (let q = 0; q < 8; q++) {
      const x = 428 + q * 9.5 - row * 4.2 + (nr() - 0.5) * 3, y = 1722 + row * 10.5 + q * 2.2 + (nr() - 0.5) * 3; if (x > 492 - (y - 1740) * 0.02 || y > 1812) continue;
      f.beginPath(); f.moveTo(x - 5, y - 6); f.quadraticCurveTo(x + 1.5, y - 3.5, x + 2.5, y + 4); f.quadraticCurveTo(x + 4.5, y - 2, x + 8, y - 5); f.stroke(); }
    // shoulder shield
    f.fillStyle = 'rgba(0,0,6,0.96)'; f.beginPath(); for (let i = 0; i <= 40; i++) { const a = 2.5 + i / 40 * 4.3, w = 0.6 + 3.2 * Math.sin(Math.PI * i / 40), x = 450 + Math.cos(a) * 50, y = 1874 + Math.sin(a) * 57; f.moveTo(x + w, y); f.arc(x, y, w, 0, TAU); } f.fill();
    f.strokeStyle = 'rgba(130,180,255,0.55)'; f.lineWidth = 1.5; f.beginPath(); f.ellipse(450, 1874, 45.5, 52.5, 0, Math.PI * 1.2, Math.PI * 1.9); f.stroke();
    f.strokeStyle = 'rgba(0,0,6,0.96)';
    // thigh sweep, belly crease, flank folds
    f.lineWidth = 3; f.beginPath(); f.moveTo(360, 2064); f.bezierCurveTo(372, 2020, 420, 1996, 470, 1998); f.stroke();
    f.lineWidth = 2.2; f.beginPath(); f.moveTo(360, 2064); f.bezierCurveTo(352, 2110, 360, 2160, 380, 2210); f.stroke();
    f.lineWidth = 2; f.beginPath(); f.moveTo(404, 1790); f.bezierCurveTo(372, 1838, 338, 1900, 318, 1962); f.stroke();
    f.lineWidth = 1.8; f.beginPath(); f.moveTo(398, 1906); f.bezierCurveTo(384, 1946, 396, 1980, 430, 1996); f.stroke();
    f.beginPath(); f.moveTo(300, 2010); f.bezierCurveTo(286, 2060, 262, 2104, 236, 2140); f.stroke();
    // back in shadow next to the glowing edge, then the energy seam itself
    const sh = f.createLinearGradient(250, 1900, 330, 1946); sh.addColorStop(0, 'rgba(0,0,10,0)'); sh.addColorStop(0.4, 'rgba(0,0,10,0.3)'); sh.addColorStop(1, 'rgba(0,0,10,0)'); f.fillStyle = sh; f.fillRect(140, 1700, 420, 700);
    f.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[20, 0.1], [9, 0.2], [3.5, 0.45]]) { f.strokeStyle = `rgba(44,104,255,${a})`; f.lineWidth = w; G.spline(f, SP.slice(2, 15).map(([x, y]) => [x + 3, y]), false, 0.5); f.stroke(); }
    f.globalCompositeOperation = 'source-over';
    // cool rim on the lit front edge: throat, chest, belly, thigh
    f.strokeStyle = 'rgba(96,150,255,0.4)'; f.lineWidth = 9; G.spline(f, FRONT_RIM.map(([x, y]) => [x - 4, y]), false, 0.3); f.stroke(); f.strokeStyle = 'rgba(226,240,255,0.96)'; f.lineWidth = 3.4; G.spline(f, FRONT_RIM.map(([x, y]) => [x - 2.8, y]), false, 0.3); f.stroke();
    f.restore();
    bodyPath(f); f.strokeStyle = 'rgb(0,0,4)'; f.lineWidth = 3.8; f.stroke();
  }
  function inkHead(f) {
    const INK = 'rgb(0,0,4)';
    // white-hot mouth
    const mouth = () => { f.beginPath(); [[476, 1711], [481, 1703], [489, 1692], [497, 1680], [505, 1669], [509, 1674], [538, 1718], [520, 1721], [500, 1723], [486, 1724], [478, 1720]].forEach(([x, y], i) => i ? f.lineTo(x, y) : f.moveTo(x, y)); f.closePath(); };
    const mg = f.createRadialGradient(512, 1698, 4, 500, 1704, 46); mg.addColorStop(0, 'rgb(255,255,255)'); mg.addColorStop(0.6, 'rgb(236,246,255)'); mg.addColorStop(1, 'rgb(150,200,255)');
    mouth(); f.fillStyle = mg; f.fill();
    // upper-jaw slab (the lip that carries the fangs): darker than the cheek
    f.fillStyle = 'rgb(13,15,40)'; f.beginPath(); f.moveTo(486, 1666); f.lineTo(498, 1659); f.lineTo(507, 1660); f.lineTo(510.5, 1667); f.lineTo(509, 1675); f.lineTo(505, 1669); f.lineTo(497, 1680); f.lineTo(489, 1692); f.lineTo(481, 1703); f.lineTo(476, 1711); f.lineTo(474, 1703); f.quadraticCurveTo(478, 1682, 486, 1666); f.fill();
    // fangs: dark silhouettes against the light. upper row rakes down, lower row stands
    const fang = (x, y, ux, uy, l, w) => { f.beginPath(); f.moveTo(x - uy * w, y + ux * w); f.quadraticCurveTo(x + ux * l * 0.55 - uy * w * 0.2, y + uy * l * 0.55 + ux * w * 0.2, x + ux * l, y + uy * l); f.quadraticCurveTo(x + ux * l * 0.5 + uy * w * 0.5, y + uy * l * 0.5 - ux * w * 0.5, x + uy * w, y - ux * w); f.closePath(); f.fillStyle = 'rgb(9,11,34)'; f.fill(); };
    [[505.5, 1669.5, 17, 3.3], [500.5, 1676.5, 12, 2.8], [496, 1683, 18, 3.4], [491.5, 1689.5, 12, 2.7], [487.5, 1695.5, 14, 2.8], [483, 1701.5, 8, 2.2]].forEach(([x, y, l, w]) => fang(x, y, 0.42, 0.91, l, w));
    [[486, 1724, 6, 2.2], [493, 1724, 11, 2.8], [500.5, 1723.5, 7, 2.3], [508, 1723, 13, 3], [516, 1722, 8, 2.4], [523, 1721.5, 12, 2.8], [530, 1720.5, 7.5, 2.2], [535.5, 1719.5, 9, 2.1]].forEach(([x, y, l, w], i) => fang(x, y, 0.16 + (i % 2) * 0.1, -0.98, l, w));
    // re-ink the lips over the fang roots
    f.strokeStyle = INK; f.lineWidth = 3; f.lineJoin = 'round';
    f.beginPath(); f.moveTo(509, 1675); f.lineTo(505, 1669); f.lineTo(497, 1680); f.lineTo(489, 1692); f.lineTo(481, 1703); f.lineTo(476, 1711); f.lineTo(478, 1720); f.lineTo(486, 1724); f.lineTo(500, 1723); f.lineTo(520, 1721); f.lineTo(538, 1718); f.stroke();
    // lip line of the upper jaw, jaw hinge, lower-jaw fold, throat creases
    f.lineWidth = 2.2; f.beginPath(); f.moveTo(487, 1666); f.quadraticCurveTo(478, 1684, 474, 1704); f.stroke();
    f.lineWidth = 2; f.beginPath(); f.moveTo(476, 1711); f.quadraticCurveTo(466, 1720, 472, 1729); f.quadraticCurveTo(480, 1735, 500, 1733); f.quadraticCurveTo(516, 1732, 528, 1728); f.stroke();
    f.lineWidth = 1.6; f.beginPath(); f.moveTo(470, 1734); f.quadraticCurveTo(484, 1744, 502, 1744); f.moveTo(462, 1744); f.quadraticCurveTo(476, 1756, 496, 1758); f.moveTo(448, 1712); f.quadraticCurveTo(452, 1728, 462, 1738); f.stroke();
    // heavy brow over the eye socket
    f.fillStyle = 'rgb(8,9,26)'; f.beginPath(); f.moveTo(446, 1694); f.quadraticCurveTo(458, 1678, 482, 1668); f.quadraticCurveTo(474, 1678, 462, 1684); f.closePath(); f.fill();
    // eye: tall glowing teardrop, white core
    f.save(); f.globalCompositeOperation = 'lighter'; const eg = f.createRadialGradient(467, 1689, 0, 467, 1689, 24); eg.addColorStop(0, 'rgba(60,110,255,0.9)'); eg.addColorStop(1, 'rgba(30,70,255,0)'); f.fillStyle = eg; f.fillRect(440, 1662, 54, 54); f.restore();
    f.save(); f.translate(467, 1689); f.rotate(0.42);
    f.fillStyle = INK; f.beginPath(); f.ellipse(0, 0, 9.4, 13.4, 0, 0, TAU); f.fill();
    f.fillStyle = 'rgb(34,78,246)'; f.beginPath(); f.ellipse(0, 0, 8, 12, 0, 0, TAU); f.fill();
    f.fillStyle = 'rgb(96,160,255)'; f.beginPath(); f.ellipse(0.4, -0.4, 5.6, 9.2, 0, 0, TAU); f.fill();
    f.fillStyle = 'rgb(226,242,255)'; f.beginPath(); f.moveTo(0.6, -8); f.quadraticCurveTo(5, -3, 3.2, 3.4); f.quadraticCurveTo(0.4, 7.6, -2.6, 3.6); f.quadraticCurveTo(-3.6, -2.4, 0.6, -8); f.fill();
    f.restore();
    // breath light on the skull: brow streak, snout streak, hook
    f.lineCap = 'round'; f.fillStyle = 'rgba(236,245,255,0.97)';
    taper(f, 441, 1695, 455, 1679, 481, 1667.5, 0.6, 3.2); taper(f, 484, 1665.5, 492, 1660.5, 503, 1659.5, 2.6, 1.2); taper(f, 507.5, 1662, 509.5, 1667, 508.5, 1672, 1.8, 0.6);
    // rim under the jaw and down the throat
    f.fillStyle = 'rgba(210,232,255,0.92)'; taper(f, 540.5, 1725, 536, 1738, 518, 1746, 1, 3.4); taper(f, 500.5, 1754, 495.5, 1770, 492.5, 1792, 2.6, 1);
    // nostril
    f.fillStyle = 'rgb(2,3,10)'; f.beginPath(); f.ellipse(500.5, 1662.5, 2.4, 1.2, -0.5, 0, TAU); f.fill();
  }
  function inkArm(f) {
    f.save(); armPath(f); f.clip();
    f.strokeStyle = 'rgba(0,0,6,0.9)'; f.lineWidth = 1.8; f.beginPath(); f.moveTo(474, 1958); f.quadraticCurveTo(516, 1972, 566, 1962); f.stroke();
    f.strokeStyle = 'rgba(96,150,255,0.4)'; f.lineWidth = 8; G.spline(f, ARM.slice(1, 9).map(([x, y]) => [x, y + 4]), false, 0.45); f.stroke(); f.strokeStyle = 'rgba(226,240,255,0.95)'; f.lineWidth = 3.2; G.spline(f, ARM.slice(1, 9).map(([x, y]) => [x, y + 2.4]), false, 0.45); f.stroke();
    f.restore();
    armPath(f); f.strokeStyle = 'rgb(0,0,4)'; f.lineWidth = 3.4; f.stroke();
    // fingers: thick tapering digit + hooked claw with a glint
    const quad = (b0, cp, tp, t) => { const mt = 1 - t; return [mt * mt * b0[0] + 2 * mt * t * cp[0] + t * t * tp[0], mt * mt * b0[1] + 2 * mt * t * cp[1] + t * t * tp[1]]; };
    const ribbon = (b0, cp, tp, w0, w1) => { const n = 12, Lp = [], Rp = [];
      for (let i = 0; i <= n; i++) { const t = i / n, [x, y] = quad(b0, cp, tp, t), [x2, y2] = quad(b0, cp, tp, Math.min(1, t + 0.02)), [x1, y1] = quad(b0, cp, tp, Math.max(0, t - 0.02));
        const ddx = x2 - x1, ddy = y2 - y1, dl = Math.hypot(ddx, ddy) || 1, w = lerp(w0, w1, Math.pow(t, 1.3)) * 0.5; Lp.push([x - ddy / dl * w, y + ddx / dl * w]); Rp.push([x + ddy / dl * w, y - ddx / dl * w]); }
      f.beginPath(); Lp.forEach(([x, y], i) => i ? f.lineTo(x, y) : f.moveTo(x, y)); for (let i = Rp.length - 1; i >= 0; i--) f.lineTo(Rp[i][0], Rp[i][1]); f.closePath(); };
    for (let k = FINGERS.length - 1; k >= 0; k--) { const [b0, cp, tp, w] = FINGERS[k];
      const kn = quad(b0, cp, tp, 0.56);
      ribbon(b0, [lerp(b0[0], cp[0], 0.8), lerp(b0[1], cp[1], 0.8)], kn, w * 1.4, w * 0.98); f.fillStyle = 'rgb(17,20,48)'; f.fill(); f.strokeStyle = 'rgb(0,0,4)'; f.lineWidth = 2.8; f.stroke();
      f.strokeStyle = 'rgba(196,224,255,0.85)'; f.lineWidth = 1.7; f.beginPath(); f.moveTo(b0[0] + 3, b0[1] - w * 0.42); f.quadraticCurveTo(cp[0] - 3, cp[1] - w * 0.2, kn[0] - 1, kn[1] - w * 0.36); f.stroke();
      const cc = [lerp(cp[0], tp[0], 0.6) + (cp[0] - b0[0]) * 0.25, lerp(cp[1], tp[1], 0.6) + (cp[1] - b0[1]) * 0.25];
      ribbon(kn, cc, tp, w * 0.98, 0.4); f.fillStyle = 'rgb(5,6,18)'; f.fill(); f.strokeStyle = 'rgb(0,0,4)'; f.lineWidth = 1.8; f.stroke();
      ribbon([kn[0] + 1, kn[1] - 1.5], [cc[0] + 1, cc[1] - 1.5], tp, 2, 0.2); f.fillStyle = 'rgba(214,236,255,0.9)'; f.fill();
    }
  }

  // ======================= city =======================
  function bakeCity(c, rnd) {
    const windows = [];
    const bld = (x, w, top, o = {}) => ({ x, w, top, ...o });
    // far: pale silhouettes inside the glow
    const FAR = [[0, 32, 2132], [560, 30, 2070], [648, 30, 2150], [680, 24, 2138], [712, 18, 2112], [758, 26, 2150], [850, 36, 2168], [892, 30, 2156], [930, 22, 2140], [962, 40, 2186],
      [1006, 32, 2172], [1046, 44, 2190], [1094, 30, 2176], [1126, 38, 2184], [1166, 40, 2198], [470, 26, 2120], [228, 30, 2160]].map(([x, w, t]) => bld(x, w, t, { spire: rnd() < 0.35 ? 12 + rnd() * 26 : 0 }));
    // mid: the readable skyline (measured)
    const MID = [bld(30, 60, 2115), bld(108, 62, 2050, { tiers: [[120, 36, 2034]] }), bld(200, 70, 2198), bld(272, 68, 2112, { spires: [[310, 2088]] }),
      bld(350, 92, 1992, { tiers: [[364, 32, 1960], [398, 30, 1954]], spires: [[382, 1940], [412, 1944]] }),
      bld(440, 34, 2160), bld(478, 70, 2198), bld(548, 50, 2166), bld(588, 44, 2036, { tiers: [[600, 22, 2018]], spires: [[611, 1996]] }), bld(622, 34, 2100),
      bld(700, 40, 2158), bld(720, 12, 2126), bld(784, 52, 2004, { tiers: [[796, 28, 1984]], spires: [[810, 1940]] }), bld(840, 40, 2198), bld(880, 58, 2178, { spires: [[905, 2150]] }),
      bld(940, 50, 2200), bld(990, 60, 2250), bld(1050, 50, 2228), bld(1100, 100, 2232, { spires: [[1140, 2205]] }), bld(660, 38, 2190), bld(745, 34, 2205)];
    MID.sort((a, b) => a.top - b.top);
    // front: near-black blocks
    const FRONT = [[0, 100, 2216], [96, 110, 2250], [205, 92, 2232], [298, 90, 2268], [384, 92, 2210], [478, 76, 2214], [552, 52, 2268], [600, 108, 2338], [702, 80, 2290], [778, 64, 2302],
      [840, 80, 2282], [918, 92, 2300], [1008, 72, 2268], [1078, 62, 2318], [1138, 62, 2290]].map(([x, w, t]) => bld(x, w, t, { crown: rnd() < 0.5 }));

    const glowAt = (x, y) => clamp(lightAt(x, y) * 0.85);
    const draw = (B, layer) => {
      const { x, w, top } = B, bot = 2400;
      const parts = [[x, w, top], ...(B.tiers || [])];
      const minTop = Math.min(...parts.map(q => q[2]));
      const body = () => { c.beginPath(); for (const [px, pw, pt] of parts) c.rect(px, pt, pw, bot - pt); for (const [sx, sy] of (B.spires || [])) { c.moveTo(sx - 3.5, minTop + 2); c.lineTo(sx - 1, sy + 6); c.lineTo(sx, sy); c.lineTo(sx + 1, sy + 6); c.lineTo(sx + 3.5, minTop + 2); } if (B.spire) { c.moveTo(x + w / 2 - 2, top); c.lineTo(x + w / 2, top - B.spire); c.lineTo(x + w / 2 + 2, top); } };
      const gl = glowAt(x + w / 2, top);
      if (layer === 0) {
        body(); c.fillStyle = css(mixc([30, 40, 92], [100, 116, 190], gl)); c.fill(); c.strokeStyle = css(mixc([12, 18, 56], [60, 80, 160], gl), 0.85); c.lineWidth = 1.2; c.stroke();
        c.save(); body(); c.clip(); c.strokeStyle = css(mixc([30, 46, 110], [160, 175, 235], gl), 0.45); c.lineWidth = 0.8; c.beginPath();
        for (let yy = top + 7; yy < 2320; yy += 8) { c.moveTo(x + 3, yy); c.lineTo(x + w - 3, yy); } c.stroke(); c.restore();
        return; }
      const base = layer === 1 ? (hash(x, 3) < 0.42 && x > 430 ? mixc([24, 32, 84], [40, 56, 132], gl) : mixc([6, 8, 21], [13, 16, 40], hash(x, 5))) : [4, 5, 15];
      body(); c.fillStyle = css(base); c.fill();
      for (const [px, pw, pt] of parts) {
        c.save(); c.beginPath(); c.rect(px, pt, pw, bot - pt); c.clip();
        // massing: backlit edge toward the glow, shadowed core
        const lx = lightAt(px - 40, pt + 40), rx2 = lightAt(px + pw + 40, pt + 40), lit = layer === 1 ? 0.55 : 0.3;
        const g = c.createLinearGradient(px, 0, px + pw, 0);
        g.addColorStop(0, css([90, 120, 220], lit * clamp(lx))); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, css([90, 120, 220], lit * clamp(rx2)));
        c.fillStyle = g; c.fillRect(px, pt, pw, bot - pt);
        const vg = c.createLinearGradient(0, pt, 0, pt + 260); vg.addColorStop(0, css([80, 110, 210], (layer === 1 ? 0.07 : 0.03) * (0.3 + gl))); vg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = vg; c.fillRect(px, pt, pw, 260);
        // facade: thin mullions + floor lines, set back from the edges, fading with depth below
        const style = (hash(px, pt) * 3) | 0, cw = 5 + (hash(px, 7) * 4 | 0), ch = 7 + (hash(px, 9) * 4 | 0), m = 3;
        const lineCol = css(mixc(base, [70, 100, 200], (layer === 1 ? 0.16 : 0.08) + gl * 0.22), layer === 1 ? 0.3 : 0.2);
        c.strokeStyle = lineCol; c.lineWidth = 0.75; c.beginPath();
        if (style !== 2) for (let xx = px + m + cw; xx < px + pw - m; xx += cw) { c.moveTo(xx, pt + 6); c.lineTo(xx, bot); }
        if (style !== 1) for (let yy = pt + 6; yy < bot; yy += ch) { c.moveTo(px + m, yy); c.lineTo(px + pw - m, yy); }
        c.stroke();
        if (style === 1) { c.strokeStyle = 'rgba(0,0,6,0.7)'; c.lineWidth = 1.6; c.beginPath(); for (let xx = px + m + cw * 0.5; xx < px + pw - m; xx += cw * 2) { c.moveTo(xx, pt + 6); c.lineTo(xx, bot); } c.stroke(); }
        for (let yy = pt + 6; yy < bot - 4; yy += ch) for (let xx = px + m; xx + cw * 0.6 < px + pw - m; xx += cw) {
          const r = rnd();
          if (r < (layer === 2 ? 0.006 : 0.012)) { const warm = rnd() < 0.35; c.fillStyle = warm ? 'rgba(235,240,255,0.95)' : 'rgba(170,205,255,0.95)'; c.fillRect(xx + 1, yy + 1.5, cw - 2, ch - 3); if (windows.length < 160 && rnd() < 0.6) windows.push([xx + 1, yy + 1.5, cw - 2, ch - 3, rnd() * TAU, warm]); }
          else if (r < (hash(px, 5) < 0.3 ? 0.14 : 0.04)) { c.fillStyle = `rgba(66,104,224,${(0.22 + 0.5 * rnd() * rnd()).toFixed(2)})`; c.fillRect(xx + 1, yy + 1.5, cw - 2, ch - 3); }
        }
        // depth fade toward the street
        const dg = c.createLinearGradient(0, pt + 60, 0, bot); dg.addColorStop(0, 'rgba(0,0,8,0)'); dg.addColorStop(1, `rgba(0,0,8,${layer === 1 ? 0.55 : 0.4})`); c.fillStyle = dg; c.fillRect(px, pt, pw, bot - pt);
        // floor ledges (ink)
        c.strokeStyle = 'rgba(0,0,6,0.85)'; c.lineWidth = 1.2;
        for (let yy = pt + 6 + ch * 4; yy < bot; yy += ch * (4 + (hash(px, yy) * 3 | 0))) { c.beginPath(); c.moveTo(px, yy - 1); c.lineTo(px + pw, yy - 1); c.stroke(); }
        c.restore();
        { const hr = G.rng(px * 7 + pt | 0); c.fillStyle = css(base); c.strokeStyle = 'rgb(0,0,6)'; c.lineWidth = 1.2;
          const nb = 1 + (hr() * 3 | 0); for (let q = 0; q < nb; q++) { const bw = pw * (0.12 + hr() * 0.3), bx = px + hr() * (pw - bw), bh = 3 + hr() * 12; c.fillRect(bx, pt - bh, bw, bh + 1); c.strokeRect(bx, pt - bh, bw, bh + 1);
            if (hr() < 0.45) { const ax = bx + bw * hr(), ah = 8 + hr() * 26; c.beginPath(); c.moveTo(ax, pt - bh); c.lineTo(ax, pt - bh - ah); c.stroke(); } }
          if (hr() < 0.3 && pw > 24) { c.beginPath(); c.moveTo(px, pt + 1); c.lineTo(px + pw * 0.5, pt - pw * 0.35); c.lineTo(px + pw, pt + 1); c.closePath(); c.fill(); c.stroke(); } }
        if (B.crown && pw > 40) { c.fillStyle = css(base); c.fillRect(px + pw * 0.2, pt - 8, pw * 0.25, 8); c.fillRect(px + pw * 0.6, pt - 5, 6, 5); c.strokeStyle = 'rgb(0,0,6)'; c.lineWidth = 1.4; c.strokeRect(px + pw * 0.2, pt - 8, pw * 0.25, 8); }
        // flat lit face on the side turned to the fire, and a thin lit roof line
        { const litR = rx2 > lx, fw = pw * (0.2 + hash(px, 11) * 0.16), k2 = clamp(Math.max(lx, rx2) * 0.8) * (layer === 1 ? 1 : 0.5);
          c.fillStyle = css(mixc([40, 58, 140], [120, 150, 235], k2), 0.2 + 0.55 * k2); c.fillRect(litR ? px + pw - fw : px, pt, fw, Math.min(bot - pt, 150 + hash(px, 13) * 160));
          c.strokeStyle = 'rgba(0,0,6,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(litR ? px + pw - fw : px + fw, pt); c.lineTo(litR ? px + pw - fw : px + fw, bot); c.stroke();
          c.strokeStyle = css([170, 200, 255], 0.4 * clamp(0.1 + gl)); c.lineWidth = 1.1; c.beginPath(); c.moveTo(px + 1, pt + 1.2); c.lineTo(px + pw - 1, pt + 1.2); c.stroke(); }
      }
      body(); c.strokeStyle = 'rgb(0,0,5)'; c.lineWidth = layer === 1 ? 2 : 2.4; c.stroke();
      for (const [sx, sy] of (B.spires || [])) { c.fillStyle = 'rgba(225,238,255,0.95)'; c.beginPath(); c.arc(sx, sy + 2, 1.6, 0, TAU); c.fill(); }
    };
    FAR.forEach(B => draw(B, 0));
    const hz = c.createLinearGradient(0, 2000, 0, 2320); hz.addColorStop(0, 'rgba(120,160,240,0)'); hz.addColorStop(1, 'rgba(90,120,210,0.08)'); c.fillStyle = hz; c.fillRect(0, 2000, RW, 320);
    MID.forEach(B => draw(B, 1));
    // street-level smoke between the mid and front rows
    const lr = G.rng(77), lob = [];
    for (const [cx, cy, rx, n] of [[30, 2330, 90, 5], [560, 2320, 80, 5], [720, 2335, 70, 4], [920, 2330, 60, 4], [1040, 2345, 70, 4], [300, 2350, 70, 4], [1170, 2320, 50, 3], [470, 2340, 50, 3]])
      for (let i = 0; i < n; i++) lob.push({ x: cx + (lr() - 0.5) * rx * 2, y: cy + (lr() - 0.3) * 30, R: 16 + lr() * 16 });
    lob.sort((a, b) => a.y - b.y);
    for (const L of lob) { const bq = lightAt(L.x, L.y - 120) * 0.5, top = CLOUD(bq + 0.15);
      drawPuff(c, { rnd: lr, disks: makePuff(lr, L.x, L.y, L.R), top, bot: mixc(top, [0, 0, 6], 0.6), line: 'rgba(0,0,6,0.9)', nl: 3, gap: 4.2, lw: 1.9, rim: css([150, 190, 255], 0.35) }); }
    FRONT.forEach(B => draw(B, 2));
    const fr = G.rng(991); for (let x = -10; x < RW; ) { const w = 18 + fr() * 42; draw(bld(x, w, 2312 + fr() * 62, { crown: fr() < 0.3 }), 2); x += w * (0.7 + fr() * 0.5); }
    // last row of smoke rolling along the bottom edge
    const lob2 = [];
    for (let i = 0; i < 26; i++) lob2.push({ x: lr() * 1240 - 20, y: 2385 + lr() * 30, R: 14 + lr() * 18 });
    lob2.sort((a, b) => a.y - b.y);
    for (const L of lob2) { const top = CLOUD(0.18 + lightAt(L.x, 2200) * 0.15);
      drawPuff(c, { rnd: lr, disks: makePuff(lr, L.x, L.y, L.R), top, bot: mixc(top, [0, 0, 6], 0.7), line: 'rgba(0,0,5,0.9)', nl: 3, gap: 4, lw: 1.8, rim: css([130, 170, 250], 0.25) }); }
    const vg = c.createLinearGradient(0, 2300, 0, 2400); vg.addColorStop(0, 'rgba(0,0,6,0)'); vg.addColorStop(1, 'rgba(0,0,6,0.3)'); c.fillStyle = vg; c.fillRect(0, 2300, RW, 100);
    return windows;
  }

  // ======================= draw =======================
  function draw(ctx, W, H, t, S, mouse) {
    const s = S.s;
    const mx = mouse && !mouse.cap ? mouse.x : 0, my = mouse && !mouse.cap ? mouse.y : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(S.sky, 0, 0, W, H);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    // twinkle
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, ph, sp] of S.tw) { const q = 0.5 + 0.5 * Math.sin(t * sp + ph), a = (q * q * (3 - 2 * q)) ** 2.5 * (0.75 + 0.25 * Math.sin(t * 0.37 + ph * 3)); if (a < 0.03) continue; ctx.fillStyle = `rgba(210,225,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    // four-point sparkles: thin tapered arms + soft core
    for (const [x, y, sz] of S.cross) { const tw = 0.8 + 0.2 * Math.sin(t * 1.3 + x * 0.05), L = sz * tw;
      ctx.globalAlpha = 0.6; ctx.drawImage(S.gBlue, x - sz * 0.7, y - sz * 0.7, sz * 1.4, sz * 1.4); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(230,238,255,0.97)';
      ctx.beginPath(); ctx.moveTo(x, y - L); ctx.quadraticCurveTo(x + sz * 0.04, y - sz * 0.04, x + L * 0.85, y); ctx.quadraticCurveTo(x + sz * 0.04, y + sz * 0.04, x, y + L);
      ctx.quadraticCurveTo(x - sz * 0.04, y + sz * 0.04, x - L * 0.85, y); ctx.quadraticCurveTo(x - sz * 0.04, y - sz * 0.04, x, y - L); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, sz * 0.08), 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }
    ctx.strokeStyle = 'rgba(150,170,230,0.55)'; ctx.lineWidth = 0.8;
    for (const [x, y, r] of S.burst) { const kk = 0.85 + 0.15 * Math.sin(t * 0.9 + x); ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + 0.1, rr = r * kk * (i % 2 ? 0.6 : 1); ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';

    // backglow + lower banks + fire-lit smoke (breathing)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(S.back, 0, 0, W, H);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const br = 0.5 + 0.5 * Math.sin(t * 1.3) * Math.sin(t * 0.47 + 1);
    ctx.globalAlpha = 0.18 * br; ctx.drawImage(S.gIce, 450, 1880, 420, 380); ctx.drawImage(S.gIce, 840, 1980, 380, 300); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const px = mx * W * 0.004, py = my * W * 0.002;
    const gk = 1, gox = px + MOUTH[0] * s * (1 - gk), goy = py + MOUTH[1] * s * (1 - gk);
    ctx.setTransform(gk, 0, 0, gk, gox, goy);
    ctx.drawImage(S.godz, 0, 0, W, H);
    ctx.setTransform(s * gk, 0, 0, s * gk, gox, goy);
    // dorsal pulse travelling tail -> head
    ctx.globalCompositeOperation = 'lighter';
    { const front = 0.95 - frac(t / 4) * 1.1; for (let u = 0.02; u <= 0.86; u += 0.03) { const d = (u - front) / 0.09, a = 0.16 * Math.exp(-d * d) + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.9 - u * 9)); if (a < 0.01) continue; const [x, y] = spAt(u);
      ctx.globalAlpha = a; ctx.drawImage(S.gBlue, x - 66, y - 34, 64, 64); ctx.globalAlpha = a * 0.7; ctx.drawImage(S.gIce, x - 44, y - 22, 30, 30); } }
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 2.3); ctx.drawImage(S.gBlue, 467 - 17, 1689 - 19, 34, 38); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawBeam(ctx, t, S, 0);

    // smoke column: slow sway about its root + slow billow, inner light pulse rising
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const sw = Math.sin(t * 0.45) * 0.005, bl = Math.sin(t * 0.7) * 0.004;
    ctx.save();
    ctx.drawImage(S.plume, 0, 0, RW, RH);
    for (const [cv, x0, y0, sz, ax, ay, ph, sp] of S.edgeB) { const k = 1 + 0.06 * Math.sin(t * sp * TAU / 3 + ph) + 0.025 * Math.sin(t * sp * 5.1 + ph * 2), dy = -2.5 * (0.5 + 0.5 * Math.sin(t * sp * 1.7 + ph));
      ctx.drawImage(cv, ax + (x0 - ax) * k, ay + dy + (y0 - ay) * k, sz * k, sz * k); }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const u = frac(t * 0.1 + i / 4), c = colAt(u), a = Math.sin(Math.PI * u) * 0.14 * c.lit, R = c.hw * 1.6;
      ctx.globalAlpha = a; ctx.drawImage(S.gBlue, c.x - c.hw * 0.35 - R, c.y - R, R * 2, R * 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    drawBeam(ctx, t, S, 1);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(S.city, px * 0.6, py * 0.6, W, H);
    ctx.setTransform(s, 0, 0, s, px * 0.6, py * 0.6);
    for (const [x, y, w, h, ph, warm] of S.windows) { const f = Math.sin(t * 0.8 + ph) + 0.5 * Math.sin(t * 2.9 + ph * 2);
      const d = smooth(1.0, 1.3, f), l = smooth(-0.8, -1.1, f); if (d > 0.01) { ctx.fillStyle = `rgba(8,10,24,${(0.9 * d).toFixed(3)})`; ctx.fillRect(x, y, w, h); } else if (l > 0.01) { ctx.fillStyle = warm ? `rgba(240,245,255,${l.toFixed(3)})` : `rgba(180,212,255,${l.toFixed(3)})`; ctx.fillRect(x - 0.3, y - 0.3, w + 0.6, h + 0.6); } }
    ctx.globalCompositeOperation = 'lighter';
    for (const [x0, y0, sp, r, ph] of S.embers) { const q = frac(t * sp + ph / TAU), y = y0 - q * 220, x = x0 + Math.sin(t * 0.8 + ph) * 10 + q * 26;
      const a = Math.sin(Math.PI * q) * 0.75; ctx.fillStyle = `rgba(190,220,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // tapered stroke along a quadratic curve
  function taper(c, x0, y0, cx, cy, x1, y1, w0, w1) {
    const n = 10, L = [], Rr = [];
    for (let i = 0; i <= n; i++) { const t = i / n, mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy), dl = Math.hypot(dx, dy) || 1;
      const w = lerp(w0, w1, t) * 0.5; L.push([x - dy / dl * w, y + dx / dl * w]); Rr.push([x + dy / dl * w, y - dx / dl * w]); }
    c.beginPath(); L.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); for (let i = Rr.length - 1; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]); c.closePath(); c.fill();
  }
  // atomic breath. pass 0: under the column (beam body + flame tongues). pass 1: over the column (bloom + sparks + mouth flash)
  function drawBeam(ctx, t, S, pass) {
    const [mx0, my0] = MOUTH, ddx = BEAM_END[0] - mx0, ddy = BEAM_END[1] - my0, LEN = Math.hypot(ddx, ddy) + 40, ux = ddx / (LEN - 40), uy = ddy / (LEN - 40), nx = -uy, ny = ux;
    const P = (a, c) => [mx0 + ux * a + nx * c, my0 + uy * a + ny * c];
    const pulse = 1 + 0.06 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23.7);
    if (pass === 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(...P(LEN * 0.5, 0)); ctx.rotate(Math.atan2(uy, ux)); ctx.globalAlpha = 0.75; ctx.drawImage(S.gBlue, -LEN * 0.8, -100 * pulse, LEN * 1.6, 200 * pulse);
      ctx.globalAlpha = 0.7; ctx.drawImage(S.gIce, -LEN * 0.6, -55 * pulse, LEN * 1.2, 110 * pulse); ctx.restore(); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // turbulent cone: widens and frays into flame tongues as it nears the smoke
      const hwAt = a => (5.5 + 50 * Math.pow(a / LEN, 1.7)) * pulse * (a > LEN * 0.86 ? Math.sqrt(Math.max(0.02, 1 - ((a - LEN * 0.86) / (LEN * 0.14)) ** 2)) : 1), bend = a => 9 * Math.sin(a / LEN * Math.PI * 1.3) * smooth(0, 40, a);
      const edge = (a, side, kk) => { const n = G.noise(a * 0.05 - t * 3.1, side * 7.3 + kk) + 0.6 * G.noise(a * 0.13 - t * 5.3, side * 3.1 + kk); const sp = Math.pow(Math.max(0, G.noise(a * 0.19 - t * 6.2, side * 5.7 + kk)), 2) * 1.5; return hwAt(a) * (1 + (0.5 * n + sp) * smooth(14, 110, a)); };
      const layer = (scale, fill, kk, a0, a1) => { ctx.beginPath(); const n = 56;
        for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); const [x, y] = P(a, bend(a) - edge(a, -1, kk) * scale); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); const [x, y] = P(a, bend(a) + edge(a, 1, kk) * scale); ctx.lineTo(x, y); }
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
      const [ex, ey] = P(LEN, 0); const lg = ctx.createLinearGradient(mx0, my0, ex, ey);
      lg.addColorStop(0, 'rgba(190,228,255,1)'); lg.addColorStop(0.7, 'rgba(140,200,255,0.95)'); lg.addColorStop(1, 'rgba(110,175,250,0.6)');
      layer(1.0, lg, 0, 2, LEN);
      const cg = ctx.createLinearGradient(mx0, my0, ex, ey); cg.addColorStop(0, 'rgba(255,255,255,1)'); cg.addColorStop(0.8, 'rgba(240,248,255,0.97)'); cg.addColorStop(1, 'rgba(235,245,255,0.8)');
      const fl = 0.5 + 0.5 * G.noise(t * 6.3, 2.2) + 0.25 * G.noise(t * 17.1, 7.7); ctx.globalAlpha = clamp(0.8 + 0.25 * fl, 0, 1); layer(0.6 * (0.94 + 0.08 * fl), cg, 11, 0, LEN * 0.97); ctx.globalAlpha = 1;
      // flowing striations
      ctx.strokeStyle = 'rgba(80,140,240,0.13)'; ctx.lineWidth = 1;
      for (let jj = -1; jj <= 1; jj++) { if (!jj) continue; ctx.beginPath(); for (let i = 0; i <= 20; i++) { const a = 24 + i / 20 * (LEN - 50), cc = jj * hwAt(a) * 0.36 + G.noise(a * 0.05 - t * 4, jj * 5) * 3; const [x, y] = P(a, cc + bend(a)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      // flame tongues licking off the edges
      for (const [s0, side, len, sp, ph] of S.flicks) {
        const q = frac(s0 + t * sp), a = 30 + q * (LEN - 30), life = Math.sin(Math.PI * q); if (life < 0.05) continue;
        const w0 = edge(a, side, 0) * side + bend(a); const [x0, y0] = P(a, w0 - side * 2);
        const L = len * life, [x1, y1] = P(a + L * 0.9, w0 + side * L * 0.55), [cx, cy] = P(a + L * 0.2, w0 + side * L * 0.6 + Math.sin(t * 6 + ph * 9) * 6);
        ctx.fillStyle = `rgba(205,232,255,${(0.85 * life).toFixed(3)})`; taper(ctx, x0, y0, cx, cy, x1, y1, 4.5 * life + 1, 0.2);
        ctx.fillStyle = `rgba(70,130,255,${(0.6 * life).toFixed(3)})`; taper(ctx, x0, y0, cx + side * 3, cy + 3, x1 + side * 6, y1 + 4, 2.2 * life + 0.5, 0.1);
      }
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    // bloom where the beam bursts into smoke
    const [bx, by] = P(LEN * 0.92, 0), bp = 0.85 + 0.15 * Math.sin(t * 2.1);
    ctx.globalAlpha = 0.12 * bp; ctx.drawImage(S.gIce, bx - 110, by - 110, 220, 220);
    ctx.globalAlpha = 1;
    for (const [s0, sp, spread, r, ph] of S.sparks) { const q = frac(s0 + t * sp), a = 20 + q * (LEN + 80), off = spread * (12 + q * 95) + Math.sin(t * 3 + ph * 20) * 4;
      const [x, y] = P(a, off), [x1, y1] = P(a - 5 - r * 4, off - spread * 4), al = Math.sin(Math.PI * q) * (0.6 + 0.4 * Math.sin(t * 17 + ph * 30));
      if (al < 0.05) continue; ctx.strokeStyle = `rgba(215,235,255,${al.toFixed(3)})`; ctx.lineWidth = r * 0.9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const h1 = hash(i, 5), h2 = hash(i, 9), q = frac(h1 + t * (0.5 + h2 * 0.6)), ang = Math.atan2(uy, ux) + (h2 - 0.5) * 1.9, d = 8 + q * (40 + h1 * 70), al = Math.pow(1 - q, 1.5) * 0.9;
      const x = mx0 + Math.cos(ang) * d, y = my0 + Math.sin(ang) * d + q * q * 10; ctx.strokeStyle = `rgba(225,240,255,${al.toFixed(3)})`; ctx.lineWidth = 0.8 + h1 * 1.2; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6); ctx.lineTo(x, y); ctx.stroke(); }
    for (let i = 0; i < 22; i++) { const h1 = hash(i, 21), h2 = hash(i, 33), q = frac(h1 + t * (0.12 + h2 * 0.16)), side = i % 3 ? 1 : -1, a = 26 + h2 * 150 + q * 26, off = side * (16 + h1 * 30 + q * 34 + a * 0.16);
      const [x, y] = P(a, off), al = Math.sin(Math.PI * q) * 0.95, r = 1 + h1 * 2.4; ctx.fillStyle = `rgba(214,234,255,${al.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(x + ux * r * 2.4, y + uy * r * 2.4); ctx.quadraticCurveTo(x + nx * r, y + ny * r, x - ux * r, y - uy * r); ctx.quadraticCurveTo(x - nx * r, y - ny * r, x + ux * r * 2.4, y + uy * r * 2.4); ctx.fill(); }
    const mf = 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 3.7);
    ctx.globalAlpha = 0.85 * mf; ctx.drawImage(S.gWhite, mx0 - 30, my0 - 34, 64, 64); ctx.drawImage(S.gWhite, mx0 - 14, my0 - 16, 30, 30);
    { const fa = 0.55 + 0.25 * mf, an = Math.atan2(uy, ux); ctx.fillStyle = `rgba(235,245,255,${fa.toFixed(3)})`; ctx.save(); ctx.translate(mx0 + 4, my0 - 2); ctx.rotate(an);
      for (const [l, w] of [[78 * (0.9 + 0.1 * mf), 2.2], [30, 1.6]]) { ctx.beginPath(); ctx.moveTo(-l, 0); ctx.quadraticCurveTo(0, -w, l, 0); ctx.quadraticCurveTo(0, w, -l, 0); ctx.fill(); ctx.rotate(Math.PI / 2); } ctx.restore(); } ctx.globalAlpha = 0.5; ctx.drawImage(S.gBlue, mx0 - 80, my0 - 80, 160, 160);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  window.PIECES[3] = { title: 'Ink Night', init, draw };
})();
