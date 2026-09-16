/**
 * HEAL3 SNS-Creator - Core Canvas 2D Renderer
 * 
 * Hardware-accelerated 2D Canvas drawing pipeline:
 * - Renders BASE image with aspect ratio preservation
 * - Transforms normalized coordinates to canvas pixel space
 * - Evaluates and applies decoupled Motion Recipes
 * - Renders crisp vector stamp graphics (Star, Heart, Circle)
 * - Renders selection bounding indicator & transform hints
 */

import { BaseImageState, SceneMotionId, StampItem } from './types.ts';
import { getMotionRecipe, getSceneMotionRecipe } from './motion.ts';

export interface RenderOptions {
  isInteractivePreview?: boolean;
  selectedStampId?: string | null;
  activeManipulatingId?: string | null;
  dpr?: number;
}

/**
 * Draw 5-pointed star
 */
function drawStarPath(ctx: CanvasRenderingContext2D, radius: number): void {
  const points = 5;
  const innerRadius = radius * 0.48;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

/**
 * Draw smooth heart path
 */
function drawHeartPath(ctx: CanvasRenderingContext2D, size: number): void {
  const r = size * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.35);
  ctx.bezierCurveTo(-r * 0.55, -r * 0.95, -r * 1.05, -r * 0.45, -r * 1.0, r * 0.1);
  ctx.bezierCurveTo(-r * 0.95, r * 0.55, -r * 0.45, r * 0.85, 0, r * 1.1);
  ctx.bezierCurveTo(r * 0.45, r * 0.85, r * 0.95, r * 0.55, r * 1.0, r * 0.1);
  ctx.bezierCurveTo(r * 1.05, -r * 0.45, r * 0.55, -r * 0.95, 0, -r * 0.35);
  ctx.closePath();
}

/**
 * Draw styled circle / badge path
 */
function drawCircleBadgePath(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
}

/**
 * Render single stamp item
 */
export function renderStamp(
  ctx: CanvasRenderingContext2D,
  stamp: StampItem,
  canvasWidth: number,
  canvasHeight: number,
  timeMs: number,
  options: RenderOptions = {}
): void {
  const { isInteractivePreview = false, selectedStampId = null, activeManipulatingId = null } = options;
  const isSelected = selectedStampId === stamp.id;
  const isManipulating = activeManipulatingId === stamp.id;

  // Evaluate decoupled Motion Recipe
  const recipe = getMotionRecipe(stamp.motionId);
  const motionEval = recipe.evaluate(timeMs + stamp.motionOffsetMs, stamp.motionSpeed);

  // Calculate pixel coordinates from normalized relative coordinates
  const minDim = Math.min(canvasWidth, canvasHeight);
  const baseX = stamp.x * canvasWidth;
  const baseY = stamp.y * canvasHeight;

  // Add motion displacement
  const renderX = baseX + motionEval.dx * canvasWidth;
  const renderY = baseY + motionEval.dy * canvasHeight;

  // Selected lift: when actively manipulating, visually lift slightly (e.g. 1.08x)
  // without changing the underlying normalized data scale
  const interactiveLift = isManipulating ? 1.08 : isSelected ? 1.04 : 1.0;
  const renderRadius = (stamp.scale * minDim * 0.5) * motionEval.scaleFactor * interactiveLift;
  const renderRotation = ((stamp.rotation + motionEval.deltaRotation) * Math.PI) / 180;

  ctx.save();
  ctx.translate(renderX, renderY);
  ctx.rotate(renderRotation);
  ctx.globalAlpha = Math.max(0, Math.min(1, motionEval.alpha));

  // Motion glow effect
  if (motionEval.glow > 0.05) {
    ctx.save();
    ctx.shadowColor = stamp.accentColor || stamp.color;
    ctx.shadowBlur = renderRadius * 0.6 * motionEval.glow;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Stamp body rendering
  ctx.fillStyle = stamp.color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2.5, renderRadius * 0.08);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Drop shadow for tactile depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = renderRadius * 0.15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = renderRadius * 0.08;

  switch (stamp.type) {
    case 'star': {
      drawStarPath(ctx, renderRadius);
      ctx.fill();
      ctx.shadowColor = 'transparent'; // stroke without double shadow
      ctx.stroke();

      // Highlight sheen
      ctx.beginPath();
      ctx.arc(0, -renderRadius * 0.3, renderRadius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
      break;
    }
    case 'heart': {
      drawHeartPath(ctx, renderRadius * 0.7);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();

      // Highlight sheen
      ctx.beginPath();
      ctx.arc(-renderRadius * 0.28, -renderRadius * 0.22, renderRadius * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();
      break;
    }
    case 'circle': {
      drawCircleBadgePath(ctx, renderRadius * 0.85);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();

      // Inner smiley / cute face or inner ring
      ctx.beginPath();
      ctx.arc(0, 0, renderRadius * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = Math.max(2, renderRadius * 0.05);
      ctx.stroke();

      // Sparkle eyes
      const eyeR = renderRadius * 0.10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-renderRadius * 0.25, -renderRadius * 0.12, eyeR, 0, Math.PI * 2);
      ctx.arc(renderRadius * 0.25, -renderRadius * 0.12, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Joyful smile
      ctx.beginPath();
      ctx.arc(0, renderRadius * 0.05, renderRadius * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2.5, renderRadius * 0.07);
      ctx.stroke();
      break;
    }
    case 'foreground_image': {
      // Foreground cut-out Item (e.g. transparent avatar PNG)
      if (stamp.imageElement && stamp.imageElement.complete && stamp.imageElement.naturalWidth > 0) {
        const aspect = stamp.aspectRatio || (stamp.imageElement.naturalWidth / stamp.imageElement.naturalHeight);
        // Base width on 2x renderRadius with aspect ratio preserved
        let w = renderRadius * 2;
        let h = renderRadius * 2;
        if (aspect >= 1) {
          h = w / aspect;
        } else {
          w = h * aspect;
        }
        ctx.drawImage(stamp.imageElement, -w / 2, -h / 2, w, h);
      } else {
        // Subtle placeholder badge if image is still decoding
        drawCircleBadgePath(ctx, renderRadius * 0.7);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      break;
    }
  }

  if (motionEval.glow > 0.05) {
    ctx.restore();
  }

  // Interactive selection bounding box & handles
  if (isInteractivePreview && isSelected) {
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1.0;

    const boxSize = renderRadius * 2.15;
    ctx.strokeStyle = '#38bdf8'; // sky-400
    ctx.lineWidth = Math.max(1.8, minDim * 0.0035);
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);

    // Corner handle pills
    ctx.setLineDash([]);
    const handleR = Math.max(5, minDim * 0.012);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;

    const corners = [
      [-boxSize / 2, -boxSize / 2],
      [boxSize / 2, -boxSize / 2],
      [boxSize / 2, boxSize / 2],
      [-boxSize / 2, boxSize / 2],
    ];

    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, handleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Rotation top arm & handle
    const armLen = Math.max(22, minDim * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, -boxSize / 2);
    ctx.lineTo(0, -boxSize / 2 - armLen);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -boxSize / 2 - armLen, handleR * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Main Canvas Render function
 * Clears canvas, renders base image, then renders all stamps in sequence.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  baseImage: BaseImageState,
  stamps: StampItem[],
  canvasWidth: number,
  canvasHeight: number,
  timeMs: number,
  sceneMotionId: SceneMotionId = 'none',
  totalDurationMs?: number,
  options: RenderOptions = {}
): void {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Black background backdrop
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Evaluate deterministic Scene Motion Recipe
  const sceneRecipe = getSceneMotionRecipe(sceneMotionId);
  // If totalDurationMs is provided, loop timeMs within totalDurationMs so interactive preview loops seamlessly
  const effectiveSceneTimeMs = totalDurationMs && totalDurationMs > 0 ? (timeMs % totalDurationMs) : timeMs;
  const sceneEval = sceneRecipe.evaluate(effectiveSceneTimeMs, totalDurationMs);

  ctx.save();

  // Apply Scene Motion opacity
  if (sceneEval.alpha < 0.999) {
    ctx.globalAlpha = Math.max(0, Math.min(1, sceneEval.alpha));
  }

  // Apply Scene Motion scale (centered at origin, default center 0.5, 0.5)
  if (Math.abs(sceneEval.scale - 1.0) > 0.0005) {
    const originPxX = sceneEval.originX * canvasWidth;
    const originPxY = sceneEval.originY * canvasHeight;
    ctx.translate(originPxX, originPxY);
    ctx.scale(sceneEval.scale, sceneEval.scale);
    ctx.translate(-originPxX, -originPxY);
  }

  // --- Layer 1: BASE Image ---
  if (baseImage.image && baseImage.isLoaded) {
    ctx.drawImage(baseImage.image, 0, 0, canvasWidth, canvasHeight);
  } else {
    // Default elegant backdrop if no image loaded yet
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = Math.min(canvasWidth, canvasHeight) / 10;
    for (let x = 0; x < canvasWidth; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }

  // --- Layer 2: Stamps & Foreground Items in sequence ---
  for (const stamp of stamps) {
    renderStamp(ctx, stamp, canvasWidth, canvasHeight, timeMs, options);
  }

  ctx.restore();
}
