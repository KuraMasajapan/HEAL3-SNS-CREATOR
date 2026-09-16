/**
 * HEAL3 SNS-Creator - Core Types & Interfaces
 */

export type StampType = 'star' | 'heart' | 'circle' | 'foreground_image';

export type MotionId = 'none' | 'bounce' | 'rotate' | 'pulse';

/**
 * Scene Motion IDs (Controls the entire artwork presentation, distinct from Item Motion)
 */
export type SceneMotionId = 'none' | 'fade_in' | 'gentle_zoom' | 'fade_and_zoom' | 'dramatic_entrance' | 'slow_dramatic_zoom';

export type SceneMotionType = 'intro' | 'loop';

export type SceneEasingType =
  | 'linear'
  | 'easeOutQuad'
  | 'easeOutCubic'
  | 'easeInOutSine'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'overshoot'
  | 'dramaticZoom';

/**
 * 8 Core Independent Parameters for Scene Motion Recipes + Poster Hold
 */
export interface SceneMotionParams {
  /** Duration of the intro in milliseconds (e.g. 1500, 3000) */
  duration: number;
  /** Delay before intro starts in milliseconds (e.g. 0) */
  delay: number;
  /**
   * Poster Hold duration in milliseconds (e.g. 200 - 400ms).
   * Displays the final complete artwork at 100% (opacity: 1, scale: 1, rot: 0)
   * at the very beginning of the video to guarantee non-black thumbnail capture on SNS.
   */
  posterHoldMs: number;
  /** Opacity transition [start, end] (0.0 = transparent, 1.0 = fully opaque) */
  opacity: { from: number; to: number };
  /** Scale transition [start, end] (1.0 = standard canvas scale) */
  scale: { from: number; to: number };
  /** Horizontal offset transition [start, end] (normalized, relative to canvas width) */
  x: { from: number; to: number };
  /** Vertical offset transition [start, end] (normalized, relative to canvas height, positive = down) */
  y: { from: number; to: number };
  /** Rotation transition [start, end] in degrees (positive = clockwise) */
  rotation: { from: number; to: number };
  /** Easing algorithm */
  easing: SceneEasingType;
  /** Optional overshoot tension multiplier (used when easing is 'overshoot' or 'easeOutBack', default 1.35) */
  overshootFactor?: number;
}

export interface SceneMotionEvaluation {
  /** Overall opacity multiplier (0.0 = completely transparent, 1.0 = fully visible) */
  alpha: number;
  /** Overall scale multiplier (e.g. 0.85 -> 1.0) */
  scale: number;
  /** Horizontal shift in normalized canvas units (0 = center) */
  dx: number;
  /** Vertical shift in normalized canvas units (0 = center) */
  dy: number;
  /** Rotation angle in degrees (0 = normal) */
  rotation: number;
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
  /** 8 basic parameters independently defined in recipe */
  params: SceneMotionParams;
  /** Intro duration in ms (convenience accessor matching params.duration) */
  durationMs: number;
  description: string;
  /**
   * Deterministic evaluation function of scene animation at timeMs.
   * Shared identically across Preview and Export.
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
  // Avatar Extraction telemetry
  avatarExtractionMethod: string;
  avatarModelName?: string;
  avatarModelFileSize?: string;
  avatarModelLoadTimeMs?: number | null;
  avatarInferenceTimeMs?: number | null;
  avatarExtractionTimeMs: number | null;
  avatarForegroundResolution: string | null;
  avatarModelSize: string;
  avatarExecutionBackend?: string;
}

export type AvatarExtractionEngineMode = 'mediapipe' | 'legacy_pure_ts';

/**
 * HEAL3 Avatar Adapter Definition Interface.
 * Allows modular registration of character body types, proportions,
 * and adaptive extraction logic without hardcoding inside the core engine.
 * Third parties can submit PRs with new avatar definitions.
 */
export interface AvatarAdapterDefinition {
  id: string;
  name: string;
  nameJa: string;
  descriptionJa: string;
  /** Estimated body center point (normalized 0.0 - 1.0) */
  defaultCenter: { x: number; y: number };
  /** Body bounding box proposal (normalized relative to image dimensions) */
  defaultBox: { width: number; height: number };
  /** Edge detection sensitivity / tolerance (0.0 - 1.0) */
  edgeTolerance: number;
  /** Edge feathering radius in pixels */
  featherRadius: number;
  /** Suggested confidence threshold for ML models (e.g. 0.40 - 0.70) */
  suggestedConfidence?: number;
  /** Known UI exclusion zones (normalized coordinates) to prevent UI bleed */
  uiExclusionZones?: { xMin: number; xMax: number; yMin: number; yMax: number }[];
}

export type AlphaConversionMode =
  | 'raw_confidence'       // A: Continuous confidence-weighted alpha (Legacy semi-transparent)
  | 'binary_threshold'     // B: Strict binary threshold (Opaque 255 inside, 0 outside)
  | 'threshold_feather';   // C: Binary threshold with edge-only anti-aliased feather (1-3px boundary)

export interface AvatarExtractionOptions {
  engineMode?: AvatarExtractionEngineMode;
  adapterId: string;
  /** User tap / focus coordinate in normalized coordinates [0, 1] */
  focusPoint?: { x: number; y: number };
  /** Edge tolerance multiplier (0.5 to 2.0, default 1.0) */
  toleranceMultiplier?: number;
  /** ML model confidence threshold (0.2 to 0.8, default 0.40) */
  confidenceThreshold?: number;
  /** Alpha conversion method for post-processing evaluation */
  alphaMode?: AlphaConversionMode;
  /** Edge feather radius in pixels (only used for threshold_feather mode, default 2) */
  featherRadius?: number;
}

export interface AvatarExtractionResult {
  dataUrl: string;
  imageElement: HTMLImageElement;
  width: number;
  height: number;
  aspectRatio: number;
  engineMode: AvatarExtractionEngineMode;
  modelName?: string;
  modelFileSize?: string;
  modelLoadTimeMs?: number;
  inferenceTimeMs?: number;
  extractionTimeMs: number;
  executionBackend?: string;
  detectedPixelCount?: number;
  adapterName: string;
  modelSize: string;

  // Debug & Quality Isolation Artifacts
  originalUrl?: string;
  rawConfidenceMaskUrl?: string;
  thresholdBinaryMaskUrl?: string;
  finalAlphaResultUrl?: string;
  alphaMode?: AlphaConversionMode;
  confidenceThresholdUsed?: number;
  featherRadiusUsed?: number;
}

export interface DiagnosticStep {
  stepNumber: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'OK' | 'FAILED' | 'SKIPPED';
  durationMs?: number;
  httpStatus?: string;
  url?: string;
  details?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface MediaPipeDiagnosticReport {
  timestamp: number;
  overallStatus: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  steps: DiagnosticStep[];
  modelUrl: string;
  wasmUrl: string;
  filesetResolverResult?: any;
  createFromOptionsResult?: string;
  activeEngineType?: 'InteractiveSegmenterLegacy' | 'InteractiveSegmenter' | null;
  capturedLogs: string[];
  errorSummary?: {
    name: string;
    message: string;
    stack?: string;
    failedStep: number;
    failedStepName: string;
  };
}

