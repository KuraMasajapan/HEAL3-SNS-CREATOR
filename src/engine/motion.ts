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

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Custom dramatic zoom easing:
 * Begins with steady hold, accelerates dynamically through mid-flight,
 * and decelerates with gentle settlement into the 100% frame.
 */
function easeDramaticZoom(x: number): number {
  const p = Math.max(0, Math.min(1, x));
  if (p < 0.35) {
    return Math.pow(p / 0.35, 2.4) * 0.28;
  }
  const t = (p - 0.35) / 0.65;
  return 0.28 + (1 - 0.28) * (1 - Math.pow(1 - t, 2.8));
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
    case 'easeInOutCubic':
      return easeInOutCubic(p);
    case 'dramaticZoom':
      return easeDramaticZoom(p);
    case 'easeOutBack':
    case 'overshoot':
      return easeOutBack(p, overshootFactor);
    default:
      return easeOutCubic(p);
  }
}

/**
 * Deterministically evaluates any Scene Motion based strictly on its Recipe Parameters + Poster Hold.
 * 
 * Timeline Architecture:
 * 1. 0 <= timeMs < posterHoldMs: Poster Hold Phase
 *    Displays full, complete artwork (scale=1, alpha=1, rot=0, offset=0).
 *    Guarantees that the very first frame of the video will NEVER be pitch black or transparent,
 *    eliminating the SNS thumbnail blackout issue.
 * 
 * 2. posterHoldMs <= timeMs < posterHoldMs + transitionDuration:
 *    Micro-transition into the initial intro state (smoothly avoiding sudden pop).
 * 
 * 3. Intro Phase:
 *    Interpolates from initial state to final state using configured easing curve.
 * 
 * 4. Steady Normal Scene (post-intro):
 *    Scene intro is finished; canvas scene holds steady at standard transform,
 *    while Foreground & Stamp Item Motion continues uninterrupted at 60 FPS.
 * 
 * Shared identically between Preview Renderer and Export Renderer.
 */
export function evaluateSceneMotion(params: SceneMotionParams, timeMs: number): SceneMotionEvaluation {
  const posterHold = Math.max(0, params.posterHoldMs || 0);
  const transitionDuration = posterHold > 0 ? 140 : 0; // ms for seamless ease into intro initial state

  // Phase 1: Poster Hold (Guarantee crisp thumbnail and preview of completed art)
  if (timeMs < posterHold) {
    return {
      alpha: 1.0,
      scale: 1.0,
      dx: 0.0,
      dy: 0.0,
      rotation: 0.0,
      originX: 0.5,
      originY: 0.5,
    };
  }

  // Phase 2: Micro-transition from Poster state (1.0) into Intro starting state (from)
  if (transitionDuration > 0 && timeMs < posterHold + transitionDuration) {
    const p = (timeMs - posterHold) / transitionDuration;
    const easedP = easeInOutSine(p);

    const targetAlpha = Math.max(0.12, params.opacity.from); // Prevent complete pitch black during transition
    const alpha = 1.0 + (targetAlpha - 1.0) * easedP;
    const scale = 1.0 + (params.scale.from - 1.0) * easedP;
    const dx = 0.0 + (params.x.from - 0.0) * easedP;
    const dy = 0.0 + (params.y.from - 0.0) * easedP;
    const rotation = 0.0 + (params.rotation.from - 0.0) * easedP;

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

  const introStartTime = posterHold + transitionDuration + Math.max(0, params.delay || 0);

  // Phase 4: After intro completed -> Steady Normal Scene (identity transform)
  if (params.duration <= 0 || timeMs >= introStartTime + params.duration) {
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

  // Phase 3: During intro transition
  const linearProgress = (timeMs - introStartTime) / params.duration;
  const eased = applySceneEasing(linearProgress, params.easing, params.overshootFactor);
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
 * Every recipe defines all parameters independently:
 * 1. posterHoldMs (prevents black thumbnail on SNS)
 * 2. duration
 * 3. delay
 * 4. opacity
 * 5. scale
 * 6. x
 * 7. y
 * 8. rotation
 * 9. easing
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
      posterHoldMs: 0,
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
      duration: 2200, // 2.2秒 (ゆったり優雅なシネマティック展開)
      delay: 0,
      posterHoldMs: 300, // 冒頭300ms完成ポスター保持 (黒サムネイル完全防止)
      opacity: { from: 0.18, to: 1.0 }, // 完全黒(0.0)を回避
      scale: { from: 1.0, to: 1.0 },
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'easeOutCubic',
    },
    durationMs: 2200,
    description: '冒頭サムネイル保護後、2.2秒かけて光が満ちるように浮き出るフェード',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.fade_in.params, timeMs),
  },

  gentle_zoom: {
    id: 'gentle_zoom',
    name: 'Gentle Zoom',
    nameJa: 'ズームイン',
    type: 'intro',
    params: {
      duration: 2400, // 2.4秒
      delay: 0,
      posterHoldMs: 300, // 冒頭300ms完成ポスター保持
      opacity: { from: 1.0, to: 1.0 },
      scale: { from: 0.82, to: 1.0 }, // 0.82 -> 1.00でゆったり前進
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'easeOutCubic',
    },
    durationMs: 2400,
    description: '冒頭ポスター確認後、0.82から2.4秒かけて大きく手前に前進するズーム',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.gentle_zoom.params, timeMs),
  },

  fade_and_zoom: {
    id: 'fade_and_zoom',
    name: 'Fade + Zoom',
    nameJa: 'フェード ＋ ズーム',
    type: 'intro',
    params: {
      duration: 2400, // 2.4秒
      delay: 0,
      posterHoldMs: 300,
      opacity: { from: 0.20, to: 1.0 },
      scale: { from: 0.82, to: 1.0 },
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'easeOutCubic',
    },
    durationMs: 2400,
    description: '透明度とスケール(0.82→1.0)が2.4秒かけて優雅に融合する演出',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.fade_and_zoom.params, timeMs),
  },

  dramatic_entrance: {
    id: 'dramatic_entrance',
    name: 'Dramatic Entrance',
    nameJa: 'ドラマチック登場',
    type: 'intro',
    params: {
      duration: 1800, // 1.8秒
      delay: 0,
      posterHoldMs: 300,
      opacity: { from: 0.25, to: 1.0 },
      scale: { from: 0.82, to: 1.0 },
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.08, to: 0.0 }, // Y方向下方から浮上
      rotation: { from: -4.0, to: 0.0 }, // 4度傾いた状態から水平へ
      easing: 'overshoot',
      overshootFactor: 1.35,
    },
    durationMs: 1800,
    description: '傾き・下方・スケール0.82から1.8秒かけてバウンス着地する強い演出',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.dramatic_entrance.params, timeMs),
  },

  slow_dramatic_zoom: {
    id: 'slow_dramatic_zoom',
    name: 'Slow Dramatic Zoom',
    nameJa: '超拡大ズーム',
    type: 'intro',
    params: {
      duration: 3200, // 約3.2秒かけてゆっくり拡大
      delay: 0,
      posterHoldMs: 350, // 冒頭350msは全体像ポスター表示
      opacity: { from: 1.0, to: 1.0 }, // 黒画面にせず常に可視
      scale: { from: 0.15, to: 1.0 }, // 最小スケール0.15から極限拡大！
      x: { from: 0.0, to: 0.0 },
      y: { from: 0.0, to: 0.0 },
      rotation: { from: 0.0, to: 0.0 },
      easing: 'dramaticZoom', // 途中で加速し、最後は滑らかに着地
    },
    durationMs: 3200,
    description: '全体像提示後、スケール0.15の遠景から3.2秒かけてダイナミックに加速・着地',
    evaluate: (timeMs: number): SceneMotionEvaluation =>
      evaluateSceneMotion(SCENE_MOTION_RECIPES.slow_dramatic_zoom.params, timeMs),
  },
};

export function getSceneMotionRecipe(id: SceneMotionId): SceneMotionRecipe {
  return SCENE_MOTION_RECIPES[id] || SCENE_MOTION_RECIPES.none;
}
