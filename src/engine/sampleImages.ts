/**
 * HEAL3 SNS-Creator - Preset Sample Images
 * 
 * Generates local SVG data-URLs for instant offline testing,
 * representing typical SNS photo ratios (9:16 vertical story format and 4:5 portrait).
 */

import { BaseImageState } from './types.ts';

function createGradientSvgDataUrl(
  width: number,
  height: number,
  title: string,
  color1: string,
  color2: string
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.35" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <rect width="${width}" height="${height}" fill="url(#glow)" />
      
      <!-- Minimalist geometric lifestyle aesthetic -->
      <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${width * 0.28}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="3" />
      <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${width * 0.20}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
      <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${width * 0.08}" fill="rgba(255,255,255,0.25)" />

      <!-- Horizon line -->
      <line x1="${width * 0.15}" y1="${height * 0.72}" x2="${width * 0.85}" y2="${height * 0.72}" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
      
      <!-- Text label -->
      <text x="${width * 0.5}" y="${height * 0.78}" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" letter-spacing="4">${title}</text>
      <text x="${width * 0.5}" y="${height * 0.82}" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-family="system-ui, -apple-system, sans-serif" font-size="16" letter-spacing="2">HEAL3 LIFESTYLE BASE</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface SamplePreset {
  id: string;
  name: string;
  ratioName: string;
  width: number;
  height: number;
  dataUrl: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'sunset_9_16',
    name: 'Twilight Dusk',
    ratioName: '9:16 (Story/Reel)',
    width: 720,
    height: 1280,
    dataUrl: createGradientSvgDataUrl(720, 1280, 'TWILIGHT SERENITY', '#312e81', '#f43f5e'),
  },
  {
    id: 'emerald_4_5',
    name: 'Nordic Forest',
    ratioName: '4:5 (Instagram Post)',
    width: 800,
    height: 1000,
    dataUrl: createGradientSvgDataUrl(800, 1000, 'NORDIC MORNING', '#064e3b', '#0ea5e9'),
  },
  {
    id: 'cyber_1_1',
    name: 'Cyber Aura',
    ratioName: '1:1 (Square)',
    width: 800,
    height: 800,
    dataUrl: createGradientSvgDataUrl(800, 800, 'CYBER GLOW', '#1e1b4b', '#a855f7'),
  },
];

export function loadPresetImage(preset: SamplePreset): Promise<BaseImageState> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        image: img,
        originalWidth: preset.width,
        originalHeight: preset.height,
        processedWidth: preset.width,
        processedHeight: preset.height,
        aspectRatio: preset.width / preset.height,
        isLoaded: true,
      });
    };
    img.onerror = () => reject(new Error('プリセット画像の読み込みに失敗しました'));
    img.src = preset.dataUrl;
  });
}
