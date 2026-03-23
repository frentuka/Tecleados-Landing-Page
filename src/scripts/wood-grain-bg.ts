/**
 * Wood Grain Background — Realistic procedural wood texture
 *
 * Uses domain warping + asymmetric ring profiles to produce natural-looking
 * wood grain. Each page load generates a unique pattern.
 *
 * Key techniques for realism:
 * - Domain warping (noise fed into noise) for organic flow
 * - Anisotropic distortion (stretched along grain direction)
 * - Asymmetric ring profile (wide earlywood, sharp latewood lines)
 * - Multiple knots with proper concentric ring integration
 *
 * Orientation: horizontal grain in landscape, vertical in portrait.
 * Theme-aware: dark stained wood / light bleached wood.
 */

// ─── Simplex Noise ───────────────────────────────────────────────────────────

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

// FBM — smooth layered noise
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

// ─── Color Palettes ──────────────────────────────────────────────────────────

type RGB = [number, number, number];

interface WoodPalette {
  bg: RGB;
  // Earlywood (wide light bands) and latewood (narrow dark lines)
  earlywood: RGB[];   // 2-3 colors to lerp between
  latewood: RGB[];    // 2-3 colors for the dark grain lines
}

// Dark mode: sleek ebony / dark stained wood
const darkPalette: WoodPalette = {
  bg: [20, 20, 18],
  earlywood: [
    [38, 35, 30],     // dark warm
    [48, 42, 34],     // mid
    [56, 48, 38],     // lightest early (still dark)
  ],
  latewood: [
    [16, 15, 12],     // deepest dark line
    [24, 22, 18],     // mid dark line
    [32, 28, 22],     // lighter dark line
  ],
};

// Light mode: bleached / limed oak
const lightPalette: WoodPalette = {
  bg: [250, 248, 243],
  earlywood: [
    [240, 236, 228],  // lightest
    [235, 228, 218],  // mid
    [228, 220, 208],  // darkest early
  ],
  latewood: [
    [195, 182, 165],  // darkest line
    [210, 200, 185],  // mid
    [222, 214, 202],  // lightest line
  ],
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

// ─── Knot ────────────────────────────────────────────────────────────────────

interface Knot {
  // Normalized position (0-1)
  px: number;   // along primary axis
  py: number;   // along secondary axis
  // Radii (normalized) — elliptical knots
  rx: number;   // along grain (wider)
  ry: number;   // across grain (narrower)
  strength: number;
  ringTightness: number;
}

function generateKnots(rng: () => number, count: number): Knot[] {
  const knots: Knot[] = [];
  for (let i = 0; i < count; i++) {
    knots.push({
      px: 0.05 + rng() * 0.9,
      py: 0.08 + rng() * 0.84,
      rx: 0.06 + rng() * 0.10,     // wider along grain
      ry: 0.03 + rng() * 0.06,     // narrower across grain
      strength: 0.5 + rng() * 0.5,
      ringTightness: 15 + rng() * 25,
    });
  }
  return knots;
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export function initWoodGrainBackground() {
  const canvas = document.getElementById('wood-grain-bg') as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false })!;
  if (!ctx) return;

  // Random seed on every page load
  const globalSeed = (Date.now() ^ (Math.random() * 0x7fffffff)) & 0x7fffffff;
  seedNoise(globalSeed);

  // Seeded PRNG for deterministic randomness within a single render
  let _rngState = globalSeed;
  function rng(): number {
    _rngState = (_rngState * 16807 + 0) % 2147483647;
    return (_rngState - 1) / 2147483646;
  }

  let W = 0;
  let H = 0;
  let isPortrait = false;
  let palette = getCurrentPalette();

  function getCurrentPalette(): WoodPalette {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'light' ? lightPalette : darkPalette;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    isPortrait = H > W;
    canvas!.width = W * dpr;
    canvas!.height = H * dpr;
    canvas!.style.width = W + 'px';
    canvas!.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    palette = getCurrentPalette();
    renderWoodGrain();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIXEL-BASED WOOD GRAIN with domain warping
  // ═══════════════════════════════════════════════════════════════════════════

  function renderWoodGrain() {
    // Render at reduced resolution for performance
    const scale = 0.5;
    const pw = Math.ceil(W * scale);
    const ph = Math.ceil(H * scale);

    const offscreen = document.createElement('canvas');
    offscreen.width = pw;
    offscreen.height = ph;
    const octx = offscreen.getContext('2d')!;
    const imageData = octx.createImageData(pw, ph);
    const data = imageData.data;

    // Generate knots — more of them for richer character
    const area = W * H;
    const knotCount = Math.max(3, Math.floor(area / 180000));
    const knots = generateKnots(rng, knotCount);

    // Random offsets to make each render unique even with same noise
    const offsetA = rng() * 500;
    const offsetB = rng() * 500;
    const offsetC = rng() * 500;
    const offsetD = rng() * 500;

    // Ring density — how many ring cycles are visible
    const ringDensity = 10 + rng() * 6;

    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const idx = (py * pw + px) * 4;

        // Normalized coordinates
        const nx = px / pw;
        const ny = py / ph;

        // ── Grain-space coordinates ──
        // "across" = perpendicular to grain (drives ring pattern)
        // "along" = parallel to grain direction
        let across: number;
        let along: number;
        if (isPortrait) {
          across = nx;
          along = ny;
        } else {
          across = ny;
          along = nx;
        }

        // ── DOMAIN WARPING ──
        // This is the key to organic, natural-looking flow.
        // We warp the coordinates before computing the grain pattern.

        // First warp layer: large-scale flowing distortion
        // Stretch along grain direction (4x) so warp creates long flowing curves
        const warp1x = fbm(along * 2.0 + offsetA, across * 4.0 + offsetA, 4);
        const warp1y = fbm(along * 2.0 + offsetB + 100, across * 4.0 + offsetB + 100, 4);

        // Anisotropic: strong warp perpendicular to grain, gentle along grain
        const warpedAcross = across + warp1y * 0.06;
        const warpedAlong = along + warp1x * 0.02;

        // Second warp layer: medium-scale detail
        const warp2 = fbm(
          warpedAlong * 5.0 + offsetC,
          warpedAcross * 8.0 + offsetC + 200,
          3
        );
        const finalAcross = warpedAcross + warp2 * 0.02;

        // ── KNOT DISTORTION ──
        // Near knots, the "across" coordinate blends toward radial distance,
        // making rings become concentric around the knot center.
        let grainValue = finalAcross;

        for (const knot of knots) {
          // Distance from knot center in grain-space (elliptical)
          const da = (warpedAlong - knot.px) / knot.rx;
          const dc = (finalAcross - knot.py) / knot.ry;
          const ellipDist = Math.sqrt(da * da + dc * dc);

          if (ellipDist < 3.0) {
            // Blend between straight grain and concentric rings
            // Closer to knot center = more concentric
            const blend = Math.exp(-ellipDist * 1.2) * knot.strength;

            // Radial distance creates concentric rings
            const radialGrain = ellipDist * knot.ry * 0.5 + knot.py;

            grainValue = grainValue * (1 - blend) + radialGrain * blend;

            // Also add tight ring oscillation near knot
            if (ellipDist < 2.0 && ellipDist > 0.15) {
              const ringOsc = Math.sin(ellipDist * knot.ringTightness) *
                Math.exp(-ellipDist * 1.5) * 0.008 * knot.strength;
              grainValue += ringOsc;
            }
          }
        }

        // ── RING PATTERN ──
        // Asymmetric profile: wide smooth earlywood, narrow sharp latewood
        const ringPhase = grainValue * ringDensity * Math.PI * 2;
        const sinVal = Math.sin(ringPhase);

        // Use pow(abs(sin), exponent) to control ring shape:
        // Low exponent = sharp dark lines with wide light areas (like real wood)
        const absSin = Math.abs(sinVal);

        // Vary the sharpness across the surface for natural inconsistency
        const sharpnessNoise = fbm(
          warpedAlong * 3.0 + offsetD + 300,
          warpedAcross * 3.0 + offsetD + 300,
          2
        );
        const exponent = 0.3 + sharpnessNoise * 0.15;
        const ringProfile = Math.pow(absSin, exponent);

        // ringProfile is ~1 in wide earlywood areas, drops sharply to 0 at latewood lines
        // Invert: 0 = earlywood (light), 1 = latewood (dark line)
        const latewoodIntensity = 1 - ringProfile;

        // ── COLOR MAPPING ──
        // Gradual variation across the surface
        const colorVariation = fbm(nx * 3 + offsetA + 400, ny * 3 + offsetB + 400, 3);
        const colorT = Math.max(0, Math.min(1, 0.5 + colorVariation * 0.5));

        const earlyColor = sampleGradient(palette.earlywood, colorT);
        const lateColor = sampleGradient(palette.latewood, colorT);

        // Blend earlywood ↔ latewood based on ring profile
        const [r, g, b] = lerpRGB(earlyColor, lateColor, latewoodIntensity);

        // ── SUBTLE DEPTH ──
        const depth = fbm(nx * 6 + 500, ny * 6 + 500, 2);
        const brightness = 0.96 + depth * 0.08;

        data[idx] = Math.max(0, Math.min(255, r * brightness));
        data[idx + 1] = Math.max(0, Math.min(255, g * brightness));
        data[idx + 2] = Math.max(0, Math.min(255, b * brightness));
        data[idx + 3] = 255;
      }
    }

    octx.putImageData(imageData, 0, 0);

    // Scale up with bilinear smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);

    // ── Overlay passes ──
    renderGrainLines(knots);
    renderMicroTexture();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GRAIN LINE OVERLAY — adds fine definition on top of pixel base
  // ═══════════════════════════════════════════════════════════════════════════

  function renderGrainLines(knots: Knot[]) {
    const primaryLen = isPortrait ? H : W;
    const secondaryLen = isPortrait ? W : H;
    const lineCount = Math.floor(secondaryLen / 5);

    for (let i = 0; i < lineCount; i++) {
      const baseT = i / lineCount;

      const prominence = simplex2(baseT * 30.0 + 500, 0.5);
      if (prominence < 0.15) continue;

      const isStrong = prominence > 0.55;
      const alpha = isStrong ? 0.05 + rng() * 0.07 : 0.015 + rng() * 0.025;
      const lineWidth = isStrong ? 0.5 + rng() * 0.8 : 0.2 + rng() * 0.4;

      const colorT = 0.3 + rng() * 0.4;
      const [r, g, b] = sampleGradient(palette.latewood, colorT);

      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();

      const steps = Math.max(60, Math.floor(primaryLen / 10));
      let prevX = 0, prevY = 0;

      for (let s = 0; s <= steps; s++) {
        const along = s / steps;
        const across = baseT;

        // Domain warp matching the pixel pass
        const w1 = fbm(along * 2.0, across * 4.0, 3);
        const w2 = fbm(along * 2.0 + 100, across * 4.0 + 100, 3);
        const wa = across + w2 * 0.06;
        const wl = along + w1 * 0.02;

        const w3 = fbm(wl * 5.0, wa * 8.0 + 200, 2);
        let finalAcross = wa + w3 * 0.02;

        // Knot bending
        for (const knot of knots) {
          const da = (wl - knot.px) / knot.rx;
          const dc = (finalAcross - knot.py) / knot.ry;
          const ed = Math.sqrt(da * da + dc * dc);
          if (ed < 3.0) {
            const blend = Math.exp(-ed * 1.2) * knot.strength;
            const radial = ed * knot.ry * 0.5 + knot.py;
            finalAcross = finalAcross * (1 - blend) + radial * blend;
          }
        }

        const pos = finalAcross * secondaryLen;
        const prim = along * primaryLen;
        const cx = isPortrait ? pos : prim;
        const cy = isPortrait ? prim : pos;

        if (s === 0) {
          ctx.moveTo(cx, cy);
        } else {
          const mx = (prevX + cx) / 2;
          const my = (prevY + cy) / 2;
          ctx.quadraticCurveTo(prevX, prevY, mx, my);
        }
        prevX = cx;
        prevY = cy;
      }
      ctx.stroke();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MICRO TEXTURE
  // ═══════════════════════════════════════════════════════════════════════════

  function renderMicroTexture() {
    const tw = Math.ceil(W / 3);
    const th = Math.ceil(H / 3);
    const offscreen = document.createElement('canvas');
    offscreen.width = tw;
    offscreen.height = th;
    const octx = offscreen.getContext('2d')!;
    const imageData = octx.createImageData(tw, th);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      d[i] = 128 + n;
      d[i + 1] = 128 + n;
      d[i + 2] = 128 + n;
      d[i + 3] = 5;
    }
    octx.putImageData(imageData, 0, 0);
    ctx.drawImage(offscreen, 0, 0, W, H);
  }

  // ─── Mouse parallax ───
  let targetOX = 0, targetOY = 0;
  let curOX = 0, curOY = 0;
  let animId = 0;
  let parallaxActive = false;

  function onMouseMove(e: MouseEvent) {
    targetOX = (e.clientX / W - 0.5) * -6;
    targetOY = (e.clientY / H - 0.5) * -6;
    if (!parallaxActive) {
      parallaxActive = true;
      animId = requestAnimationFrame(parallaxLoop);
    }
  }

  function parallaxLoop() {
    curOX += (targetOX - curOX) * 0.08;
    curOY += (targetOY - curOY) * 0.08;
    canvas!.style.transform = `translate(${curOX}px, ${curOY}px)`;
    if (Math.abs(targetOX - curOX) > 0.01 || Math.abs(targetOY - curOY) > 0.01) {
      animId = requestAnimationFrame(parallaxLoop);
    } else {
      parallaxActive = false;
    }
  }

  // ─── Theme observer ───
  const observer = new MutationObserver(() => {
    palette = getCurrentPalette();
    // Re-render (keeps same seed/knots since rng state persists)
    resize();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // ─── Debounced resize ───
  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }

  // ─── Init ───
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  resize();

  return () => {
    cancelAnimationFrame(animId);
    observer.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
  };
}
