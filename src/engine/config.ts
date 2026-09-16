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
    name: 'Current (450×800)',
    label: 'Current',
    maxDimension: 800,
    bitrate: 3_000_000,
    bitrateLabel: '3.0 Mbps (3,000,000 bps)',
    description: '450×800 (9:16) @ 3.0 Mbps',
  },
  high: {
    name: 'High (720×1280)',
    label: 'High',
    maxDimension: 1280,
    bitrate: 6_000_000,
    bitrateLabel: '6.0 Mbps (6,000,000 bps)',
    description: '720×1280 (9:16) @ 6.0 Mbps',
  },
};

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
