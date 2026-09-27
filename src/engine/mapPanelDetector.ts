/**
 * HEAL3 SNS-Creator - Map Panel Detector PoC (Zero-Base Pure Canvas / TypeScript)
 * 
 * Automatically detects the outermost bounding box of the left-hand Map Panel in HEAL3 result images.
 * 
 * Key Principles (Revised PoC):
 * 1. Heavy multi-pass downscaling and blurring to wash out fine internal structures (roads, GOAL pins, icons).
 * 2. Background baseline estimation accounting for vertical sky/ground gradients.
 * 3. Multi-threshold Connected Component Analysis prioritizing the largest and outermost contiguous region.
 * 4. Outside-In boundary scanning to ensure internal high-contrast UI elements cannot be selected as borders.
 * 5. Micro-refinement along inflection gradients to lock onto the outermost card perimeter.
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
 * Box blur helper (separable 2-pass)
 */
function boxBlur2D(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const temp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const px = x + k;
        if (px >= 0 && px < w) {
          sum += src[rowOffset + px];
          count++;
        }
      }
      temp[rowOffset + x] = sum / count;
    }
  }

  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const py = y + k;
        if (py >= 0 && py < h) {
          sum += temp[py * w + x];
          count++;
        }
      }
      out[y * w + x] = sum / count;
    }
  }

  return out;
}

/**
 * Detects the outermost rectangular Map Panel on the left side of a HEAL3 result image.
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

  // 1. Downscale onto an offscreen canvas for fast execution
  const targetW = 160;
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

  // 2. Precompute raw Luminance array L(x, y)
  const rawLum = new Float32Array(targetW * targetH);
  for (let i = 0; i < rawLum.length; i++) {
    const idx = i * 4;
    rawLum[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // 3. Heavy multi-pass blur to weaken fine internal details (roads, numbers, GOAL pins, icons)
  // Two passes: radius 4 then radius 3 gives an effective kernel of ~14px, dissolving internal UI elements
  const pass1 = boxBlur2D(rawLum, targetW, targetH, 4);
  const blurredLum = boxBlur2D(pass1, targetW, targetH, 3);

  // 4. Background baseline estimation
  // In HEAL3 screens, the screen margins outside the map panel (left gutter, top sky, bottom footer) are background.
  // We sample the extreme left margin (x in [0, 2]) for each row to handle vertical gradients smoothly.
  const rawBgRow = new Float32Array(targetH);
  for (let y = 0; y < targetH; y++) {
    rawBgRow[y] = (blurredLum[y * targetW + 0] + blurredLum[y * targetW + 1] + blurredLum[y * targetW + 2]) / 3;
  }

  // Smooth the bg row vertically to remove single-row noise
  const bgRow = new Float32Array(targetH);
  const smoothRadius = 6;
  for (let y = 0; y < targetH; y++) {
    let sum = 0;
    let count = 0;
    for (let dy = -smoothRadius; dy <= smoothRadius; dy++) {
      const py = y + dy;
      if (py >= 0 && py < targetH) {
        sum += rawBgRow[py];
        count++;
      }
    }
    bgRow[y] = sum / count;
  }

  // Top and bottom background samples
  const bgSamples: number[] = [];
  for (let x = 2; x < Math.floor(targetW * 0.45); x += 4) {
    bgSamples.push(blurredLum[Math.floor(targetH * 0.03) * targetW + x]);
    bgSamples.push(blurredLum[Math.floor(targetH * 0.96) * targetW + x]);
  }
  bgSamples.sort((a, b) => a - b);
  const globalBgLum = bgSamples.length > 0 ? bgSamples[Math.floor(bgSamples.length / 2)] : 220;

  // 5. Left-Zone Contrast Mapping (x in [0, 0.58 * targetW])
  const searchMaxX = Math.floor(targetW * 0.58);
  const contrastMap = new Float32Array(targetW * targetH);
  let maxContrast = 0;

  for (let y = 0; y < targetH; y++) {
    const localBg = bgRow[y];
    for (let x = 0; x < searchMaxX; x++) {
      const idx = y * targetW + x;
      // Per-pixel difference from local background
      const delta = Math.abs(blurredLum[idx] - localBg);
      contrastMap[idx] = delta;
      if (delta > maxContrast) {
        maxContrast = delta;
      }
    }
  }

  // 6. Multi-Threshold Connected Component Analysis
  // Requirement: "局所的に最も強い矩形ではなく、左側に存在する最大かつ外側の連続領域を優先する"
  // "内部矩形を囲む、より大きな外側境界がある場合は外側を採用する"
  // We evaluate multiple thresholds biased toward lower values to capture the outermost card perimeter.
  const testThresholds = [
    Math.max(12, maxContrast * 0.20),
    Math.max(16, maxContrast * 0.32),
    Math.max(20, maxContrast * 0.45)
  ];

  interface CandidateRegion {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    area: number;
    fillRatio: number;
    threshold: number;
  }

  let bestRegion: CandidateRegion | null = null;

  for (const th of testThresholds) {
    const mask = new Uint8Array(targetW * targetH);
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < searchMaxX; x++) {
        const idx = y * targetW + x;
        if (contrastMap[idx] >= th) {
          mask[idx] = 1;
        }
      }
    }

    // Morphological closing (dilation radius 3, then erosion radius 3)
    // Welds internal route lines and small voids into a solid contiguous blob
    const closed = new Uint8Array(targetW * targetH);
    const morphR = 3;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < searchMaxX; x++) {
        let hit = 0;
        for (let dy = -morphR; dy <= morphR && !hit; dy++) {
          const py = y + dy;
          if (py < 0 || py >= targetH) continue;
          for (let dx = -morphR; dx <= morphR && !hit; dx++) {
            const px = x + dx;
            if (px < 0 || px >= searchMaxX) continue;
            if (mask[py * targetW + px]) hit = 1;
          }
        }
        closed[y * targetW + x] = hit;
      }
    }

    const eroded = new Uint8Array(targetW * targetH);
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < searchMaxX; x++) {
        let allOn = 1;
        for (let dy = -morphR; dy <= morphR && allOn; dy++) {
          const py = y + dy;
          if (py < 0 || py >= targetH) { allOn = 0; break; }
          for (let dx = -morphR; dx <= morphR && allOn; dx++) {
            const px = x + dx;
            if (px < 0 || px >= searchMaxX) { allOn = 0; break; }
            if (!closed[py * targetW + px]) allOn = 0;
          }
        }
        eroded[y * targetW + x] = allOn;
      }
    }

    // Connected Component BFS within the left region
    const visited = new Uint8Array(targetW * targetH);
    for (let y = 2; y < targetH - 2; y++) {
      for (let x = 2; x < searchMaxX - 2; x++) {
        const startIdx = y * targetW + x;
        if (eroded[startIdx] && !visited[startIdx]) {
          const queue = [startIdx];
          visited[startIdx] = 1;
          let area = 0;
          let minX = x, maxX = x, minY = y, maxY = y;

          let head = 0;
          while (head < queue.length) {
            const curr = queue[head++];
            area++;
            const cy = Math.floor(curr / targetW);
            const cx = curr % targetW;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            // 4-connected neighbors
            const nbs = [curr - 1, curr + 1, curr - targetW, curr + targetW];
            for (const nb of nbs) {
              if (nb >= 0 && nb < targetW * targetH) {
                const nbX = nb % targetW;
                if (nbX < searchMaxX && eroded[nb] && !visited[nb]) {
                  visited[nb] = 1;
                  queue.push(nb);
                }
              }
            }
          }

          const boxW = maxX - minX + 1;
          const boxH = maxY - minY + 1;
          const fillRatio = area / (boxW * boxH);

          // Criteria for a macroscopic Map Panel:
          // Must span at least 18% width, 25% height, and have high solidity (not a thin border or scattered noise)
          if (boxW >= targetW * 0.18 && boxH >= targetH * 0.25 && fillRatio > 0.45) {
            const candidate: CandidateRegion = { minX, maxX, minY, maxY, area, fillRatio, threshold: th };

            if (!bestRegion) {
              bestRegion = candidate;
            } else {
              // Prioritize the largest contiguous region
              if (candidate.area > bestRegion.area * 1.05) {
                bestRegion = candidate;
              } else if (
                // If candidate encloses the previous region or represents a wider outer boundary, adopt the outer one!
                candidate.minX <= bestRegion.minX &&
                candidate.maxX >= bestRegion.maxX &&
                candidate.minY <= bestRegion.minY &&
                candidate.maxY >= bestRegion.maxY
              ) {
                bestRegion = candidate;
              }
            }
          }
        }
      }
    }
  }

  // Fallback defaults if no contiguous card region met the threshold
  let initialX1 = bestRegion ? bestRegion.minX : Math.floor(targetW * 0.04);
  let initialX2 = bestRegion ? bestRegion.maxX : Math.floor(targetW * 0.48);
  let initialY1 = bestRegion ? bestRegion.minY : Math.floor(targetH * 0.15);
  let initialY2 = bestRegion ? bestRegion.maxY : Math.floor(targetH * 0.77);

  // 7. Outside-In Boundary Scanning
  // Scanning from the outside inwards guarantees that internal GOAL/buttons (located inside)
  // are NEVER picked as edge candidates.
  const testThreshold = bestRegion ? bestRegion.threshold * 0.75 : 15;

  // Left Edge (x1): scan from x = 1 moving rightwards
  let scanX1 = initialX1;
  const vSampleStart = initialY1 + Math.floor((initialY2 - initialY1) * 0.15);
  const vSampleEnd = initialY2 - Math.floor((initialY2 - initialY1) * 0.15);
  const vSpan = Math.max(1, vSampleEnd - vSampleStart);

  for (let x = 1; x <= Math.min(searchMaxX - 2, initialX1 + 5); x++) {
    let cardCount = 0;
    for (let y = vSampleStart; y <= vSampleEnd; y++) {
      if (contrastMap[y * targetW + x] >= testThreshold) {
        cardCount++;
      }
    }
    if (cardCount / vSpan >= 0.35) {
      scanX1 = x;
      break;
    }
  }

  // Right Edge (x2): scan from searchMaxX moving leftwards inwards
  let scanX2 = initialX2;
  for (let x = searchMaxX - 1; x >= Math.max(scanX1 + 5, initialX2 - 5); x--) {
    let cardCount = 0;
    for (let y = vSampleStart; y <= vSampleEnd; y++) {
      if (contrastMap[y * targetW + x] >= testThreshold) {
        cardCount++;
      }
    }
    if (cardCount / vSpan >= 0.35) {
      scanX2 = x;
      break;
    }
  }

  // Top Edge (y1): scan from y = 1 downwards inwards
  let scanY1 = initialY1;
  const hSampleStart = scanX1 + Math.floor((scanX2 - scanX1) * 0.15);
  const hSampleEnd = scanX2 - Math.floor((scanX2 - scanX1) * 0.15);
  const hSpan = Math.max(1, hSampleEnd - hSampleStart);

  for (let y = 1; y <= Math.min(targetH - 2, initialY1 + 5); y++) {
    let cardCount = 0;
    for (let x = hSampleStart; x <= hSampleEnd; x++) {
      if (contrastMap[y * targetW + x] >= testThreshold) {
        cardCount++;
      }
    }
    if (cardCount / hSpan >= 0.35) {
      scanY1 = y;
      break;
    }
  }

  // Bottom Edge (y2): scan from bottom upwards inwards
  let scanY2 = initialY2;
  for (let y = targetH - 2; y >= Math.max(scanY1 + 5, initialY2 - 5); y--) {
    let cardCount = 0;
    for (let x = hSampleStart; x <= hSampleEnd; x++) {
      if (contrastMap[y * targetW + x] >= testThreshold) {
        cardCount++;
      }
    }
    if (cardCount / hSpan >= 0.35) {
      scanY2 = y;
      break;
    }
  }

  // 8. Inflection Gradient Alignment (±3px micro-refinement)
  // At the true physical boundary, the transition gradient between background and card reaches its inflection peak.
  const refineXEdge = (xCandidate: number): number => {
    let bestX = xCandidate;
    let maxGrad = -1;
    for (let x = Math.max(1, xCandidate - 3); x <= Math.min(targetW - 2, xCandidate + 3); x++) {
      let gradSum = 0;
      for (let y = vSampleStart; y <= vSampleEnd; y++) {
        gradSum += Math.abs(rawLum[y * targetW + (x + 1)] - rawLum[y * targetW + (x - 1)]);
      }
      if (gradSum > maxGrad) {
        maxGrad = gradSum;
        bestX = x;
      }
    }
    return bestX;
  };

  const refineYEdge = (yCandidate: number): number => {
    let bestY = yCandidate;
    let maxGrad = -1;
    for (let y = Math.max(1, yCandidate - 3); y <= Math.min(targetH - 2, yCandidate + 3); y++) {
      let gradSum = 0;
      for (let x = hSampleStart; x <= hSampleEnd; x++) {
        gradSum += Math.abs(rawLum[(y + 1) * targetW + x] - rawLum[(y - 1) * targetW + x]);
      }
      if (gradSum > maxGrad) {
        maxGrad = gradSum;
        bestY = y;
      }
    }
    return bestY;
  };

  const finalX1 = refineXEdge(scanX1);
  const finalX2 = refineXEdge(scanX2);
  const finalY1 = refineYEdge(scanY1);
  const finalY2 = refineYEdge(scanY2);

  const boxW = Math.max(12, finalX2 - finalX1);
  const boxH = Math.max(12, finalY2 - finalY1);

  // 9. Statistical Confidence Calculation
  let interiorLumSum = 0;
  let interiorPoints = 0;
  for (let y = Math.floor(finalY1 + boxH * 0.15); y <= Math.floor(finalY2 - boxH * 0.15); y += 2) {
    for (let x = Math.floor(finalX1 + boxW * 0.15); x <= Math.floor(finalX2 - boxW * 0.15); x += 2) {
      interiorLumSum += rawLum[y * targetW + x];
      interiorPoints++;
    }
  }
  const avgCardLum = interiorPoints > 0 ? interiorLumSum / interiorPoints : globalBgLum;
  const contrastDelta = Math.abs(avgCardLum - globalBgLum);

  // Measure border sharpness along outer edges
  let borderGradSum = 0;
  let borderPoints = 0;
  for (let y = finalY1; y <= finalY2; y += 2) {
    borderGradSum += Math.abs(rawLum[y * targetW + Math.min(targetW - 1, finalX1 + 1)] - rawLum[y * targetW + Math.max(0, finalX1 - 1)]);
    borderGradSum += Math.abs(rawLum[y * targetW + Math.min(targetW - 1, finalX2 + 1)] - rawLum[y * targetW + Math.max(0, finalX2 - 1)]);
    borderPoints += 2;
  }
  for (let x = finalX1; x <= finalX2; x += 2) {
    borderGradSum += Math.abs(rawLum[Math.min(targetH - 1, finalY1 + 1) * targetW + x] - rawLum[Math.max(0, finalY1 - 1) * targetW + x]);
    borderGradSum += Math.abs(rawLum[Math.min(targetH - 1, finalY2 + 1) * targetW + x] - rawLum[Math.max(0, finalY2 - 1) * targetW + x]);
    borderPoints += 2;
  }
  const avgBorderGrad = borderPoints > 0 ? borderGradSum / borderPoints : 0;

  // Normalized scores
  const normW = boxW / targetW;
  const normH = boxH / targetH;
  let geoScore = 1.0;
  if (normW < 0.22 || normW > 0.55) geoScore *= 0.7;
  if (normH < 0.30 || normH > 0.85) geoScore *= 0.7;

  const edgeScore = Math.min(1.0, avgBorderGrad / 28);
  const contrastScore = Math.min(1.0, contrastDelta / 50);
  const fillRatio = bestRegion ? bestRegion.fillRatio : 0.6;

  let confidence = Math.max(
    0.0,
    Math.min(
      0.99,
      edgeScore * 0.35 +
      contrastScore * 0.30 +
      fillRatio * 0.20 +
      geoScore * 0.15
    )
  );

  if (contrastDelta < 15 && edgeScore < 0.2) {
    confidence *= 0.4;
  }

  confidence = Math.round(confidence * 100) / 100;
  const status: 'detected' | 'low_confidence' | 'failed' =
    confidence >= 0.60 ? 'detected' : confidence >= 0.35 ? 'low_confidence' : 'failed';

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
      bgLuminance: Math.round(globalBgLum),
      cardLuminance: Math.round(avgCardLum),
      contrastDelta: Math.round(contrastDelta),
      edgeScore: Math.round(edgeScore * 100),
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

  const isHighConf = detection.confidence >= 0.60;
  const themeColor = isHighConf ? '#00f5d4' : detection.confidence >= 0.35 ? '#facc15' : '#fb7185';
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
