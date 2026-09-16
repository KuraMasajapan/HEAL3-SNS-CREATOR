/**
 * HEAL3 SNS-Creator - Developer & Technical Verification Panel
 * 
 * Displays real-time device metrics, canvas resolutions, pipeline stats,
 * and export technical diagnostics required by the PoC specification.
 */

import { X, RefreshCw, Smartphone, Gauge, Film, CheckCircle, Cpu, AlertTriangle, Sliders, Check } from 'lucide-react';
import { DeveloperInfoData } from '../engine/types.ts';
import { PreferredExportMode } from '../engine/exporter.ts';
import { ExportQuality, QUALITY_PRESETS } from '../engine/config.ts';

interface DeveloperInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  devInfo: DeveloperInfoData;
  preferredMode: PreferredExportMode;
  onSelectPreferredMode: (mode: PreferredExportMode) => void;
  exportQuality: ExportQuality;
  onSelectExportQuality: (quality: ExportQuality) => void;
  onRefreshMetrics: () => void;
}

export default function DeveloperInfoModal({
  isOpen,
  onClose,
  devInfo,
  preferredMode,
  onSelectPreferredMode,
  exportQuality,
  onSelectExportQuality,
  onRefreshMetrics,
}: DeveloperInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="dev-info-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border-t sm:border border-neutral-700 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-1.5">
              Technical Verification Diagnostics
              <span className="text-[10px] text-neutral-400 font-mono">(実機検証用)</span>
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshMetrics}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
              title="メトリクス再計測"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs font-mono">
          {/* Device & Browser */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px] uppercase tracking-wider font-sans">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Device & Viewport Metrics</span>
            </div>
            <div className="space-y-1 text-neutral-300">
              <div className="pb-1 border-b border-neutral-800/60 flex items-center justify-between">
                <span className="text-neutral-500 text-[10px]">Device / Browser</span>
                <span className="font-semibold text-sky-300 text-[11px] truncate max-w-[240px]">
                  {devInfo.deviceBrowserInfo || 'Browser'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Viewport Size</span>
                  <span className="font-semibold text-neutral-200">
                    {devInfo.viewportWidth} × {devInfo.viewportHeight}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">devicePixelRatio</span>
                  <span className="font-semibold text-neutral-200">
                    {devInfo.devicePixelRatio.toFixed(2)}x
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Visual Viewport Scale</span>
                  <span className="font-semibold text-neutral-200">
                    {devInfo.visualViewportScale.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Preview FPS (Live)</span>
                  <span
                    className={`font-semibold ${
                      devInfo.fps >= 50 ? 'text-emerald-400' : devInfo.fps >= 30 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {devInfo.fps} FPS
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Export Quality Test (PoC検証専用) */}
          <div className="bg-neutral-950/70 border border-sky-800/50 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px] uppercase tracking-wider font-sans">
                <Sliders className="w-3.5 h-3.5" />
                <span>Export Quality Test (画質検証)</span>
              </div>
              <span className="text-[10px] text-sky-300 font-mono">
                選択中: {exportQuality === 'high' ? 'High' : 'Current'}
              </span>
            </div>

            {/* Quality Select Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectExportQuality('current')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
                  exportQuality === 'current'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-200 ring-1 ring-sky-500/50'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    Current (既存)
                  </span>
                  {exportQuality === 'current' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-[11px] font-semibold text-neutral-200">450 × 800 px</div>
                <div className="text-[10px] text-sky-300 font-mono">3.0 Mbps (Bitrate)</div>
                <div className="text-[9px] text-neutral-400 font-sans leading-tight">
                  既存の軽量・高速出力。実機負荷最小。
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectExportQuality('high')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
                  exportQuality === 'high'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-200 ring-1 ring-sky-500/50'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] flex items-center gap-1 text-emerald-400">
                    High (検証用)
                  </span>
                  {exportQuality === 'high' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-[11px] font-semibold text-neutral-200">720 × 1280 px</div>
                <div className="text-[10px] text-emerald-400 font-mono">6.0 Mbps (Bitrate)</div>
                <div className="text-[9px] text-neutral-400 font-sans leading-tight">
                  元画像サイズ維持。顔・文字が高精細。
                </div>
              </button>
            </div>

            <p className="text-[10px] text-neutral-400 font-sans leading-relaxed pt-0.5">
              ※ 次回の「完成」タップ時、選択された解像度とビットレートで動画エンコードが実行されます。
            </p>
          </div>

          {/* Canvas & Image Pipeline */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] uppercase tracking-wider font-sans">
              <Gauge className="w-3.5 h-3.5" />
              <span>Canvas & Image Resolutions</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[10px]">Canvas Buffer</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.canvasBufferWidth} × {devInfo.canvasBufferHeight} px
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Canvas Display (CSS)</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.canvasDisplayWidth} × {devInfo.canvasDisplayHeight} px
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">BASE Original Size</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.baseOriginalWidth} × {devInfo.baseOriginalHeight} px
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">BASE Processed (PoC Cap)</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.baseProcessedWidth} × {devInfo.baseProcessedHeight} px
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Active Stamp Count</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.stampCount} items
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Coordinate System</span>
                <span className="font-semibold text-emerald-300">
                  Normalized (0.0〜1.0)
                </span>
              </div>
            </div>
          </div>

          {/* Export Diagnostics */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-[11px] uppercase tracking-wider font-sans">
                <Film className="w-3.5 h-3.5" />
                <span>Export Diagnostics</span>
              </div>

              {/* Mode selection toggle */}
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-700">
                {(['auto', 'video', 'gif'] as PreferredExportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onSelectPreferredMode(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                      preferredMode === m
                        ? 'bg-purple-600 text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {m === 'auto' ? 'Auto' : m === 'video' ? 'Video' : 'GIF'}
                  </button>
                ))}
              </div>
            </div>

            {/* Prominent GIF Fallback Warning if triggered */}
            {devInfo.isGifFallback ? (
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-2 text-amber-300 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>GIF FALLBACK: YES</span>
                </div>
                <div className="text-[10px] text-amber-200/90 font-mono">
                  理由: {devInfo.gifFallbackReason || '動画エンコーダー非対応またはストリーム失敗'}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1 px-2 rounded bg-neutral-900 border border-neutral-800 text-[11px]">
                <span className="text-neutral-400">GIF fallback:</span>
                <span className="font-semibold text-emerald-400">
                  {devInfo.exportMethod ? 'NO (Standard Video / Native)' : '未実行 (待機中)'}
                </span>
              </div>
            )}

            {/* Diagnostics comparison grid */}
            <div className="grid grid-cols-2 gap-2 text-neutral-300 pt-1">
              <div>
                <span className="text-neutral-500 block text-[10px]">Export Quality</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.exportQuality === 'high' ? 'High (720×1280)' : 'Current (450×800)'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Requested Video Bitrate</span>
                <span className="font-semibold text-sky-300">
                  {devInfo.requestedBitrate || QUALITY_PRESETS[exportQuality].bitrateLabel}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Output Resolution</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.outputResolution || '未実行'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Preview FPS (Live)</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.fps} FPS
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Export FPS</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.exportFps !== null ? `${devInfo.exportFps} FPS` : '未実行'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Export Duration</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.exportTimeMs !== null ? `${devInfo.exportTimeMs} ms` : '未実行'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Output File Size</span>
                <span className="font-semibold text-neutral-200">
                  {devInfo.exportFileSize || '未実行'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">MIME Type</span>
                <span className="font-semibold text-neutral-200 truncate block">
                  {devInfo.exportMimeType || '未実行'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500 block text-[10px]">Codec / Export Method</span>
                <span className="font-semibold text-neutral-200 break-all">
                  {devInfo.exportMethod || '未実行'}
                </span>
              </div>
            </div>
          </div>

          {/* WebCodecs & Future Video Tech Status */}
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px] uppercase tracking-wider font-sans">
              <Cpu className="w-3.5 h-3.5" />
              <span>Next-Gen Video Architecture (WebCodecs)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[10px]">WebCodecs available</span>
                <span
                  className={`font-semibold ${
                    devInfo.webCodecsAvailable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {devInfo.webCodecsAvailable ? 'YES (VideoEncoder)' : 'NO'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">H.264 (avc1) Hardware</span>
                <span
                  className={`font-semibold ${
                    devInfo.webCodecsH264Available ? 'text-emerald-400' : 'text-neutral-500'
                  }`}
                >
                  {devInfo.webCodecsH264Available ? 'YES (Config OK)' : 'NO / Unsupported'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans leading-relaxed pt-1 border-t border-neutral-800/60">
              ※ 将来の本命技術。WebCodecs対応端末では高速ハードウェアエンコードが可能ですが、MP4コンテナ生成用のMuxerモジュール（約300行）が追加で必要となります。
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-800/40 text-neutral-400 text-[11px] font-sans flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              表示Canvasと書き出しCanvasは完全分離されており、書き出し中も画面のプレビューは60FPSを維持します。
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-neutral-800 bg-neutral-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
