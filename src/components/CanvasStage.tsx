/**
 * HEAL3 SNS-Creator - Canvas Stage Component
 * 
 * Manages the high-DPI canvas render loop, coordinate translation,
 * and multi-touch gestures (drag, pinch-scale, rotation).
 */

import React, { useEffect, useRef, useState } from 'react';
import { BaseImageState, StampItem } from '../engine/types.ts';
import { renderScene } from '../engine/renderer.ts';
import { createInitialGestureState, GestureState, hitTestRotateHandle, hitTestStamp } from '../engine/gestures.ts';

interface CanvasStageProps {
  baseImage: BaseImageState;
  stamps: StampItem[];
  selectedStampId: string | null;
  isFinishedMode: boolean;
  onSelectStamp: (id: string | null) => void;
  onUpdateStamp: (stamp: StampItem) => void;
  onFpsUpdate: (fps: number) => void;
  onCanvasMetricsUpdate: (bufferW: number, bufferH: number, displayW: number, displayH: number) => void;
}

export default function CanvasStage({
  baseImage,
  stamps,
  selectedStampId,
  isFinishedMode,
  onSelectStamp,
  onUpdateStamp,
  onFpsUpdate,
  onCanvasMetricsUpdate,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeManipulatingId, setActiveManipulatingId] = useState<string | null>(null);
  const gestureStateRef = useRef<GestureState>(createInitialGestureState());
  const stampsRef = useRef<StampItem[]>(stamps);
  stampsRef.current = stamps;

  const selectedStampIdRef = useRef<string | null>(selectedStampId);
  selectedStampIdRef.current = selectedStampId;

  const isFinishedModeRef = useRef<boolean>(isFinishedMode);
  isFinishedModeRef.current = isFinishedMode;

  const [displayMetrics, setDisplayMetrics] = useState({
    width: 320,
    height: 480,
    dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5),
  });

  // Track container dimensions and calculate aspect-fit canvas size
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;
      if (containerW <= 0 || containerH <= 0) return;

      const aspect = baseImage.aspectRatio || 9 / 16;
      let dispW = containerW;
      let dispH = containerW / aspect;

      if (dispH > containerH) {
        dispH = containerH;
        dispW = containerH * aspect;
      }

      dispW = Math.floor(dispW);
      dispH = Math.floor(dispH);

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      setDisplayMetrics({ width: dispW, height: dispH, dpr });

      const bufferW = Math.round(dispW * dpr);
      const bufferH = Math.round(dispH * dpr);
      onCanvasMetricsUpdate(bufferW, bufferH, dispW, dispH);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [baseImage.aspectRatio, onCanvasMetricsUpdate]);

  // Main 60FPS animation loop using requestAnimationFrame
  useEffect(() => {
    let animFrameId: number;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const renderLoop = (time: number) => {
      frameCount++;
      if (time - lastFpsTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (time - lastFpsTime));
        onFpsUpdate(currentFps);
        frameCount = 0;
        lastFpsTime = time;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const bufferW = canvas.width;
          const bufferH = canvas.height;

          renderScene(ctx, baseImage, stampsRef.current, bufferW, bufferH, time, {
            isInteractivePreview: !isFinishedModeRef.current,
            selectedStampId: selectedStampIdRef.current,
            activeManipulatingId: gestureStateRef.current.activeStampId,
            dpr: displayMetrics.dpr,
          });
        }
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animFrameId);
  }, [baseImage, displayMetrics.dpr, onFpsUpdate]);

  // Translate client coordinates (clientX, clientY) to normalized canvas coordinates (0.0 - 1.0)
  const clientToNormalized = (clientX: number, clientY: number): { normX: number; normY: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      // Allow slight drag outside bounds, clamped
      const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return { normX, normY };
    }
    return {
      normX: (clientX - rect.left) / rect.width,
      normY: (clientY - rect.top) / rect.height,
    };
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isFinishedMode) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const norm = clientToNormalized(touch.clientX, touch.clientY);
      if (!norm) return;

      const canvas = canvasRef.current;
      const bufferW = canvas ? canvas.width : displayMetrics.width;
      const bufferH = canvas ? canvas.height : displayMetrics.height;

      // 1. Check if tapped rotate handle of currently selected stamp
      const currentSelected = stampsRef.current.find((s) => s.id === selectedStampIdRef.current);
      if (
        currentSelected &&
        hitTestRotateHandle(
          norm.normX,
          norm.normY,
          currentSelected,
          baseImage.aspectRatio,
          bufferW,
          bufferH
        )
      ) {
        gestureStateRef.current = {
          ...createInitialGestureState(),
          activeStampId: currentSelected.id,
          isManipulating: true,
          mode: 'rotate_handle',
          initialStampRotation: currentSelected.rotation,
          initialStampScale: currentSelected.scale,
          initialStampX: currentSelected.x,
          initialStampY: currentSelected.y,
          startNormalizedX: norm.normX,
          startNormalizedY: norm.normY,
        };
        setActiveManipulatingId(currentSelected.id);
        return;
      }

      // 2. Hit test stamps
      const hit = hitTestStamp(norm.normX, norm.normY, stampsRef.current, baseImage.aspectRatio);
      if (hit) {
        onSelectStamp(hit.id);
        gestureStateRef.current = {
          ...createInitialGestureState(),
          activeStampId: hit.id,
          isManipulating: true,
          mode: 'drag',
          initialStampScale: hit.scale,
          initialStampRotation: hit.rotation,
          initialStampX: hit.x,
          initialStampY: hit.y,
          startNormalizedX: norm.normX,
          startNormalizedY: norm.normY,
        };
        setActiveManipulatingId(hit.id);
      } else {
        // Tapped empty space
        onSelectStamp(null);
        gestureStateRef.current = createInitialGestureState();
        setActiveManipulatingId(null);
      }
    } else if (e.touches.length >= 2) {
      // Pinch to zoom and 2-finger rotate
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;

      const activeId = gestureStateRef.current.activeStampId || selectedStampIdRef.current;
      const currentStamp = stampsRef.current.find((s) => s.id === activeId);

      if (currentStamp) {
        gestureStateRef.current = {
          ...gestureStateRef.current,
          activeStampId: currentStamp.id,
          isManipulating: true,
          mode: 'pinch_rotate',
          initialTouchDistance: dist,
          initialTouchAngle: angle,
          initialStampScale: currentStamp.scale,
          initialStampRotation: currentStamp.rotation,
        };
        setActiveManipulatingId(currentStamp.id);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isFinishedMode) return;
    const g = gestureStateRef.current;
    if (!g.isManipulating || !g.activeStampId) return;

    const currentStamp = stampsRef.current.find((s) => s.id === g.activeStampId);
    if (!currentStamp) return;

    if (g.mode === 'drag' && e.touches.length === 1) {
      const touch = e.touches[0];
      const norm = clientToNormalized(touch.clientX, touch.clientY);
      if (!norm) return;

      const deltaX = norm.normX - g.startNormalizedX;
      const deltaY = norm.normY - g.startNormalizedY;

      // Keep within reasonable bounds (0.0 to 1.0)
      const newX = Math.max(0.05, Math.min(0.95, g.initialStampX + deltaX));
      const newY = Math.max(0.05, Math.min(0.95, g.initialStampY + deltaY));

      onUpdateStamp({
        ...currentStamp,
        x: newX,
        y: newY,
      });
    } else if (g.mode === 'rotate_handle' && e.touches.length === 1) {
      const touch = e.touches[0];
      const norm = clientToNormalized(touch.clientX, touch.clientY);
      if (!norm) return;

      // Angle relative to stamp center
      const dx = norm.normX - currentStamp.x;
      const dy = (norm.normY - currentStamp.y) / (baseImage.aspectRatio || 1);
      const angleRad = Math.atan2(dy, dx);
      // Offset by +90 deg because handle is at top (negative Y)
      const newRotation = Math.round((angleRad * 180) / Math.PI + 90);

      onUpdateStamp({
        ...currentStamp,
        rotation: (newRotation + 360) % 360,
      });
    } else if (g.mode === 'pinch_rotate' && e.touches.length >= 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = (Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180) / Math.PI;

      if (g.initialTouchDistance > 0) {
        const scaleMultiplier = dist / g.initialTouchDistance;
        // Limit scale between 0.08 and 0.85
        const newScale = Math.max(0.08, Math.min(0.85, g.initialStampScale * scaleMultiplier));

        const deltaAngle = angle - g.initialTouchAngle;
        const newRotation = Math.round((g.initialStampRotation + deltaAngle + 360) % 360);

        onUpdateStamp({
          ...currentStamp,
          scale: newScale,
          rotation: newRotation,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    gestureStateRef.current = {
      ...gestureStateRef.current,
      isManipulating: false,
      mode: 'none',
      activeStampId: null,
    };
    setActiveManipulatingId(null);
  };

  // Pointer/Mouse handlers for testing on desktop or simulator
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isFinishedMode || e.pointerType === 'touch') return; // touch handled above
    const norm = clientToNormalized(e.clientX, e.clientY);
    if (!norm) return;

    const canvas = canvasRef.current;
    const bufferW = canvas ? canvas.width : displayMetrics.width;
    const bufferH = canvas ? canvas.height : displayMetrics.height;

    const currentSelected = stampsRef.current.find((s) => s.id === selectedStampIdRef.current);
    if (
      currentSelected &&
      hitTestRotateHandle(
        norm.normX,
        norm.normY,
        currentSelected,
        baseImage.aspectRatio,
        bufferW,
        bufferH
      )
    ) {
      gestureStateRef.current = {
        ...createInitialGestureState(),
        activeStampId: currentSelected.id,
        isManipulating: true,
        mode: 'rotate_handle',
        initialStampRotation: currentSelected.rotation,
        initialStampScale: currentSelected.scale,
        initialStampX: currentSelected.x,
        initialStampY: currentSelected.y,
        startNormalizedX: norm.normX,
        startNormalizedY: norm.normY,
      };
      setActiveManipulatingId(currentSelected.id);
      return;
    }

    const hit = hitTestStamp(norm.normX, norm.normY, stampsRef.current, baseImage.aspectRatio);
    if (hit) {
      onSelectStamp(hit.id);
      gestureStateRef.current = {
        ...createInitialGestureState(),
        activeStampId: hit.id,
        isManipulating: true,
        mode: 'drag',
        initialStampScale: hit.scale,
        initialStampRotation: hit.rotation,
        initialStampX: hit.x,
        initialStampY: hit.y,
        startNormalizedX: norm.normX,
        startNormalizedY: norm.normY,
      };
      setActiveManipulatingId(hit.id);
    } else {
      onSelectStamp(null);
      setActiveManipulatingId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isFinishedMode || e.pointerType === 'touch') return;
    const g = gestureStateRef.current;
    if (!g.isManipulating || !g.activeStampId) return;

    const currentStamp = stampsRef.current.find((s) => s.id === g.activeStampId);
    if (!currentStamp) return;

    const norm = clientToNormalized(e.clientX, e.clientY);
    if (!norm) return;

    if (g.mode === 'drag') {
      const deltaX = norm.normX - g.startNormalizedX;
      const deltaY = norm.normY - g.startNormalizedY;
      onUpdateStamp({
        ...currentStamp,
        x: Math.max(0.05, Math.min(0.95, g.initialStampX + deltaX)),
        y: Math.max(0.05, Math.min(0.95, g.initialStampY + deltaY)),
      });
    } else if (g.mode === 'rotate_handle') {
      const dx = norm.normX - currentStamp.x;
      const dy = (norm.normY - currentStamp.y) / (baseImage.aspectRatio || 1);
      const angleRad = Math.atan2(dy, dx);
      const newRotation = Math.round((angleRad * 180) / Math.PI + 90);
      onUpdateStamp({
        ...currentStamp,
        rotation: (newRotation + 360) % 360,
      });
    }
  };

  const handlePointerUp = () => {
    gestureStateRef.current = {
      ...gestureStateRef.current,
      isManipulating: false,
      mode: 'none',
      activeStampId: null,
    };
    setActiveManipulatingId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (isFinishedMode) return;
    const currentSelected = stampsRef.current.find((s) => s.id === selectedStampIdRef.current);
    if (!currentSelected) return;

    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.02 : -0.02;
    const newScale = Math.max(0.08, Math.min(0.85, currentSelected.scale + delta));
    onUpdateStamp({
      ...currentSelected,
      scale: newScale,
    });
  };

  return (
    <div
      ref={containerRef}
      id="canvas-container"
      className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4"
    >
      <canvas
        ref={canvasRef}
        id="heal3-canvas"
        width={Math.round(displayMetrics.width * displayMetrics.dpr)}
        height={Math.round(displayMetrics.height * displayMetrics.dpr)}
        style={{
          width: `${displayMetrics.width}px`,
          height: `${displayMetrics.height}px`,
        }}
        className="rounded-2xl shadow-2xl bg-neutral-950 touch-none cursor-pointer border border-neutral-800/60"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
