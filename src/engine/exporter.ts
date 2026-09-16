/**
 * HEAL3 SNS-Creator - Background Exporter Engine
 * 
 * Supports:
 * 1. Still Image (JPEG/PNG) when no motion is present
 * 2. MP4/WebM Video via MediaRecorder & Canvas.captureStream
 * 3. High-compatibility Animated GIF via gifenc (failsafe for iOS Safari)
 * 
 * Runs entirely in the background on an offscreen canvas,
 * maintaining 60fps animation playback on the user's screen.
 */

import { BaseImageState, ExportResult, StampItem } from './types.ts';
import { renderScene } from './renderer.ts';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { ExportQuality, POC_CONFIG, QUALITY_PRESETS } from './config.ts';

export type ExportProgressCallback = (percent: number, statusText: string) => void;

export type PreferredExportMode = 'auto' | 'video' | 'gif';

export interface WebCodecsSupportStatus {
  hasVideoEncoder: boolean;
  hasH264: boolean;
  details: string;
}

/**
 * Checks client support for the WebCodecs VideoEncoder API & H.264 profile
 */
export async function checkWebCodecsSupport(): Promise<WebCodecsSupportStatus> {
  if (typeof window === 'undefined' || typeof (window as any).VideoEncoder !== 'function') {
    return {
      hasVideoEncoder: false,
      hasH264: false,
      details: 'window.VideoEncoder is undefined',
    };
  }

  try {
    const config = {
      codec: 'avc1.42001f', // H.264 Baseline Profile Level 3.1
      width: 720,
      height: 1280,
      bitrate: 3_000_000,
      framerate: 30,
    };
    const support = await (window as any).VideoEncoder.isConfigSupported(config);
    return {
      hasVideoEncoder: true,
      hasH264: Boolean(support && support.supported),
      details: support && support.supported ? 'H.264 (avc1.42001f) Supported' : 'H.264 Config Unsupported',
    };
  } catch (err: any) {
    return {
      hasVideoEncoder: true,
      hasH264: false,
      details: `isConfigSupported error: ${err.message || String(err)}`,
    };
  }
}

/**
 * Detect supported MediaRecorder video mime types dynamically
 */
export function getSupportedVideoMimeType(): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return null;
  }

  const candidateTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const type of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // Continue to next type
    }
  }

  return null;
}

/**
 * Check if canvas.captureStream is supported
 */
export function isCaptureStreamSupported(canvas: HTMLCanvasElement): boolean {
  return typeof (canvas as any).captureStream === 'function' ||
         typeof (canvas as any).mozCaptureStream === 'function';
}

/**
 * Exports single high-resolution still image (when no motion is used)
 */
export async function exportStillImage(
  baseImage: BaseImageState,
  stamps: StampItem[],
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const startTime = performance.now();
  onProgress?.(20, '静止画をレンダリング中…');

  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.current;
  const maxDim = preset.maxDimension;
  const origW = baseImage.processedWidth || 720;
  const origH = baseImage.processedHeight || 1280;
  const aspect = origW / origH;

  let width = origW;
  let height = origH;
  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      width = maxDim;
      height = Math.round(maxDim / aspect);
    } else {
      height = maxDim;
      width = Math.round(maxDim * aspect);
    }
  }
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas 2Dコンテキストの作成に失敗しました');
  }

  // Render at timestamp 0 with no interactive overlays
  renderScene(ctx, baseImage, stamps, width, height, 0, {
    isInteractivePreview: false,
    selectedStampId: null,
  });

  onProgress?.(70, '画像ファイルをエンコード中…');

  const mimeType = 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('静止画の生成に失敗しました'));
      },
      mimeType,
      0.95
    );
  });

  const durationMs = Math.round(performance.now() - startTime);
  const url = URL.createObjectURL(blob);
  const filename = `heal3_creation_${Date.now()}.jpg`;

  onProgress?.(100, '書き出し完了');

  return {
    blob,
    url,
    mimeType,
    method: 'Canvas toBlob (JPEG 95%)',
    fileSizeBytes: blob.size,
    durationMs,
    width,
    height,
    filename,
    exportFps: 0,
    quality,
    requestedBitrate: 'N/A (Still Image)',
    isGifFallback: false,
  };
}

/**
 * Exports Animated GIF via gifenc
 * Universal compatibility for iOS Safari, Android, X, Messages, etc.
 */
export async function exportAnimatedGif(
  baseImage: BaseImageState,
  stamps: StampItem[],
  isFallback = false,
  fallbackReason?: string,
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const startTime = performance.now();
  onProgress?.(10, isFallback ? 'GIFフォールバックの準備中…' : 'アニメーションGIFの準備中…');

  const maxDim = POC_CONFIG.GIF_EXPORT_MAX_DIMENSION;
  const origW = baseImage.processedWidth || 720;
  const origH = baseImage.processedHeight || 1280;
  const aspect = origW / origH;

  let width = origW;
  let height = origH;
  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      width = maxDim;
      height = Math.round(maxDim / aspect);
    } else {
      height = maxDim;
      width = Math.round(maxDim * aspect);
    }
  }

  // Force even dimensions
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvasコンテキスト初期化エラー');
  }

  const gif = GIFEncoder();
  const fps = POC_CONFIG.GIF_EXPORT_FPS;
  const durationSec = POC_CONFIG.VIDEO_DURATION_SEC;
  const totalFrames = Math.round(fps * durationSec);
  const frameIntervalMs = 1000 / fps;
  const gifDelay = Math.round(frameIntervalMs / 10); // in hundredths of a second

  for (let f = 0; f < totalFrames; f++) {
    const timeMs = f * frameIntervalMs;
    // Uses the EXACT SAME deterministic renderScene and motion equations
    renderScene(ctx, baseImage, stamps, width, height, timeMs, {
      isInteractivePreview: false,
      selectedStampId: null,
    });

    const imgData = ctx.getImageData(0, 0, width, height);
    // Quantize palette
    const palette = quantize(imgData.data, POC_CONFIG.GIF_COLOR_QUANTIZE);
    const index = applyPalette(imgData.data, palette);

    gif.writeFrame(index, width, height, {
      palette,
      delay: gifDelay,
    });

    const percent = Math.round(10 + (f / totalFrames) * 80);
    onProgress?.(percent, `GIFフレーム生成中 (${f + 1}/${totalFrames})…`);

    // Yield to main thread every 2 frames to prevent frame drops in live preview
    if (f % 2 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.(95, 'GIFファイルをパッキング中…');
  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });

  const durationMs = Math.round(performance.now() - startTime);
  const url = URL.createObjectURL(blob);
  const filename = `heal3_motion_${Date.now()}.gif`;

  onProgress?.(100, '書き出し完了');

  return {
    blob,
    url,
    mimeType: 'image/gif',
    method: `gifenc Animated GIF (${fps}fps/${POC_CONFIG.GIF_COLOR_QUANTIZE}-color)`,
    fileSizeBytes: blob.size,
    durationMs,
    width,
    height,
    filename,
    exportFps: fps,
    quality,
    requestedBitrate: 'N/A (GIF Palette)',
    isGifFallback: isFallback,
    fallbackReason,
  };
}

/**
 * Exports MP4 / WebM Video via MediaRecorder & Canvas.captureStream
 */
export async function exportVideoMediaRecorder(
  baseImage: BaseImageState,
  stamps: StampItem[],
  mimeType: string,
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const startTime = performance.now();
  onProgress?.(10, '動画エンコーダーを初期化中…');

  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.current;
  const maxDim = preset.maxDimension;
  const bitrate = preset.bitrate;

  const origW = baseImage.processedWidth || 720;
  const origH = baseImage.processedHeight || 1280;
  const aspect = origW / origH;

  let width = origW;
  let height = origH;
  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      width = maxDim;
      height = Math.round(maxDim / aspect);
    } else {
      height = maxDim;
      width = Math.round(maxDim * aspect);
    }
  }
  // Enforce even dimensions for H.264 / AVC video codecs
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // IMPORTANT SAFARI COMPATIBILITY TRICK:
  // On iOS Safari, captureStream() on a disconnected canvas can silently fail to dispatch frames.
  // We mount the canvas hidden in DOM during recording and unmount in finally.
  canvas.style.position = 'fixed';
  canvas.style.top = '-9999px';
  canvas.style.left = '-9999px';
  canvas.style.opacity = '0';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  try {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas初期化失敗');
    }

    // Initial draw
    renderScene(ctx, baseImage, stamps, width, height, 0, {
      isInteractivePreview: false,
      selectedStampId: null,
    });

    const fps = POC_CONFIG.VIDEO_EXPORT_FPS;
    const durationSec = POC_CONFIG.VIDEO_DURATION_SEC;
    const totalFrames = Math.round(fps * durationSec);
    const frameIntervalMs = 1000 / fps;

    // Check captureStream
    const captureStreamFn = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
    if (!captureStreamFn) {
      throw new Error('ブラウザがcanvas.captureStreamに対応していません');
    }

    const stream = captureStreamFn.call(canvas, fps);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });
    } catch (err: any) {
      throw new Error(`MediaRecorder作成失敗 (${mimeType}): ${err.message || String(err)}`);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = (e: any) => reject(new Error(`録画エラー: ${e.error?.message || '不明なエラー'}`));
      recorder.onstop = () => {
        if (chunks.length === 0 || chunks.reduce((acc, c) => acc + c.size, 0) < 100) {
          reject(new Error('録画データが空です (0 bytes generated)'));
        } else {
          const finalBlob = new Blob(chunks, { type: mimeType });
          resolve(finalBlob);
        }
      };
    });

    // Start recorder with timeslice to ensure continuous chunk flushing
    recorder.start(500);

    // Step through frames
    for (let f = 0; f < totalFrames; f++) {
      const timeMs = f * frameIntervalMs;
      // Uses the EXACT SAME deterministic renderScene and motion equations
      renderScene(ctx, baseImage, stamps, width, height, timeMs, {
        isInteractivePreview: false,
        selectedStampId: null,
      });

      const percent = Math.round(15 + (f / totalFrames) * 75);
      onProgress?.(percent, `動画フレーム記録中 (${Math.round((f / totalFrames) * 100)}%)…`);

      // Wait frame interval to allow real-time captureStream ingestion
      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }

    onProgress?.(92, '動画ストリームを確定中…');
    recorder.stop();

    const blob = await recordingPromise;
    const durationMs = Math.round(performance.now() - startTime);
    const isMp4 = mimeType.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const filename = `heal3_motion_${Date.now()}.${ext}`;
    const url = URL.createObjectURL(blob);

    onProgress?.(100, '書き出し完了');

    return {
      blob,
      url,
      mimeType,
      method: `MediaRecorder (${mimeType})`,
      fileSizeBytes: blob.size,
      durationMs,
      width,
      height,
      filename,
      exportFps: fps,
      quality,
      requestedBitrate: preset.bitrateLabel,
      isGifFallback: false,
    };
  } finally {
    if (canvas.parentNode) {
      document.body.removeChild(canvas);
    }
  }
}

/**
 * Master Background Exporter
 * Intelligently picks the safest, highest-compatibility format:
 * - If no stamps or all static -> exports Still Image
 * - If motion exists:
 *     Attempts MediaRecorder with preferred codec (MP4 on iOS / WebM on Chrome).
 *     If MediaRecorder is unsupported or fails, seamlessly falls back to Animated GIF,
 *     marking isGifFallback = true with clear diagnostic reason.
 */
export async function exportArtwork(
  baseImage: BaseImageState,
  stamps: StampItem[],
  mode: PreferredExportMode = 'auto',
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  const hasMotion = stamps.some((s) => s.motionId !== 'none');

  // Case 1: No motion -> Still image
  if (!hasMotion) {
    return exportStillImage(baseImage, stamps, quality, onProgress);
  }

  // Case 2: Motion exists & user explicitly requested GIF
  if (mode === 'gif') {
    return exportAnimatedGif(baseImage, stamps, false, undefined, quality, onProgress);
  }

  const supportedMime = getSupportedVideoMimeType();
  const testCanvas = document.createElement('canvas');
  const hasCaptureStream = isCaptureStreamSupported(testCanvas);

  // If user requested video or auto, check if MediaRecorder is viable
  if (hasCaptureStream && supportedMime) {
    try {
      return await exportVideoMediaRecorder(baseImage, stamps, supportedMime, quality, onProgress);
    } catch (err: any) {
      const reason = `MediaRecorder失敗 [${supportedMime}]: ${err.message || String(err)}`;
      console.warn('MediaRecorder export failed, falling back to Animated GIF:', reason);
      onProgress?.(20, '動画記録に失敗したため、GIFフォールバックを実行します…');
      return exportAnimatedGif(baseImage, stamps, true, reason, quality, onProgress);
    }
  }

  // Fallback to Animated GIF if captureStream or MIME is completely unsupported
  const reason = !hasCaptureStream
    ? 'ブラウザがcanvas.captureStreamをサポートしていません'
    : '利用可能な動画MIMEタイプ(MP4/WebM)が見つかりません';
  console.warn('Falling back to GIF:', reason);
  return exportAnimatedGif(baseImage, stamps, true, reason, quality, onProgress);
}
