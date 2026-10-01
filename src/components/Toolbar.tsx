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
import { Star, Heart, Circle, Trash2, Zap, Palette, Clapperboard, Plus, UserCheck, ZoomIn, ZoomOut, RotateCcw, Scissors, Sparkles, Sun, Focus, MapPin, Image, Camera, Square, Scan, Film, Play, AlertCircle } from 'lucide-react';
import { LayoutMode, MapFramePreset, MapSegmentMode, MaskConfig, MaskIntensity, MotionId, SceneMotionId, StampItem, StampType } from '../engine/types.ts';
import { MOTION_RECIPES, SCENE_MOTION_RECIPES } from '../engine/motion.ts';
import { MapPanelDetectionResult } from '../engine/mapPanelDetector.ts';

interface ToolbarProps {
  stamps: StampItem[];
  selectedStamp: StampItem | null;
  sceneMotionId: SceneMotionId;
  maskConfig: MaskConfig;
  layoutMode: LayoutMode;
  mapMode: MapSegmentMode;
  mapFramePreset: MapFramePreset;
  hasMapPhoto: boolean;
  hasMapVideo?: boolean;
  mapVideoError?: string | null;
  hasBaseImage?: boolean;
  mapDetection?: MapPanelDetectionResult | null;
  showDetectorOverlay?: boolean;
  onToggleDetectorOverlay?: () => void;
  onOpenAvatarExtract?: () => void;
  onUpdateSceneMotion: (sceneMotionId: SceneMotionId) => void;
  onUpdateMask: (maskConfig: MaskConfig) => void;
  onUpdateLayout: (layoutMode: LayoutMode) => void;
  onUpdateMapMode: (mapMode: MapSegmentMode) => void;
  onUpdateMapFramePreset: (preset: MapFramePreset) => void;
  onSelectMapPhoto: (file: File) => void;
  onSelectMapVideo?: (file: File) => void;
  onReplayMapVideo?: () => void;
  onResetMapCrop?: () => void;
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
  maskConfig,
  layoutMode,
  mapMode,
  mapFramePreset,
  hasMapPhoto,
  hasMapVideo = false,
  mapVideoError = null,
  hasBaseImage,
  mapDetection,
  showDetectorOverlay = true,
  onToggleDetectorOverlay,
  onOpenAvatarExtract,
  onUpdateSceneMotion,
  onUpdateMask,
  onUpdateLayout,
  onUpdateMapMode,
  onUpdateMapFramePreset,
  onSelectMapPhoto,
  onSelectMapVideo,
  onReplayMapVideo,
  onResetMapCrop,
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
  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const mapVideoInputRef = useRef<HTMLInputElement>(null);

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

  const handleMapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectMapPhoto(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleMapVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectMapVideo?.(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePhotoBtnClick = () => {
    if (hasMapPhoto && mapMode !== 'photo') {
      onUpdateMapMode('photo');
    } else {
      mapFileInputRef.current?.click();
    }
  };

  const handleVideoBtnClick = () => {
    if (hasMapVideo && mapMode !== 'video') {
      onUpdateMapMode('video');
      onReplayMapVideo?.();
    } else {
      mapVideoInputRef.current?.click();
    }
  };

  const isForegroundSelected = selectedStamp?.isForeground || selectedStamp?.type === 'foreground_image';

  return (
    <div
      id="bottom-toolbar"
      className="w-full bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800/80 px-3 pt-2 pb-safe z-30 flex flex-col gap-2 flex-shrink-0 max-h-[46dvh] overflow-y-auto overscroll-contain"
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

        {sceneMotionId !== 'none' && (
          <button
            id="scene-motion-replay-btn"
            onClick={() => onUpdateSceneMotion(sceneMotionId)}
            title="Scene Introを再生"
            className="text-[11px] font-medium px-2 py-1 rounded-lg border border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 transition active:scale-95 flex items-center gap-1 flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>再生</span>
          </button>
        )}
      </div>

      {/* Mask Selection Bar (Autumn Mask v1, Sunlight Mask v1) */}
      <div id="mask-controls-bar" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800/60">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Mask:</span>
        </div>

        {/* None button */}
        <button
          id="btn-mask-none"
          onClick={() => onUpdateMask({ ...maskConfig, type: 'none' })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            maskConfig.type === 'none'
              ? 'bg-neutral-700/80 text-white border-neutral-500 font-semibold shadow-sm'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span>None</span>
          {maskConfig.type === 'none' && <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />}
        </button>

        {/* Autumn button */}
        <button
          id="btn-mask-autumn"
          onClick={() => onUpdateMask({ ...maskConfig, type: 'autumn' })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            maskConfig.type === 'autumn'
              ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 font-semibold shadow-sm shadow-amber-500/10'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span>🍁 Autumn</span>
          {maskConfig.type === 'autumn' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>

        {/* Sunlight button */}
        <button
          id="btn-mask-sunlight"
          onClick={() => onUpdateMask({ ...maskConfig, type: 'sunlight' })}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            maskConfig.type === 'sunlight'
              ? 'bg-yellow-500/25 text-yellow-200 border-yellow-400/60 font-semibold shadow-sm shadow-yellow-500/10'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-yellow-300" />
          <span>Sunlight</span>
          {maskConfig.type === 'sunlight' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
        </button>

        {/* Intensity Selection: Displayed when Autumn or Sunlight is selected */}
        {maskConfig.type !== 'none' && (
          <div id="mask-intensity-group" className="flex items-center gap-1 pl-1.5 ml-0.5 border-l border-neutral-700/60 flex-shrink-0">
            <span className={`text-[10px] font-medium mr-0.5 flex-shrink-0 ${
              maskConfig.type === 'sunlight' ? 'text-yellow-300/80' : 'text-amber-300/80'
            }`}>
              強さ:
            </span>
            {(['weak', 'medium', 'strong'] as const).map((intensity) => {
              const isSelected = maskConfig.intensity === intensity;
              const labels: Record<MaskIntensity, string> = {
                weak: 'Weak',
                medium: 'Medium',
                strong: 'Strong',
              };
              const activeColorClass = maskConfig.type === 'sunlight'
                ? 'bg-yellow-400 text-neutral-950 font-bold border-yellow-300 shadow-sm shadow-yellow-400/20'
                : 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-sm shadow-amber-500/20';

              return (
                <button
                  key={intensity}
                  id={`btn-mask-intensity-${intensity}`}
                  onClick={() => onUpdateMask({ ...maskConfig, intensity })}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition whitespace-nowrap active:scale-95 flex-shrink-0 ${
                    isSelected
                      ? activeColorClass
                      : 'bg-neutral-800/80 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/70 hover:text-neutral-300'
                  }`}
                >
                  {labels[intensity]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Layout Selection Bar (Minimal PoC: Original / Character Focus) */}
      <div id="layout-controls-bar" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800/60">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
          <Focus className="w-3.5 h-3.5 text-sky-400" />
          <span>Layout:</span>
        </div>

        {/* Original button */}
        <button
          id="btn-layout-original"
          onClick={() => onUpdateLayout('original')}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            layoutMode === 'original'
              ? 'bg-neutral-700/80 text-white border-neutral-500 font-semibold shadow-sm'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span>Original</span>
          {layoutMode === 'original' && <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />}
        </button>

        {/* Character Focus button */}
        <button
          id="btn-layout-character-focus"
          onClick={() => onUpdateLayout('character_focus')}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            layoutMode === 'character_focus'
              ? 'bg-sky-600/30 text-sky-200 border-sky-500/60 font-semibold shadow-sm shadow-sky-500/10'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span>Character Focus</span>
          {layoutMode === 'character_focus' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
        </button>
      </div>

      {/* Map Segment Replacement Bar (PoC: Original / Photo) */}
      <div id="map-controls-bar" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800/60">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Map:</span>
        </div>

        {/* Hidden file input for Photo replacement */}
        <input
          ref={mapFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleMapFileChange}
        />

        {/* Hidden file input for Video replacement */}
        <input
          ref={mapVideoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="hidden"
          onChange={handleMapVideoChange}
        />

        {/* Original button */}
        <button
          id="btn-map-original"
          onClick={() => onUpdateMapMode('original')}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            mapMode === 'original'
              ? 'bg-neutral-700/80 text-white border-neutral-500 font-semibold shadow-sm'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span>Original</span>
          {mapMode === 'original' && <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />}
        </button>

        {/* Photo button */}
        <button
          id="btn-map-photo"
          onClick={handlePhotoBtnClick}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            mapMode === 'photo'
              ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/60 font-semibold shadow-sm shadow-emerald-500/10'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <Image className="w-3 h-3" />
          <span>Photo</span>
          {mapMode === 'photo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>

        {/* Video button */}
        <button
          id="btn-map-video"
          onClick={handleVideoBtnClick}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            mapMode === 'video'
              ? 'bg-sky-600/30 text-sky-200 border-sky-500/60 font-semibold shadow-sm shadow-sky-500/10'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <Film className="w-3 h-3" />
          <span>Video</span>
          {mapMode === 'video' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
        </button>

        {/* Video mode controls */}
        {mapMode === 'video' && (
          <>
            {mapVideoError ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-red-300 bg-red-950/90 border border-red-700/80 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span>この動画形式は再生できません</span>
                </span>
                <button
                  id="btn-map-video-change-err"
                  onClick={() => mapVideoInputRef.current?.click()}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition active:scale-95 whitespace-nowrap"
                >
                  別の動画を選択
                </button>
              </div>
            ) : hasMapVideo ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  id="btn-map-video-change"
                  onClick={() => mapVideoInputRef.current?.click()}
                  title="動画を変更"
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-neutral-700/70 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 transition active:scale-95 flex items-center gap-1 flex-shrink-0"
                >
                  <Film className="w-3 h-3 text-sky-400" />
                  <span>動画変更</span>
                </button>
                {onReplayMapVideo && (
                  <button
                    id="btn-map-video-replay"
                    onClick={onReplayMapVideo}
                    title="動画を最初から再生"
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-sky-600/50 bg-sky-950/60 text-sky-300 hover:bg-sky-900/60 transition active:scale-95 flex items-center gap-1 flex-shrink-0"
                  >
                    <Play className="w-2.5 h-2.5 fill-sky-400 text-sky-400" />
                    <span>再生</span>
                  </button>
                )}
                <span className="text-[9px] text-neutral-400 font-mono">（無音・1回再生）</span>
              </div>
            ) : null}
          </>
        )}

        {/* Quick Change button if Photo is selected and has photo loaded */}
        {hasMapPhoto && (
          <button
            id="btn-map-photo-change"
            onClick={() => mapFileInputRef.current?.click()}
            title="写真を変更"
            className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-neutral-700/70 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 transition active:scale-95 flex items-center gap-1 flex-shrink-0"
          >
            <Camera className="w-3 h-3 text-emerald-400" />
            <span>写真変更</span>
          </button>
        )}

        {/* Minimal indicator: Photo Mode Crop Status */}
        {mapMode === 'photo' && hasMapPhoto && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-700/70 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>写真調整中</span>
            </span>
            {onResetMapCrop && (
              <button
                id="btn-reset-map-crop"
                onClick={onResetMapCrop}
                title="写真の位置と拡大率をリセット"
                className="text-[10px] text-neutral-400 hover:text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-700/60 bg-neutral-800/80 flex items-center gap-1 transition active:scale-95"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>リセット</span>
              </button>
            )}
          </div>
        )}

        {/* Map Panel Detector PoC toggle button */}
        {mapDetection && (
          <button
            id="btn-toggle-detector-overlay"
            onClick={onToggleDetectorOverlay}
            title="Map Panel Detector PoC 検出枠の表示/非表示を切り替え"
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border transition active:scale-95 flex items-center gap-1 flex-shrink-0 ml-auto ${
              showDetectorOverlay
                ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-300 shadow-sm shadow-cyan-500/10'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Scan className="w-3 h-3 text-cyan-400" />
            <span>検出枠: {showDetectorOverlay ? 'ON' : 'OFF'}</span>
            <span className="font-mono text-[9px] text-cyan-400/80">({Math.round(mapDetection.confidence * 100)}%)</span>
          </button>
        )}
      </div>

      {/* Map Frame Preset Bar (None / Pink / Green / Yellow / White) */}
      <div id="frame-controls-bar" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800/60">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 pl-0.5 flex-shrink-0">
          <Square className="w-3.5 h-3.5 text-pink-400" />
          <span>Frame:</span>
        </div>

        {/* None button */}
        <button
          id="btn-frame-none"
          onClick={() => onUpdateMapFramePreset('none')}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1 flex-shrink-0 ${
            mapFramePreset === 'none'
              ? 'bg-neutral-700/80 text-white border-neutral-500 font-semibold shadow-sm'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span>None</span>
          {mapFramePreset === 'none' && <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />}
        </button>

        {/* Pink button */}
        <button
          id="btn-frame-pink"
          onClick={() => {
            onUpdateMapFramePreset('pink');
            if (mapMode === 'original' && hasMapPhoto) onUpdateMapMode('photo');
          }}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
            mapFramePreset === 'pink'
              ? 'bg-pink-600/30 text-pink-200 border-pink-400/80 font-semibold shadow-sm shadow-pink-500/15'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-sm border border-pink-300/60" />
          <span>Pink</span>
          {mapFramePreset === 'pink' && <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
        </button>

        {/* Green button */}
        <button
          id="btn-frame-green"
          onClick={() => {
            onUpdateMapFramePreset('green');
            if (mapMode === 'original' && hasMapPhoto) onUpdateMapMode('photo');
          }}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
            mapFramePreset === 'green'
              ? 'bg-emerald-600/30 text-emerald-200 border-emerald-400/80 font-semibold shadow-sm shadow-emerald-500/15'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm border border-emerald-300/60" />
          <span>Green</span>
          {mapFramePreset === 'green' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>

        {/* Yellow button */}
        <button
          id="btn-frame-yellow"
          onClick={() => {
            onUpdateMapFramePreset('yellow');
            if (mapMode === 'original' && hasMapPhoto) onUpdateMapMode('photo');
          }}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
            mapFramePreset === 'yellow'
              ? 'bg-amber-600/30 text-amber-200 border-amber-400/80 font-semibold shadow-sm shadow-amber-500/15'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-sm border border-amber-200/60" />
          <span>Yellow</span>
          {mapFramePreset === 'yellow' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>

        {/* White button */}
        <button
          id="btn-frame-white"
          onClick={() => {
            onUpdateMapFramePreset('white');
            if (mapMode === 'original' && hasMapPhoto) onUpdateMapMode('photo');
          }}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition whitespace-nowrap active:scale-95 flex items-center gap-1.5 flex-shrink-0 ${
            mapFramePreset === 'white'
              ? 'bg-white/20 text-white border-white/80 font-semibold shadow-sm shadow-white/20'
              : 'bg-neutral-800/70 text-neutral-400 border-neutral-700/60 hover:bg-neutral-700/60 hover:text-neutral-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm border border-neutral-300" />
          <span>White</span>
          {mapFramePreset === 'white' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>
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

            {hasBaseImage && onOpenAvatarExtract && (
              <button
                id="btn-extract-avatar"
                onClick={onOpenAvatarExtract}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 transition active:scale-95 flex-shrink-0 shadow-sm shadow-emerald-500/10"
                title="BASE画像内のアバターを切り抜いて前景Item化"
              >
                <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                <span>✂️ アバター切り抜き</span>
              </button>
            )}

            <button
              id="btn-add-sample-avatar"
              onClick={onAddForegroundSample}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition active:scale-95 flex-shrink-0"
              title="切り抜きアバターのPoCサンプルを追加"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>サンプルアバター</span>
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
