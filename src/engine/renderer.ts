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

import { BaseImageState, LayoutMode, MapFramePreset, MapSegmentState, MaskConfig, SceneMotionId, StampItem } from './types.ts';
import { HEAL3_MAP_SEGMENT_BOUNDS, MapSegmentBounds } from './config.ts';
import { getMotionRecipe, getSceneMotionRecipe } from './motion.ts';
import { renderAutumnMask } from './masks/autumnMask.ts';
import { renderSunlightMask } from './masks/sunlightMask.ts';

export interface RenderOptions {
  isInteractivePreview?: boolean;
  selectedStampId?: string | null;
  activeManipulatingId?: string | null;
  dpr?: number;
  maskConfig?: MaskConfig;
  layoutMode?: LayoutMode;
  mapSegment?: MapSegmentState;
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
 * Renders user photo cropped into the fixed HEAL3 Map Segment rectangle
 * using aspect-fill / center crop (object-fit: cover).
 */
export function renderMapSegmentPhoto(
  ctx: CanvasRenderingContext2D,
  photoImage: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  bounds: MapSegmentBounds = HEAL3_MAP_SEGMENT_BOUNDS
): void {
  const segX = bounds.x * canvasWidth;
  const segY = bounds.y * canvasHeight;
  const segW = bounds.width * canvasWidth;
  const segH = bounds.height * canvasHeight;
  const segRadius = (bounds.borderRadius ?? 0) * canvasWidth;

  const imgW = photoImage.naturalWidth || photoImage.width;
  const imgH = photoImage.naturalHeight || photoImage.height;
  if (imgW <= 0 || imgH <= 0 || segW <= 0 || segH <= 0) return;

  ctx.save();

  // Clip strictly to Map Segment bounds (with card border radius if specified)
  ctx.beginPath();
  if (segRadius > 0) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(segX, segY, segW, segH, segRadius);
    } else {
      ctx.moveTo(segX + segRadius, segY);
      ctx.lineTo(segX + segW - segRadius, segY);
      ctx.arcTo(segX + segW, segY, segX + segW, segY + segRadius, segRadius);
      ctx.lineTo(segX + segW, segY + segH - segRadius);
      ctx.arcTo(segX + segW, segY + segH, segX + segW - segRadius, segY + segH, segRadius);
      ctx.lineTo(segX + segRadius, segY + segH);
      ctx.arcTo(segX, segY + segH, segX, segY + segH - segRadius, segRadius);
      ctx.lineTo(segX, segY + segRadius);
      ctx.arcTo(segX, segY, segX + segRadius, segY, segRadius);
      ctx.closePath();
    }
  } else {
    ctx.rect(segX, segY, segW, segH);
  }
  ctx.clip();

  // Aspect-fill (cover) & Center crop
  const scale = Math.max(segW / imgW, segH / imgH);
  const renderW = imgW * scale;
  const renderH = imgH * scale;
  const drawX = segX + (segW - renderW) / 2;
  const drawY = segY + (segH - renderH) / 2;

  ctx.drawImage(photoImage, drawX, drawY, renderW, renderH);

  ctx.restore();
}

/**
 * Renders seasonal decorative frame preset over the Map Panel area
 * (Pink: Spring Blossom, Green: Botanical Leaf, Yellow: Summer Sunshine, White: Polaroid Gallery)
 */
export function renderMapPanelFrame(
  ctx: CanvasRenderingContext2D,
  preset: MapFramePreset,
  canvasWidth: number,
  canvasHeight: number,
  bounds: MapSegmentBounds = HEAL3_MAP_SEGMENT_BOUNDS
): void {
  if (preset === 'none') return;

  const segX = bounds.x * canvasWidth;
  const segY = bounds.y * canvasHeight;
  const segW = bounds.width * canvasWidth;
  const segH = bounds.height * canvasHeight;
  const segRadius = (bounds.borderRadius ?? 0) * canvasWidth;

  if (segW <= 0 || segH <= 0) return;

  ctx.save();

  const strokeW = Math.max(3.5, Math.round(canvasWidth * 0.013));
  const minDim = Math.min(segW, segH);

  // Helper to trace rounded rectangle path
  const traceRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    if (r > 0 && typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else if (r > 0) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  switch (preset) {
    case 'pink': {
      // --- Pink Frame: Spring Sakura & Blossom ---
      // Outer soft glow
      ctx.shadowColor = 'rgba(244, 114, 182, 0.45)';
      ctx.shadowBlur = strokeW * 1.5;

      // Main gradient border
      const grad = ctx.createLinearGradient(segX, segY, segX + segW, segY + segH);
      grad.addColorStop(0, '#fbcfe8'); // soft sakura pink
      grad.addColorStop(0.5, '#f472b6'); // rose pink
      grad.addColorStop(1, '#fb7185'); // vibrant coral pink
      ctx.strokeStyle = grad;
      ctx.lineWidth = strokeW;
      traceRect(segX, segY, segW, segH, segRadius);
      ctx.stroke();

      // Reset shadow for crisp inner hairline
      ctx.shadowColor = 'transparent';
      const inset = strokeW * 0.7;
      const innerRadius = Math.max(2, segRadius - inset);
      ctx.strokeStyle = 'rgba(255, 245, 247, 0.75)';
      ctx.lineWidth = Math.max(1, strokeW * 0.22);
      traceRect(segX + inset, segY + inset, segW - inset * 2, segH - inset * 2, innerRadius);
      ctx.stroke();

      // Motif: Top-Left Sakura Flower
      const flowerCx = segX + segRadius * 0.75 + strokeW * 0.4;
      const flowerCy = segY + segRadius * 0.75 + strokeW * 0.4;
      const petalR = minDim * 0.042;

      ctx.save();
      ctx.translate(flowerCx, flowerCy);
      // 5 petals
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -petalR * 0.9, petalR * 0.55, petalR * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fce7f3';
        ctx.fill();
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      // Core pistil
      ctx.beginPath();
      ctx.arc(0, 0, petalR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Motif: Bottom-Right floating sakura petals
      const petalBx = segX + segW - segRadius * 0.7 - strokeW * 0.5;
      const petalBy = segY + segH - segRadius * 0.7 - strokeW * 0.5;
      const drawPetal = (px: number, py: number, rot: number, scale: number) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, petalR * 0.45 * scale, petalR * 0.85 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fda4af';
        ctx.fill();
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };
      drawPetal(petalBx - petalR * 0.6, petalBy - petalR * 0.4, 25, 0.9);
      drawPetal(petalBx + petalR * 0.4, petalBy + petalR * 0.3, -35, 0.7);
      break;
    }

    case 'green': {
      // --- Green Frame: Fresh Botanical Leaf & Sprout ---
      // Outer soft glow
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowBlur = strokeW * 1.5;

      // Main gradient border
      const grad = ctx.createLinearGradient(segX, segY, segX + segW, segY + segH);
      grad.addColorStop(0, '#a7f3d0'); // mint green
      grad.addColorStop(0.5, '#34d399'); // fresh emerald
      grad.addColorStop(1, '#059669'); // forest green
      ctx.strokeStyle = grad;
      ctx.lineWidth = strokeW;
      traceRect(segX, segY, segW, segH, segRadius);
      ctx.stroke();

      // Inset hairline
      ctx.shadowColor = 'transparent';
      const inset = strokeW * 0.7;
      const innerRadius = Math.max(2, segRadius - inset);
      ctx.strokeStyle = 'rgba(236, 253, 245, 0.8)';
      ctx.lineWidth = Math.max(1, strokeW * 0.22);
      traceRect(segX + inset, segY + inset, segW - inset * 2, segH - inset * 2, innerRadius);
      ctx.stroke();

      // Motif: Top-Left Botanical Sprout (twin leaves)
      const leafCx = segX + segRadius * 0.75 + strokeW * 0.4;
      const leafCy = segY + segRadius * 0.75 + strokeW * 0.4;
      const leafR = minDim * 0.048;

      ctx.save();
      ctx.translate(leafCx, leafCy);

      const drawLeaf = (rot: number, scale: number) => {
        ctx.save();
        ctx.rotate((rot * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(leafR * 0.5 * scale, -leafR * 0.5 * scale, 0, -leafR * scale);
        ctx.quadraticCurveTo(-leafR * 0.5 * scale, -leafR * 0.5 * scale, 0, 0);
        ctx.fillStyle = '#6ee7b7';
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Center rib line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -leafR * 0.85 * scale);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };

      drawLeaf(-28, 1.0);
      drawLeaf(36, 0.82);

      // Sprout root dot
      ctx.beginPath();
      ctx.arc(0, 0, leafR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#059669';
      ctx.fill();
      ctx.restore();

      // Motif: Bottom-Right delicate single leaf
      const leafBx = segX + segW - segRadius * 0.7 - strokeW * 0.5;
      const leafBy = segY + segH - segRadius * 0.7 - strokeW * 0.5;
      ctx.save();
      ctx.translate(leafBx, leafBy);
      drawLeaf(135, 0.85);
      ctx.restore();
      break;
    }

    case 'yellow': {
      // --- Yellow Frame: Summer Sunshine & Warm Mimosa ---
      // Outer warm glow
      ctx.shadowColor = 'rgba(245, 158, 11, 0.42)';
      ctx.shadowBlur = strokeW * 1.5;

      // Main gradient border
      const grad = ctx.createLinearGradient(segX, segY, segX + segW, segY + segH);
      grad.addColorStop(0, '#fef08a'); // luminous sunny yellow
      grad.addColorStop(0.5, '#facc15'); // vibrant gold
      grad.addColorStop(1, '#f59e0b'); // warm amber
      ctx.strokeStyle = grad;
      ctx.lineWidth = strokeW;
      traceRect(segX, segY, segW, segH, segRadius);
      ctx.stroke();

      // Inset hairline
      ctx.shadowColor = 'transparent';
      const inset = strokeW * 0.7;
      const innerRadius = Math.max(2, segRadius - inset);
      ctx.strokeStyle = 'rgba(255, 251, 235, 0.85)';
      ctx.lineWidth = Math.max(1, strokeW * 0.22);
      traceRect(segX + inset, segY + inset, segW - inset * 2, segH - inset * 2, innerRadius);
      ctx.stroke();

      // Motif: Top-Left 4-point Sparkle Star
      const sunCx = segX + segRadius * 0.75 + strokeW * 0.4;
      const sunCy = segY + segRadius * 0.75 + strokeW * 0.4;
      const starR = minDim * 0.052;

      const drawSparkle = (cx: number, cy: number, r: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          const ia = a + Math.PI / 4;
          ctx.lineTo(Math.cos(ia) * (r * 0.24), Math.sin(ia) * (r * 0.24));
        }
        ctx.closePath();
        ctx.fillStyle = '#fffbeb';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.restore();
      };

      drawSparkle(sunCx, sunCy, starR, 0);

      // Motif: Bottom-Right summer sparkle pair
      const sunBx = segX + segW - segRadius * 0.7 - strokeW * 0.5;
      const sunBy = segY + segH - segRadius * 0.7 - strokeW * 0.5;
      drawSparkle(sunBx, sunBy, starR * 0.75, 18);
      drawSparkle(sunBx - starR * 0.8, sunBy + starR * 0.2, starR * 0.45, 45);
      break;
    }

    case 'white': {
      // --- White Frame: Clean Winter Pearl / Polaroid Gallery Card ---
      // Outer card depth shadow to lift the photo panel
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = strokeW * 1.4;
      ctx.shadowOffsetY = strokeW * 0.3;

      // Solid crisp pearl-white border (slightly wider for gallery presence)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeW * 1.15;
      traceRect(segX, segY, segW, segH, segRadius);
      ctx.stroke();

      // Reset shadow for crisp embossed inset line
      ctx.shadowColor = 'transparent';
      const inset = strokeW * 0.8;
      const innerRadius = Math.max(2, segRadius - inset);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
      ctx.lineWidth = Math.max(1, strokeW * 0.22);
      traceRect(segX + inset, segY + inset, segW - inset * 2, segH - inset * 2, innerRadius);
      ctx.stroke();

      // Motif: Clean minimal photo-corner brackets (L-shape corner tabs)
      const bracketLen = minDim * 0.055;
      const bracketW = Math.max(1.5, strokeW * 0.3);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = bracketW;
      ctx.lineCap = 'round';

      const pad = strokeW * 0.9;
      // Top-Left L-bracket
      ctx.beginPath();
      ctx.moveTo(segX + pad + bracketLen, segY + pad);
      ctx.lineTo(segX + pad, segY + pad);
      ctx.lineTo(segX + pad, segY + pad + bracketLen);
      ctx.stroke();

      // Top-Right L-bracket
      ctx.beginPath();
      ctx.moveTo(segX + segW - pad - bracketLen, segY + pad);
      ctx.lineTo(segX + segW - pad, segY + pad);
      ctx.lineTo(segX + segW - pad, segY + pad + bracketLen);
      ctx.stroke();

      // Bottom-Left L-bracket
      ctx.beginPath();
      ctx.moveTo(segX + pad, segY + segH - pad - bracketLen);
      ctx.lineTo(segX + pad, segY + segH - pad);
      ctx.lineTo(segX + pad + bracketLen, segY + segH - pad);
      ctx.stroke();

      // Bottom-Right L-bracket
      ctx.beginPath();
      ctx.moveTo(segX + segW - pad - bracketLen, segY + segH - pad);
      ctx.lineTo(segX + segW - pad, segY + segH - pad);
      ctx.lineTo(segX + segW - pad, segY + segH - pad - bracketLen);
      ctx.stroke();
      break;
    }
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
  options: RenderOptions = {},
  sceneTimeMs?: number,
  maskConfig?: MaskConfig,
  layoutMode?: LayoutMode,
  mapSegment?: MapSegmentState
): void {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Black background backdrop
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Evaluate deterministic Scene Motion Recipe (uses sceneTimeMs if provided, else timeMs)
  const sceneRecipe = getSceneMotionRecipe(sceneMotionId);
  const effectiveSceneTimeMs = sceneTimeMs !== undefined ? sceneTimeMs : timeMs;
  const sceneEval = sceneRecipe.evaluate(effectiveSceneTimeMs, totalDurationMs);

  ctx.save();

  // Apply Scene Motion opacity
  if (sceneEval.alpha < 0.999) {
    ctx.globalAlpha = Math.max(0, Math.min(1, sceneEval.alpha));
  }

  // Apply Scene Motion Transforms (Translation, Rotation, Scale around transform origin)
  // Completely driven by Recipe evaluation - ZERO values hardcoded in Renderer
  const originPxX = sceneEval.originX * canvasWidth;
  const originPxY = sceneEval.originY * canvasHeight;
  const shiftPxX = sceneEval.dx * canvasWidth;
  const shiftPxY = sceneEval.dy * canvasHeight;

  ctx.translate(originPxX + shiftPxX, originPxY + shiftPxY);

  if (Math.abs(sceneEval.rotation) > 0.001) {
    ctx.rotate((sceneEval.rotation * Math.PI) / 180);
  }

  if (Math.abs(sceneEval.scale - 1.0) > 0.0005) {
    ctx.scale(sceneEval.scale, sceneEval.scale);
  }

  ctx.translate(-originPxX, -originPxY);

  // --- Layer 1: BASE Image ---
  const activeLayout = layoutMode || options.layoutMode || 'original';
  if (baseImage.image && baseImage.isLoaded) {
    if (activeLayout === 'character_focus') {
      ctx.save();
      // Clip to canvas frame so scaled content remains inside canvas
      ctx.beginPath();
      ctx.rect(0, 0, canvasWidth, canvasHeight);
      ctx.clip();

      // Fixed preset: scale 1.24x, focusing on character center (X: 0.56, Y: 0.52)
      // and gently bringing them towards center-stage (X: 0.50, Y: 0.48)
      const scale = 1.24;
      const focusX = 0.56;
      const focusY = 0.52;
      const targetX = 0.50;
      const targetY = 0.48;

      ctx.translate(targetX * canvasWidth, targetY * canvasHeight);
      ctx.scale(scale, scale);
      ctx.translate(-focusX * canvasWidth, -focusY * canvasHeight);

      ctx.drawImage(baseImage.image, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    } else {
      ctx.drawImage(baseImage.image, 0, 0, canvasWidth, canvasHeight);
    }
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

  // --- Layer 1.2: Map Segment Photo Replacement & Frame Preset (PoC) ---
  const activeMapSegment = mapSegment || options.mapSegment;
  if (activeMapSegment && activeMapSegment.mode === 'photo' && activeMapSegment.photoImage) {
    renderMapSegmentPhoto(ctx, activeMapSegment.photoImage, canvasWidth, canvasHeight);
  }
  if (activeMapSegment && activeMapSegment.framePreset && activeMapSegment.framePreset !== 'none') {
    renderMapPanelFrame(ctx, activeMapSegment.framePreset, canvasWidth, canvasHeight);
  }

  // --- Layer 1.5: Atmosphere Mask Layer (Autumn Mask v1, Sunlight Mask v1) ---
  // Fixed Drawing Order: Base Image -> Mask -> User-added stamps / text
  const activeMask = maskConfig || options.maskConfig;
  if (activeMask && activeMask.type === 'autumn') {
    renderAutumnMask(ctx, activeMask, canvasWidth, canvasHeight, timeMs, totalDurationMs);
  } else if (activeMask && activeMask.type === 'sunlight') {
    renderSunlightMask(ctx, activeMask, canvasWidth, canvasHeight, timeMs, totalDurationMs);
  }

  // --- Layer 2: Stamps & Foreground Items in sequence ---
  for (const stamp of stamps) {
    renderStamp(ctx, stamp, canvasWidth, canvasHeight, timeMs, options);
  }

  ctx.restore();
}
