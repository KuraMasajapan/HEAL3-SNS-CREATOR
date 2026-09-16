/**
 * HEAL3 SNS-Creator - Finished Artwork View & Background Export Controller
 * 
 * Non-blocking UI: Keeps playing the canvas animation smoothly while exporting.
 * Provides Save, Web Share API, and Back to Edit with Safari compatibility notes.
 */

import { useState } from 'react';
import { Download, Share2, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Info, AlertTriangle } from 'lucide-react';
import { ExportResult } from '../engine/types.ts';

interface FinishViewProps {
  isExporting: boolean;
  exportProgress: number;
  exportStatusText: string;
  exportResult: ExportResult | null;
  exportError: string | null;
  onBackToEdit: () => void;
  onRetryExport: () => void;
}

export default function FinishView({
  isExporting,
  exportProgress,
  exportStatusText,
  exportResult,
  exportError,
  onBackToEdit,
  onRetryExport,
}: FinishViewProps) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [showSafariNote, setShowSafariNote] = useState(false);

  // Handle Web Share API
  const handleShare = async () => {
    if (!exportResult) return;
    setShareStatus(null);

    try {
      const file = new File([exportResult.blob], exportResult.filename, {
        type: exportResult.mimeType,
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'HEAL3 SNS-Creator 作品',
          text: 'HEAL3 SNS-Creator で作成したモーション作品です。',
        });
        setShareStatus('共有シートを呼び出しました');
      } else if (navigator.share) {
        // Fallback share without files if file sharing isn't supported
        await navigator.share({
          title: 'HEAL3 SNS-Creator 作品',
          url: window.location.href,
        });
        setShareStatus('リンクを共有しました');
      } else {
        setShareStatus('このブラウザはWeb Share APIに対応していません。「保存」をご利用ください。');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setShareStatus(`共有エラー: ${err.message || '共有がキャンセルまたは失敗しました'}`);
      }
    }
  };

  // Handle Download / Save
  const handleDownload = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      {/* Small unobtrusive floating export indicator at top-right or top-left while exporting */}
      {isExporting && (
        <div
          id="exporting-badge"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/80 rounded-full px-3.5 py-1.5 shadow-xl flex items-center gap-2 text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-200"
        >
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span className="font-medium text-[11px] text-neutral-300">
            {exportStatusText || 'バックグラウンド書き出し中…'}
          </span>
          <span className="font-mono text-[10px] text-emerald-400 font-semibold">
            {exportProgress}%
          </span>
        </div>
      )}

      {/* Action bar at bottom once finished or while watching */}
      <div
        id="finish-action-bar"
        className="w-full bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-800/80 px-4 py-2.5 pb-safe z-30 shadow-2xl flex flex-col gap-2 flex-shrink-0 max-h-[46dvh] overflow-y-auto overscroll-contain"
      >
        {/* Error notification */}
        {exportError && (
          <div className="bg-rose-950/80 border border-rose-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{exportError}</span>
            </div>
            <button
              onClick={onRetryExport}
              className="px-2 py-1 bg-rose-800 text-white rounded font-medium text-[11px] ml-2"
            >
              再試行
            </button>
          </div>
        )}

        {/* GIF Fallback warning banner */}
        {exportResult?.isGifFallback && (
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-300 block">【検証警告】GIF FALLBACK が発動しました</span>
              <span className="text-[10px] text-amber-200/90 leading-tight block">
                {exportResult.fallbackReason || 'ブラウザの動画エンコーダー（MP4/WebM）が失敗したため、GIF方式で安全に出力しました。'}
              </span>
            </div>
          </div>
        )}

        {/* Share status toast */}
        {shareStatus && (
          <div className="text-center text-[11px] text-neutral-400 bg-neutral-800/90 py-1 px-2 rounded-lg border border-neutral-700">
            {shareStatus}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Back to Edit */}
          <button
            id="btn-back-to-edit"
            onClick={onBackToEdit}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>編集に戻る</span>
          </button>

          {/* If export completed, show Share and Save buttons */}
          {exportResult ? (
            <div className="flex items-center gap-2">
              {/* Web Share */}
              <button
                id="btn-share-result"
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 shadow-lg shadow-sky-500/20 transition active:scale-95"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>共有 (SNS)</span>
              </button>

              {/* Save / Download */}
              <button
                id="btn-save-result"
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>保存</span>
              </button>
            </div>
          ) : isExporting ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400 px-3 py-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>書き出し処理中…</span>
            </div>
          ) : null}
        </div>

        {/* Export summary & Safari compatibility toggle */}
        {exportResult && (
          <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-mono text-neutral-300">
                {exportResult.width}×{exportResult.height} ({(exportResult.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <button
              onClick={() => setShowSafariNote(!showSafariNote)}
              className="flex items-center gap-1 text-[10px] text-sky-400 hover:underline"
            >
              <Info className="w-3 h-3" />
              <span>Safari保存仕様について</span>
            </button>
          </div>
        )}

        {/* Safari explanation note drawer */}
        {showSafariNote && (
          <div className="mt-1 bg-neutral-950/80 border border-neutral-800 rounded-lg p-2.5 text-[11px] text-neutral-300 leading-relaxed">
            <p className="font-semibold text-neutral-200 mb-1">【iOS Safariでの保存・共有仕様】</p>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[10px]">
              <li>
                <strong>Web Share API（共有）:</strong> iOS
                Safariのネイティブ共有シートを呼び出します。「画像を保存」「Instagram」「X」等へ1タップで直接転送可能です。
              </li>
              <li>
                <strong>写真ライブラリへの直接書き込み:</strong> ブラウザサンドボックスセキュリティの制約上、Webページから端末の「写真（カメラロール）」へ確認ダイアログなしで直接書き込む標準APIは存在しません。
              </li>
              <li>
                <strong>保存（ダウンロード）:</strong> ファイルダウンロードとしてSafariの「ダウンロード」フォルダに保存されます。
              </li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
