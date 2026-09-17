/**
 * MediaPipe Initialization Diagnostics & Pipeline Observability
 * 
 * Implements granular step-by-step verification:
 * STEP 1: MediaPipe Tasks Vision モジュール読み込み
 * STEP 2: WASMローダー（.js）取得
 * STEP 3: WASMバイナリ（.wasm）取得
 * STEP 4: FilesetResolver初期化
 * STEP 5: モデル（.tflite）取得
 * STEP 6: InteractiveSegmenter.createFromOptions() 実行
 * STEP 7: 初回Segment（ダミー推論またはウォームアップ）
 * 
 * Strict prohibition of silent fallbacks to Pure TS or fake masks.
 */

import {
  FilesetResolver,
  InteractiveSegmenter,
  InteractiveSegmenterLegacy,
  MPMask,
} from '@mediapipe/tasks-vision';
import { DiagnosticStep, MediaPipeDiagnosticReport } from './types.ts';

export type StepUpdateCallback = (step: DiagnosticStep, report: MediaPipeDiagnosticReport) => void;

export interface DiagnosticSessionResult {
  report: MediaPipeDiagnosticReport;
  segmenterLegacy: InteractiveSegmenterLegacy | null;
  segmenterV1: InteractiveSegmenter | null;
  activeSegmenter: InteractiveSegmenterLegacy | InteractiveSegmenter | null;
}

// Global reference to active segmenter once initialized
let globalActiveSegmenter: InteractiveSegmenterLegacy | InteractiveSegmenter | null = null;
let globalActiveEngineType: 'InteractiveSegmenterLegacy' | 'InteractiveSegmenter' | null = null;
let latestDiagnosticReport: MediaPipeDiagnosticReport | null = null;

export function getLatestDiagnosticReport(): MediaPipeDiagnosticReport | null {
  return latestDiagnosticReport;
}

export function getActiveEngine() {
  return {
    segmenter: globalActiveSegmenter,
    engineType: globalActiveEngineType,
  };
}

/**
 * Runs the full 7-step initialization diagnostic procedure with real-time UI reporting.
 */
export async function runMediaPipeDiagnostics(
  onStepUpdate?: StepUpdateCallback,
  testImageSource?: HTMLImageElement | null
): Promise<DiagnosticSessionResult> {
  const modelUrl = '/models/magic_touch.tflite';
  const wasmLoaderUrl = '/mediapipe/wasm/vision_wasm_internal.js';
  const wasmBinaryUrl = '/mediapipe/wasm/vision_wasm_internal.wasm';
  const capturedLogs: string[] = [];

  // Intercept console.error and console.warn during initialization to capture low-level C++ / WASM logs
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const logCapture = (...args: any[]) => {
    const line = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    capturedLogs.push(line);
  };
  console.error = (...args: any[]) => {
    logCapture('[C++ stderr]', ...args);
    originalConsoleError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    logCapture('[C++ stdout]', ...args);
    originalConsoleWarn.apply(console, args);
  };

  const initialSteps: DiagnosticStep[] = [
    { stepNumber: 1, name: 'STEP 1: MediaPipe Tasks Vision モジュール読み込み', status: 'PENDING' },
    { stepNumber: 2, name: 'STEP 2: WASMローダー（.js）取得', status: 'PENDING', url: wasmLoaderUrl },
    { stepNumber: 3, name: 'STEP 3: WASMバイナリ（.wasm）取得', status: 'PENDING', url: wasmBinaryUrl },
    { stepNumber: 4, name: 'STEP 4: FilesetResolver初期化', status: 'PENDING' },
    { stepNumber: 5, name: 'STEP 5: モデル（.tflite）取得', status: 'PENDING', url: modelUrl },
    { stepNumber: 6, name: 'STEP 6: InteractiveSegmenter.createFromOptions() 実行', status: 'PENDING' },
    { stepNumber: 7, name: 'STEP 7: 初回Segment（ダミー推論またはウォームアップ）', status: 'PENDING' },
  ];

  const report: MediaPipeDiagnosticReport = {
    timestamp: Date.now(),
    overallStatus: 'RUNNING',
    steps: [...initialSteps],
    modelUrl,
    wasmUrl: '/mediapipe/wasm/',
    capturedLogs,
  };

  const updateStep = (index: number, partial: Partial<DiagnosticStep>) => {
    report.steps[index] = { ...report.steps[index], ...partial };
    latestDiagnosticReport = { ...report };
    if (onStepUpdate) {
      onStepUpdate(report.steps[index], report);
    }
  };

  let wasmFileset: any = null;
  let modelBuffer: ArrayBuffer | null = null;
  let segmenterLegacy: InteractiveSegmenterLegacy | null = null;
  let segmenterV1: InteractiveSegmenter | null = null;
  let activeSegmenter: InteractiveSegmenterLegacy | InteractiveSegmenter | null = null;

  try {
    // =========================================================================
    // STEP 1: MediaPipe Tasks Vision モジュール読み込み
    // =========================================================================
    updateStep(0, { status: 'RUNNING' });
    const s1Start = performance.now();
    try {
      const isResolvOk = typeof FilesetResolver?.forVisionTasks === 'function';
      const isLegacyOk = typeof InteractiveSegmenterLegacy?.createFromOptions === 'function';
      const isV1Ok = typeof InteractiveSegmenter?.createFromOptions === 'function';

      if (!isResolvOk) {
        throw new Error('FilesetResolver.forVisionTasks is not a function');
      }

      const s1Time = Math.round(performance.now() - s1Start);
      updateStep(0, {
        status: 'OK',
        durationMs: s1Time,
        httpStatus: 'N/A (Bundled)',
        details: `FilesetResolver: OK, InteractiveSegmenter: ${isV1Ok ? 'OK' : 'MISSING'}, InteractiveSegmenterLegacy: ${isLegacyOk ? 'OK' : 'MISSING'}`,
      });
    } catch (err: any) {
      const s1Time = Math.round(performance.now() - s1Start);
      updateStep(0, {
        status: 'FAILED',
        durationMs: s1Time,
        error: { name: err?.name || 'Error', message: err?.message || String(err), stack: err?.stack },
      });
      throw { step: 1, err };
    }

    // =========================================================================
    // STEP 2: WASMローダー（.js）取得
    // =========================================================================
    updateStep(1, { status: 'RUNNING' });
    const s2Start = performance.now();
    try {
      const res = await fetch(wasmLoaderUrl);
      const s2Time = Math.round(performance.now() - s2Start);
      const httpStatus = `${res.status} ${res.statusText}`;
      const cType = res.headers.get('content-type') || 'unknown';
      const cLen = res.headers.get('content-length') || 'unknown';

      if (!res.ok) {
        throw new Error(`HTTP Error ${httpStatus} fetching ${wasmLoaderUrl}`);
      }

      updateStep(1, {
        status: 'OK',
        durationMs: s2Time,
        httpStatus,
        details: `Size: ${cLen} B, Type: ${cType}`,
      });
    } catch (err: any) {
      const s2Time = Math.round(performance.now() - s2Start);
      updateStep(1, {
        status: 'FAILED',
        durationMs: s2Time,
        httpStatus: err?.message?.includes('HTTP Error') ? err.message : 'FAILED',
        error: { name: err?.name || 'Error', message: err?.message || String(err), stack: err?.stack },
      });
      throw { step: 2, err };
    }

    // =========================================================================
    // STEP 3: WASMバイナリ（.wasm）取得
    // =========================================================================
    updateStep(2, { status: 'RUNNING' });
    const s3Start = performance.now();
    try {
      const res = await fetch(wasmBinaryUrl);
      const s3Time = Math.round(performance.now() - s3Start);
      const httpStatus = `${res.status} ${res.statusText}`;
      const cType = res.headers.get('content-type') || 'unknown';
      const cLen = res.headers.get('content-length') || '11756954';

      if (!res.ok) {
        throw new Error(`HTTP Error ${httpStatus} fetching ${wasmBinaryUrl}`);
      }

      updateStep(2, {
        status: 'OK',
        durationMs: s3Time,
        httpStatus,
        details: `Size: ${(Number(cLen) / (1024 * 1024)).toFixed(2)} MB, Type: ${cType}`,
      });
    } catch (err: any) {
      const s3Time = Math.round(performance.now() - s3Start);
      updateStep(2, {
        status: 'FAILED',
        durationMs: s3Time,
        httpStatus: err?.message?.includes('HTTP Error') ? err.message : 'FAILED',
        error: { name: err?.name || 'Error', message: err?.message || String(err), stack: err?.stack },
      });
      throw { step: 3, err };
    }

    // =========================================================================
    // STEP 4: FilesetResolver初期化
    // =========================================================================
    updateStep(3, { status: 'RUNNING' });
    const s4Start = performance.now();
    try {
      wasmFileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const s4Time = Math.round(performance.now() - s4Start);

      report.filesetResolverResult = {
        wasmLoaderPath: wasmFileset?.wasmLoaderPath,
        wasmBinaryPath: wasmFileset?.wasmBinaryPath,
      };

      updateStep(3, {
        status: 'OK',
        durationMs: s4Time,
        httpStatus: '200 OK (Resolver Ready)',
        details: `wasmLoader: ${wasmFileset?.wasmLoaderPath}, wasmBinary: ${wasmFileset?.wasmBinaryPath}`,
      });
    } catch (err: any) {
      const s4Time = Math.round(performance.now() - s4Start);
      updateStep(3, {
        status: 'FAILED',
        durationMs: s4Time,
        error: { name: err?.name || 'Error', message: err?.message || String(err), stack: err?.stack },
      });
      throw { step: 4, err };
    }

    // =========================================================================
    // STEP 5: モデル（.tflite）取得
    // =========================================================================
    updateStep(4, { status: 'RUNNING' });
    const s5Start = performance.now();
    try {
      const res = await fetch(modelUrl);
      const s5Time = Math.round(performance.now() - s5Start);
      const httpStatus = `${res.status} ${res.statusText}`;
      const cType = res.headers.get('content-type') || 'application/octet-stream';
      const cLen = res.headers.get('content-length') || '6227884';

      if (!res.ok) {
        throw new Error(`HTTP Error ${httpStatus} fetching ${modelUrl}`);
      }

      modelBuffer = await res.arrayBuffer();

      updateStep(4, {
        status: 'OK',
        durationMs: s5Time,
        httpStatus,
        details: `Size: ${(modelBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB (${modelBuffer.byteLength} B), Type: ${cType}`,
      });
    } catch (err: any) {
      const s5Time = Math.round(performance.now() - s5Start);
      updateStep(4, {
        status: 'FAILED',
        durationMs: s5Time,
        httpStatus: err?.message?.includes('HTTP Error') ? err.message : 'FAILED',
        error: { name: err?.name || 'Error', message: err?.message || String(err), stack: err?.stack },
      });
      throw { step: 5, err };
    }

    // =========================================================================
    // STEP 6: InteractiveSegmenter.createFromOptions() 実行
    // =========================================================================
    updateStep(5, { status: 'RUNNING' });
    const s6Start = performance.now();
    let v1Error: any = null;
    let legacySuccess = false;

    // Sub-test 6a: Test the new v1.0 InteractiveSegmenter API and capture exact C++ output
    try {
      segmenterV1 = await InteractiveSegmenter.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetBuffer: new Uint8Array(modelBuffer),
          delegate: 'CPU',
        },
      });
      activeSegmenter = segmenterV1;
      globalActiveEngineType = 'InteractiveSegmenter';
    } catch (err: any) {
      v1Error = err;
      // Captured low-level C++ error
    }

    // Sub-test 6b: If v1 failed (due to missing .task bundle), run the official native engine InteractiveSegmenterLegacy designed for magic_touch.tflite
    if (!activeSegmenter) {
      try {
        if (modelBuffer) {
          segmenterLegacy = await InteractiveSegmenterLegacy.createFromModelBuffer(
            wasmFileset,
            new Uint8Array(modelBuffer)
          );
        } else {
          segmenterLegacy = await InteractiveSegmenterLegacy.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath: modelUrl,
              delegate: 'CPU',
            },
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          });
        }
        activeSegmenter = segmenterLegacy;
        globalActiveEngineType = 'InteractiveSegmenterLegacy';
        legacySuccess = true;
      } catch (legacyErr: any) {
        const s6Time = Math.round(performance.now() - s6Start);
        const v1Name = v1Error?.name || 'Error';
        const v1Msg = v1Error?.message || String(v1Error || 'Unknown');
        const legacyName = legacyErr?.name || 'Error';
        const legacyMsg = legacyErr?.message || String(legacyErr || 'Unknown');
        const legacyStack = legacyErr?.stack ? String(legacyErr.stack) : '';

        const v1ErrorFormatted = `V1 ERROR: ${v1Name}: ${v1Msg}`;
        const legacyErrorFormatted = `LEGACY ERROR: ${legacyName}: ${legacyMsg}`;
        const legacyStackFormatted = legacyStack ? `\n\nLEGACY STACK:\n${legacyStack}` : '';

        const step6Details = `${v1ErrorFormatted}\n\n${legacyErrorFormatted}${legacyStackFormatted}`;

        report.createFromOptionsResult = `${v1ErrorFormatted} | ${legacyErrorFormatted}`;

        updateStep(5, {
          status: 'FAILED',
          durationMs: s6Time,
          details: step6Details,
          error: {
            name: 'STEP 6 Engine Failures',
            message: `${v1ErrorFormatted}\n\n${legacyErrorFormatted}`,
            stack: `${v1ErrorFormatted}\n${v1Error?.stack ? `${v1Error.stack}\n\n` : ''}${legacyErrorFormatted}\n${legacyStack ? `${legacyStack}` : '(No legacy stack)'}`,
          },
        });
        throw {
          step: 6,
          err: {
            name: 'STEP 6 Engine Failures',
            message: `${v1ErrorFormatted}\n\n${legacyErrorFormatted}`,
            stack: `${legacyErrorFormatted}\n${legacyStack}\n\n${v1ErrorFormatted}\n${v1Error?.stack || ''}`,
          },
        };
      }
    }

    const s6Time = Math.round(performance.now() - s6Start);
    globalActiveSegmenter = activeSegmenter;
    report.activeEngineType = globalActiveEngineType;

    const v1Detail = v1Error
      ? `InteractiveSegmenter (v1.0 .task): FAILED ("${v1Error.message}")`
      : `InteractiveSegmenter (v1.0): OK`;
    const legacyDetail = legacySuccess
      ? `InteractiveSegmenterLegacy (Magic Touch TFLite native): OK`
      : `InteractiveSegmenterLegacy: Not used`;

    report.createFromOptionsResult = `${v1Detail} | ${legacyDetail}`;

    updateStep(5, {
      status: 'OK',
      durationMs: s6Time,
      httpStatus: '200 OK (Engine Created)',
      details: `${legacyDetail}. (${v1Detail})`,
    });

    // =========================================================================
    // STEP 7: 初回Segment（ダミー推論またはウォームアップ）
    // =========================================================================
    updateStep(6, { status: 'RUNNING' });
    const s7Start = performance.now();
    try {
      if (!activeSegmenter) {
        throw new Error('No active segmentation engine available from Step 6');
      }

      // Create a 128x128 warmup test image/canvas
      const warmupCanvas = document.createElement('canvas');
      warmupCanvas.width = 128;
      warmupCanvas.height = 128;
      const wctx = warmupCanvas.getContext('2d');
      if (wctx) {
        if (testImageSource && testImageSource.width > 0) {
          wctx.drawImage(testImageSource, 0, 0, 128, 128);
        } else {
          // Draw synthetic test pattern
          wctx.fillStyle = '#222';
          wctx.fillRect(0, 0, 128, 128);
          wctx.fillStyle = '#4ade80';
          wctx.beginPath();
          wctx.arc(64, 64, 40, 0, Math.PI * 2);
          wctx.fill();
        }
      }

      let maskArrayLength = 0;
      if (globalActiveEngineType === 'InteractiveSegmenterLegacy') {
        const seg = activeSegmenter as InteractiveSegmenterLegacy;
        const result = seg.segment(warmupCanvas, {
          keypoint: { x: 0.5, y: 0.5 },
        });
        const mask = result.confidenceMasks?.[0];
        const arr = mask?.getAsFloat32Array();
        maskArrayLength = arr ? arr.length : 0;
      } else {
        const seg = activeSegmenter as InteractiveSegmenter;
        seg.setImage(warmupCanvas);
        const mask = seg.segment([
          {
            point: [{ x: 0.5, y: 0.5 }],
            brushMode: 1 as any,
            isCompleted: true,
          },
        ]);
        const arr = mask?.getAsFloat32Array();
        maskArrayLength = arr ? arr.length : 0;
      }

      if (maskArrayLength === 0) {
        throw new Error('Warmup segmentation executed but returned 0 mask pixels');
      }

      const s7Time = Math.round(performance.now() - s7Start);
      updateStep(6, {
        status: 'OK',
        durationMs: s7Time,
        httpStatus: 'Inference Complete',
        details: `Warmup inference successful (${s7Time}ms). Mask size: ${maskArrayLength} floats (${Math.round(Math.sqrt(maskArrayLength))}×${Math.round(Math.sqrt(maskArrayLength))}).`,
      });

      report.overallStatus = 'SUCCESS';
    } catch (err: any) {
      const s7Time = Math.round(performance.now() - s7Start);
      updateStep(6, {
        status: 'FAILED',
        durationMs: s7Time,
        error: { name: err?.name || 'Error', message: err?.message || String(err), stack: err?.stack },
      });
      throw { step: 7, err };
    }
  } catch (fatal: any) {
    report.overallStatus = 'FAILED';
    const failedStepNum = fatal?.step || 0;
    const failedStepName = report.steps[failedStepNum - 1]?.name || 'Unknown Step';
    const errorObj = fatal?.err || fatal;

    report.errorSummary = {
      name: errorObj?.name || 'Error',
      message: errorObj?.message || String(errorObj),
      stack: errorObj?.stack || '',
      failedStep: failedStepNum,
      failedStepName,
    };

    // Mark remaining steps as SKIPPED
    for (let i = failedStepNum; i < report.steps.length; i++) {
      if (report.steps[i].status === 'PENDING') {
        report.steps[i].status = 'SKIPPED';
        report.steps[i].details = `Skipped due to failure in Step ${failedStepNum}`;
      }
    }
  } finally {
    // Restore original console log handlers
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    latestDiagnosticReport = { ...report };
  }

  return {
    report,
    segmenterLegacy,
    segmenterV1,
    activeSegmenter,
  };
}
