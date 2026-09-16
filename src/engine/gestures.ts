/**
 * HEAL3 SNS-Creator - Multi-touch & Pointer Gesture Controller
 * 
 * Translates mobile touch inputs (drag, pinch-to-zoom, two-finger rotation)
 * and pointer interactions directly into normalized virtual canvas coordinates.
 */

import { StampItem } from './types.ts';

export interface GestureState {
  activeStampId: string | null;
  isManipulating: boolean;
  mode: 'drag' | 'pinch_rotate' | 'rotate_handle' | 'none';
  initialTouchDistance: number;
  initialTouchAngle: number;
  initialStampScale: number;
  initialStampRotation: number;
  initialStampX: number;
  initialStampY: number;
  startNormalizedX: number;
  startNormalizedY: number;
}

export function createInitialGestureState(): GestureState {
  return {
    activeStampId: null,
    isManipulating: false,
    mode: 'none',
    initialTouchDistance: 0,
    initialTouchAngle: 0,
    initialStampScale: 1.0,
    initialStampRotation: 0,
    initialStampX: 0,
    initialStampY: 0,
    startNormalizedX: 0,
    startNormalizedY: 0,
  };
}

/**
 * Calculates Euclidean distance between two touch points
 */
function getDistance(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.hypot(dx, dy);
}

/**
 * Calculates angle in degrees between two touch points
 */
function getAngle(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Find which stamp was tapped / touched by checking distance in normalized space
 * Checks in reverse order (topmost layer first)
 */
export function hitTestStamp(
  normX: number,
  normY: number,
  stamps: StampItem[],
  aspectRatio: number
): StampItem | null {
  for (let i = stamps.length - 1; i >= 0; i--) {
    const stamp = stamps[i];
    // Scale distance checking based on aspect ratio
    const dx = (normX - stamp.x);
    // Since scale is relative to min dimension, adjust for aspect ratio
    const dy = (normY - stamp.y);
    const dist = Math.hypot(dx, dy * (aspectRatio >= 1 ? 1 : 1 / aspectRatio));
    
    // Hit radius based on stamp scale
    const hitRadius = stamp.scale * 0.65;
    if (dist <= hitRadius) {
      return stamp;
    }
  }
  return null;
}

/**
 * Checks if the click/touch hit the rotation handle above a selected stamp
 */
export function hitTestRotateHandle(
  normX: number,
  normY: number,
  stamp: StampItem,
  aspectRatio: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const minDim = Math.min(canvasWidth, canvasHeight);
  const stampPxX = stamp.x * canvasWidth;
  const stampPxY = stamp.y * canvasHeight;
  const stampRadiusPx = (stamp.scale * minDim * 0.5);
  const armLenPx = Math.max(22, minDim * 0.04);
  const handleRadiusPx = Math.max(16, minDim * 0.03); // generous touch target

  // Calculate handle position in pixel space taking stamp rotation into account
  const rad = (stamp.rotation * Math.PI) / 180;
  const handleLocalY = -stampRadiusPx * 1.075 - armLenPx;
  
  const handlePxX = stampPxX - Math.sin(rad) * handleLocalY;
  const handlePxY = stampPxY + Math.cos(rad) * handleLocalY;

  const tapPxX = normX * canvasWidth;
  const tapPxY = normY * canvasHeight;

  return Math.hypot(tapPxX - handlePxX, tapPxY - handlePxY) <= handleRadiusPx;
}
