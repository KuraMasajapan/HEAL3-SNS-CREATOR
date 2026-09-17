/**
 * HEAL3 SNS-Creator - Autumn Mask v1
 * 
 * High-quality atmospheric autumn mask:
 * - 3 distinct leaf vector silhouettes:
 *   1. Momiji (Japanese Maple / 紅葉): 5-lobed classic crimson/vermilion leaf
 *   2. Icho (Ginkgo / イチョウ): Golden fan leaf with gentle cleft
 *   3. Zelkova (Beech/Elm / 欅・ブナ): Warm amber/russet ovate serrated leaf
 * 
 * - 3 Depth Layers:
 *   - Background: Smaller (14-20px), softer alpha (0.42-0.55), slower drift
 *   - Midground: Medium (24-34px), crisp alpha (0.75-0.88), standard drift
 *   - Foreground: Larger (44-65px), bold alpha (0.88-0.95), faster drift
 * 
 * - Deterministic continuous & seamless loop:
 *   - Particles traverse diagonally with gentle autumn wind and sine sway
 *   - Y-wraps cleanly offscreen (-0.12 to 1.15) so loop boundary has zero popping
 *   - 3D tumbling flip simulation (cos scale) for realistic fluttering in wind
 * 
 * - 3 Intensity Levels:
 *   - Weak: 12 leaves (6 bg, 5 mid, 1 fg) - quiet, subtle autumn breeze
 *   - Medium: 24 leaves (11 bg, 10 mid, 3 fg) - balanced atmospheric koyo
 *   - Strong: 38 leaves (16 bg, 16 mid, 6 fg) - rich autumn flurry
 */

import { MaskConfig, MaskIntensity } from '../types.ts';

export type LeafType = 'momiji' | 'icho' | 'zelkova';
export type LeafLayer = 'background' | 'midground' | 'foreground';

export interface LeafParticle {
  id: number;
  layer: LeafLayer;
  type: LeafType;
  /** Normalized spawn X coordinate (-0.1 to 1.35) */
  spawnX: number;
  /** Initial progress offset along traversal cycle (0.0 - 1.0) */
  initialOffset: number;
  /** Integer traversals per loop cycle (1 = slower/gentle, 2 = faster foreground) */
  loops: number;
  /** Size multiplier relative to canvas min dimension */
  scale: number;
  /** Diagonal drift across the full traversal (negative = drift towards left) */
  driftX: number;
  /** Horizontal sway amplitude */
  swayAmp: number;
  /** Integer harmonic for sine sway to ensure exact loop closure */
  swayHarmonic: number;
  /** Sway initial phase in radians */
  swayPhase: number;
  /** Base rotation in radians */
  baseRot: number;
  /** Integer rotations per traversal */
  rotTurns: number;
  /** Additional rotation wobble amplitude in radians */
  wobbleAmp: number;
  /** Integer harmonic for wobble */
  wobbleHarmonic: number;
  /** Integer harmonic for 3D tumbling flutter */
  tumbleHarmonic: number;
  /** Tumble initial phase in radians */
  tumblePhase: number;
  /** Primary leaf fill color */
  color: string;
  /** Stem & vein accent color */
  veinColor: string;
  /** Base opacity */
  alpha: number;
  /** Whether this leaf gently softens during the density breath lull */
  breathResponsive?: boolean;
}

/**
 * Deterministic, statically defined collection of 38 leaves.
 * Ordered so that:
 * - First 12 leaves comprise "Weak" (6 bg, 5 mid, 1 fg)
 * - First 24 leaves comprise "Medium" (11 bg, 10 mid, 3 fg)
 * - All 38 leaves comprise "Strong" (16 bg, 16 mid, 6 fg)
 */
export const AUTUMN_LEAVES: LeafParticle[] = [
  // --- WEAK TIER (Leaves 0 - 11) ---
  // Background (6)
  {
    id: 0,
    layer: 'background',
    type: 'momiji',
    spawnX: 0.28,
    initialOffset: 0.06,
    loops: 1,
    scale: 0.024,
    driftX: -0.16, // Gentle vertical drift
    swayAmp: 0.018,
    swayHarmonic: 2,
    swayPhase: 0.2,
    baseRot: 0.4,
    rotTurns: 1,
    wobbleAmp: 0.35,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.5,
    color: '#b91c1c',
    veinColor: '#7f1d1d',
    alpha: 0.48,
  },
  {
    id: 1,
    layer: 'background',
    type: 'icho',
    spawnX: 0.72,
    initialOffset: 0.22,
    loops: 1,
    scale: 0.022,
    driftX: -0.38, // Slightly faster horizontal glide
    swayAmp: 0.028,
    swayHarmonic: 2,
    swayPhase: 1.1,
    baseRot: -0.6,
    rotTurns: -1,
    wobbleAmp: 0.4,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.2,
    color: '#ca8a04',
    veinColor: '#a16207',
    alpha: 0.45,
  },
  {
    id: 2,
    layer: 'background',
    type: 'zelkova',
    spawnX: 0.95,
    initialOffset: 0.36,
    loops: 1,
    scale: 0.026,
    driftX: -0.25, // Standard drift
    swayAmp: 0.022,
    swayHarmonic: 1,
    swayPhase: 2.3,
    baseRot: 0.8,
    rotTurns: 0,
    wobbleAmp: 0.45,
    wobbleHarmonic: 1,
    tumbleHarmonic: 1,
    tumblePhase: 0.3,
    color: '#c2410c',
    veinColor: '#7c2d12',
    alpha: 0.44,
    breathResponsive: true,
  },
  {
    id: 3,
    layer: 'background',
    type: 'momiji',
    spawnX: 1.15,
    initialOffset: 0.50,
    loops: 1,
    scale: 0.023,
    driftX: -0.42, // Swept by autumn gust
    swayAmp: 0.030,
    swayHarmonic: 2,
    swayPhase: 0.7,
    baseRot: -0.3,
    rotTurns: 1,
    wobbleAmp: 0.3,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.8,
    color: '#991b1b',
    veinColor: '#450a0a',
    alpha: 0.46,
  },
  {
    id: 4,
    layer: 'background',
    type: 'icho',
    spawnX: 0.42,
    initialOffset: 0.82,
    loops: 1,
    scale: 0.021,
    driftX: -0.18, // Slow, quiet descent
    swayAmp: 0.016,
    swayHarmonic: 1,
    swayPhase: 1.6,
    baseRot: 1.2,
    rotTurns: -1,
    wobbleAmp: 0.35,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 2.1,
    color: '#eab308',
    veinColor: '#854d0e',
    alpha: 0.42,
    breathResponsive: true,
  },
  {
    id: 5,
    layer: 'background',
    type: 'zelkova',
    spawnX: 0.12,
    initialOffset: 0.16,
    loops: 1,
    scale: 0.025,
    driftX: -0.28, // Standard drift
    swayAmp: 0.024,
    swayHarmonic: 2,
    swayPhase: 3.1,
    baseRot: -0.9,
    rotTurns: 1,
    wobbleAmp: 0.38,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.9,
    color: '#d97706',
    veinColor: '#78350f',
    alpha: 0.45,
  },

  // Midground (5)
  {
    id: 6,
    layer: 'midground',
    type: 'momiji',
    spawnX: 0.55,
    initialOffset: 0.10,
    loops: 1,
    scale: 0.044,
    driftX: -0.28, // Standard drift
    swayAmp: 0.036,
    swayHarmonic: 2,
    swayPhase: 0.4,
    baseRot: 0.5,
    rotTurns: 1,
    wobbleAmp: 0.45,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.8,
    color: '#dc2626',
    veinColor: '#991b1b',
    alpha: 0.82,
  },
  {
    id: 7,
    layer: 'midground',
    type: 'icho',
    spawnX: 0.88,
    initialOffset: 0.26,
    loops: 1,
    scale: 0.038,
    driftX: -0.40, // Carried across diagonally
    swayAmp: 0.040,
    swayHarmonic: 1,
    swayPhase: 1.8,
    baseRot: -0.4,
    rotTurns: -1,
    wobbleAmp: 0.5,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 1.4,
    color: '#facc15',
    veinColor: '#a16207',
    alpha: 0.84,
  },
  {
    id: 8,
    layer: 'midground',
    type: 'zelkova',
    spawnX: 0.28,
    initialOffset: 0.42,
    loops: 1,
    scale: 0.042,
    driftX: -0.19, // Milder angle
    swayAmp: 0.022,
    swayHarmonic: 2,
    swayPhase: 2.7,
    baseRot: 0.7,
    rotTurns: 1,
    wobbleAmp: 0.4,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 2.4,
    color: '#ea580c',
    veinColor: '#9a3412',
    alpha: 0.80,
    breathResponsive: true,
  },
  {
    id: 9,
    layer: 'midground',
    type: 'momiji',
    spawnX: 1.05,
    initialOffset: 0.84,
    loops: 1,
    scale: 0.046,
    driftX: -0.34, // Swept along right quadrant
    swayAmp: 0.035,
    swayHarmonic: 2,
    swayPhase: 1.2,
    baseRot: -0.8,
    rotTurns: -1,
    wobbleAmp: 0.48,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.2,
    color: '#e11d48',
    veinColor: '#881337',
    alpha: 0.85,
  },
  {
    id: 10,
    layer: 'midground',
    type: 'icho',
    spawnX: 0.18,
    initialOffset: 0.94,
    loops: 1,
    scale: 0.039,
    driftX: -0.22, // Slower lateral movement
    swayAmp: 0.026,
    swayHarmonic: 1,
    swayPhase: 0.9,
    baseRot: 1.1,
    rotTurns: 0,
    wobbleAmp: 0.42,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 1.9,
    color: '#f59e0b',
    veinColor: '#b45309',
    alpha: 0.82,
    breathResponsive: true,
  },

  // Foreground (1) - Appears occasionally at the screen edge, subtle depth
  {
    id: 11,
    layer: 'foreground',
    type: 'momiji',
    spawnX: 1.06, // Glides across far-right margin
    initialOffset: 0.62,
    loops: 1, // Single graceful transit per cycle, never crowding
    scale: 0.058, // Controlled size, enhances depth without blocking content
    driftX: -0.18,
    swayAmp: 0.030,
    swayHarmonic: 2,
    swayPhase: 0.6,
    baseRot: 0.3,
    rotTurns: 1,
    wobbleAmp: 0.45,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.0,
    color: '#ef4444',
    veinColor: '#7f1d1d',
    alpha: 0.88,
  },

  // --- MEDIUM TIER EXPANSION (Leaves 12 - 23) ---
  // Background (+5 => total 11)
  {
    id: 12,
    layer: 'background',
    type: 'momiji',
    spawnX: 0.82,
    initialOffset: 0.12,
    loops: 1,
    scale: 0.023,
    driftX: -0.32,
    swayAmp: 0.022,
    swayHarmonic: 1,
    swayPhase: 0.8,
    baseRot: -0.5,
    rotTurns: 1,
    wobbleAmp: 0.32,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 1.5,
    color: '#b91c1c',
    veinColor: '#450a0a',
    alpha: 0.46,
  },
  {
    id: 13,
    layer: 'background',
    type: 'icho',
    spawnX: 0.36,
    initialOffset: 0.32,
    loops: 1,
    scale: 0.025,
    driftX: -0.15, // Very gentle drift
    swayAmp: 0.016,
    swayHarmonic: 2,
    swayPhase: 2.1,
    baseRot: 0.7,
    rotTurns: -1,
    wobbleAmp: 0.36,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 0.4,
    color: '#eab308',
    veinColor: '#a16207',
    alpha: 0.44,
    breathResponsive: true,
  },
  {
    id: 14,
    layer: 'background',
    type: 'zelkova',
    spawnX: 1.25,
    initialOffset: 0.46,
    loops: 1,
    scale: 0.024,
    driftX: -0.44, // Wind sweep
    swayAmp: 0.030,
    swayHarmonic: 1,
    swayPhase: 1.4,
    baseRot: -1.0,
    rotTurns: 0,
    wobbleAmp: 0.34,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 2.8,
    color: '#d97706',
    veinColor: '#78350f',
    alpha: 0.45,
  },
  {
    id: 15,
    layer: 'background',
    type: 'momiji',
    spawnX: 0.06,
    initialOffset: 0.78,
    loops: 1,
    scale: 0.022,
    driftX: -0.20,
    swayAmp: 0.020,
    swayHarmonic: 2,
    swayPhase: 0.5,
    baseRot: 0.2,
    rotTurns: 1,
    wobbleAmp: 0.3,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 1.1,
    color: '#991b1b',
    veinColor: '#7f1d1d',
    alpha: 0.48,
  },
  {
    id: 16,
    layer: 'background',
    type: 'icho',
    spawnX: 0.50,
    initialOffset: 0.90,
    loops: 1,
    scale: 0.026,
    driftX: -0.36,
    swayAmp: 0.026,
    swayHarmonic: 1,
    swayPhase: 2.9,
    baseRot: -0.6,
    rotTurns: -1,
    wobbleAmp: 0.38,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 0.6,
    color: '#ca8a04',
    veinColor: '#854d0e',
    alpha: 0.43,
    breathResponsive: true,
  },

  // Midground (+5 => total 10)
  {
    id: 17,
    layer: 'midground',
    type: 'momiji',
    spawnX: 0.92,
    initialOffset: 0.04,
    loops: 1,
    scale: 0.045,
    driftX: -0.42, // Noticeably swifter lateral drift
    swayAmp: 0.038,
    swayHarmonic: 2,
    swayPhase: 1.5,
    baseRot: -0.3,
    rotTurns: 1,
    wobbleAmp: 0.44,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 2.3,
    color: '#dc2626',
    veinColor: '#7f1d1d',
    alpha: 0.83,
  },
  {
    id: 18,
    layer: 'midground',
    type: 'icho',
    spawnX: 0.46,
    initialOffset: 0.18,
    loops: 1,
    scale: 0.040,
    driftX: -0.22, // Slower lateral drift
    swayAmp: 0.026,
    swayHarmonic: 1,
    swayPhase: 0.7,
    baseRot: 0.9,
    rotTurns: -1,
    wobbleAmp: 0.46,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 0.9,
    color: '#facc15',
    veinColor: '#b45309',
    alpha: 0.85,
  },
  {
    id: 19,
    layer: 'midground',
    type: 'zelkova',
    spawnX: 0.74,
    initialOffset: 0.38,
    loops: 1,
    scale: 0.043,
    driftX: -0.30,
    swayAmp: 0.032,
    swayHarmonic: 2,
    swayPhase: 2.2,
    baseRot: -0.7,
    rotTurns: 1,
    wobbleAmp: 0.42,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 1.7,
    color: '#ea580c',
    veinColor: '#7c2d12',
    alpha: 0.81,
    breathResponsive: true,
  },
  {
    id: 20,
    layer: 'midground',
    type: 'momiji',
    spawnX: 0.16,
    initialOffset: 0.76,
    loops: 1,
    scale: 0.046,
    driftX: -0.20,
    swayAmp: 0.026,
    swayHarmonic: 2,
    swayPhase: 1.0,
    baseRot: 0.4,
    rotTurns: -1,
    wobbleAmp: 0.48,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.5,
    color: '#f43f5e',
    veinColor: '#9f1239',
    alpha: 0.84,
  },
  {
    id: 21,
    layer: 'midground',
    type: 'icho',
    spawnX: 1.12,
    initialOffset: 0.86,
    loops: 1,
    scale: 0.039,
    driftX: -0.38,
    swayAmp: 0.036,
    swayHarmonic: 1,
    swayPhase: 2.5,
    baseRot: -1.2,
    rotTurns: 0,
    wobbleAmp: 0.45,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 2.1,
    color: '#f59e0b',
    veinColor: '#a16207',
    alpha: 0.83,
    breathResponsive: true,
  },

  // Foreground (+2 => total 3) - Far-edge sweeps with gentle cadence
  {
    id: 22,
    layer: 'foreground',
    type: 'icho',
    spawnX: 0.16, // Left periphery
    initialOffset: 0.20,
    loops: 1,
    scale: 0.056,
    driftX: -0.22,
    swayAmp: 0.028,
    swayHarmonic: 2,
    swayPhase: 1.4,
    baseRot: -0.5,
    rotTurns: -1,
    wobbleAmp: 0.45,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.7,
    color: '#facc15',
    veinColor: '#a16207',
    alpha: 0.88,
  },
  {
    id: 23,
    layer: 'foreground',
    type: 'zelkova',
    spawnX: 1.15, // Right periphery
    initialOffset: 0.72,
    loops: 1,
    scale: 0.058,
    driftX: -0.24,
    swayAmp: 0.030,
    swayHarmonic: 2,
    swayPhase: 2.6,
    baseRot: 0.8,
    rotTurns: 1,
    wobbleAmp: 0.46,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.9,
    color: '#f97316',
    veinColor: '#7c2d12',
    alpha: 0.89,
  },

  // --- STRONG TIER EXPANSION (Leaves 24 - 37) ---
  // Background (+5 => total 16)
  {
    id: 24,
    layer: 'background',
    type: 'momiji',
    spawnX: 0.62,
    initialOffset: 0.16,
    loops: 1,
    scale: 0.024,
    driftX: -0.22,
    swayAmp: 0.018,
    swayHarmonic: 2,
    swayPhase: 1.7,
    baseRot: 0.6,
    rotTurns: 1,
    wobbleAmp: 0.35,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 0.9,
    color: '#b91c1c',
    veinColor: '#7f1d1d',
    alpha: 0.47,
  },
  {
    id: 25,
    layer: 'background',
    type: 'icho',
    spawnX: 1.02,
    initialOffset: 0.34,
    loops: 1,
    scale: 0.022,
    driftX: -0.40,
    swayAmp: 0.032,
    swayHarmonic: 1,
    swayPhase: 0.3,
    baseRot: -0.8,
    rotTurns: -1,
    wobbleAmp: 0.32,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 1.6,
    color: '#ca8a04',
    veinColor: '#854d0e',
    alpha: 0.45,
    breathResponsive: true,
  },
  {
    id: 26,
    layer: 'background',
    type: 'zelkova',
    spawnX: 0.20,
    initialOffset: 0.54,
    loops: 1,
    scale: 0.025,
    driftX: -0.16,
    swayAmp: 0.016,
    swayHarmonic: 2,
    swayPhase: 2.8,
    baseRot: 1.0,
    rotTurns: 0,
    wobbleAmp: 0.36,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 2.4,
    color: '#c2410c',
    veinColor: '#7c2d12',
    alpha: 0.44,
  },
  {
    id: 27,
    layer: 'background',
    type: 'momiji',
    spawnX: 0.78,
    initialOffset: 0.74,
    loops: 1,
    scale: 0.023,
    driftX: -0.34,
    swayAmp: 0.025,
    swayHarmonic: 1,
    swayPhase: 1.1,
    baseRot: -0.4,
    rotTurns: 1,
    wobbleAmp: 0.31,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 0.3,
    color: '#991b1b',
    veinColor: '#450a0a',
    alpha: 0.46,
    breathResponsive: true,
  },
  {
    id: 28,
    layer: 'background',
    type: 'icho',
    spawnX: 1.30,
    initialOffset: 0.88,
    loops: 1,
    scale: 0.026,
    driftX: -0.30,
    swayAmp: 0.024,
    swayHarmonic: 2,
    swayPhase: 2.4,
    baseRot: 0.5,
    rotTurns: -1,
    wobbleAmp: 0.37,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 1.8,
    color: '#eab308',
    veinColor: '#a16207',
    alpha: 0.43,
  },

  // Midground (+6 => total 16)
  {
    id: 29,
    layer: 'midground',
    type: 'momiji',
    spawnX: 0.34,
    initialOffset: 0.06,
    loops: 1,
    scale: 0.046,
    driftX: -0.26,
    swayAmp: 0.030,
    swayHarmonic: 2,
    swayPhase: 0.9,
    baseRot: 0.7,
    rotTurns: 1,
    wobbleAmp: 0.47,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.1,
    color: '#dc2626',
    veinColor: '#991b1b',
    alpha: 0.84,
  },
  {
    id: 30,
    layer: 'midground',
    type: 'icho',
    spawnX: 0.70,
    initialOffset: 0.24,
    loops: 1,
    scale: 0.041,
    driftX: -0.36,
    swayAmp: 0.036,
    swayHarmonic: 1,
    swayPhase: 1.9,
    baseRot: -0.9,
    rotTurns: -1,
    wobbleAmp: 0.45,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 2.0,
    color: '#facc15',
    veinColor: '#a16207',
    alpha: 0.86,
  },
  {
    id: 31,
    layer: 'midground',
    type: 'zelkova',
    spawnX: 1.20,
    initialOffset: 0.38,
    loops: 1,
    scale: 0.044,
    driftX: -0.44, // Fast horizontal drift
    swayAmp: 0.040,
    swayHarmonic: 2,
    swayPhase: 0.4,
    baseRot: 0.3,
    rotTurns: 1,
    wobbleAmp: 0.43,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 0.8,
    color: '#ea580c',
    veinColor: '#9a3412',
    alpha: 0.82,
    breathResponsive: true,
  },
  {
    id: 32,
    layer: 'midground',
    type: 'momiji',
    spawnX: 0.12,
    initialOffset: 0.58,
    loops: 1,
    scale: 0.047,
    driftX: -0.18, // Mild lateral drift
    swayAmp: 0.022,
    swayHarmonic: 2,
    swayPhase: 2.5,
    baseRot: -0.6,
    rotTurns: -1,
    wobbleAmp: 0.51,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.6,
    color: '#e11d48',
    veinColor: '#881337',
    alpha: 0.85,
  },
  {
    id: 33,
    layer: 'midground',
    type: 'icho',
    spawnX: 0.54,
    initialOffset: 0.70,
    loops: 1,
    scale: 0.038,
    driftX: -0.24,
    swayAmp: 0.026,
    swayHarmonic: 1,
    swayPhase: 1.3,
    baseRot: 1.0,
    rotTurns: 0,
    wobbleAmp: 0.44,
    wobbleHarmonic: 2,
    tumbleHarmonic: 1,
    tumblePhase: 2.5,
    color: '#f59e0b',
    veinColor: '#b45309',
    alpha: 0.83,
    breathResponsive: true,
  },
  {
    id: 34,
    layer: 'midground',
    type: 'zelkova',
    spawnX: 0.88,
    initialOffset: 0.85,
    loops: 1,
    scale: 0.042,
    driftX: -0.32,
    swayAmp: 0.032,
    swayHarmonic: 2,
    swayPhase: 2.1,
    baseRot: -0.5,
    rotTurns: 1,
    wobbleAmp: 0.46,
    wobbleHarmonic: 1,
    tumbleHarmonic: 2,
    tumblePhase: 0.4,
    color: '#d97706',
    veinColor: '#78350f',
    alpha: 0.82,
  },

  // Foreground (+3 => total 6) - Border sweeps, never saturating camera center
  {
    id: 35,
    layer: 'foreground',
    type: 'momiji',
    spawnX: 0.20, // Far left edge
    initialOffset: 0.35,
    loops: 1,
    scale: 0.060,
    driftX: -0.26,
    swayAmp: 0.032,
    swayHarmonic: 2,
    swayPhase: 0.5,
    baseRot: 0.5,
    rotTurns: 1,
    wobbleAmp: 0.48,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 1.2,
    color: '#dc2626',
    veinColor: '#7f1d1d',
    alpha: 0.90,
  },
  {
    id: 36,
    layer: 'foreground',
    type: 'icho',
    spawnX: 0.98, // Far right edge
    initialOffset: 0.82,
    loops: 1,
    scale: 0.055,
    driftX: -0.18,
    swayAmp: 0.026,
    swayHarmonic: 2,
    swayPhase: 1.8,
    baseRot: -0.7,
    rotTurns: -1,
    wobbleAmp: 0.45,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 2.1,
    color: '#facc15',
    veinColor: '#a16207',
    alpha: 0.89,
  },
  {
    id: 37,
    layer: 'foreground',
    type: 'zelkova',
    spawnX: 0.06, // Far left edge
    initialOffset: 0.52,
    loops: 1,
    scale: 0.058,
    driftX: -0.20,
    swayAmp: 0.028,
    swayHarmonic: 2,
    swayPhase: 2.9,
    baseRot: 1.1,
    rotTurns: 1,
    wobbleAmp: 0.48,
    wobbleHarmonic: 2,
    tumbleHarmonic: 2,
    tumblePhase: 0.6,
    color: '#ea580c',
    veinColor: '#7c2d12',
    alpha: 0.90,
  },
];

/**
 * Returns the active leaf subset based on selected intensity.
 */
export function getActiveAutumnLeaves(intensity: MaskIntensity): LeafParticle[] {
  switch (intensity) {
    case 'weak':
      return AUTUMN_LEAVES.slice(0, 12);
    case 'medium':
      return AUTUMN_LEAVES.slice(0, 24);
    case 'strong':
    default:
      return AUTUMN_LEAVES.slice(0, 38);
  }
}

/**
 * Draw Japanese Maple (Momiji / 紅葉) silhouette
 */
function drawMomijiPath(ctx: CanvasRenderingContext2D, r: number): void {
  // Stem (petiole)
  ctx.beginPath();
  ctx.moveTo(0, r * 0.22);
  ctx.lineTo(0, r * 0.95);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.lineCap = 'round';
  ctx.stroke();

  // 5-lobed serrated leaf body
  ctx.beginPath();
  ctx.moveTo(0, r * 0.20);
  // Lower left spur
  ctx.quadraticCurveTo(-r * 0.25, r * 0.20, -r * 0.40, r * 0.26);
  ctx.quadraticCurveTo(-r * 0.30, r * 0.10, -r * 0.62, r * 0.08); // lower left tip
  // Notch to mid left lobe
  ctx.quadraticCurveTo(-r * 0.40, -r * 0.08, -r * 0.76, -r * 0.36); // mid left tip
  // Notch to top center lobe
  ctx.quadraticCurveTo(-r * 0.36, -r * 0.38, 0, -r * 0.95); // top center tip
  // Top center to mid right lobe
  ctx.quadraticCurveTo(r * 0.36, -r * 0.38, r * 0.76, -r * 0.36); // mid right tip
  // Notch to lower right lobe
  ctx.quadraticCurveTo(r * 0.40, -r * 0.08, r * 0.62, r * 0.08); // lower right tip
  // Lower right spur
  ctx.quadraticCurveTo(r * 0.30, r * 0.10, r * 0.40, r * 0.26);
  ctx.quadraticCurveTo(r * 0.25, r * 0.20, 0, r * 0.20);
  ctx.closePath();
}

/**
 * Draw Momiji central and lateral veins
 */
function drawMomijiVeins(ctx: CanvasRenderingContext2D, r: number, veinColor: string): void {
  ctx.beginPath();
  // Central vein
  ctx.moveTo(0, r * 0.18);
  ctx.lineTo(0, -r * 0.76);
  // Left ribs
  ctx.moveTo(0, -r * 0.06);
  ctx.lineTo(-r * 0.52, -r * 0.24);
  ctx.moveTo(0, r * 0.08);
  ctx.lineTo(-r * 0.42, 0.06);
  // Right ribs
  ctx.moveTo(0, -r * 0.06);
  ctx.lineTo(r * 0.52, -r * 0.24);
  ctx.moveTo(0, r * 0.08);
  ctx.lineTo(r * 0.42, 0.06);

  ctx.strokeStyle = veinColor;
  ctx.lineWidth = Math.max(0.9, r * 0.045);
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Draw Ginkgo (Icho / イチョウ) fan silhouette
 */
function drawGinkgoPath(ctx: CanvasRenderingContext2D, r: number): void {
  // Curved slender stem
  ctx.beginPath();
  ctx.moveTo(0, r * 0.22);
  ctx.quadraticCurveTo(-r * 0.12, r * 0.58, -r * 0.06, r * 0.95);
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = Math.max(1.2, r * 0.075);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Fan shape with center cleft notch
  ctx.beginPath();
  ctx.moveTo(0, r * 0.20);
  // Left fan edge
  ctx.bezierCurveTo(-r * 0.35, r * 0.14, -r * 0.85, -r * 0.05, -r * 0.85, -r * 0.42);
  // Top undulating edge with center notch
  ctx.bezierCurveTo(-r * 0.74, -r * 0.78, -r * 0.25, -r * 0.86, -r * 0.03, -r * 0.65);
  ctx.lineTo(0, -r * 0.58); // center cleft
  ctx.lineTo(r * 0.03, -r * 0.65);
  ctx.bezierCurveTo(r * 0.25, -r * 0.86, r * 0.74, -r * 0.78, r * 0.85, -r * 0.42);
  // Right fan edge
  ctx.bezierCurveTo(r * 0.85, -r * 0.05, r * 0.35, r * 0.14, 0, r * 0.20);
  ctx.closePath();
}

/**
 * Draw Ginkgo delicate radiating veins
 */
function drawGinkgoVeins(ctx: CanvasRenderingContext2D, r: number, veinColor: string): void {
  ctx.beginPath();
  const angles = [-0.62, -0.38, -0.16, 0, 0.16, 0.38, 0.62];
  for (const ang of angles) {
    ctx.moveTo(0, r * 0.18);
    const tipX = Math.sin(ang) * r * 0.65;
    const tipY = -Math.cos(ang) * r * 0.55;
    ctx.quadraticCurveTo(tipX * 0.45, (r * 0.18 + tipY) * 0.5, tipX, tipY);
  }
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = Math.max(0.75, r * 0.035);
  ctx.stroke();
}

/**
 * Draw Zelkova / Beech (欅・ブナ / 楕円鋸歯葉) silhouette
 */
function drawZelkovaPath(ctx: CanvasRenderingContext2D, r: number): void {
  // Stem
  ctx.beginPath();
  ctx.moveTo(0, r * 0.52);
  ctx.lineTo(0, r * 0.95);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Ovate leaf body with tapered tip
  ctx.beginPath();
  ctx.moveTo(0, r * 0.50);
  ctx.bezierCurveTo(-r * 0.54, r * 0.32, -r * 0.58, -r * 0.38, 0, -r * 0.95);
  ctx.bezierCurveTo(r * 0.58, -r * 0.38, r * 0.54, r * 0.32, 0, r * 0.50);
  ctx.closePath();
}

/**
 * Draw Zelkova midrib and pinnate side ribs
 */
function drawZelkovaVeins(ctx: CanvasRenderingContext2D, r: number, veinColor: string): void {
  ctx.beginPath();
  // Central midrib
  ctx.moveTo(0, r * 0.50);
  ctx.lineTo(0, -r * 0.85);

  // Lateral ribs
  const yLevels = [0.28, 0.04, -0.22, -0.46];
  for (const y of yLevels) {
    const span = (0.50 - Math.abs(y)) * 0.72;
    ctx.moveTo(0, r * y);
    ctx.lineTo(-r * span, r * (y - 0.16));
    ctx.moveTo(0, r * y);
    ctx.lineTo(r * span, r * (y - 0.16));
  }
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = Math.max(0.85, r * 0.04);
  ctx.stroke();
}

/**
 * Core Autumn Mask Rendering Function
 * 
 * Evaluates the deterministic continuous motion equation for all active leaves
 * and paints them sorted by depth layer (Background -> Midground -> Foreground).
 * 
 * Shared identically by CanvasStage (preview) and exporter (GIF, WebM, MP4).
 */
export function renderAutumnMask(
  ctx: CanvasRenderingContext2D,
  maskConfig: MaskConfig,
  canvasWidth: number,
  canvasHeight: number,
  timeMs: number,
  totalDurationMs?: number
): void {
  if (maskConfig.type !== 'autumn') return;

  const leaves = getActiveAutumnLeaves(maskConfig.intensity);
  const minDim = Math.min(canvasWidth, canvasHeight);

  // Cycle duration for seamless loop closure (defaults to 2400ms matching video/GIF)
  const cycleMs = totalDurationMs && totalDurationMs > 0 ? totalDurationMs : 2400;
  const normTime = (timeMs % cycleMs) / cycleMs;

  // Offscreen vertical traversal span (-0.12 to 1.15 = span of 1.27)
  const startY = -0.12;
  const endY = 1.15;
  const spanY = endY - startY;

  // Density "Breath" Cycle (0.0 to 1.0 harmonic wave)
  // Creates a natural lull / breathing pause where leaves gently thin out for a brief moment,
  // letting UI information and avatar breathe without visual clutter.
  const breathPhase = normTime * 2 * Math.PI - Math.PI * 0.4;
  const breathWave = 0.5 + 0.5 * Math.sin(breathPhase); // 0.0 = lull (sparse), 1.0 = flurry (dense)

  // Render layer by layer: Background -> Midground -> Foreground
  const layers: LeafLayer[] = ['background', 'midground', 'foreground'];

  ctx.save();

  for (const layer of layers) {
    const layerLeaves = leaves.filter((l) => l.layer === layer);

    for (const leaf of layerLeaves) {
      // Deterministic progress along the vertical traversal
      const progress = (normTime * leaf.loops + leaf.initialOffset) % 1.0;

      // Vertical position (guaranteed completely offscreen when progress wraps at 0.0 / 1.0)
      const normY = startY + progress * spanY;
      const py = normY * canvasHeight;

      // Horizontal position with diagonal wind drift + harmonic sine sway
      const sway = leaf.swayAmp * Math.sin(leaf.swayHarmonic * 2 * Math.PI * progress + leaf.swayPhase);
      const normX = leaf.spawnX + leaf.driftX * progress + sway;
      const px = normX * canvasWidth;

      // Skip rendering if entirely offscreen
      if (py < -80 || py > canvasHeight + 80 || px < -80 || px > canvasWidth + 80) {
        continue;
      }

      // Density breath modulation: responsive leaves soften during the lull phase
      let effectiveAlpha = leaf.alpha;
      if (leaf.breathResponsive) {
        effectiveAlpha *= (0.24 + 0.76 * breathWave);
      }

      // Skip negligible alpha
      if (effectiveAlpha < 0.03) {
        continue;
      }

      // Radius in canvas pixels
      const radius = leaf.scale * minDim;

      // Rotation: base rotation + complete integer turns + harmonic wobble
      const wobble = leaf.wobbleAmp * Math.sin(leaf.wobbleHarmonic * 2 * Math.PI * progress);
      const rotation = leaf.baseRot + leaf.rotTurns * 2 * Math.PI * progress + wobble;

      // 3D Tumbling flutter: simulate leaf flipping around horizontal axis in wind
      const tumbleAngle = leaf.tumbleHarmonic * 2 * Math.PI * progress + leaf.tumblePhase;
      const flipScale = Math.cos(tumbleAngle);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rotation);
      // Apply 3D tumble flip (preserves aspect ratio width, flattens height during flip)
      ctx.scale(1, Math.max(0.18, Math.abs(flipScale)) * (flipScale < 0 ? -1 : 1));

      ctx.globalAlpha = effectiveAlpha;

      // Subtle drop shadow for depth (stronger on midground & foreground)
      const shadowAlphaRatio = effectiveAlpha / leaf.alpha;
      if (leaf.layer === 'foreground') {
        ctx.shadowColor = `rgba(0, 0, 0, ${0.32 * shadowAlphaRatio})`;
        ctx.shadowBlur = radius * 0.22;
        ctx.shadowOffsetY = radius * 0.10;
      } else if (leaf.layer === 'midground') {
        ctx.shadowColor = `rgba(0, 0, 0, ${0.20 * shadowAlphaRatio})`;
        ctx.shadowBlur = radius * 0.16;
        ctx.shadowOffsetY = radius * 0.08;
      }

      // Draw leaf silhouette
      ctx.fillStyle = leaf.color;
      switch (leaf.type) {
        case 'momiji':
          drawMomijiPath(ctx, radius);
          break;
        case 'icho':
          drawGinkgoPath(ctx, radius);
          break;
        case 'zelkova':
          drawZelkovaPath(ctx, radius);
          break;
      }
      ctx.fill();

      // Reset shadow before drawing veins
      ctx.shadowColor = 'transparent';

      // Draw delicate vein details
      switch (leaf.type) {
        case 'momiji':
          drawMomijiVeins(ctx, radius, leaf.veinColor);
          break;
        case 'icho':
          drawGinkgoVeins(ctx, radius, leaf.veinColor);
          break;
        case 'zelkova':
          drawZelkovaVeins(ctx, radius, leaf.veinColor);
          break;
      }

      ctx.restore();
    }
  }

  ctx.restore();
}
