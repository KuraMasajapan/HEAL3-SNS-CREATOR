/**
 * HEAL3 SNS-Creator - Sunlight Mask v2 (天から差し込む光の帯・光芒 / God Rays & Crepuscular Beams)
 *
 * Atmospheric Sunlight Layer:
 * - Expresses gentle, ethereal light rays (光帯・光芒) streaming down at a diagonal angle from the upper sky.
 * - Each beam has a smooth volumetric gradient (brightest along its spine, seamlessly feathering outwards).
 * - Light beams drift slowly sideways/diagonally with an organic breathing cycle in opacity and width.
 * - Illuminates softly only where beams fall; avoids flat overall washing out or harsh lens flare/glare.
 * - Replaced bubbling/ascending micro particles with a very minimal set (3-6) of barely visible,
 *   slow-floating sunlit atmospheric dust motes (微細な光埃) with NO bubble-like upward motion.
 * - Seamless loop (default 4800ms period) ensures preview and static/video/GIF export look identical.
 * - Weak / Medium / Strong intensity tiers crafted strictly for flattering SNS portrait/result aesthetics.
 */

import { MaskConfig, MaskIntensity } from '../types.ts';

export const SUNLIGHT_LOOP_PERIOD_MS = 4800;

/**
 * Volumetric Light Beam (光帯・光芒) Definition
 */
interface SunlightBeam {
  id: number;
  /** Normalized anchor X at the top boundary (or slightly above) */
  originX: number;
  /** Normalized anchor Y above viewport */
  originY: number;
  /** Direction angle in radians (pointing down-right, e.g. ~62 to 74 degrees) */
  baseAngle: number;
  /** Length multiplier relative to canvas height */
  lengthScale: number;
  /** Beam width scale at origin */
  topWidthScale: number;
  /** Beam width scale at terminus (fanning out downwards) */
  bottomWidthScale: number;
  /** Horizontal sway amplitude for origin anchor */
  swayOriginXAmp: number;
  /** Angle fluctuation amplitude (radians) */
  swayAngleAmp: number;
  /** Harmonic frequency multipliers for seamless loop */
  harmonic: number;
  /** Phase offset in radians */
  phase: number;
  /** Secondary slow breath phase offset */
  breathPhase: number;
  /** Base opacity of the central beam spine */
  baseAlpha: number;
  /** Opacity breathing amplitude */
  alphaAmp: number;
  /** Core spine tint (rgba prefix, e.g. 'rgba(255, 252, 235, ') */
  coreColor: string;
  /** Flank warm tint (rgba prefix, e.g. 'rgba(254, 240, 138, ') */
  flankColor: string;
  /** Internal subtle foliage shadow mottling frequency */
  mottlingHarmonic: number;
}

/**
 * Minimal Sunlit Dust Mote (微細な光埃 - 泡のような上昇ではなく、空中に静かに漂う微小粒子)
 */
interface SunlitDustMote {
  id: number;
  /** Static base normalized anchor X */
  baseX: number;
  /** Static base normalized anchor Y */
  baseY: number;
  /** Gentle hovering excursion radius */
  hoverRadiusX: number;
  hoverRadiusY: number;
  /** Harmonic frequencies */
  freqX: number;
  freqY: number;
  phaseX: number;
  phaseY: number;
  /** Size scale (radius) */
  radiusScale: number;
  /** Subtle twinkle */
  twinklePhase: number;
  baseAlpha: number;
}

/**
 * Preset Catalog of Sunlight Beams (2 to 4 streams angled from upper-left to lower-right)
 */
const SUNLIGHT_BEAMS: SunlightBeam[] = [
  // Beam 0: Primary soft main beam (slanted gracefully across the upper and right canvas)
  {
    id: 0,
    originX: 0.18,
    originY: -0.15,
    baseAngle: Math.PI * 0.38, // ~68.4 deg
    lengthScale: 1.55,
    topWidthScale: 0.14,
    bottomWidthScale: 0.38,
    swayOriginXAmp: 0.045,
    swayAngleAmp: 0.035,
    harmonic: 1,
    phase: 0.0,
    breathPhase: 0.2,
    baseAlpha: 0.16,
    alphaAmp: 0.045,
    coreColor: 'rgba(255, 253, 242, ',
    flankColor: 'rgba(254, 243, 199, ',
    mottlingHarmonic: 1,
  },
  // Beam 1: Secondary beam (offset to the right, softer and broader)
  {
    id: 1,
    originX: 0.52,
    originY: -0.18,
    baseAngle: Math.PI * 0.40, // ~72 deg
    lengthScale: 1.60,
    topWidthScale: 0.16,
    bottomWidthScale: 0.44,
    swayOriginXAmp: 0.040,
    swayAngleAmp: 0.030,
    harmonic: 1,
    phase: 1.8,
    breathPhase: 2.1,
    baseAlpha: 0.14,
    alphaAmp: 0.040,
    coreColor: 'rgba(254, 249, 215, ',
    flankColor: 'rgba(253, 230, 138, ',
    mottlingHarmonic: 1,
  },
  // Beam 2: Tertiary slender beam (slanted across the upper-left, subtle canopy accent)
  {
    id: 2,
    originX: -0.05,
    originY: -0.10,
    baseAngle: Math.PI * 0.36, // ~64.8 deg
    lengthScale: 1.45,
    topWidthScale: 0.10,
    bottomWidthScale: 0.30,
    swayOriginXAmp: 0.035,
    swayAngleAmp: 0.025,
    harmonic: 1,
    phase: 3.4,
    breathPhase: 3.7,
    baseAlpha: 0.12,
    alphaAmp: 0.035,
    coreColor: 'rgba(255, 250, 230, ',
    flankColor: 'rgba(254, 240, 138, ',
    mottlingHarmonic: 1,
  },
  // Beam 3: Far right ambient stream (active on Strong tier to enrich depth)
  {
    id: 3,
    originX: 0.82,
    originY: -0.16,
    baseAngle: Math.PI * 0.42, // ~75.6 deg
    lengthScale: 1.50,
    topWidthScale: 0.15,
    bottomWidthScale: 0.42,
    swayOriginXAmp: 0.038,
    swayAngleAmp: 0.028,
    harmonic: 1,
    phase: 4.8,
    breathPhase: 5.1,
    baseAlpha: 0.13,
    alphaAmp: 0.035,
    coreColor: 'rgba(254, 243, 199, ',
    flankColor: 'rgba(252, 211, 77, ',
    mottlingHarmonic: 1,
  },
];

/**
 * Very minimal atmospheric floating dust motes (微細な光埃)
 * Fixed anchors that gently hover in microscopic 2D Lissajous paths, NO bubble rise.
 */
const SUNLIT_DUST_MOTES: SunlitDustMote[] = [
  {
    id: 0,
    baseX: 0.32,
    baseY: 0.35,
    hoverRadiusX: 0.015,
    hoverRadiusY: 0.012,
    freqX: 1,
    freqY: 1,
    phaseX: 0.3,
    phaseY: 0.7,
    radiusScale: 0.0028,
    twinklePhase: 0.5,
    baseAlpha: 0.32,
  },
  {
    id: 1,
    baseX: 0.68,
    baseY: 0.28,
    hoverRadiusX: 0.018,
    hoverRadiusY: 0.014,
    freqX: 1,
    freqY: 1,
    phaseX: 1.9,
    phaseY: 2.4,
    radiusScale: 0.0034,
    twinklePhase: 2.1,
    baseAlpha: 0.36,
  },
  {
    id: 2,
    baseX: 0.45,
    baseY: 0.62,
    hoverRadiusX: 0.012,
    hoverRadiusY: 0.015,
    freqX: 1,
    freqY: 1,
    phaseX: 3.5,
    phaseY: 4.1,
    radiusScale: 0.0026,
    twinklePhase: 3.8,
    baseAlpha: 0.28,
  },
  {
    id: 3,
    baseX: 0.80,
    baseY: 0.55,
    hoverRadiusX: 0.016,
    hoverRadiusY: 0.013,
    freqX: 1,
    freqY: 1,
    phaseX: 4.8,
    phaseY: 5.3,
    radiusScale: 0.0032,
    twinklePhase: 5.0,
    baseAlpha: 0.34,
  },
  {
    id: 4,
    baseX: 0.22,
    baseY: 0.70,
    hoverRadiusX: 0.014,
    hoverRadiusY: 0.012,
    freqX: 1,
    freqY: 1,
    phaseX: 1.2,
    phaseY: 1.6,
    radiusScale: 0.0030,
    twinklePhase: 1.4,
    baseAlpha: 0.30,
  },
];

/**
 * Intensity parameters for Sunlight Mask v2
 */
interface IntensityConfig {
  beamCount: number;
  beamAlphaMult: number;
  beamWidthMult: number;
  ambientWarmthAlpha: number;
  dustMoteCount: number;
}

const INTENSITY_CONFIGS: Record<MaskIntensity, IntensityConfig> = {
  weak: {
    beamCount: 2, // 2 delicate, whisper-soft light streams
    beamAlphaMult: 0.70,
    beamWidthMult: 0.85,
    ambientWarmthAlpha: 0.020,
    dustMoteCount: 2, // only 2 tiny dust specks
  },
  medium: {
    beamCount: 3, // 3 standard, natural morning/afternoon sunbeams
    beamAlphaMult: 1.0,
    beamWidthMult: 1.0,
    ambientWarmthAlpha: 0.035,
    dustMoteCount: 3, // 3 tiny dust specks
  },
  strong: {
    beamCount: 4, // 4 rich sunbeams with slightly fuller presence
    beamAlphaMult: 1.30,
    beamWidthMult: 1.15,
    ambientWarmthAlpha: 0.055,
    dustMoteCount: 5, // 5 tiny dust specks max
  },
};

/**
 * Render Sunlight Mask v2 onto the 2D Canvas context.
 *
 * Guaranteed characteristics:
 * - 2 to 4 diagonal volumetric light beams (光帯・光芒) streaming gently from above.
 * - Smooth lateral traversal & breathing pulse (sinusoidal, 100% seamless loop).
 * - Central spine has the highest illumination and feathers out into invisibility.
 * - No carbonated/bubbling upward particles: replaced by minimal stationary hovering dust motes.
 * - Avoids harsh lens flare, flat whiteouts, or obstructing avatar/text.
 */
export function renderSunlightMask(
  ctx: CanvasRenderingContext2D,
  config: MaskConfig,
  width: number,
  height: number,
  timeMs: number,
  totalDurationMs?: number
): void {
  const periodMs = totalDurationMs && totalDurationMs > 0 ? totalDurationMs : SUNLIGHT_LOOP_PERIOD_MS;
  const normTime = ((timeMs % periodMs) + periodMs) % periodMs / periodMs; // 0.0 to 1.0
  const twoPi = Math.PI * 2;
  const timeRad = normTime * twoPi;

  const tuning = INTENSITY_CONFIGS[config.intensity] || INTENSITY_CONFIGS.medium;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  ctx.save();

  // 1. Gentle Sky Source Bloom (画面上部の木漏れ日・天窓の源泉となる淡い光溜まり)
  // Soft radial warmth anchored at top-left/center to give the beams a natural origin point
  if (tuning.ambientWarmthAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const skyGrad = ctx.createRadialGradient(
      width * 0.25,
      -height * 0.05,
      minDim * 0.08,
      width * 0.35,
      height * 0.30,
      maxDim * 0.85
    );
    const pulse = 0.5 + 0.5 * Math.sin(timeRad - Math.PI * 0.2);
    const skyAlpha = tuning.ambientWarmthAlpha * (0.85 + 0.15 * pulse);

    skyGrad.addColorStop(0, `rgba(255, 252, 235, ${skyAlpha * 1.5})`);
    skyGrad.addColorStop(0.35, `rgba(254, 243, 199, ${skyAlpha * 0.8})`);
    skyGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Volumetric Light Beams / Crepuscular Rays (天から差し込む柔らかな光の帯・光芒)
  // Drawn using 'screen' blending to naturally illuminate underlying colors without muddying.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const beamsToRender = SUNLIGHT_BEAMS.slice(0, tuning.beamCount);

  for (const beam of beamsToRender) {
    // Harmonic lateral sway of the beam origin (smooth continuous sine wave)
    const swayX = Math.sin(timeRad * beam.harmonic + beam.phase) * beam.swayOriginXAmp * width;
    const originX = beam.originX * width + swayX;
    const originY = beam.originY * height;

    // Subtle angle oscillation (mimics gentle wind swaying overhead canopy)
    const angleOsc = Math.sin(timeRad * beam.harmonic + beam.phase * 1.3) * beam.swayAngleAmp;
    const currentAngle = beam.baseAngle + angleOsc;

    // Breathing pulse of beam brightness
    const breath = 0.5 + 0.5 * Math.sin(timeRad * beam.harmonic + beam.breathPhase);
    // Subtle mottling wave for foliage fluttering
    const foliageMottle = 0.5 + 0.5 * Math.sin(timeRad * (beam.mottlingHarmonic * 2) + beam.phase);
    const combinedBreath = breath * 0.8 + foliageMottle * 0.2;

    const currentAlpha = (beam.baseAlpha + beam.alphaAmp * (combinedBreath - 0.5) * 2) * tuning.beamAlphaMult;
    if (currentAlpha <= 0.015) {
      continue;
    }

    // Geometry of the trapezoidal beam
    const beamLength = beam.lengthScale * height;
    const topHalfWidth = (beam.topWidthScale * tuning.beamWidthMult * minDim) * 0.5;
    const bottomHalfWidth = (beam.bottomWidthScale * tuning.beamWidthMult * minDim) * 0.5;

    // Unit vectors along and perpendicular to the beam axis
    const dirX = Math.cos(currentAngle);
    const dirY = Math.sin(currentAngle);
    const perpX = -dirY;
    const perpY = dirX;

    // Calculate the 4 trapezoid corners in canvas space
    // Top corners
    const t1x = originX - perpX * topHalfWidth;
    const t1y = originY - perpY * topHalfWidth;
    const t2x = originX + perpX * topHalfWidth;
    const t2y = originY + perpY * topHalfWidth;

    // Bottom corners along beam direction
    const endCenterX = originX + dirX * beamLength;
    const endCenterY = originY + dirY * beamLength;
    const b1x = endCenterX - perpX * bottomHalfWidth;
    const b1y = endCenterY - perpY * bottomHalfWidth;
    const b2x = endCenterX + perpX * bottomHalfWidth;
    const b2y = endCenterY + perpY * bottomHalfWidth;

    // Multi-pass volumetric rendering:
    // Pass A: Broad, soft diffuse body of the light beam (feathered out to edges)
    // Pass B: Narrow, glowing spinal core along the central axis of the ray
    ctx.save();

    // Clip to trapezoid polygon for exact beam containment with soft anti-aliasing
    ctx.beginPath();
    ctx.moveTo(t1x, t1y);
    ctx.lineTo(t2x, t2y);
    ctx.lineTo(b2x, b2y);
    ctx.lineTo(b1x, b1y);
    ctx.closePath();

    // Longitudinal fade (fades gently as the beam travels deeper down toward earth)
    // and lateral gradient (brightest at axis, 0 at flanks)
    // We construct a localized transform along the beam's centerline to paint the longitudinal and lateral falloffs.
    ctx.clip();

    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(currentAngle - Math.PI * 0.5); // align local Y axis along beam direction

    // Longitudinal gradient from beam entrance to bottom disappearance
    const maxLocalY = beamLength;
    const longGrad = ctx.createLinearGradient(0, 0, 0, maxLocalY);
    longGrad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha * 0.85})`);
    longGrad.addColorStop(0.20, `rgba(255, 255, 255, ${currentAlpha})`);
    longGrad.addColorStop(0.65, `rgba(255, 255, 255, ${currentAlpha * 0.60})`);
    longGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);

    // Lateral gradient (center spine to outer boundary)
    // We paint across the local X bounds
    const maxLateral = bottomHalfWidth * 1.05;
    const latGrad = ctx.createLinearGradient(-maxLateral, 0, maxLateral, 0);
    latGrad.addColorStop(0, `${beam.flankColor}0)`);
    latGrad.addColorStop(0.22, `${beam.flankColor}${currentAlpha * 0.25})`);
    latGrad.addColorStop(0.42, `${beam.coreColor}${currentAlpha * 0.70})`);
    latGrad.addColorStop(0.50, `${beam.coreColor}${currentAlpha * 0.95})`);
    latGrad.addColorStop(0.58, `${beam.coreColor}${currentAlpha * 0.70})`);
    latGrad.addColorStop(0.78, `${beam.flankColor}${currentAlpha * 0.25})`);
    latGrad.addColorStop(1, `${beam.flankColor}0)`);

    // Render lateral beam color
    ctx.fillStyle = latGrad;
    ctx.fillRect(-maxLateral, 0, maxLateral * 2, maxLocalY);

    // Apply longitudinal falloff via 'destination-in' to smoothly taper light as it reaches the bottom
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = longGrad;
    ctx.fillRect(-maxLateral, 0, maxLateral * 2, maxLocalY);

    ctx.restore();

    ctx.restore();
  }
  ctx.restore();

  // 3. Sunlit Dust Motes (微細な光埃 - 泡ではなく、光の筋の中でほんの数粒が静かに舞い漂う表現)
  // No rapid upward rising motion. Each particle hovers gently in place inside the sunlit area.
  if (tuning.dustMoteCount > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const motesToRender = SUNLIT_DUST_MOTES.slice(0, tuning.dustMoteCount);
    for (const mote of motesToRender) {
      // Gentle micro-hovering in a small Lissajous loop (no directional rushing)
      const hoverX = Math.sin(timeRad * mote.freqX + mote.phaseX) * mote.hoverRadiusX * width;
      const hoverY = Math.cos(timeRad * mote.freqY + mote.phaseY) * mote.hoverRadiusY * height;

      const px = mote.baseX * width + hoverX;
      const py = mote.baseY * height + hoverY;

      // Subtle slow twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(timeRad + mote.twinklePhase);
      const effectiveAlpha = mote.baseAlpha * (0.65 + 0.35 * twinkle) * tuning.beamAlphaMult;

      if (effectiveAlpha <= 0.02) {
        continue;
      }

      const r = mote.radiusScale * minDim;

      // Soft sunlit mote glow
      const moteGrad = ctx.createRadialGradient(px, py, 0, px, py, r * 2.5);
      moteGrad.addColorStop(0, `rgba(255, 255, 245, ${effectiveAlpha * 0.95})`);
      moteGrad.addColorStop(0.4, `rgba(254, 243, 199, ${effectiveAlpha * 0.65})`);
      moteGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

      ctx.fillStyle = moteGrad;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.5, 0, twoPi);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}
