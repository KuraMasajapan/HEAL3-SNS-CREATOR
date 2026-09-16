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

function createHeal3ScreenMockDataUrl(
  type: 'white_hoodie' | 'black_bear'
): string {
  const width = 720;
  const height = 1280;
  const avatarName = type === 'white_hoodie' ? 'KuraMasa' : 'Yuki';
  const avatarRank = type === 'white_hoodie' ? 'S' : 'A';
  const hoodieColor = type === 'white_hoodie' ? '#f8fafc' : '#1e1b4b';
  const pantsColor = type === 'white_hoodie' ? '#334155' : '#0f172a';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="skyBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="40%" stop-color="#bae6fd" />
          <stop offset="70%" stop-color="#e0f2fe" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      
      <!-- HEAL3 Sky Background -->
      <rect width="${width}" height="${height}" fill="url(#skyBg)" />

      <!-- Left Map Section Simulation -->
      <rect x="20" y="80" width="310" height="960" rx="24" fill="#0f172a" fill-opacity="0.85" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="2" />
      <text x="40" y="130" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="700" font-size="20">GPS ROUTE</text>
      <path d="M 60 850 Q 120 700, 160 550 T 260 250" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" />
      <circle cx="260" cy="250" r="14" fill="#22c55e" stroke="#ffffff" stroke-width="3" />
      <circle cx="60" cy="850" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
      <text x="40" y="980" fill="#94a3b8" font-family="monospace" font-size="16">DIST: 5.42 km</text>

      <!-- Right 3D Character Section Simulation -->
      <!-- Avatar Ground Shadow -->
      <ellipse cx="540" cy="940" rx="90" ry="22" fill="#000000" fill-opacity="0.25" />

      <!-- Character Silhouette / Body (Human Anatomy for Segmentation) -->
      <!-- Legs & Sneakers -->
      <rect x="500" y="820" width="28" height="100" rx="12" fill="${pantsColor}" />
      <rect x="552" y="820" width="28" height="100" rx="12" fill="${pantsColor}" />
      <rect x="492" y="910" width="42" height="26" rx="8" fill="#e2e8f0" stroke="#0ea5e9" stroke-width="3" />
      <rect x="548" y="910" width="42" height="26" rx="8" fill="#e2e8f0" stroke="#0ea5e9" stroke-width="3" />

      <!-- Torso & Hoodie -->
      <path d="M 480 620 Q 470 780, 500 830 L 580 830 Q 610 780, 600 620 Z" fill="${hoodieColor}" stroke="#64748b" stroke-width="2" />
      
      <!-- Arms -->
      <path d="M 480 640 Q 450 720, 460 760" fill="none" stroke="${hoodieColor}" stroke-width="26" stroke-linecap="round" />
      <path d="M 600 640 Q 630 720, 620 760" fill="none" stroke="${hoodieColor}" stroke-width="26" stroke-linecap="round" />

      <!-- Head & Hair / Hoodie Hood -->
      <circle cx="540" cy="550" r="46" fill="#fed7aa" />
      <circle cx="540" cy="530" r="54" fill="${hoodieColor}" />
      <circle cx="540" cy="550" r="40" fill="#fed7aa" />
      ${type === 'black_bear' ? `
        <!-- Bear Ears -->
        <circle cx="498" cy="485" r="16" fill="#1e1b4b" stroke="#f43f5e" stroke-width="2" />
        <circle cx="582" cy="485" r="16" fill="#1e1b4b" stroke="#f43f5e" stroke-width="2" />
      ` : ''}

      <!-- UI Text on the Right to Test Exclusion: KuraMasa, S, etc. -->
      <rect x="450" y="380" width="240" height="90" rx="16" fill="#0f172a" fill-opacity="0.8" stroke="#38bdf8" stroke-width="1.5" />
      <text x="470" y="420" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="24">${avatarName}</text>
      <rect x="630" y="395" width="44" height="30" rx="8" fill="#eab308" />
      <text x="644" y="417" fill="#000000" font-family="system-ui, sans-serif" font-weight="900" font-size="18">${avatarRank}</text>
      <text x="470" y="452" fill="#38bdf8" font-family="monospace" font-size="14">H-III GAUGE 100%</text>

      <!-- Bottom Badges / Items to Test Exclusion -->
      <rect x="360" y="1020" width="330" height="180" rx="20" fill="#1e293b" fill-opacity="0.9" stroke="#475569" stroke-width="1.5" />
      <text x="380" y="1060" fill="#94a3b8" font-family="system-ui, sans-serif" font-weight="600" font-size="16">EQUIPMENT &amp; STAMINA</text>
      <rect x="380" y="1080" width="80" height="80" rx="14" fill="#334155" />
      <rect x="480" y="1080" width="80" height="80" rx="14" fill="#334155" />
      <rect x="580" y="1080" width="80" height="80" rx="14" fill="#334155" />
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'heal3_white_hoodie',
    name: 'HEAL3 白パーカー (IMG_3714 相当)',
    ratioName: '9:16 (HEAL3 Screen)',
    width: 720,
    height: 1280,
    dataUrl: createHeal3ScreenMockDataUrl('white_hoodie'),
  },
  {
    id: 'heal3_black_bear',
    name: 'HEAL3 黒クマパーカー (1783473240817 相当)',
    ratioName: '9:16 (HEAL3 Screen)',
    width: 720,
    height: 1280,
    dataUrl: createHeal3ScreenMockDataUrl('black_bear'),
  },
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

/**
 * Creates a transparent SVG Data URL representing a cut-out HEAL3 avatar character
 * for instant foreground PoC testing.
 */
function createSampleAvatarSvgDataUrl(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#a855f7" />
        </linearGradient>
        <radialGradient id="visorGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="40%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </radialGradient>
        <filter id="aura" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#38bdf8" flood-opacity="0.5" />
        </filter>
      </defs>

      <!-- Outer Glow Silhouette -->
      <g filter="url(#aura)">
        <!-- Head / Helmet -->
        <circle cx="256" cy="175" r="95" fill="url(#suitGrad)" stroke="#ffffff" stroke-width="6" />
        
        <!-- Visor -->
        <ellipse cx="256" cy="175" rx="75" ry="52" fill="url(#visorGlow)" />
        <path d="M 210 160 Q 256 148 302 160 Q 256 166 210 160 Z" fill="#ffffff" opacity="0.8" />
        
        <!-- Torso / Jacket -->
        <path d="M 160 270 C 170 235 220 225 256 225 C 292 225 342 235 352 270 L 375 420 C 375 445 350 460 320 460 L 192 460 C 162 460 137 445 137 420 Z" fill="url(#suitGrad)" stroke="#ffffff" stroke-width="6" />
        
        <!-- Chest Emblem / HEAL3 Core -->
        <circle cx="256" cy="315" r="28" fill="#ffffff" opacity="0.95" />
        <polygon points="256,298 274,324 238,324" fill="#0284c7" />
        
        <!-- Collar & Accents -->
        <path d="M 215 235 L 256 280 L 297 235" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="256" y1="280" x2="256" y2="440" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-dasharray="8 6" />

        <!-- Shoulder Badges -->
        <circle cx="160" cy="290" r="14" fill="#38bdf8" stroke="#ffffff" stroke-width="3" />
        <circle cx="352" cy="290" r="14" fill="#a855f7" stroke="#ffffff" stroke-width="3" />
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Loads an HTMLImageElement from a URL or data URL
 */
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('画像の読み込みに失敗しました'));
    img.src = url;
  });
}

/**
 * Creates a Foreground Stamp Item (e.g. cut-out avatar) from an image URL or File
 */
export async function createForegroundItem(
  imageUrl: string,
  initialScale = 0.42
): Promise<import('./types.ts').StampItem> {
  const img = await loadImageElement(imageUrl);
  const aspect = img.naturalWidth / img.naturalHeight;

  return {
    id: `fg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'foreground_image',
    x: 0.5, // Centered horizontally
    y: 0.55, // Slightly lower for portrait balance
    scale: initialScale,
    rotation: 0,
    motionId: 'bounce', // Default to lively bounce to showcase foreground motion
    motionSpeed: 1.0,
    motionOffsetMs: 0,
    color: '#38bdf8',
    accentColor: '#818cf8',
    isForeground: true,
    imageUrl,
    imageElement: img,
    aspectRatio: aspect,
  };
}

export const SAMPLE_AVATAR_DATA_URL = createSampleAvatarSvgDataUrl();
