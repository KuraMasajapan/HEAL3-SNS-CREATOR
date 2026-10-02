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

import { BaseImageState, ExportResult, LayoutMode, MapSegmentState, MaskConfig, SceneMotionId, StampItem } from './types.ts';
import { renderScene } from './renderer.ts';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { calculateExportDimensions, ExportQuality, POC_CONFIG, QUALITY_PRESETS } from './config.ts';
import { MapPanelDetectionResult } from './mapPanelDetector.ts';

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
 * Safely seeks an HTMLVideoElement to a specific timestamp in seconds,
 * ensuring the decoder has actually completed seeking before resolving,
 * and handling Safari/iOS WebKit quirks without race conditions.
 *
 * Rules:
 * 1. Checks video metadata and ensures readyState >= 2 (frame data available).
 * 2. Pauses video during export frame-by-frame seeking to avoid playback drift.
 * 3. Waits for any in-flight seek to settle before dispatching a new seek.
 * 4. Clamps target to [0, duration - 0.001] to stop on the final frame without
 *    triggering Safari's 'ended' state which can freeze the buffer.
 * 5. Skips redundant seek if already at clampedTarget and frame is ready.
 * 6. Waits for 'seeked' and leverages requestVideoFrameCallback (rVFC) if available,
 *    with a short 40ms failsafe timer for paused videos in Safari.
 * 7. Rejects with an explicit Error on decode error or timeout (3000ms).
 */
export async function seekVideoToTime(
  video: HTMLVideoElement,
  targetTimeSec: number,
  timeoutMs = 3000
): Promise<void> {
  // 1. Ensure video has metadata loaded
  if (video.readyState < 1) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        reject(new Error('動画メタデータの読み込みがタイムアウトしました'));
      }, 3000);
      const onLoaded = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        reject(new Error('動画メタデータの読み込みに失敗しました'));
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  }

  // 2. Pause video during export frame-by-frame seeking
  if (!video.paused) {
    try {
      video.pause();
    } catch (_e) {
      // ignore
    }
  }

  // 3. Wait for any in-progress seek to settle before dispatching a new seek
  if (video.seeking) {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const t = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('前フレームの動画シーク待機がタイムアウトしました'));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(t);
        video.removeEventListener('seeked', onDone);
        video.removeEventListener('error', onErr);
      };
      const onDone = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onErr = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('前フレームの動画シーク中にエラーが発生しました'));
      };
      video.addEventListener('seeked', onDone, { once: true });
      video.addEventListener('error', onErr, { once: true });
    });
  }

  // 4. Ensure current frame data is loaded (HAVE_CURRENT_DATA or higher)
  if (video.readyState < 2) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        video.removeEventListener('loadeddata', onData);
        video.removeEventListener('canplay', onData);
        video.removeEventListener('error', onError);
        reject(new Error('動画フレームデータの待機がタイムアウトしました'));
      }, 3000);
      const onData = () => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', onData);
        video.removeEventListener('canplay', onData);
        video.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', onData);
        video.removeEventListener('canplay', onData);
        video.removeEventListener('error', onError);
        reject(new Error('動画フレームデータの読み込みに失敗しました'));
      };
      video.addEventListener('loadeddata', onData, { once: true });
      video.addEventListener('canplay', onData, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  }

  // 5. Determine safe seek boundary
  // Clamping to [0, duration - 0.001] stops cleanly on the final frame without triggering
  // WebKit 'ended' event which can drop readyState or freeze the frame buffer.
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : Infinity;
  const maxSeekable = Number.isFinite(duration) ? Math.max(0, duration - 0.001) : Infinity;
  const clampedTarget = Math.max(0, Math.min(targetTimeSec, maxSeekable));

  // 6. If already at target time and data is ready, skip redundant seek (e.g. video stopped at end frame)
  if (Math.abs(video.currentTime - clampedTarget) < 0.002 && video.readyState >= 2) {
    return;
  }

  // 7. Perform seek and wait for both seeked and frame presentation
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer: any = null;

    const cleanup = () => {
      settled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onSeeked = () => {
      if (settled) return;

      // Safari 15.4+ and modern Chromium support requestVideoFrameCallback
      if (typeof (video as any).requestVideoFrameCallback === 'function') {
        let rVfcFired = false;
        let rVfcId: number | null = null;
        let rVfcTimer: any = null;

        const completePresentation = () => {
          if (rVfcFired || settled) return;
          rVfcFired = true;
          if (rVfcTimer) clearTimeout(rVfcTimer);
          cleanup();
          resolve();
        };

        try {
          rVfcId = (video as any).requestVideoFrameCallback(() => {
            completePresentation();
          });
        } catch (_e) {
          cleanup();
          resolve();
          return;
        }

        // Failsafe timer for Safari on paused videos:
        // When a video element is paused, Safari compositor might throttle rVFC until the next paint.
        // A 40ms safety timer guarantees export never stalls while giving rVFC the chance to fire.
        rVfcTimer = setTimeout(() => {
          if (!rVfcFired && !settled) {
            if (rVfcId !== null && typeof (video as any).cancelVideoFrameCallback === 'function') {
              try {
                (video as any).cancelVideoFrameCallback(rVfcId);
              } catch (_e) {
                // ignore
              }
            }
            completePresentation();
          }
        }, 40);
      } else {
        // Fallback for browsers without rVFC:
        // A requestAnimationFrame tick ensures the main paint queue has completed before drawImage
        requestAnimationFrame(() => {
          cleanup();
          resolve();
        });
      }
    };

    const onError = () => {
      if (settled) return;
      cleanup();
      const mediaErr = video.error;
      const msg = mediaErr ? `(コード: ${mediaErr.code}) ${mediaErr.message || 'デコード失敗'}` : 'デコードエラー';
      reject(new Error(`動画フレームのシーク失敗: ${msg}`));
    };

    timer = setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error(`動画フレームのシークがタイムアウトしました (${clampedTarget.toFixed(2)}s)`));
    }, timeoutMs);

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    try {
      video.currentTime = clampedTarget;
    } catch (err: any) {
      cleanup();
      reject(new Error(`動画currentTime設定エラー: ${err.message || String(err)}`));
    }
  });
}

/**
 * Exports single high-resolution still image (when no motion is used)
 */
export async function exportStillImage(
  baseImage: BaseImageState,
  stamps: StampItem[],
  sceneMotionId: SceneMotionId = 'none',
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback,
  maskConfig?: MaskConfig,
  layoutMode?: LayoutMode,
  mapSegment?: MapSegmentState,
  mapDetection?: MapPanelDetectionResult | null
): Promise<ExportResult> {
  const startTime = performance.now();
  onProgress?.(20, '静止画をレンダリング中…');

  // If video is present, ensure video is at frame 0
  const isVideoSegment = Boolean(
    mapSegment &&
    mapSegment.mode === 'video' &&
    mapSegment.videoElement &&
    mapSegment.isVideoLoaded &&
    !mapSegment.videoError
  );
  if (isVideoSegment) {
    try {
      await seekVideoToTime(mapSegment!.videoElement!, 0);
    } catch (err) {
      console.warn('Still image video seek warning:', err);
    }
  }

  const origW = baseImage.processedWidth || baseImage.originalWidth || 720;
  const origH = baseImage.processedHeight || baseImage.originalHeight || 1280;
  const { width, height } = calculateExportDimensions(origW, origH, quality);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas 2Dコンテキストの作成に失敗しました');
  }

  // Render at timestamp 0 with deterministic Scene Motion and Mask
  renderScene(ctx, baseImage, stamps, width, height, 0, sceneMotionId, undefined, {
    isInteractivePreview: false,
    selectedStampId: null,
    maskConfig,
    layoutMode,
    mapSegment,
    mapDetection,
  }, undefined, maskConfig, layoutMode, mapSegment);

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
  sceneMotionId: SceneMotionId = 'none',
  isFallback = false,
  fallbackReason?: string,
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback,
  maskConfig?: MaskConfig,
  layoutMode?: LayoutMode,
  mapSegment?: MapSegmentState,
  mapDetection?: MapPanelDetectionResult | null
): Promise<ExportResult> {
  const startTime = performance.now();
  onProgress?.(10, isFallback ? 'GIFフォールバックの準備中…' : 'アニメーションGIFの準備中…');

  const origW = baseImage.processedWidth || baseImage.originalWidth || 720;
  const origH = baseImage.processedHeight || baseImage.originalHeight || 1280;
  // GIF uses GIF_EXPORT_MAX_DIMENSION cap
  const maxDim = POC_CONFIG.GIF_EXPORT_MAX_DIMENSION;
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
  width = Math.max(2, Math.floor(width / 2) * 2);
  height = Math.max(2, Math.floor(height / 2) * 2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvasコンテキスト初期化エラー');
  }

  const gif = GIFEncoder();
  const isVideoSegment = Boolean(
    mapSegment &&
    mapSegment.mode === 'video' &&
    mapSegment.videoElement &&
    mapSegment.isVideoLoaded &&
    !mapSegment.videoError
  );
  const videoElem = isVideoSegment ? mapSegment!.videoElement! : null;

  const fps = POC_CONFIG.GIF_EXPORT_FPS;
  const durationSec = videoElem && Number.isFinite(videoElem.duration) && videoElem.duration > 0
    ? Math.max(POC_CONFIG.VIDEO_DURATION_SEC, Math.min(4.0, Number(videoElem.duration.toFixed(2))))
    : POC_CONFIG.VIDEO_DURATION_SEC;
  const totalDurationMs = durationSec * 1000;
  const totalFrames = Math.round(fps * durationSec);
  const frameIntervalMs = 1000 / fps;
  const gifDelay = Math.round(frameIntervalMs / 10); // in hundredths of a second

  // Pre-sync video to 0s if present
  if (videoElem) {
    onProgress?.(10, '動画の先頭フレームを同期中…');
    await seekVideoToTime(videoElem, 0);
  }

  for (let f = 0; f < totalFrames; f++) {
    const timeMs = f * frameIntervalMs;
    const targetVideoTimeSec = timeMs / 1000;

    // Time-synchronize video element before rendering frame
    if (videoElem) {
      await seekVideoToTime(videoElem, targetVideoTimeSec);
    }

    // Uses the EXACT SAME deterministic renderScene, Scene Motion, Item Motion, Mask, Layout, and Map Segment
    renderScene(ctx, baseImage, stamps, width, height, timeMs, sceneMotionId, totalDurationMs, {
      isInteractivePreview: false,
      selectedStampId: null,
      maskConfig,
      layoutMode,
      mapSegment,
      mapDetection,
    }, undefined, maskConfig, layoutMode, mapSegment);

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
  sceneMotionId: SceneMotionId = 'none',
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback,
  maskConfig?: MaskConfig,
  layoutMode?: LayoutMode,
  mapSegment?: MapSegmentState,
  mapDetection?: MapPanelDetectionResult | null
): Promise<ExportResult> {
  const startTime = performance.now();
  onProgress?.(10, '動画エンコーダーを初期化中…');

  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.current;
  const bitrate = preset.bitrate;

  const origW = baseImage.processedWidth || baseImage.originalWidth || 720;
  const origH = baseImage.processedHeight || baseImage.originalHeight || 1280;
  const { width, height } = calculateExportDimensions(origW, origH, quality);

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

  const isVideoSegment = Boolean(
    mapSegment &&
    mapSegment.mode === 'video' &&
    mapSegment.videoElement &&
    mapSegment.isVideoLoaded &&
    !mapSegment.videoError
  );
  const videoElem = isVideoSegment ? mapSegment!.videoElement! : null;

  try {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas初期化失敗');
    }

    const fps = POC_CONFIG.VIDEO_EXPORT_FPS;
    const durationSec = videoElem && Number.isFinite(videoElem.duration) && videoElem.duration > 0
      ? Math.max(POC_CONFIG.VIDEO_DURATION_SEC, Math.min(4.0, Number(videoElem.duration.toFixed(2))))
      : POC_CONFIG.VIDEO_DURATION_SEC;
    const totalDurationMs = durationSec * 1000;
    const totalFrames = Math.round(fps * durationSec);
    const frameIntervalMs = 1000 / fps;

    // 1-6. Prepare video for real-time synchronized playback
    if (videoElem) {
      onProgress?.(10, '動画の先頭フレームを同期中…');
      // 1. Export開始前にvideoをpause
      if (!videoElem.paused) {
        try {
          videoElem.pause();
        } catch (_e) {}
      }
      // 4. playbackRate = 1.0
      videoElem.playbackRate = 1.0;
      // 5. muted = true
      videoElem.muted = true;
      videoElem.defaultMuted = true;
      // 6. loop = false (自動ループ禁止・末尾保持)
      videoElem.loop = false;
      // 2. currentTime = 0 & 3. 0秒へのseek完了を待つ
      await seekVideoToTime(videoElem, 0);
    }

    // Initial draw
    renderScene(ctx, baseImage, stamps, width, height, 0, sceneMotionId, totalDurationMs, {
      isInteractivePreview: false,
      selectedStampId: null,
      maskConfig,
      layoutMode,
      mapSegment,
      mapDetection,
    }, undefined, maskConfig, layoutMode, mapSegment);

    // Check captureStream
    const captureStreamFn = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
    if (!captureStreamFn) {
      throw new Error('ブラウザがcanvas.captureStreamに対応していません');
    }

    const stream = captureStreamFn.call(canvas, fps);
    const videoTrack = stream.getVideoTracks()?.[0];
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

    // 7. 録画開始とほぼ同時にvideo.play()
    recorder.start(500);
    const recordingStartTime = performance.now();

    if (videoElem) {
      try {
        const playPromise = videoElem.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('MediaRecorder export video.play() warning:', err);
          });
        }
      } catch (err) {
        console.warn('MediaRecorder export video.play() error:', err);
      }
    }

    // 8. videoは通常の実時間再生に任せる (フレーム単位のseekは行わない)
    // 9. Canvas render loopは録画中の実時間に合わせて描画
    // 10. 動画末尾では最終フレームを保持 (loop = false のため自動停止)
    for (let f = 0; f < totalFrames; f++) {
      const now = performance.now();
      const elapsedWallClockMs = now - recordingStartTime;
      const timeMs = Math.min(elapsedWallClockMs, totalDurationMs);

      // Uses the EXACT SAME deterministic renderScene and motion equations
      renderScene(ctx, baseImage, stamps, width, height, timeMs, sceneMotionId, totalDurationMs, {
        isInteractivePreview: false,
        selectedStampId: null,
        maskConfig,
        layoutMode,
        mapSegment,
        mapDetection,
      }, undefined, maskConfig, layoutMode, mapSegment);

      // Signal capture stream if requestFrame is supported
      if (videoTrack && typeof (videoTrack as any).requestFrame === 'function') {
        try {
          (videoTrack as any).requestFrame();
        } catch (_e) {
          // ignore
        }
      }

      const percent = Math.round(15 + (f / totalFrames) * 75);
      onProgress?.(percent, `動画フレーム記録中 (${Math.round((f / totalFrames) * 100)}%)…`);

      // Wall-clock pacing for real-time MediaRecorder
      const targetNextElapsedMs = (f + 1) * frameIntervalMs;
      const currentElapsedMs = performance.now() - recordingStartTime;
      const sleepMs = targetNextElapsedMs - currentElapsedMs;

      if (sleepMs > 0) {
        await new Promise((r) => setTimeout(r, sleepMs));
      } else {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Ensure video is paused at end
    if (videoElem && !videoElem.paused) {
      try {
        videoElem.pause();
      } catch (_e) {}
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
    if (videoElem && !videoElem.paused) {
      try {
        videoElem.pause();
      } catch (_e) {}
    }
    if (canvas.parentNode) {
      document.body.removeChild(canvas);
    }
  }
}

/**
 * Master Background Exporter
 * Intelligently picks the safest, highest-compatibility format:
 * - If no stamps or all static -> exports Still Image
 * - If motion exists (or video replacement is active):
 *     Attempts MediaRecorder with preferred codec (MP4 on iOS / WebM on Chrome).
 *     If MediaRecorder is unsupported or fails, seamlessly falls back to Animated GIF,
 *     marking isGifFallback = true with clear diagnostic reason.
 */
export async function exportArtwork(
  baseImage: BaseImageState,
  stamps: StampItem[],
  sceneMotionId: SceneMotionId = 'none',
  mode: PreferredExportMode = 'auto',
  quality: ExportQuality = 'current',
  onProgress?: ExportProgressCallback,
  maskConfig?: MaskConfig,
  layoutMode?: LayoutMode,
  mapSegment?: MapSegmentState,
  mapDetection?: MapPanelDetectionResult | null
): Promise<ExportResult> {
  const isVideoSegment = Boolean(
    mapSegment &&
    mapSegment.mode === 'video' &&
    mapSegment.videoElement &&
    mapSegment.isVideoLoaded &&
    !mapSegment.videoError
  );

  const hasMotion =
    sceneMotionId !== 'none' ||
    stamps.some((s) => s.motionId !== 'none') ||
    (maskConfig && maskConfig.type !== 'none') ||
    isVideoSegment;

  // Case 1: No motion -> Still image
  if (!hasMotion) {
    return exportStillImage(baseImage, stamps, sceneMotionId, quality, onProgress, maskConfig, layoutMode, mapSegment, mapDetection);
  }

  // Case 2: Motion exists & user explicitly requested GIF
  if (mode === 'gif') {
    return exportAnimatedGif(baseImage, stamps, sceneMotionId, false, undefined, quality, onProgress, maskConfig, layoutMode, mapSegment, mapDetection);
  }

  const supportedMime = getSupportedVideoMimeType();
  const testCanvas = document.createElement('canvas');
  const hasCaptureStream = isCaptureStreamSupported(testCanvas);

  // If user requested video or auto, check if MediaRecorder is viable
  if (hasCaptureStream && supportedMime) {
    try {
      return await exportVideoMediaRecorder(baseImage, stamps, supportedMime, sceneMotionId, quality, onProgress, maskConfig, layoutMode, mapSegment, mapDetection);
    } catch (err: any) {
      // If error is an explicit video seek failure, don't conceal it under GIF fallback; bubble up
      if (err.message && err.message.includes('シーク')) {
        throw err;
      }
      const reason = `MediaRecorder失敗 [${supportedMime}]: ${err.message || String(err)}`;
      console.warn('MediaRecorder export failed, falling back to Animated GIF:', reason);
      onProgress?.(20, '動画記録に失敗したため、GIFフォールバックを実行します…');
      return exportAnimatedGif(baseImage, stamps, sceneMotionId, true, reason, quality, onProgress, maskConfig, layoutMode, mapSegment, mapDetection);
    }
  }

  // Fallback to Animated GIF if captureStream or MIME is completely unsupported
  const reason = !hasCaptureStream
    ? 'ブラウザがcanvas.captureStreamをサポートしていません'
    : '利用可能な動画MIMEタイプ(MP4/WebM)が見つかりません';
  console.warn('Falling back to GIF:', reason);
  return exportAnimatedGif(baseImage, stamps, sceneMotionId, true, reason, quality, onProgress, maskConfig, layoutMode, mapSegment, mapDetection);
}

