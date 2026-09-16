/**
 * HEAL3 SNS-Creator - Core Types & Interfaces
 */

export type StampType = 'star' | 'heart' | 'circle';

export type MotionId = 'none' | 'bounce' | 'rotate' | 'pulse';

export interface StampItem {
  id: string;
  type: StampType;
  /** Normalized X position (0.0 = left edge, 1.0 = right edge) */
  x: number;
  /** Normalized Y position (0.0 = top edge, 1.0 = bottom edge) */
  y: number;
  /** Normalized scale relative to the smaller dimension of the canvas (e.g. 0.22 = 22% of canvas min dimension) */
  scale: number;
  /** Rotation angle in degrees (0 - 360) */
  rotation: number;
  /** Motion recipe identifier */
  motionId: MotionId;
  /** Playback speed multiplier (default 1.0) */
  motionSpeed: number;
  /** Motion phase offset in ms (to desynchronize multiple stamps) */
  motionOffsetMs: number;
  /** Primary color of the stamp */
  color: string;
  /** Secondary or accent color */
  accentColor: string;
}

export interface BaseImageState {
  image: HTMLImageElement | null;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
  aspectRatio: number;
  isLoaded: boolean;
}

export interface MotionEvaluation {
  /** Relative offset dx in normalized coordinate units */
  dx: number;
  /** Relative offset dy in normalized coordinate units */
  dy: number;
  /** Scale factor multiplier (e.g. 1.15) */
  scaleFactor: number;
  /** Additional rotation delta in degrees */
  deltaRotation: number;
  /** Opacity multiplier (0.0 - 1.0) */
  alpha: number;
  /** Glow intensity (0.0 - 1.0) */
  glow: number;
}

export interface MotionRecipe {
  id: MotionId;
  name: string;
  nameJa: string;
  description: string;
  durationMs: number;
  evaluate: (timeMs: number, speedMultiplier?: number) => MotionEvaluation;
}

import { ExportQuality } from './config.ts';

export interface ExportResult {
  blob: Blob;
  url: string;
  mimeType: string;
  method: string;
  fileSizeBytes: number;
  durationMs: number;
  width: number;
  height: number;
  filename: string;
  exportFps: number;
  quality: ExportQuality;
  requestedBitrate: string;
  isGifFallback: boolean;
  fallbackReason?: string;
}

export interface DeveloperInfoData {
  deviceBrowserInfo: string;
  viewportWidth: number;
  viewportHeight: number;
  visualViewportScale: number;
  devicePixelRatio: number;
  canvasBufferWidth: number;
  canvasBufferHeight: number;
  canvasDisplayWidth: number;
  canvasDisplayHeight: number;
  baseOriginalWidth: number;
  baseOriginalHeight: number;
  baseProcessedWidth: number;
  baseProcessedHeight: number;
  fps: number; // Preview FPS (real-time rolling)
  exportFps: number | null; // Measured/target FPS during export
  stampCount: number;
  exportQuality: ExportQuality;
  requestedBitrate: string | null;
  exportTimeMs: number | null;
  exportFileSize: string | null;
  exportMethod: string | null;
  exportMimeType: string | null;
  outputResolution: string | null;
  isGifFallback: boolean;
  gifFallbackReason: string | null;
  webCodecsAvailable: boolean;
  webCodecsH264Available: boolean;
}
