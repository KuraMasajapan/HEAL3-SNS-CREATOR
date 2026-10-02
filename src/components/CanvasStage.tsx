/**
 * HEAL3 SNS-Creator - Canvas Stage Component
 * 
 * Manages the high-DPI canvas render loop, coordinate translation,
 * and multi-touch gestures (drag, pinch-scale, rotation).
 */

import React, { useEffect, useRef, useState } from 'react';
import { BaseImageState, LayoutMode, MapSegmentState, MaskConfig, SceneMotionId, StampItem } from '../engine/types.ts';
import { renderScene } from '../engine/renderer.ts';
import { createInitialGestureState, GestureState, hitTestRotateHandle, hitTestStamp } from '../engine/gestures.ts';
import { HEAL3_MAP_SEGMENT_BOUNDS, POC_CONFIG } from '../engine/config.ts';
import { MapPanelDetectionResult, renderDetectorDebugOverlay } from '../engine/mapPanelDetector.ts';

interface CanvasStageProps {
  baseImage: BaseImageState;
  stamps: StampItem[];
  selectedStampId: string | null;
  sceneMotionId: SceneMotionId;
  sceneMotionTrigger?: number;
  maskConfig?: MaskConfig;
  layoutMode?: LayoutMode;
  mapSegment?: MapSegmentState;
  mapDetection?: MapPanelDetectionResult | null;
  showDetectorOverlay?: boolean;
  isFinishedMode: boolean;
  onSelectStamp: (id: string | null) => void;
  onUpdateStamp: (stamp: StampItem) => void;
  onFpsUpdate: (fps: number) => void;
  onCanvasMetricsUpdate: (
    bufferW: number,
    bufferH: number,
    displayW: number,
    displayH: number,
    clientRect?: { left: number; top: number; width: number; height: number }
  ) => void;
  onUpdateMapCrop?: (crop: { photoOffsetX?: number; photoOffsetY?: number; photoScale?: number }) => void;
}

export default function CanvasStage({
  baseImage,
  stamps,
  selectedStampId,
  sceneMotionId,
  sceneMotionTrigger,
  maskConfig,
  layoutMode = 'original',
  mapSegment,
  mapDetection,
  showDetectorOverlay = true,
  isFinishedMode,
  onSelectStamp,
  onUpdateStamp,
  onFpsUpdate,
  onCanvasMetricsUpdate,
  onUpdateMapCrop,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeManipulatingId, setActiveManipulatingId] = useState<string | null>(null);
  const gestureStateRef = useRef<GestureState>(createInitialGestureState());

  // Map photo crop gesture state
  const mapPhotoGestureRef = useRef({
    isManipulating: false,
    mode: 'none' as 'none' | 'drag' | 'pinch',
    startNormX: 0,
    startNormY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    initialScale: 1.0,
    initialDist: 0,
  });

  const stampsRef = useRef<StampItem[]>(stamps);
  stampsRef.current = stamps;

  const selectedStampIdRef = useRef<string | null>(selectedStampId);
  selectedStampIdRef.current = selectedStampId;

  const maskConfigRef = useRef<MaskConfig | undefined>(maskConfig);
  maskConfigRef.current = maskConfig;

  const layoutModeRef = useRef<LayoutMode>(layoutMode);
  layoutModeRef.current = layoutMode;

  const mapSegmentRef = useRef<MapSegmentState | undefined>(mapSegment);
  mapSegmentRef.current = mapSegment;

  const mapDetectionRef = useRef<MapPanelDetectionResult | null | undefined>(mapDetection);
  mapDetectionRef.current = mapDetection;

  const getEffectiveMapBounds = () => {
    const det = mapDetectionRef.current;
    if (det && det.status !== 'failed' && det.width > 0.1 && det.height > 0.1) {
      return {
        x: det.x,
        y: det.y,
        width: det.width,
        height: det.height,
      };
    }
    return HEAL3_MAP_SEGMENT_BOUNDS;
  };

  const isPointInMapPanel = (normX: number, normY: number): boolean => {
    const bounds = getEffectiveMapBounds();
    return (
      normX >= bounds.x - 0.02 &&
      normX <= bounds.x + bounds.width + 0.02 &&
      normY >= bounds.y - 0.02 &&
      normY <= bounds.y + bounds.height + 0.02
    );
  };

  const showDetectorOverlayRef = useRef<boolean>(showDetectorOverlay);
  showDetectorOverlayRef.current = showDetectorOverlay;

  const sceneMotionIdRef = useRef<SceneMotionId>(sceneMotionId);
  sceneMotionIdRef.current = sceneMotionId;

  const sceneMotionStartRef = useRef<number>(performance.now());
  useEffect(() => {
    sceneMotionStartRef.current = performance.now();
  }, [sceneMotionId, sceneMotionTrigger]);

  const isFinishedModeRef = useRef<boolean>(isFinishedMode);
  isFinishedModeRef.current = isFinishedMode;

  const [displayMetrics, setDisplayMetrics] = useState({
    width: 320,
    height: 480,
    dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5),
  });

  // Track container dimensions and calculate aspect-fit canvas size using ResizeObserver
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Extract container computed padding to fit strictly inside the content-box
      // This prevents flexbox from shrinking or overflowing canvas in standalone PWA or on tall viewports
      const computed = window.getComputedStyle(containerRef.current);
      const padLeft = parseFloat(computed.paddingLeft) || 0;
      const padRight = parseFloat(computed.paddingRight) || 0;
      const padTop = parseFloat(computed.paddingTop) || 0;
      const padBottom = parseFloat(computed.paddingBottom) || 0;

      const availW = Math.max(10, rect.width - padLeft - padRight);
      const availH = Math.max(10, rect.height - padTop - padBottom);

      const aspect = baseImage.aspectRatio || (baseImage.originalWidth / baseImage.originalHeight) || (720 / 1280);
      let dispW = availW;
      let dispH = availW / aspect;

      if (dispH > availH) {
        dispH = availH;
        dispW = availH * aspect;
      }

      dispW = Math.floor(dispW);
      dispH = Math.floor(dispH);

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      setDisplayMetrics({ width: dispW, height: dispH, dpr });

      const bufferW = Math.round(dispW * dpr);
      const bufferH = Math.round(dispH * dpr);

      let clientRect: { left: number; top: number; width: number; height: number } | undefined = undefined;
      if (canvasRef.current) {
        const cRect = canvasRef.current.getBoundingClientRect();
        clientRect = {
          left: Math.round(cRect.left * 10) / 10,
          top: Math.round(cRect.top * 10) / 10,
          width: Math.round(cRect.width * 10) / 10,
          height: Math.round(cRect.height * 10) / 10,
        };
      }

      onCanvasMetricsUpdate(bufferW, bufferH, dispW, dispH, clientRect);
    };

    updateSize();

    // Use ResizeObserver for responsive canvas resizing when toolbar expands/collapses or viewport shifts
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [baseImage.aspectRatio, baseImage.originalWidth, baseImage.originalHeight, onCanvasMetricsUpdate]);

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

          const cycleDurationMs = POC_CONFIG.VIDEO_DURATION_SEC * 1000;
          // Scene Intro time calculation: elapsed ms since intro started or was replayed
          const sceneElapsedMs = Math.max(0, time - sceneMotionStartRef.current);

          renderScene(
            ctx,
            baseImage,
            stampsRef.current,
            bufferW,
            bufferH,
            time, // Item Motion continues with continuous monotonic time `time`!
            sceneMotionIdRef.current,
            cycleDurationMs,
            {
              isInteractivePreview: !isFinishedModeRef.current,
              selectedStampId: selectedStampIdRef.current,
              activeManipulatingId: gestureStateRef.current.activeStampId,
              dpr: displayMetrics.dpr,
              maskConfig: maskConfigRef.current,
              layoutMode: layoutModeRef.current,
              mapSegment: mapSegmentRef.current,
              mapDetection: mapDetectionRef.current,
            },
            sceneElapsedMs,
            maskConfigRef.current,
            layoutModeRef.current,
            mapSegmentRef.current
          );

          // Map Panel Detector PoC Debug Bounding Box Overlay (Preview Only)
          if (!isFinishedModeRef.current && mapDetectionRef.current && showDetectorOverlayRef.current) {
            renderDetectorDebugOverlay(ctx, mapDetectionRef.current, bufferW, bufferH);
          }
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
        // Check if user touched inside Map Panel in photo mode
        if (
          mapSegmentRef.current &&
          mapSegmentRef.current.mode === 'photo' &&
          mapSegmentRef.current.photoImage &&
          isPointInMapPanel(norm.normX, norm.normY)
        ) {
          onSelectStamp(null);
          gestureStateRef.current = createInitialGestureState();
          setActiveManipulatingId(null);
          mapPhotoGestureRef.current = {
            isManipulating: true,
            mode: 'drag',
            startNormX: norm.normX,
            startNormY: norm.normY,
            initialOffsetX: mapSegmentRef.current.photoOffsetX ?? 0,
            initialOffsetY: mapSegmentRef.current.photoOffsetY ?? 0,
            initialScale: mapSegmentRef.current.photoScale ?? 1.0,
            initialDist: 0,
          };
          return;
        }

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
        return;
      }

      // Check if Map Photo pinch
      if (
        mapSegmentRef.current &&
        mapSegmentRef.current.mode === 'photo' &&
        mapSegmentRef.current.photoImage
      ) {
        const norm1 = clientToNormalized(t1.clientX, t1.clientY);
        const norm2 = clientToNormalized(t2.clientX, t2.clientY);
        const midX = norm1 && norm2 ? (norm1.normX + norm2.normX) / 2 : 0.2;
        const midY = norm1 && norm2 ? (norm1.normY + norm2.normY) / 2 : 0.4;
        mapPhotoGestureRef.current = {
          isManipulating: true,
          mode: 'pinch',
          startNormX: midX,
          startNormY: midY,
          initialOffsetX: mapSegmentRef.current.photoOffsetX ?? 0,
          initialOffsetY: mapSegmentRef.current.photoOffsetY ?? 0,
          initialScale: mapSegmentRef.current.photoScale ?? 1.0,
          initialDist: dist,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isFinishedMode) return;

    // Handle Map Photo manipulation
    if (mapPhotoGestureRef.current.isManipulating) {
      const bounds = getEffectiveMapBounds();
      if (mapPhotoGestureRef.current.mode === 'drag' && e.touches.length === 1) {
        const touch = e.touches[0];
        const norm = clientToNormalized(touch.clientX, touch.clientY);
        if (norm) {
          const deltaNormX = norm.normX - mapPhotoGestureRef.current.startNormX;
          const deltaNormY = norm.normY - mapPhotoGestureRef.current.startNormY;
          const newOffsetX = mapPhotoGestureRef.current.initialOffsetX + deltaNormX / bounds.width;
          const newOffsetY = mapPhotoGestureRef.current.initialOffsetY + deltaNormY / bounds.height;
          onUpdateMapCrop?.({
            photoOffsetX: Math.max(-3.0, Math.min(3.0, newOffsetX)),
            photoOffsetY: Math.max(-3.0, Math.min(3.0, newOffsetY)),
          });
        }
        return;
      } else if (mapPhotoGestureRef.current.mode === 'pinch' && e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (mapPhotoGestureRef.current.initialDist > 0) {
          const scaleMultiplier = dist / mapPhotoGestureRef.current.initialDist;
          const newScale = Math.max(0.4, Math.min(6.0, mapPhotoGestureRef.current.initialScale * scaleMultiplier));

          const norm1 = clientToNormalized(t1.clientX, t1.clientY);
          const norm2 = clientToNormalized(t2.clientX, t2.clientY);
          let newOffsetX = mapPhotoGestureRef.current.initialOffsetX;
          let newOffsetY = mapPhotoGestureRef.current.initialOffsetY;
          if (norm1 && norm2) {
            const midX = (norm1.normX + norm2.normX) / 2;
            const midY = (norm1.normY + norm2.normY) / 2;
            const deltaNormX = midX - mapPhotoGestureRef.current.startNormX;
            const deltaNormY = midY - mapPhotoGestureRef.current.startNormY;
            newOffsetX = Math.max(-3.0, Math.min(3.0, mapPhotoGestureRef.current.initialOffsetX + deltaNormX / bounds.width));
            newOffsetY = Math.max(-3.0, Math.min(3.0, mapPhotoGestureRef.current.initialOffsetY + deltaNormY / bounds.height));
          }

          onUpdateMapCrop?.({
            photoScale: newScale,
            photoOffsetX: newOffsetX,
            photoOffsetY: newOffsetY,
          });
        }
        return;
      }
    }

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
    mapPhotoGestureRef.current = {
      isManipulating: false,
      mode: 'none',
      startNormX: 0,
      startNormY: 0,
      initialOffsetX: 0,
      initialOffsetY: 0,
      initialScale: 1.0,
      initialDist: 0,
    };
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
      // Check if user touched inside Map Panel in photo mode
      if (
        mapSegmentRef.current &&
        mapSegmentRef.current.mode === 'photo' &&
        mapSegmentRef.current.photoImage &&
        isPointInMapPanel(norm.normX, norm.normY)
      ) {
        onSelectStamp(null);
        setActiveManipulatingId(null);
        mapPhotoGestureRef.current = {
          isManipulating: true,
          mode: 'drag',
          startNormX: norm.normX,
          startNormY: norm.normY,
          initialOffsetX: mapSegmentRef.current.photoOffsetX ?? 0,
          initialOffsetY: mapSegmentRef.current.photoOffsetY ?? 0,
          initialScale: mapSegmentRef.current.photoScale ?? 1.0,
          initialDist: 0,
        };
        return;
      }

      onSelectStamp(null);
      setActiveManipulatingId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isFinishedMode || e.pointerType === 'touch') return;

    // Handle desktop pointer drag for map photo
    if (mapPhotoGestureRef.current.isManipulating && mapPhotoGestureRef.current.mode === 'drag') {
      const norm = clientToNormalized(e.clientX, e.clientY);
      if (norm) {
        const bounds = getEffectiveMapBounds();
        const deltaNormX = norm.normX - mapPhotoGestureRef.current.startNormX;
        const deltaNormY = norm.normY - mapPhotoGestureRef.current.startNormY;
        const newOffsetX = mapPhotoGestureRef.current.initialOffsetX + deltaNormX / bounds.width;
        const newOffsetY = mapPhotoGestureRef.current.initialOffsetY + deltaNormY / bounds.height;
        onUpdateMapCrop?.({
          photoOffsetX: Math.max(-3.0, Math.min(3.0, newOffsetX)),
          photoOffsetY: Math.max(-3.0, Math.min(3.0, newOffsetY)),
        });
      }
      return;
    }

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
    mapPhotoGestureRef.current = {
      isManipulating: false,
      mode: 'none',
      startNormX: 0,
      startNormY: 0,
      initialOffsetX: 0,
      initialOffsetY: 0,
      initialScale: 1.0,
      initialDist: 0,
    };
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
    if (currentSelected) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.02 : -0.02;
      const newScale = Math.max(0.08, Math.min(0.85, currentSelected.scale + delta));
      onUpdateStamp({
        ...currentSelected,
        scale: newScale,
      });
      return;
    }

    // Allow wheel zoom for Map Photo in Photo mode
    if (mapSegmentRef.current && mapSegmentRef.current.mode === 'photo' && mapSegmentRef.current.photoImage) {
      const norm = clientToNormalized(e.clientX, e.clientY);
      if (norm && isPointInMapPanel(norm.normX, norm.normY)) {
        e.preventDefault();
        const currentScale = mapSegmentRef.current.photoScale ?? 1.0;
        const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
        const newScale = Math.max(0.4, Math.min(6.0, currentScale + zoomDelta));
        onUpdateMapCrop?.({ photoScale: newScale });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id="canvas-container"
      className="relative flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-3"
    >
      {/* Minimal Photo Crop Adjustment HUD Status */}
      {mapSegment?.mode === 'photo' && mapSegment.photoImage && !isFinishedMode && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-[11px] font-medium shadow-lg animate-in fade-in duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>写真調整中</span>
          <span className="text-[10px] text-neutral-400">（ドラッグ移動 / ピンチ拡大縮小）</span>
        </div>
      )}
      {/* Minimal Video Replace HUD Status / Error */}
      {mapSegment?.mode === 'video' && !isFinishedMode && (
        <div className={`absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950/90 backdrop-blur-md border shadow-lg animate-in fade-in duration-200 text-[11px] font-medium ${
          mapSegment.videoError
            ? 'border-red-500/70 text-red-300'
            : 'border-sky-500/50 text-sky-300'
        }`}>
          {mapSegment.videoError ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-red-300 font-semibold">{mapSegment.videoError}</span>
            </>
          ) : mapSegment.isVideoLoaded ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>動画プレビュー再生中 (無音・1回再生)</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>動画を読み込み中…</span>
            </>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        id="heal3-canvas"
        width={Math.round(displayMetrics.width * displayMetrics.dpr)}
        height={Math.round(displayMetrics.height * displayMetrics.dpr)}
        style={{
          width: `${displayMetrics.width}px`,
          height: `${displayMetrics.height}px`,
          maxWidth: `${displayMetrics.width}px`,
          maxHeight: `${displayMetrics.height}px`,
          minWidth: `${displayMetrics.width}px`,
          minHeight: `${displayMetrics.height}px`,
          aspectRatio: `${baseImage.aspectRatio || (720 / 1280)}`,
        }}
        className="flex-shrink-0 rounded-2xl shadow-2xl bg-neutral-950 touch-none cursor-pointer border border-neutral-800/60"
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
