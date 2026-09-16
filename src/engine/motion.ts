/**
 * HEAL3 SNS-Creator - Motion Recipe System
 * 
 * Separates "Material" from "Motion Definition".
 * Each motion defines a mathematically crafted animation curve with easing,
 * acceleration, overshoot, and lingering settlement for natural aesthetics.
 */

import { MotionEvaluation, MotionId, MotionRecipe, SceneEasingType, SceneMotionEvaluation, SceneMotionId, SceneMotionParams, SceneMotionRecipe } from './types.ts';

// Easing functions
function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function easeInCubic(x: number): number {
  return x * x * x;
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

/**
 * Resolves progress [0, 1] using the specified SceneEasingType.
 */
export function applySceneEasing(progress: number, easing: SceneEasingType, overshootFactor = 1.35): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'linear':
      return p;
    case 'easeOutQuad':
      return easeOutQuad(p);
    case 'easeOutCubic':
      return easeOutCubic(p);
    case 'easeInOutSine':
      return easeInOutSine(p);
    case 'easeOutBack':
    case 'overshoot':
      return easeOutBack(p, overshootFactor);
    default:
      return easeOutCubic(p);
  }
}

/**
 * Deterministically evaluates any Scene Motion based strictly on its 8 Recipe Parameters.
 * 
 * Timeline Architecture:
 * 1. timeMs < params.delay: returns initial 'from' state
 * 2. delay <= timeMs < delay + duration: interpolates from 'from' to 'to' via configured easing curve
 * 3. timeMs >= delay + duration: Scene Intro is complete -> returns steady normal 'to' state.
 * 
 * Decoupled from Item Motion:
 * - Scene Intro handles the grand entrance of the whole canvas scene.
 * - When Scene Intro finishes, canvas scene holds steady at normal transform,
 *   while Item Motion (stamps / foreground) continues uninterrupted at 60 FPS.
 * - Shared identically between Preview Renderer and Export Renderer.
 */
export function evaluateSceneMotion(params: SceneMotionParams, timeMs: number): SceneMotionEvaluation {
  // 1. Before intro start delay
  if (timeMs < params.delay) {
    return {
      alpha: Math.max(0, Math.min(1, params.opacity.from)),
      scale: params.scale.from,
      dx: params.x.from,
      dy: params.y.from,
      rotation: params.rotation.from,
      originX: 0.5,
      originY: 0.5,
    };
  }

  // 3. After intro completed -> Steady Normal Scene (identity transform)
  if (params.duration <= 0 || timeMs >= params.delay + params.duration) {
    return {
      alpha: Math.max(0, Math.min(1, params.opacity.to)),
      scale: params.scale.to,
      dx: params.x.to,
      dy: params.y.to,
      rotation: params.rotation.to,
      originX: 0.5,
      originY: 0.5,
    };
  }

  // 2. During intro transition
  const linearProgress = (timeMs - params.delay) / params.duration;
  const eased = applySceneEasing(linearProgress, params.easing, params.overshootFactor);
  // Alpha uses smooth cubic ease-out capped at [0, 1] to avoid brightness flashing or clipping
  const alphaEased = Math.max(0, Math.min(1, easeOutCubic(linearProgress)));

  const alpha = params.opacity.from + (params.opacity.to - params.opacity.from) * alphaEased;
  const scale = params.scale.from + (params.scale.to - params.scale.from) * eased;
  const dx = params.x.from + (params.x.to - params.x.from) * eased;
  const dy = params.y.from + (params.y.to - params.y.from) * eased;
  const rotation = params.rotation.from + (params.rotation.to - params.rotation.from) * eased;

  return {
    alpha: Math.max(0, Math.min(1, alpha)),
    scale,
    dx,
    dy,
    rotation,
    originX: 0.5,
    originY: 0.5,
  };
}

/**
 * SCENE MOTION RECIPES
 * 
 * Controls overall presentation of the entire canvas scene (BASE + Stamps + Foreground).
 * Completely decoupled from individual Item Motion recipes.
 * 
 * Every recipe defines all 8 core parameters independently:
 * 1. duration
 * 2. delay
 * 3. opacity
 * 4. scale
 * 5. x
 * 6. y
 * 7. rotation
 * 8. easing
 */
export const SCENE_MOTION_RECIPES: Record<SceneMotionId, SceneMotionRecipe> = {
  none: {
    id: 'none',
    name: 'None',
    nameJa: 'なし',
    type: 'loop',
    params: {
      duration: 0,
      delay: 0,
      opacity: { from: 1.0, to: 1.0 },
      scale: { from: 1.0, to: 1.0 },
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'linear',
    },
    durationMs: 0,
    description: '通常表示（Scene Motion なし）',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.none.params, timeMs),
  },

  fade_in: {
    id: 'fade_in',
    name: 'Fade In',
    nameJa: 'フェードイン',
    type: 'intro',
    params: {
      duration: 1400, // 1.4秒 (ゆっくりと明確に現れる)
      delay: 0,
      opacity: { from: 0.0, to: 1.0 },
      scale: { from: 1.0, to: 1.0 },
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'easeOutCubic',
    },
    durationMs: 1400,
    description: '1.4秒かけて静かに浮かび上がるエレガントなフェード導入',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.fade_in.params, timeMs),
  },

  gentle_zoom: {
    id: 'gentle_zoom',
    name: 'Gentle Zoom',
    nameJa: 'ズームイン',
    type: 'intro',
    params: {
      duration: 1400, // 1.4秒
      delay: 0,
      opacity: { from: 1.0, to: 1.0 },
      scale: { from: 0.88, to: 1.0 }, // 0.88 -> 1.00で実機でも明確に認識できる拡大
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'easeOutCubic',
    },
    durationMs: 1400,
    description: '0.88から1.00へ画面全体がスムーズに前進するズーム導入',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.gentle_zoom.params, timeMs),
  },

  fade_and_zoom: {
    id: 'fade_and_zoom',
    name: 'Fade + Zoom',
    nameJa: 'フェード ＋ ズーム',
    type: 'intro',
    params: {
      duration: 1400, // 1.4秒
      delay: 0,
      opacity: { from: 0.0, to: 1.0 },
      scale: { from: 0.88, to: 1.0 },
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'easeOutCubic',
    },
    durationMs: 1400,
    description: '透明度とスケール(0.88→1.0)が同時に変化するリッチな導入',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.fade_and_zoom.params, timeMs),
  },

  dramatic_entrance: {
    id: 'dramatic_entrance',
    name: 'Dramatic Entrance',
    nameJa: 'ドラマチック登場',
    type: 'intro',
    params: {
      duration: 1500, // 約1.5秒
      delay: 0,
      opacity: { from: 0.0, to: 1.0 },
      scale: { from: 0.85, to: 1.0 }, // 約0.85から
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.07, to: 0.0 }, // Y方向に約7%下から浮上
      rotation: { from: -3.5, to: 0.0 }, // -3.5度傾いた状態から整列
      easing: 'overshoot',
      overshootFactor: 1.35, // 軽いオーバーシュートで自然に定着
    },
    durationMs: 1500,
    description: 'スケール0.85・下方・傾きから1.5秒かけてバウンス着地する強い導入演出',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.dramatic_entrance.params, timeMs),
  },
};

export function getSceneMotionRecipe(id: SceneMotionId): SceneMotionRecipe {
  return SCENE_MOTION_RECIPES[id] || SCENE_MOTION_RECIPES.none;
}
