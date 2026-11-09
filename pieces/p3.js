// Poster 3 — "Starry Breath". Van Gogh brushwork Godzilla: streamline strokes on a vortex flow field.
// Contract: window.PIECES[2] = { title, init(ctx,W,H)->state, draw(ctx,W,H,t,state,mouse) }. H === 2*W.
// All geometry is authored in reference units (1200 x 2400) and scaled by S = W/1200.
(() => {
  'use strict';
  const GZ = window.GZ;
  const RW = 1200, RH = 2400, G = 6, GW = 201, GH = 401;
  const { clamp, smooth, lerp, fbm, noise } = GZ;
  const TAU = Math.PI * 2;

  // ---------- palette: one blue value ramp drives the whole sky so every region stays coherent
  const RAMP = [
    [0.00, 0, 10, 18], [0.12, 3, 26, 40], [0.24, 9, 40, 60], [0.34, 16, 54, 79], [0.44, 22, 72, 104],
    [0.54, 28, 99, 146], [0.63, 35, 128, 182], [0.72, 48, 160, 214], [0.81, 80, 190, 240],
    [0.89, 140, 220, 250], [0.95, 196, 240, 255], [1.00, 236, 250, 255]];
  const LUT = new Float32Array(257 * 3);
  for (let i = 0; i <= 256; i++) {
    const v = i / 256; let k = 0; while (k < RAMP.length - 2 && RAMP[k + 1][0] < v) k++;
    const a = RAMP[k], b = RAMP[k + 1], f = clamp((v - a[0]) / (b[0] - a[0]));
    for (let c = 0; c < 3; c++) LUT[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
  }
  const ramp = (L, o) => { const i = (clamp(L) * 256) | 0; o[0] = LUT[i * 3]; o[1] = LUT[i * 3 + 1]; o[2] = LUT[i * 3 + 2]; return o; };
  const GOLD = [222, 174, 92];

  // ---------- composition landmarks (measured on the reference, ref px)
  // dark sky vortices: x, y, radius, spin, depth
  const DARK = [[560, 260, 300, 1, 1, 34, 2.2, .3], [922, 578, 210, -1, 1.05, 27, 0.4, .26], [850, 1005, 160, -1, 1, 21, 3.6, .22], [405, 1165, 180, 1, 1.1, 25, 5.1, .28], [735, 805, 115, 1, .7, 17, 1.3, .2],
    [1125, 790, 125, 1, .6, 19, 4.4, .2], [70, 810, 120, -1, .45, 18, 2.9, .2]];
  // golden halos: x, y, r, ring wavelength, gold amount
  const HALO = [[1192, 150, 215, 24, 0.85], [25, 665, 82, 13, 0.9], [120, 1025, 82, 13, 0.85], [890, 325, 92, 16, 0.45]];
  // light cloud curls: x, y, r, spin, amp
  const CURL = [[170, 1440, 150, 1, .06], [560, 1470, 135, -1, .06], [470, 1720, 115, 1, .055], [1090, 1030, 150, 1, .07],
    [60, 1300, 115, 1, .05], [1120, 1250, 105, -1, .05]];
  { const pr = GZ.rng(4242), n = CURL.length; for (let i = 0; i < n; i++) { const [x, y, r, sp] = CURL[i]; for (let k = 0; k < 3; k++) { const a = -Math.PI * (0.15 + 0.7 * pr()), d = r * (0.75 + 0.3 * pr()); CURL.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, r * (0.45 + 0.2 * pr()), k % 2 ? sp : -sp, 0.05, 0.35]); } } }
  const SPI = [392, 1978, 300];
  // breath centreline: x, y, half-width, intensity (mouth -> top-left)
  const BR = [[722, 1412, 30, 1], [703, 1312, 70, 1], [642, 1186, 106, 1], [562, 1062, 142, .97], [484, 932, 180, .88],
    [420, 802, 210, .74], [368, 662, 232, .6], [330, 522, 248, .48], [310, 362, 250, .37], [305, 192, 245, .28], [318, 22, 240, .2], [330, -110, 240, .15]];

  // ---------- the field: flow direction + lightness + gold + breath mask at a point
  const F = { fx: 0, fy: 0, L: 0, g: 0, B: 0, core: 0 };
  function field(x, y) {
    let L = 0.245 + 0.27 * smooth(1150, 2050, y) + 0.07 * Math.exp(-((x - 1120) ** 2) / 270 ** 2 - ((y - 980) ** 2) / 430 ** 2)
      - 0.06 * Math.exp(-((x - 900) ** 2 + (y - 300) ** 2) / 420 ** 2) - 0.03 * smooth(1300, 300, y);
    L += 0.075 * fbm(x / 240 + 3.3, y / 240 + 1.7, 3);
    { // powder-blue cloud billows behind the arm / left of the torso (mid band)
      const wm = Math.exp(-(((x - 330) / 420) ** 2) - (((y - 1560) / 300) ** 2));
      const puff = smooth(-0.25, 0.35, fbm(x / 150 + 21, y / 150 + 4, 3));
      L += wm * (0.03 + 0.09 * puff) - 0.035 * Math.exp(-(((x - 300) / 380) ** 2) - (((y - 1330) / 230) ** 2));
    }
    const a0 = 0.7 + 1.15 * fbm(x / 900 + 9.1, y / 900 + 2.4, 2);
    let fx = Math.cos(a0) * 0.12, fy = Math.sin(a0) * 0.12, g = 0;
    for (let k = 0; k < DARK.length; k++) {
      const v = DARK[k], dx = x - v[0], dy = y - v[1], d = Math.hypot(dx, dy) + 1e-3, q = d / v[2];
      if (q > 2.3) continue;
      const w = Math.exp(-q * q * 0.55) * 3, s = v[3];
      fx += (-dy / d * s - 0.2 * dx / d) * w; fy += (dx / d * s - 0.2 * dy / d) * w;
      if (q < 1.45) {
        const th = Math.atan2(dy, dx), ecc = 1 + v[7] * Math.cos(th - v[6]) * smooth(0.1, 0.8, q);   // off-centre eye + trailing outer arms
        const dq = d * ecc, qe = dq / v[2], wl = smooth(1.45, 0.7, qe);
        const lam = v[5] * (0.55 + 0.75 * qe), wob = 1.8 * noise(x / 90 + k * 7, y / 90);
        const band = Math.tanh(2.6 * Math.sin(TAU * (dq / lam + s * th / TAU) + wob));
        const brk = 0.45 + 0.55 * smooth(-0.3, 0.25, noise(x / 55 + k * 3, y / 55 - k));             // rings break into separate strokes
        L += wl * (-0.085 * v[4] + 0.12 * band * brk * Math.sqrt(v[4])) - 0.2 * v[4] * Math.exp(-((qe / 0.12) ** 2));
      }
    }
    for (let k = 0; k < HALO.length; k++) {
      const v = HALO[k], dx = x - v[0], dy = y - v[1], d = Math.hypot(dx, dy) + 1e-3, q = d / v[2];
      if (q > 2) continue;
      const w = Math.exp(-q * q * 1.3) * 1.4;
      fx += (-dy / d - 0.12 * dx / d) * w; fy += (dx / d - 0.12 * dy / d) * w;
      if (q < 1.1) {
        const wl = smooth(1.1, 0.2, q), th = Math.atan2(dy, dx);
        const band = 0.5 + 0.5 * Math.sin(TAU * (d / v[3] + th / TAU) + noise(x / 60, y / 60));
        g = Math.max(g, wl * band * band * v[4] * (0.55 + 0.45 * smooth(1.1, 0.3, q)));
        L += wl * 0.06 + 0.12 * Math.exp(-((q / 0.13) ** 2));
      }
    }
    for (let k = 0; k < CURL.length; k++) {
      const v = CURL[k], dx = x - v[0], dy = y - v[1], d = Math.hypot(dx, dy) + 1e-3, q = d / v[2];
      if (q > 2) continue;
      const w = Math.exp(-q * q * 1.6) * 0.8 * (v[5] || 1), s = v[3];
      fx += (-dy / d * s - 0.05 * dx / d) * w; fy += (dx / d * s - 0.05 * dy / d) * w;
      if (q < 1.15) { // cloud billow: dome lit from above, inked only along its upper rim, shadowed underneath
        const th = Math.atan2(dy, dx), qq = q * (1 + 0.06 * Math.sin(th * 5 + v[0])), top = clamp(-dy / d * 0.8 + 0.4);
        L += smooth(1.0, 0.6, qq) * (0.04 + 0.11 * top - 0.05 * (1 - top)) - 0.13 * top * Math.exp(-(((qq - 1.0) / 0.07) ** 2));
      }
    }
    // bright spiral (lower left)
    {
      const dx = x - SPI[0], dy = y - SPI[1], d = Math.hypot(dx, dy) + 1e-3, q = d / SPI[2];
      if (q < 1.7) {
        const w = Math.exp(-q * q * 0.9) * 2.6;
        fx += (-dy / d - 0.3 * dx / d) * w; fy += (dx / d - 0.3 * dy / d) * w;
        const ws = smooth(1.2, 0.55, q), th = Math.atan2(dy, dx);
        const band = Math.sin(TAU * (d / 36 + th / TAU) + 1.2 * noise(x / 70, y / 70));
        const Ls = 0.58 + 0.2 * Math.pow(1 - Math.min(q, 1), 0.8) + 0.085 * band - 0.32 * Math.exp(-((d / 13) ** 2));
        L = lerp(L, Ls, ws);
      }
    }
    // luminous flame column between the spiral and the monster + glow right of the breath
    {
      const wc = Math.min(1, 1.3 * Math.exp(-(((x - 680) / 140) ** 2) - (((y - 1900) / 500) ** 2)));
      const wh = Math.exp(-(((x - 600) / 150) ** 2) - (((y - 1430) / 150) ** 2));
      const stripe = Math.sin(x * 0.11 + 4 * fbm(x / 80, y / 160, 2));
      const wz = Math.exp(-(((x - 960) / 330) ** 2) - (((y - 1240) / 190) ** 2)) * 1.25 + 0.8 * Math.exp(-(((x - 1180) / 120) ** 2) - (((y - 1700) / 300) ** 2));
      L = lerp(L, 0.74 + 0.08 * stripe, wc * 0.9); L = lerp(L, 0.6 + 0.05 * stripe, wh * 0.6); L = lerp(L, 0.6 + 0.07 * stripe, Math.min(1, wz) * 0.75);
      const wg = Math.exp(-(((x - 590) / 210) ** 2) - (((y - 2210) / 180) ** 2)); L = lerp(L, 0.8 + 0.05 * stripe, wg * 0.85);
      const ang = -Math.PI / 2 + 0.8 * Math.sin(y / 38 + x / 55) + 1.9 * fbm(x / 75, y / 75, 3), wcv = (wc + wh * 0.6 + wz) * 3;
      fx += Math.cos(ang) * wcv; fy += Math.sin(ang) * wcv;
    }
    // breath plume
    let best = 1e9, bi = 0, bt = 0, cross = 0;
    for (let i = 0; i < BR.length - 1; i++) {
      const a = BR[i], b = BR[i + 1], ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey;
      const t = clamp(((x - a[0]) * ex + (y - a[1]) * ey) / l2), px = a[0] + ex * t - x, py = a[1] + ey * t - y, d2 = px * px + py * py;
      if (d2 < best) { best = d2; bi = i; bt = t; cross = ex * (y - a[1]) - ey * (x - a[0]); }
    }
    let B = 0, core = 0;
    {
      const a = BR[bi], b = BR[bi + 1], d = Math.sqrt(best), hw = lerp(a[2], b[2], bt), k = lerp(a[3], b[3], bt);
      // before the mouth: no breath
      const pre = bi === 0 && bt <= 0 ? 0 : 1;
      const q = d / hw, east = cross > 0;
      const ns = fbm(x / 105 + 11, y / 105 + 5, 3), nr = fbm(x / 34 + 2, y / 34 + 9, 3);
      // ragged liquid edge: big lobes (domain-warped) + fine licks; the east (sky-facing) edge splashes harder
      const lob = fbm(x / 60 + 3 * ns, y / 60 - 2 * ns, 3), up = smooth(1350, 500, y);
      const qn = q + 0.55 * ns + (east ? (1.0 + 0.6 * up) * nr + 0.55 * up * lob + 0.05 : 0.6 * nr + 0.35 * up * lob);
      B = pre * (1 - smooth(0.68, 1.08, qn));
      core = pre * (1 - smooth(0.0, 0.72, q + 0.25 * ns));
      if (B > 0.001) {
        const ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey);
        const across = (cross / el) / 13;
        const stripe = Math.sin(TAU * across + 3.2 * fbm(x / 90, y / 160, 2));
        const hn = fbm(x / 42 + 7 + ns, y / 42 + 3, 3);
        const hole = smooth(0.04, 0.2, hn) * (east ? 1 : 0.45) * smooth(0.2, 0.62, q) * smooth(1350, 850, y) + smooth(0.1, 0.26, hn) * 0.7 * smooth(950, 300, y) * smooth(0.1, 0.4, q);
        const Lb = 0.52 - 0.14 * smooth(1000, 120, y) + 0.12 * k + core * k * k * 0.2 + 0.08 * stripe * (0.5 + core) + 0.08 * ns - 0.42 * clamp(hole);
        L = lerp(L, Lb, B);
        const ang = Math.atan2(ey, ex) + 1.9 * fbm(x / 85 + 4, y / 85 + 8, 3) * (0.5 + 0.7 * smooth(0.2, 0.9, q)) + 0.7 * noise(x / 28 + 1, y / 28 + 2) + 0.25 * Math.sin(y / 26 + x / 47);
        const n0 = Math.hypot(fx, fy) + 1e-6, wb = Math.min(1, B * 1.6);
        fx = lerp(fx / n0, Math.cos(ang), wb); fy = lerp(fy / n0, Math.sin(ang), wb);
        g *= 1 - B;
      }
    }
    const n = Math.hypot(fx, fy) + 1e-6;
    F.fx = fx / n; F.fy = fy / n; F.L = L; F.g = g; F.B = B; F.core = core;
    return F;
  }

  // ---------- silhouettes (ref px)
  const BODY = [[745, 1480], [770, 1420], [800, 1385], [840, 1372], [880, 1382], [925, 1410], [970, 1458], [1008, 1528], [1036, 1615], [1052, 1736],
    [1096, 1800], [1150, 1840], [1215, 1866], [1215, 2420], [690, 2420], [700, 2380], [715, 2340], [722, 2300], [716, 2255], [708, 2210], [702, 2160],
    [705, 2110], [718, 2060], [733, 2005], [748, 1960], [765, 1920], [785, 1880], [793, 1850], [795, 1800], [800, 1760], [790, 1600], [775, 1545], [762, 1520]];
  const MOUTH = [[731, 1368], [737, 1385], [737, 1400], [740, 1428], [733, 1440], [722, 1447], [710, 1450], [722, 1430], [728, 1405]];
  const ZONE = [[826, 1390], [860, 1352], [920, 1332], [990, 1302], [1060, 1292], [1120, 1252], [1215, 1282], [1215, 1872], [1150, 1822],
    [1100, 1757], [1075, 1692], [1050, 1622], [1036, 1600], [1008, 1520], [970, 1452], [925, 1404], [880, 1378]];
  // dorsal plates: root x,y, tip x,y, half width
  const PLATES = [
    [1215, 1700, 1238, 1560, 30], [1200, 1630, 1222, 1480, 32], [1180, 1560, 1196, 1420, 30], [1160, 1490, 1172, 1372, 28], [1205, 1450, 1230, 1300, 30],
    [1190, 1975, 1228, 1850, 26], [1160, 1915, 1205, 1790, 28], [1128, 1850, 1176, 1722, 30], [1096, 1785, 1140, 1650, 30],
    [1062, 1720, 1104, 1600, 28], [1030, 1655, 1066, 1548, 26], [998, 1600, 1030, 1505, 22], [1150, 1740, 1200, 1640, 26], [1170, 1830, 1215, 1720, 26],
    [1120, 1540, 1120, 1258, 40], [1150, 1560, 1180, 1400, 26], [1084, 1515, 1079, 1308, 32], [1050, 1520, 1051, 1326, 30], [1004, 1500, 986, 1305, 34],
    [1110, 1640, 1150, 1500, 28], [1070, 1600, 1100, 1440, 30], [1030, 1580, 1040, 1420, 28],
    [962, 1478, 945, 1336, 26], [927, 1452, 914, 1342, 21], [897, 1432, 889, 1362, 15], [873, 1416, 870, 1375, 12], [851, 1406, 842, 1372, 9],
    [828, 1394, 830, 1368, 7], [808, 1386, 812, 1364, 6]];
  // city: polygons (ref px), drawn after the monster
  const FARCITY = [[380, 2300, 410, 2268, 2400], [412, 2290, 440, 2258, 2400], [452, 2275, 520, 2262, 2400], [530, 2300, 560, 2290, 2400],
    [566, 2318, 600, 2300, 2400], [606, 2290, 640, 2280, 2400], [646, 2310, 690, 2296, 2400], [740, 2330, 780, 2320, 2400], [790, 2340, 830, 2326, 2400]];
  const BLD = [
    { p: [[0, 1886], [30, 1874], [62, 1880], [76, 1892], [80, 1902], [62, 2050], [46, 2205], [0, 2214]], lit: 1 },
    { p: [[124, 2036], [131, 2024], [160, 2016], [172, 2014], [186, 2028], [196, 2066], [188, 2140], [178, 2262], [86, 2262], [104, 2140]], lit: 1 },
    { p: [[219, 2106], [232, 2098], [258, 2096], [281, 2116], [274, 2190], [266, 2262], [206, 2262], [212, 2190]], lit: 1 },
    { p: [[352, 2152], [366, 2138], [374, 2134], [378, 2158], [366, 2250], [338, 2392], [318, 2392]], lit: 0 },
    { p: [[290, 2232], [306, 2205], [316, 2240], [300, 2330], [280, 2330]], lit: 0 },
    { p: [[0, 2214], [60, 2226], [140, 2268], [178, 2300], [190, 2326], [140, 2350], [110, 2410], [0, 2410]], lit: 0, slab: 1 },
    { p: [[150, 2300], [210, 2262], [270, 2262], [262, 2410], [130, 2410]], lit: 0 },
    { p: [[226, 2300], [252, 2258], [262, 2268], [254, 2410], [224, 2410]], lit: 0 },
    { p: [[262, 2290], [290, 2270], [312, 2290], [320, 2410], [258, 2410]], lit: 0 },
    // right foreground ruins
    { p: [[862, 2322], [872, 2318], [882, 2410], [858, 2410]], lit: 0 },
    { p: [[892, 2284], [904, 2278], [918, 2410], [890, 2410]], lit: 0 },
    { p: [[934, 2232], [940, 2220], [946, 2232], [958, 2410], [932, 2410]], lit: 0 },
    { p: [[994, 2286], [1010, 2276], [1130, 2276], [1140, 2296], [1140, 2410], [992, 2410]], lit: 0, block: 1 },
    { p: [[1084, 2056], [1136, 2050], [1140, 2066], [1130, 2096], [1150, 2410], [1100, 2410], [1094, 2100], [1082, 2088]], lit: 0, col: 1 },
    { p: [[1118, 1872], [1136, 1866], [1158, 1872], [1168, 2100], [1188, 2410], [1146, 2410], [1128, 2100]], lit: 0, col: 1 },
    { p: [[1158, 1884], [1210, 1876], [1210, 2410], [1190, 2410], [1172, 2100]], lit: 0 },
  ];
  const STARS = [ // x, y, size, kind (0 = 4pt, 1 = 8pt)
    [258, 38, 18, 0], [510, 42, 11, 0], [722, 35, 15, 0], [775, 85, 42, 1], [118, 18, 8, 0], [35, 148, 14, 0], [75, 158, 13, 0], [668, 150, 24, 0],
    [575, 203, 17, 0], [1105, 150, 30, 1], [640, 320, 11, 0], [890, 325, 58, 1], [473, 352, 19, 0], [742, 345, 6, 0], [30, 412, 8, 0], [820, 385, 6, 0],
    [915, 400, 7, 0], [997, 410, 11, 0], [1085, 470, 34, 1], [925, 545, 24, 0], [385, 553, 19, 0], [155, 513, 6, 0], [300, 620, 6, 0], [998, 712, 27, 0],
    [1150, 710, 9, 0], [670, 808, 14, 0], [890, 815, 30, 0], [345, 835, 9, 0], [1115, 840, 6, 0], [865, 845, 6, 0], [1140, 968, 18, 0], [845, 1020, 17, 0],
    [300, 1020, 8, 0], [110, 1058, 10, 0], [790, 1072, 8, 0], [930, 1140, 8, 0], [1060, 1095, 8, 0], [220, 1185, 12, 0], [1065, 1170, 10, 0],
    [430, 1402, 12, 0], [400, 1465, 11, 0], [388, 1515, 7, 0], [62, 1440, 8, 0], [708, 1571, 17, 0], [492, 2072, 15, 0], [1190, 1525, 7, 0],
    [560, 1330, 6, 0], [1180, 1110, 7, 0], [20, 1560, 7, 0], [990, 290, 5, 0], [480, 280, 5, 0], [1170, 360, 6, 0], [600, 1200, 6, 0],
    [1040, 610, 6, 0], [1170, 560, 5, 0], [1010, 180, 13, 0], [705, 478, 9, 0], [1128, 1392, 10, 0], [228, 1318, 7, 0], [150, 742, 5, 0], [636, 628, 5, 0], [1062, 318, 8, 0], [88, 1210, 6, 0], [262, 1700, 9, 0], [960, 760, 6, 0], [1050, 1010, 7, 0], [1150, 905, 5, 0], [985, 1200, 6, 0], [800, 940, 5, 0], [1110, 640, 9, 0]];

  // ---------- stroke helpers
  function grid() {
    const n = GW * GH, FX = new Float32Array(n), FY = new Float32Array(n), LL = new Float32Array(n), GG = new Float32Array(n), BB = new Float32Array(n), CC = new Float32Array(n);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const f = field(i * G, j * G), k = j * GW + i; FX[k] = f.fx; FY[k] = f.fy; LL[k] = f.L; GG[k] = f.g; BB[k] = f.B; CC[k] = f.core;
    }
    return { FX, FY, LL, GG, BB, CC };
  }
  function samp(A, x, y) {
    let gx = x / G, gy = y / G; gx = gx < 0 ? 0 : gx > GW - 1.001 ? GW - 1.001 : gx; gy = gy < 0 ? 0 : gy > GH - 1.001 ? GH - 1.001 : gy;
    const i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, k = j * GW + i;
    return (A[k] * (1 - fx) + A[k + 1] * fx) * (1 - fy) + (A[k + GW] * (1 - fx) + A[k + GW + 1] * fx) * fy;
  }
  // trace a streamline, returns flat [x,y,...]
  function trace(Fd, x, y, n, st, dir = 1) {
    const out = [x, y]; let px = 0, py = 0;
    for (let i = 1; i < n; i++) {
      let vx = samp(Fd.FX, x, y), vy = samp(Fd.FY, x, y); const l = Math.hypot(vx, vy) + 1e-6; vx /= l; vy /= l;
      if (i > 1 && vx * px + vy * py < 0) { vx = -vx; vy = -vy; }
      x += vx * st * dir; y += vy * st * dir; px = vx; py = vy; out.push(x, y);
    }
    return out;
  }
  // tapered brush polygon into a Path2D
  function brush(path, pts, w, head = 0.5) {
    const n = pts.length / 2; if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
      let tx = pts[i1 * 2] - pts[i0 * 2], ty = pts[i1 * 2 + 1] - pts[i0 * 2 + 1]; const l = Math.hypot(tx, ty) + 1e-6; tx /= l; ty /= l;
      const p = i / (n - 1), prof = Math.pow(Math.sin(Math.PI * Math.min(1, p * (1 - head * 0.3) + head * 0.15)), 0.7);
      const hw = w * 0.5 * (0.12 + 0.88 * prof);
      L.push(pts[i * 2] - ty * hw, pts[i * 2 + 1] + tx * hw); R.push(pts[i * 2] + ty * hw, pts[i * 2 + 1] - tx * hw);
    }
    path.moveTo(pts[0], pts[1]);
    for (let i = 0; i < n; i++) path.lineTo(L[i * 2], L[i * 2 + 1]);
    path.lineTo(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1]);
    for (let i = n - 1; i >= 0; i--) path.lineTo(R[i * 2], R[i * 2 + 1]);
    path.closePath();
  }
  // colour-bucketed batch: key -> {path, col}
  function Batch() { this.m = new Map(); }
  Batch.prototype.get = function (r, g, b) {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    let e = this.m.get(key); if (!e) { e = { p: new Path2D(), c: `rgb(${(r >> 2) * 4 + 2},${(g >> 2) * 4 + 2},${(b >> 2) * 4 + 2})` }; this.m.set(key, e); }
    return e.p;
  };
  Batch.prototype.fill = function (ctx) { for (const e of this.m.values()) { ctx.fillStyle = e.c; ctx.fill(e.p); } };
  Batch.prototype.stroke = function (ctx) { for (const e of this.m.values()) { ctx.strokeStyle = e.c; ctx.stroke(e.p); } };
  const tmp = [0, 0, 0];
  function colour(L, g, out) {
    ramp(L, out);
    if (g > 0.01) { const k = 0.55 + 0.7 * clamp(L); for (let c = 0; c < 3; c++) out[c] = lerp(out[c], Math.min(255, GOLD[c] * k), clamp(g)); }
    return out;
  }
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const pathOf = (pts) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  // closed path that curves through soft points and keeps sharp points as corners: [x, y, sharp]
  const organic = (pts) => {
    const p = new Path2D(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); if (a[2]) { p.lineTo(a[0], a[1]); p.lineTo(m[0], m[1]); } else p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
    p.closePath(); return p;
  };

  // ---------- SKY layer
  function paintSky(S, Fd, rnd) {
    const cv = GZ.canvas(RW * S, RH * S), c = cv.getContext('2d');
    // underpainting from the field grid
    const sm = GZ.canvas(GW, GH), sc = sm.getContext('2d'), id = sc.createImageData(GW, GH);
    for (let k = 0; k < GW * GH; k++) { colour(Fd.LL[k] - 0.11, Fd.GG[k] * 0.7, tmp); id.data[k * 4] = tmp[0]; id.data[k * 4 + 1] = tmp[1]; id.data[k * 4 + 2] = tmp[2]; id.data[k * 4 + 3] = 255; }
    sc.putImageData(id, 0, 0);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(sm, 0, 0, GW, GH, 0, 0, GW * G * S, GH * G * S);
    c.save(); c.scale(S, S);
    const passes = [
      // [count, width lo, width hi, steps lo, steps hi, step, dL, jitter, mode]
      [9000, 12, 18, 12, 20, 7, -0.02, 0.05, 0],
      [9000, 7, 11, 12, 20, 6, 0.0, 0.06, 0],
      [5200, 2.2, 3.8, 16, 28, 6, -0.27, 0.03, 1],  // ink grooves: long dark gaps between ribbons
      [6500, 4.5, 8, 12, 22, 6, 0.1, 0.045, 2],     // light ridges: broad flat ribbons
      [4500, 2, 4, 12, 22, 6, 0.2, 0.04, 3],        // breath / spiral bright filaments
    ];
    for (const [cnt, w0, w1, n0, n1, st, dL, jit, mode] of passes) {
      for (let sub = 0; sub < 2; sub++) {
        const bt = new Batch();
        for (let i = 0; i < cnt / 2; i++) {
          const x = rnd() * (RW + 40) - 20, y = rnd() * (RH + 40) - 20;
          const L0 = samp(Fd.LL, x, y), B = samp(Fd.BB, x, y);
          if (mode === 3 && rnd() > Math.max(B * (0.3 + samp(Fd.CC, x, y)), smooth(0.62, 0.8, L0) * 0.8)) continue;
          if (mode === 2 && rnd() > 0.35 + L0) continue;
          if (mode === 1 && rnd() > 0.55 + B * 0.6) continue;
          const fc = Math.exp(-(((x - 640) / 190) ** 2) - (((y - 1850) / 520) ** 2)), n = Math.max(4, ((n0 + ((rnd() * (n1 - n0 + 1)) | 0)) * (1 - 0.5 * fc)) | 0);
          const stp = st * (B > 0.4 ? 1.25 : 1);
          const pts = trace(Fd, x, y, n, stp, rnd() < 0.5 ? 1 : -1);
          const mx = pts[(n >> 1) * 2], my = pts[(n >> 1) * 2 + 1];
          const L = samp(Fd.LL, mx, my) + dL + (rnd() - 0.5) * 2 * (jit + 0.05 * fc), g = samp(Fd.GG, mx, my) * (mode === 1 ? 0.5 : 1);
          colour(L, g, tmp);
          brush(bt.get(tmp[0], tmp[1], tmp[2]), pts, w0 + rnd() * (w1 - w0), rnd());
        }
        bt.fill(c);
      }
    }
    // breath: long sinuous flame ribbons (light) and ink seams (dark) so the plume reads as liquid fire, not streaks
    {
      const lt = new Batch(), dk = new Batch(), hi = new Batch();
      for (let i = 0; i < 6400; i++) {
        const x = rnd() * 980 - 40, y = rnd() * 1500 - 60, B = samp(Fd.BB, x, y);
        if (B < 0.3 || rnd() > B) continue;
        const pts = trace(Fd, x, y, 12 + ((rnd() * 18) | 0), 6, rnd() < 0.5 ? 1 : -1), n = pts.length / 2;
        const ph = rnd() * 6, am = 4 + rnd() * 8, fq = 0.22 + rnd() * 0.22;
        for (let k = 1; k < n - 1; k++) {
          const tx = pts[k * 2 + 2] - pts[k * 2 - 2], ty = pts[k * 2 + 3] - pts[k * 2 - 1], l = Math.hypot(tx, ty) + 1e-6, o = am * Math.sin(k * fq + ph);
          pts[k * 2] += -ty / l * o; pts[k * 2 + 1] += tx / l * o;
        }
        const L = samp(Fd.LL, x, y), cr = samp(Fd.CC, x, y), u = rnd();
        if (u < 0.62) { colour(L + 0.02 + rnd() * 0.12, 0, tmp); brush(lt.get(tmp[0], tmp[1], tmp[2]), pts, 6 + rnd() * 13 * (1 - cr * 0.3), rnd()); }
        else if (u < 0.8) { colour(L - 0.15 - rnd() * 0.1, 0, tmp); brush(dk.get(tmp[0], tmp[1], tmp[2]), pts, 1.4 + rnd() * 2.2, rnd()); }
        else if (cr > 0.2 || rnd() < 0.35) { colour(Math.min(0.95, L + 0.12 + cr * 0.12), 0, tmp); brush(hi.get(tmp[0], tmp[1], tmp[2]), pts, 1.8 + rnd() * 3, rnd()); }
      }
      dk.fill(c); lt.fill(c); hi.fill(c);
      // flame tongues: lobed licks that peel off the plume edge and hook outward (volume + violence at the silhouette)
      {
        const tl = new Batch(), seam = new Path2D(), rim = new Path2D();
        for (let i = 0; i < 9000; i++) {
          const x = rnd() * 980 - 40, y = rnd() * 1420 - 60, B = samp(Fd.BB, x, y);
          if (B < 0.15 || B > 0.6 || rnd() > 0.18) continue;
          let gx = samp(Fd.BB, x + 6, y) - samp(Fd.BB, x - 6, y), gy = samp(Fd.BB, x, y + 6) - samp(Fd.BB, x, y - 6); const gl = Math.hypot(gx, gy) + 1e-6; gx /= gl; gy /= gl;
          let fx = samp(Fd.FX, x, y), fy = samp(Fd.FY, x, y); const fl = Math.hypot(fx, fy) + 1e-6; fx /= fl; fy /= fl; if (fy > 0) { fx = -fx; fy = -fy; }
          const ox = -gx, oy = -gy, len = (26 + rnd() * 60) * (0.7 + 0.5 * smooth(1300, 300, y)), wd = len * (0.18 + rnd() * 0.14), hook = (0.15 + rnd() * 0.35) * len, P = [];
          const cen = (f) => [x + fx * len * f + ox * hook * f * f, y + fy * len * f + oy * hook * f * f];
          for (let k = 0; k <= 10; k++) { const f = k / 10, [cx, cy] = cen(f), w = wd * Math.pow(1 - f, 0.9) * (0.75 + 0.5 * Math.sin(Math.PI * Math.min(1, f * 1.6))) * (1 + 0.15 * Math.sin(k * 2.3 + i)); P.push([cx - fy * w, cy + fx * w]); }
          for (let k = 10; k >= 0; k--) { const f = k / 10, [cx, cy] = cen(f), w = wd * Math.pow(1 - f, 0.9) * (0.75 + 0.5 * Math.sin(Math.PI * Math.min(1, f * 1.6))); P.push([cx + fy * w, cy - fx * w]); }
          const Lt = samp(Fd.LL, x, y) + 0.02 + rnd() * 0.12; colour(Lt, 0, tmp);
          const tp = tl.get(tmp[0], tmp[1], tmp[2]); tp.moveTo(P[0][0], P[0][1]); for (let k = 1; k < P.length; k++) tp.lineTo(P[k][0], P[k][1]); tp.closePath();
          const sp = []; for (let k = 1; k <= 8; k++) { const f = k / 10, [cx, cy] = cen(f); sp.push(cx + ox * wd * 0.25, cy + oy * wd * 0.25); } brush(seam, sp, 1.2 + rnd() * 1.6, 0.2);
          const rp = []; for (let k = 0; k <= 8; k++) { const q = P[20 - k]; rp.push(q[0], q[1]); } brush(rim, rp, 1.2 + rnd() * 1.4, 0.3);
        }
        tl.fill(c); c.fillStyle = 'rgba(6,40,70,0.35)'; c.fill(seam); c.fillStyle = 'rgba(4,30,54,0.42)'; c.fill(rim);
      }
      // spray: droplets and flicks thrown off the frayed edge
      const sp = new Batch();
      for (let i = 0; i < 26000; i++) {
        const x = rnd() * 950 - 20, y = rnd() * 1420, B = samp(Fd.BB, x, y);
        if (B < 0.02 || B > 0.5 || rnd() > 0.5) continue;
        const a = Math.atan2(samp(Fd.FY, x, y), samp(Fd.FX, x, y)), r = 1.2 + rnd() * rnd() * 6, e = 0.35 + rnd() * 0.5;
        colour(0.6 + rnd() * 0.2 - 0.18 * smooth(900, 100, y), 0, tmp);
        const p = sp.get(tmp[0], tmp[1], tmp[2]);
        if (rnd() < 0.9) { p.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); p.ellipse(x, y, r, r * e, a, 0, TAU); }
        else { const l = 6 + rnd() * 14, b = (rnd() - 0.5) * 1.2; brush(p, [x, y, x + Math.cos(a + b * 0.5) * l * 0.5, y + Math.sin(a + b * 0.5) * l * 0.5, x + Math.cos(a + b) * l, y + Math.sin(a + b) * l], 1.2 + rnd() * 2.4, 0.2); }
      }
      sp.fill(c);
    }
    // luminous falloff: breath core bloom + spiral bloom (screen)
    c.globalCompositeOperation = 'screen';
    GZ.glow(c, 600, 1120, 260, 'rgba(90,190,240,0.35)'); GZ.glow(c, 690, 1290, 160, 'rgba(160,225,255,0.45)'); GZ.glow(c, 700, 1350, 70, 'rgba(200,240,255,0.22)');
    GZ.glow(c, 392, 1978, 330, 'rgba(70,170,230,0.28)'); GZ.glow(c, 392, 1978, 150, 'rgba(150,220,255,0.22)');
    GZ.glow(c, 1192, 150, 230, 'rgba(160,130,70,0.18)'); GZ.glow(c, 25, 665, 70, 'rgba(170,140,80,0.16)'); GZ.glow(c, 120, 1025, 70, 'rgba(170,140,80,0.14)');
    c.globalCompositeOperation = 'source-over';
    c.restore();
    return cv;
  }

  // ---------- FOREGROUND layer: monster, plates, city (r1: painted hide, articulated head/arm, flame plates, perspective city)
  const INK = '#03141f';
  const ARMP = [[763, 1498], [757, 1533], [746, 1567], [738, 1600], [734, 1640], [727, 1673], [713, 1712], [698, 1740], [681, 1772], [665, 1800],
    [655, 1818], [650, 1836], [658, 1846], [668, 1842], [674, 1852], [686, 1848], [692, 1858], [704, 1852], [712, 1860], [722, 1851], [728, 1838],
    [730, 1818], [738, 1801], [752, 1787], [770, 1772], [788, 1755], [812, 1738], [830, 1708], [840, 1668], [838, 1625], [828, 1580], [810, 1540], [788, 1508]];
  // thicker forearm: push the lit outer edge out and the inner edge in toward the chest
  for (let i = 1; i <= 10; i++) ARMP[i][0] -= 12 * Math.sin(Math.PI * i / 11) + 2;
  for (let i = 23; i <= 31; i++) ARMP[i][0] += 6 * Math.sin(Math.PI * (i - 22) / 10);
  const CLAWS = [[652, 1838, 645, 1858, 8], [670, 1846, 667, 1866, 8], [689, 1854, 690, 1873, 8], [708, 1857, 713, 1874, 7], [725, 1846, 733, 1862, 6]];
  // head in profile, jaws open up-left (measured on the reference). [x, y, sharp]
  const HEADP = [[727, 1369, 1], [731, 1360], [741, 1354], [753, 1357], [767, 1362], [785, 1370], [805, 1379], [827, 1386], [852, 1396], [866, 1432], [852, 1472], [816, 1502],
    [776, 1513], [764, 1506], [757, 1493], [742, 1483], [726, 1479], [712, 1473], [704, 1463], [700, 1452, 1], [712, 1445], [724, 1439], [737, 1433], [751, 1428, 1], [745, 1411], [740, 1395], [734, 1381]];
  const CAV = [[728, 1372, 1], [734, 1383], [739, 1396], [744, 1410], [749, 1422], [753, 1428, 1], [739, 1434], [725, 1440], [712, 1447], [702, 1452, 1], [705, 1432], [712, 1408], [719, 1388]];
  const SPB = [[828, 1380], [866, 1378], [910, 1398], [960, 1446], [1000, 1515], [1032, 1610], [1050, 1736], [1094, 1800], [1150, 1840], [1215, 1866]];
  const plateTris = [];
  const ZONE2 = [[820, 1392], [860, 1350], [920, 1328], [990, 1298], [1060, 1288], [1120, 1250], [1240, 1270], [1240, 1890], [1215, 1880], [1150, 1854],
    [1100, 1814], [1060, 1746], [1030, 1656], [1000, 1566], [960, 1496], [915, 1446], [870, 1416]];   // [rx, ry, tx, ty, hw] for the glow layers

  // bumpy scaled outline: resample a polygon and push each sample outward by scallop bumps
  function roughen(poly, step, amp, seed, from = 0, to = poly.length) {
    const out = [], n = poly.length; let s = seed;
    let area = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = area > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (i < from || i >= to || l < step) { out.push([a[0], a[1]]); continue; }
      const m = Math.max(1, Math.round(l / step)), nx = dy / l * sg, ny = -dx / l * sg;
      for (let k = 0; k < m; k++) { const f = k / m, bump = amp * Math.pow(Math.abs(Math.sin(Math.PI * (s + f * m))), 0.6) * (0.6 + 0.8 * Math.abs(noise(a[0] / 20 + f, a[1] / 20)));
        out.push([a[0] + dx * f - nx * bump, a[1] + dy * f - ny * bump]); }
      s += m;
    }
    return out;
  }
  // a tapered stroke from a list of points with a given colour batch
  const strokeIn = (bt, rgb, pts, w, head) => brush(bt.get(rgb[0], rgb[1], rgb[2]), pts, w, head);
  // smooth closed Path2D through points
  const smoothPath = (pts, k = 0.5) => {
    const p = new Path2D(), n = pts.length; p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3, p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3, p2[0], p2[1]); }
    p.closePath(); return p;
  };
  const edgeX = (poly, y, side) => { let best = side < 0 ? 1e9 : -1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); if (side < 0 ? x < best : x > best) best = x; } } return best; };
  // ink contour drawn as overlapping tapered strokes (painterly line weight instead of a uniform outline)
  function inkContour(c, pts, w, rnd, closed = true) {
    const p = new Path2D(), n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n], seg = [];
      for (let k = 0; k <= 6; k++) { const f = k / 6; seg.push(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); }
      brush(p, seg, w * (0.75 + rnd() * 0.6), 0.5);
    }
    c.fillStyle = INK; c.fill(p);
  }
  // painterly hide: fold bands (dark ink crease + lit lip above), mid-tone dabs and small scale marks, all clipped to poly
  function paintHide(c, rnd, poly, Lf, box, opt) {
    const [x0, y0, x1, y1] = box, mid = new Batch(), lip = new Batch(), ink = new Batch(), dab = new Batch();
    // 1) mid-tone dabs (broad, short, following the wrap direction)
    for (let i = 0; i < opt.dabs; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (!inPoly(poly, x, y)) continue;
      const a = opt.ang(x, y) + (rnd() - 0.5) * 0.5, l = 8 + rnd() * 16, pts = [];
      for (let k = 0; k < 4; k++) pts.push(x + Math.cos(a) * l * k / 3, y + Math.sin(a) * l * k / 3 + Math.sin(k + x) * 0.8);
      ramp(Lf(x, y) + (rnd() - 0.5) * 0.07, tmp); strokeIn(mid, tmp, pts, 5 + rnd() * 7, rnd());
    }
    // 2) fold bands
    for (let yr = y0; yr < y1; yr += opt.gap * (0.5 + rnd() * 1.0)) {
      let x = x0 - rnd() * 30;
      while (x < x1) {
        const len = (22 + rnd() * 60) * opt.ls, pts = [], lp = [], sh = [];
        const ph = rnd() * 6, amp = 1.5 + rnd() * 3.5, fr = 9 + rnd() * 10, tilt = 0.35 * noise(x / 60 + 3, yr / 60) + (rnd() - 0.5) * 0.15;
        for (let k = 0; k <= 12; k++) {
          const xx = x + len * k / 12, yy = yr + opt.bow(xx, yr) + amp * Math.sin(xx / fr + ph) + 4 * noise(xx / 28, yr / 28) + (xx - x) * tilt;
          pts.push(xx, yy); lp.push(xx, yy - 3.2); sh.push(xx, yy + 3);
        }
        const mx = pts[12], my = pts[13];
        if (opt.skip && rnd() < opt.skip) { x += len * (0.55 + rnd() * 0.6); continue; }
        if (inPoly(poly, mx, my)) {
          const L = Lf(mx, my);
          if (rnd() < 0.6) { ramp(L - 0.06, tmp); strokeIn(mid, tmp, sh, 3 + rnd() * 3, rnd()); }
          if (rnd() < 0.6) { ramp(L + 0.05 + rnd() * 0.05, tmp); strokeIn(lip, tmp, opt.ridge ? lp.map((v, i) => i & 1 ? v - 1.5 : v) : lp, (opt.ridge ? 4.5 + rnd() * 5 : 2.4 + rnd() * 3.4), rnd()); }
          if (rnd() < (opt.ridge ? 0.55 : 0.85)) { ramp(L - 0.16 - rnd() * 0.06, tmp); strokeIn(ink, tmp, opt.ridge ? pts.slice(0, 18 + 2 * ((rnd() * 4) | 0)) : pts, (1.3 + rnd() * 2) * opt.iw, rnd()); }
        }
        x += len * (0.55 + rnd() * 0.6);
      }
    }
    // 2b) curling wrap strokes: the hide carries the same swirling brush language as the sky (dark creases, lit ridges, mid dabs)
    for (let i = 0; i < (opt.flow || 0); i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (!inPoly(poly, x, y)) continue;
      let a = opt.ang(x, y) + (opt.curl || 0.9) * noise(x / 70 + 9, y / 70 + 3) + (rnd() < 0.5 ? 0 : Math.PI), px = x, py = y; const pts = [x, y];
      const n = 4 + ((rnd() * 6) | 0), sl = 3.5 + rnd() * 3, bend = (rnd() - 0.5) * 0.4;
      for (let k = 1; k < n; k++) { a += bend + 0.2 * noise(px / 26 + 1, py / 26); px += Math.cos(a) * sl; py += Math.sin(a) * sl; pts.push(px, py); }
      const u = rnd(), L = Lf(x, y);
      if (u < 0.16) { ramp(L - 0.12 - rnd() * 0.06, tmp); strokeIn(ink, tmp, pts, (1.2 + rnd() * 1.3) * opt.iw, rnd()); }
      else if (u < 0.6) { ramp(L + 0.04 + rnd() * 0.07, tmp); strokeIn(lip, tmp, pts, 2.6 + rnd() * 3.6, rnd()); }
      else { ramp(L + (rnd() - 0.6) * 0.08, tmp); strokeIn(mid, tmp, pts, 4.5 + rnd() * 5, rnd()); }
    }
    // 3) scale marks: small lens-shaped dabs with a dark underside
    for (let i = 0; i < opt.scales; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (!inPoly(poly, x, y)) continue;
      const a = opt.ang(x, y) + (rnd() - 0.5) * 0.4, r = 2.5 + rnd() * 4.5, ca = Math.cos(a), sa = Math.sin(a);
      const L = Lf(x, y);
      ramp(L + 0.035 + rnd() * 0.03, tmp); strokeIn(dab, tmp, [x - ca * r, y - sa * r, x, y - 0.6, x + ca * r, y + sa * r], 2.2 + rnd() * 1.6, 0.5);
      ramp(L - 0.11, tmp); strokeIn(ink, tmp, [x - ca * r * 0.9, y - sa * r * 0.9 + 1.6, x, y + 2.4, x + ca * r * 0.9, y + sa * r * 0.9 + 1.6], 1 + rnd() * 0.8, 0.5);
    }
    mid.fill(c); dab.fill(c); lip.fill(c); ink.fill(c);
  }

  function paintFG(S, Fd, rnd) {
    const cv = GZ.canvas(RW * S, RH * S), c = cv.getContext('2d');
    c.save(); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round';
    paintFarCity(c, rnd);

    // ===== body column
    const BODYR = roughen(BODY, 10, 3.5, 0.1, 13, BODY.length), body = pathOf(BODYR);
    c.save(); c.clip(body);
    { const gr = c.createLinearGradient(0, 1380, 0, 2410); gr.addColorStop(0, '#0d3049'); gr.addColorStop(0.3, '#103854'); gr.addColorStop(0.62, '#164c6c'); gr.addColorStop(1, '#24648c'); c.fillStyle = gr; c.fillRect(600, 1370, 620, 1050); }
    const bodyL = (x, y) => {
      const le = edgeX(BODY, y, -1);
      return 0.255 + 0.1 * smooth(1700, 2300, y) + 0.12 * smooth(1800, 2330, y) * smooth(1080, 720, x) + 0.06 * fbm(x / 70, y / 70, 3)
        + 0.12 * Math.exp(-Math.max(0, x - le) / 40) + 0.06 * Math.exp(-(((x - le - 85) / 70) ** 2)) - 0.07 * smooth(120, 330, x - le)                               // rim light from breath / spiral
        + 0.07 * Math.exp(-(((x - 900) / 110) ** 2) - (((y - 1640) / 120) ** 2))    // shoulder roll
        + 0.05 * Math.exp(-(((x - 860) / 120) ** 2) - (((y - 1990) / 110) ** 2))    // belly roll
        - 0.07 * smooth(160, 0, Math.abs((x - 1000) - (y - 1560) * 0.42) * 0.9) * smooth(2050, 1800, y)  // shadow under the plates
        - 0.05 * Math.exp(-(((x - 820) / 60) ** 2) - (((y - 1525) / 40) ** 2));    // under-jaw shadow
    };
    paintHide(c, rnd, BODYR, bodyL, [690, 1380, 1215, 2410], {
      dabs: 4200, scales: 300, gap: 9, iw: 1.7, ls: 0.75, skip: 0.12, flow: 350, curl: 0.8, ridge: 1,
      ang: (x, y) => 0.18 * Math.sin(y / 90) + (x - 960) / 900 + 0.35 * Math.sin((x + y) / 160) + 0.75 * smooth(1880, 1560, y),   // strokes run down the back, then wrap the belly
      bow: (x, y) => 0.0011 * (x - 990) ** 2 * (1 - 0.35 * smooth(1500, 2300, y)) + 0.62 * (x - 800) * smooth(1900, 1560, y),
    });
    // anatomy: shoulder roll, pectoral and belly folds as weighted ink with a lit lip above (gives the column mass instead of a flat tube)
    { const ink = new Path2D(), lit = new Path2D();
      for (const L of [[[786, 1522], [830, 1540], [878, 1568], [918, 1606], [944, 1652]], [[798, 1700], [836, 1688], [872, 1694], [902, 1712]],
        [[806, 1846], [848, 1834], [892, 1842], [930, 1866]], [[776, 1990], [826, 1972], [884, 1978], [936, 2004]], [[752, 2140], [806, 2126], [868, 2132]],
        [[880, 1610], [872, 1650], [860, 1690]]]) {
        const a = [], b = []; for (const q of L) { a.push(q[0], q[1]); b.push(q[0], q[1] - 4); }
        brush(ink, a, 3.2, 0.5); brush(lit, b, 3.6, 0.5); }
      ramp(0.5, tmp); c.fillStyle = `rgba(${tmp[0] | 0},${tmp[1] | 0},${tmp[2] | 0},0.55)`; c.fill(lit); c.fillStyle = 'rgba(3,20,31,0.85)'; c.fill(ink); }
    // form shading: deep shadow down the right flank under the dorsal ridge + soft glow on the lower left from the spiral
    { const g = c.createLinearGradient(780, 0, 1215, 0); g.addColorStop(0, 'rgba(1,10,20,0)'); g.addColorStop(0.5, 'rgba(1,10,20,0.1)'); g.addColorStop(1, 'rgba(1,10,20,0.22)'); c.fillStyle = g; c.fillRect(690, 1380, 530, 1040); }
    c.globalCompositeOperation = 'screen';
    GZ.glow(c, 640, 2130, 260, 'rgba(70,170,230,0.32)'); GZ.glow(c, 760, 1680, 160, 'rgba(70,170,230,0.15)');
    c.filter = 'blur(5px)'; c.strokeStyle = 'rgba(90,200,250,0.35)'; c.lineWidth = 10; c.stroke(body); c.filter = 'none';
    c.globalCompositeOperation = 'source-over';
    c.restore();
    { const bl = BODYR.slice(BODYR.findIndex(q => q[0] < 700 && q[1] > 2400)).concat([BODYR[0]]), lp = new Path2D(); bl.forEach((q, i) => i ? lp.lineTo(q[0], q[1]) : lp.moveTo(q[0], q[1]));
      c.strokeStyle = INK; c.lineWidth = 2.8; c.lineJoin = 'round'; c.stroke(lp); inkContour(c, bl, 3, rnd, false); }

    // ===== dorsal fire bed + flame plates (behind the head, in front of the back)
    paintPlates(c, rnd);

    // ===== arm cast shadow on the torso
    { c.save(); c.clip(body); c.filter = 'blur(10px)'; c.fillStyle = 'rgba(2,14,26,0.45)'; c.translate(16, 10); c.fill(smoothPath(ARMP, 0.3)); c.restore(); c.filter = 'none'; }
    // ===== arm (in front of the body)
    const ARMR = roughen(ARMP, 8, 4.2, 0.3, 0, 11), arm = smoothPath(ARMR, 0.3);
    c.save(); c.clip(arm);
    { const g = c.createLinearGradient(700, 1700, 850, 1640); g.addColorStop(0, '#22618c'); g.addColorStop(0.45, '#174b6e'); g.addColorStop(1, '#0d3350'); c.fillStyle = g; c.fillRect(640, 1510, 210, 360); }
    const armL = (x, y) => { const le = edgeX(ARMR, y, -1); return 0.32 + 0.17 * Math.exp(-Math.max(0, x - le) / 26) - 0.08 * smooth(780, 840, x) + 0.05 * fbm(x / 40, y / 40, 2); };
    paintHide(c, rnd, ARMR, armL, [640, 1515, 845, 1870], {
      dabs: 1100, scales: 420, gap: 15, iw: 1, ls: 0.6, skip: 0.35, flow: 900, curl: 0.5,
      ang: (x, y) => -0.55 + (y - 1700) / 600,                                    // wraps across the forearm axis
      bow: (x, y) => 0.3 * (x - 760) - 0.0022 * (x - 760) ** 2,
    });
    // elbow / wrist creases + finger joints
    { const p = new Path2D(), lp = new Path2D(); // forearm rings + elbow fold + knuckles (ink with a lit lip)
      for (const L of [[[738, 1632], [766, 1622], [798, 1626], [826, 1640]], [[730, 1676], [762, 1670], [796, 1678], [822, 1694]], [[716, 1712], [748, 1712], [780, 1722], [804, 1736]],
        [[700, 1744], [728, 1746], [758, 1756]], [[684, 1774], [708, 1778], [734, 1790]], [[668, 1806], [688, 1812], [708, 1822]],
        [[668, 1826], [672, 1840]], [[688, 1832], [690, 1848]], [[708, 1834], [708, 1850]], [[772, 1530], [796, 1560], [812, 1600], [818, 1640]]]) {
        const a = [], b = []; for (const q of L) { a.push(q[0], q[1]); b.push(q[0], q[1] - 3.5); } brush(p, a, 2.8, 0.5); brush(lp, b, 3, 0.5); }
      ramp(0.56, tmp); c.fillStyle = `rgba(${tmp[0] | 0},${tmp[1] | 0},${tmp[2] | 0},0.6)`; c.fill(lp); c.fillStyle = INK; c.fill(p); }
    { const rim = new Path2D(); ARMR.slice(0, ARMR.findIndex(q => q[1] > 1799) + 1).forEach((q, i) => i ? rim.lineTo(q[0], q[1]) : rim.moveTo(q[0], q[1]));
      c.globalCompositeOperation = 'screen'; c.filter = 'blur(4px)'; c.strokeStyle = 'rgba(120,215,255,0.7)'; c.lineWidth = 16; c.stroke(rim); c.filter = 'none'; c.globalCompositeOperation = 'source-over'; }
    c.restore();
    { // outline: heavy ink on the lit outer edge, a soft thin seam where the arm crosses the body
      const k = ARMR.findIndex(q => q[0] > 785 && q[1] > 1745), outer = ARMR.slice(0, k + 1), inner = ARMR.slice(k);
      inkContour(c, outer, 3.6, rnd, false);
      c.save(); c.strokeStyle = 'rgba(3,20,31,0.45)'; c.lineWidth = 1.6; c.beginPath(); inner.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); c.restore();
    }
    // claws: dark horn with a pale lit edge
    for (const [bx, by, tx, ty, w] of CLAWS) {
      const dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, p = new Path2D();
      p.moveTo(bx - nx * w * 0.5 - dx * 0.15, by - ny * w * 0.5 - dy * 0.15);
      p.quadraticCurveTo(bx + dx * 0.55 - nx * w * 0.6, by + dy * 0.55 - ny * w * 0.6, tx, ty);
      p.quadraticCurveTo(bx + dx * 0.45 + nx * w * 0.15, by + dy * 0.45 + ny * w * 0.15, bx + nx * w * 0.5 - dx * 0.15, by + ny * w * 0.5 - dy * 0.15); p.closePath();
      c.fillStyle = '#0b2a40'; c.fill(p); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke(p);
      c.strokeStyle = 'rgba(150,215,245,0.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx - nx * w * 0.3, by - ny * w * 0.3); c.quadraticCurveTo(bx + dx * 0.5 - nx * w * 0.45, by + dy * 0.5 - ny * w * 0.45, tx - dx * 0.08, ty - dy * 0.08); c.stroke();
    }

    // ===== head: roaring open jaw tilted up into the beam (scaled about the throat for a heavier skull)
    c.save(); c.translate(800, 1470); c.scale(1.14, 1.14); c.translate(-800, -1470); paintHead(c, rnd); c.restore();

    paintCity(c, rnd);
    // ground haze: keep the spiral glow alive between the towers, darken only the very bottom
    { const gr = c.createLinearGradient(0, 2330, 0, 2400); gr.addColorStop(0, 'rgba(2,14,26,0)'); gr.addColorStop(1, 'rgba(2,14,26,0.45)'); c.fillStyle = gr; c.fillRect(0, 2330, 1200, 70); }
    c.restore();
    return cv;
  }

  function paintHead(c, rnd) {
    const head = organic(HEADP);
    c.save(); c.clip(head);
    { const g = c.createLinearGradient(712, 1380, 850, 1470); g.addColorStop(0, '#2f78a4'); g.addColorStop(0.35, '#1f5c84'); g.addColorStop(1, '#154466'); c.fillStyle = g; c.fillRect(690, 1340, 190, 180); }
    const headL = (x, y) => 0.37 + 0.13 * Math.exp(-(((x - 732) / 34) ** 2) - (((y - 1410) / 70) ** 2)) + 0.06 * smooth(1400, 1356, y) - 0.05 * smooth(790, 860, x) + 0.05 * fbm(x / 25, y / 25, 2);
    paintHide(c, rnd, HEADP, headL, [695, 1345, 870, 1515], {
      dabs: 900, scales: 520, gap: 16, iw: 0.8, ls: 0.4, skip: 0.5, flow: 700, curl: 0.6,
      ang: (x, y) => -0.35 + (y - 1400) / 260,
      bow: (x, y) => -0.45 * (x - 760),
    });
    // modelling: brow/cheek mass lit from the breath, shadow under the skull
    c.globalCompositeOperation = 'screen';
    GZ.glow(c, 724, 1408, 64, 'rgba(150,225,255,0.5)'); GZ.glow(c, 770, 1378, 34, 'rgba(90,170,220,0.25)');
    c.globalCompositeOperation = 'source-over';
    GZ.glow(c, 830, 1460, 60, 'rgba(2,14,26,0.6)', 0.6);
    c.restore();
    // open mouth: flat-ink cel cavity - deep throat at the hinge, palate band, tongue. The hot breath core is painted live in mouthDraw.
    const cav = organic(CAV);
    c.fillStyle = '#0a2944'; c.fill(cav);
    c.save(); c.clip(cav);
    { const pal = new Path2D(); pal.moveTo(724, 1366); pal.quadraticCurveTo(744, 1394, 756, 1430); pal.lineTo(745, 1431); pal.quadraticCurveTo(735, 1402, 716, 1380); pal.closePath();
      c.fillStyle = '#174a72'; c.fill(pal);
      const rp = new Path2D(); for (let k = 0; k < 5; k++) { const f = (k + 0.5) / 5, x = lerp(729, 750, f), y = lerp(1376, 1424, f); brush(rp, [x - 1, y + 1, x - 6, y + 4, x - 10, y + 5], 1.6, 0.4); }
      c.fillStyle = INK; c.fill(rp);
      const tg = new Path2D(); tg.moveTo(758, 1432); tg.bezierCurveTo(746, 1420, 726, 1428, 712, 1442); tg.quadraticCurveTo(708, 1448, 704, 1454); tg.lineTo(760, 1446); tg.closePath();
      c.fillStyle = '#123f63'; c.fill(tg); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(tg);
      const tl = new Path2D(); brush(tl, [752, 1428, 740, 1424, 728, 1430, 716, 1440], 2, 0.4); c.fillStyle = '#3e8fc0'; c.fill(tl);
      const th = new Path2D(); th.ellipse(752, 1424, 8, 15, -0.5, 0, TAU); c.fillStyle = '#03111d'; c.fill(th); }
    c.restore();
    // teeth: irregular, ink-outlined, backlit on the flank facing the throat core (silhouettes against the breath)
    { const T = buildTeeth(); c.fillStyle = '#a9cfe2'; c.fill(T.body); c.strokeStyle = INK; c.lineWidth = 1.25; c.stroke(T.body); c.fillStyle = 'rgba(225,248,255,0.55)'; c.fill(T.rim); }
    // ink: weighted lip lines on both jaws (front of the mouth left open), skull top, jaw underside and throat
    { const pts = (L) => { const a = []; for (const q of L) a.push(q[0], q[1]); return a; }, p = new Path2D();
      brush(p, pts(CAV.slice(0, 6)), 3, 0.3); brush(p, pts(CAV.slice(5, 10)), 3, 0.7);
      c.fillStyle = INK; c.fill(p); }
    inkContour(c, HEADP.slice(0, 9), 3.4, rnd, false);
    inkContour(c, HEADP.slice(12, 20), 3.2, rnd, false);
    const p = new Path2D();
    for (const L of [
      [[745, 1362], [760, 1368], [778, 1378], [796, 1382]],   // brow ridge
      [[736, 1364], [742, 1370]],                             // nostril
      [[760, 1428], [782, 1434], [806, 1448], [826, 1470]],   // jaw hinge to cheek
      [[714, 1462], [740, 1464], [762, 1462], [784, 1470]],   // lower jaw underside
      [[744, 1488], [762, 1488], [784, 1496]], [[758, 1502], [778, 1505], [800, 1514]], // throat folds
      [[796, 1404], [814, 1414], [830, 1432]], [[818, 1390], [834, 1402], [848, 1420]], [[770, 1404], [784, 1412]],
    ]) { const pts = []; for (const q of L) pts.push(q[0], q[1]); brush(p, pts, 2.3, 0.5); }
    c.fillStyle = INK; c.fill(p);
    // eye: small, deep-set under the brow, with a cyan glint
    c.fillStyle = '#020c14'; c.beginPath(); c.ellipse(784, 1390, 6.5, 3, 0.45, 0, TAU); c.fill();
    c.fillStyle = 'rgba(170,235,255,0.9)'; c.beginPath(); c.arc(782, 1389, 1.3, 0, TAU); c.fill();
    // small dorsal spikes on the back of the skull / nape (dark blue, ink-edged); geometry kept for the live breath rim light
    const sp = new Path2D(); SPK.length = 0;
    for (let i = 0; i < 10; i++) { const f = i / 9, x = lerp(790, 866, f) + rnd() * 3, y = lerp(1374, 1400, f), h = 6 + 10 * f + rnd() * 4, a = -1.25 + 0.3 * f;
      SPK.push([x, y, h, a]);
      sp.moveTo(x - 4, y + 2); sp.quadraticCurveTo(x + Math.cos(a) * h * 0.4 - 2, y + Math.sin(a) * h * 0.5, x + Math.cos(a) * h, y + Math.sin(a) * h); sp.quadraticCurveTo(x + 2, y - 1, x + 5, y + 2); sp.closePath(); }
    c.fillStyle = '#1d5b84'; c.fill(sp); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke(sp);
  }

  // flame plate: one bold blade drawn like a leaping flame. A hand-placed template (u along the axis, v across in half-widths, sharp tip flag):
  // a calmer leading edge with two flicks, a ragged trailing edge with three long tongues, all swept toward the tip.
  const BLADE = [[0, -1], [0.1, -1.06], [0.24, -0.98], [0.42, -1.3, 1], [0.36, -0.72], [0.5, -0.66], [0.68, -0.9, 1], [0.62, -0.42], [0.78, -0.3], [0.9, -0.14],
    [1, 0, 1],
    [0.88, 0.12], [0.76, 0.26], [0.87, 0.64, 1], [0.66, 0.4], [0.56, 0.52], [0.7, 1.04, 1], [0.44, 0.7], [0.34, 0.84], [0.44, 1.46, 1], [0.2, 0.98], [0.08, 1.06], [0, 1]];
  function plateShape(rx, ry, tx, ty, hw, rnd) {
    const dx = tx - rx, dy = ty - ry, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    const bend = (0.05 + rnd() * 0.1) * l * (rnd() < 0.75 ? 1 : -1), wob = rnd() * 6, flip = rnd() < 0.3 ? -1 : 1;
    const cen = (f) => { const b = 4 * f * (1 - f) * bend * (0.6 + 0.6 * f) + Math.sin(f * 6 + wob) * l * 0.012; return [rx + dx * f + nx * b, ry + dy * f + ny * b]; };
    const wid = (f) => hw * Math.pow(1 - f, 0.85) * (0.92 + 0.16 * Math.sin(f * 4 + wob));
    const pts = BLADE.map(([u, v, sh]) => {
      const k = sh && u < 1 ? 0.8 + rnd() * 0.5 : 1, uu = clamp(u + (sh && u < 1 ? (rnd() - 0.3) * 0.08 : (rnd() - 0.5) * 0.03), 0, 1), [cx, cy] = cen(uu);
      const w = hw * v * flip * (sh ? k : 1 + (rnd() - 0.5) * 0.12) * (0.55 + 0.45 * Math.pow(1 - uu, 0.6));
      return [cx + nx * w, cy + ny * w, sh];
    });
    return { path: organic(pts), cen, wid, nx, ny, dx, dy };
  }
  function paintPlates(c, rnd) {
    plateTris.length = 0;
    // fire bed: rising wavy flame strokes filling the ridge zone
    {
      const b0 = new Batch(), b1 = new Batch(), b2 = new Batch();
      for (let i = 0; i < 4600; i++) {
        const x = 800 + rnd() * 420, y = 1240 + rnd() * 760;
        if (!inPoly(ZONE, x + 14 * (0.3 + noise(x / 40, y / 40)), y)) continue;
        const pts = [x, y]; let a = -Math.PI / 2 + 0.5 + 0.6 * noise(x / 45, y / 45), px = x, py = y;
        const n = 5 + ((rnd() * 8) | 0);
        for (let k = 1; k < n; k++) { a += 0.4 * noise(px / 22 + 5, py / 22); px += Math.cos(a) * 6; py += Math.sin(a) * 6; pts.push(px, py); }
        const u = rnd(), L = u < 0.3 ? 0.34 + rnd() * 0.08 : u < 0.85 ? 0.52 + rnd() * 0.12 : 0.7 + rnd() * 0.1;
        ramp(L, tmp); strokeIn(u < 0.3 ? b0 : u < 0.85 ? b1 : b2, tmp, pts, u < 0.85 ? 3 + rnd() * 5 : 1.4 + rnd() * 1.8, rnd());
      }
      b0.fill(c); b1.fill(c); b2.fill(c);
    }
    const spine = (u) => { const f = clamp(u) * (SPB.length - 1), i = Math.min(SPB.length - 2, f | 0), t = f - i; return [lerp(SPB[i][0], SPB[i + 1][0], t), lerp(SPB[i][1], SPB[i + 1][1], t)]; };
    // authored dorsal plates (measured on the reference): far row first, then the near blades. [rootX, rootY, tipX, tipY, halfWidth, row]
    const list = [
      // far row: the great blades fanning from the shoulders out to the right edge
      [1022, 1486, 1116, 1256, 64, 2], [1066, 1530, 1196, 1392, 60, 2], [1104, 1600, 1236, 1486, 58, 2], [1134, 1690, 1246, 1590, 54, 2],
      [1154, 1790, 1248, 1700, 50, 2], [1168, 1890, 1244, 1806, 44, 2], [1180, 1990, 1240, 1910, 36, 2],
      // near row: neck blades growing in size, then the heavy blades over the back
      [886, 1396, 898, 1346, 19, 1], [920, 1416, 950, 1330, 29, 1], [962, 1446, 990, 1306, 40, 1], [1002, 1500, 1050, 1322, 46, 1],
      [1040, 1596, 1010, 1500, 36, 3], [1070, 1650, 1146, 1500, 52, 1], [1096, 1730, 1186, 1612, 48, 1], [1122, 1806, 1206, 1712, 44, 1],
      [1142, 1876, 1218, 1800, 38, 1], [1156, 1946, 1222, 1882, 32, 1]];
    // small saw-tooth spikes along the back line (nearest row)
    for (let u = 0.01 + rnd() * 0.02; u < 0.3; u += 0.03 + rnd() * 0.03) {
      const [sx, sy] = spine(u), [ax, ay] = spine(u + 0.01), tl = Math.hypot(ax - sx, ay - sy) + 1e-6, ox = (ay - sy) / tl, oy = -(ax - sx) / tl;
      const rx = sx + ox * 4 + (rnd() - 0.5) * 8, ry = sy + oy * 4 + 10, len = (16 + 40 * smooth(0, 0.35, u)) * (0.7 + rnd() * 0.6);
      const ang = -Math.PI / 2 + 0.1 + 0.8 * smooth(0.3, 1, u) + (rnd() - 0.5) * 0.35;
      list.push([rx, ry, rx + Math.cos(ang) * len, ry + Math.sin(ang) * len, Math.max(5, len * 0.3), 0]);
    }
    const spike = (rx, ry, tx, ty, hw) => { const dx = tx - rx, dy = ty - ry, l = Math.hypot(dx, dy) + 1e-6, nx = -dy / l, ny = dx / l, b = l * 0.12, p = new Path2D();
      p.moveTo(rx - nx * hw, ry - ny * hw); p.quadraticCurveTo(rx + dx * 0.5 - nx * (hw * 0.5 - b), ry + dy * 0.5 - ny * (hw * 0.5 - b), tx, ty);
      p.quadraticCurveTo(rx + dx * 0.45 + nx * (hw * 0.6 + b), ry + dy * 0.45 + ny * (hw * 0.6 + b), rx + nx * hw, ry + ny * hw); p.closePath();
      return { path: p, cen: (f) => [rx + dx * f, ry + dy * f], wid: (f) => hw * (1 - f), nx, ny, dx, dy }; };
    const shapes = list.map(([rx, ry, tx, ty, hw, row]) => row ? plateShape(rx, ry, tx, ty, hw, rnd) : spike(rx, ry, tx, ty, hw));
    // dark ink backing so the plate mass separates from the bright swirls behind it
    { c.save(); c.strokeStyle = 'rgba(2,16,30,0.35)'; c.lineWidth = 3.5;
      shapes.forEach((P, i) => { if (list[i][5]) c.stroke(P.path); }); c.restore(); }
    for (let pi = 0; pi < list.length; pi++) {
      const [rx, ry, tx, ty, hw, row] = list[pi];
      plateTris.push([rx, ry, tx, ty, hw]);
      const P = shapes[pi], p = P.path, dk = (2 - row) * 0.0;
      const g = c.createLinearGradient(rx, ry, tx, ty), stops = row === 0 ? [[0, 0.36], [0.5, 0.5], [1, 0.6]] : row === 3 ? [[0, 0.2], [0.6, 0.27], [1, 0.4]] : row === 2 ? [[0, 0.4], [0.4, 0.55], [0.75, 0.66], [1, 0.76]] : [[0, 0.44], [0.3, 0.6], [0.6, 0.74], [1, 0.88]];
      for (const [o, L] of stops) { ramp(L - dk, tmp); g.addColorStop(o, `rgb(${tmp[0] | 0},${tmp[1] | 0},${tmp[2] | 0})`); }
      c.fillStyle = g; c.fill(p);
      c.save(); c.clip(p);
      // inner flame: a narrower lighter tongue inside the plate (layered-fire read)
      { const inner = []; for (let k = 0; k <= 10; k++) { const f = 0.15 + 0.8 * k / 10, [cx, cy] = P.cen(f), w = P.wid(f) * 0.5 * (0.8 + 0.4 * Math.sin(k * 1.7 + rx)); inner.push([cx - P.nx * w, cy - P.ny * w]); }
        for (let k = 10; k >= 0; k--) { const f = 0.15 + 0.8 * k / 10, [cx, cy] = P.cen(f), w = P.wid(f) * 0.42 * (0.8 + 0.4 * Math.cos(k * 1.3 + ry)); inner.push([cx + P.nx * w, cy + P.ny * w]); }
        ramp(row === 0 ? 0.5 : 0.74, tmp); c.fillStyle = `rgba(${tmp[0] | 0},${tmp[1] | 0},${tmp[2] | 0},${row === 3 ? 0 : row === 2 ? 0.25 : 0.32})`; c.fill(smoothPath(inner, 0.6)); }
      // painterly flame texture: short wavy strokes along the plate axis, lighter toward the tip (same brush language as the sky)
      if (row) {
        const bt = new Batch(), ns = Math.min(420, (Math.hypot(tx - rx, ty - ry) * hw / 26) | 0), pa = Math.atan2(ty - ry, tx - rx);
        for (let k = 0; k < ns; k++) {
          const f = Math.pow(rnd(), 0.8) * 0.95, o = (rnd() * 2 - 1) * 1.15, [cx, cy] = P.cen(f), w = P.wid(f) * o;
          let x = cx + P.nx * w, y = cy + P.ny * w, a = pa + 0.5 * noise(x / 18, y / 18) + 0.35 * o; const pts = [x, y];
          const sl = 2.6 + rnd() * 2.6, cv2 = (rnd() - 0.5) * 0.6; for (let m = 0; m < 7; m++) { a += cv2 + 0.55 * Math.sin(m * 0.9 + k); x += Math.cos(a) * sl; y += Math.sin(a) * sl; pts.push(x, y); }
          const u2 = rnd(), Lr = u2 < 0.14 ? 0.36 + rnd() * 0.08 : u2 < 0.6 ? 0.58 + 0.14 * f + rnd() * 0.08 : 0.72 + 0.18 * f + rnd() * 0.07 - (row === 2 ? 0.07 : row === 3 ? 0.36 : 0);
          ramp(Lr, tmp); brush(bt.get(tmp[0], tmp[1], tmp[2]), pts, u2 < 0.25 ? 2 + rnd() * 2.2 : 3.5 + rnd() * 5.5, rnd());
        }
        bt.fill(c);
        const dk = new Path2D(); for (let k = 0; k < 5; k++) { const o = (rnd() - 0.5) * 1.4, f0 = 0.1 + rnd() * 0.3, pts = [];
          for (let m = 0; m <= 8; m++) { const f = f0 + 0.5 * m / 8, [cx, cy] = P.cen(f), w = P.wid(f) * o + 4 * Math.sin(m * 0.9 + k); pts.push(cx + P.nx * w, cy + P.ny * w); }
          brush(dk, pts, 1.3 + rnd() * 1.6, rnd()); }
        c.fillStyle = 'rgba(4,36,66,0.38)'; c.fill(dk);
        if (row !== 3) { // dark core: a navy tongue up the shadowed side from the root, so the bright flame reads as an edge around a solid blade
          const core = [], f1 = 0.62 + 0.16 * rnd();
          for (let k = 0; k <= 8; k++) { const f = f1 * k / 8, [cx, cy] = P.cen(f), w = P.wid(f) * (0.34 + 0.12 * Math.sin(k * 1.9 + rx)) * (1 - 0.6 * k / 8); core.push([cx - P.nx * w, cy - P.ny * w]); }
          for (let k = 8; k >= 0; k--) { const f = f1 * k / 8, [cx, cy] = P.cen(f), w = P.wid(f) * (0.78 - 0.5 * (k / 8) ** 1.5) * (1 + 0.14 * Math.sin(k * 2.3 + ry)); core.push([cx + P.nx * w, cy + P.ny * w]); }
          c.fillStyle = row === 2 ? 'rgba(5,34,58,0.62)' : 'rgba(4,26,48,0.8)'; c.fill(smoothPath(core, 0.5));
        }
      }
      if (row !== 0) { // form: shadowed far half + a lit lip on the near half, so every plate reads as a solid curved blade
        const half = new Path2D(), lit = []; for (let k = 0; k <= 12; k++) { const f = k / 12 * 0.98, [cx, cy] = P.cen(f); k ? half.lineTo(cx, cy) : half.moveTo(cx, cy); lit.push(cx - P.nx * P.wid(f) * 0.62, cy - P.ny * P.wid(f) * 0.62); }
        for (let k = 12; k >= 0; k--) { const f = k / 12 * 0.98, [cx, cy] = P.cen(f), w = P.wid(f) * 2.4 + 6; half.lineTo(cx + P.nx * w, cy + P.ny * w); }
        half.closePath(); c.fillStyle = row === 2 ? 'rgba(3,26,48,0.12)' : 'rgba(3,26,48,0.16)'; c.fill(half);
        const lp = new Path2D(); brush(lp, lit, Math.max(2, hw * 0.16), 0.3); ramp(0.86, tmp); c.fillStyle = `rgba(${tmp[0] | 0},${tmp[1] | 0},${tmp[2] | 0},${row === 3 ? 0.25 : row === 2 ? 0.4 : 0.7})`; c.fill(lp);
      }
      const sg = c.createLinearGradient(rx, ry, lerp(rx, tx, 0.35), lerp(ry, ty, 0.35)); sg.addColorStop(0, 'rgba(3,22,40,0.4)'); sg.addColorStop(1, 'rgba(3,22,40,0)'); c.fillStyle = sg; c.fill(p);
      c.restore();
      c.strokeStyle = 'rgba(3,20,31,0.8)'; c.lineWidth = row === 0 ? 1.6 : row === 2 ? 1.7 : 2.4; c.stroke(p);
    }
  }

  // ---------- city: perspective towers (verticals converge on a vanishing point high above)
  const VP = [560, -1500], BASE = 2420;
  const persp = (xTop, yTop, y) => VP[0] + (xTop - VP[0]) * (y - VP[1]) / (yTop - VP[1]);
  function tower(c, rnd, o) {
    // o: {x0, x1 (top corners), y (top), yb (bottom), side (+1: lit face on the right), sw (side-face width), tiers:[[dx0,dx1,h]], spire:[x,y], ant:[], col, win, tone}
    const yb = o.yb || BASE, X = (x, y) => persp(x, o.y, y);
    const xs = o.x1 + o.side * o.sw;
    const front = [[o.x0, o.y], [o.x1, o.y], [X(o.x1, yb), yb], [X(o.x0, yb), yb]];
    const sideF = o.side > 0 ? [[o.x1, o.y], [xs, o.y + 6], [X(xs, yb), yb], [X(o.x1, yb), yb]] : [[xs, o.y + 6], [o.x0, o.y], [X(o.x0, yb), yb], [X(xs, yb), yb]];
    const tone = o.tone || 0;
    const fill = (pts, top, bot) => { const p = pathOf(pts), g = c.createLinearGradient(0, o.y, 0, yb); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fill(p); return p; };
    const fp = fill(front, `rgb(${12 + tone},${40 + tone * 2},${62 + tone * 2})`, '#041322');
    const spf = o.dark ? fill(sideF, `rgb(${24 + tone},${70 + tone * 2},${104 + tone * 2})`, '#051a2c') : fill(sideF, `rgb(${22 + tone},${70 + tone * 2},${104 + tone * 2})`, '#082640');
    // windows + mullions in perspective
    for (const [pts, lit] of [[front, 0], [sideF, 1]]) {
      const p = pathOf(pts); c.save(); c.clip(p);
      const xa = Math.min(pts[0][0], pts[1][0]), xb = Math.max(pts[0][0], pts[1][0]);
      c.strokeStyle = lit && !o.dark ? 'rgba(120,200,240,0.2)' : 'rgba(60,130,180,0.18)'; c.lineWidth = 0.9;
      const cols = Math.max(2, Math.round((xb - xa) / (o.col || 8)));
      for (let k = 1; k < cols; k++) { const xt = lerp(xa, xb, k / cols); c.beginPath(); c.moveTo(xt, o.y); c.lineTo(X(xt, yb), yb); c.stroke(); }
      for (let y = o.y + 10; y < yb; y += o.win || 12) {
        c.globalAlpha = 0.22; c.beginPath(); c.moveTo(X(xa, y) - 2, y + (lit ? 1.2 : 0)); c.lineTo(X(xb, y) + 2, y + (lit ? -1.2 : 0)); c.stroke(); c.globalAlpha = 1;
        if (rnd() < 0.05) { const k = (rnd() * cols) | 0, xt = lerp(xa, xb, (k + 0.25) / cols); c.fillStyle = rnd() < 0.4 ? 'rgba(255,205,120,0.85)' : 'rgba(150,220,255,0.35)'; c.fillRect(X(xt, y) + 0.5, y + 2, Math.max(1.6, (xb - xa) / cols * 0.5), 4); }
      }
      c.restore();
    }
    // tiers / crown
    for (const [d0, d1, h] of (o.tiers || [])) {
      const pts = [[o.x0 + d0, o.y - h], [o.x1 - d1, o.y - h], [o.x1 - d1 + 1, o.y], [o.x0 + d0 - 1, o.y]];
      const tp = pathOf(pts); c.fillStyle = `rgb(${18 + tone},${58 + tone * 2},${88 + tone * 2})`; c.fill(tp);
      c.strokeStyle = 'rgba(110,190,235,0.35)'; c.lineWidth = 1; for (let x = o.x0 + d0 + 4; x < o.x1 - d1; x += 6) { c.beginPath(); c.moveTo(x, o.y - h + 2); c.lineTo(x, o.y); c.stroke(); }
      c.strokeStyle = INK; c.lineWidth = 2; c.stroke(tp);
    }
    // rim light along the edge facing the spiral
    c.strokeStyle = 'rgba(120,210,250,0.65)'; c.lineWidth = 2.4; c.beginPath();
    const ex = o.side > 0 ? xs : o.x0; c.moveTo(ex, o.y + (o.side > 0 ? 6 : 0)); c.lineTo(X(ex, yb), yb); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(fp); c.lineWidth = 2; c.stroke(spf);
    // cornice line
    c.lineWidth = 2.2; c.beginPath(); c.moveTo(o.x0 - 2, o.y + 7); c.lineTo(xs + o.side * 2, o.y + 12); c.stroke();
    if (o.spire) { const [sx, sy] = o.spire, bx0 = lerp(o.x0, o.x1, 0.35), bx1 = lerp(o.x0, o.x1, 0.65), top = o.y - ((o.tiers && o.tiers[0]) ? o.tiers[0][2] : 0);
      const p = new Path2D(); p.moveTo(bx0, top); p.lineTo(sx, sy); p.lineTo(bx1, top); p.closePath(); c.fillStyle = '#0f3858'; c.fill(p); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(p);
      c.strokeStyle = 'rgba(150,220,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(lerp(bx1, sx, 0.05), top - 2); c.lineTo(sx, sy + 4); c.stroke(); }
    for (const [ax, ay, bx, by, w] of (o.ant || [])) { c.strokeStyle = INK; c.lineWidth = w; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
  }
  function shard(c, pts, lit) {
    const p = pathOf(pts); let y0 = 1e9; for (const q of pts) y0 = Math.min(y0, q[1]);
    const g = c.createLinearGradient(0, y0, 0, 2410); g.addColorStop(0, lit ? '#164a6f' : '#0d3050'); g.addColorStop(1, '#051628'); c.fillStyle = g; c.fill(p);
    c.save(); c.clip(p); c.strokeStyle = 'rgba(70,150,200,0.3)'; c.lineWidth = 1; let x0 = 1e9, x1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }
    for (let x = x0 + 4; x < x1; x += 6) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (x - 600) * 0.03, 2410); c.stroke(); } c.restore();
    if (lit) { c.strokeStyle = 'rgba(120,210,250,0.55)'; c.lineWidth = 2.2; c.beginPath(); pts.filter(q => q[0] > (x0 + x1) / 2).forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 2.4; c.stroke(p);
  }
  function paintFarCity(c, rnd) {
    // distant skyline in the spiral glow: small, light, with lit windows (base near y 2300 so the spiral stays open)
    for (let row = 0; row < 2; row++) {
      let x = 330 + row * 7;
      while (x < 900) {
        const w = 12 + rnd() * 26, hill = 50 * Math.exp(-(((x - 520) / 150) ** 2));
        const top = 2368 - (row ? 0 : 12) - hill * (row ? 0.3 : 0.6) - rnd() * (row ? 18 : 30) - (rnd() < 0.2 ? 24 + rnd() * 46 : 0) + (x < 420 ? -30 : 0);
        const pts = [[x, 2420], [persp(x, top, top), top], [persp(x + w, top, top), top], [x + w, 2420]];
        const p = pathOf(pts);
        c.fillStyle = row ? '#1d6190' : '#2a7cb0'; c.fill(p);
        c.save(); c.clip(p); c.strokeStyle = row ? 'rgba(80,160,210,0.35)' : 'rgba(120,200,240,0.35)'; c.lineWidth = 0.8;
        for (let xx = x + 3; xx < x + w; xx += 4) { c.beginPath(); c.moveTo(xx, top); c.lineTo(xx, 2420); c.stroke(); }
        for (let yy = top + 8; yy < 2420; yy += 9) if (rnd() < 0.35) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,205,120,0.85)' : 'rgba(200,240,255,0.5)'; c.fillRect(x + 2 + rnd() * (w - 5), yy, 1.8, 2.6); }
        c.restore();
        c.strokeStyle = 'rgba(4,28,48,0.85)'; c.lineWidth = 1.3; c.stroke(p);
        if (rnd() < 0.3) { c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + w / 2, top); c.lineTo(x + w / 2, top - 8 - rnd() * 22); c.stroke(); }
        x += w + (row ? 1 : 8) + rnd() * 10;
      }
    }
  }
  const lean = (c, px, ang, fn) => { c.save(); c.translate(px, BASE); c.rotate(ang); c.translate(-px, -BASE); fn(); c.restore(); };
  function paintCity(c, rnd) {
    // left: three perspective towers stepping down toward the spiral, lit faces toward it
    lean(c, 10, 0.075, () => { tower(c, rnd, { x0: -30, x1: 52, y: 1890, side: 1, sw: 24, tiers: [[8, 6, 14]], spire: [64, 1745], ant: [[44, 1876, 52, 1818, 2.4]], col: 9, win: 13, tone: 4 }); });
    lean(c, 150, 0.05, () => { tower(c, rnd, { x0: 118, x1: 170, y: 2032, side: 1, sw: 24, tiers: [[6, 4, 12]], spire: [178, 1935], col: 8, win: 12, tone: 2 }); });
    lean(c, 240, 0.03, () => { tower(c, rnd, { x0: 214, x1: 262, y: 2112, side: 1, sw: 22, tiers: [[4, 4, 10]], ant: [[240, 2102, 241, 2080, 2], [254, 2102, 256, 2088, 1.6]], col: 8, win: 11, tone: 2 }); });
    tower(c, rnd, { x0: 300, x1: 330, y: 2196, side: 1, sw: 12, col: 7, win: 10, tone: 6 });
    // broken shards in front of the towers
    lean(c, 330, 0.13, () => { shard(c, [[352, 2152], [362, 2140], [376, 2132], [380, 2160], [368, 2250], [344, 2420], [318, 2420]], 1); });
    lean(c, 290, -0.1, () => { shard(c, [[290, 2232], [300, 2214], [308, 2208], [316, 2240], [304, 2330], [300, 2420], [278, 2420]], 1); });
    lean(c, 240, 0.16, () => { shard(c, [[230, 2290], [244, 2262], [252, 2272], [262, 2420], [222, 2420]], 0); });
    shard(c, [[150, 2300], [196, 2268], [214, 2284], [210, 2420], [132, 2420]], 0);
    // foreground slab (bottom-left) with a tilted roof
    {
      const pts = [[-10, 2206], [62, 2222], [142, 2266], [180, 2298], [192, 2326], [146, 2352], [116, 2420], [-10, 2420]];
      const p = pathOf(pts), g = c.createLinearGradient(0, 2200, 0, 2420); g.addColorStop(0, '#0e3352'); g.addColorStop(1, '#03111e'); c.fillStyle = g; c.fill(p);
      c.save(); c.clip(p); c.strokeStyle = 'rgba(60,130,180,0.35)'; c.lineWidth = 1;
      for (let k = 0; k < 14; k++) { const x0 = -10 + k * 14; c.beginPath(); c.moveTo(x0, 2206 + x0 * 0.3); c.lineTo(x0 - 30, 2420); c.stroke(); }
      c.restore();
      c.strokeStyle = 'rgba(120,210,250,0.5)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-10, 2206); c.lineTo(62, 2222); c.lineTo(142, 2266); c.lineTo(180, 2298); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 3; c.stroke(p);
      c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 2230); c.lineTo(60, 2244); c.lineTo(140, 2286); c.lineTo(170, 2312); c.stroke();
    }
    // right: classical column, tall dark tower, edge slab, temple block and spires
    lean(c, 1215, -0.115, () => { tower(c, rnd, { x0: 1182, x1: 1290, y: 1880, side: -1, sw: 14, col: 16, win: 34, tone: -9, dark: 1 }); });
    {
      // fluted column with capital (leaning in)
      c.save(); c.translate(1110, BASE); c.rotate(-0.07); c.translate(-1110, -BASE);
      const X = (x, y) => persp(x, 2075, y);
      const pts = [[1088, 2075], [1132, 2075], [X(1132, 2420), 2420], [X(1088, 2420), 2420]];
      const p = pathOf(pts), g = c.createLinearGradient(1088, 0, 1132, 0); g.addColorStop(0, '#174a6d'); g.addColorStop(0.4, '#0d3150'); g.addColorStop(1, '#061a2c'); c.fillStyle = g; c.fill(p);
      c.strokeStyle = 'rgba(2,14,24,0.85)'; c.lineWidth = 1.4; for (let k = 1; k < 5; k++) { const x = lerp(1088, 1132, k / 5); c.beginPath(); c.moveTo(x, 2080); c.lineTo(X(x, 2420), 2420); c.stroke(); }
      c.strokeStyle = 'rgba(120,210,250,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(1090, 2080); c.lineTo(X(1090, 2420), 2420); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(p);
      const cap = new Path2D(); cap.moveTo(1078, 2052); cap.lineTo(1142, 2048); cap.lineTo(1146, 2060); cap.quadraticCurveTo(1136, 2068, 1132, 2078); cap.lineTo(1088, 2078); cap.quadraticCurveTo(1082, 2066, 1076, 2062); cap.closePath();
      c.fillStyle = '#123c5c'; c.fill(cap); c.lineWidth = 2.4; c.stroke(cap);
      c.lineWidth = 1.5; c.beginPath(); c.arc(1084, 2066, 5, 0, TAU); c.stroke(); c.beginPath(); c.arc(1138, 2063, 5, 0, TAU); c.stroke();
      // broken top: jagged stub above the capital
      const st = new Path2D(); st.moveTo(1090, 2048); st.lineTo(1094, 2030); st.lineTo(1104, 2040); st.lineTo(1112, 2018); st.lineTo(1122, 2036); st.lineTo(1132, 2046); st.closePath(); c.fillStyle = '#0f3554'; c.fill(st); c.lineWidth = 2; c.stroke(st);
      c.restore();
    }
    {
      // temple / beaux-arts block with cornice, pilasters and windows (tilted)
      c.save(); c.translate(1070, BASE); c.rotate(-0.06); c.translate(-1070, -BASE);
      const pts = [[996, 2290], [1144, 2286], [1146, 2420], [992, 2420]];
      const p = pathOf(pts), g = c.createLinearGradient(0, 2286, 0, 2420); g.addColorStop(0, '#103a5a'); g.addColorStop(1, '#04162a'); c.fillStyle = g; c.fill(p);
      c.save(); c.clip(p);
      for (let k = 0; k < 6; k++) { const x = 1004 + k * 24; c.fillStyle = 'rgba(2,14,24,0.75)'; c.fillRect(x + 4, 2312, 10, 26); c.fillRect(x + 4, 2354, 10, 26);
        if (k % 2 === 0) { c.fillStyle = 'rgba(255,200,110,0.55)'; c.fillRect(x + 6, 2330, 6, 6); }
        c.strokeStyle = 'rgba(90,170,215,0.35)'; c.lineWidth = 1; c.strokeRect(x + 4, 2312, 10, 26); c.strokeRect(x + 4, 2354, 10, 26); }
      c.restore();
      c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(p);
      const cor = new Path2D(); cor.moveTo(986, 2292); cor.lineTo(1152, 2286); cor.lineTo(1150, 2276); cor.lineTo(1124, 2268); cor.lineTo(1018, 2272); cor.lineTo(990, 2280); cor.closePath();
      c.fillStyle = '#16476a'; c.fill(cor); c.lineWidth = 2.2; c.stroke(cor);
      const ped = new Path2D(); ped.moveTo(1030, 2272); ped.lineTo(1070, 2246); ped.lineTo(1110, 2270); ped.closePath(); c.fillStyle = '#123e5e'; c.fill(ped); c.stroke(ped);
      // broken statue / chimney stubs on the roof
      c.lineWidth = 3; c.beginPath(); c.moveTo(1006, 2272); c.lineTo(1008, 2252); c.moveTo(1126, 2268); c.lineTo(1118, 2236); c.lineTo(1128, 2226); c.stroke();
      c.strokeStyle = 'rgba(120,210,250,0.45)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(986, 2292); c.lineTo(1152, 2286); c.stroke();
      c.restore();
    }
    lean(c, 945, -0.11, () => { shard(c, [[934, 2232], [940, 2218], [946, 2230], [960, 2420], [930, 2420]], 1); });
    lean(c, 900, 0.09, () => { shard(c, [[892, 2284], [904, 2276], [918, 2420], [888, 2420]], 1); });
    shard(c, [[862, 2322], [872, 2316], [884, 2420], [856, 2420]], 0);
    shard(c, [[960, 2344], [976, 2330], [990, 2340], [992, 2420], [956, 2420]], 0);
    // nearest wreckage: dark broken girders and slabs at both bottom corners (hand-placed silhouettes, rim-lit toward the spiral)
    const RUIN = [
      [[-10, 2330], [26, 2296], [40, 2250], [52, 2302], [84, 2262], [92, 2322], [130, 2338], [150, 2300], [168, 2372], [214, 2392], [230, 2420], [-10, 2420]],
      [[1210, 2300], [1178, 2318], [1164, 2282], [1150, 2334], [1116, 2350], [1104, 2318], [1090, 2372], [1050, 2384], [1036, 2420], [1210, 2420]],
      [[1128, 2420], [1160, 2212], [1170, 2204], [1176, 2222], [1158, 2420]]
      ];
    for (const pts of RUIN) { const p = pathOf(pts), g = c.createLinearGradient(0, 2190, 0, 2420); g.addColorStop(0, '#0a2a44'); g.addColorStop(1, '#020c16'); c.fillStyle = g; c.fill(p);
      c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(p);
      const rimR = pts[0][0] < 600; c.strokeStyle = 'rgba(120,210,250,0.5)'; c.lineWidth = 1.8; c.beginPath();
      for (let k = 1; k < pts.length - 2; k++) { const a = pts[k], b = pts[k + 1]; if ((b[0] - a[0]) * (rimR ? 1 : -1) > 0 && b[1] > a[1]) { c.moveTo(a[0], a[1] + 2); c.lineTo(b[0], b[1] + 1); } } c.stroke(); }
  }

  // glow layer for the plates (blurred, quarter res) — two halves pulse in sequence
  function plateGlow(S, half) {
    const q = 0.25, cv = GZ.canvas(RW * S * q, RH * S * q), c = cv.getContext('2d');
    c.scale(S * q, S * q); c.filter = `blur(${Math.max(1, 7 * S * q)}px)`;
    c.fillStyle = 'rgb(80,200,255)';
    plateTris.forEach(([rx, ry, tx, ty, hw], i) => { if ((i % 2) !== half) return; const dx = tx - rx, dy = ty - ry, l = Math.hypot(dx, dy) + 1e-6, nx = -dy / l * hw, ny = dx / l * hw;
      c.beginPath(); c.moveTo(rx - nx, ry - ny); c.lineTo(tx, ty); c.lineTo(rx + nx, ry + ny); c.closePath(); c.fill(); });
    return cv;
  }

  function breathGlow(S, Fd) {
    const g = GZ.canvas(GW, GH), c = g.getContext('2d'), id = c.createImageData(GW, GH);
    for (let k = 0; k < GW * GH; k++) { const v = Fd.CC[k] * Fd.BB[k]; id.data[k * 4] = 120; id.data[k * 4 + 1] = 215; id.data[k * 4 + 2] = 255; id.data[k * 4 + 3] = 255 * v * v; }
    c.putImageData(id, 0, 0);
    const out = GZ.canvas(GW * 2, GH * 2), oc = out.getContext('2d'); oc.filter = 'blur(3px)'; oc.drawImage(g, 0, 0, GW * 2, GH * 2);
    return out;
  }
  function glowSprite(rgb) {
    const c = GZ.canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},0.35)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
  }
  function vortexSprite(src, S, cx, cy, R) {
    const s = Math.ceil(2 * R * S), c = GZ.canvas(s, s), x = c.getContext('2d');
    x.drawImage(src, (cx - R) * S, (cy - R) * S, 2 * R * S, 2 * R * S, 0, 0, s, s);
    x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, '#000'); g.addColorStop(0.5, '#000'); g.addColorStop(0.97, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
  }

  // ---------- init
  function init(ctx, W, H) {
    const S = W / RW, rnd = GZ.rng(3303);
    const Fd = grid();
    const sky = paintSky(S, Fd, rnd);
    const fg = paintFG(S, Fd, GZ.rng(6161));
    // rotating vortex overlays: x, y, sprite radius, angular speed (rad/s)
    const VX = [[392, 1978, 235, 0.05], [922, 578, 150, -0.028], [850, 1005, 110, -0.03], [405, 1165, 130, 0.024], [600, 230, 150, 0.02],
      [1192, 150, 190, 0.035], [25, 665, 85, 0.05], [120, 1025, 85, 0.05], [735, 805, 70, 0.03]];
    const vort = VX.map(([x, y, R, w]) => ({ x, y, R, w, spr: vortexSprite(sky, S, x, y, R) }));
    // flowing highlight streaks: streamlines precomputed; each frame shows a moving slice
    const streaks = []; const sr = GZ.rng(77);
    for (let i = 0; i < 1400 && streaks.length < 420; i++) {
      const x = sr() * RW, y = sr() * 1500;
      const B = samp(Fd.BB, x, y); if (B < 0.55 || inPoly(BODY, x, y)) continue;
      // trace toward the top (along the breath direction)
      const pts = trace(Fd, x, y, 16, 9, 1); if (pts[pts.length - 1] > y) { const p2 = trace(Fd, x, y, 16, 9, -1); pts.length = 0; pts.push(...p2); }
      streaks.push({ p: pts, ph: sr(), sp: 0.12 + sr() * 0.1, w: 1.2 + sr() * 2.2, b: samp(Fd.CC, x, y) });
    }
    const skyStreaks = [];
    for (let i = 0; i < 3000 && skyStreaks.length < 300; i++) {
      const x = sr() * RW, y = sr() * 1900; if (samp(Fd.BB, x, y) > 0.3 || inPoly(BODY, x, y) || inPoly(ZONE, x, y)) continue;
      skyStreaks.push({ p: trace(Fd, x, y, 14, 7, sr() < 0.5 ? 1 : -1), ph: sr(), sp: 0.05 + sr() * 0.05, w: 1.5 + sr() * 2 });
    }
    // golden halo rings: tapered arc strokes in local coords, turned slowly at draw time
    const halos = HALO.map(([x, y, R, wl, g], hi) => {
      const hr = GZ.rng(500 + hi), a = new Path2D(), b = new Path2D();
      for (let r = wl * 0.35; r < R * 0.72; r += wl * (0.5 + hr() * 0.25)) {
        const segs = 2 + ((hr() * 3) | 0);
        for (let k = 0; k < segs; k++) {
          const a0 = hr() * TAU, len = (1 + hr() * 2.2) * Math.min(1, 40 / r + 0.4), pts = [];
          for (let m = 0; m <= 14; m++) { const th = a0 + len * m / 14, rr = r + wl * 0.5 * (th - a0) / TAU; pts.push(Math.cos(th) * rr, Math.sin(th) * rr); }
          brush(r < R * 0.45 && hr() < 0.7 ? a : b, pts, (2 + hr() * 2.6) * (1.2 - r / R * 0.6), hr());
        }
      }
      return { x, y, R, g, a, b, w: (hi % 2 ? -1 : 1) * (0.05 + hi * 0.012) };
    });
    const embers = []; const er = GZ.rng(919);
    for (let i = 0; i < 120; i++) { const big = er() < 0.3; embers.push({ x: 790 + er() * 330 + (er() < 0.12 ? -260 : 0), y: 2120 + er() * 340, sp: 12 + er() * 24, ph: er() * 600, len: big ? 9 + er() * 12 : 2.5 + er() * 7, wd: big ? 2.6 + er() * 2.4 : 1.3 + er() * 1.6, sw: er() * TAU, b: er() }); }
    return { S, sky, fg, vort, halos, streaks, skyStreaks, embers, glowA: plateGlow(S, 0), glowB: plateGlow(S, 1), bglow: breathGlow(S, Fd),
      gold: glowSprite('255,200,110'), cyan: glowSprite('150,225,255') };
  }

  // ---------- draw (pure in t)
  function sliceStroke(ctx, pts, u0, u1) {
    const n = pts.length / 2 - 1, a = Math.max(0, u0 * n), b = Math.min(n, u1 * n); if (b <= a) return false;
    const i0 = Math.floor(a), f0 = a - i0;
    ctx.moveTo(lerp(pts[i0 * 2], pts[Math.min(n, i0 + 1) * 2], f0), lerp(pts[i0 * 2 + 1], pts[Math.min(n, i0 + 1) * 2 + 1], f0));
    for (let i = i0 + 1; i < b; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    const i1 = Math.floor(b), f1 = b - i1; ctx.lineTo(lerp(pts[i1 * 2], pts[Math.min(n, i1 + 1) * 2], f1), lerp(pts[i1 * 2 + 1], pts[Math.min(n, i1 + 1) * 2 + 1], f1));
    return true;
  }
  function draw(ctx, W, H, t, st) {
    const S = st.S;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(st.sky, 0, 0);
    // slowly turning vortices
    for (let i = 0; i < st.vort.length; i++) {
      const v = st.vort[i];
      // lower-left spiral turns continuously; the dark eddies breathe back and forth on layered slow sines (still always reads as the poster)
      const ang = i === 0 ? v.w * t : v.w * (4.2 * Math.sin(t * 0.19 + i * 1.7) + 1.6 * Math.sin(t * 0.47 + i * 0.9));
      ctx.save(); ctx.translate(v.x * S, v.y * S); ctx.rotate(ang); ctx.drawImage(v.spr, -v.R * S, -v.R * S, 2 * v.R * S, 2 * v.R * S); ctx.restore();
    }
    ctx.scale(S, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // sky: faint light travelling along the brush flow
    ctx.globalCompositeOperation = 'lighter';
    for (let bucket = 0; bucket < 3; bucket++) {
      ctx.beginPath(); let any = false;
      for (let i = bucket; i < st.skyStreaks.length; i += 3) {
        const s = st.skyStreaks[i], ph = (t * s.sp + s.ph) % 1; any = sliceStroke(ctx, s.p, ph * 1.4 - 0.4, ph * 1.4 - 0.05) || any;
      }
      ctx.strokeStyle = 'rgba(70,130,175,0.16)'; ctx.lineWidth = 2 + bucket; if (any) ctx.stroke();
    }
    // breath: flame filaments racing up the plume
    for (let bucket = 0; bucket < 4; bucket++) {
      ctx.beginPath(); let any = false;
      for (let i = bucket; i < st.streaks.length; i += 4) {
        const s = st.streaks[i], ph = (t * s.sp * 2.2 + s.ph) % 1; any = sliceStroke(ctx, s.p, ph * 1.5 - 0.5, ph * 1.5 - 0.1) || any;
      }
      ctx.strokeStyle = bucket < 2 ? 'rgba(150,225,255,0.22)' : 'rgba(90,180,235,0.2)'; ctx.lineWidth = bucket < 2 ? 1.6 : 3; if (any) ctx.stroke();
    }
    // breath bloom flicker
    const fl = 0.55 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + 0.15 * Math.sin(t * 13.7);
    ctx.globalAlpha = 0.16 * fl; ctx.drawImage(st.bglow, 0, 0, GW * G, GH * G);
    // streaming plume: a second bloom pass that slides up the breath axis and fades, so light appears to travel mouth -> sky
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.22 + k * 0.5) % 1, e = Math.sin(Math.PI * u) ** 2;
      ctx.globalAlpha = 0.09 * e; ctx.drawImage(st.bglow, -70 * u, -150 * u, GW * G, GH * G);
    }
    // golden halo glow, breathing slowly
    for (let i = 0; i < st.halos.length; i++) {
      const h = st.halos[i], gr = h.R * (0.95 + 0.05 * Math.sin(t * 0.6 + i * 2));
      ctx.globalAlpha = (0.22 + 0.05 * Math.sin(t * 0.8 + i)) * h.g; ctx.drawImage(st.gold, h.x - gr, h.y - gr, gr * 2, gr * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // golden halo rings turning slowly
    for (const h of st.halos) {
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.w * t);
      ctx.globalAlpha = 0.9 * h.g; ctx.fillStyle = '#ecb862'; ctx.fill(h.a);
      ctx.globalAlpha = 0.62 * h.g; ctx.fillStyle = '#cf9d50'; ctx.fill(h.b);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // stars: twinkle (glow + 4/8-point sparkle)
    for (let i = 0; i < STARS.length; i++) {
      const [x, y, r, k] = STARS[i];
      const tw = 0.82 + 0.18 * Math.sin(t * (1.3 + (i % 7) * 0.37) + i * 2.1) * Math.sin(t * 0.7 + i);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32 * tw;
      const gr = r * (k ? 1.45 : 1.0) * tw; ctx.drawImage(st.gold, x - gr, y - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const rr = r * tw * (k ? 0.95 : 0.8);
      GZ.sparkle(ctx, x, y, rr, '#f4c46a', 0.95, k ? 0.035 : 0.06);
      if (!k && r >= 14) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); GZ.sparkle(ctx, 0, 0, rr * 0.38, '#eab35c', 0.8, 0.12); ctx.restore(); }
      if (k) { ctx.strokeStyle = 'rgba(240,190,100,0.35)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0.3 + t * 0.2, 2.6 + t * 0.2); ctx.stroke(); }
      if (k) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4 + 0.05 * Math.sin(t * 0.4 + i)); GZ.sparkle(ctx, 0, 0, rr * 0.5, '#f0b860', 0.9, 0.14); ctx.restore(); }
      GZ.sparkle(ctx, x, y, rr * 0.45, '#fff6dc', 1, 0.16);
    }
    ctx.restore();
    // foreground: monster, plates, city
    ctx.drawImage(st.fg, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pa = 0.5 + 0.5 * Math.sin(t * 1.4), pb = 0.5 + 0.5 * Math.sin(t * 1.4 - 1.6);
    ctx.globalAlpha = 0.04 + 0.09 * pa; ctx.drawImage(st.glowA, 0, 0, W, H);
    ctx.globalAlpha = 0.04 + 0.09 * pb; ctx.drawImage(st.glowB, 0, 0, W, H);
    // mouth: breath source pulse
    // (the breath source at the jaws is painted stroke-by-stroke in mouthDraw)
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // embers rising
    ctx.scale(S, S);
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = pass; i < st.embers.length; i += 2) {
        const e = st.embers[i], rise = (t * e.sp + e.ph) % 320, life = rise / 320;
        const x = e.x + 18 * Math.sin(t * 0.6 + e.sw) + rise * 0.35, y = e.y - rise;
        const fl2 = Math.sin(Math.PI * life) * (0.75 + 0.25 * Math.sin(t * 3.1 + e.sw * 5)); if (fl2 < 0.03) continue;   // smooth birth/death + soft flicker, no popping
        const L = e.len * fl2, a = -1.05 + 0.25 * Math.sin(t * 0.9 + e.sw), cx = Math.cos(a), sy = Math.sin(a), w = e.wd * 0.5 * Math.min(1, fl2 * 2.5);
        ctx.moveTo(x - cx * L, y - sy * L); ctx.lineTo(x - sy * w, y + cx * w); ctx.lineTo(x + cx * L, y + sy * L); ctx.lineTo(x + sy * w, y - cx * w); ctx.closePath();
      }
      ctx.fillStyle = pass ? 'rgba(255,214,130,0.95)' : 'rgba(240,170,80,0.85)'; ctx.fill();
    }
    ctx.restore();
  }

  // ---------- mouth breath: layered tapered brush ribbons streaming out between the jaws (same stroke vocabulary as the plume)
  const HS = 1.14, HX = 800, HY = 1470;                 // head is painted scaled about the throat
  const hp = (x, y) => [HX + (x - HX) * HS, HY + (y - HY) * HS];
  const SPK = [];                                        // dorsal spike geometry recorded by paintHead
  // irregular teeth along both lips (head coords). Shared by paintHead (static) and mouthDraw (clip + live rim)
  function buildTeeth() {
    const r = GZ.rng(8128), body = new Path2D(), rim = new Path2D(), cx = 738, cy = 1418;
    const row = (x0, y0, x1, y1, nx, ny, big) => {
      const len = Math.hypot(x1 - x0, y1 - y0); let f = 0.03 + 0.03 * r(), i = 0;
      while (f < 0.94) {
        const x = lerp(x0, x1, f), y = lerp(y0, y1, f), front = i < 2;
        const h = (front && big ? (i ? 7 : 10) + 3 * r() : 2.5 + 6.5 * r() ** 1.4) * (1 - 0.35 * f), w = 1.3 + h * 0.17 + 0.6 * r();
        const a = Math.atan2(ny, nx) + (r() - 0.5) * 0.55, ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux, hook = (r() - 0.35) * 0.4 * h;
        const px = x + ux * h + tx * hook, py = y + uy * h + ty * hook;
        if (r() > 0.08 || front) {
          body.moveTo(x - tx * w, y - ty * w);
          body.quadraticCurveTo(x + ux * h * 0.55 - tx * w * 0.45, y + uy * h * 0.55 - ty * w * 0.45, px, py);
          body.quadraticCurveTo(x + ux * h * 0.45 + tx * w * 0.5, y + uy * h * 0.45 + ty * w * 0.5, x + tx * w, y + ty * w); body.closePath();
          const sg = ((cx - x) * tx + (cy - y) * ty) > 0 ? 1 : -1;
          brush(rim, [x + tx * w * 0.6 * sg, y + ty * w * 0.6 * sg, x + ux * h * 0.5 + tx * w * 0.4 * sg, y + uy * h * 0.5 + ty * w * 0.4 * sg, px, py], Math.max(0.9, w * 0.6), 0.3);
        }
        f += (2 * w + 0.5 + 2.4 * r()) / len; i++;
      }
    };
    row(729, 1372, 751, 1426, -0.92, 0.38, true);
    row(703, 1451, 751, 1429, -0.4, -0.92, true);
    return { body, rim };
  }
  // 1D value noise (deterministic in t, continuous: no popping)
  const hsh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hsh(i), hsh(i + 1), u); };
  const pulseAt = (t) => 0.55 * vn(t * 2.3) + 0.3 * vn(t * 5.1 + 17) + 0.15 * vn(t * 11.3 + 40);   // 0..1
  // plume centreline as offsets from the jaw hinge: out between the jaws (left, a little up), then curling up-left into the sky plume
  const MCO = [[0, 0], [-20, -9], [-37, -22], [-50, -42], [-59, -68], [-66, -100], [-75, -140], [-88, -188], [-106, -243], [-129, -300], [-155, -360], [-185, -423], [-218, -488]];
  function mouthInit() {
    const [hx, hy] = hp(751, 1428), MC = MCO.map(([dx, dy]) => [hx + dx, hy + dy]);
    const CX = [], CY = [], TX = [], TY = [];
    for (let k = 0; k < MC.length - 1; k++) {
      const [ax, ay] = MC[k], [bx, by] = MC[k + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / 3));
      for (let j = 0; j < n; j++) { const f = j / n; CX.push(lerp(ax, bx, f)); CY.push(lerp(ay, by, f)); }
    }
    CX.push(MC[MC.length - 1][0]); CY.push(MC[MC.length - 1][1]);
    for (let i = 0; i < CX.length; i++) { const a = Math.max(0, i - 3), b = Math.min(CX.length - 1, i + 3), dx = CX[b] - CX[a], dy = CY[b] - CY[a], l = Math.hypot(dx, dy) + 1e-6; TX.push(dx / l); TY.push(dy / l); }
    // clip: everything except the head silhouette (the open mouth notch stays open) and the teeth
    const outside = new Path2D(); outside.rect(-400, -400, 2200, 3200); outside.addPath(organic(HEADP));
    const T = buildTeeth(), noTeeth = new Path2D(); noTeeth.rect(-400, -400, 2200, 3200); noTeeth.addPath(T.body);
    // rim light (head coords): teeth flanks, both lips, snout front, chin, dorsal spike edges facing the beam
    const rim = new Path2D(), rimS = new Path2D(); rim.addPath(T.rim);
    const off = (L, ox, oy) => { const a = []; for (const q of L) a.push(q[0] + ox, q[1] + oy); return a; };
    brush(rim, off(CAV.slice(0, 6), 2.6, -1.1), 2.2, 0.3);                     // upper lip / snout underside
    brush(rim, off(CAV.slice(5, 10), 1, 2.6), 2.2, 0.7);                       // lower lip
    brush(rimS, off([[742, 1355], [734, 1359], [729, 1366], [729, 1376]], 2, 2), 2.4, 0.6);   // snout tip
    brush(rimS, off([[701, 1449], [702, 1458], [707, 1467], [714, 1474]], 2.4, 0), 2.6, 0.4);  // chin / lower jaw front
    brush(rimS, off([[748, 1356], [762, 1360], [780, 1368]], 0, 2.2), 1.6, 0.3);              // brow top
    for (const [x, y, h, a] of SPK) brush(rimS, [x - 3.4, y + 1.2, x + Math.cos(a) * h * 0.4 - 1.6, y + Math.sin(a) * h * 0.5, x + Math.cos(a) * h * 0.95, y + Math.sin(a) * h * 0.95], 1.5, 0.3);
    const r = GZ.rng(5151), licks = [];
    // ribbons: tier 0 deep blue edge, 1 mid blue, 2 pale cyan, 3 white core
    for (let i = 0; i < 270; i++) {
      const o = (r() - r()) * 1.1, ao = Math.abs(o), rt = r();
      let tier = ao < 0.2 ? (rt < 0.55 ? 3 : 2) : ao < 0.5 ? (rt < 0.14 ? 3 : rt < 0.7 ? 2 : 1) : ao < 0.85 ? (rt < 0.25 ? 2 : rt < 0.75 ? 1 : 0) : (rt < 0.45 ? 1 : 0);
      const s0 = tier < 2 ? 28 + 90 * r() ** 1.3 : 2 + 80 * r() ** 1.7;
      licks.push({ o, s0, tier, trav: 110 + 170 * r(), L: 32 + 60 * r(), od: o * (0.08 + 0.25 * r()), curl: (0.08 + 0.25 * r()) * (o < 0 ? -1 : 1),
        a: 2 + 3.5 * r(), k: 0.04 + 0.025 * r(), w: 4 + 3 * r(), ph: r() * TAU, sp: 0.3 + 0.35 * r(), u0: r(),
        W: tier === 0 ? 6 + 5 * r() : tier === 3 ? 10 + 10 * r() : 11 + 12 * r(), fl: 6 + 9 * r(), fp: r() * TAU });
    }
    // hot core: fast white ribbons leaving the throat
    for (let i = 0; i < 26; i++) licks.push({ o: (r() - 0.5) * 0.6, s0: r() * 8, tier: 3, trav: 70 + 70 * r(), L: 22 + 26 * r(), od: (r() - 0.5) * 0.4, curl: (r() - 0.5) * 0.4,
      a: 1.5 + 2 * r(), k: 0.08 + 0.04 * r(), w: 9 + 5 * r(), ph: r() * TAU, sp: 0.7 + 0.5 * r(), u0: r(), W: 6 + 6 * r(), fl: 9 + 8 * r(), fp: r() * TAU });
    // shed fragments: short ribbon offcuts peeling off the plume edges
    for (let i = 0; i < 60; i++) { const sg = r() < 0.5 ? -1 : 1; licks.push({ o: sg * (0.85 + 0.6 * r()), s0: 40 + 120 * r(), tier: r() < 0.5 ? 1 : 2, trav: 140 + 140 * r(), L: 8 + 12 * r(),
      od: sg * (0.2 + 0.4 * r()), curl: sg * 0.3 * r(), a: 3 + 4 * r(), k: 0.04 + 0.04 * r(), w: 4 + 4 * r(), ph: r() * TAU, sp: 0.35 + 0.35 * r(), u0: r(), W: 3 + 3 * r(), fl: 0, fp: 0 }); }
    // painted sparks: tiny tapered commas, cyan and ember-orange, riding faster than the ribbons
    const sparks = [];
    for (let i = 0; i < 80; i++) { const sg = r() < 0.5 ? -1 : 1; sparks.push({ o: (r() - 0.5) * 2.6, s0: 20 + 60 * r(), trav: 200 + 220 * r(), L: 3 + 7 * r(), W: 1.8 + 2 * r(), a: 5 + 10 * r(), k: 0.02 + 0.03 * r(),
      w: 2 + 3 * r(), ph: r() * TAU, sp: 0.45 + 0.5 * r(), u0: r(), od: sg * 0.8 * r(), curl: 0, tier: i < 14 ? 4 : r() < 0.55 ? 3 : 2, fl: 0, fp: 0 }); }
    return { CX, CY, TX, TY, n: CX.length, outside, noTeeth, rim, rimS, licks, sparks };
  }
  // half-width of the breath around the centreline at arc length s: narrow inside the throat, flaring past the lips, fanning into the sky plume
  const mhw = (s) => s < 44 ? 4 + 0.55 * s : s < 80 ? 28 + (s - 44) : Math.min(118, 64 + (s - 80) * 0.2);
  const _L = new Float32Array(64), _R = new Float32Array(64), _P = new Float32Array(64);
  // one tapered ribbon along the flow: round-ish base, pointed tip, sinuous body; env grows it in / shrinks it out (no popping)
  function lick(path, M, q, t, u, env, fade, pw) {
    if (env < 0.02 || fade < 0.02) return;
    const n = 13, Ls = q.L * (0.55 + 0.75 * u) * (0.35 + 0.65 * env), sb = q.s0 + q.trav * u;
    for (let j = 0; j <= n; j++) {
      const f = j / n, s = sb + Ls * f, ci = Math.min(M.n - 1, Math.max(0, s / 3)), i0 = ci | 0, i1 = Math.min(M.n - 1, i0 + 1), cf = ci - i0;
      const cx = lerp(M.CX[i0], M.CX[i1], cf), cy = lerp(M.CY[i0], M.CY[i1], cf), tx = M.TX[i0], ty = M.TY[i0];
      const lat = mhw(s) * pw * (q.o + q.od * u + q.curl * f * f) + q.a * (0.35 + f) * Math.min(1, s / 40) * Math.sin(q.k * s - q.w * t + q.ph);
      _P[j * 2] = cx - ty * lat; _P[j * 2 + 1] = cy + tx * lat;
    }
    const wv = q.W * env * fade * (q.fl ? 0.8 + 0.2 * Math.sin(t * q.fl + q.fp) : 1) * (0.5 + 0.5 * smooth(0, 70, sb)) * (q.tier >= 2 ? pw : 1);
    for (let j = 0; j <= n; j++) {
      const a = Math.max(0, j - 1), b = Math.min(n, j + 1); let dx = _P[b * 2] - _P[a * 2], dy = _P[b * 2 + 1] - _P[a * 2 + 1]; const l = Math.hypot(dx, dy) + 1e-6; dx /= l; dy /= l;
      const f = j / n, hw = 0.5 * wv * Math.min(1, 0.55 + f * 2.5) * Math.pow(1 - f, 0.55);
      _L[j * 2] = _P[j * 2] - dy * hw; _L[j * 2 + 1] = _P[j * 2 + 1] + dx * hw; _R[j * 2] = _P[j * 2] + dy * hw; _R[j * 2 + 1] = _P[j * 2 + 1] - dx * hw;
    }
    path.moveTo(_P[0], _P[1]);
    for (let j = 0; j <= n; j++) path.lineTo(_L[j * 2], _L[j * 2 + 1]);
    for (let j = n; j >= 0; j--) path.lineTo(_R[j * 2], _R[j * 2 + 1]);
    path.closePath();
  }
  const life = (q, t) => { const u = (t * q.sp + q.u0) % 1; return [u, smooth(0, 0.14, u) * Math.pow(1 - u, 0.8)]; };
  const FILL = ['#1d6298', '#4ea4da', '#aee4fb', '#f5fdff', '#f2b45e'];
  function mouthDraw(ctx, t, st) {
    const M = st.mouth, S = st.S, base = ctx.getTransform(), headT = base.scale(S).translate(HX, HY).scale(HS).translate(-HX, -HY);
    const p = pulseAt(t), pw = 0.82 + 0.36 * p;           // core width / brightness pulse (~±18%, noise-driven)
    const P = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (const q of M.licks) { const [u, e] = life(q, t), s = q.s0 + q.trav * u; lick(P[q.tier], M, q, t, u, e, smooth(380, 230, s), pw); }
    for (const q of M.sparks) { const [u, e] = life(q, t), s = q.s0 + q.trav * u; lick(P[q.tier], M, q, t, u, e, smooth(440, 280, s), 1); }
    ctx.save();
    ctx.setTransform(headT); ctx.clip(M.outside, 'evenodd'); ctx.clip(M.noTeeth, 'evenodd');
    ctx.setTransform(base.scale(S)); ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round';
    // deep separations first, then mid, pale, white core; crisp edges with a thin dark ink line on the coloured tiers
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = k < 2 ? 'rgba(3,20,31,0.55)' : 'rgba(10,50,85,0.35)'; ctx.lineWidth = k < 2 ? 1.2 : 0.8; ctx.stroke(P[k]); ctx.fillStyle = FILL[k]; ctx.fill(P[k]); }
    ctx.globalAlpha = 0.86 + 0.14 * p; ctx.fillStyle = FILL[3]; ctx.fill(P[3]); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(60,24,6,0.6)'; ctx.lineWidth = 0.8; ctx.stroke(P[4]); ctx.fillStyle = FILL[4]; ctx.fill(P[4]);
    ctx.restore();
    // breath light on the head: lips, teeth flanks, snout, chin and spike edges flicker with the core pulse
    ctx.save(); ctx.setTransform(headT); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(130,215,255,${(0.28 + 0.5 * p).toFixed(3)})`; ctx.fill(M.rim);
    ctx.fillStyle = `rgba(110,200,245,${(0.22 + 0.4 * p).toFixed(3)})`; ctx.fill(M.rimS);
    ctx.restore();
  }

  window.PIECES[2] = { title: 'Starry Breath', init: (ctx, W, H) => { const st = init(ctx, W, H); st.mouth = mouthInit(); return st; },
    draw: (ctx, W, H, t, st, m) => { draw(ctx, W, H, t, st, m); mouthDraw(ctx, t, st); } };
})();
