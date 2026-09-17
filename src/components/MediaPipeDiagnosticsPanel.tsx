import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { MediaPipeDiagnosticReport, DiagnosticStep } from '../engine/types.ts';

interface Props {
  report: MediaPipeDiagnosticReport | null;
  isRunning: boolean;
  onRerun: () => void;
  className?: string;
}

export const MediaPipeDiagnosticsPanel: React.FC<Props> = ({
  report,
  isRunning,
  onRerun,
  className = '',
}) => {
  const [copiedStack, setCopiedStack] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const handleCopyStack = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStack(true);
    setTimeout(() => setCopiedStack(false), 2000);
  };

  if (!report) {
    return (
      <div className={`p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-400 text-xs flex items-center justify-between ${className}`}>
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500 animate-spin" />
          MediaPipe 初期化診断待機中...
        </span>
        <button
          onClick={onRerun}
          disabled={isRunning}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1 transition"
        >
          <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
          診断実行
        </button>
      </div>
    );
  }

  const isSuccess = report.overallStatus === 'SUCCESS';
  const isFailed = report.overallStatus === 'FAILED';

  return (
    <div className={`p-3.5 rounded-2xl bg-zinc-950/95 border ${isFailed ? 'border-red-600/60 shadow-red-950/20' : isSuccess ? 'border-emerald-500/40 shadow-emerald-950/20' : 'border-zinc-800'} shadow-xl space-y-3 ${className}`}>
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              isFailed
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : isSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {isFailed ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4 animate-spin" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100">
                MediaPipe 段階的初期化 &amp; Observability (STEP 1 - 7)
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  isFailed
                    ? 'bg-red-950 text-red-300 border border-red-700'
                    : isSuccess
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}
              >
                {isFailed
                  ? 'SEGMENTATION NOT AVAILABLE'
                  : isSuccess
                  ? `READY (${report.activeEngineType || 'InteractiveSegmenter'})`
                  : 'INITIALIZING...'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              iPhone実機での初期化成否・低レイヤWASM/C++ログ・HTTP取得状態を完全可視化
            </p>
          </div>
        </div>

        <button
          onClick={onRerun}
          disabled={isRunning}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1.5 transition font-medium border border-zinc-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
          <span>診断を再実行</span>
        </button>
      </div>

      {/* Critical Failure Warning if FAILED */}
      {isFailed && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/80 text-red-200 text-[11px] space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>【フォールバック禁止】Native MediaPipe セグメンテーション利用不可</span>
          </div>
          <p className="text-red-300/90 text-[10px] leading-relaxed">
            ユーザー指定規約に基づき、Legacy Pure TS やダミーマスクへの自動フォールバックは停止されています。
            以下の STEP 詳細およびエラーレポートを確認してください。
          </p>
        </div>
      )}

      {/* STEP 1 - 7 Step Table */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          初期化パイプライン (1行ごとの実行状態)
        </span>
        <div className="space-y-1.5">
          {report.steps.map((step) => {
            const isStepOk = step.status === 'OK';
            const isStepFailed = step.status === 'FAILED';
            const isStepRunning = step.status === 'RUNNING';
            const isStepSkipped = step.status === 'SKIPPED';
            const isExpanded = expandedStep === step.stepNumber;

            return (
              <div
                key={step.stepNumber}
                className={`rounded-xl border p-2 text-[11px] transition-all ${
                  isStepFailed
                    ? 'bg-red-950/40 border-red-800/80 text-red-200'
                    : isStepOk
                    ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                    : isStepRunning
                    ? 'bg-amber-950/30 border-amber-600/70 text-amber-200 animate-pulse'
                    : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        isStepOk
                          ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
                          : isStepFailed
                          ? 'bg-red-900/80 text-red-300 border border-red-600'
                          : isStepRunning
                          ? 'bg-amber-900/80 text-amber-300 border border-amber-600'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {step.status}
                    </span>
                    <span className="font-semibold text-zinc-200">{step.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    {step.httpStatus && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {step.httpStatus}
                      </span>
                    )}
                    {step.durationMs !== undefined && (
                      <span className="text-zinc-400">{step.durationMs} ms</span>
                    )}
                    {step.error && (
                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.stepNumber)}
                        className="text-red-400 hover:text-red-300 flex items-center gap-0.5"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>詳細</span>
                      </button>
                    )}
                  </div>
                </div>

                {step.details && (
                  <div className="text-[10px] text-zinc-400 mt-1 pl-1 border-l-2 border-zinc-800 whitespace-pre-wrap font-mono">
                    {step.details}
                  </div>
                )}

                {/* Expanded Error View for Step */}
                {isExpanded && step.error && (
                  <div className="mt-2 p-2 rounded-lg bg-red-950/90 border border-red-800 text-[10px] space-y-1 font-mono">
                    <div className="font-bold text-red-300 whitespace-pre-wrap">
                      {step.error.name}: {step.error.message}
                    </div>
                    {step.error.stack && (
                      <pre className="p-1.5 rounded bg-black/80 font-mono text-[9px] text-red-200 overflow-x-auto whitespace-pre-wrap max-h-48">
                        {step.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Granular Observability / Developer Info Card */}
      <div className="p-3 rounded-xl bg-black/60 border border-zinc-800/80 space-y-2.5 text-[10px]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <span className="font-bold text-zinc-200 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Developer Info &amp; Catch Details (詳細キャッチ情報)</span>
          </span>
          <span className="text-zinc-500 font-mono">
            {new Date(report.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300 font-mono">
          <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 space-y-0.5">
            <div className="text-zinc-500 text-[9px]">Model URL:</div>
            <div className="text-emerald-400 truncate">{report.modelUrl}</div>
          </div>
          <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 space-y-0.5">
            <div className="text-zinc-500 text-[9px]">WASM Base URL:</div>
            <div className="text-emerald-400 truncate">{report.wasmUrl}</div>
          </div>
          <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 space-y-0.5">
            <div className="text-zinc-500 text-[9px]">Active Engine Type:</div>
            <div className="text-cyan-300">{report.activeEngineType || 'None (Failed)'}</div>
          </div>
          <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 space-y-0.5">
            <div className="text-zinc-500 text-[9px]">FilesetResolver 結果:</div>
            <div className="text-zinc-300 truncate">
              {report.filesetResolverResult ? 'Loader & Binary resolved' : 'Pending / Failed'}
            </div>
          </div>
        </div>

        {/* createFromOptions() result string */}
        {report.createFromOptionsResult && (
          <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-0.5">
            <div className="text-zinc-500 text-[9px]">InteractiveSegmenter.createFromOptions() 結果:</div>
            <div className="text-zinc-200 font-mono text-[10px] leading-relaxed">
              {report.createFromOptionsResult}
            </div>
          </div>
        )}

        {/* Detailed Error Report if Fatal */}
        {report.errorSummary && (
          <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-700/80 space-y-2 text-red-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-300 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>失敗した初期化Step: STEP {report.errorSummary.failedStep} ({report.errorSummary.failedStepName})</span>
              </span>
              {report.errorSummary.stack && (
                <button
                  onClick={() => handleCopyStack(report.errorSummary!.stack!)}
                  className="px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-900 text-red-200 text-[9px] flex items-center gap-1 transition"
                >
                  {copiedStack ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedStack ? 'コピー完了' : 'Stackコピー'}</span>
                </button>
              )}
            </div>

            <div className="space-y-1 font-mono text-[10px]">
              <div>
                <span className="text-red-400 font-semibold">error.name: </span>
                {report.errorSummary.name}
              </div>
              <div>
                <span className="text-red-400 font-semibold">error.message: </span>
                {report.errorSummary.message}
              </div>
            </div>

            {report.errorSummary.stack && (
              <div className="space-y-0.5">
                <div className="text-red-400 text-[9px] font-semibold">Stack Trace:</div>
                <pre className="p-2 rounded bg-black/80 font-mono text-[9px] text-red-200 overflow-x-auto whitespace-pre-wrap max-h-36 border border-red-900/60">
                  {report.errorSummary.stack}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Low-level WASM / C++ stderr capture */}
        {report.capturedLogs && report.capturedLogs.length > 0 && (
          <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-[9px] text-zinc-400">
              <span className="flex items-center gap-1 font-bold">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>WASM / C++ Engine Console Output ({report.capturedLogs.length} entries)</span>
              </span>
              <button
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {showAllLogs ? '折りたたむ' : 'すべて表示'}
              </button>
            </div>
            <pre className="p-1.5 rounded bg-black font-mono text-[9px] text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-28 border border-zinc-800">
              {(showAllLogs ? report.capturedLogs : report.capturedLogs.slice(-4)).join('\n')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
