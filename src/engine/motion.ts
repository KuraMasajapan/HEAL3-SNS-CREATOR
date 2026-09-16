/**
 * HEAL3 SNS-Creator - Motion Recipe System
 * 
 * Separates "Material" from "Motion Definition".
 * Each motion defines a mathematically crafted animation curve with easing,
 * acceleration, overshoot, and lingering settlement for natural aesthetics.
 */

import { MotionEvaluation, MotionId, MotionRecipe } from './types.ts';

// Easing functions
function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

/** Elastic overshoot ease out */
function easeOutBack(x: number, c1 = 1.70158): number {
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export const MOTION_RECIPES: Record<MotionId, MotionRecipe> = {
  none: {
    id: 'none',
    name: 'Static',
    nameJa: '静止',
    description: 'No animation applied',
    durationMs: 1000,
    evaluate: (): MotionEvaluation => ({
      dx: 0,
      dy: 0,
      scaleFactor: 1.0,
      deltaRotation: 0,
      alpha: 1.0,
      glow: 0,
    }),
  },

  bounce: {
    id: 'bounce',
    name: 'Bounce',
    nameJa: 'バウンス',
    description: 'Rhythmic spring jump with anticipation, squash & stretch, and overshoot',
    durationMs: 1600,
    evaluate: (timeMs: number, speedMultiplier = 1.0): MotionEvaluation => {
      const loopDuration = 1600 / speedMultiplier;
      const progress = (timeMs % loopDuration) / loopDuration;

      let dy = 0;
      let scaleFactor = 1.0;
      let deltaRotation = 0;

      // Phase 1: 0.00 - 0.15: Anticipation (crouch / squash downward slightly)
      if (progress < 0.15) {
        const p = progress / 0.15;
        const crouch = Math.sin(p * Math.PI * 0.5);
        dy = crouch * 0.012; // slight drop
        scaleFactor = 1.0 - crouch * 0.08; // squash horizontally / flatten
      }
      // Phase 2: 0.15 - 0.50: Explosive jump upward with stretch
      else if (progress < 0.50) {
        const p = (progress - 0.15) / 0.35;
        // Peak jump around p = 0.55
        const jumpCurve = Math.sin(p * Math.PI);
        dy = -jumpCurve * 0.048; // jump up in normalized canvas units
        // Stretch vertically at peak velocity
        const stretch = Math.sin(p * Math.PI);
        scaleFactor = 1.0 + stretch * 0.14;
        deltaRotation = Math.sin(p * Math.PI) * 4; // slight tilt in air
      }
      // Phase 3: 0.50 - 0.75: Impact and rebound with overshoot
      else if (progress < 0.75) {
        const p = (progress - 0.50) / 0.25;
        // Dampened sine bounce
        const decay = Math.exp(-p * 3.5);
        const bounce = Math.sin(p * Math.PI * 3) * decay;
        dy = bounce * 0.015;
        scaleFactor = 1.0 + (1 - p) * 0.08 * Math.cos(p * Math.PI * 2);
      }
      // Phase 4: 0.75 - 1.00: Lingering settling / breathing rest
      else {
        const p = (progress - 0.75) / 0.25;
        const breath = Math.sin(p * Math.PI);
        dy = -breath * 0.002;
        scaleFactor = 1.0 + breath * 0.02;
      }

      return {
        dx: 0,
        dy,
        scaleFactor,
        deltaRotation,
        alpha: 1.0,
        glow: 0.1,
      };
    },
  },

  rotate: {
    id: 'rotate',
    name: 'Rotate',
    nameJa: 'ローテート',
    description: 'Playful swing with acceleration, overshoot settle, and gentle reverse sway',
    durationMs: 2400,
    evaluate: (timeMs: number, speedMultiplier = 1.0): MotionEvaluation => {
      const loopDuration = 2400 / speedMultiplier;
      const progress = (timeMs % loopDuration) / loopDuration;

      let deltaRotation = 0;
      let scaleFactor = 1.0;
      let dx = 0;

      // Phase 1: 0.0 - 0.4: Dynamic swing right with overshoot
      if (progress < 0.4) {
        const p = progress / 0.4;
        const eased = easeOutBack(p, 1.4);
        deltaRotation = eased * 22; // swings to +22 deg
        scaleFactor = 1.0 + Math.sin(p * Math.PI) * 0.07;
        dx = Math.sin(p * Math.PI) * 0.008;
      }
      // Phase 2: 0.4 - 0.8: Swing left with counter-overshoot
      else if (progress < 0.8) {
        const p = (progress - 0.4) / 0.4;
        const eased = easeOutBack(p, 1.4);
        deltaRotation = 22 - eased * 44; // swings to -22 deg
        scaleFactor = 1.0 + Math.sin(p * Math.PI) * 0.07;
        dx = -Math.sin(p * Math.PI) * 0.008;
      }
      // Phase 3: 0.8 - 1.0: Lingering ease return to neutral (0 deg)
      else {
        const p = (progress - 0.8) / 0.2;
        const eased = easeInOutSine(p);
        deltaRotation = -22 * (1 - eased);
        scaleFactor = 1.0;
        dx = 0;
      }

      return {
        dx,
        dy: 0,
        scaleFactor,
        deltaRotation,
        alpha: 1.0,
        glow: 0.05,
      };
    },
  },

  pulse: {
    id: 'pulse',
    name: 'Pulse / Glow',
    nameJa: 'パルス / 発光',
    description: 'Heartbeat rhythm with luminous aura expansion, gentle rebound and linger',
    durationMs: 1800,
    evaluate: (timeMs: number, speedMultiplier = 1.0): MotionEvaluation => {
      const loopDuration = 1800 / speedMultiplier;
      const progress = (timeMs % loopDuration) / loopDuration;

      let scaleFactor = 1.0;
      let glow = 0.0;
      let alpha = 1.0;

      // Double-pulse heartbeat effect
      // Beat 1: 0.0 - 0.25 (Main expansion)
      if (progress < 0.25) {
        const p = progress / 0.25;
        const beat1 = Math.sin(p * Math.PI);
        scaleFactor = 1.0 + beat1 * 0.22;
        glow = beat1 * 0.85;
      }
      // Beat 2: 0.25 - 0.45 (Secondary echo pulse)
      else if (progress < 0.45) {
        const p = (progress - 0.25) / 0.20;
        const beat2 = Math.sin(p * Math.PI);
        scaleFactor = 1.0 + beat2 * 0.12;
        glow = beat2 * 0.45;
      }
      // Lingering release: 0.45 - 1.0
      else {
        const p = (progress - 0.45) / 0.55;
        const linger = Math.exp(-p * 4.0) * Math.sin(p * Math.PI * 2);
        scaleFactor = 1.0 + linger * 0.03;
        glow = Math.max(0, 0.15 * (1 - p));
      }

      return {
        dx: 0,
        dy: 0,
        scaleFactor,
        deltaRotation: 0,
        alpha,
        glow,
      };
    },
  },
};

export function getMotionRecipe(id: MotionId): MotionRecipe {
  return MOTION_RECIPES[id] || MOTION_RECIPES.none;
}
