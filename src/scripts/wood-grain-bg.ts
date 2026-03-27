/**
 * Wood Grain Background — Procedural wood with realistic knots & veins
 *
 * Inspired by "Procedural Texturing of Solid Wood with Knots"
 * (Larsson, Ijiri, Yoshida et al., ACM Trans. Graph. 2022)
 *
 * Core techniques from the paper, adapted to 2D canvas:
 * - Time-field scalar model: annual rings as isocurves of growth time
 * - Smooth minimum (Quilez cubic): seamless stem↔knot ring transitions
 * - Order-independent multi-knot merging via pairwise delta summation
 * - Dead knots with butterfly distortion (smoothness inversion)
 * - Potential-flow deflection for grain fiber bending around knots
 * - Domain warping (FBM-fed noise) for organic, natural-looking flow
 *
 * Minimalist · Natural · Modern
 */

// ─── Simplex Noise ──────────────────────────────────────────────────────────

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const grad2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

let perm: Uint8Array;
let permMod8: Uint8Array;

function seedNoise(seed: number) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  perm = new Uint8Array(512);
  permMod8 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod8[i] = perm[i] % 8;
  }
}

function simplex2(x: number, y: number): number {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;

  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    const gi0 = permMod8[ii + perm[jj]];
    t0 *= t0;
    n0 = t0 * t0 * (grad2[gi0][0] * x0 + grad2[gi0][1] * y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    const gi1 = permMod8[ii + i1 + perm[jj + j1]];
    t1 *= t1;
    n1 = t1 * t1 * (grad2[gi1][0] * x1 + grad2[gi1][1] * y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    const gi2 = permMod8[ii + 1 + perm[jj + 1]];
    t2 *= t2;
    n2 = t2 * t2 * (grad2[gi2][0] * x2 + grad2[gi2][1] * y2);
  }
  return 70 * (n0 + n1 + n2);
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    value += simplex2(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return value / max;
}

// ─── Smooth Minimum ─────────────────────────────────────────────────────────

/**
 * Cubic polynomial smooth min (Inigo Quilez).
 * Returns a value ≤ min(a,b) that smoothly blends the two fields.
 * k controls fillet radius; k=0 degenerates to hard min.
 */
function sminCubic(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k / 6;
}

// ─── Color Palettes ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

interface WoodPalette {
  bg: RGB;
  earlywood: RGB[];
  latewood: RGB[];
  ray: RGB; // medullary ray highlight
}

// Dark mode: muted walnut — tones close together, no harsh dark lines
const darkPalette: WoodPalette = {
  bg: [22, 14, 7],
  earlywood: [
    [44, 30, 16],
    [50, 34, 18],
    [56, 38, 21],
  ],
  latewood: [
    [32, 20, 10],
    [36, 24, 12],
    [40, 27, 14],
  ],
  ray: [60, 42, 24],
};

// Light mode: pale ash — soft warm tones, barely-there grain
const lightPalette: WoodPalette = {
  bg: [220, 205, 183],
  earlywood: [
    [226, 212, 192],
    [220, 206, 185],
    [212, 197, 174],
  ],
  latewood: [
    [188, 170, 146],
    [180, 162, 138],
    [170, 152, 128],
  ],
  ray: [232, 220, 202],
};

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function sampleGradient(colors: RGB[], t: number): RGB {
  const c = Math.max(0, Math.min(1, t));
  const idx = c * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  return lerpRGB(colors[lo], colors[hi], idx - lo);
}

// ─── Knot Types ─────────────────────────────────────────────────────────────

interface Knot {
  px: number;           // position along grain (0-1)
  py: number;           // position across grain (0-1)
  rx: number;           // elliptical radius along grain (wider)
  ry: number;           // elliptical radius across grain (narrower)
  strength: number;     // visual prominence (0.6-1.0)
  ringCount: number;    // concentric ring cycles visible inside knot
  isDead: boolean;      // alive knots intergrow; dead knots separate
  deathTime: number;    // normalized time of death (0.1-0.5)
  kSmooth: number;      // base smoothness for smin fillet
  tilt: number;         // slight angular tilt of knot axis
}

function generateKnots(rng: () => number, count: number): Knot[] {
  const knots: Knot[] = [];
  for (let i = 0; i < count; i++) {
    const isDead = rng() > 0.42;
    knots.push({
      px: 0.15 + rng() * 0.70,
      py: 0.15 + rng() * 0.70,
      rx: 0.04 + rng() * 0.05,
      ry: 0.02 + rng() * 0.025,
      strength: 0.55 + rng() * 0.35,
      ringCount: 1.2 + rng() * 1.4,
      isDead,
      deathTime: isDead ? 0.12 + rng() * 0.30 : 1.0,
      kSmooth: 0.08 + rng() * 0.10,
      tilt: (rng() - 0.5) * 0.2,
    });
  }
  return knots;
}

// ─── Main Engine ────────────────────────────────────────────────────────────

export function initWoodGrainBackground() {
  const canvas = document.getElementById('wood-grain-bg') as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false })!;
  if (!ctx) return;

  const globalSeed = (Date.now() ^ (Math.random() * 0x7fffffff)) & 0x7fffffff;
  seedNoise(globalSeed);

  let _rngState = globalSeed;
  const renderSeed = globalSeed;
  function rng(): number {
    _rngState = (_rngState * 16807 + 0) % 2147483647;
    return (_rngState - 1) / 2147483646;
  }

  let W = 0;
  let H = 0;
  let isPortrait = false;
  let palette = getCurrentPalette();
  let firstRender = true;
  let staticGrain: HTMLCanvasElement | null = null;
  let rafId = 0;

  function getCurrentPalette(): WoodPalette {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'light' ? lightPalette : darkPalette;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas!.width = W * dpr;
    canvas!.height = H * dpr;
    canvas!.style.width = W + 'px';
    canvas!.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    palette = getCurrentPalette();
    renderWoodGrain();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIXEL-BASED WOOD GRAIN — time-field model with smooth-minimum knots
  // ═══════════════════════════════════════════════════════════════════════════

  function renderWoodGrain() {
    // Restore RNG so every re-render (theme switch, resize) produces
    // the same pattern — only the palette changes.
    _rngState = renderSeed;

    const scale = 0.5;
    const pw = Math.ceil(W * scale);
    const ph = Math.ceil(H * scale);

    const offscreen = document.createElement('canvas');
    offscreen.width = pw;
    offscreen.height = ph;
    const octx = offscreen.getContext('2d')!;
    const imageData = octx.createImageData(pw, ph);
    const data = imageData.data;

    // Sparse knots — minimalist: 1-2
    const area = W * H;
    const knotCount = Math.max(1, Math.min(2, Math.floor(area / 1200000)));
    const knots = generateKnots(rng, knotCount);

    // Unique offsets for this render
    const offA = rng() * 500;
    const offB = rng() * 500;
    const offC = rng() * 500;
    const offD = rng() * 500;
    const offE = rng() * 500;

    // Grain orientation: run along the longer axis so veins always look
    // smooth and parallel regardless of viewport aspect ratio.
    isPortrait = H > W;

    // Ring density — scaled to physical viewport size so a ring occupies
    // roughly the same real-world width on every screen. The reference is
    // 1080 CSS px (desktop secondary dimension); narrower viewports get
    // proportionally fewer rings so they don't appear compressed.
    const secondaryPx = isPortrait ? W : H;
    const ringDensity = (9 + rng() * 5) * (secondaryPx / 1080);

    // Domain warp normalization: cross-grain warp displacement in pixels is
    // proportional to the cross-grain dimension, but ring spacing is constant
    // (~1080/ringBase px). On screens where the cross-grain dimension exceeds
    // 1080 the warp would exceed ring spacing → rings zigzag → chaotic.
    const warpNorm = Math.min(1.0, 1080 / secondaryPx);

    // Dead-wood core color
    const knotCoreR = palette.latewood[0][0] * 0.25;
    const knotCoreG = palette.latewood[0][1] * 0.22;
    const knotCoreB = palette.latewood[0][2] * 0.20;

    for (let iy = 0; iy < ph; iy++) {
      for (let ix = 0; ix < pw; ix++) {
        const idx = (iy * pw + ix) * 4;
        const nx = ix / pw;
        const ny = iy / ph;

        // Grain-space coordinates — grain runs along the longer axis
        let across: number, along: number;
        if (isPortrait) {
          across = nx;
          along = ny;
        } else {
          across = ny;
          along = nx;
        }

        // ── DOMAIN WARPING ──
        // Two-layer warp for organic, flowing grain.
        // Stretched along grain direction (4x) so warp creates long flowing curves.
        const w1x = fbm(along * 2.0 + offA, across * 4.0 + offA, 4);
        const w1y = fbm(along * 2.0 + offB + 100, across * 4.0 + offB + 100, 4);
        const wAcross = across + w1y * 0.05 * warpNorm;
        const wAlong = along + w1x * 0.018;
        const w2 = fbm(wAlong * 5.0 + offC, wAcross * 8.0 + offC + 200, 3);
        const fAcross = wAcross + w2 * 0.016 * warpNorm;

        // ── POTENTIAL-FLOW GRAIN DEFLECTION ──
        // Bends the stem grain contours laterally around each knot.
        // ψ = across − dc·ry / max(1, r²)
        let grainAcross = fAcross;
        for (const knot of knots) {
          const da = (wAlong - knot.px) / knot.rx;
          const dc = (fAcross - knot.py) / knot.ry;
          const r2 = da * da + dc * dc;
          if (r2 < 50.0) {
            const r2s = Math.max(1.0, r2);
            const st = r2 < 1.0 ? 1.0 : knot.strength;
            grainAcross -= (dc * knot.ry / r2s) * st;
          }
        }

        // ── STEM TIME FIELD ──
        // On a tangential cut the across-grain coordinate maps to
        // radial distance from the pith. Multiplied by ring density
        // to produce the oscillating ring pattern.
        const stemTime = grainAcross * ringDensity;

        // ── KNOT TIME FIELDS — order-independent smooth-min merge ──
        // Paper §4.2.3: pairwise deltas summed onto the hard minimum
        // so the result is independent of knot iteration order.
        let hardMinAll = stemTime;
        let smoothDeltaSum = 0;
        let knotDarken = 0;

        for (const knot of knots) {
          // Rotated elliptical distance (uses warped, non-deflected coords
          // so the knot field is purely radial from the knot center)
          const dx = wAlong - knot.px;
          const dy = fAcross - knot.py;
          const ca = Math.cos(knot.tilt);
          const sa = Math.sin(knot.tilt);
          const da = (dx * ca + dy * sa) / knot.rx;
          const dc = (-dx * sa + dy * ca) / knot.ry;
          const r2 = da * da + dc * dc;
          const r = Math.sqrt(r2);

          if (r > 4.5) continue;

          // Noise perturbation — applied only inside the knot and faded
          // to zero at the boundary so the outer edge stays clean.
          const kn = fbm(da * 3.0 + knot.px * 40, dc * 3.0 + knot.py * 40, 3);
          const boundaryFade = Math.max(0, 1.0 - r / 0.85);
          const pertR = r + kn * 0.15 * boundaryFade;

          // Knot time field — anchored so that at the knot boundary (r≈1)
          // knotTime matches the stem's time value at the knot position.
          // Inside the knot (r<1) knotTime < stemTime → knot rings visible.
          // Outside (r>1) knotTime > stemTime → stem rings take over.
          const stemTimeAtKnot = knot.py * ringDensity;
          const knotTime = stemTimeAtKnot + (pertR - 1.0) * knot.ringCount;

          // Hard minimum across all fields
          hardMinAll = Math.min(hardMinAll, knotTime);

          // Uniform smoothness — constant k gives a consistently smooth
          // boundary all the way around the knot, no angular artifacts.
          const kAdaptive = knot.kSmooth * ringDensity;

          // Pairwise smooth min
          const pairSmin = sminCubic(stemTime, knotTime, kAdaptive);
          const pairHardMin = Math.min(stemTime, knotTime);
          let delta = pairSmin - pairHardMin; // always ≤ 0

          // Spatial falloff — delta fades beyond the knot's direct influence
          const spatialFade = r < 2.0 ? 1.0 : Math.max(0, 1.0 - (r - 2.0) / 2.5);
          delta *= spatialFade;

          smoothDeltaSum += delta;

          // ── CORE DARKENING ──
          // Paper §4.3: dead-wood core + knot color darkening
          if (r < 0.28) {
            const coreFade = 1.0 - r / 0.28;
            const coreFade2 = coreFade * coreFade;
            const baseStr = knot.isDead ? 0.70 : 0.35;
            knotDarken = Math.max(knotDarken, coreFade2 * baseStr * knot.strength);
          }

          // Dead knot — subtle darkening near the boundary via a soft ring,
          // wide enough to stay smooth rather than creating a hard edge.
          if (knot.isDead) {
            const outW = 0.18 + 0.06 * knot.strength;
            const outD = Math.abs(r - 1.0);
            if (outD < outW) {
              const outline = Math.pow(1.0 - outD / outW, 3) * 0.15 * knot.strength;
              knotDarken = Math.max(knotDarken, outline);
            }
          }
        }

        // Final merged time field
        let mergedTime = hardMinAll + smoothDeltaSum;

        // ── GROWTH IRREGULARITY ──
        // Real trees grow unevenly year to year
        const growthVar = fbm(mergedTime * 0.5 + offD, wAlong * 3.0, 2);
        mergedTime += growthVar * 0.25;

        // ── RING PATTERN — asymmetric earlywood / latewood ──
        // pow(abs(sin), exp): low exponent = sharp dark lines with wide
        // light bands, matching natural wood ring asymmetry.
        const ringPhase = mergedTime * Math.PI * 2;
        const absSin = Math.abs(Math.sin(ringPhase));
        const sharpNoise = fbm(
          wAlong * 3.0 + offD + 300,
          wAcross * 3.0 + offD + 300,
          2
        );
        const exponent = 0.55 + sharpNoise * 0.20;
        const ringProfile = Math.pow(absSin, exponent);
        const latewood = 1.0 - ringProfile;

        // ── MEDULLARY RAYS ──
        // Subtle perpendicular highlights (across-grain) — visible in
        // real wood as short flecks on tangential cuts.
        const rayNoise = simplex2(along * 80 + offE, across * 200 + offE);
        const rayMask = simplex2(along * 12 + offE + 50, across * 2 + offE + 50);
        const rayIntensity = Math.max(0, rayNoise) * Math.max(0, rayMask) * 0.10;

        // ── COLOR MAPPING ──
        const colorVar = fbm(nx * 3.0 + offA + 400, ny * 3.0 + offB + 400, 3);
        const colorT = Math.max(0, Math.min(1, 0.5 + colorVar * 0.5));

        const earlyColor = sampleGradient(palette.earlywood, colorT);
        const lateColor = sampleGradient(palette.latewood, colorT);
        let [cr, cg, cb] = lerpRGB(earlyColor, lateColor, latewood);

        // Medullary ray highlight
        if (rayIntensity > 0.001) {
          cr += (palette.ray[0] - cr) * rayIntensity;
          cg += (palette.ray[1] - cg) * rayIntensity;
          cb += (palette.ray[2] - cb) * rayIntensity;
        }

        // Subtle depth variation
        const depth = fbm(nx * 6.0 + 500, ny * 6.0 + 500, 2);
        const brightness = 0.99 + depth * 0.03;

        // Blend toward dead-wood core
        const finalR = cr * brightness * (1 - knotDarken) + knotCoreR * knotDarken;
        const finalG = cg * brightness * (1 - knotDarken) + knotCoreG * knotDarken;
        const finalB = cb * brightness * (1 - knotDarken) + knotCoreB * knotDarken;

        data[idx]     = Math.max(0, Math.min(255, finalR));
        data[idx + 1] = Math.max(0, Math.min(255, finalG));
        data[idx + 2] = Math.max(0, Math.min(255, finalB));
        data[idx + 3] = 255;
      }
    }

    octx.putImageData(imageData, 0, 0);

    // Scale up with bilinear smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);

    // Overlay passes
    renderFiberLines(knots, ctx);
    renderMicroTexture();

    // Cache the fully-rendered frame for animation
    const cw = canvas!.width;
    const ch = canvas!.height;
    if (!staticGrain || staticGrain.width !== cw || staticGrain.height !== ch) {
      staticGrain = document.createElement('canvas');
      staticGrain.width = cw;
      staticGrain.height = ch;
    }
    staticGrain.getContext('2d')!.drawImage(canvas!, 0, 0);

    // Fade in on first render — html bg color is already set so there's
    // no white flash, just a smooth shift from flat color to texture.
    if (firstRender) {
      firstRender = false;
      requestAnimationFrame(() => { canvas!.style.opacity = '1'; });
      startAnimLoop();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIBER LINE OVERLAY — fine grain lines that follow the deflected field
  // ═══════════════════════════════════════════════════════════════════════════

  function renderFiberLines(knots: Knot[], c: CanvasRenderingContext2D) {
    // Fiber lines follow the grain direction (along the longer axis)
    const primaryLen = isPortrait ? H : W;
    const secondaryLen = isPortrait ? W : H;
    // Scale fiber line spacing with the viewport, matching the ring density scaling.
    const lineSpacing = 6 * (secondaryLen / 1080);
    const lineCount = Math.floor(secondaryLen / lineSpacing);

    // Cross-grain warp scale: keeps pixel displacement a consistent fraction
    // of line length (primaryLen) across all aspect ratios.
    // Reference: 1920×1080 landscape → scale = 1.0 (preserves current look).
    // Taller viewports get a smaller coefficient so lines stay smooth.
    const warpScale = Math.min(1.0, (primaryLen * 1080) / (secondaryLen * 1920));

    for (let i = 0; i < lineCount; i++) {
      const baseT = i / lineCount;

      const prominence = simplex2(baseT * 30.0 + 500, 0.5);
      if (prominence < 0.18) continue;

      const isStrong = prominence > 0.55;
      const alpha = isStrong ? 0.02 + rng() * 0.03 : 0.006 + rng() * 0.012;
      const lineWidth = isStrong ? 0.4 + rng() * 0.7 : 0.15 + rng() * 0.35;

      const colorT = 0.3 + rng() * 0.4;
      const [lr, lg, lb] = sampleGradient(palette.latewood, colorT);

      c.strokeStyle = `rgba(${lr | 0},${lg | 0},${lb | 0},${alpha})`;
      c.lineWidth = lineWidth;
      c.lineCap = 'round';
      c.beginPath();

      const steps = Math.max(60, Math.floor(primaryLen / 10));
      let prevX = 0, prevY = 0;

      for (let si = 0; si <= steps; si++) {
        const along = si / steps;
        const across = baseT;

        // Domain warp (matches pixel pass, 3 octaves for speed)
        const w1 = fbm(along * 2.0, across * 4.0, 3);
        const w2l = fbm(along * 2.0 + 100, across * 4.0 + 100, 3);
        const wa = across + w2l * 0.06 * warpScale;
        const wl = along + w1 * 0.02;
        const w3 = fbm(wl * 5.0, wa * 8.0 + 200, 2);
        let fA = wa + w3 * 0.02 * warpScale;

        // Potential-flow knot deflection + dead-knot butterfly
        for (const knot of knots) {
          const da = (wl - knot.px) / knot.rx;
          const dc = (fA - knot.py) / knot.ry;
          const r2 = da * da + dc * dc;
          if (r2 < 50.0) {
            const r2s = Math.max(1.0, r2);
            // Soften deflection inside the knot to avoid line convergence
            const st = r2 < 1.0
              ? knot.strength * 0.5
              : knot.strength;
            fA -= (dc * knot.ry / r2s) * st;

            // Butterfly deflection for dead knots
            if (knot.isDead && r2 > 0.15 && r2 < 9.0) {
              const r = Math.sqrt(r2);
              const angle = Math.atan2(dc, da);
              const bf = Math.cos(2 * angle) * 0.005
                * Math.exp(-r * 0.5) * knot.strength;
              fA += bf;
            }
          }
        }

        const pos = fA * secondaryLen;
        const prim = along * primaryLen;
        // In portrait, grain runs vertically so swap axes
        const cx = isPortrait ? pos : prim;
        const cy = isPortrait ? prim : pos;

        if (si === 0) {
          c.moveTo(cx, cy);
        } else {
          // Skip degenerate micro-segments — they cause pixelation
          const dx = cx - prevX;
          const dy = cy - prevY;
          if (dx * dx + dy * dy < 1.0) continue;
          const mx = (prevX + cx) / 2;
          const my = (prevY + cy) / 2;
          c.quadraticCurveTo(prevX, prevY, mx, my);
        }
        prevX = cx;
        prevY = cy;
      }
      c.stroke();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MICRO TEXTURE — subtle surface grain noise
  // ═══════════════════════════════════════════════════════════════════════════

  function renderMicroTexture() {
    const tw = Math.ceil(W / 3);
    const th = Math.ceil(H / 3);
    const off = document.createElement('canvas');
    off.width = tw;
    off.height = th;
    const tctx = off.getContext('2d')!;
    const img = tctx.createImageData(tw, th);
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 8;
      d[i] = 128 + n;
      d[i + 1] = 128 + n;
      d[i + 2] = 128 + n;
      d[i + 3] = 4;
    }
    tctx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, W, H);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIMATION LOOP — slow ambient shimmer over the static grain
  // ═══════════════════════════════════════════════════════════════════════════

  function startAnimLoop() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(rafId);
    const t0 = performance.now();

    function frame(ts: number) {
      if (staticGrain) {
        const t = (ts - t0) * 0.001;

        // Slow breathing scale — the entire grain gently pulses.
        // ±0.3% scale oscillating over ~20s, centered on the viewport.
        // Combined with a very slow drift (±4px) so it feels organic.
        const breathe = 1.0 + 0.003 * Math.sin(t * 0.314);   // ~20s period
        const driftX  = 4.0 * Math.sin(t * 0.227);            // ~28s period
        const driftY  = 2.5 * Math.cos(t * 0.169);            // ~37s period

        ctx.save();
        ctx.translate(W / 2 + driftX, H / 2 + driftY);
        ctx.scale(breathe, breathe);
        ctx.translate(-W / 2, -H / 2);
        ctx.drawImage(staticGrain, 0, 0, W, H);
        ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
  }

  // ─── Theme observer ───────────────────────────────────────────────────────
  const observer = new MutationObserver(() => {
    palette = getCurrentPalette();
    resize();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // ─── Debounced resize ─────────────────────────────────────────────────────
  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  window.addEventListener('resize', onResize);
  resize();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', onResize);
    cancelAnimationFrame(rafId);
  };
}
