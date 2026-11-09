// Poster 2 — "Violet Beam". Living vector night poster: Godzilla rising from violet cumulus,
// firing a thin magenta atomic beam to the top-left corner. Everything is procedural canvas 2D.
// Contract: window.PIECES[1] = { title, init(ctx,W,H)->state, draw(ctx,W,H,t,state,mouse) }
(() => {
  const G = window.GZ;
  const TAU = Math.PI * 2;

  // ---------- reference-measured anchors (normalised 0..1, x by W, y by H) ----------
  const BEAM0 = [0.537, 0.4525];        // beam source inside the gape
  const FLARE = [0.5065, 0.4215];       // white starburst just outside the jaws
  const EYE = [0.6035, 0.4515];
  const BEAM_DIR = (() => { const l = Math.hypot(0.4727, 1); return [-0.4727 / l, -1 / l]; })(); // pixel-space unit dir

  const SKY = [[0.00, [22, 8, 45]], [0.40, [23, 9, 46]], [0.50, [27, 10, 53]], [0.60, [38, 13, 58]], [0.65, [45, 15, 62]],
    [0.70, [54, 18, 66]], [0.75, [62, 20, 72]], [0.80, [68, 22, 76]], [0.835, [86, 29, 88]], [0.858, [100, 34, 96]], [0.875, [60, 20, 70]]];

  // stars measured on the reference [x, y, strength]
  const REFSTARS = [[0.712, 0.008, 111], [0.98, 0.014, 160], [0.76, 0.017, 76], [0.64, 0.022, 120], [0.399, 0.026, 85], [0.307, 0.028, 81], [0.717, 0.028, 79], [0.876, 0.029, 65], [0.207, 0.032, 45], [0.262, 0.033, 50], [0.283, 0.037, 88], [0.755, 0.041, 74], [0.707, 0.043, 80], [0.304, 0.048, 169], [0.658, 0.049, 48], [0.959, 0.056, 57], [0.511, 0.06, 95], [0.832, 0.061, 77], [0.035, 0.063, 54], [0.583, 0.064, 78], [0.914, 0.076, 54], [0.625, 0.079, 170], [0.086, 0.086, 47], [0.885, 0.093, 52], [0.978, 0.094, 81], [0.935, 0.104, 45], [0.827, 0.106, 46], [0.967, 0.128, 48], [0.654, 0.132, 50], [0.889, 0.136, 167], [0.931, 0.137, 54], [0.336, 0.138, 56], [0.796, 0.139, 109], [0.048, 0.142, 69], [0.531, 0.143, 49], [0.312, 0.147, 48], [0.557, 0.154, 72], [0.807, 0.154, 54], [0.588, 0.161, 51], [0.823, 0.164, 55], [0.76, 0.168, 69], [0.037, 0.175, 70], [0.75, 0.189, 64], [0.182, 0.198, 56], [0.336, 0.201, 106], [0.837, 0.202, 62], [0.092, 0.202, 54], [0.91, 0.217, 143], [0.973, 0.219, 66], [0.212, 0.22, 94], [0.662, 0.226, 45], [0.874, 0.253, 56], [0.812, 0.255, 54], [0.51, 0.257, 136], [0.719, 0.257, 59], [0.742, 0.258, 68], [0.912, 0.258, 95], [0.052, 0.262, 108], [0.946, 0.265, 64], [0.571, 0.271, 50], [0.539, 0.279, 71], [0.636, 0.294, 148], [0.232, 0.338, 196], [0.818, 0.346, 149], [0.499, 0.351, 53], [0.307, 0.353, 67], [0.952, 0.36, 47], [0.588, 0.368, 46], [0.087, 0.37, 80], [0.833, 0.37, 154], [0.537, 0.375, 64], [0.852, 0.376, 60], [0.109, 0.38, 107], [0.524, 0.396, 57], [0.404, 0.4, 58], [0.773, 0.401, 62], [0.125, 0.404, 48], [0.452, 0.415, 62], [0.043, 0.423, 64], [0.364, 0.443, 45], [0.235, 0.461, 50], [0.451, 0.486, 58], [0.268, 0.5, 97], [0.026, 0.503, 45], [0.37, 0.55, 71], [0.179, 0.565, 38], [0.102, 0.614, 79], [0.192, 0.646, 40], [0.296, 0.683, 39]];
  // 4-point sparkles [x, y, size(W)]
  const SPARKLES = [[0.505, 0.042, 0.0115, 1], [0.534, 0.105, 0.0105, 0.8], [0.556, 0.233, 0.0095, 0.85], [0.897, 0.359, 0.0105, 0.75], [0.182, 0.474, 0.011, 0.8], [0.27, 0.152, 0.006, 0.55], [0.84, 0.128, 0.0065, 0.55], [0.09, 0.30, 0.006, 0.5], [0.40, 0.335, 0.005, 0.45], [0.70, 0.215, 0.0055, 0.5]];

  // torso + neck + legs silhouette (clockwise from the nape). Right/lower parts run under the clouds.
  const TORSO = [
    [0.628, 0.462], [0.650, 0.472], [0.668, 0.488], [0.680, 0.499], [0.692, 0.509], [0.705, 0.515], [0.720, 0.523], [0.735, 0.531], [0.750, 0.541],
    [0.764, 0.552], [0.776, 0.564], [0.787, 0.576], [0.798, 0.589], [0.812, 0.602], [0.826, 0.614], [0.840, 0.626], [0.856, 0.640], [0.875, 0.660],
    [0.895, 0.700], [0.90, 0.76], [0.87, 0.82], [0.80, 0.85], [0.72, 0.845], [0.66, 0.838],
    [0.62, 0.826], [0.594, 0.817], [0.580, 0.808], [0.575, 0.795], [0.577, 0.777], [0.586, 0.756], [0.597, 0.738], [0.607, 0.726], [0.616, 0.719],
    [0.617, 0.712], [0.611, 0.700], [0.604, 0.687], [0.597, 0.673], [0.590, 0.658], [0.585, 0.644], [0.580, 0.630], [0.579, 0.614], [0.582, 0.600],
    [0.581, 0.584], [0.577, 0.565], [0.573, 0.545], [0.569, 0.526], [0.565, 0.510], [0.560, 0.495], [0.556, 0.485], [0.566, 0.478], [0.59, 0.470], [0.61, 0.462]];
  // head: upper skull + snout (to the mouth corner), lower jaw
  const SKULL = [[0.5490, 0.4362], [0.5505, 0.4322], [0.5580, 0.4304], [0.5670, 0.4318], [0.5760, 0.4360], [0.5860, 0.4400], [0.5975, 0.4412], [0.6085, 0.4466],
    [0.6210, 0.4516], [0.6350, 0.4592], [0.6500, 0.4688], [0.6640, 0.4820], [0.6500, 0.4885], [0.6300, 0.4860], [0.6100, 0.4815], [0.5970, 0.4778], [0.5865, 0.4714],
    [0.5778, 0.4642], [0.5702, 0.4556], [0.5632, 0.4470], [0.5562, 0.4404]];
  const JAW = [[0.5075, 0.4612], [0.5110, 0.4582], [0.5220, 0.4597], [0.5360, 0.4630], [0.5530, 0.4665], [0.5700, 0.4697], [0.5870, 0.4722], [0.5960, 0.4790],
    [0.5880, 0.4885], [0.5700, 0.4880], [0.5500, 0.4830], [0.5320, 0.4775], [0.5170, 0.4715], [0.5085, 0.4665]];
  const GAPE = [[0.5300, 0.4616], [0.5530, 0.4665], [0.5700, 0.4697], [0.5872, 0.4724], [0.5865, 0.4714], [0.5778, 0.4642], [0.5702, 0.4556], [0.5632, 0.4470],
    [0.5562, 0.4404], [0.5515, 0.4418]];
  const MOUTH = [0.5735, 0.4682];       // deep end of the bright column inside the jaws

  // dorsal plates: base point, base half-width (W units), tips (normalised); measured on the reference
  const PLATES = [
    { b: [0.661, 0.489], bw: 0.006, tips: [[0.663, 0.4805], [0.669, 0.4855]], kind: 0 },
    { b: [0.672, 0.500], bw: 0.008, tips: [[0.674, 0.4915], [0.6845, 0.4935], [0.6835, 0.5015]], kind: 0 },
    { b: [0.688, 0.513], bw: 0.013, tips: [[0.690, 0.5025], [0.700, 0.5045], [0.7095, 0.5015], [0.7105, 0.514]], kind: 0 },
    { b: [0.709, 0.527], bw: 0.018, tips: [[0.708, 0.516], [0.722, 0.5135], [0.7405, 0.5045], [0.7355, 0.5205], [0.745, 0.5215], [0.737, 0.5305]], kind: 0 },
    { b: [0.760, 0.560], bw: 0.026, tips: [[0.747, 0.541], [0.761, 0.5285], [0.770, 0.5375], [0.781, 0.5225], [0.792, 0.5345], [0.8305, 0.5185], [0.815, 0.5385], [0.827, 0.5455], [0.812, 0.5525]], kind: 1 },
    { b: [0.822, 0.612], bw: 0.032, tips: [[0.806, 0.586], [0.8205, 0.5545], [0.836, 0.5735], [0.8455, 0.5465], [0.852, 0.567], [0.8665, 0.5515], [0.871, 0.565], [0.9135, 0.5325], [0.893, 0.561], [0.921, 0.551], [0.9045, 0.5735], [0.927, 0.5825], [0.902, 0.5905]], kind: 1 },
  ];
  const THORNS = [[0.872, 0.612, 0.875, 0.5975], [0.893, 0.612, 0.8985, 0.600], [0.915, 0.611, 0.920, 0.5995], [0.928, 0.609, 0.932, 0.598], [0.940, 0.608, 0.958, 0.5905]];

  // ---------- small helpers ----------
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };

  // ---------- cumulus ----------
  // Illustrated cumulus: lobes sorted top->bottom so each lower billow overlaps the one above (its lit crown
  // stays visible). Every lobe gets an off-centre radial body, a crisp rim on the lit arc and a dark crease.
  function cumulus(ctx, W, H, o) {
    const r = G.rng(o.seed), pts = o.region, lobes = [];
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const edges = o.edges || pts.map((_, i) => i);
    const edgeDist = (x, y) => { let dm = 1e9; for (let i = 0; i < pts.length; i++) { const A = pts[i], B = pts[(i + 1) % pts.length]; const ax = A[0], ay = A[1] * 2, bx = B[0] - ax, by = B[1] * 2 - ay, px = x - ax, py = y * 2 - ay; const tt = G.clamp((px * bx + py * by) / (bx * bx + by * by || 1)); dm = Math.min(dm, Math.hypot(px - bx * tt, py - by * tt)); } return dm; };
    for (const i of edges) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], (b[1] - a[1]) * 2);
      let u = r() * 0.3 * o.eMin / Math.max(len, 1e-6);
      while (u < 1) {
        const rad = o.eMin + Math.pow(r(), 1.6) * (o.eMax - o.eMin);
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        let nx = -(b[1] - a[1]) * 2, ny = (b[0] - a[0]); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (!inPoly(pts, x + nx * 0.01, y + ny * 0.005)) { nx = -nx; ny = -ny; }
        const inset = rad * (0.5 + r() * 0.35);
        lobes.push({ x: x + nx * inset + (r() - 0.5) * rad * 0.3, y: y + ny * inset / 2, R: rad, sx: 1 + r() * 0.22 });
        u += rad * (0.75 + r() * 0.55) / len;
      }
    }
    let tries = 0, n = 0;
    while (n < o.n && tries++ < o.n * 80) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      if (!inPoly(pts, x, y)) continue;
      const dm = edgeDist(x, y);
      let R = o.rMin + Math.pow(r(), 1.3) * (o.rMax - o.rMin);
      R = Math.min(R, dm * 0.85 + o.eMin * 0.3);
      lobes.push({ x, y, R, sx: 1 + r() * 0.25 }); n++;
      // cauliflower buds on the lit crown of bigger lobes
      if (R > o.rMin * 1.1) {
        const kids = 2 + (r() * 4 | 0);
        for (let k = 0; k < kids; k++) {
          const a = o.lightAng + (r() - 0.5) * 2.2;
          const cr = R * (0.22 + r() * 0.22);
          const kx = x + Math.cos(a) * R * 0.78, ky = y + Math.sin(a) * R * 0.78 / 2;
          if (inPoly(pts, kx, ky) && edgeDist(kx, ky) > cr * 0.75) lobes.push({ x: kx, y: ky, R: cr, sx: 1 + r() * 0.2 });
        }
      }
    }
    // base fill so nothing shows through
    ctx.save(); ctx.fillStyle = rgb(o.col(0.5 * (x0 + x1), y1, 0).base); G.spline(ctx, pts.map(([x, y]) => [x * W, y * H]), true, 0.3); ctx.fill(); ctx.restore();
    lobes.sort((a, b) => (a.y * 2 - a.R * 0.4) - (b.y * 2 - b.R * 0.4));
    const lx = Math.cos(o.lightAng), ly = Math.sin(o.lightAng);
    for (const L of lobes) {
      const X = L.x * W, Y = L.y * H, R = L.R * W, jit = (r() - 0.5) * 0.12;
      const c = o.col(L.x, L.y, jit);
      ctx.save(); ctx.translate(X, Y); ctx.scale(L.sx, 0.9 + r() * 0.12);
      const ph = r() * 100, blob = (rad, dx, dy) => { ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU; const k = 1 + 0.07 * G.noise(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3) + 0.04 * Math.sin(a * 3 + ph); const px = dx + Math.cos(a) * rad * k, py = dy + Math.sin(a) * rad * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
      // faint contact shadow on the billow behind
      ctx.fillStyle = rgb(mix(c.base, [8, 2, 22], 0.35), 0.13);
      blob(R * 1.04, R * 0.03, R * 0.07); ctx.fill();
      blob(R, 0, 0); ctx.save(); ctx.clip();
      // lit crown (cel-shaded): the light side of the billow
      const lg = ctx.createLinearGradient(lx * R, ly * R, -lx * R * 0.2, -ly * R * 0.2);
      lg.addColorStop(0, rgb(c.lit)); lg.addColorStop(1, rgb(mix(c.lit, c.base, 0.55)));
      ctx.fillStyle = lg; ctx.fillRect(-R, -R, R * 2, R * 2);
      // shadowed body: the same disc shifted away from the light, with a soft terminator
      const sh = 0.2 + r() * 0.12, ox = -lx * R * sh, oy = -ly * R * sh;
      const bg = ctx.createRadialGradient(ox, oy, R * 0.55, ox, oy, R * 1.03);
      bg.addColorStop(0, rgb(mix(c.base, [8, 2, 22], 0.12))); bg.addColorStop(0.8, rgb(c.base)); bg.addColorStop(1, rgb(c.base, 0));
      ctx.fillStyle = bg; ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
      ctx.restore();
      // thin crisp rim on the lit arc
      ctx.strokeStyle = rgb(c.rim || mix(c.lit, [255, 230, 255], 0.3), (c.rimA == null ? 0.45 : c.rimA) * 0.32 * Math.min(1, R / (W * 0.03)));
      ctx.lineWidth = Math.max(0.6, W * 0.001); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.99, o.lightAng - 0.8 - r() * 0.3, o.lightAng + 0.6 + r() * 0.3); ctx.stroke();
      ctx.restore();
    }
    return lobes;
  }

  // ---------- armour plates (roof-tile scales) ----------
  // A row is a function v->[x,y] (px). Plates hang off the row on the +normal side; caller draws rows in order.
  function plateRow(d, W, f, v0, v1, size, lit, opts = {}) {
    const steps = 60, P = [];
    for (let i = 0; i <= steps; i++) P.push(f(v0 + (v1 - v0) * i / steps));
    const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = acc[acc.length - 1]; if (total < 1) return;
    const at = s => { let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const u = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u, P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]]; };
    const rr = opts.rng;
    let s = (opts.phase || 0) * size(P[0][0] / W, P[0][1] / W);
    while (s < total) {
      const [x, y] = at(s); const sz = size(x / W, y / W) * (0.85 + rr() * 0.3);
      const [cx, cy, tx0, ty0] = at(Math.min(total, s + sz * 0.5)); const tl = Math.hypot(tx0, ty0) || 1, tx = tx0 / tl, ty = ty0 / tl;
      const nx = -ty * (opts.flip ? -1 : 1), ny = tx * (opts.flip ? -1 : 1);
      const dep = sz * (opts.depth || 0.55), w = sz * (opts.wide || 1.08);
      const ax = cx - tx * w / 2, ay = cy - ty * w / 2, bx = cx + tx * w / 2, by = cy + ty * w / 2;
      const k = 1.32, L = lit(cx / W, cy / W);
      const curve = (ox, oy) => { d.moveTo(ax + ox, ay + oy); d.bezierCurveTo(ax + nx * dep * k + ox, ay + ny * dep * k + oy, bx + nx * dep * k + ox, by + ny * dep * k + oy, bx + ox, by + oy); };
      // cast shadow just beyond the free edge
      d.beginPath(); curve(nx * W * 0.0016, ny * W * 0.0016); d.strokeStyle = 'rgba(8,2,22,0.55)'; d.lineWidth = W * 0.0022; d.stroke();
      // plate face: dark at the root, picking up light toward the rounded free edge
      d.beginPath(); curve(0, 0); d.closePath();
      const g = d.createLinearGradient(cx, cy, cx + nx * dep, cy + ny * dep);
      g.addColorStop(0, `rgba(10,3,26,${0.28 + (1 - L.v) * 0.12})`); g.addColorStop(1, rgb(L.face, (opts.dim ? 0.03 : 0.08) + 0.2 * L.v));
      d.fillStyle = g; d.fill();
      // lit edge
      d.beginPath(); curve(0, 0); d.strokeStyle = rgb(L.edge, Math.min(1, (opts.dim ? 0.05 : 0.16) + 0.7 * L.v)); d.lineWidth = W * (0.0009 + 0.0011 * L.v); d.stroke();
      s += sz * (0.92 + rr() * 0.2);
    }
  }

  // ---------- dorsal crystal plate ----------
  function crystalPoly(pl, W, H) {
    const [bxn, byn] = pl.b, bx = bxn * W, by = byn * H;
    const tx = 0.56, ty = 0.83, bw = pl.bw * W;       // back tangent (down the spine), px
    const sc = pl.kind === 0 ? 1.3 : 1.08;
    const T = pl.tips.map(([x, y]) => [bx + (x * W - bx) * sc, by + (y * H - by) * sc]);
    const out = [[bx - tx * bw, by - ty * bw]];
    const dist = q => Math.hypot(q[0] - bx, q[1] - by);
    for (let i = 0; i < T.length; i++) {
      const tp = T[i];
      if (pl.kind === 0 && i > 0) {           // tips only: add shallow valleys
        const pv = T[i - 1], mx = (pv[0] + tp[0]) / 2, my = (pv[1] + tp[1]) / 2;
        out.push([mx + (bx - mx) * 0.22, my + (by - my) * 0.22]);
      }
      const isTip = pl.kind === 0 || ((i === 0 || dist(tp) > dist(T[i - 1])) && (i === T.length - 1 || dist(tp) > dist(T[i + 1])));
      if (pl.kind === 1 && isTip && dist(tp) > W * 0.025) {   // small barb on the leading edge of each spike
        const prev = i ? T[i - 1] : out[0];
        const ex = tp[0] - prev[0], ey = tp[1] - prev[1];
        const px = -ey, py = ex, pl2 = Math.hypot(px, py) || 1;
        out.push([prev[0] + ex * 0.55 - px / pl2 * W * 0.006, prev[1] + ey * 0.55 - py / pl2 * W * 0.006]);
        out.push([prev[0] + ex * 0.62, prev[1] + ey * 0.62]);
      }
      out.push(tp);
    }
    out.push([bx + tx * bw, by + ty * bw]);
    out.push([bx + tx * bw * 0.6 - ty * bw * 1.1, by + ty * bw * 0.6 + tx * bw * 1.1]);
    out.push([bx - tx * bw * 0.4 - ty * bw * 1.25, by - ty * bw * 0.4 + tx * bw * 1.25]);
    return { pts: out, T, bx, by };
  }

  // ---------- mouth plasma: beam root in the throat, lit gullet, thin plasma filaments + flame-licks, embers ----------
  const fract = v => v - Math.floor(v);
  const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  const ROOT_D = 0.097;                 // beam root: distance (W units) from the flare back along the beam into the gape
  const pathOf = (pts, k) => { const p = new Path2D(); const sh = { beginPath() {}, moveTo: (x, y) => p.moveTo(x, y), lineTo: (x, y) => p.lineTo(x, y), bezierCurveTo: (...a) => p.bezierCurveTo(...a), closePath: () => p.closePath() }; G.spline(sh, pts, true, k); return p; };
  function mpInit(W, H) {
    const X = x => x * W, Y = y => y * H;
    const f = [X(FLARE[0]), Y(FLARE[1])], u = [BEAM_DIR[0], BEAM_DIR[1]];
    const root = [f[0] - u[0] * W * ROOT_D, f[1] - u[1] * W * ROOT_D];
    const dl = W * ROOT_D;
    // axis: a=0 at the root in the gape, a=1 at the flare, >1 up the beam
    const axis = a => [root[0] + u[0] * dl * a, root[1] + u[1] * dl * a, u[0], u[1]];
    const skP = SKULL.map(([x, y]) => [X(x), Y(y)]), jwP = JAW.map(([x, y]) => [X(x), Y(y)]);
    // head silhouette (union) and its evenodd inverse
    const head = pathOf(skP, 0.42); head.addPath(pathOf(jwP, 0.4));
    const clip = new Path2D(); clip.rect(-W, -H, W * 3, H * 3); clip.addPath(head);
    const gape = new Path2D(); { gape.moveTo(X(GAPE[0][0]), Y(GAPE[0][1])); for (let i = 1; i < GAPE.length; i++) gape.lineTo(X(GAPE[i][0]), Y(GAPE[i][1])); gape.closePath(); }
    const upLip = SKULL.slice(16).concat([SKULL[0]]).map(([x, y]) => [X(x), Y(y)]), loLip = JAW.slice(1, 7).map(([x, y]) => [X(x), Y(y)]);
    const along = (pl, s) => { const k = Math.min(pl.length - 1.001, Math.max(0, s * (pl.length - 1))), i = k | 0, r = k - i; return [G.lerp(pl[i][0], pl[i + 1][0], r), G.lerp(pl[i][1], pl[i + 1][1], r)]; };
    const r = G.rng(902), licks = [], fils = [], sparks = [], embers = [];
    // root licks: small sharp tongues on both flanks of the beam root, curling outward and back up the beam
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1, a = 0.1 + r() * 0.75;
      licks.push({ kind: 0, a, side, len: W * (0.007 + r() * 0.009) * (1.15 - a * 0.4), w: W * (0.0016 + r() * 0.0012), spd: 0.9 + r() * 0.9, ph: r(), drift: 0.15 + r() * 0.2, out: 0.5 + r() * 0.5, curl: 3 + r() * 4 });
    }
    // lip licks: spill over the front of the upper lip and the lower lip / front teeth
    for (let i = 0; i < 12; i++) {
      const up = i % 2 === 0;
      licks.push({ kind: up ? 1 : 2, s: up ? 0.55 + r() * 0.45 : r() * 0.35, side: up ? 1 : -1, len: W * (0.004 + r() * 0.0055), w: W * (0.0011 + r() * 0.0009), spd: 1.1 + r() * 0.9, ph: r(), drift: 0, out: 0.6 + r() * 0.5, curl: 5 + r() * 5 });
    }
    // thin curling energy filaments wrapping the root
    for (let i = 0; i < 10; i++) fils.push({ a: 0.05 + r() * 0.8, side: i % 2 ? 1 : -1, len: W * (0.016 + r() * 0.018), w: W * (0.0005 + r() * 0.0004), spd: 0.45 + r() * 0.35, ph: r(), k0: 1.4 + r() * 1.6, k1: 9 + r() * 10, wf: 1 + r() * 1.5 });
    // crisp sparkles flung off the root
    for (let i = 0; i < 12; i++) sparks.push({ a: 0.15 + r() * 0.9, side: r() < 0.5 ? -1 : 1, spd: 0.55 + r() * 0.5, ph: r(), v: W * (0.012 + r() * 0.02), lat: W * (0.005 + r() * 0.012), R: W * (0.0022 + r() * 0.0028) });
    // embers from the jaw corners drifting up
    const corners = [[X(0.5085), Y(0.4580)], [X(0.5505), Y(0.4340)], [X(0.5300), Y(0.4612)]];
    for (let i = 0; i < 9; i++) embers.push({ c: corners[i % 3], spd: 0.28 + r() * 0.25, ph: r(), rise: W * (0.02 + r() * 0.03), sway: W * (0.002 + r() * 0.004), wf: 1.5 + r() * 2, R: W * (0.0007 + r() * 0.0008), dx: (r() - 0.6) * W * 0.012 });
    return { f, u, root, dl, axis, head, clip, gape, upLip, loLip, along, licks, fils, sparks, embers, pts: new Float32Array(64) };
  }

  // centreline by integrating curvature: heading th0, curvature k(s) -> crisp curling shapes
  function curve(out, n, x, y, th0, len, kf) {
    let th = th0; out[0] = x; out[1] = y; const ds = 1 / (n - 1);
    for (let i = 1; i < n; i++) { const s = (i - 0.5) * ds; th += kf(s) * ds; x += Math.cos(th) * len * ds; y += Math.sin(th) * len * ds; out[i * 2] = x; out[i * 2 + 1] = y; }
  }
  // tapered ribbon along out[0..n): width profile wp(s); frac = fraction of the centreline used
  function ribbon(ctx, out, n, frac, wmax, wp) {
    const m = Math.max(3, Math.round((n - 1) * frac) + 1), L = [], R = [];
    for (let i = 0; i < m; i++) {
      const s = i / (m - 1), k = s * frac * (n - 1), j = Math.min(n - 2, k | 0), q = k - j;
      const x = G.lerp(out[j * 2], out[j * 2 + 2], q), y = G.lerp(out[j * 2 + 1], out[j * 2 + 3], q);
      const tx = out[j * 2 + 2] - out[j * 2], ty = out[j * 2 + 3] - out[j * 2 + 1], tl = Math.hypot(tx, ty) || 1;
      const w = wmax * wp(s); L.push(x - ty / tl * w, y + tx / tl * w); R.push(x + ty / tl * w, y - tx / tl * w);
    }
    ctx.beginPath(); ctx.moveTo(L[0], L[1]);
    for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]);
    for (let i = R.length - 2; i >= 0; i -= 2) ctx.lineTo(R[i], R[i + 1]);
    ctx.closePath();
  }
  const lickW = s => Math.pow(1 - s, 1.2) * Math.min(1, 0.35 + s * 5);
  // layered flicker shared by beam + mouth (three incommensurate speeds, smooth)
  const flick3 = t => 0.5 + 0.22 * Math.sin(t * 3.1) + 0.16 * Math.sin(t * 7.3 + 1.2) + 0.12 * Math.sin(t * 13.7 + 2.9);

  function mouthPlasma(ctx, W, H, t, S) {
    const M = S.mp, pts = M.pts, X = x => x * W, Y = y => y * H;
    const fl = flick3(t), [rx, ry] = M.root;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // 1. inside the gape: hot throat source at the beam root + light raking the palate, tongue and teeth
    ctx.save(); ctx.clip(M.gape);
    G.glow(ctx, rx + W * 0.008, ry + W * 0.004, W * 0.03, 'rgba(230,90,240,0.5)', 0.35 + 0.3 * fl);
    G.glow(ctx, rx + W * 0.003, ry + W * 0.002, W * 0.011, 'rgba(255,240,255,0.95)', 0.45 + 0.35 * fl);
    // a soft light sheet travelling back along the palate (energy being drawn up the throat)
    { const k = fract(t * 0.7), px0 = G.lerp(X(0.552), X(0.584), k), py0 = G.lerp(Y(0.444), Y(0.468), k);
      G.glow(ctx, px0, py0, W * 0.009, 'rgba(255,150,250,0.6)', Math.sin(Math.PI * k) * (0.5 + 0.3 * fl)); }
    ctx.restore();

    // 2. light spilling over the head: snout, brow, lower-jaw tip and chin (cel band + soft wash), clipped to the head
    ctx.save(); ctx.clip(M.head);
    G.glow(ctx, X(0.548), Y(0.440), W * 0.03, 'rgba(220,100,240,0.55)', 0.30 + 0.2 * fl);
    G.glow(ctx, X(0.514), Y(0.462), W * 0.026, 'rgba(220,100,240,0.55)', 0.30 + 0.2 * fl);
    G.glow(ctx, X(0.575), Y(0.441), W * 0.03, 'rgba(180,90,240,0.4)', 0.18 + 0.1 * fl);
    ctx.restore();
    G.glow(ctx, X(0.585), Y(0.492), W * 0.05, 'rgba(160,60,220,0.25)', 0.25 + 0.1 * fl);     // neck/throat wash

    // 3. crisp lip rim bands (beam light on the inner edges of both jaws)
    G.spline(ctx, M.loLip, false, 0.4);
    ctx.strokeStyle = `rgba(240,90,230,${0.22 + 0.2 * fl})`; ctx.lineWidth = W * 0.0034; ctx.stroke();
    ctx.strokeStyle = `rgba(255,235,255,${0.40 + 0.3 * fl})`; ctx.lineWidth = W * 0.0009; ctx.stroke();
    G.spline(ctx, M.upLip, false, 0.42);
    ctx.strokeStyle = `rgba(240,90,230,${0.18 + 0.16 * fl})`; ctx.lineWidth = W * 0.003; ctx.stroke();
    ctx.strokeStyle = `rgba(255,235,255,${0.32 + 0.28 * fl})`; ctx.lineWidth = W * 0.0008; ctx.stroke();

    ctx.clip(M.clip, 'evenodd');   // everything below stays off the skull + jaw silhouettes

    // 4. curling filaments: hair-thin crisp ribbons peeling off the beam root in hooks
    for (let i = 0; i < M.fils.length; i++) {
      const F = M.fils[i], lt = t * F.spd + F.ph, life = fract(lt), cyc = Math.floor(lt);
      const jit = hash(i, cyc);
      const [x0, y0, ux, uy] = M.axis(F.a + jit * 0.15);
      const th0 = Math.atan2(uy, ux) + F.side * (0.05 + jit * 0.15);
      const ph = jit * TAU + t * F.wf;
      curve(pts, 24, x0, y0, th0, F.len * (0.85 + jit * 0.3), s => F.side * (F.k0 * Math.sin(s * 9 + ph) * (1 - s) + F.k1 * s * s * s));
      const head = Math.min(1, life * 1.35), tail = Math.max(0, life * 1.35 - 0.55), env = Math.sin(Math.PI * life);
      if (head - tail < 0.02) continue;
      const n = 24, i0 = tail * (n - 1), i1 = head * (n - 1), m = 14, Lp = [], Rp = [];
      for (let k = 0; k < m; k++) {
        const q = k / (m - 1), fi = G.lerp(i0, i1, q), j = Math.min(n - 2, fi | 0), rr = fi - j;
        const x = G.lerp(pts[j * 2], pts[j * 2 + 2], rr), y = G.lerp(pts[j * 2 + 1], pts[j * 2 + 3], rr);
        const tx = pts[j * 2 + 2] - pts[j * 2], ty = pts[j * 2 + 3] - pts[j * 2 + 1], tl = Math.hypot(tx, ty) || 1;
        const w = F.w * Math.sin(Math.PI * q) * (1 - fi / n * 0.5);
        Lp.push(x - ty / tl * w, y + tx / tl * w); Rp.push(x + ty / tl * w, y - tx / tl * w);
      }
      ctx.beginPath(); ctx.moveTo(Lp[0], Lp[1]); for (let k = 2; k < Lp.length; k += 2) ctx.lineTo(Lp[k], Lp[k + 1]); for (let k = Rp.length - 2; k >= 0; k -= 2) ctx.lineTo(Rp[k], Rp[k + 1]); ctx.closePath();
      ctx.strokeStyle = `rgba(230,80,235,${0.35 * env})`; ctx.lineWidth = W * 0.0016; ctx.stroke();
      ctx.fillStyle = `rgba(255,${215 + 35 * jit | 0},255,${0.9 * env})`; ctx.fill();
    }

    // 5. flame licks: translucent magenta tongue, pink body, white-hot core — additive so they read as light
    for (let i = 0; i < M.licks.length; i++) {
      const K = M.licks[i], lt = t * K.spd + K.ph, life = fract(lt), cyc = Math.floor(lt), jit = hash(i + 50, cyc);
      let x0, y0, ux, uy;
      if (K.kind === 0) { [x0, y0, ux, uy] = M.axis(K.a + (jit - 0.5) * 0.1 + K.drift * life); const off = W * (0.0022 + 0.0012 * jit); x0 += -uy * off * K.side; y0 += ux * off * K.side; }
      else { [x0, y0] = M.along(K.kind === 1 ? M.upLip : M.loLip, fract(K.s + (jit - 0.5) * 0.2)); ux = M.u[0]; uy = M.u[1]; }
      const grow = Math.sin(Math.PI * Math.pow(life, 0.7)), sw = Math.sin(t * 5.3 + i * 1.7) * 0.6;
      const L = K.len * (0.5 + 0.5 * grow) * (0.85 + 0.3 * jit), wv = K.w * grow * (0.8 + 0.4 * jit);
      if (wv < 0.12) continue;
      const th0 = Math.atan2(uy, ux) + K.side * K.out * (0.8 + 0.4 * jit);
      curve(pts, 12, x0, y0, th0, L, s => -K.side * K.curl * (0.25 + 1.6 * s * s) + sw * (1 - s) * 2);
      ribbon(ctx, pts, 12, 1, wv, lickW); ctx.fillStyle = `rgba(200,50,220,${0.55 * grow})`; ctx.fill();
      ribbon(ctx, pts, 12, 0.8, wv * 0.6, lickW); ctx.fillStyle = `rgba(255,120,235,${0.75 * grow})`; ctx.fill();
      ribbon(ctx, pts, 12, 0.55, wv * 0.3, lickW); ctx.fillStyle = `rgba(255,245,255,${0.95 * grow})`; ctx.fill();
    }

    // 6. crisp sparkles flung off the root
    for (let i = 0; i < M.sparks.length; i++) {
      const P = M.sparks[i], lt = t * P.spd + P.ph, life = fract(lt), cyc = Math.floor(lt), jit = hash(i + 90, cyc);
      const [x0, y0, ux, uy] = M.axis(P.a + jit * 0.2);
      const e = Math.sin(Math.PI * life), lat = P.side * P.lat * (0.6 + jit) * Math.sqrt(life);
      const x = x0 + ux * P.v * life - uy * lat, y = y0 + uy * P.v * life + ux * lat;
      const R = P.R * e * (0.7 + 0.6 * jit);
      if (R < 0.3) continue;
      G.sparkle(ctx, x, y, R, jit > 0.5 ? '#ffe8ff' : '#f6a6ff', 0.95 * e, 0.1);
    }
    // 7. embers spilling from the jaw corners, drifting up and swaying out
    for (let i = 0; i < M.embers.length; i++) {
      const E = M.embers[i], lt = t * E.spd + E.ph, life = fract(lt), jit = hash(i + 130, Math.floor(lt));
      const x = E.c[0] + E.dx * life * (0.6 + jit) + Math.sin(t * E.wf + i) * E.sway * life, y = E.c[1] - E.rise * life * (0.7 + 0.5 * jit);
      const a = Math.sin(Math.PI * life) * (1 - life * 0.4);
      G.sparkle(ctx, x, y, E.R * 2.6 * (1.1 - 0.5 * life), `rgb(255,${190 + 60 * (1 - life) | 0},255)`, 0.9 * a, 0.14);
    }
    ctx.restore();
  }

  function init(ctx, W, H) {
    const S = { W, H };
    const r = G.rng(2202);
    const X = x => x * W, Y = y => y * H;
    const P = Math.round(W * 0.012); S.P = P;     // horizontal pad on drifting layers

    // ===== 1. sky =====
    const sky = G.canvas(W, H), s = sky.getContext('2d');
    const g = s.createLinearGradient(0, 0, 0, H);
    for (const [y, c] of SKY) g.addColorStop(y, rgb(c));
    s.fillStyle = g; s.fillRect(0, 0, W, H);
    s.save(); s.globalCompositeOperation = 'screen';
    s.setTransform(1, 0, 0, 0.42, 0, Y(0.858) * 0.58);
    G.glow(s, X(0.0), Y(0.858), X(0.85), 'rgba(125,32,98,0.30)');
    G.glow(s, X(0.12), Y(0.858), X(0.40), 'rgba(150,42,110,0.32)');
    s.setTransform(1, 0, 0, 1, 0, 0);
    G.glow(s, X(FLARE[0]), Y(FLARE[1]), X(0.30), 'rgba(96,26,128,0.40)');
    G.glow(s, X(0.82), Y(0.57), X(0.22), 'rgba(110,40,150,0.25)');
    s.restore();
    // thin horizon stratus — pink crowns, darker bellies
    const wisps = [[-0.01, 0.706, 0.085, 0.005], [0.03, 0.701, 0.04, 0.003], [0.215, 0.766, 0.075, 0.0045], [0.38, 0.775, 0.06, 0.004], [0.33, 0.722, 0.05, 0.003],
      [0.29, 0.778, 0.03, 0.003], [-0.01, 0.845, 0.13, 0.007], [0.08, 0.836, 0.07, 0.004], [0.43, 0.703, 0.04, 0.003], [0.13, 0.802, 0.05, 0.0035], [0.0, 0.79, 0.04, 0.003]];
    for (const [x, y, w, h] of wisps) {
      const lift = G.smooth(0.70, 0.86, y);
      const top = mix([84, 32, 92], [150, 54, 124], lift), belly = mix([48, 16, 62], [80, 26, 84], lift);
      const xs = X(x), ws = X(w), hs = Y(h), yb = Y(y);
      const wg = s.createLinearGradient(0, yb - hs, 0, yb + hs * 0.6); wg.addColorStop(0, rgb(top, 0.95)); wg.addColorStop(1, rgb(belly, 0.9));
      s.fillStyle = wg; s.beginPath(); s.moveTo(xs - ws * 0.06, yb + hs * 0.55);
      const nb = 4 + (r() * 3 | 0);
      for (let i = 0; i <= nb; i++) { const u = i / nb, bx = xs + ws * u; s.quadraticCurveTo(bx - ws / nb * 0.5, yb - hs * (0.7 + 0.9 * Math.sin(u * Math.PI)) * (0.7 + r() * 0.5), bx, yb - hs * 0.05); }
      s.lineTo(xs + ws * 1.06, yb + hs * 0.6); s.closePath(); s.fill();
    }
    // measured stars + fine dust
    S.twinkle = [];
    for (const [x, y, k] of REFSTARS) {
      const m = G.clamp((k - 35) / 140);
      s.fillStyle = `rgba(232,214,255,${0.25 + 0.5 * m})`;
      s.beginPath(); s.arc(X(x), Y(y), Math.max(0.55, W * (0.0006 + 0.0009 * m)), 0, TAU); s.fill();
      if (m > 0.25 && r() < 0.55) S.twinkle.push([x, y, m, r() * TAU, 0.7 + r() * 1.6]);
    }
    for (let i = 0; i < 300; i++) {
      const x = r(), y = Math.pow(r(), 1.2) * 0.8, m = r();
      if (x > 0.48 && y > 0.42) continue;
      s.fillStyle = `rgba(214,196,250,${(0.10 + 0.22 * m) * (1 - G.smooth(0.6, 0.8, y) * 0.6)})`;
      s.beginPath(); s.arc(X(x), Y(y), Math.max(0.45, W * 0.0006 * (0.6 + m)), 0, TAU); s.fill();
    }
    S.sky = sky;

    // ===== 2. back clouds (behind the body): lilac bank behind the plates + lit pink cumulus behind the legs =====
    const back = G.canvas(W + 2 * P, H), b = back.getContext('2d'); b.translate(P, 0);
    const PL = [0.80, 0.585];
    cumulus(b, W, H, {
      seed: 11, n: 24, rMin: 0.035, rMax: 0.08, eMin: 0.018, eMax: 0.04, edges: [0, 1, 2, 3, 4, 7, 8], lightAng: -2.3,
      region: [[0.785, 0.522], [0.805, 0.505], [0.845, 0.478], [0.90, 0.467], [0.95, 0.459], [1.03, 0.456], [1.03, 0.72], [0.80, 0.72], [0.765, 0.60], [0.76, 0.54]],
      col: (x, y, j) => {
        const glow = Math.max(0, 1 - Math.hypot((x - PL[0]) * 1.3, (y - PL[1]) * 2.2) / 0.16);
        const edge = Math.max(0, 1 - Math.hypot((x - 1.0) * 1.5, (y - 0.585) * 2.4) / 0.12) * 0.7;
        const t = Math.min(1, glow + edge);
        const base = mix(mix([42, 22, 78], [52, 28, 90], G.smooth(0.46, 0.6, y) + j), [118, 58, 160], t * 0.6);
        const lit = mix(mix([70, 42, 114], [84, 52, 128], j + 0.5), [204, 122, 230], t);
        return { base, lit, rimA: 0.38 + 0.45 * t };
      },
    });
    cumulus(b, W, H, {
      seed: 23, n: 28, rMin: 0.028, rMax: 0.06, eMin: 0.015, eMax: 0.034, edges: [8, 9, 10, 11, 12, 13, 14, 0, 1, 2], lightAng: -2.5,
      region: [[0.54, 0.686], [0.572, 0.670], [0.60, 0.672], [0.66, 0.70], [0.70, 0.78], [0.66, 0.85], [0.50, 0.865], [0.33, 0.862], [0.335, 0.845], [0.365, 0.830], [0.40, 0.815], [0.41, 0.788], [0.425, 0.762], [0.458, 0.742], [0.50, 0.716]],
      col: (x, y, j) => {
        const hot = G.smooth(0.72, 0.83, y) * G.smooth(0.62, 0.40, x);
        const base = mix(mix([86, 40, 120], [104, 50, 138], j + 0.4), [140, 62, 156], hot * 0.6);
        const lit = mix(mix(mix([112, 60, 160], [128, 70, 174], j + 0.5), [160, 86, 200], G.smooth(0.68, 0.78, y)), [200, 104, 210], hot * 0.6);
        return { base: mix(base, [40, 16, 70], G.smooth(0.62, 0.74, x) * 0.6), lit: mix(lit, [90, 50, 130], G.smooth(0.62, 0.74, x) * 0.6), rimA: 0.42 };
      },
    });
    S.back = back;

    // ===== 3. dorsal plates + their glow =====
    const plc = G.canvas(W, H), p = plc.getContext('2d');
    const glowSpr = G.canvas(128, 128); { const q = glowSpr.getContext('2d'); const gg = q.createRadialGradient(64, 64, 0, 64, 64, 64); gg.addColorStop(0, 'rgba(255,200,252,0.9)'); gg.addColorStop(0.3, 'rgba(200,90,226,0.38)'); gg.addColorStop(0.65, 'rgba(150,50,196,0.12)'); gg.addColorStop(1, 'rgba(120,30,160,0)'); q.fillStyle = gg; q.fillRect(0, 0, 128, 128); }
    S.glowSpr = glowSpr;
    // soft bioluminescent haze along the back (crisp plates sit over it)
    p.save(); p.globalCompositeOperation = 'lighter';
    for (const [x, y, rad, a] of [[0.70, 0.515, 0.035, 0.26], [0.74, 0.54, 0.05, 0.3], [0.78, 0.565, 0.065, 0.34], [0.80, 0.58, 0.07, 0.32], [0.87, 0.61, 0.055, 0.28]]) {
      p.globalAlpha = a; p.drawImage(glowSpr, X(x) - X(rad), Y(y) - X(rad), X(rad) * 2, X(rad) * 2);
    }
    p.restore();
    // thin thorns along the lower back (behind the front bank)
    for (const [x0, y0, x1, y1] of THORNS) {
      const bx = X(x0), by = Y(y0), tx = X(x1), ty = Y(y1), w = W * 0.0042;
      p.beginPath(); p.moveTo(bx - w, by); p.quadraticCurveTo((bx + tx) / 2 - w * 0.3, (by + ty) / 2, tx, ty); p.quadraticCurveTo((bx + tx) / 2 + w * 0.6, (by + ty) / 2 + w * 0.3, bx + w, by); p.closePath();
      const tg = p.createLinearGradient(bx, by, tx, ty); tg.addColorStop(0, '#f6d4ff'); tg.addColorStop(1, '#8a58c8');
      p.fillStyle = tg; p.fill(); p.strokeStyle = 'rgba(245,220,255,0.9)'; p.lineWidth = W * 0.0011; p.stroke();
    }
    S.plateBases = [];
    for (let pi = PLATES.length - 1; pi >= 0; pi--) {
      const pl = PLATES[pi];
      const { pts, T, bx, by } = crystalPoly(pl, W, H);
      S.plateBases.push([bx / W, by / H, pl.kind ? 0.07 : 0.035]);
      const reach = Math.max(...T.map(([x, y]) => Math.hypot(x - bx, y - by)));
      // concave, flame-like edges: every edge between two points bows in toward the root
      const cen = [bx + (T.reduce((a, q) => a + q[0], 0) / T.length - bx) * 0.3, by + (T.reduce((a, q) => a + q[1], 0) / T.length - by) * 0.3];
      const shape = () => { p.beginPath(); p.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i <= pts.length; i++) { const A = pts[i - 1], Bq = pts[i % pts.length], mx = (A[0] + Bq[0]) / 2, my = (A[1] + Bq[1]) / 2, k = i < pts.length - 2 ? 0.09 : 0.0;
          p.quadraticCurveTo(mx + (cen[0] - mx) * k, my + (cen[1] - my) * k, Bq[0], Bq[1]); }
        p.closePath(); };
      // soft luminous halo hugging the silhouette (bioluminescence, not a stage light)
      p.save(); p.globalCompositeOperation = 'lighter'; p.lineJoin = 'round';
      for (const [lw, a] of [[0.014, 0.04], [0.008, 0.06], [0.004, 0.08]]) { shape(); p.strokeStyle = `rgba(220,110,240,${a})`; p.lineWidth = W * lw; p.stroke(); }
      p.restore();
      // dark outer keyline for crispness
      shape(); p.lineJoin = 'miter'; p.miterLimit = 6; p.strokeStyle = 'rgba(20,6,40,0.85)'; p.lineWidth = W * 0.0030; p.stroke();
      const rg = p.createRadialGradient(bx - W * 0.006, by + W * 0.008, 0, bx, by, reach);
      if (pl.kind === 0) {
        rg.addColorStop(0, '#fbd6ff'); rg.addColorStop(0.35, '#e49af4'); rg.addColorStop(0.75, '#a660d8'); rg.addColorStop(1, '#6e36b0');
      } else {
        rg.addColorStop(0, '#fbd8ff'); rg.addColorStop(0.24, '#dc8af0'); rg.addColorStop(0.4, '#8e40c4'); rg.addColorStop(0.55, '#3e1572'); rg.addColorStop(1, '#260c4a');
      }
      shape(); p.fillStyle = rg; p.fill();
      // flame-like feather veins: fine curved filaments sweeping from the root toward every tip
      p.save(); shape(); p.clip(); p.globalCompositeOperation = 'screen'; p.lineCap = 'round';
      const rv = G.rng(400 + pi);
      const nV = pl.kind ? 30 : 10;
      for (let k = 0; k < nV; k++) {
        const tip = T[(rv() * T.length) | 0];
        const s0 = Math.pow(rv(), 1.6) * 0.45, off = (rv() - 0.5) * pl.bw * W * 1.6;
        const sx = bx + 0.56 * off + (tip[0] - bx) * s0, sy = by + 0.83 * off + (tip[1] - by) * s0;
        const ta = Math.atan2(tip[1] - sy, tip[0] - sx), td = Math.hypot(tip[0] - sx, tip[1] - sy);
        const a = ta + (rv() - 0.5) * 0.3, len = td * (0.3 + rv() * 0.5);
        const bend = (rv() - 0.5) * 0.9;
        const ex2 = sx + Math.cos(a) * len, ey2 = sy + Math.sin(a) * len;
        const lg = p.createLinearGradient(sx, sy, ex2, ey2);
        const ia = (pl.kind ? 0.25 + rv() * 0.35 : 0.22) * (1 - s0 * 0.8);
        lg.addColorStop(0, `rgba(255,196,255,${ia})`); lg.addColorStop(0.5, `rgba(246,150,255,${ia * 0.7})`); lg.addColorStop(1, 'rgba(230,140,255,0)');
        p.strokeStyle = lg; p.lineWidth = W * (0.0007 + rv() * 0.0011);
        p.beginPath(); p.moveTo(sx, sy); p.quadraticCurveTo(sx + Math.cos(a + bend) * len * 0.5, sy + Math.sin(a + bend) * len * 0.5, ex2, ey2); p.stroke();
      }
      p.restore();
      // dark mid-ribs give each spike a shadowed core and a crisp lit edge
      if (pl.kind) {
        p.save(); shape(); p.clip(); p.lineCap = 'round';
        for (const [x, y] of T) {
          const lg = p.createLinearGradient(bx, by, x, y); lg.addColorStop(0, 'rgba(26,8,52,0)'); lg.addColorStop(0.45, 'rgba(26,8,52,0.55)'); lg.addColorStop(1, 'rgba(26,8,52,0.8)');
          p.strokeStyle = lg; p.lineWidth = W * 0.0042; p.beginPath(); p.moveTo(bx + (x - bx) * 0.3, by + (y - by) * 0.3); p.lineTo(bx + (x - bx) * 0.92, by + (y - by) * 0.92); p.stroke();
        }
        p.restore();
      }
      // bright crystal outline
      shape(); p.strokeStyle = pl.kind ? 'rgba(236,196,255,0.85)' : 'rgba(250,222,255,0.75)'; p.lineWidth = W * (pl.kind ? 0.0013 : 0.0010); p.stroke();
      // crystal facets: a fine lit ridge from the root to each tip
      p.save(); shape(); p.clip(); p.lineCap = 'round';
      for (const [x, y] of T) { p.strokeStyle = pl.kind ? 'rgba(232,180,255,0.35)' : 'rgba(255,230,255,0.3)'; p.lineWidth = W * 0.0008; p.beginPath(); p.moveTo(bx + (x - bx) * 0.15 + W * 0.002, by + (y - by) * 0.15); p.lineTo(bx + (x - bx) * 0.9 + W * 0.0015, by + (y - by) * 0.9); p.stroke(); }
      p.restore();
    }
    S.plates = plc;

    // ===== 4. tail (in front of the lit cumulus, behind the low bank) =====
    const bodyC = G.canvas(W, H), d = bodyC.getContext('2d');
    const TAIL = [[0.326, 0.7565], [0.305, 0.7595], [0.284, 0.7655], [0.262, 0.773], [0.243, 0.7825], [0.230, 0.7930], [0.2255, 0.8020], [0.2305, 0.8100], [0.2445, 0.8160], [0.265, 0.8190],
      [0.295, 0.8200], [0.33, 0.8215], [0.365, 0.8245], [0.40, 0.8295], [0.43, 0.8350], [0.46, 0.8405], [0.49, 0.8475], [0.53, 0.858]];
    const tailW = u => W * (0.003 + 0.054 * Math.pow(u, 1.5));
    const tl = [], tr = [], tn = [];
    for (let i = 0; i < TAIL.length; i++) {
      const p0 = TAIL[i], q = TAIL[Math.min(TAIL.length - 1, i + 1)], o = TAIL[Math.max(0, i - 1)];
      let dx = (q[0] - o[0]) * W, dy = (q[1] - o[1]) * H; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = tailW(i / (TAIL.length - 1)) * 0.5;
      tl.push([p0[0] * W - dy * w, p0[1] * H + dx * w]); tr.push([p0[0] * W + dy * w, p0[1] * H - dx * w]); tn.push([dy, -dx]);
    }
    // spikes along the dorsal (upper / inner-curl) edge — white crystal teeth growing toward the body
    for (let i = 5; i < TAIL.length - 1; i++) {
      const nsub = 2;
      for (let k = 0; k < nsub; k++) {
        const u = (k + 0.5) / nsub, a = tr[i], c = tr[i + 1];
        const x = a[0] + (c[0] - a[0]) * u, y = a[1] + (c[1] - a[1]) * u;
        const nx = tn[i][0], ny = tn[i][1];
        const tx = c[0] - a[0], ty = c[1] - a[1], tlen = Math.hypot(tx, ty) || 1;
        const prog = (i + u - 5) / (TAIL.length - 6);
        const hgt = W * (0.0085 + 0.010 * prog), half = hgt * 0.6;
        const ux = tx / tlen, uy = ty / tlen;
        const tipX = x + nx * hgt + ux * hgt * 0.18, tipY = y + ny * hgt + uy * hgt * 0.18;
        d.beginPath(); d.moveTo(x - ux * half - nx * 1, y - uy * half - ny * 1); d.lineTo(tipX, tipY); d.lineTo(x + ux * half - nx * 1, y + uy * half - ny * 1); d.closePath();
        const sg = d.createLinearGradient(x, y, tipX, tipY); sg.addColorStop(0, '#c6a8ec'); sg.addColorStop(0.4, '#f4ecff'); sg.addColorStop(1, '#ffffff');
        d.fillStyle = sg; d.fill(); d.strokeStyle = 'rgba(28,9,52,0.9)'; d.lineWidth = W * 0.0008; d.stroke();
        // shaded half
        d.beginPath(); d.moveTo(tipX, tipY); d.lineTo(x + ux * half, y + uy * half); d.lineTo(x + ux * half * 0.1, y + uy * half * 0.1); d.closePath(); d.fillStyle = 'rgba(120,80,180,0.45)'; d.fill();
      }
    }
    const tailOutline = tl.concat(tr.slice().reverse());
    G.spline(d, tailOutline, true, 0.5);
    const tgr = d.createLinearGradient(X(0.25), Y(0.80), X(0.25), Y(0.83));
    tgr.addColorStop(0, '#2c1152'); tgr.addColorStop(1, '#170631');
    d.fillStyle = tgr; d.fill();
    d.save(); G.spline(d, tailOutline, true, 0.5); d.clip();
    const tr2 = G.rng(91);
    // ring segments with lit edges
    for (let i = 1; i < TAIL.length - 1; i++) for (let k = 0; k < 3; k++) {
      const u = k / 3, a = tl[i], c = tl[i + 1], a2 = tr[i], c2 = tr[i + 1];
      const p1 = [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u], p2 = [a2[0] + (c2[0] - a2[0]) * u, a2[1] + (c2[1] - a2[1]) * u];
      const ddx = (c[0] - a[0]) * 0.18, ddy = (c[1] - a[1]) * 0.18;
      d.strokeStyle = 'rgba(8,2,22,0.55)'; d.lineWidth = W * 0.0016;
      d.beginPath(); d.moveTo(p1[0] + ddx * 0.3, p1[1] + ddy * 0.3); d.quadraticCurveTo((p1[0] + p2[0]) / 2 - ddx * 1.6, (p1[1] + p2[1]) / 2 - ddy * 1.6, p2[0], p2[1]); d.stroke();
      d.strokeStyle = `rgba(150,112,210,${0.25 + tr2() * 0.15})`; d.lineWidth = W * 0.0009;
      d.beginPath(); d.moveTo(p1[0], p1[1]); d.quadraticCurveTo((p1[0] + p2[0]) / 2 - ddx * 2, (p1[1] + p2[1]) / 2 - ddy * 2, p2[0], p2[1]); d.stroke();
    }
    // dorsal ridge highlight + belly shade
    d.strokeStyle = 'rgba(176,136,230,0.75)'; d.lineWidth = W * 0.0018;
    G.spline(d, tr.map(([x, y], i) => [x - tn[i][0] * W * 0.0018, y - tn[i][1] * W * 0.0018]), false); d.stroke();
    d.strokeStyle = 'rgba(6,1,18,0.6)'; d.lineWidth = W * 0.004;
    G.spline(d, tl, false); d.stroke();
    d.restore();
    d.strokeStyle = 'rgba(12,3,28,0.9)'; d.lineWidth = W * 0.0012; G.spline(d, tailOutline, true, 0.5); d.stroke();

    // ===== 5. body =====
    const tp = TORSO.map(([x, y]) => [x * W, y * H]);
    const torsoPath = () => G.spline(d, tp, true, 0.45);
    // lighting model: key light from the flare (upper-left), pink spill from the plates (back)
    const lit = (x, yW) => { // x in W units, y in W units (y*H/W)
      const y = yW / 2;
      const fl = Math.max(0, 1 - Math.hypot(x - FLARE[0], (y - FLARE[1]) * 2) / 0.42);
      const front = G.smooth(0.70, 0.58, x);
      const sp = Math.max(0, 1 - Math.hypot(x - 0.80, (y - 0.585) * 2) / 0.12);
      const v = G.clamp(fl * 0.55 + front * 0.3 + sp * 0.6 - G.smooth(0.64, 0.80, y) * 0.45);
      return { v, edge: mix(mix([120, 92, 196], [206, 172, 252], fl), [244, 168, 248], sp), face: mix([110, 80, 180], [220, 140, 240], sp) };
    };
    const rngP = G.rng(55);

    // ---- organic limbs: one smooth tapered silhouette with a muscle swell, lilac rim on the lit (upper) edge
    const limb = (pts, w0, w1, swellAt = 0.35, swell = 0.22) => {
      const lc = G.canvas(W, H), d0 = d; { const d = lc.getContext('2d');
      const Pp = pts.map(([x, y]) => [X(x), Y(y)]), L = [], R = [];
      const n = 24, samp = [];
      for (let i = 0; i <= n; i++) { const u = i / n, f = u * (Pp.length - 1), k = Math.min(Pp.length - 2, Math.floor(f)), v = f - k;
        const p0 = Pp[Math.max(0, k - 1)], p1 = Pp[k], p2 = Pp[k + 1], p3 = Pp[Math.min(Pp.length - 1, k + 2)];
        const cr = (a0, a1, a2, a3) => 0.5 * ((2 * a1) + (-a0 + a2) * v + (2 * a0 - 5 * a1 + 4 * a2 - a3) * v * v + (-a0 + 3 * a1 - 3 * a2 + a3) * v * v * v);
        samp.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), u]); }
      for (let i = 0; i <= n; i++) {
        const a = samp[Math.max(0, i - 1)], c = samp[Math.min(n, i + 1)];
        let dx = c[0] - a[0], dy = c[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const u = samp[i][2], w = W * G.lerp(w0, w1, u) * 0.5 * (1 + swell * Math.exp(-Math.pow((u - swellAt) / 0.18, 2)));
        L.push([samp[i][0] - dy * w, samp[i][1] + dx * w]); R.push([samp[i][0] + dy * w * 0.92, samp[i][1] - dx * w * 0.92]);
      }
      const outline = L.concat(R.slice().reverse());
      const path = () => { G.spline(d, outline, true, 0.5); };
      path();
      const m = n >> 1, gg = d.createLinearGradient(R[m][0], R[m][1], L[m][0], L[m][1]);
      gg.addColorStop(0, 'rgb(19,7,42)'); gg.addColorStop(0.7, 'rgb(36,16,72)'); gg.addColorStop(1, 'rgb(64,36,114)');
      d.fillStyle = gg; d.fill();
      d.save(); path(); d.clip();
      // soft occlusion where it meets the body, a couple of fine tendon lines that follow the limb
      G.glow(d, samp[0][0], samp[0][1], W * w0 * 1.1, 'rgba(22,8,48,0.95)');
      G.glow(d, samp[0][0], samp[0][1], W * w0 * 0.7, 'rgba(22,8,48,0.9)');
      // overlapping scale bands wrapping the limb (bowed toward the hand), lit on the upper side
      for (let i = Math.round(n * 0.55); i < n - 2; i++) {
        if (i % 3) continue;
        const a = R[i], c = L[i], m = samp[Math.min(n, i + 1)];
        const qx = (a[0] + c[0]) / 2 + (m[0] - samp[i][0]) * 1.6, qy = (a[1] + c[1]) / 2 + (m[1] - samp[i][1]) * 1.6;
        d.strokeStyle = 'rgba(6,1,18,0.4)'; d.lineWidth = W * 0.0018; d.beginPath(); d.moveTo(a[0], a[1] + W * 0.001); d.quadraticCurveTo(qx, qy + W * 0.001, c[0], c[1] + W * 0.001); d.stroke();
        const lg = d.createLinearGradient(a[0], a[1], c[0], c[1]); lg.addColorStop(0, 'rgba(120,90,190,0)'); lg.addColorStop(0.5, 'rgba(120,90,190,0.1)'); lg.addColorStop(1, 'rgba(170,132,236,0.4)'); lg.addColorStop(1, 'rgba(120,90,190,0)');
        d.strokeStyle = lg; d.lineWidth = W * 0.0009; d.beginPath(); d.moveTo(a[0], a[1]); d.quadraticCurveTo(qx, qy, c[0], c[1]); d.stroke();
      }

      // wrist creases (soft, curved — not segments)
      for (const f of [0.82, 0.88]) { const i = Math.round(f * n); d.strokeStyle = 'rgba(8,2,22,0.4)'; d.lineWidth = W * 0.0012; d.beginPath(); d.moveTo(R[i][0], R[i][1]); d.quadraticCurveTo(samp[i][0] - W * 0.003, samp[i][1], L[i][0], L[i][1]); d.stroke(); }
      d.restore();
      d.lineCap = 'round';
      d.strokeStyle = 'rgba(206,170,252,0.7)'; d.lineWidth = W * 0.0016; G.spline(d, L.slice(Math.round(n * 0.5)), false, 0.5); d.stroke();
      d.strokeStyle = 'rgba(10,3,26,0.9)'; d.lineWidth = W * 0.0013; G.spline(d, R.slice(2), false, 0.5); d.stroke();
      // the upper arm melts into the shoulder mass: fade the limb in along its axis
      const k1 = samp[Math.round(n * 0.38)], mg = d.createLinearGradient(samp[0][0], samp[0][1], k1[0], k1[1]);
      mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,1)');
      d.globalCompositeOperation = 'destination-in'; d.fillStyle = mg; d.fillRect(0, 0, W, H); d.globalCompositeOperation = 'source-over';
      } d0.drawImage(lc, 0, 0);
    };
    // curved finger ending in a hooked claw (cubic centre line, smooth taper to a point)
    const claw = (B, C, T, w0, hook = 0.006) => {
      const b = [X(B[0]), Y(B[1])], c = [X(C[0]), Y(C[1])], t = [X(T[0]), Y(T[1])];
      const c2 = [c[0] + (t[0] - c[0]) * 0.7, c[1] + (t[1] - c[1]) * 0.7 - W * hook * 0.6];
      const pt = u => { const v = 1 - u; return [v * v * v * b[0] + 3 * v * v * u * c[0] + 3 * v * u * u * c2[0] + u * u * u * t[0], v * v * v * b[1] + 3 * v * v * u * c[1] + 3 * v * u * u * c2[1] + u * u * u * t[1]]; };
      const n = 18, Lp = [], Rp = [], M = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, p0 = pt(Math.max(0, u - 0.02)), p1 = pt(Math.min(1, u + 0.02)), q = pt(u);
        let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const knuckle = 1 + 0.18 * Math.exp(-Math.pow((u - 0.42) / 0.08, 2));
        const w = W * w0 * 0.5 * Math.pow(1 - u, 0.75) * knuckle;
        Lp.push([q[0] - dy * w, q[1] + dx * w]); Rp.push([q[0] + dy * w, q[1] - dx * w]); M.push(q);
      }
      const poly = (i0, i1) => { d.beginPath(); for (let i = i0; i <= i1; i++) i === i0 ? d.moveTo(Lp[i][0], Lp[i][1]) : d.lineTo(Lp[i][0], Lp[i][1]); for (let i = i1; i >= i0; i--) d.lineTo(Rp[i][0], Rp[i][1]); d.closePath(); };
      poly(0, n); d.fillStyle = 'rgb(34,15,68)'; d.fill(); d.strokeStyle = 'rgba(10,3,26,0.9)'; d.lineWidth = W * 0.0011; d.stroke();
      // claw: pale keratin, bright at the tip (lit by the flare)
      const k0 = Math.round(n * 0.6); poly(k0, n);
      const cg = d.createLinearGradient(M[k0][0], M[k0][1], t[0], t[1]); cg.addColorStop(0, 'rgb(96,66,158)'); cg.addColorStop(0.5, 'rgb(190,160,236)'); cg.addColorStop(1, 'rgb(246,236,255)');
      d.fillStyle = cg; d.fill();
      d.lineCap = 'round'; d.strokeStyle = 'rgba(214,180,255,0.75)'; d.lineWidth = W * 0.001;
      d.beginPath(); Rp.slice(1, k0 + 1).forEach(([x, y], i) => i ? d.lineTo(x, y) : d.moveTo(x, y)); d.stroke();
    };
    const palm = (cx, cy, rx, ry, rot) => { d.beginPath(); d.ellipse(X(cx), Y(cy), W * rx, W * ry, rot, 0, TAU); d.fillStyle = 'rgb(34,15,68)'; d.fill(); d.strokeStyle = 'rgba(10,3,26,0.85)'; d.lineWidth = W * 0.0011; d.stroke();
      d.strokeStyle = 'rgba(190,150,245,0.5)'; d.lineWidth = W * 0.0011; d.beginPath(); d.ellipse(X(cx), Y(cy), W * rx * 0.94, W * ry * 0.9, rot, Math.PI * 1.05, Math.PI * 1.75); d.stroke(); };
    // lower (far) arm, behind the torso: raised hand, fingers curling forward
    limb([[0.630, 0.668], [0.606, 0.679], [0.584, 0.672], [0.562, 0.661], [0.540, 0.651]], 0.054, 0.030, 0.45, 0.26);
    claw([0.531, 0.6555], [0.527, 0.663], [0.514, 0.6675], 0.0123, 0.004);
    palm(0.530, 0.6475, 0.016, 0.0115, -0.3);
    claw([0.528, 0.6425], [0.512, 0.6325], [0.4935, 0.6365], 0.0185);
    claw([0.525, 0.6475], [0.506, 0.6425], [0.4885, 0.6515], 0.0185);
    claw([0.526, 0.6530], [0.510, 0.6555], [0.4975, 0.6640], 0.017);

    // torso fill + form shading
    torsoPath();
    const bg = d.createLinearGradient(X(0.56), Y(0.47), X(0.84), Y(0.80));
    bg.addColorStop(0, 'rgb(28,10,56)'); bg.addColorStop(0.3, 'rgb(24,8,50)'); bg.addColorStop(0.7, 'rgb(21,8,45)'); bg.addColorStop(1, 'rgb(17,6,38)');
    d.fillStyle = bg; d.fill();
    d.save(); torsoPath(); d.clip();
    // volume: lit chest + belly cores, dark back flank, occlusion under the head and arms
    d.globalCompositeOperation = 'screen';
    G.glow(d, X(0.625), Y(0.565), X(0.07), 'rgba(50,24,92,0.18)');
    G.glow(d, X(0.640), Y(0.685), X(0.05), 'rgba(50,24,92,0.2)');
    G.glow(d, X(0.625), Y(0.765), X(0.055), 'rgba(50,24,92,0.2)');
    G.glow(d, X(0.80), Y(0.59), X(0.06), 'rgba(170,70,190,0.35)');
    d.globalCompositeOperation = 'source-over';
    G.glow(d, X(0.84), Y(0.70), X(0.12), 'rgba(10,3,26,0.55)');
    G.glow(d, X(0.62), Y(0.494), X(0.045), 'rgba(10,3,26,0.55)');          // under the jaw
    G.glow(d, X(0.62), Y(0.632), X(0.04), 'rgba(10,3,26,0.6)');            // under the near forearm
    G.glow(d, X(0.66), Y(0.722), X(0.05), 'rgba(10,3,26,0.5)');            // thigh crease

    // --- carved ridge linework: raised folds, each with a cast shadow below and a lit crest
    const ridge = (pts, wgt) => {
      const [mx, my] = pts[pts.length >> 1]; const Lt = lit(mx / W, my / W);
      d.lineCap = 'round'; d.lineJoin = 'round';
      d.strokeStyle = 'rgba(6,1,18,0.4)'; d.lineWidth = W * (0.0024 + 0.0016 * wgt);
      G.spline(d, pts.map(([x, y]) => [x + W * 0.0010, y + W * 0.0024]), false); d.stroke();
      d.strokeStyle = rgb(mix([34, 15, 66], [60, 34, 108], Lt.v), 0.9); d.lineWidth = W * (0.0020 + 0.0016 * wgt);
      G.spline(d, pts, false); d.stroke();
      d.strokeStyle = rgb(Lt.edge, Math.min(1, 0.10 + 0.34 * Lt.v)); d.lineWidth = W * (0.0008 + 0.0006 * wgt);
      G.spline(d, pts.map(([x, y]) => [x - W * 0.0005, y - W * 0.0009]), false); d.stroke();
    };
    const arcs = (cx, cy, rx, ry, rot, a0, a1, n, seed, shrink = 0.86) => {
      const rr = G.rng(seed);
      for (let k = 0; k < n; k++) {
        const f = 1 - k / n * shrink;
        let a = a0 + rr() * 0.2;
        while (a < a1 - 0.12) {
          const seg = Math.min(a1 - a, 0.7 + rr() * 1.5), pts = [];
          for (let i = 0; i <= 12; i++) {
            const tt = a + seg * i / 12, wob = 1 + 0.035 * Math.sin(tt * 6 + k * 1.7 + seed);
            const ex = Math.cos(tt) * X(rx) * f * wob, ey = Math.sin(tt) * X(ry) * f * wob;
            pts.push([X(cx) + ex * Math.cos(rot) - ey * Math.sin(rot), Y(cy) + ex * Math.sin(rot) + ey * Math.cos(rot)]);
          }
          ridge(pts, 1 - k / n);
          a += seg + 0.06 + rr() * 0.16;
        }
      }
    };
    { const cg = d.createRadialGradient(X(0.63), Y(0.575), 0, X(0.65), Y(0.59), X(0.08)); cg.addColorStop(0, 'rgba(46,22,88,0.2)'); cg.addColorStop(1, 'rgba(30,12,60,0)'); d.fillStyle = cg; d.fillRect(X(0.55), Y(0.54), X(0.2), Y(0.1)); }
    // engraved hide: overlapping roof-tile scale rows bowing around the chest, belly and thigh (drawn bottom-up so
    // every row's free edge overlaps the root of the row below)
    {
      d.globalAlpha = 0.2;
      const rows = [];
      for (let y0 = 0.835; y0 >= 0.478; y0 -= 0.0078) rows.push(y0);
      for (const y0 of rows) {
        const low = G.smooth(0.70, 0.80, y0), neck = G.smooth(0.53, 0.49, y0);
        const bow = 0.016 + 0.012 * low - 0.008 * neck;
        const slope = 0.42 - 0.25 * low + 0.25 * neck;
        const xa = 0.545, xb = 0.93;
        plateRow(d, W, v => { const x = G.lerp(xa, xb, v); const u = G.clamp((x - 0.56) / 0.22); return [X(x), Y(y0 + slope * (x - 0.58) + bow * Math.sin(Math.PI * u) - low * 0.02 * G.smooth(0.62, 0.70, x) + 0.0025 * G.noise(x * 18, y0 * 40))]; }, 0, 1,
          (x, yW) => W * (0.014 + 0.008 * G.smooth(0.56, 0.68, yW / 2) + 0.005 * G.smooth(0.70, 0.80, yW / 2)) * (1 - 0.3 * neck) * (1 - 0.3 * G.smooth(0.62, 0.56, x)),
          (x, yW) => { const L = lit(x, yW); return { v: Math.pow(L.v, 1.3) * 0.85, edge: L.edge, face: L.face }; },
          { rng: rngP, depth: 0.5, wide: 1.45, phase: ((y0 * 977) % 1), dim: 0.55 });
      }
      d.globalAlpha = 1;
      // reference linework: big concentric wrinkle contours swirling around chest, belly and thigh
      arcs(0.655, 0.612, 0.105, 0.085, -0.35, Math.PI * 0.55, Math.PI * 2.2, 5, 11, 0.8);
      arcs(0.690, 0.715, 0.11, 0.09, -0.25, Math.PI * 0.6, Math.PI * 2.1, 5, 17, 0.8);
      arcs(0.650, 0.525, 0.07, 0.055, -0.6, Math.PI * 0.5, Math.PI * 1.6, 3, 23, 0.55);
      // occlusion so the hide sinks into shadow toward the back and the clouds
      G.glow(d, X(0.84), Y(0.70), X(0.12), 'rgba(10,3,26,0.45)');
      G.glow(d, X(0.66), Y(0.80), X(0.07), 'rgba(10,3,26,0.35)');
    }
    // thigh: a muscle line + knee crease rather than a balloon
    { d.lineCap = 'round';
      const mus = [[[0.640, 0.722], [0.618, 0.738], [0.604, 0.760], [0.600, 0.785], [0.606, 0.806]], [[0.616, 0.719], [0.632, 0.736], [0.648, 0.762], [0.656, 0.792]]];
      for (const m of mus) { const pts = m.map(([x, y]) => [X(x), Y(y)]);
        d.strokeStyle = 'rgba(6,1,18,0.7)'; d.lineWidth = W * 0.004; G.spline(d, pts.map(([x, y]) => [x + W * 0.001, y + W * 0.002]), false); d.stroke();
        d.strokeStyle = 'rgba(150,112,220,0.35)'; d.lineWidth = W * 0.0012; G.spline(d, pts, false); d.stroke(); } }
    arcs(0.655, 0.470, 0.09, 0.10, 0.0, Math.PI * 0.56, Math.PI * 0.95, 4, 3, 0.6);       // neck wrinkle rings
    // knobbly dorsal ridge under the plates (muted so it reads as hide, not pattern)
    d.save(); d.globalAlpha = 0.35;
    for (let k = 2; k >= 0; k--) {
      const off = 0.010 + k * 0.02;
      plateRow(d, W, v => { const a = [0.645, 0.468], c = [0.86, 0.645]; const x = G.lerp(a[0], c[0], v), y = G.lerp(a[1], c[1], v) + Math.sin(v * Math.PI) * 0.012; return [X(x) - W * off * 0.83, Y(y) + W * off * 0.56 * 2]; }, 0, 1,
        (x, y) => W * (0.02 + 0.016 * G.smooth(0.66, 0.8, x)) * (1 - k * 0.12), lit, { rng: rngP, flip: true, depth: 0.5, phase: k * 0.5 });
    }
    d.restore();
    // braided throat ridge: a twisted rope of lit scutes (lens shapes) — reads as hide catching beam light
    {
      const steps = 14;
      const axis = u => [0.5640 + Math.pow(u, 1.15) * 0.020, 0.492 + u * 0.100];
      // soft glow under the rope
      d.save(); d.globalCompositeOperation = 'lighter'; d.lineCap = 'round';
      d.strokeStyle = 'rgba(200,100,230,0.10)'; d.lineWidth = W * 0.012;
      G.spline(d, [0, 0.33, 0.66, 1].map(u => { const [x, y] = axis(u); return [X(x), Y(y)]; }), false); d.stroke();
      d.restore();
      for (let i = 0; i < steps; i++) {
        const u = (i + 0.5) / steps, [ax, ay] = axis(u), [bx2, by2] = axis(Math.min(1, u + 0.02));
        const ang = Math.atan2(Y(by2) - Y(ay), X(bx2) - X(ax)) + (i % 2 ? 0.5 : -0.5);
        const lv = 1 - u * 0.55, cx = X(ax) + (i % 2 ? 1 : -1) * W * 0.0012, cy = Y(ay);
        const rl = Y(0.100 / steps) * 0.62, rw = W * 0.0034;
        d.save(); d.translate(cx, cy); d.rotate(ang);
        d.fillStyle = 'rgba(8,2,22,0.75)'; d.beginPath(); d.ellipse(W * 0.0006, W * 0.001, rl * 1.08, rw * 1.25, 0, 0, TAU); d.fill();
        const lg = d.createLinearGradient(0, -rw, 0, rw);
        lg.addColorStop(0, `rgba(250,${200 + 30 * lv | 0},255,${0.55 + 0.4 * lv})`); lg.addColorStop(0.55, `rgba(${200 + 30 * lv | 0},120,236,${0.45 + 0.4 * lv})`); lg.addColorStop(1, `rgba(90,40,150,${0.5})`);
        d.fillStyle = lg; d.beginPath(); d.ellipse(0, 0, rl, rw, 0, 0, TAU); d.fill();
        d.restore();
      }
    }
    d.restore();
    // rim light: inner lilac contour (strong on the beam side, pink near the plates)
    d.save(); torsoPath(); d.clip();
    const rim = d.createLinearGradient(X(0.54), Y(0.44), X(0.82), Y(0.78));
    rim.addColorStop(0, 'rgba(225,185,255,0.7)'); rim.addColorStop(0.35, 'rgba(175,130,240,0.45)'); rim.addColorStop(0.6, 'rgba(120,80,180,0.12)'); rim.addColorStop(1, 'rgba(110,70,170,0.05)');
    d.strokeStyle = rim; d.lineWidth = W * 0.0042; torsoPath(); d.stroke();
    // chest + belly rim light from the beam (front edge only)
    d.globalCompositeOperation = 'screen';
    for (const [x, y, rr, a] of [[0.585, 0.53, 0.03, 0.22], [0.585, 0.60, 0.035, 0.2], [0.60, 0.68, 0.035, 0.16], [0.59, 0.77, 0.03, 0.12]]) G.glow(d, X(x), Y(y), X(rr), `rgba(170,120,240,${a})`);
    d.globalCompositeOperation = 'source-over';
    // plate spill: the back is lit from within by the dorsal crystals (soft, no hard edge line)
    d.globalCompositeOperation = 'screen';
    for (const [x, y, rr, a] of [[0.675, 0.497, 0.03, 0.30], [0.70, 0.517, 0.035, 0.32], [0.74, 0.545, 0.045, 0.36], [0.79, 0.578, 0.05, 0.38], [0.845, 0.625, 0.05, 0.3]])
      G.glow(d, X(x), Y(y), X(rr), `rgba(196,92,226,${a})`);
    d.restore();
    d.strokeStyle = 'rgba(10,3,24,0.95)'; d.lineWidth = W * 0.0014; torsoPath(); d.stroke();
    // knobbly dorsal hide: bumps break the back line; each catches a thin backlit rim from the plates behind
    { const rk = G.rng(77), back = TORSO.slice(1, 19).map(([x, y]) => [X(x), Y(y)]);
      for (let i = 0; i < back.length - 1; i++) {
        const A = back[i], Bq = back[i + 1], dx = Bq[0] - A[0], dy = Bq[1] - A[1], l = Math.hypot(dx, dy) || 1, ox = dy / l, oy = -dx / l;
        for (let s2 = 0; s2 < l; ) {
          const u = s2 / l, prog = i / back.length, rr = W * (0.004 + 0.006 * prog + rk() * 0.004);
          const cx = A[0] + dx * u + ox * rr * 0.25, cy = A[1] + dy * u + oy * rr * 0.25, ang = Math.atan2(oy, ox);
          d.beginPath(); d.ellipse(cx, cy, rr, rr * 0.75, Math.atan2(dy, dx), 0, TAU); d.fillStyle = 'rgb(26,10,54)'; d.fill();
          d.strokeStyle = 'rgba(8,2,22,0.7)'; d.lineWidth = W * 0.001; d.beginPath(); d.arc(cx, cy + W * 0.001, rr * 0.8, ang + 0.6, ang + Math.PI - 0.2); d.stroke();
          d.strokeStyle = `rgba(236,150,250,${0.35 + 0.35 * prog})`; d.lineWidth = W * 0.0011; d.beginPath(); d.arc(cx, cy, rr * 0.95, ang - 1.1, ang + 0.9); d.stroke();
          s2 += rr * (1.3 + rk() * 0.5);
        }
      } }

    // near (upper) arm: biceps + forearm + raised clawed hand, over the torso
    G.glow(d, X(0.655), Y(0.61), X(0.035), 'rgba(10,3,26,0.35)');
    limb([[0.668, 0.590], [0.642, 0.607], [0.614, 0.617], [0.591, 0.611], [0.571, 0.6025], [0.552, 0.5945]], 0.064, 0.032, 0.45, 0.28);
    claw([0.546, 0.6005], [0.540, 0.6085], [0.528, 0.6115], 0.0123, 0.004);
    palm(0.542, 0.5915, 0.0165, 0.0118, -0.25);
    claw([0.542, 0.5850], [0.524, 0.5715], [0.5055, 0.5755], 0.019);
    claw([0.538, 0.5905], [0.518, 0.5835], [0.4995, 0.5895], 0.019);
    claw([0.539, 0.5965], [0.521, 0.5955], [0.5065, 0.6025], 0.0175);

    // ===== head: organic roaring skull, open jaws, teeth =====
    const sk = SKULL.map(([x, y]) => [X(x), Y(y)]), jw = JAW.map(([x, y]) => [X(x), Y(y)]), gp = GAPE.map(([x, y]) => [X(x), Y(y)]);
    const tooth = (x, y, ang, len, w, col = '#fff6ff') => {
      const bx = X(x), by = Y(y), ca = Math.cos(ang), sa = Math.sin(ang), px = -sa, py = ca;
      const tx = bx + ca * len, ty = by + sa * len;
      d.beginPath(); d.moveTo(bx - px * w, by - py * w);
      d.quadraticCurveTo(bx + ca * len * 0.55 - px * w * 0.35, by + sa * len * 0.55 - py * w * 0.35, tx + px * w * 0.25, ty + py * w * 0.25);
      d.quadraticCurveTo(bx + ca * len * 0.5 + px * w * 0.5, by + sa * len * 0.5 + py * w * 0.5, bx + px * w, by + py * w); d.closePath();
      // cel shading: shadow body, then the half facing the beam root gets a hard bright plane
      d.fillStyle = '#a27ad6'; d.fill();
      const lit = (LRX - bx) * px + (LRY - by) * py > 0 ? 1 : -1;
      d.beginPath(); d.moveTo(bx + ca * len * 0.04, by + sa * len * 0.04); d.lineTo(bx + px * w * lit, by + py * w * lit);
      d.quadraticCurveTo(bx + ca * len * 0.5 + px * w * 0.45 * lit, by + sa * len * 0.5 + py * w * 0.45 * lit, tx, ty); d.closePath();
      const tg = d.createLinearGradient(bx, by, tx, ty); tg.addColorStop(0, '#e9b8ff'); tg.addColorStop(0.45, col); tg.addColorStop(1, '#ffffff');
      d.fillStyle = tg; d.fill();
      d.beginPath(); d.moveTo(bx - px * w, by - py * w);
      d.quadraticCurveTo(bx + ca * len * 0.55 - px * w * 0.35, by + sa * len * 0.55 - py * w * 0.35, tx + px * w * 0.25, ty + py * w * 0.25);
      d.quadraticCurveTo(bx + ca * len * 0.5 + px * w * 0.5, by + sa * len * 0.5 + py * w * 0.5, bx + px * w, by + py * w); d.closePath();
      d.strokeStyle = 'rgba(30,6,58,0.85)'; d.lineWidth = W * 0.0005; d.stroke();
    };
    // beam root (light source for teeth + gullet): back along the beam from the flare
    const LRX = X(FLARE[0]) - BEAM_DIR[0] * W * ROOT_D, LRY = Y(FLARE[1]) - BEAM_DIR[1] * W * ROOT_D;
    // gape (behind the jaws): dark gullet, ridged palate, tongue, hot throat light at the beam root
    d.beginPath(); gp.forEach(([x, y], i) => i ? d.lineTo(x, y) : d.moveTo(x, y)); d.closePath();
    { // far cheek + back of the throat: dark under the upper teeth, flooded with beam light low and deep
      const mg = d.createLinearGradient(X(0.5667), Y(0.4542), X(0.5667) - W * 0.021, Y(0.4542) + W * 0.0114);
      mg.addColorStop(0, 'rgb(26,7,52)'); mg.addColorStop(0.3, 'rgb(80,28,122)'); mg.addColorStop(0.7, 'rgb(206,116,222)'); mg.addColorStop(1, 'rgb(246,192,246)'); d.fillStyle = mg; d.fill(); }
    d.save(); d.beginPath(); gp.forEach(([x, y], i) => i ? d.lineTo(x, y) : d.moveTo(x, y)); d.closePath(); d.clip();
    { // palate: a lighter band under the upper jaw with dark transverse ridges
      const up = sk.slice(16).concat([sk[0]]);
      d.lineCap = 'round'; d.strokeStyle = 'rgb(92,40,140)'; d.lineWidth = W * 0.0075; G.spline(d, up.map(([x, y]) => [x + W * 0.0016, y + W * 0.0022]), false, 0.42); d.stroke();
      d.strokeStyle = 'rgba(200,120,240,0.55)'; d.lineWidth = W * 0.0012; G.spline(d, up.map(([x, y]) => [x + W * 0.0048, y + W * 0.0056]), false, 0.42); d.stroke();
      d.strokeStyle = 'rgba(16,4,34,0.75)'; d.lineWidth = W * 0.0008;
      for (let i = 0; i < 6; i++) { const q = 0.15 + i * 0.14, a = G.lerp(up[Math.floor(q * (up.length - 1))][0], up[Math.ceil(q * (up.length - 1))][0], 0.5), b = G.lerp(up[Math.floor(q * (up.length - 1))][1], up[Math.ceil(q * (up.length - 1))][1], 0.5);
        d.beginPath(); d.moveTo(a + W * 0.0012, b + W * 0.0016); d.lineTo(a + W * 0.0048, b + W * 0.0036); d.stroke(); }
      // tongue: rounded mass lying on the lower jaw, lit along its top edge by the beam
      const tq = [[X(0.5330), Y(0.4632)], [X(0.5440), Y(0.4600)], [X(0.5600), Y(0.4612)], [X(0.5760), Y(0.4660)], [X(0.5880), Y(0.4730)], [X(0.5600), Y(0.4700)], [X(0.5400), Y(0.4660)]];
      G.spline(d, tq, true, 0.45);
      const tg2 = d.createLinearGradient(X(0.54), Y(0.459), X(0.585), Y(0.472)); tg2.addColorStop(0, 'rgb(196,92,206)'); tg2.addColorStop(0.5, 'rgb(122,44,150)'); tg2.addColorStop(1, 'rgb(46,14,80)'); d.fillStyle = tg2; d.fill();
      d.strokeStyle = 'rgba(255,196,250,0.85)'; d.lineWidth = W * 0.0011; G.spline(d, tq.slice(0, 5), false, 0.45); d.stroke();
      d.strokeStyle = 'rgba(30,6,56,0.7)'; d.lineWidth = W * 0.0007; G.spline(d, [[X(0.546), Y(0.4628)], [X(0.562), Y(0.4648)], [X(0.578), Y(0.4692)]], false); d.stroke();   // midline groove
      // throat light pooled at the beam root
      const tl = d.createRadialGradient(LRX + W * 0.004, LRY + W * 0.003, 0, LRX + W * 0.004, LRY + W * 0.003, W * 0.022);
      tl.addColorStop(0, 'rgba(255,250,255,1)'); tl.addColorStop(0.25, 'rgba(255,170,250,0.85)'); tl.addColorStop(0.6, 'rgba(210,80,230,0.35)'); tl.addColorStop(1, 'rgba(160,40,200,0)');
      d.fillStyle = tl; d.fillRect(LRX - W * 0.03, LRY - W * 0.03, W * 0.06, W * 0.06);
    }
    d.restore();

    // lower jaw
    G.spline(d, jw, true, 0.4);
    { const jg = d.createLinearGradient(X(0.515), Y(0.458), X(0.548), Y(0.488)); jg.addColorStop(0, 'rgb(112,70,178)'); jg.addColorStop(0.35, 'rgb(56,28,104)'); jg.addColorStop(1, 'rgb(24,9,50)'); d.fillStyle = jg; d.fill(); }
    d.save(); G.spline(d, jw, true, 0.4); d.clip();
    G.glow(d, X(0.585), Y(0.482), X(0.03), 'rgba(10,3,26,0.6)');
    d.lineCap = 'round';
    for (const [o, a] of [[0.0048, 0.4], [0.0085, 0.25]]) { d.strokeStyle = `rgba(8,2,22,${a + 0.2})`; d.lineWidth = W * 0.0014; G.spline(d, [[X(0.515), Y(0.4615 + o)], [X(0.535), Y(0.4665 + o)], [X(0.556), Y(0.4712 + o)], [X(0.58), Y(0.476 + o)]], false); d.stroke();
      d.strokeStyle = `rgba(170,130,236,${a * 0.6})`; d.lineWidth = W * 0.0008; G.spline(d, [[X(0.515), Y(0.461 + o)], [X(0.535), Y(0.466 + o)], [X(0.556), Y(0.4707 + o)], [X(0.58), Y(0.4755 + o)]], false); d.stroke(); }
    d.restore();
    // gum line glowing from the gape
    d.lineCap = 'round'; d.strokeStyle = 'rgba(255,196,255,0.9)'; d.lineWidth = W * 0.0018;
    G.spline(d, jw.slice(1, 7), false, 0.4); d.stroke();
    d.strokeStyle = 'rgba(8,2,22,0.95)'; d.lineWidth = W * 0.0013; G.spline(d, jw, true, 0.4); d.stroke();
    d.strokeStyle = 'rgba(206,170,252,0.75)'; d.lineWidth = W * 0.0014; G.spline(d, jw.slice(10).concat([jw[0]]), false, 0.4); d.stroke();
    // lower teeth: sharp, pointing up into the gape, largest at the front
    for (let i = 0; i < 8; i++) { const u = (i + 0.4) / 8; const x = G.lerp(0.5115, 0.556, u), y = G.lerp(0.4583, 0.4668, u) + 0.0002;
      tooth(x, y, -1.95 + u * 0.35, W * (0.0088 - u * 0.0045), W * (0.0022 - u * 0.0007)); }
    // skull + upper jaw
    G.spline(d, sk, true, 0.42);
    { const hg = d.createLinearGradient(X(0.552), Y(0.432), X(0.625), Y(0.478)); hg.addColorStop(0, 'rgb(98,62,164)'); hg.addColorStop(0.22, 'rgb(52,26,98)'); hg.addColorStop(0.6, 'rgb(30,12,62)'); hg.addColorStop(1, 'rgb(22,8,46)'); d.fillStyle = hg; d.fill(); }
    d.save(); G.spline(d, sk, true, 0.42); d.clip();
    G.glow(d, X(0.655), Y(0.482), X(0.018), 'rgba(16,5,36,0.5)');      // soft join into the neck
    G.glow(d, X(0.575), Y(0.462), X(0.022), 'rgba(220,110,240,0.35)');  // gape light on the inner cheek
    d.lineCap = 'round';
    // brow ridge over the eye, cheek fold under it, a few wrinkles behind
    const ln = (pts, dark, litA, w) => { d.strokeStyle = `rgba(8,2,22,${dark})`; d.lineWidth = W * w * 1.6; G.spline(d, pts.map(([x, y]) => [X(x), Y(y) + W * 0.0012]), false); d.stroke();
      d.strokeStyle = `rgba(196,160,250,${litA})`; d.lineWidth = W * w; G.spline(d, pts.map(([x, y]) => [X(x), Y(y)]), false); d.stroke(); };
    ln([[0.586, 0.4428], [0.596, 0.4452], [0.607, 0.4478], [0.617, 0.4518], [0.626, 0.4572]], 0.55, 0.55, 0.0014);
    ln([[0.590, 0.4605], [0.602, 0.4630], [0.616, 0.4672], [0.632, 0.4736]], 0.6, 0.28, 0.0012);
    ln([[0.612, 0.4560], [0.624, 0.4610], [0.638, 0.4676], [0.650, 0.4752]], 0.45, 0.2, 0.001);
    ln([[0.620, 0.4528], [0.634, 0.4590], [0.648, 0.4672]], 0.4, 0.16, 0.001);
    ln([[0.566, 0.4375], [0.574, 0.4425], [0.580, 0.4492], [0.584, 0.4560]], 0.45, 0.22, 0.001);  // snout fold
    d.restore();
    // rim light from the flare along the snout and brow
    d.save(); d.globalCompositeOperation = 'screen'; d.lineCap = 'round';
    { const shn = d.createLinearGradient(X(0.549), Y(0.432), X(0.60), Y(0.446)); shn.addColorStop(0, 'rgba(236,180,255,0.45)'); shn.addColorStop(1, 'rgba(150,100,220,0)');
      d.strokeStyle = shn; d.lineWidth = W * 0.0022; G.spline(d, sk.slice(0, 8), false, 0.42); d.stroke(); }
    d.restore();
    // inner edge of the upper jaw glows from the gape
    d.strokeStyle = 'rgba(255,190,255,0.9)'; d.lineWidth = W * 0.0016; G.spline(d, sk.slice(16).concat([sk[0]]), false, 0.42); d.stroke();
    d.strokeStyle = 'rgba(8,2,22,0.9)'; d.lineWidth = W * 0.0013; G.spline(d, sk.slice(0, 11), false, 0.42); d.stroke();
    { const bk = d.createLinearGradient(X(0.59), Y(0.44), X(0.665), Y(0.48)); bk.addColorStop(0, 'rgba(200,160,252,0.55)'); bk.addColorStop(1, 'rgba(160,110,230,0.15)');
      d.strokeStyle = bk; d.lineWidth = W * 0.0012; G.spline(d, sk.slice(5, 12).map(([x, y]) => [x - W * 0.0012, y + W * 0.0012]), false, 0.42); d.stroke(); }
    // upper teeth: hang down-left into the gape
    for (let i = 0; i < 7; i++) { const u = (i + 0.45) / 7; const x = G.lerp(0.5525, 0.5835, u), y = G.lerp(0.4398, 0.4688, u);
      tooth(x, y, 2.55 - u * 0.25, W * (0.0080 - u * 0.0035), W * (0.0019 - u * 0.0005)); }
    // nostril + eye socket
    d.fillStyle = 'rgba(8,2,20,0.8)'; d.beginPath(); d.ellipse(X(0.5600), Y(0.4345), W * 0.0018, W * 0.0009, 0.35, 0, TAU); d.fill();
    // occipital knobs at the back of the skull (classic silhouette)
    for (const [x, y, sz] of [[0.628, 0.4555, 0.005], [0.640, 0.4615, 0.006], [0.652, 0.4690, 0.0065]]) { d.beginPath(); d.moveTo(X(x) - W * sz, Y(y) + W * 0.002); d.lineTo(X(x) + W * sz * 0.2, Y(y) - W * sz * 1.1); d.lineTo(X(x) + W * sz, Y(y) + W * 0.003); d.closePath(); d.fillStyle = 'rgb(30,12,62)'; d.fill(); d.strokeStyle = 'rgba(200,150,250,0.55)'; d.lineWidth = W * 0.0009; d.beginPath(); d.moveTo(X(x) - W * sz, Y(y) + W * 0.002); d.lineTo(X(x) + W * sz * 0.2, Y(y) - W * sz * 1.1); d.stroke(); }
    d.fillStyle = '#12052a'; d.beginPath(); d.ellipse(X(EYE[0]), Y(EYE[1]), W * 0.0095, W * 0.0068, 0.42, 0, TAU); d.fill();
    S.body = bodyC;

    // ===== 6. front clouds: dark bank on the right + low band, then the ground =====
    const fc = G.canvas(W + 2 * P, H), f = fc.getContext('2d'); f.translate(P, 0);
    // ground: layered hills, mist, spires
    const gy = 0.862;
    f.fillStyle = 'rgb(23,8,45)';
    f.beginPath(); f.moveTo(X(-0.02), Y(gy));
    const rgnd = G.rng(5);
    for (let x = -0.02; x <= 0.30; x += 0.012) f.lineTo(X(x), Y(gy - 0.002 - rgnd() * 0.003 - (x < 0.06 ? 0.003 : 0)));
    f.lineTo(X(0.30), Y(0.87)); f.lineTo(X(1.02), Y(0.872)); f.lineTo(X(1.02), H + 2); f.lineTo(X(-0.02), H + 2); f.closePath(); f.fill();
    // little tree crowns along the horizon
    for (let i = 0; i < 26; i++) { const x = -0.01 + i * 0.012 + rgnd() * 0.006, rr = 0.004 + rgnd() * 0.006; f.beginPath(); f.arc(X(x), Y(gy - 0.0015), X(rr), Math.PI, 0); f.fill(); }
    // spires (thin cathedral needles) at the left
    const spire = (x, top, w) => { f.beginPath(); f.moveTo(X(x - w), Y(gy)); f.lineTo(X(x - w * 0.6), Y(top + (gy - top) * 0.55)); f.lineTo(X(x), Y(top)); f.lineTo(X(x + w * 0.6), Y(top + (gy - top) * 0.55)); f.lineTo(X(x + w), Y(gy)); f.closePath(); f.fill(); };
    spire(0.0185, 0.8435, 0.003); spire(0.142, 0.8445, 0.0028); spire(0.1585, 0.8265, 0.0034); spire(0.171, 0.840, 0.0028); spire(0.152, 0.849, 0.0045);
    f.fillRect(X(0.135), Y(0.852), X(0.045), Y(0.012));
    // depth layering in the dark band (beats the flat reference band, stays in palette)
    const band = (y0, amp, col, seed) => { const rb = G.rng(seed); f.fillStyle = col; f.beginPath(); f.moveTo(X(-0.02), H + 2); for (let x = -0.02; x <= 1.03; x += 0.02) f.lineTo(X(x), Y(y0 + Math.sin(x * 5 + seed) * amp + rb() * 0.002)); f.lineTo(X(1.03), H + 2); f.closePath(); f.fill(); };
    const mist = f.createLinearGradient(0, Y(0.86), 0, Y(0.93)); mist.addColorStop(0, 'rgba(70,24,84,0.18)'); mist.addColorStop(1, 'rgba(40,12,64,0)');
    f.fillStyle = mist; f.fillRect(X(-0.02), Y(0.865), X(1.06), Y(0.07));
    band(0.905, 0.006, 'rgb(24,9,46)', 3);
    band(0.95, 0.008, 'rgb(23,8,45)', 7);
    // faint rim light on the distant rolling ground + a few far-off window lights by the spires
    { const rr2 = G.rng(321); f.lineCap = 'round';
      // low ground mist pooled in the hollows + faint reflected beam glow on the near field (soft, no lines)
      for (const [x, y, rx, ry, al] of [[0.18, 0.905, 0.30, 0.018, 0.10], [0.62, 0.93, 0.36, 0.02, 0.07], [0.35, 0.965, 0.4, 0.02, 0.05]]) {
        f.save(); f.translate(X(x), Y(y)); f.scale(1, ry * H / (rx * W)); const mg = f.createRadialGradient(0, 0, 0, 0, 0, X(rx)); mg.addColorStop(0, `rgba(96,36,120,${al})`); mg.addColorStop(1, 'rgba(60,20,90,0)'); f.fillStyle = mg; f.fillRect(-X(rx), -X(rx), X(rx) * 2, X(rx) * 2); f.restore(); }
      for (let i = 0; i < 16; i++) { const x = 0.01 + rr2() * 0.25, y = 0.866 + rr2() * 0.010; f.fillStyle = `rgba(255,${170 + rr2() * 60 | 0},230,${0.25 + rr2() * 0.35})`; f.fillRect(X(x), Y(y), W * 0.0012, W * 0.0012); } }
    { f.save(); f.globalCompositeOperation = 'screen';
      const hg = f.createLinearGradient(0, Y(0.855), 0, Y(0.93)); hg.addColorStop(0, 'rgba(120,34,104,0.38)'); hg.addColorStop(0.4, 'rgba(84,24,90,0.18)'); hg.addColorStop(1, 'rgba(40,10,60,0)');
      f.fillStyle = hg; f.fillRect(X(-0.02), Y(0.855), X(1.06), Y(0.075));
      f.restore();
      // faint far city: low blocks with a few warm windows across the lower left
      const rc = G.rng(808); f.fillStyle = 'rgb(28,10,50)';
      for (let x = 0.02; x < 0.55; x += 0.006 + rc() * 0.01) { const h = 0.002 + rc() * 0.006 * (1 - x); f.fillRect(X(x), Y(0.884 - h), X(0.004 + rc() * 0.008), Y(h + 0.004)); }
      for (let i = 0; i < 40; i++) { const x = 0.02 + rc() * 0.5, y = 0.879 + rc() * 0.007; f.fillStyle = `rgba(255,${150 + rc() * 70 | 0},210,${0.15 + rc() * 0.25})`; f.fillRect(X(x), Y(y), W * 0.0011, W * 0.0011); }
      // soft drifting mist layers in the foreground
      for (const [x, y, rx, ry, al] of [[0.12, 0.925, 0.22, 0.012, 0.09], [0.32, 0.955, 0.26, 0.012, 0.07], [0.08, 0.975, 0.2, 0.014, 0.06], [0.45, 0.905, 0.2, 0.01, 0.06]]) {
        f.save(); f.translate(X(x), Y(y)); f.scale(1, ry * H / (rx * W)); const mg = f.createRadialGradient(0, 0, 0, 0, 0, X(rx)); mg.addColorStop(0, `rgba(120,50,140,${al})`); mg.addColorStop(1, 'rgba(60,20,90,0)'); f.fillStyle = mg; f.fillRect(-X(rx), -X(rx), X(rx) * 2, X(rx) * 2); f.restore(); } }
    cumulus(f, W, H, {
      seed: 31, n: 16, rMin: 0.05, rMax: 0.10, eMin: 0.024, eMax: 0.05, edges: [8, 9, 10, 11, 12, 13, 0, 1, 2, 3], lightAng: -2.4,
      region: [[0.835, 0.636], [0.87, 0.622], [0.91, 0.615], [0.96, 0.610], [1.03, 0.606], [1.03, 0.93], [0.72, 0.93], [0.72, 0.85], [0.728, 0.81], [0.74, 0.775], [0.752, 0.742], [0.768, 0.708], [0.787, 0.680], [0.81, 0.655]],
      col: (x, y, j) => {
        const pk = Math.max(0, 1 - Math.hypot((x - 0.83) * 1.4, (y - 0.615) * 2.4) / 0.10), gd = G.smooth(0.82, 0.885, y);
        return { base: mix(mix([30, 13, 56], [36, 17, 64], j + 0.5), [24, 9, 46], gd), lit: mix(mix(mix([48, 26, 84], [56, 31, 94], j + 0.5), [150, 80, 186], pk * 0.8), [26, 10, 50], gd), rimA: (0.1 + pk * 0.4) * (1 - gd) };
      },
    });
    cumulus(f, W, H, {
      seed: 47, n: 14, rMin: 0.035, rMax: 0.07, eMin: 0.018, eMax: 0.04, edges: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lightAng: -2.3,
      region: [[0.225, 0.866], [0.25, 0.848], [0.29, 0.838], [0.33, 0.836], [0.37, 0.845], [0.42, 0.846], [0.47, 0.836], [0.52, 0.826], [0.57, 0.810], [0.63, 0.803], [0.69, 0.806], [0.74, 0.815], [0.85, 0.835], [1.03, 0.835], [1.03, 0.93], [0.225, 0.93]],
      col: (x, y, j) => {
        const pk = G.smooth(0.62, 0.30, x) * 1.0;
        const gd = G.smooth(0.845, 0.885, y); return { base: mix(mix([30, 12, 56], [36, 15, 62], j + 0.5), [23, 8, 45], gd), lit: mix(mix(mix([52, 27, 88], [60, 31, 96], j + 0.5), [140, 64, 150], pk), [30, 12, 54], gd), rimA: (0.08 + pk * 0.3) * (1 - gd) };
      },
    });
    S.front = fc;

    // ===== sprites =====
    const spr = G.canvas(128, 128); { const q = spr.getContext('2d'); const gg = q.createRadialGradient(64, 64, 0, 64, 64, 64); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.15, 'rgba(255,215,255,0.8)'); gg.addColorStop(0.4, 'rgba(230,110,235,0.32)'); gg.addColorStop(1, 'rgba(160,40,200,0)'); q.fillStyle = gg; q.fillRect(0, 0, 128, 128); }
    S.blob = spr;
    const bx0 = X(FLARE[0]), by0 = Y(FLARE[1]);
    const L = (by0 + W * 0.03) / -BEAM_DIR[1];
    S.beam = { x0: bx0, y0: by0, dx: BEAM_DIR[0], dy: BEAM_DIR[1], L, mx: X(MOUTH[0]), my: Y(MOUTH[1]) };
    S.meteor = { period: 13 };
    S.mp = mpInit(W, H);
    return S;
  }

  function draw(ctx, W, H, t, S, mouse) {
    const X = x => x * W, Y = y => y * H;
    const mx = mouse && !mouse.cap ? mouse.x || 0 : 0, my = mouse && !mouse.cap ? mouse.y || 0 : 0;
    const P = S.P;
    ctx.drawImage(S.sky, 0, 0);

    // twinkling stars + sparkles
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, m, ph, sp] of S.twinkle) {
      const tw = 0.5 + 0.5 * Math.sin(t * sp * 0.6 + ph);
      ctx.globalAlpha = 0.13 * m * tw * tw * (3 - 2 * tw);
      const rad = W * (0.004 + 0.004 * m);
      ctx.drawImage(S.blob, X(x) - rad, Y(y) - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < SPARKLES.length; i++) {
      const [x, y, sz, br] = SPARKLES[i];
      const tw = 0.88 + 0.12 * Math.sin(t * (0.5 + i * 0.13) + i * 2.1);
      const R = W * sz;
      ctx.globalAlpha = 0.22 * tw * br; ctx.drawImage(S.blob, X(x) - R * 0.9, Y(y) - R * 0.9, R * 1.8, R * 1.8);
      G.sparkle(ctx, X(x), Y(y), R, '#e8dcff', 0.75 * br, 0.035);
      G.sparkle(ctx, X(x), Y(y), R * 0.45, '#ffffff', 0.9 * br, 0.1);
      ctx.globalAlpha = br; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(x), Y(y), W * 0.0012, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // rare shooting star (deterministic per cycle)
    {
      const per = S.meteor.period, cyc = Math.floor((t + 4) / per), lt = (t + 4) - cyc * per;
      if (lt < 0.9) {
        const rr = G.rng(1000 + cyc); const sx = 0.62 + rr() * 0.3, sy = 0.05 + rr() * 0.18;
        const k = lt / 0.9, len = W * 0.14, ang = 2.55 + rr() * 0.15;
        const hx = X(sx) + Math.cos(ang) * W * 0.22 * k, hy = Y(sy) + Math.sin(ang) * W * 0.22 * k;
        const a = Math.sin(Math.PI * k);
        const gg = ctx.createLinearGradient(hx, hy, hx - Math.cos(ang) * len, hy - Math.sin(ang) * len);
        gg.addColorStop(0, `rgba(255,236,255,${0.9 * a})`); gg.addColorStop(1, 'rgba(200,120,255,0)');
        ctx.strokeStyle = gg; ctx.lineWidth = W * 0.0016; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(ang) * len, hy - Math.sin(ang) * len); ctx.stroke(); ctx.lineCap = 'butt';
      }
    }

    // back clouds — slow drift
    const dB = Math.sin(t * 0.11) * W * 0.003 + mx * W * 0.002;
    { const br = 1 + 0.0012 * Math.sin(t * 0.19 + 0.6), oy = Math.sin(t * 0.15) * W * 0.0008; // slow breathing swell about the cloud base
      ctx.drawImage(S.back, -P + dB - (W + 2 * P) * (br - 1) * 0.6, oy - H * (br - 1) * 0.72, (W + 2 * P) * br, H * br); }

    { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t * 0.7) * Math.sin(t * 0.43 + 1);
      const R = W * 0.16; ctx.drawImage(S.glowSpr, X(0.86) - R, Y(0.585) - R, R * 2, R * 2); ctx.restore(); }
    // dorsal plates: travelling pulse up the spine
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < S.plateBases.length; i++) {
      const [x, y, rad] = S.plateBases[i];
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 - i * 0.55);
      ctx.globalAlpha = 0.4 + 0.12 * pulse;
      const R = W * rad * 1.85;
      ctx.drawImage(S.glowSpr, X(x) - R, Y(y) - R, R * 2, R * 2);
    }
    ctx.restore();
    ctx.drawImage(S.plates, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 - 1.6);
      ctx.globalAlpha = 0.07 + 0.04 * pulse; ctx.drawImage(S.plates, 0, 0);
    }
    ctx.restore();
    ctx.drawImage(S.body, 0, 0);

    // eye glow
    const hb = 0.5 + 0.5 * Math.sin(t * 2.4), fl3 = flick3(t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const eyeP = 0.86 + 0.14 * hb;
    ctx.globalAlpha = eyeP * 0.85; { const R = W * 0.036; ctx.drawImage(S.blob, X(EYE[0]) - R, Y(EYE[1]) - R, R * 2, R * 2); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff6ff'; ctx.beginPath(); ctx.ellipse(X(EYE[0]), Y(EYE[1]), W * 0.0082, W * 0.006, 0.4, 0, TAU); ctx.fill();
    ctx.restore();

    // atomic beam: thin white-hot core with a soft bloom. It rises out of the throat (clipped by both jaws),
    // swells slightly through the flare, then thins to a fine thread in the corner.
    const B = S.beam;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.clip(S.mp.clip, 'evenodd');
    const cw = 1 + 0.10 * Math.sin(t * 9.1) + 0.07 * Math.sin(t * 15.3 + 1.1) + 0.05 * Math.sin(t * 23.7 + 0.4);  // core width pulse
    const cb = 0.88 + 0.12 * fl3;                                                                                   // core brightness
    const shimmer = 0.9 + 0.1 * fl3;
    const px = -B.dy, py = B.dx;
    const taper = (u0, u1, w0, w1, a0, a1, col, mid) => {
      const xa = B.x0 + B.dx * B.L * u0, ya = B.y0 + B.dy * B.L * u0, xb = B.x0 + B.dx * B.L * u1, yb = B.y0 + B.dy * B.L * u1;
      const gg = ctx.createLinearGradient(xa, ya, xb, yb);
      gg.addColorStop(0, `rgba(${col},${a0})`); gg.addColorStop(0.35, `rgba(${col},${G.lerp(a0, a1, mid)})`); gg.addColorStop(1, `rgba(${col},${a1})`);
      ctx.fillStyle = gg; ctx.beginPath();
      ctx.moveTo(xa + px * w0, ya + py * w0); ctx.lineTo(xb + px * w1, yb + py * w1); ctx.lineTo(xb - px * w1, yb - py * w1); ctx.lineTo(xa - px * w0, ya - py * w0); ctx.closePath(); ctx.fill();
    };
    const uR = -(W * (ROOT_D + 0.025)) / B.L, uM = -(W * ROOT_D) / B.L;   // behind the lower lip -> root in the gape -> flare
    // throat segment: narrow at the root, swelling toward the flare
    taper(uR, 0, W * 0.0045, W * 0.0085 * shimmer, 0.18 * shimmer, 0.22 * shimmer, '190,50,210', 0.5);
    taper(uR, 0, W * 0.0018 * cw, W * 0.0036 * cw, 0.5 * cb, 0.55 * cb, '240,90,225', 0.5);
    taper(uR, 0, W * 0.0007 * cw, W * 0.0013 * cw, 0.95 * cb, 1.0, '255,246,255', 0.5);
    // main beam to the corner
    taper(0, 1, W * 0.017 * shimmer, W * 0.004, 0.07 * shimmer, 0.0, '170,40,190', 0.45);
    taper(0, 1, W * 0.0085 * shimmer, W * 0.0025, 0.17 * shimmer, 0.0, '170,40,190', 0.45);
    taper(0, 1, W * 0.0036 * cw, W * 0.0011, 0.5 * cb, 0.03, '232,72,218', 0.45);
    taper(0, 1, W * 0.0019 * cw, W * 0.0006, 0.95 * cb, 0.05, '255,170,245', 0.35);
    taper(0, 1, W * 0.0011 * cw, W * 0.0004, 1.0, 0.3, '255,248,255', 0.55);
    // heat ripple: small lens-shaped pulses running up out of the throat and along the beam
    { const ang = Math.atan2(B.dy, B.dx);
      for (let k = 0; k < 7; k++) {
        const q = fract(t * 0.85 + k / 7), u = G.lerp(uM, 0.3, q * q);
        const a = Math.sin(Math.PI * q) * (1 - q * 0.6), x = B.x0 + B.dx * B.L * u, y = B.y0 + B.dy * B.L * u;
        const lw = W * 0.0042 * (1 - q * 0.55), ll = W * (0.006 + 0.012 * q);
        ctx.fillStyle = `rgba(255,170,250,${0.32 * a})`; ctx.beginPath(); ctx.ellipse(x, y, ll, lw, ang, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,230,255,${0.4 * a})`; ctx.lineWidth = W * 0.0006; ctx.beginPath(); ctx.ellipse(x, y, ll * 0.8, lw * 1.25, ang, 0, TAU); ctx.stroke();
      } }
    // travelling energy packets riding up the beam (they thin with the beam)
    for (let k = 0; k < 4; k++) {
      const u = ((t * 0.18 + k / 4) % 1), len = 0.11;
      const a = Math.sin(Math.PI * Math.min(1, u * 1.2)) * (1 - u * 0.5);
      const w = W * 0.0028 * (1 - u * 0.7);
      const xa = B.x0 + B.dx * B.L * u, ya = B.y0 + B.dy * B.L * u, xb = B.x0 + B.dx * B.L * (u + len), yb = B.y0 + B.dy * B.L * (u + len);
      const gg = ctx.createLinearGradient(xa, ya, xb, yb); gg.addColorStop(0, 'rgba(255,140,240,0)'); gg.addColorStop(0.5, `rgba(255,200,252,${0.3 * a})`); gg.addColorStop(1, 'rgba(255,140,240,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(xa + px * w, ya + py * w); ctx.lineTo(xb + px * w * 0.8, yb + py * w * 0.8); ctx.lineTo(xb - px * w * 0.8, yb - py * w * 0.8); ctx.lineTo(xa - px * w, ya - py * w); ctx.closePath(); ctx.fill();
    }
    // spiralling filaments twisting off the lower beam
    ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const u = G.lerp(uM, 0.42, i / 48), amp = W * 0.0032 * (1 - (u - uM) / (0.42 - uM));
        const ph = u * 70 - t * 4 + k * Math.PI, o = Math.sin(ph) * amp;
        const x = B.x0 + B.dx * B.L * u + px * o, y = B.y0 + B.dy * B.L * u + py * o;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,150,240,0.2)'; ctx.lineWidth = W * 0.0008; ctx.stroke();
    }
    ctx.restore();
    // flare just outside the jaws: bloom + many long, thin tapered rays that flicker independently
    const fx = X(FLARE[0]), fy = Y(FLARE[1]);
    const fp = 0.9 + 0.1 * fl3;
    ctx.globalAlpha = 0.62 * fp; { const R = W * (0.068 + 0.004 * Math.sin(t * 4.3)); ctx.drawImage(S.blob, fx - R, fy - R, R * 2, R * 2); }
    ctx.globalAlpha = 1; { const R = W * (0.028 + 0.002 * Math.sin(t * 6.1 + 1)); ctx.drawImage(S.blob, fx - R, fy - R, R * 2, R * 2); }
    const rot = t * 0.05;
    for (let k = 0; k < 16; k++) {
      const h1 = hash(k, 7.3), h2 = hash(k, 3.1);
      const a = rot * (k % 2 ? -1 : 1) + k * TAU / 16 + (h1 - 0.5) * 0.25;
      const len = W * (0.018 + 0.05 * h1 * h1) * (0.8 + 0.2 * Math.sin(t * (2 + 3 * h2) + k * 1.7) + 0.08 * Math.sin(t * 11 + k));
      const w = W * (0.0010 + 0.0008 * h2);
      const gg = ctx.createLinearGradient(fx, fy, fx + Math.cos(a) * len, fy + Math.sin(a) * len);
      gg.addColorStop(0, 'rgba(255,255,255,0.95)'); gg.addColorStop(0.4, 'rgba(255,215,252,0.6)'); gg.addColorStop(1, 'rgba(255,150,245,0)');
      ctx.fillStyle = gg; ctx.beginPath();
      ctx.moveTo(fx - Math.sin(a) * w, fy + Math.cos(a) * w); ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len); ctx.lineTo(fx + Math.sin(a) * w, fy - Math.cos(a) * w); ctx.closePath(); ctx.fill();
    }
    G.sparkle(ctx, fx, fy, W * 0.02, '#ffffff', fp, 0.07);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(fx, fy, W * (0.0055 + 0.0008 * fl3), 0, TAU); ctx.fill();
    ctx.restore();

    // front clouds — slower counter drift
    const dF = Math.sin(t * 0.09 + 1.3) * W * 0.0025 + mx * W * 0.004;
    { const br = 1 + 0.001 * Math.sin(t * 0.17 + 2.1), oy = (0.5 + 0.5 * Math.sin(t * 0.13 + 1.0)) * W * 0.0007;
      ctx.drawImage(S.front, -P + dF - (W + 2 * P) * (br - 1) * 0.7, oy - H * (br - 1), (W + 2 * P) * br, H * br); }

    // beam light breathing over the scene (very soft)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.05 + 0.015 * hb;
    { const R = W * 0.45; ctx.drawImage(S.blob, fx - R, fy - R, R * 2, R * 2); }
    ctx.restore();

    mouthPlasma(ctx, W, H, t, S);
  }

  window.PIECES = window.PIECES || [];
  window.PIECES[1] = { title: 'Violet Beam', init, draw };
})();
