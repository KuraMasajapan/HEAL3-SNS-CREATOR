/**
 * HEAL3 SNS-Creator - Bottom Editing Toolbar
 * 
 * Manages:
 * 1. Scene Motion recipes (None, Fade In, Gentle Zoom, Fade + Zoom)
 * 2. Stamp instantiation (Star, Heart, Circle)
 * 3. Foreground Item PoC (Sample Avatar, Custom transparent PNG upload)
 * 4. Item scale adjustments & decoupled motion recipe assignment
 */

import React, { useRef } from 'react';
import { Star, Heart, Circle, Trash2, Zap, Palette, Clapperboard, Plus, UserCheck, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { MotionId, SceneMotionId, StampItem, StampType } from '../engine/types.ts';
import { MOTION_RECIPES, SCENE_MOTION_RECIPES } from '../engine/motion.ts';

interface ToolbarProps {
  stamps: StampItem[];
  selectedStamp: StampItem | null;
  sceneMotionId: SceneMotionId;
  onUpdateSceneMotion: (sceneMotionId: SceneMotionId) => void;
  onAddStamp: (type: StampType) => void;
  onAddForegroundSample: () => void;
  onAddForegroundFile: (file: File) => void;
  onUpdateStampMotion: (motionId: MotionId) => void;
  onUpdateStampColor: (color: string) => void;
  onUpdateStampScale: (newScale: number) => void;
  onDeleteSelectedStamp: () => void;
  onDeselect: () => void;
}

const COLOR_PALETTE = [
  { hex: '#FACC15', label: 'Gold' },
  { hex: '#FB7185', label: 'Coral' },
  { hex: '#38BDF8', label: 'Sky' },
  { hex: '#34D399', label: 'Emerald' },
  { hex: '#C084FC', label: 'Violet' },
  { hex: '#FFFFFF', label: 'Pure White' },
];

export default function Toolbar({
  stamps,
  selectedStamp,
  sceneMotionId,
  onUpdateSceneMotion,
  onAddStamp,
  onAddForegroundSample,
  onAddForegroundFile,
  onUpdateStampMotion,
  onUpdateStampColor,
  onUpdateStampScale,
  onDeleteSelectedStamp,
  onDeselect,
}: ToolbarProps) {
  const fgFileInputRef = useRef<HTMLInputElement>(null);

  const handleFgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddForegroundFile(file);
    }
    // reset input value so re-selecting same file triggers change
    if (e.target) {
      e.target.value = '';
    }
  };

  const isForegroundSelected = selectedStamp?.isForeground || selectedStamp?.type === 'foreground_image';

  return (
    <div
      id="bottom-toolbar"
      className="w-full bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800/80 px-3 py-2 pb-safe z-30 flex flex-col gap-2 flex-shrink-0"
    >
      {/* Hidden file input for custom transparent PNG foreground */}
      <input
        ref={fgFileInputRef}
        type="file"
        accept="image/png,image/webp,image/*"
        className="hidden"
        onChange={handleFgFileChange}
      />

      {/* Global Scene Motion Bar (always accessible in edit mode for quick testing) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800/60">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
          <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
          <span>Scene:</span>
        </div>

        {Object.values(SCENE_MOTION_RECIPES).map((recipe) => {
          const isActive = sceneMotionId === recipe.id;
          return (
            <button
              key={recipe.id}
              id={`scene-motion-btn-${recipe.id}`}
              onClick={() => onUpdateSceneMotion(recipe.id)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 ${
                isActive
                  ? 'bg-indigo-600/25 text-indigo-300 border-indigo-500/60 shadow-sm shadow-indigo-500/10'
                  : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/50 hover:bg-neutral-700/60'
              }`}
            >
              <span>{recipe.nameJa}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
            </button>
          );
        })}
      </div>

      {/* If an item is selected, show item-specific properties */}
      {selectedStamp ? (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header of selected item */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-neutral-200 font-medium">
              {isForegroundSelected ? (
                <>
                  <span className="p-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <UserCheck className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-sky-300">前景アバター</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    (Scale: {Math.round(selectedStamp.scale * 100)}%)
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStamp.color }} />
                  <span>
                    {selectedStamp.type === 'star' ? '★ 星スタンプ' : selectedStamp.type === 'heart' ? '♥ ハート' : '● 丸バッジ'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    ({Math.round(selectedStamp.scale * 100)}%, {selectedStamp.rotation}°)
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-delete-stamp"
                onClick={onDeleteSelectedStamp}
                className="p-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition active:scale-95 flex items-center gap-1 text-xs px-2 border border-rose-900/40"
                title="選択アイテムを削除"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>削除</span>
              </button>
              <button
                id="btn-deselect-stamp"
                onClick={onDeselect}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700/60"
              >
                選択解除
              </button>
            </div>
          </div>

          {/* Scale Control Row (Especially helpful for Foreground Avatar enlargement) */}
          <div className="flex items-center justify-between gap-2 bg-neutral-950/50 p-1.5 rounded-lg border border-neutral-800/80">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-1 flex-shrink-0">
              <ZoomIn className="w-3 h-3 text-sky-400" />
              <span>拡大率:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
              <input
                type="range"
                min="0.1"
                max="0.85"
                step="0.02"
                value={selectedStamp.scale}
                onChange={(e) => onUpdateStampScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateStampScale(Math.max(0.1, selectedStamp.scale - 0.05))}
                className="p-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300"
                title="縮小"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => onUpdateStampScale(Math.min(0.85, selectedStamp.scale + 0.05))}
                className="p-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300"
                title="拡大"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              {isForegroundSelected && (
                <button
                  onClick={() => onUpdateStampScale(0.50)}
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-600/25 border border-sky-500/40 text-sky-300 hover:bg-sky-600/40 active:scale-95"
                  title="アバターを強調表示"
                >
                  大きく強調
                </button>
              )}
            </div>
          </div>

          {/* Decoupled Item Motion Recipes selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Item Motion:</span>
            </div>

            {Object.values(MOTION_RECIPES).map((recipe) => {
              const isActive = selectedStamp.motionId === recipe.id;
              return (
                <button
                  key={recipe.id}
                  id={`motion-btn-${recipe.id}`}
                  onClick={() => onUpdateStampMotion(recipe.id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                      : 'bg-neutral-800/80 text-neutral-300 border-neutral-700/60 hover:bg-neutral-700/60'
                  }`}
                >
                  {recipe.nameJa}
                </button>
              );
            })}
          </div>

          {/* Color palette (only for vector stamps, not foreground image) */}
          {!isForegroundSelected && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
                <Palette className="w-3 h-3 text-sky-400" />
                <span>Color:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onUpdateStampColor(c.hex)}
                    className={`w-5 h-5 rounded-full border transition active:scale-90 ${
                      selectedStamp.color === c.hex
                        ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-neutral-900 border-white'
                        : 'border-neutral-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* When no item is selected, show Stamp & Foreground Adders */
        <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400 font-medium pl-0.5 flex-shrink-0">追加:</span>
            
            {/* Vector Stamps */}
            <button
              id="btn-add-star"
              onClick={() => onAddStamp('star')}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition active:scale-95 flex-shrink-0"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
              <span>星</span>
            </button>
            <button
              id="btn-add-heart"
              onClick={() => onAddStamp('heart')}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition active:scale-95 flex-shrink-0"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-400 stroke-rose-400" />
              <span>ハート</span>
            </button>
            <button
              id="btn-add-circle"
              onClick={() => onAddStamp('circle')}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition active:scale-95 flex-shrink-0"
            >
              <Circle className="w-3.5 h-3.5 fill-sky-400 stroke-sky-400" />
              <span>丸</span>
            </button>

            {/* Foreground Avatar PoC Adders */}
            <div className="h-4 w-px bg-neutral-800 mx-0.5 flex-shrink-0" />

            <button
              id="btn-add-sample-avatar"
              onClick={onAddForegroundSample}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition active:scale-95 flex-shrink-0 shadow-sm shadow-indigo-500/10"
              title="切り抜きアバターのPoCサンプルを追加"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>⚡ 前景アバター</span>
            </button>

            <button
              id="btn-upload-foreground-png"
              onClick={() => fgFileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/80 transition active:scale-95 flex-shrink-0"
              title="端末から透過PNG画像を前景として読み込む"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-400" />
              <span>透過PNG</span>
            </button>
          </div>

          <div className="text-[10px] text-neutral-500 pr-1 flex-shrink-0 hidden sm:block">
            {stamps.length > 0 ? `${stamps.length}個配置中` : 'タップで配置'}
          </div>
        </div>
      )}
    </div>
  );
}
