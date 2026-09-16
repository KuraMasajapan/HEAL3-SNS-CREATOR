/**
 * HEAL3 SNS-Creator - Avatar Extraction Modal (PoC)
 * 
 * Allows users to extract the avatar from their BASE image and convert it into
 * a native Foreground Item without destroying or altering the original BASE image.
 */

import React, { useState, useRef } from 'react';
import { X, Sparkles, Check, Scissors, MapPin, RefreshCw } from 'lucide-react';
import { getAllAvatarAdapters, extractAvatarFromImage } from '../engine/avatarExtractor.ts';
import { AvatarExtractionResult, BaseImageState } from '../engine/types.ts';

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
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(adapters[0].id);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.52 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractResult, setExtractResult] = useState<AvatarExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewImageRef = useRef<HTMLImageElement | null>(null);

  // Handle tap on the base image preview to set focus point
  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewImageRef.current) return;
    const rect = previewImageRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (clientX >= 0 && clientX <= rect.width && clientY >= 0 && clientY <= rect.height) {
      const nx = Math.max(0.05, Math.min(0.95, clientX / rect.width));
      const ny = Math.max(0.05, Math.min(0.95, clientY / rect.height));
      setFocusPoint({ x: nx, y: ny });
      setExtractResult(null); // Reset preview so user re-extracts with new point
    }
  };

  const handleExtract = async () => {
    if (!baseImageState.image) {
      setErrorMsg('BASE画像が読み込まれていません');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Small yield to let React render processing spinner
      await new Promise((r) => setTimeout(r, 40));

      const result = await extractAvatarFromImage(baseImageState.image, {
        adapterId: selectedAdapterId,
        focusPoint,
        toleranceMultiplier: 1.0,
      });

      setExtractResult(result);
    } catch (err: any) {
      console.error('Avatar extraction error:', err);
      setErrorMsg(err?.message || '切り抜き処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseItem = () => {
    if (extractResult) {
      onApplyExtractedAvatar(extractResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">アバター切り抜き (PoC)</h2>
              <p className="text-[10px] text-zinc-400">BASE画像内のアバターを透過Foreground Item化</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Adapter Selection */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">
              アバタータイプ定義 (Avatar Adapter)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {adapters.map((ad) => {
                const isSelected = ad.id === selectedAdapterId;
                return (
                  <button
                    key={ad.id}
                    onClick={() => {
                      setSelectedAdapterId(ad.id);
                      setFocusPoint(ad.defaultCenter);
                      setExtractResult(null);
                    }}
                    className={`px-2.5 py-2 rounded-xl text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200'
                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-semibold text-[11px] truncate">{ad.nameJa}</span>
                    <span className="text-[9px] text-zinc-500 line-clamp-1 mt-0.5">{ad.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Location Tap Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-zinc-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>アバター位置指定 (タップして中心を調整)</span>
              </span>
              <span className="text-[10px] text-zinc-400">
                X: {Math.round(focusPoint.x * 100)}% / Y: {Math.round(focusPoint.y * 100)}%
              </span>
            </div>

            <div
              onClick={handleImageTap}
              className="relative w-full max-h-56 rounded-xl overflow-hidden bg-black/60 border border-zinc-800 flex items-center justify-center cursor-crosshair select-none touch-none"
            >
              {baseImageState.image && (
                <img
                  ref={previewImageRef}
                  src={baseImageState.image.src}
                  alt="Base Target"
                  className="max-h-56 object-contain pointer-events-none"
                />
              )}

              {/* Focus target reticle pin */}
              <div
                className="absolute w-6 h-6 -ml-3 -mt-3 pointer-events-none transition-all duration-75 flex items-center justify-center"
                style={{
                  left: `${focusPoint.x * 100}%`,
                  top: `${focusPoint.y * 100}%`,
                }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                <div className="w-4 h-4 rounded-full bg-emerald-500/80 border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Action: Extract Button */}
          <div className="flex gap-2">
            <button
              onClick={handleExtract}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-950/40"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>切り抜き処理中 (Safari最適化)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>切り抜きを実行</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Extracted Preview Area */}
          {extractResult && (
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>切り抜き完了 ({extractResult.extractionTimeMs} ms)</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  {extractResult.width} × {extractResult.height} px
                </span>
              </div>

              {/* Transparent checkerboard preview */}
              <div
                className="w-full h-40 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800"
                style={{
                  backgroundImage: `linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)`,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#09090b',
                }}
              >
                <img
                  src={extractResult.dataUrl}
                  alt="Extracted Avatar"
                  className="max-h-36 object-contain drop-shadow-md"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
                <span>エンジン: クライアント内 Hybrid Adapter</span>
                <span>メモリ/モデル: 0 MB (即座に動作)</span>
              </div>

              <button
                onClick={handleUseItem}
                className="w-full py-2.5 px-4 rounded-xl font-medium bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 flex items-center justify-center gap-2 transition font-semibold shadow-lg shadow-emerald-500/20"
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
