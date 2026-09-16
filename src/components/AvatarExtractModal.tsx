/**
 * HEAL3 SNS-Creator - Avatar Extraction Modal & Segmentation Pipeline Inspector
 * 
 * Deep Debug & Verification Mode for MediaPipe InteractiveSegmenter (Magic Touch):
 * 1. Original Image
 * 2. Raw Confidence Mask (Unprocessed grayscale 0-255 from MediaPipe)
 * 3. Threshold Binary Mask (Strict 2-value 0 or 255 mask)
 * 4. Final Alpha Result (Transparent PNG applied to canvas)
 * 
 * Alpha Conversion Modes:
 * - A: Raw Confidence Alpha (Continuous confidence-weighted falloff, explains semi-transparency)
 * - B: Binary Threshold (Strict 255 inside, 0 outside. Completely opaque interior)
 * - C: Threshold + Edge Feather (Opaque 255 interior, anti-aliased feather on 1-3px boundary only)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X, Check, Scissors, MapPin, RefreshCw, Cpu, Layers,
  ZoomIn, Eye, Sliders, AlertCircle, LayoutGrid, Square, Sparkles,
  Info
} from 'lucide-react';
import { getAllAvatarAdapters, extractAvatarFromImage } from '../engine/avatarExtractor.ts';
import {
  AvatarExtractionEngineMode,
  AvatarExtractionResult,
  BaseImageState,
  AlphaConversionMode,
  MediaPipeDiagnosticReport,
} from '../engine/types.ts';
import { MediaPipeDiagnosticsPanel } from './MediaPipeDiagnosticsPanel.tsx';
import { runMediaPipeDiagnostics, getLatestDiagnosticReport } from '../engine/mediapipeDiagnostics.ts';

interface AvatarExtractModalProps {
  baseImageState: BaseImageState;
  onApplyExtractedAvatar: (result: AvatarExtractionResult) => void;
  onClose: () => void;
}

export const AvatarExtractModal: React.FC<AvatarExtractModalProps> = ({
  baseImageState,
  onApplyExtractedAvatar,
  onClose,
}) => {
  const adapters = getAllAvatarAdapters();
  const [engineMode, setEngineMode] = useState<AvatarExtractionEngineMode>('mediapipe');
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(adapters[0].id);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number }>(adapters[0].defaultCenter);
  
  // Quality & Threshold Isolation state
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.40);
  const [alphaMode, setAlphaMode] = useState<AlphaConversionMode>('binary_threshold');
  const [featherRadius, setFeatherRadius] = useState<number>(2);

  const [diagnosticReport, setDiagnosticReport] = useState<MediaPipeDiagnosticReport | null>(getLatestDiagnosticReport());
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractResult, setExtractResult] = useState<AvatarExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inspector View Modes:
  // 'grid': 4-Up simultaneous comparison (Original, Raw Mask, Binary Mask, Final Alpha)
  // 'tab': Single zoomed view with tab selection
  const [inspectorLayout, setInspectorLayout] = useState<'grid' | 'tab'>('grid');
  const [activeTab, setActiveTab] = useState<'final' | 'raw' | 'binary' | 'original'>('final');

  // Preview display controls
  const [previewZoom, setPreviewZoom] = useState<'fit' | 'zoom2x'>('fit');
  const [previewBg, setPreviewBg] = useState<'checker' | 'dark' | 'light'>('checker');

  const previewImageRef = useRef<HTMLImageElement | null>(null);

  const executeDiagnostics = async () => {
    setIsDiagnosing(true);
    setErrorMsg(null);
    try {
      const res = await runMediaPipeDiagnostics((step, rep) => {
        setDiagnosticReport({ ...rep });
      }, baseImageState.image);
      setDiagnosticReport(res.report);
      if (res.report.overallStatus === 'FAILED') {
        const err = res.report.errorSummary;
        setErrorMsg(`SEGMENTATION NOT AVAILABLE: STEP ${err?.failedStep} (${err?.failedStepName}) - ${err?.message}`);
      }
      return res;
    } finally {
      setIsDiagnosing(false);
    }
  };

  const runExtraction = async (
    point: { x: number; y: number },
    mode: AvatarExtractionEngineMode,
    thresh: number = confidenceThreshold,
    aMode: AlphaConversionMode = alphaMode,
    fRadius: number = featherRadius
  ) => {
    if (!baseImageState.image) {
      setErrorMsg('BASE画像が読み込まれていません');
      return;
    }

    if (diagnosticReport?.overallStatus === 'FAILED') {
      const err = diagnosticReport.errorSummary;
      setErrorMsg(`SEGMENTATION NOT AVAILABLE: STEP ${err?.failedStep} (${err?.failedStepName}) - ${err?.message}`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Allow UI thread to breathe
      await new Promise((r) => setTimeout(r, 16));

      const result = await extractAvatarFromImage(baseImageState.image, {
        engineMode: mode,
        adapterId: selectedAdapterId,
        focusPoint: point,
        confidenceThreshold: thresh,
        alphaMode: aMode,
        featherRadius: fRadius,
      });

      setExtractResult(result);
    } catch (err: any) {
      console.error('Avatar extraction error:', err);
      setErrorMsg(err?.message || 'セグメンテーション処理に失敗しました。');
      setDiagnosticReport(getLatestDiagnosticReport());
    } finally {
      setIsProcessing(false);
    }
  };

  // Initial trigger on mount: execute full 7-step diagnostics with live observability
  useEffect(() => {
    executeDiagnostics().then((diagRes) => {
      if (diagRes.report.overallStatus === 'SUCCESS' && baseImageState.image) {
        runExtraction(focusPoint, engineMode);
      }
    });
  }, []);

  // 1-Tap on BASE image triggers immediate focus update and extraction
  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewImageRef.current) return;
    const rect = previewImageRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (clientX >= 0 && clientX <= rect.width && clientY >= 0 && clientY <= rect.height) {
      const nx = Math.max(0.05, Math.min(0.95, clientX / rect.width));
      const ny = Math.max(0.05, Math.min(0.95, clientY / rect.height));
      const newPoint = { x: nx, y: ny };
      setFocusPoint(newPoint);
      // Run extraction immediately on 1-tap
      runExtraction(newPoint, engineMode, confidenceThreshold, alphaMode, featherRadius);
    }
  };

  // Immediate re-processing on threshold / alpha mode change
  const handleThresholdChange = (newThresh: number) => {
    setConfidenceThreshold(newThresh);
    runExtraction(focusPoint, engineMode, newThresh, alphaMode, featherRadius);
  };

  const handleAlphaModeChange = (newAlphaMode: AlphaConversionMode) => {
    setAlphaMode(newAlphaMode);
    runExtraction(focusPoint, engineMode, confidenceThreshold, newAlphaMode, featherRadius);
  };

  const handleFeatherChange = (newRadius: number) => {
    setFeatherRadius(newRadius);
    runExtraction(focusPoint, engineMode, confidenceThreshold, alphaMode, newRadius);
  };

  const handleUseItem = () => {
    if (extractResult) {
      onApplyExtractedAvatar(extractResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100">アバター切り抜き &amp; Segmentation検証</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  MediaPipe PoC
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                1タップ指定 ＋ Raw Mask / Threshold / Alpha 透過品質の徹底切り分け
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* MediaPipe Step-by-step Diagnostics & Observability */}
          <MediaPipeDiagnosticsPanel
            report={diagnosticReport}
            isRunning={isDiagnosing}
            onRerun={executeDiagnostics}
          />

          {/* 1-Tap Target Locator */}
          <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>アバターを1回タップ (タップ位置を基準に推論)</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                X: {Math.round(focusPoint.x * 100)}% / Y: {Math.round(focusPoint.y * 100)}%
              </span>
            </div>

            <div
              onClick={handleImageTap}
              className="relative w-full max-h-48 rounded-xl overflow-hidden bg-black/90 border border-zinc-800 flex items-center justify-center cursor-crosshair select-none touch-none shadow-inner"
            >
              {baseImageState.image && (
                <img
                  ref={previewImageRef}
                  src={baseImageState.image.src}
                  alt="Base Target"
                  className="max-h-48 object-contain pointer-events-none"
                />
              )}

              {/* Pin indicator at tap position */}
              <div
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 pointer-events-none transition-all duration-100 flex items-center justify-center"
                style={{
                  left: `${focusPoint.x * 100}%`,
                  top: `${focusPoint.y * 100}%`,
                }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-2 text-white font-medium text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>セグメンテーション推論中 (WASM)...</span>
                </div>
              )}
            </div>
            <p className="text-[9px] text-zinc-500 pl-0.5">
              ※ アバターの胸または腹部付近をタップしてください。即座に推論が走ります。
            </p>
          </div>

          {/* Alpha Conversion & Threshold Controls (The Core Test Bed) */}
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-indigo-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Alpha変換方式の比較検証 (A / B / C)</span>
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">
                即時プレビュー反映
              </span>
            </div>

            {/* 3 Alpha Conversion Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                onClick={() => handleAlphaModeChange('raw_confidence')}
                className={`p-2 rounded-lg text-left border transition flex flex-col justify-between ${
                  alphaMode === 'raw_confidence'
                    ? 'border-amber-500 bg-amber-950/50 text-amber-200 ring-1 ring-amber-500/40'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[10px]">A: Raw Confidence</span>
                  {alphaMode === 'raw_confidence' && <Check className="w-3 h-3 text-amber-400" />}
                </div>
                <span className="text-[9px] text-zinc-400 mt-1">
                  旧方式: 確率値に比例して半透明化
                </span>
                <span className="text-[8px] text-amber-400/80 font-mono mt-0.5">
                  ※外周・頭部・靴が薄くなる原因
                </span>
              </button>

              <button
                onClick={() => handleAlphaModeChange('binary_threshold')}
                className={`p-2 rounded-lg text-left border transition flex flex-col justify-between ${
                  alphaMode === 'binary_threshold'
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[10px]">B: Binary Threshold</span>
                  {alphaMode === 'binary_threshold' && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                <span className="text-[9px] text-zinc-400 mt-1">
                  内部完全不透明 (alpha 255)
                </span>
                <span className="text-[8px] text-emerald-400/80 font-mono mt-0.5">
                  ※頭・服・靴が絶対に透けない
                </span>
              </button>

              <button
                onClick={() => handleAlphaModeChange('threshold_feather')}
                className={`p-2 rounded-lg text-left border transition flex flex-col justify-between ${
                  alphaMode === 'threshold_feather'
                    ? 'border-cyan-500 bg-cyan-950/50 text-cyan-200 ring-1 ring-cyan-500/40'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[10px]">C: Threshold + Feather</span>
                  {alphaMode === 'threshold_feather' && <Check className="w-3 h-3 text-cyan-400" />}
                </div>
                <span className="text-[9px] text-zinc-400 mt-1">
                  内部255 ＋ 境界のみフェザー
                </span>
                <span className="text-[8px] text-cyan-400/80 font-mono mt-0.5">
                  ※輪郭1-3pxだけ滑らか
                </span>
              </button>
            </div>

            {/* Threshold Preset Buttons & Slider */}
            <div className="pt-1.5 border-t border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-300">
                  Confidence Threshold: <span className="text-emerald-400 font-mono">{confidenceThreshold.toFixed(2)}</span>
                </span>
                <div className="flex gap-1">
                  {[0.30, 0.40, 0.50, 0.60, 0.70].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleThresholdChange(val)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition ${
                        Math.abs(confidenceThreshold - val) < 0.01
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {val.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded-lg"
              />
            </div>

            {/* Feather Radius Setting (Only for Mode C) */}
            {alphaMode === 'threshold_feather' && (
              <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] text-zinc-300">
                  境界 Feather Radius (輪郭近傍のみ):
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleFeatherChange(r)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono transition ${
                        featherRadius === r
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {r} px
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 4-Way Debug Mask Inspector */}
          {extractResult && (
            <div className="p-3 rounded-xl bg-zinc-950/90 border border-emerald-500/50 space-y-2.5 animate-in fade-in duration-200 shadow-xl">
              {/* Toolbar: Layout & Background & Zoom */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>推論マスク検証 (4画面比較)</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {extractResult.width} × {extractResult.height} px
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Layout toggle (Grid vs Tab) */}
                  <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[9px]">
                    <button
                      onClick={() => setInspectorLayout('grid')}
                      className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
                        inspectorLayout === 'grid' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      <span>4分割</span>
                    </button>
                    <button
                      onClick={() => setInspectorLayout('tab')}
                      className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
                        inspectorLayout === 'tab' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      <Square className="w-3 h-3" />
                      <span>拡大タブ</span>
                    </button>
                  </div>

                  {/* Background toggle */}
                  <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[9px]">
                    <button
                      onClick={() => setPreviewBg('checker')}
                      className={`px-1.5 py-0.5 rounded transition ${previewBg === 'checker' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
                    >
                      市松
                    </button>
                    <button
                      onClick={() => setPreviewBg('dark')}
                      className={`px-1.5 py-0.5 rounded transition ${previewBg === 'dark' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                    >
                      暗
                    </button>
                    <button
                      onClick={() => setPreviewBg('light')}
                      className={`px-1.5 py-0.5 rounded transition ${previewBg === 'light' ? 'bg-zinc-200 text-zinc-900 font-semibold' : 'text-zinc-400'}`}
                    >
                      明
                    </button>
                  </div>
                </div>
              </div>

              {/* View Mode 1: 4-Up Grid View */}
              {inspectorLayout === 'grid' ? (
                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Original Image */}
                  <div className="bg-zinc-900/90 rounded-xl border border-zinc-800 p-2 flex flex-col items-center">
                    <span className="text-[10px] font-semibold text-zinc-300 mb-1 w-full text-left">
                      1. Original Image (元画像)
                    </span>
                    <div className="w-full h-36 rounded-lg bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-800">
                      {extractResult.originalUrl && (
                        <img
                          src={extractResult.originalUrl}
                          alt="Original Crop"
                          className="max-h-32 object-contain"
                        />
                      )}
                    </div>
                    <span className="text-[8px] text-zinc-500 mt-1">タップ対象周辺</span>
                  </div>

                  {/* 2. Raw Confidence Mask */}
                  <div className="bg-zinc-900/90 rounded-xl border border-zinc-800 p-2 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-semibold text-zinc-300">
                        2. Raw Confidence Mask
                      </span>
                      <span className="text-[8px] text-amber-400 font-mono">0-255 無加工</span>
                    </div>
                    <div className="w-full h-36 rounded-lg bg-black flex items-center justify-center overflow-hidden border border-zinc-800">
                      {extractResult.rawConfidenceMaskUrl && (
                        <img
                          src={extractResult.rawConfidenceMaskUrl}
                          alt="Raw Confidence Mask"
                          className="max-h-32 object-contain"
                        />
                      )}
                    </div>
                    <span className="text-[8px] text-zinc-400 mt-1">
                      MediaPipe生確率 (白=高 / 黒=低)
                    </span>
                  </div>

                  {/* 3. Threshold Binary Mask */}
                  <div className="bg-zinc-900/90 rounded-xl border border-zinc-800 p-2 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-semibold text-zinc-300">
                        3. Binary Mask (閾値 {confidenceThreshold.toFixed(2)})
                      </span>
                      <span className="text-[8px] text-emerald-400 font-mono">完全2値</span>
                    </div>
                    <div className="w-full h-36 rounded-lg bg-black flex items-center justify-center overflow-hidden border border-zinc-800">
                      {extractResult.thresholdBinaryMaskUrl && (
                        <img
                          src={extractResult.thresholdBinaryMaskUrl}
                          alt="Threshold Binary Mask"
                          className="max-h-32 object-contain"
                        />
                      )}
                    </div>
                    <span className="text-[8px] text-zinc-400 mt-1">
                      白=内部完全不透明 / 黒=背景
                    </span>
                  </div>

                  {/* 4. Final Alpha Result */}
                  <div className="bg-zinc-900/90 rounded-xl border border-emerald-500/60 p-2 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-semibold text-emerald-300">
                        4. Final Alpha Result
                      </span>
                      <span className="text-[8px] text-emerald-400 font-mono">
                        {alphaMode === 'binary_threshold' ? 'Mode B' : alphaMode === 'threshold_feather' ? 'Mode C' : 'Mode A'}
                      </span>
                    </div>
                    <div
                      className="w-full h-36 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800"
                      style={{
                        backgroundColor: previewBg === 'dark' ? '#09090b' : previewBg === 'light' ? '#f4f4f5' : '#121215',
                        backgroundImage: previewBg === 'checker'
                          ? `linear-gradient(45deg, #1f1f23 25%, transparent 25%), linear-gradient(-45deg, #1f1f23 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1f23 75%), linear-gradient(-45deg, transparent 75%, #1f1f23 75%)`
                          : 'none',
                        backgroundSize: '12px 12px',
                      }}
                    >
                      <img
                        src={extractResult.finalAlphaResultUrl || extractResult.dataUrl}
                        alt="Final Alpha Result"
                        className="max-h-32 object-contain drop-shadow-md"
                      />
                    </div>
                    <span className="text-[8px] text-emerald-300/80 mt-1 font-medium">
                      透過PNG出力結果
                    </span>
                  </div>
                </div>
              ) : (
                /* View Mode 2: Single Tabbed Zoom View */
                <div className="space-y-2">
                  {/* Tab Selector */}
                  <div className="flex border-b border-zinc-800 gap-1 pb-1">
                    <button
                      onClick={() => setActiveTab('final')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                        activeTab === 'final'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      4. Final Alpha Result
                    </button>
                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                        activeTab === 'raw'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      2. Raw Confidence Mask
                    </button>
                    <button
                      onClick={() => setActiveTab('binary')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                        activeTab === 'binary'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      3. Binary Mask
                    </button>
                    <button
                      onClick={() => setActiveTab('original')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                        activeTab === 'original'
                          ? 'bg-zinc-700 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      1. Original
                    </button>
                  </div>

                  {/* Single Zoomed Display */}
                  <div
                    className="w-full h-72 rounded-xl flex items-center justify-center overflow-auto border border-zinc-800 transition-all"
                    style={{
                      backgroundColor: previewBg === 'dark' ? '#09090b' : previewBg === 'light' ? '#f4f4f5' : '#121215',
                      backgroundImage: previewBg === 'checker'
                        ? `linear-gradient(45deg, #1f1f23 25%, transparent 25%), linear-gradient(-45deg, #1f1f23 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1f23 75%), linear-gradient(-45deg, transparent 75%, #1f1f23 75%)`
                        : 'none',
                      backgroundSize: '16px 16px',
                    }}
                  >
                    <img
                      src={
                        activeTab === 'final'
                          ? extractResult.finalAlphaResultUrl || extractResult.dataUrl
                          : activeTab === 'raw'
                          ? extractResult.rawConfidenceMaskUrl
                          : activeTab === 'binary'
                          ? extractResult.thresholdBinaryMaskUrl
                          : extractResult.originalUrl
                      }
                      alt={activeTab}
                      className="max-h-64 object-contain drop-shadow-md"
                    />
                  </div>
                </div>
              )}

              {/* Quality Analysis Findings Card */}
              <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 text-[9px] text-zinc-300 space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>品質検証の着眼点:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 text-zinc-400">
                  <div>
                    <span className="text-zinc-200 font-semibold">・Raw Confidence Mask:</span>
                    <span> 人物頭部や足元まで白色（確率高）で認識されているか</span>
                  </div>
                  <div>
                    <span className="text-zinc-200 font-semibold">・Binary Threshold:</span>
                    <span> 内部が完全に255（不透明）になり透けが解消されるか</span>
                  </div>
                  <div>
                    <span className="text-zinc-200 font-semibold">・閾値 (0.30 - 0.70):</span>
                    <span> 服の外周・髪・靴が最も自然に残る閾値を確認</span>
                  </div>
                  <div>
                    <span className="text-zinc-200 font-semibold">・Edge Feather:</span>
                    <span> 境界1-2pxのみのフェザーでジャギが解消されるか</span>
                  </div>
                </div>
              </div>

              {/* Apply as Foreground Item Button */}
              <button
                onClick={handleUseItem}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 flex items-center justify-center gap-2 transition font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Foreground Item としてキャンバスに追加</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
