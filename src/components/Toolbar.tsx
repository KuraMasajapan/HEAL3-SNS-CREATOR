/**
 * HEAL3 SNS-Creator - Bottom Editing Toolbar
 * 
 * Manages stamp instantiation, decoupled motion recipe assignment,
 * stamp color customization, and deletion.
 */

import { Star, Heart, Circle, Trash2, Zap, Palette } from 'lucide-react';
import { MotionId, StampItem, StampType } from '../engine/types.ts';
import { MOTION_RECIPES } from '../engine/motion.ts';

interface ToolbarProps {
  stamps: StampItem[];
  selectedStamp: StampItem | null;
  onAddStamp: (type: StampType) => void;
  onUpdateStampMotion: (motionId: MotionId) => void;
  onUpdateStampColor: (color: string) => void;
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
  onAddStamp,
  onUpdateStampMotion,
  onUpdateStampColor,
  onDeleteSelectedStamp,
  onDeselect,
}: ToolbarProps) {
  return (
    <div
      id="bottom-toolbar"
      className="w-full bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800/80 px-3 py-2.5 pb-safe z-30 flex flex-col gap-2 flex-shrink-0"
    >
      {/* If a stamp is selected, show Motion & Properties controls */}
      {selectedStamp ? (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header of selected stamp properties */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStamp.color }} />
              <span>
                {selectedStamp.type === 'star' ? '★ 星スタンプ' : selectedStamp.type === 'heart' ? '♥ ハート' : '● 丸バッジ'}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                (x: {selectedStamp.x.toFixed(2)}, y: {selectedStamp.y.toFixed(2)}, {selectedStamp.rotation}°)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-delete-stamp"
                onClick={onDeleteSelectedStamp}
                className="p-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition active:scale-95 flex items-center gap-1 text-xs px-2 border border-rose-900/40"
                title="選択スタンプを削除"
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

          {/* Decoupled Motion Recipes selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Motion:</span>
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

          {/* Color palette */}
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
        </div>
      ) : (
        /* When no stamp is selected, show Stamp Adder */
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-400 font-medium pl-1">スタンプ追加:</span>
            <button
              id="btn-add-star"
              onClick={() => onAddStamp('star')}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition active:scale-95"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
              <span>星</span>
            </button>
            <button
              id="btn-add-heart"
              onClick={() => onAddStamp('heart')}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-400 stroke-rose-400" />
              <span>ハート</span>
            </button>
            <button
              id="btn-add-circle"
              onClick={() => onAddStamp('circle')}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition active:scale-95"
            >
              <Circle className="w-3.5 h-3.5 fill-sky-400 stroke-sky-400" />
              <span>丸</span>
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 pr-1">
            {stamps.length > 0 ? `${stamps.length}個配置中` : 'タップで配置'}
          </div>
        </div>
      )}
    </div>
  );
}
