/**
 * HEAL3 SNS-Creator - Viewport & Device Resolution Manager
 * 
 * Adapts to dynamic mobile viewports, Visual Viewport changes,
 * safe-area insets, and devicePixelRatio safely.
 */

import { BaseImageState } from './types.ts';
import { POC_CONFIG } from './config.ts';

export interface ViewportDimensions {
  windowWidth: number;
  windowHeight: number;
  visualViewportWidth: number;
  visualViewportHeight: number;
  visualViewportScale: number;
  dpr: number;
  safeAreaTop: number;
  safeAreaBottom: number;
}

/**
 * Detect client operating system and browser for debugging diagnostics
 */
export function detectDeviceBrowser(): string {
  if (typeof window === 'undefined' || !navigator.userAgent) {
    return 'Unknown Environment';
  }
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS/.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua);

  if (isIOS) {
    const versionMatch = ua.match(/OS (\d+[_.\d]*)/);
    const osVer = versionMatch ? versionMatch[1].replace(/_/g, '.') : '';
    return `iPhone / iOS ${osVer} (${isSafari ? 'Mobile Safari' : isChrome ? 'Chrome for iOS' : 'Webview'})`;
  }
  if (isAndroid) {
    const androidMatch = ua.match(/Android (\d+[\.\d]*)/);
    const ver = androidMatch ? androidMatch[1] : '';
    return `Android ${ver} (${isChrome ? 'Chrome' : 'Browser'})`;
  }
  return navigator.userAgent.split(' ')[0] || 'Desktop Browser';
}

export function getCurrentViewportDimensions(): ViewportDimensions {
  const vv = window.visualViewport;
  return {
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    visualViewportWidth: vv ? vv.width : window.innerWidth,
    visualViewportHeight: vv ? vv.height : window.innerHeight,
    visualViewportScale: vv ? vv.scale : 1.0,
    // Cap DPR at configurable safeguard on mobile to avoid Safari WebGL/Canvas memory exhaustion
    dpr: Math.min(window.devicePixelRatio || 1, POC_CONFIG.DPR_CAP),
    safeAreaTop: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10),
    safeAreaBottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0', 10),
  };
}

/**
 * Synchronizes the actual visible viewport height with a CSS custom property `--app-height`.
 * This handles dynamic iOS Safari navigation bar showing/hiding, keyboard, and visual viewport changes,
 * guaranteeing that flex containers never exceed the actual visible area on mobile.
 */
export function initViewportHeightSync(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const update = () => {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
  };

  update();

  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
  }

  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', update);
      window.visualViewport.removeEventListener('scroll', update);
    }
  };
}

/**
 * Calculates canvas display size (CSS pixels) fitting inside container
 * while strictly maintaining the Base Image's aspect ratio.
 */
export function calculateCanvasDisplaySize(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number
): { displayWidth: number; displayHeight: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { displayWidth: 320, displayHeight: 480 };
  }

  let width = containerWidth;
  let height = containerWidth / aspectRatio;

  if (height > containerHeight) {
    height = containerHeight;
    width = containerHeight * aspectRatio;
  }

  return {
    displayWidth: Math.floor(width),
    displayHeight: Math.floor(height),
  };
}

/**
 * Safely downscales large user images (e.g. 4032x3024 iPhone camera captures)
 * to a processing resolution (max dimension 1280px) to prevent Safari memory crashes,
 * while strictly preserving the aspect ratio.
 */
export async function processUserImage(file: File): Promise<BaseImageState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像デコードに失敗しました'));
      img.onload = () => {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const aspectRatio = origW / origH;

        // Cap maximum processing dimension for mobile performance & memory safety (PoC configurable safeguard)
        const MAX_DIM = POC_CONFIG.MAX_IMAGE_DIMENSION;
        let procW = origW;
        let procH = origH;

        if (origW > MAX_DIM || origH > MAX_DIM) {
          if (origW >= origH) {
            procW = MAX_DIM;
            procH = Math.round(MAX_DIM / aspectRatio);
          } else {
            procH = MAX_DIM;
            procW = Math.round(MAX_DIM * aspectRatio);
          }
        }

        // Draw onto an offscreen canvas to produce a normalized downscaled image
        const offCanvas = document.createElement('canvas');
        offCanvas.width = procW;
        offCanvas.height = procH;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) {
          return resolve({
            image: img,
            originalWidth: origW,
            originalHeight: origH,
            processedWidth: origW,
            processedHeight: origH,
            aspectRatio,
            isLoaded: true,
          });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, procW, procH);

        const downscaledImg = new Image();
        downscaledImg.onload = () => {
          resolve({
            image: downscaledImg,
            originalWidth: origW,
            originalHeight: origH,
            processedWidth: procW,
            processedHeight: procH,
            aspectRatio,
            isLoaded: true,
          });
        };
        downscaledImg.src = offCanvas.toDataURL('image/jpeg', 0.92);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
