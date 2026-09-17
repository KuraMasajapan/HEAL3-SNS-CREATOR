/**
 * HEAL3 SNS-Creator - Sunlight Mask (天から注ぐ柔らかな自然光・天窓の光芒)
 *
 * Design Philosophy & Architecture:
 * 1. PURELY ADDITIVE & SOFT (加算合成・画面を一切暗くしない):
 *    - Never uses 'destination-in' or any blend mode that cuts / darkens the canvas.
 *    - Only uses 'screen' composite mode with clean, luminous warm-white & faint golden tints.
 *    - Absolutely no dark/black bands, harsh silhouette lines, or artificial shadows.
 *
 * 2. BROAD NATURAL LIGHT CANOPY AS PRIMARY (主役は上空から広がる光の面):
 *    - The light origin is anchored above the top edge (Y < 0, centered / slightly upper-left).
 *    - First, creates a large, soft radial/conical illumination canopy that bathes the scene in gentle morning/afternoon sunlight.
 *    - The top naturally blooms with warmth and gently falls off towards the lower third of the canvas.
 *
 * 3. SOFT VOLUMETRIC CREPUSCULAR SHAFTS (柔らかな光芒・光帯):
 *    - Broad, generously fanned-out rays that emerge seamlessly from the overhead source.
 *    - Zero hard edges: no sharp polygon clipping. Rendered via smooth radial & linear gradients.
 *    - 2 to 3 gentle, wide rays that subtly enhance contrast and atmosphere without covering text or the avatar.
 *
 * 4. PURE BREATHING MOTION (佇まいの美しさと呼吸):
 *    - Slow, organic brightness oscillation and very gentle sway of the sky anchor point.
 *    - 100% seamless mathematical loop (4800ms) with zero seam artifacts in GIF / Video exports.
 *    - Weak / Medium / Strong tiers calibrated to flatter SNS portraits and result cards.
 */

import { MaskConfig, MaskIntensity } from '../types.ts';

export const SUNLIGHT_LOOP_PERIOD_MS = 4800;

interface SunlightTuning {
  /** Master opacity scale for the upper wide light canopy */
  canopyAlpha: number;
  /** Vertical reach of the primary sky glow */
  canopyReach: number;
  /** Number of visible broad shafts */
  shaftCount: number;
  /** Master opacity multiplier for the broad light shafts */
  shaftAlpha: number;
  /** Width spread multiplier of the shafts */
  shaftSpread: number;
  /** Faint atmospheric ambient warmth */
  ambientWarmth: number;
}

const INTENSITY_TUNING: Record<MaskIntensity, SunlightTuning> = {
  weak: {
    canopyAlpha: 0.14,
    canopyReach: 0.70,
    shaftCount: 2,
    shaftAlpha: 0.08,
    shaftSpread: 1.0,
    ambientWarmth: 0.04,
  },
  medium: {
    canopyAlpha: 0.22,
    canopyReach: 0.85,
    shaftCount: 3,
    shaftAlpha: 0.13,
    shaftSpread: 1.15,
    ambientWarmth: 0.065,
  },
  strong: {
    canopyAlpha: 0.32,
    canopyReach: 0.98,
    shaftCount: 3,
    shaftAlpha: 0.18,
    shaftSpread: 1.30,
    ambientWarmth: 0.09,
  },
};

/**
 * Broad Light Shaft parameters
 * Designed as wide, soft-edged cones originating from the overhead sky anchor.
 */
interface LightShaft {
  /** Base angle in radians (pointing down, with gentle natural slant) */
  angleOffset: number;
  /** Angular width of the shaft cone (radians) - broad and soft */
  coneWidth: number;
  /** Length multiplier relative to height */
  lengthScale: number;
  /** Sway frequency harmonic */
  swayHarmonic: number;
  /** Sway phase */
  swayPhase: number;
  /** Breathing phase */
  breathPhase: number;
  /** Relative alpha weight */
  weight: number;
}

const LIGHT_SHAFTS: LightShaft[] = [
  // Shaft 0: Center-left primary broad beam (gently slanting across the scene)
  {
    angleOffset: 0.12, // ~6.8 degrees to the right of vertical
    coneWidth: 0.36,  // ~20 degrees wide cone (broad & soft)
    lengthScale: 1.35,
    swayHarmonic: 1,
    swayPhase: 0.0,
    breathPhase: 0.4,
    weight: 1.0,
  },
  // Shaft 1: Center-right gentle secondary beam
  {
    angleOffset: 0.28, // ~16 degrees to the right
    coneWidth: 0.42,  // ~24 degrees wide
    lengthScale: 1.45,
    swayHarmonic: 1,
    swayPhase: 1.9,
    breathPhase: 2.2,
    weight: 0.85,
  },
  // Shaft 2: Upper-left subtle ambient beam (present on Medium & Strong)
  {
    angleOffset: -0.10, // ~5.7 degrees to the left
    coneWidth: 0.34,
    lengthScale: 1.25,
    swayHarmonic: 1,
    swayPhase: 3.4,
    breathPhase: 3.8,
    weight: 0.75,
  },
];

/**
 * Render Sunlight Mask onto the 2D Canvas context.
 *
 * Characteristics:
 * - Guaranteed PURE ADDITIVE LIGHT (never darkens, no black bands).
 * - Primary visual is a broad, luminous morning/afternoon sky glow from above.
 * - Secondary visual is 2-3 widely fanned, ultra-soft crepuscular shafts.
 * - Perfectly seamless 4800ms loop for video/GIF/live-preview.
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

  const tuning = INTENSITY_TUNING[config.intensity] || INTENSITY_TUNING.medium;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  // Overhead sun anchor point: situated slightly above the top edge, slightly left-of-center
  // Swings very gently horizontally to evoke trees or sky slowly breathing in the wind
  const anchorBaseX = width * 0.42;
  const anchorBaseY = -height * 0.12;
  const swayX = Math.sin(timeRad) * (width * 0.035);
  const swayY = Math.cos(timeRad) * (height * 0.015);
  const sunX = anchorBaseX + swayX;
  const sunY = anchorBaseY + swayY;

  // Global breath cycle (smooth sinusoidal wave)
  const breathCycle = 0.5 + 0.5 * Math.sin(timeRad - Math.PI * 0.25);

  ctx.save();
  // 'screen' mode ensures light is purely additive, softening shadows and adding radiant warmth
  ctx.globalCompositeOperation = 'screen';

  // -------------------------------------------------------------
  // 1. BROAD SKY ILLUMINATION CANOPY (上空の広大な柔らかな光の面)
  // -------------------------------------------------------------
  // Creates a large, glowing crown of light at the top of the canvas that softly washes down.
  // This is the core reason the screen looks bright, airy, and illuminated rather than striped.
  const canopyAlpha = tuning.canopyAlpha * (0.88 + 0.12 * breathCycle);
  const canopyRadius = maxDim * tuning.canopyReach;

  const skyCanopyGrad = ctx.createRadialGradient(
    sunX,
    sunY,
    minDim * 0.05,
    sunX,
    sunY + height * 0.18,
    canopyRadius
  );

  // Clean, elegant warm-white palette: crisp pure light core -> soft champagne glow -> transparent
  skyCanopyGrad.addColorStop(0.00, `rgba(255, 253, 245, ${canopyAlpha * 1.5})`);
  skyCanopyGrad.addColorStop(0.18, `rgba(255, 248, 230, ${canopyAlpha * 1.1})`);
  skyCanopyGrad.addColorStop(0.42, `rgba(254, 243, 210, ${canopyAlpha * 0.65})`);
  skyCanopyGrad.addColorStop(0.70, `rgba(253, 230, 160, ${canopyAlpha * 0.25})`);
  skyCanopyGrad.addColorStop(1.00, 'rgba(253, 224, 71, 0)');

  ctx.fillStyle = skyCanopyGrad;
  ctx.fillRect(0, 0, width, height);

  // -------------------------------------------------------------
  // 2. AMBIENT WARMTH FLOOD (画面全体のほんのりとした朝日のぬくもり)
  // -------------------------------------------------------------
  // Gently lifts the deep shadows across the upper half without causing whiteout
  if (tuning.ambientWarmth > 0.01) {
    const ambAlpha = tuning.ambientWarmth * (0.9 + 0.1 * breathCycle);
    const ambGrad = ctx.createLinearGradient(0, 0, 0, height);
    ambGrad.addColorStop(0.0, `rgba(255, 250, 235, ${ambAlpha * 1.2})`);
    ambGrad.addColorStop(0.4, `rgba(254, 243, 199, ${ambAlpha * 0.7})`);
    ambGrad.addColorStop(0.8, 'rgba(254, 240, 138, 0)');
    ambGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // -------------------------------------------------------------
  // 3. BROAD, ULTRA-SOFT CREPUSCULAR SHAFTS (柔らかな光帯・光芒)
  // -------------------------------------------------------------
  // Modeled as wide radial fan wedges with seamless Gaussian-like lateral falloff.
  // NO clipping paths, NO dark masks, NO straight sharp lines.
  const shaftsToRender = LIGHT_SHAFTS.slice(0, tuning.shaftCount);

  for (let i = 0; i < shaftsToRender.length; i++) {
    const shaft = shaftsToRender[i];

    // Harmonic angle sway
    const angleSway = Math.sin(timeRad * shaft.swayHarmonic + shaft.swayPhase) * 0.035;
    // Central axis pointing downwards into the canvas
    const centralAngle = Math.PI * 0.5 + shaft.angleOffset + angleSway;

    // Shaft breathing cycle
    const shaftBreath = 0.5 + 0.5 * Math.sin(timeRad * shaft.swayHarmonic + shaft.breathPhase);
    const effectiveShaftAlpha = tuning.shaftAlpha * shaft.weight * (0.82 + 0.18 * shaftBreath);

    if (effectiveShaftAlpha <= 0.01) {
      continue;
    }

    const currentConeWidth = shaft.coneWidth * tuning.shaftSpread;
    const shaftLength = height * shaft.lengthScale;

    // Render each shaft as a transformed radial-linear composite beam
    // We position the canvas at the sun origin, rotate along the shaft's central angle,
    // and draw an elliptical / feathered sector.
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(centralAngle); // local +X is perpendicular right, local +Y is along beam

    // Longitudinal length of the shaft
    const rayLength = shaftLength;
    // Lateral width at the far end
    const farHalfWidth = Math.tan(currentConeWidth * 0.5) * rayLength;

    // We build a 2D feathered light shaft using a gradient that is brightest at (0, 0..rayLength*0.4)
    // and smoothly drops to zero both laterally and longitudinally.
    // Radial gradient centered at origin with elliptical spread
    const shaftGrad = ctx.createRadialGradient(
      0,
      rayLength * 0.15,
      minDim * 0.04,
      0,
      rayLength * 0.45,
      rayLength
    );

    shaftGrad.addColorStop(0.00, `rgba(255, 255, 250, ${effectiveShaftAlpha * 1.6})`);
    shaftGrad.addColorStop(0.20, `rgba(255, 250, 235, ${effectiveShaftAlpha * 1.2})`);
    shaftGrad.addColorStop(0.45, `rgba(254, 245, 215, ${effectiveShaftAlpha * 0.65})`);
    shaftGrad.addColorStop(0.75, `rgba(253, 235, 175, ${effectiveShaftAlpha * 0.20})`);
    shaftGrad.addColorStop(1.00, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = shaftGrad;

    // Draw a smooth fan sector from angle -coneWidth/2 to +coneWidth/2
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const startAngle = Math.PI * 0.5 - currentConeWidth * 0.5;
    const endAngle = Math.PI * 0.5 + currentConeWidth * 0.5;
    ctx.arc(0, 0, rayLength, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Additional ultra-soft central spinal sheen to make the ray center feel luminous without sharp borders
    const spineGrad = ctx.createLinearGradient(-farHalfWidth * 0.4, 0, farHalfWidth * 0.4, 0);
    spineGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    spineGrad.addColorStop(0.5, `rgba(255, 254, 245, ${effectiveShaftAlpha * 0.75})`);
    spineGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(farHalfWidth * 0.45, rayLength * 0.85);
    ctx.lineTo(-farHalfWidth * 0.45, rayLength * 0.85);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // 4. BROW-TOP GLOW CROWN (画面最上部の自然な溢れ光)
  // -------------------------------------------------------------
  // A subtle horizontal band across the top edge that gives the camera/viewer
  // the impression that the sun is right above the frame edge.
  const topGlowGrad = ctx.createLinearGradient(0, 0, 0, height * 0.28);
  const topGlowAlpha = tuning.canopyAlpha * 0.55 * (0.9 + 0.1 * breathCycle);
  topGlowGrad.addColorStop(0, `rgba(255, 252, 240, ${topGlowAlpha})`);
  topGlowGrad.addColorStop(0.4, `rgba(254, 248, 225, ${topGlowAlpha * 0.4})`);
  topGlowGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

  ctx.fillStyle = topGlowGrad;
  ctx.fillRect(0, 0, width, height * 0.28);

  ctx.restore();
}
