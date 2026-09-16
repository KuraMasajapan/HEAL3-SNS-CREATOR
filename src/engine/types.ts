/**
 * HEAL3 SNS-Creator - Core Types & Interfaces
 */

export type StampType = 'star' | 'heart' | 'circle' | 'foreground_image';

export type MotionId = 'none' | 'bounce' | 'rotate' | 'pulse';

/**
 * Scene Motion IDs (Controls the entire artwork presentation, distinct from Item Motion)
 */
export type SceneMotionId = 'none' | 'fade_in' | 'gentle_zoom' | 'fade_and_zoom';

export type SceneMotionType = 'intro' | 'loop';

export interface SceneMotionEvaluation {
  /** Overall opacity multiplier (0.0 = completely transparent, 1.0 = fully visible) */
  alpha: number;
  /** Overall scale multiplier (e.g. 0.96 -> 1.0) */
  scale: number;
  /** Transform origin X (normalized 0.0 - 1.0, default 0.5 = center) */
  originX: number;
  /** Transform origin Y (normalized 0.0 - 1.0, default 0.5 = center) */
  originY: number;
}

export interface SceneMotionRecipe {
  id: SceneMotionId;
  name: string;
  nameJa: string;
  type: SceneMotionType;
  /** Intro duration in ms (e.g. 650ms for smooth cinematic entrance) */
  durationMs: number;
  description: string;
  /**
   * Deterministic evaluation function of scene animation at timeMs.
   * totalDurationMs is optional, used for seamless loop-outro transitions.
   */
  evaluate: (timeMs: number, totalDurationMs?: number) => SceneMotionEvaluation;
}

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
  /** Primary color of the stamp (or tint) */
  color: string;
  /** Secondary or accent color */
  accentColor: string;
  /** Whether this is a Foreground Item (e.g. cut-out avatar image) */
  isForeground?: boolean;
  /** URL or base64 data URL for Foreground image */
  imageUrl?: string;
  /** Cached HTMLImageElement for zero-allocation rendering */
  imageElement?: HTMLImageElement | null;
  /** Aspect ratio of the foreground image (width / height) */
  aspectRatio?: number;
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
  foregroundItemCount: number;
  sceneMotion: SceneMotionId;
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
