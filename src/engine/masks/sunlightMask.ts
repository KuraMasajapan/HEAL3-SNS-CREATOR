/**
 * HEAL3 SNS-Creator - Sunlight Mask v1 (木漏れ日・柔らかな自然光・微細光粒子)
 *
 * Atmospheric Sunlight Layer:
 * - Expresses gentle dappled canopy light (木漏れ日) through warm, soft-edge elliptical bokeh patches.
 * - Drifts gently and pulses with a calm "breathing" rhythm (sinusoidal brightness and subtle radius breathing).
 * - Floats tiny, luminous warm-gold micro-particles that drift leisurely upward and diagonally.
 * - Adds a very faint global warmth shimmer without washing out or obscuring the central avatar / result stats.
 * - Perfectly seamless time loop (default 4000ms period) so GIF and video exports have zero seam artifacts.
 * - Weak / Medium / Strong tiers carefully balanced for SNS photo enhancement.
 */

import { MaskConfig, MaskIntensity } from '../types.ts';

export const SUNLIGHT_LOOP_PERIOD_MS = 4000;

/**
 * Dappled Sunlight Bokeh Patch Definition (Normalized Coordinates 0.0 - 1.0)
 */
interface SunlightPatch {
  id: number;
  /** Center X spawn (normalized 0..1) */
  cx: number;
  /** Center Y spawn (normalized 0..1) */
  cy: number;
  /** Radius relative to min(width, height) */
  radiusScale: number;
  /** Aspect ratio of the elliptical patch (width / height) */
  aspect: number;
  /** Patch rotation angle in radians */
  rotation: number;
  /** Maximum drift excursion in normalized X */
  driftAmpX: number;
  /** Maximum drift excursion in normalized Y */
  driftAmpY: number;
  /** Harmonic frequency multiplier for drift */
  driftFreq: number;
  /** Harmonic phase offset for drift */
  driftPhase: number;
  /** Base opacity for the warm core (0.0 - 1.0) */
  baseAlpha: number;
  /** Alpha oscillation amplitude */
  alphaAmp: number;
  /** Breathing pulse frequency (integer multiples of 2*PI for seamless loop) */
  pulseHarmonic: number;
  /** Breathing pulse phase */
  pulsePhase: number;
  /** Warm sunlight tone gradient: core color */
  coreColor: string;
  /** Mid color */
  midColor: string;
}

/**
 * Micro Light Particle Definition (Normalized Coordinates 0.0 - 1.0)
 */
interface SunlightParticle {
  id: number;
  /** Spawn origin X (normalized 0..1) */
  spawnX: number;
  /** Vertical starting phase offset (0..1) */
  initialOffsetY: number;
  /** Number of complete ascents per loop period (integer for seamless loop) */
  verticalLoops: number;
  /** Particle radius in normalized units */
  radiusScale: number;
  /** Horizontal sway excursion amplitude */
  swayAmp: number;
  /** Sway harmonic frequency */
  swayHarmonic: number;
  /** Sway phase */
  swayPhase: number;
  /** Twinkle harmonic frequency */
  twinkleHarmonic: number;
  /** Twinkle phase */
  twinklePhase: number;
  /** Base opacity */
  baseAlpha: number;
  /** Warm golden or soft cream particle color */
  color: string;
}

/**
 * Dappled Light Patches Preset Catalog (Positioned intentionally around periphery and upper canopy,
 * leaving the central avatar area clear and bright without obstruction).
 */
const SUNLIGHT_PATCHES: SunlightPatch[] = [
  // --- WEAK TIER (5 subtle patches) ---
  {
    id: 0,
    cx: 0.18,
    cy: 0.16,
    radiusScale: 0.32,
    aspect: 1.35,
    rotation: 0.45,
    driftAmpX: 0.025,
    driftAmpY: 0.018,
    driftFreq: 1,
    driftPhase: 0.0,
    baseAlpha: 0.13,
    alphaAmp: 0.04,
    pulseHarmonic: 1,
    pulsePhase: 0.2,
    coreColor: 'rgba(255, 248, 220, ',
    midColor: 'rgba(254, 240, 138, ',
  },
  {
    id: 1,
    cx: 0.82,
    cy: 0.22,
    radiusScale: 0.36,
    aspect: 1.25,
    rotation: -0.38,
    driftAmpX: 0.022,
    driftAmpY: 0.026,
    driftFreq: 1,
    driftPhase: 1.4,
    baseAlpha: 0.14,
    alphaAmp: 0.04,
    pulseHarmonic: 1,
    pulsePhase: 1.8,
    coreColor: 'rgba(254, 243, 199, ',
    midColor: 'rgba(253, 224, 71, ',
  },
  {
    id: 2,
    cx: 0.88,
    cy: 0.68,
    radiusScale: 0.30,
    aspect: 1.40,
    rotation: 0.62,
    driftAmpX: 0.020,
    driftAmpY: 0.022,
    driftFreq: 1,
    driftPhase: 2.8,
    baseAlpha: 0.11,
    alphaAmp: 0.035,
    pulseHarmonic: 1,
    pulsePhase: 3.2,
    coreColor: 'rgba(255, 251, 235, ',
    midColor: 'rgba(252, 211, 77, ',
  },
  {
    id: 3,
    cx: 0.12,
    cy: 0.78,
    radiusScale: 0.28,
    aspect: 1.20,
    rotation: -0.50,
    driftAmpX: 0.018,
    driftAmpY: 0.016,
    driftFreq: 1,
    driftPhase: 4.1,
    baseAlpha: 0.10,
    alphaAmp: 0.03,
    pulseHarmonic: 1,
    pulsePhase: 4.5,
    coreColor: 'rgba(254, 249, 195, ',
    midColor: 'rgba(250, 204, 21, ',
  },
  {
    id: 4,
    cx: 0.50,
    cy: 0.08,
    radiusScale: 0.38,
    aspect: 1.60,
    rotation: 0.12,
    driftAmpX: 0.030,
    driftAmpY: 0.015,
    driftFreq: 1,
    driftPhase: 0.8,
    baseAlpha: 0.12,
    alphaAmp: 0.035,
    pulseHarmonic: 1,
    pulsePhase: 0.9,
    coreColor: 'rgba(255, 255, 240, ',
    midColor: 'rgba(254, 240, 138, ',
  },

  // --- MEDIUM TIER EXPANSIONS (+4 patches => total 9) ---
  {
    id: 5,
    cx: 0.34,
    cy: 0.28,
    radiusScale: 0.24,
    aspect: 1.15,
    rotation: -0.28,
    driftAmpX: 0.024,
    driftAmpY: 0.020,
    driftFreq: 1,
    driftPhase: 2.1,
    baseAlpha: 0.11,
    alphaAmp: 0.035,
    pulseHarmonic: 1,
    pulsePhase: 2.6,
    coreColor: 'rgba(254, 243, 199, ',
    midColor: 'rgba(253, 230, 138, ',
  },
  {
    id: 6,
    cx: 0.68,
    cy: 0.42,
    radiusScale: 0.22,
    aspect: 1.30,
    rotation: 0.34,
    driftAmpX: 0.018,
    driftAmpY: 0.016,
    driftFreq: 1,
    driftPhase: 3.5,
    baseAlpha: 0.10,
    alphaAmp: 0.03,
    pulseHarmonic: 1,
    pulsePhase: 3.9,
    coreColor: 'rgba(255, 250, 230, ',
    midColor: 'rgba(252, 211, 77, ',
  },
  {
    id: 7,
    cx: 0.22,
    cy: 0.52,
    radiusScale: 0.26,
    aspect: 1.22,
    rotation: 0.55,
    driftAmpX: 0.020,
    driftAmpY: 0.022,
    driftFreq: 1,
    driftPhase: 5.0,
    baseAlpha: 0.11,
    alphaAmp: 0.035,
    pulseHarmonic: 1,
    pulsePhase: 5.3,
    coreColor: 'rgba(254, 249, 195, ',
    midColor: 'rgba(251, 191, 36, ',
  },
  {
    id: 8,
    cx: 0.76,
    cy: 0.84,
    radiusScale: 0.25,
    aspect: 1.35,
    rotation: -0.42,
    driftAmpX: 0.022,
    driftAmpY: 0.018,
    driftFreq: 1,
    driftPhase: 1.1,
    baseAlpha: 0.10,
    alphaAmp: 0.03,
    pulseHarmonic: 1,
    pulsePhase: 1.5,
    coreColor: 'rgba(255, 255, 235, ',
    midColor: 'rgba(254, 240, 138, ',
  },

  // --- STRONG TIER EXPANSIONS (+4 patches => total 13) ---
  {
    id: 9,
    cx: 0.06,
    cy: 0.38,
    radiusScale: 0.26,
    aspect: 1.45,
    rotation: 0.72,
    driftAmpX: 0.026,
    driftAmpY: 0.019,
    driftFreq: 1,
    driftPhase: 0.5,
    baseAlpha: 0.12,
    alphaAmp: 0.04,
    pulseHarmonic: 1,
    pulsePhase: 0.7,
    coreColor: 'rgba(254, 243, 199, ',
    midColor: 'rgba(253, 224, 71, ',
  },
  {
    id: 10,
    cx: 0.94,
    cy: 0.46,
    radiusScale: 0.27,
    aspect: 1.30,
    rotation: -0.65,
    driftAmpX: 0.022,
    driftAmpY: 0.024,
    driftFreq: 1,
    driftPhase: 2.4,
    baseAlpha: 0.12,
    alphaAmp: 0.04,
    pulseHarmonic: 1,
    pulsePhase: 2.8,
    coreColor: 'rgba(255, 251, 235, ',
    midColor: 'rgba(250, 204, 21, ',
  },
  {
    id: 11,
    cx: 0.45,
    cy: 0.78,
    radiusScale: 0.22,
    aspect: 1.18,
    rotation: 0.20,
    driftAmpX: 0.018,
    driftAmpY: 0.016,
    driftFreq: 1,
    driftPhase: 4.4,
    baseAlpha: 0.09,
    alphaAmp: 0.03,
    pulseHarmonic: 1,
    pulsePhase: 4.8,
    coreColor: 'rgba(254, 249, 195, ',
    midColor: 'rgba(252, 211, 77, ',
  },
  {
    id: 12,
    cx: 0.62,
    cy: 0.16,
    radiusScale: 0.30,
    aspect: 1.50,
    rotation: -0.30,
    driftAmpX: 0.028,
    driftAmpY: 0.020,
    driftFreq: 1,
    driftPhase: 3.2,
    baseAlpha: 0.13,
    alphaAmp: 0.04,
    pulseHarmonic: 1,
    pulsePhase: 3.5,
    coreColor: 'rgba(255, 255, 245, ',
    midColor: 'rgba(253, 230, 138, ',
  },
];

/**
 * Micro Light Particles Catalog (Tiny floating dust motes catching sunlight)
 */
const SUNLIGHT_PARTICLES: SunlightParticle[] = [
  // Weak: 8 subtle particles
  {
    id: 0,
    spawnX: 0.22,
    initialOffsetY: 0.12,
    verticalLoops: 1,
    radiusScale: 0.0035,
    swayAmp: 0.016,
    swayHarmonic: 1,
    swayPhase: 0.4,
    twinkleHarmonic: 2,
    twinklePhase: 0.2,
    baseAlpha: 0.50,
    color: '#fef08a',
  },
  {
    id: 1,
    spawnX: 0.78,
    initialOffsetY: 0.34,
    verticalLoops: 1,
    radiusScale: 0.0042,
    swayAmp: 0.020,
    swayHarmonic: 1,
    swayPhase: 1.6,
    twinkleHarmonic: 2,
    twinklePhase: 1.8,
    baseAlpha: 0.55,
    color: '#fef9c3',
  },
  {
    id: 2,
    spawnX: 0.38,
    initialOffsetY: 0.58,
    verticalLoops: 1,
    radiusScale: 0.0030,
    swayAmp: 0.014,
    swayHarmonic: 1,
    swayPhase: 2.9,
    twinkleHarmonic: 1,
    twinklePhase: 3.1,
    baseAlpha: 0.45,
    color: '#fde047',
  },
  {
    id: 3,
    spawnX: 0.85,
    initialOffsetY: 0.78,
    verticalLoops: 1,
    radiusScale: 0.0038,
    swayAmp: 0.018,
    swayHarmonic: 1,
    swayPhase: 4.2,
    twinkleHarmonic: 2,
    twinklePhase: 4.4,
    baseAlpha: 0.52,
    color: '#fef08a',
  },
  {
    id: 4,
    spawnX: 0.14,
    initialOffsetY: 0.42,
    verticalLoops: 1,
    radiusScale: 0.0045,
    swayAmp: 0.022,
    swayHarmonic: 1,
    swayPhase: 0.9,
    twinkleHarmonic: 1,
    twinklePhase: 0.6,
    baseAlpha: 0.48,
    color: '#fffbeb',
  },
  {
    id: 5,
    spawnX: 0.64,
    initialOffsetY: 0.20,
    verticalLoops: 1,
    radiusScale: 0.0032,
    swayAmp: 0.015,
    swayHarmonic: 1,
    swayPhase: 2.2,
    twinkleHarmonic: 2,
    twinklePhase: 2.5,
    baseAlpha: 0.46,
    color: '#fef9c3',
  },
  {
    id: 6,
    spawnX: 0.48,
    initialOffsetY: 0.88,
    verticalLoops: 1,
    radiusScale: 0.0036,
    swayAmp: 0.017,
    swayHarmonic: 1,
    swayPhase: 3.7,
    twinkleHarmonic: 1,
    twinklePhase: 3.9,
    baseAlpha: 0.50,
    color: '#fef08a',
  },
  {
    id: 7,
    spawnX: 0.92,
    initialOffsetY: 0.62,
    verticalLoops: 1,
    radiusScale: 0.0040,
    swayAmp: 0.019,
    swayHarmonic: 1,
    swayPhase: 5.1,
    twinkleHarmonic: 2,
    twinklePhase: 5.3,
    baseAlpha: 0.54,
    color: '#fde047',
  },

  // Medium: +7 particles (total 15)
  {
    id: 8,
    spawnX: 0.28,
    initialOffsetY: 0.26,
    verticalLoops: 1,
    radiusScale: 0.0034,
    swayAmp: 0.016,
    swayHarmonic: 1,
    swayPhase: 1.2,
    twinkleHarmonic: 2,
    twinklePhase: 1.4,
    baseAlpha: 0.52,
    color: '#fffbeb',
  },
  {
    id: 9,
    spawnX: 0.72,
    initialOffsetY: 0.48,
    verticalLoops: 1,
    radiusScale: 0.0044,
    swayAmp: 0.021,
    swayHarmonic: 1,
    swayPhase: 2.7,
    twinkleHarmonic: 1,
    twinklePhase: 2.9,
    baseAlpha: 0.56,
    color: '#fef08a',
  },
  {
    id: 10,
    spawnX: 0.08,
    initialOffsetY: 0.70,
    verticalLoops: 1,
    radiusScale: 0.0031,
    swayAmp: 0.015,
    swayHarmonic: 1,
    swayPhase: 3.9,
    twinkleHarmonic: 2,
    twinklePhase: 4.1,
    baseAlpha: 0.48,
    color: '#fef9c3',
  },
  {
    id: 11,
    spawnX: 0.56,
    initialOffsetY: 0.06,
    verticalLoops: 1,
    radiusScale: 0.0040,
    swayAmp: 0.018,
    swayHarmonic: 1,
    swayPhase: 0.3,
    twinkleHarmonic: 1,
    twinklePhase: 0.5,
    baseAlpha: 0.53,
    color: '#fde047',
  },
  {
    id: 12,
    spawnX: 0.82,
    initialOffsetY: 0.94,
    verticalLoops: 1,
    radiusScale: 0.0033,
    swayAmp: 0.016,
    swayHarmonic: 1,
    swayPhase: 4.8,
    twinkleHarmonic: 2,
    twinklePhase: 5.0,
    baseAlpha: 0.50,
    color: '#fef08a',
  },
  {
    id: 13,
    spawnX: 0.18,
    initialOffsetY: 0.84,
    verticalLoops: 1,
    radiusScale: 0.0042,
    swayAmp: 0.020,
    swayHarmonic: 1,
    swayPhase: 1.9,
    twinkleHarmonic: 1,
    twinklePhase: 2.1,
    baseAlpha: 0.52,
    color: '#fffbeb',
  },
  {
    id: 14,
    spawnX: 0.42,
    initialOffsetY: 0.38,
    verticalLoops: 1,
    radiusScale: 0.0036,
    swayAmp: 0.017,
    swayHarmonic: 1,
    swayPhase: 3.3,
    twinkleHarmonic: 2,
    twinklePhase: 3.5,
    baseAlpha: 0.51,
    color: '#fef9c3',
  },

  // Strong: +7 particles (total 22)
  {
    id: 15,
    spawnX: 0.32,
    initialOffsetY: 0.72,
    verticalLoops: 1,
    radiusScale: 0.0035,
    swayAmp: 0.016,
    swayHarmonic: 1,
    swayPhase: 0.7,
    twinkleHarmonic: 2,
    twinklePhase: 0.9,
    baseAlpha: 0.54,
    color: '#fef08a',
  },
  {
    id: 16,
    spawnX: 0.66,
    initialOffsetY: 0.64,
    verticalLoops: 1,
    radiusScale: 0.0045,
    swayAmp: 0.022,
    swayHarmonic: 1,
    swayPhase: 2.3,
    twinkleHarmonic: 1,
    twinklePhase: 2.5,
    baseAlpha: 0.58,
    color: '#fde047',
  },
  {
    id: 17,
    spawnX: 0.96,
    initialOffsetY: 0.16,
    verticalLoops: 1,
    radiusScale: 0.0032,
    swayAmp: 0.015,
    swayHarmonic: 1,
    swayPhase: 3.6,
    twinkleHarmonic: 2,
    twinklePhase: 3.8,
    baseAlpha: 0.50,
    color: '#fffbeb',
  },
  {
    id: 18,
    spawnX: 0.05,
    initialOffsetY: 0.52,
    verticalLoops: 1,
    radiusScale: 0.0040,
    swayAmp: 0.019,
    swayHarmonic: 1,
    swayPhase: 4.5,
    twinkleHarmonic: 1,
    twinklePhase: 4.7,
    baseAlpha: 0.52,
    color: '#fef9c3',
  },
  {
    id: 19,
    spawnX: 0.52,
    initialOffsetY: 0.50,
    verticalLoops: 1,
    radiusScale: 0.0030,
    swayAmp: 0.014,
    swayHarmonic: 1,
    swayPhase: 1.5,
    twinkleHarmonic: 2,
    twinklePhase: 1.7,
    baseAlpha: 0.47,
    color: '#fef08a',
  },
  {
    id: 20,
    spawnX: 0.88,
    initialOffsetY: 0.40,
    verticalLoops: 1,
    radiusScale: 0.0042,
    swayAmp: 0.020,
    swayHarmonic: 1,
    swayPhase: 2.8,
    twinkleHarmonic: 1,
    twinklePhase: 3.0,
    baseAlpha: 0.55,
    color: '#fde047',
  },
  {
    id: 21,
    spawnX: 0.24,
    initialOffsetY: 0.96,
    verticalLoops: 1,
    radiusScale: 0.0038,
    swayAmp: 0.018,
    swayHarmonic: 1,
    swayPhase: 5.4,
    twinkleHarmonic: 2,
    twinklePhase: 5.6,
    baseAlpha: 0.53,
    color: '#fffbeb',
  },
];

/**
 * Intensity configuration multiplier and item counts
 */
interface IntensityTuning {
  patchCount: number;
  particleCount: number;
  globalAlphaMult: number;
  ambientWarmthAlpha: number;
  particleAlphaMult: number;
}

const INTENSITY_SETTINGS: Record<MaskIntensity, IntensityTuning> = {
  weak: {
    patchCount: 5,
    particleCount: 8,
    globalAlphaMult: 0.75,
    ambientWarmthAlpha: 0.025,
    particleAlphaMult: 0.65,
  },
  medium: {
    patchCount: 9,
    particleCount: 15,
    globalAlphaMult: 1.0,
    ambientWarmthAlpha: 0.040,
    particleAlphaMult: 1.0,
  },
  strong: {
    patchCount: 13,
    particleCount: 22,
    globalAlphaMult: 1.35,
    ambientWarmthAlpha: 0.065,
    particleAlphaMult: 1.25,
  },
};

/**
 * Render Sunlight Mask v1 onto the 2D Canvas context.
 *
 * Guaranteed characteristics:
 * - Deterministic, smooth, pure-function time evaluation.
 * - Perfectly seamless 4000ms loop period (no discontinuities or frame skips).
 * - Gentle canopy light (木漏れ日) with organic soft falloff that enhances photos.
 * - Never obscures text or avatar (central zone is softly vignettes away from bokeh centers).
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

  const tuning = INTENSITY_SETTINGS[config.intensity] || INTENSITY_SETTINGS.medium;
  const minDim = Math.min(width, height);

  ctx.save();

  // 1. Subtle Ambient Warmth Shimmer Layer
  // Gives the overall photo a warm, sunlit afternoon cast without washing out highlights.
  const ambientPulse = 0.5 + 0.5 * Math.sin(timeRad - Math.PI * 0.25);
  const effectiveAmbientAlpha = tuning.ambientWarmthAlpha * (0.85 + 0.15 * ambientPulse);

  if (effectiveAmbientAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const ambGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.15,
      minDim * 0.1,
      width * 0.5,
      height * 0.5,
      minDim * 1.1
    );
    ambGrad.addColorStop(0, `rgba(254, 240, 138, ${effectiveAmbientAlpha * 1.4})`);
    ambGrad.addColorStop(0.5, `rgba(253, 230, 138, ${effectiveAmbientAlpha})`);
    ambGrad.addColorStop(1, `rgba(245, 158, 11, 0)`);

    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Dappled Sunlight Bokeh Patches (木漏れ日)
  // Drawn with 'screen' composite mode to blend warmly and naturally with the underlying base photo.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const patchesToRender = SUNLIGHT_PATCHES.slice(0, tuning.patchCount);
  for (const patch of patchesToRender) {
    // Harmonic smooth drift around base center
    const driftX = Math.sin(timeRad * patch.driftFreq + patch.driftPhase) * patch.driftAmpX * width;
    const driftY = Math.cos(timeRad * patch.driftFreq + patch.driftPhase * 1.2) * patch.driftAmpY * height;

    const currentX = patch.cx * width + driftX;
    const currentY = patch.cy * height + driftY;

    // Gentle breathing pulse of radius and brightness
    const pulsePhase = timeRad * patch.pulseHarmonic + patch.pulsePhase;
    const pulseSin = Math.sin(pulsePhase);

    // Scale breathes gently by ±6%
    const currentRadius = patch.radiusScale * minDim * (1.0 + 0.06 * pulseSin);

    // Opacity gently breathes
    const patchAlpha = Math.max(
      0.02,
      (patch.baseAlpha + patch.alphaAmp * pulseSin) * tuning.globalAlphaMult
    );

    ctx.save();
    ctx.translate(currentX, currentY);
    ctx.rotate(patch.rotation);
    ctx.scale(patch.aspect, 1.0);

    // Soft-edged radial gradient simulating out-of-focus foliage sunlight
    const radGrad = ctx.createRadialGradient(0, 0, currentRadius * 0.05, 0, 0, currentRadius);
    radGrad.addColorStop(0, `${patch.coreColor}${patchAlpha})`);
    radGrad.addColorStop(0.35, `${patch.midColor}${patchAlpha * 0.72})`);
    radGrad.addColorStop(0.70, `${patch.midColor}${patchAlpha * 0.28})`);
    radGrad.addColorStop(1, `${patch.midColor}0)`);

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, twoPi);
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();

  // 3. Micro Light Particles (微細光粒子)
  // Slowly ascend and sway like dust motes catching sunlight beams.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const particlesToRender = SUNLIGHT_PARTICLES.slice(0, tuning.particleCount);
  for (const p of particlesToRender) {
    // Upward drift loop (from 1.08 down to -0.08 normalized Y)
    const startY = 1.08;
    const endY = -0.08;
    const spanY = startY - endY;

    const loopProgress = ((normTime * p.verticalLoops + p.initialOffsetY) % 1.0 + 1.0) % 1.0;
    const normY = startY - loopProgress * spanY;

    // Horizontal gentle sway
    const swayX = Math.sin(timeRad * p.swayHarmonic + p.swayPhase) * p.swayAmp;
    const normX = p.spawnX + swayX;

    const px = normX * width;
    const py = normY * height;

    // Twinkle modulation
    const twinkle = 0.5 + 0.5 * Math.sin(timeRad * p.twinkleHarmonic + p.twinklePhase);
    const particleAlpha = p.baseAlpha * (0.6 + 0.4 * twinkle) * tuning.particleAlphaMult;

    // Edge fade-out at top and bottom margins so particles enter and exit smoothly
    let edgeFade = 1.0;
    if (normY > 1.0) {
      edgeFade = Math.max(0, (1.08 - normY) / 0.08);
    } else if (normY < 0.0) {
      edgeFade = Math.max(0, (normY - (-0.08)) / 0.08);
    }

    const effectiveAlpha = particleAlpha * edgeFade;
    if (effectiveAlpha <= 0.02) {
      continue;
    }

    const r = p.radiusScale * minDim;

    // Soft glowing particle
    const partGrad = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
    partGrad.addColorStop(0, `rgba(255, 255, 255, ${effectiveAlpha * 0.95})`);
    partGrad.addColorStop(0.35, `${p.color}`);
    partGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

    ctx.globalAlpha = effectiveAlpha;
    ctx.fillStyle = partGrad;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.2, 0, twoPi);
    ctx.fill();
  }

  ctx.restore();

  ctx.restore();
}
