/**
 * HEAL3 SNS-Creator - Map Panel Detector PoC (Zero-Base Pure Canvas / TypeScript)
 * 
 * Automatically detects the bounding box of the left-hand Map Panel in HEAL3 result images
 * using multi-feature signal processing:
 * 1. Background luminance & chromaticity baseline estimation
 * 2. Contrast projection profiling in the left region
 * 3. Gradient edge line integrals (Sobel derivative peaks)
 * 4. Step-transition analysis & confidence scoring
 * 
 * NOTE: Operates 100% independently from any hardcoded bounds or external AI models.
 */

export interface MapPanelDetectionResult {
  /** Normalized left position (0.0 - 1.0) relative to image width */
  x: number;
  /** Normalized top position (0.0 - 1.0) relative to image height */
  y: number;
  /** Normalized width (0.0 - 1.0) relative to image width */
  width: number;
  /** Normalized height (0.0 - 1.0) relative to image height */
  height: number;
  /** Detection confidence score (0.0 to 1.0) */
  confidence: number;
  /** Time taken to perform detection in milliseconds */
  elapsedMs: number;
  /** Qualitative status */
  status: 'detected' | 'low_confidence' | 'failed';
  /** Diagnostic metrics for engineering inspection */
  metrics?: {
    bgLuminance: number;
    cardLuminance: number;
    contrastDelta: number;
    edgeScore: number;
    fillRatio: number;
  };
}

/**
 * Detects the rectangular Map Panel on the left side of a HEAL3 result image.
 */
export function detectMapPanel(
  sourceImage: HTMLImageElement | HTMLCanvasElement
): MapPanelDetectionResult {
  const startTime = performance.now();

  const origW = sourceImage instanceof HTMLImageElement ? (sourceImage.naturalWidth || sourceImage.width) : sourceImage.width;
  const origH = sourceImage instanceof HTMLImageElement ? (sourceImage.naturalHeight || sourceImage.height) : sourceImage.height;

  if (origW <= 0 || origH <= 0) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      confidence: 0,
      elapsedMs: 0,
      status: 'failed',
    };
  }

  // 1. Downsample onto an offscreen canvas for lightweight sub-millisecond execution
  const targetW = 240;
  const targetH = Math.max(160, Math.round(targetW * (origH / origW)));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      confidence: 0,
      elapsedMs: Math.round(performance.now() - startTime),
      status: 'failed',
    };
  }

  ctx.drawImage(sourceImage, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // 2. Precompute Luminance array L(x, y)
  const lum = new Float32Array(targetW * targetH);
  for (let i = 0; i < lum.length; i++) {
    const idx = i * 4;
    // Standard perceptual luminance formula
    lum[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // 3. Baseline background luminance estimation
  // Sample perimeter margin points outside any expected panel (e.g. top margin, left-most margin, bottom margin)
  const bgSamples: number[] = [];
  // Left-most margin samples
  for (let y = Math.floor(targetH * 0.1); y < Math.floor(targetH * 0.9); y += Math.floor(targetH * 0.1)) {
    bgSamples.push(lum[y * targetW + 2]);
  }
  // Top margin samples
  for (let x = Math.floor(targetW * 0.05); x < Math.floor(targetW * 0.5); x += Math.floor(targetW * 0.1)) {
    bgSamples.push(lum[Math.floor(targetH * 0.04) * targetW + x]);
  }
  bgSamples.sort((a, b) => a - b);
  const bgLuminance = bgSamples.length > 0 ? bgSamples[Math.floor(bgSamples.length / 2)] : 240;

  // 4. Horizontal search (Column projection & Vertical edges) on left half: x in [0, 0.58 * targetW]
  const maxSearchX = Math.floor(targetW * 0.58);
  const colCardCount = new Float32Array(maxSearchX);
  const colEdgeSum = new Float32Array(maxSearchX);

  const sampleYMin = Math.floor(targetH * 0.18);
  const sampleYMax = Math.floor(targetH * 0.72);
  const sampleYCount = Math.max(1, sampleYMax - sampleYMin);

  for (let x = 1; x < maxSearchX - 1; x++) {
    let cardPixels = 0;
    let edgeAccum = 0;
    for (let y = sampleYMin; y < sampleYMax; y++) {
      const idx = y * targetW + x;
      const l = lum[idx];
      // A pixel is considered a card feature if its luminance differs significantly from background
      const delta = Math.abs(l - bgLuminance);
      if (delta > 32 || (l < 165 && bgLuminance > 200)) {
        cardPixels++;
      }
      // Horizontal gradient across column x
      edgeAccum += Math.abs(lum[idx + 1] - lum[idx - 1]);
    }
    colCardCount[x] = cardPixels / sampleYCount;
    colEdgeSum[x] = edgeAccum / sampleYCount;
  }

  // Find candidate Left Edge x1 (forward step + edge peak) in [0.015 W, 0.18 W]
  const minX1 = Math.max(2, Math.floor(targetW * 0.015));
  const maxX1 = Math.floor(targetW * 0.18);
  let bestX1 = minX1;
  let maxScoreX1 = -1;

  for (let x = minX1; x <= maxX1; x++) {
    const densityStep = (colCardCount[Math.min(maxSearchX - 1, x + 2)] - colCardCount[Math.max(0, x - 2)]) * 100;
    const edgeVal = colEdgeSum[x];
    const score = Math.max(0, densityStep) * 0.6 + edgeVal * 0.4;
    if (score > maxScoreX1) {
      maxScoreX1 = score;
      bestX1 = x;
    }
  }

  // Find candidate Right Edge x2 (backward step + edge peak) in [0.30 W, 0.55 W]
  const minX2 = Math.floor(targetW * 0.30);
  const maxX2 = Math.min(maxSearchX - 2, Math.floor(targetW * 0.55));
  let bestX2 = maxX2;
  let maxScoreX2 = -1;

  for (let x = minX2; x <= maxX2; x++) {
    const densityStep = (colCardCount[Math.max(0, x - 2)] - colCardCount[Math.min(maxSearchX - 1, x + 2)]) * 100;
    const edgeVal = colEdgeSum[x];
    const score = Math.max(0, densityStep) * 0.6 + edgeVal * 0.4;
    if (score > maxScoreX2) {
      maxScoreX2 = score;
      bestX2 = x;
    }
  }

  // 5. Vertical search (Row projection & Horizontal edges) within [bestX1, bestX2]
  const innerXMin = Math.min(bestX1 + 2, bestX2 - 2);
  const innerXMax = Math.max(bestX1 + 2, bestX2 - 2);
  const innerXSpan = Math.max(1, innerXMax - innerXMin + 1);

  const rowCardCount = new Float32Array(targetH);
  const rowEdgeSum = new Float32Array(targetH);

  for (let y = 1; y < targetH - 1; y++) {
    let cardPixels = 0;
    let edgeAccum = 0;
    for (let x = innerXMin; x <= innerXMax; x++) {
      const idx = y * targetW + x;
      const l = lum[idx];
      const delta = Math.abs(l - bgLuminance);
      if (delta > 32 || (l < 165 && bgLuminance > 200)) {
        cardPixels++;
      }
      edgeAccum += Math.abs(lum[(y + 1) * targetW + x] - lum[(y - 1) * targetW + x]);
    }
    rowCardCount[y] = cardPixels / innerXSpan;
    rowEdgeSum[y] = edgeAccum / innerXSpan;
  }

  // Find candidate Top Edge y1 in [0.06 H, 0.35 H]
  const minY1 = Math.floor(targetH * 0.06);
  const maxY1 = Math.floor(targetH * 0.35);
  let bestY1 = minY1;
  let maxScoreY1 = -1;

  for (let y = minY1; y <= maxY1; y++) {
    const densityStep = (rowCardCount[Math.min(targetH - 1, y + 2)] - rowCardCount[Math.max(0, y - 2)]) * 100;
    const edgeVal = rowEdgeSum[y];
    const score = Math.max(0, densityStep) * 0.6 + edgeVal * 0.4;
    if (score > maxScoreY1) {
      maxScoreY1 = score;
      bestY1 = y;
    }
  }

  // Find candidate Bottom Edge y2 in [0.42 H, 0.88 H]
  const minY2 = Math.floor(targetH * 0.42);
  const maxY2 = Math.floor(targetH * 0.88);
  let bestY2 = maxY2;
  let maxScoreY2 = -1;

  for (let y = minY2; y <= maxY2; y++) {
    const densityStep = (rowCardCount[Math.max(0, y - 2)] - rowCardCount[Math.min(targetH - 1, y + 2)]) * 100;
    const edgeVal = rowEdgeSum[y];
    const score = Math.max(0, densityStep) * 0.6 + edgeVal * 0.4;
    if (score > maxScoreY2) {
      maxScoreY2 = score;
      bestY2 = y;
    }
  }

  // 6. Local Gradient Peak Alignment (±3px micro-refinement)
  const refineX = (xCandidate: number, isRightEdge: boolean): number => {
    let bestX = xCandidate;
    let maxGrad = -1;
    const startY = Math.floor(bestY1 + (bestY2 - bestY1) * 0.2);
    const endY = Math.floor(bestY1 + (bestY2 - bestY1) * 0.8);
    for (let x = Math.max(1, xCandidate - 3); x <= Math.min(targetW - 2, xCandidate + 3); x++) {
      let gradSum = 0;
      for (let y = startY; y <= endY; y++) {
        gradSum += Math.abs(lum[y * targetW + (x + 1)] - lum[y * targetW + (x - 1)]);
      }
      if (gradSum > maxGrad) {
        maxGrad = gradSum;
        bestX = x;
      }
    }
    return bestX;
  };

  const refineY = (yCandidate: number, isBottomEdge: boolean): number => {
    let bestY = yCandidate;
    let maxGrad = -1;
    const startX = Math.floor(bestX1 + (bestX2 - bestX1) * 0.2);
    const endX = Math.floor(bestX1 + (bestX2 - bestX1) * 0.8);
    for (let y = Math.max(1, yCandidate - 3); y <= Math.min(targetH - 2, yCandidate + 3); y++) {
      let gradSum = 0;
      for (let x = startX; x <= endX; x++) {
        gradSum += Math.abs(lum[(y + 1) * targetW + x] - lum[(y - 1) * targetW + x]);
      }
      if (gradSum > maxGrad) {
        maxGrad = gradSum;
        bestY = y;
      }
    }
    return bestY;
  };

  const finalX1 = refineX(bestX1, false);
  const finalX2 = refineX(bestX2, true);
  const finalY1 = refineY(bestY1, false);
  const finalY2 = refineY(bestY2, true);

  const boxW = Math.max(10, finalX2 - finalX1);
  const boxH = Math.max(10, finalY2 - finalY1);

  // 7. Calculate Statistical Confidence
  // Sample interior luminance & fill ratio
  let interiorLumSum = 0;
  let interiorCardPixels = 0;
  const intSampleCount = Math.floor(boxW * boxH * 0.25);
  let sampledPoints = 0;

  for (let y = Math.floor(finalY1 + boxH * 0.1); y <= Math.floor(finalY2 - boxH * 0.1); y += 2) {
    for (let x = Math.floor(finalX1 + boxW * 0.1); x <= Math.floor(finalX2 - boxW * 0.1); x += 2) {
      const idx = y * targetW + x;
      const l = lum[idx];
      interiorLumSum += l;
      if (Math.abs(l - bgLuminance) > 30 || (l < 165 && bgLuminance > 200)) {
        interiorCardPixels++;
      }
      sampledPoints++;
    }
  }

  const avgCardLum = sampledPoints > 0 ? interiorLumSum / sampledPoints : bgLuminance;
  const contrastDelta = Math.abs(avgCardLum - bgLuminance);
  const fillRatio = sampledPoints > 0 ? interiorCardPixels / sampledPoints : 0;

  // Border edge integral score
  const avgBorderEdge = (maxScoreX1 + maxScoreX2 + maxScoreY1 + maxScoreY2) / 4;
  const normalizedEdgeScore = Math.min(1.0, avgBorderEdge / 120);
  const normalizedContrastScore = Math.min(1.0, contrastDelta / 120);

  // Geometric plausibility score (aspect ratio, coverage of panel)
  const normW = boxW / targetW;
  const normH = boxH / targetH;
  let geoScore = 1.0;
  if (normW < 0.25 || normW > 0.55) geoScore *= 0.7;
  if (normH < 0.25 || normH > 0.85) geoScore *= 0.7;

  // Composite Confidence Calculation
  let confidence = Math.max(
    0.0,
    Math.min(
      0.99,
      normalizedEdgeScore * 0.35 +
      normalizedContrastScore * 0.35 +
      fillRatio * 0.20 +
      geoScore * 0.10
    )
  );

  // If contrast is very weak or edge is virtually non-existent, severely penalize
  if (contrastDelta < 25 && normalizedEdgeScore < 0.25) {
    confidence *= 0.4;
  }

  confidence = Math.round(confidence * 100) / 100;
  const status: 'detected' | 'low_confidence' | 'failed' =
    confidence >= 0.65 ? 'detected' : confidence >= 0.40 ? 'low_confidence' : 'failed';

  const elapsedMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    x: Math.round((finalX1 / targetW) * 1000) / 1000,
    y: Math.round((finalY1 / targetH) * 1000) / 1000,
    width: Math.round((boxW / targetW) * 1000) / 1000,
    height: Math.round((boxH / targetH) * 1000) / 1000,
    confidence,
    elapsedMs,
    status,
    metrics: {
      bgLuminance: Math.round(bgLuminance),
      cardLuminance: Math.round(avgCardLum),
      contrastDelta: Math.round(contrastDelta),
      edgeScore: Math.round(normalizedEdgeScore * 100),
      fillRatio: Math.round(fillRatio * 100),
    },
  };
}

/**
 * Renders high-visibility debug bounding box overlay on top of the preview canvas.
 */
export function renderDetectorDebugOverlay(
  ctx: CanvasRenderingContext2D,
  detection: MapPanelDetectionResult,
  canvasWidth: number,
  canvasHeight: number
): void {
  const pxX = detection.x * canvasWidth;
  const pxY = detection.y * canvasHeight;
  const pxW = detection.width * canvasWidth;
  const pxH = detection.height * canvasHeight;

  if (pxW <= 0 || pxH <= 0) return;

  ctx.save();

  const isHighConf = detection.confidence >= 0.65;
  const themeColor = isHighConf ? '#00f5d4' : detection.confidence >= 0.40 ? '#facc15' : '#fb7185';
  const shadowColor = isHighConf ? 'rgba(0, 245, 212, 0.6)' : 'rgba(251, 113, 133, 0.6)';

  // 1. Semi-transparent neon tinted fill
  ctx.fillStyle = isHighConf ? 'rgba(0, 245, 212, 0.08)' : 'rgba(250, 204, 21, 0.08)';
  ctx.fillRect(pxX, pxY, pxW, pxH);

  // 2. High-visibility dashed bounding box with neon glow
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = Math.max(2.5, Math.round(canvasWidth * 0.005));
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(pxX, pxY, pxW, pxH);
  ctx.restore();

  // 3. Optical corner brackets (HUD reticle ticks)
  const tickLen = Math.min(pxW, pxH) * 0.12;
  const tickThick = Math.max(3.5, Math.round(canvasWidth * 0.007));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = tickThick;
  ctx.setLineDash([]);
  ctx.lineCap = 'square';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(pxX, pxY + tickLen);
  ctx.lineTo(pxX, pxY);
  ctx.lineTo(pxX + tickLen, pxY);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(pxX + pxW - tickLen, pxY);
  ctx.lineTo(pxX + pxW, pxY);
  ctx.lineTo(pxX + pxW, pxY + tickLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(pxX, pxY + pxH - tickLen);
  ctx.lineTo(pxX, pxY + pxH);
  ctx.lineTo(pxX + tickLen, pxY + pxH);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(pxX + pxW - tickLen, pxY + pxH);
  ctx.lineTo(pxX + pxW, pxY + pxH);
  ctx.lineTo(pxX + pxW, pxY + pxH - tickLen);
  ctx.stroke();

  // 4. Center crosshair
  const cx = pxX + pxW / 2;
  const cy = pxY + pxH / 2;
  const crossSize = Math.max(6, canvasWidth * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - crossSize, cy);
  ctx.lineTo(cx + crossSize, cy);
  ctx.moveTo(cx, cy - crossSize);
  ctx.lineTo(cx, cy + crossSize);
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Floating HUD Telemetry Badge
  const badgeText = `[DETECTOR PoC] Conf: ${Math.round(detection.confidence * 100)}% (${detection.elapsedMs}ms)`;
  const coordsText = `x:${detection.x.toFixed(3)} y:${detection.y.toFixed(3)} w:${detection.width.toFixed(3)} h:${detection.height.toFixed(3)}`;
  
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const textW = Math.max(ctx.measureText(badgeText).width, ctx.measureText(coordsText).width);
  const badgeH = 34;
  const badgeW = textW + 16;
  const badgeX = Math.max(4, Math.min(canvasWidth - badgeW - 4, pxX));
  const badgeY = Math.max(4, pxY - badgeH - 4);

  // Badge background card
  ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fill();
  ctx.stroke();

  // Badge text
  ctx.fillStyle = themeColor;
  ctx.fillText(badgeText, badgeX + 8, badgeY + 14);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(coordsText, badgeX + 8, badgeY + 28);

  ctx.restore();
}
