/**
 * HEAL3 SNS-Creator - Header Navigation
 */

import React, { useRef } from 'react';
import { Image as ImageIcon, Check, Terminal, Sparkles } from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../engine/sampleImages.ts';

interface HeaderProps {
  isFinishedMode: boolean;
  onFinishClick: () => void;
  onSelectUserFile: (file: File) => void;
  onSelectPreset: (preset: SamplePreset) => void;
  onToggleDevInfo: () => void;
  isDevInfoOpen: boolean;
}

export default function Header({
  isFinishedMode,
  onFinishClick,
  onSelectUserFile,
  onSelectPreset,
  onToggleDevInfo,
  isDevInfoOpen,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPresetMenu, setShowPresetMenu] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectUserFile(file);
    }
  };

  return (
    <header
      id="app-header"
      className="w-full bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800/80 px-3 py-2.5 pt-safe flex items-center justify-between z-30 flex-shrink-0"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
          H3
        </div>
        <div>
          <h1 className="text-sm font-semibold text-neutral-100 tracking-tight flex items-center gap-1.5">
            HEAL3 SNS-Creator
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">
              PoC
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {!isFinishedMode && (
          <>
            {/* Hidden native photo input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Photo picker button */}
            <button
              id="btn-pick-photo"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 transition active:scale-95"
              title="端末の写真ライブラリから画像を選択"
            >
              <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">写真</span>選択
            </button>

            {/* Presets dropdown */}
            <div className="relative">
              <button
                id="btn-toggle-presets"
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">サンプル</span>
              </button>

              {showPresetMenu && (
                <div
                  id="preset-dropdown"
                  className="absolute right-0 top-full mt-1 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl py-1 z-50 text-xs"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 border-b border-neutral-800">
                    検証用アスペクト比
                  </div>
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset);
                        setShowPresetMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex flex-col gap-0.5 transition"
                    >
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-[10px] text-neutral-400">{preset.ratioName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* "完成" (Finish) button */}
            <button
              id="btn-finish-editing"
              onClick={onFinishClick}
              className="flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20 transition active:scale-95 ml-1"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              完成
            </button>
          </>
        )}

        {/* Developer Info Toggle */}
        <button
          id="btn-toggle-dev-info"
          onClick={onToggleDevInfo}
          className={`p-1.5 rounded-lg border transition active:scale-95 ${
            isDevInfoOpen
              ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
              : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-400 hover:text-neutral-200'
          }`}
          title="技術検証デバッグ情報"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
