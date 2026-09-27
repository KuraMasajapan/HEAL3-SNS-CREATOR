/**
 * HEAL3 SNS-Creator - Configuration & PoC Safeguard Parameters
 * 
 * NOTE: Values here (such as MAX_IMAGE_DIMENSION = 1280) are PoC safeguards
 * against iPhone Safari memory crashes, and will be tuned dynamically
 * based on device tier, available VRAM, and production requirements.
 */

export type ExportQuality = 'current' | 'high';

export const QUALITY_PRESETS: Record<ExportQuality, {
  name: string;
  label: string;
  maxDimension: number;
  bitrate: number;
  bitrateLabel: string;
  description: string;
}> = {
  current: {
    name: 'Current (長辺最大800px)',
    label: 'Current',
    maxDimension: 800,
    bitrate: 3_000_000,
    bitrateLabel: '3.0 Mbps (3,000,000 bps)',
    description: '長辺最大800px (アスペクト比維持) @ 3.0 Mbps',
  },
  high: {
    name: 'High (長辺最大1280px)',
    label: 'High',
    maxDimension: 1280,
    bitrate: 6_000_000,
    bitrateLabel: '6.0 Mbps (6,000,000 bps)',
    description: '長辺最大1280px (アスペクト比維持) @ 6.0 Mbps',
  },
};

/**
 * Calculates export dimensions preserving base image aspect ratio.
 * Avoids unnecessary upscaling if original dimensions are smaller than maxDimension.
 * Ensures dimensions are even numbers for H.264 video encoding compatibility.
 */
export function calculateExportDimensions(
  origW: number,
  origH: number,
  quality: ExportQuality
): { width: number; height: number } {
  const maxDim = QUALITY_PRESETS[quality]?.maxDimension ?? 800;

  if (origW <= 0 || origH <= 0) {
    return quality === 'high' ? { width: 720, height: 1280 } : { width: 450, height: 800 };
  }

  const aspect = origW / origH;
  let width = origW;
  let height = origH;

  // Only downscale if larger than maxDimension (avoid upscaling smaller images)
  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      width = maxDim;
      height = Math.round(maxDim / aspect);
    } else {
      height = maxDim;
      width = Math.round(maxDim * aspect);
    }
  }

  // Ensure even dimensions for H.264/MediaRecorder codec compatibility
  width = Math.max(2, Math.floor(width / 2) * 2);
  height = Math.max(2, Math.floor(height / 2) * 2);

  return { width, height };
}

export const POC_CONFIG = {
  /**
   * Maximum dimension (width or height) for base image processing in PoC.
   * Prevents iPhone Safari WebProcess memory crashes on 48MP raw captures.
   * In production, this can be dynamically determined based on device capability & target resolution.
   */
  MAX_IMAGE_DIMENSION: 1280,

  /**
   * Device Pixel Ratio cap on mobile.
   * Caps at 2.5x to prevent extreme GPU memory usage on 3x Retina displays (e.g. iPhone Pro).
   */
  DPR_CAP: 2.5,

  /**
   * Video export settings (MediaRecorder H.264 / WebM)
   */
  VIDEO_EXPORT_MAX_DIMENSION: 800,
  VIDEO_EXPORT_FPS: 30,
  VIDEO_EXPORT_BITRATE: 3_000_000,
  VIDEO_DURATION_SEC: 2.4, // Matches 1.5x of 1.6s Bounce or exact cycle

  /**
   * Animated GIF export fallback settings (gifenc)
   */
  GIF_EXPORT_MAX_DIMENSION: 640,
  GIF_EXPORT_FPS: 18,
  GIF_COLOR_QUANTIZE: 128, // 128 colors for optimal trade-off between quality & encode speed
};

/**
 * HEAL3 Result Screen - Map Segment Coordinates (PoC)
 * 
 * Defines the fixed normalized bounding box [0.0 - 1.0] of the left-hand GPS Map card
 * on the HEAL3 official result screen.
 * Tuning parameters are centralized here for quick adjustment without touching rendering logic.
 */
export interface MapSegmentBounds {
  /** Left margin in normalized coordinates (0.0 = left edge, 1.0 = right edge) */
  x: number;
  /** Top margin in normalized coordinates (0.0 = top edge, 1.0 = bottom edge) */
  y: number;
  /** Width in normalized coordinates relative to canvas width */
  width: number;
  /** Height in normalized coordinates relative to canvas height */
  height: number;
  /** Corner radius in normalized coordinates relative to canvas width (0 for sharp rectangle) */
  borderRadius: number;
}

export const HEAL3_MAP_SEGMENT_BOUNDS: MapSegmentBounds = {
  x: 0.028,        // Left margin: ~2.8% of canvas width (~20px @ 720w)
  y: 0.0625,       // Top margin: ~6.25% of canvas height (~80px @ 1280h)
  width: 0.431,    // Width: ~43.1% of canvas width (~310px @ 720w, covers map card)
  height: 0.750,   // Height: ~75.0% of canvas height (~960px @ 1280h)
  borderRadius: 0.033, // Card corner rounding: ~3.3% of canvas width (~24px @ 720w)
};

