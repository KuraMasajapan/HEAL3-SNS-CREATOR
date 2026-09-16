/**
 * HEAL3 SNS-Creator - Smartphone Core Drawing, Animation & Background Export Engine PoC
 * 
 * Main Application Coordinator
 */

import { useCallback, useEffect, useState } from 'react';
import { BaseImageState, DeveloperInfoData, MotionId, SceneMotionId, StampItem, StampType } from './engine/types.ts';
import { calculateExportDimensions, ExportQuality, QUALITY_PRESETS } from './engine/config.ts';
import { createForegroundItem, loadPresetImage, SAMPLE_AVATAR_DATA_URL, SAMPLE_PRESETS, SamplePreset } from './engine/sampleImages.ts';
import { detectDeviceBrowser, getCurrentViewportDimensions, initViewportHeightSync, processUserImage } from './engine/viewport.ts';
import { checkWebCodecsSupport, exportArtwork, PreferredExportMode } from './engine/exporter.ts';
import { SCENE_MOTION_RECIPES } from './engine/motion.ts';
import CanvasStage from './components/CanvasStage.tsx';
import Header from './components/Header.tsx';
import Toolbar from './components/Toolbar.tsx';
import FinishView from './components/FinishView.tsx';
import DeveloperInfoModal from './components/DeveloperInfoModal.tsx';

// Initial sample stamps for instant live demonstration
const INITIAL_STAMPS: StampItem[] = [
  {
    id: 'stamp-1',
    type: 'star',
    x: 0.32,
    y: 0.38,
    scale: 0.24,
    rotation: -12,
    motionId: 'bounce',
    motionSpeed: 1.0,
    motionOffsetMs: 0,
    color: '#FACC15',
    accentColor: '#FEF08A',
  },
  {
    id: 'stamp-2',
    type: 'heart',
    x: 0.68,
    y: 0.42,
    scale: 0.22,
    rotation: 14,
    motionId: 'pulse',
    motionSpeed: 1.0,
    motionOffsetMs: 400,
    color: '#FB7185',
    accentColor: '#FDA4AF',
  },
];

export default function App() {
  // BASE image state
  const [baseImage, setBaseImage] = useState<BaseImageState>({
    image: null,
    originalWidth: 720,
    originalHeight: 1280,
    processedWidth: 720,
    processedHeight: 1280,
    aspectRatio: 720 / 1280,
    isLoaded: false,
  });

  // Scene Motion state (None, Fade In, Gentle Zoom, Fade + Zoom, Dramatic Entrance)
  const [sceneMotionId, setSceneMotionId] = useState<SceneMotionId>('none');
  const [sceneMotionTrigger, setSceneMotionTrigger] = useState<number>(0);

  // Stamps & Foreground Items collection (normalized coordinates)
  const [stamps, setStamps] = useState<StampItem[]>(INITIAL_STAMPS);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);

  // Workflow state
  const [isFinishedMode, setIsFinishedMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [preferredExportMode, setPreferredExportMode] = useState<PreferredExportMode>('auto');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('current');

  // Calculate planned export dimensions to avoid resolution mismatch display
  const plannedDims = calculateExportDimensions(
    baseImage.processedWidth || baseImage.originalWidth || 720,
    baseImage.processedHeight || baseImage.originalHeight || 1280,
    exportQuality
  );

  // Developer diagnostics info
  const [isDevInfoOpen, setIsDevInfoOpen] = useState(false);
  const [devInfo, setDevInfo] = useState<DeveloperInfoData>(() => {
    const vp = typeof window !== 'undefined' ? getCurrentViewportDimensions() : {
      windowWidth: 375,
      windowHeight: 812,
      visualViewportScale: 1.0,
      dpr: 2.0,
    };
    return {
      deviceBrowserInfo: typeof window !== 'undefined' ? detectDeviceBrowser() : 'Browser',
      viewportWidth: vp.windowWidth,
      viewportHeight: vp.windowHeight,
      visualViewportScale: vp.visualViewportScale,
      devicePixelRatio: vp.dpr,
      canvasBufferWidth: 720,
      canvasBufferHeight: 1280,
      canvasDisplayWidth: 360,
      canvasDisplayHeight: 640,
      baseOriginalWidth: 720,
      baseOriginalHeight: 1280,
      baseProcessedWidth: 720,
      baseProcessedHeight: 1280,
      fps: 60,
      exportFps: null,
      stampCount: INITIAL_STAMPS.length,
      exportQuality: 'current',
      requestedBitrate: QUALITY_PRESETS.current.bitrateLabel,
      exportTimeMs: null,
      exportFileSize: null,
      exportMethod: null,
      exportMimeType: null,
      outputResolution: `${plannedDims.width} × ${plannedDims.height} px (予定)`,
      isGifFallback: false,
      gifFallbackReason: null,
      webCodecsAvailable: false,
      webCodecsH264Available: false,
      sceneMotion: SCENE_MOTION_RECIPES.none.nameJa,
      foregroundItemCount: 0,
    };
  });

  // Check WebCodecs capabilities, start viewport height synchronization & load initial preset image on mount
  useEffect(() => {
    const cleanupViewportSync = initViewportHeightSync();

    checkWebCodecsSupport().then((status) => {
      setDevInfo((prev) => ({
        ...prev,
        webCodecsAvailable: status.hasVideoEncoder,
        webCodecsH264Available: status.hasH264,
      }));
    });

    loadPresetImage(SAMPLE_PRESETS[0])
      .then((loaded) => setBaseImage(loaded))
      .catch((err) => console.error('Failed to load initial preset:', err));

    return () => {
      cleanupViewportSync();
    };
  }, []);

  // Update dev metrics
  const handleFpsUpdate = useCallback((fps: number) => {
    setDevInfo((prev) => ({ ...prev, fps }));
  }, []);

  const handleCanvasMetricsUpdate = useCallback(
    (bufferW: number, bufferH: number, dispW: number, dispH: number) => {
      setDevInfo((prev) => ({
        ...prev,
        canvasBufferWidth: bufferW,
        canvasBufferHeight: bufferH,
        canvasDisplayWidth: dispW,
        canvasDisplayHeight: dispH,
      }));
    },
    []
  );

  const refreshViewportMetrics = useCallback(() => {
    const vp = getCurrentViewportDimensions();
    const fgCount = stamps.filter((s) => s.isForeground || s.type === 'foreground_image').length;
    const currentPlanned = calculateExportDimensions(
      baseImage.processedWidth || baseImage.originalWidth || 720,
      baseImage.processedHeight || baseImage.originalHeight || 1280,
      exportQuality
    );

    setDevInfo((prev) => ({
      ...prev,
      deviceBrowserInfo: detectDeviceBrowser(),
      viewportWidth: vp.windowWidth,
      viewportHeight: vp.windowHeight,
      visualViewportScale: vp.visualViewportScale,
      devicePixelRatio: vp.dpr,
      stampCount: stamps.length,
      foregroundItemCount: fgCount,
      sceneMotion: SCENE_MOTION_RECIPES[sceneMotionId]?.nameJa || 'なし',
      baseOriginalWidth: baseImage.originalWidth,
      baseOriginalHeight: baseImage.originalHeight,
      baseProcessedWidth: baseImage.processedWidth,
      baseProcessedHeight: baseImage.processedHeight,
      outputResolution: prev.outputResolution && !prev.outputResolution.includes('予定')
        ? prev.outputResolution
        : `${currentPlanned.width} × ${currentPlanned.height} px (予定)`,
    }));
  }, [stamps, baseImage, exportQuality, sceneMotionId]);

  useEffect(() => {
    refreshViewportMetrics();
    window.addEventListener('resize', refreshViewportMetrics);
    return () => window.removeEventListener('resize', refreshViewportMetrics);
  }, [refreshViewportMetrics]);

  // Stamp manipulation handlers
  const handleAddStamp = (type: StampType) => {
    const defaultMotion: MotionId = type === 'star' ? 'bounce' : type === 'heart' ? 'pulse' : 'rotate';
    const defaultColor = type === 'star' ? '#FACC15' : type === 'heart' ? '#FB7185' : '#38BDF8';
    const defaultAccent = type === 'star' ? '#FEF08A' : type === 'heart' ? '#FDA4AF' : '#BAE6FD';

    const jitterX = (Math.random() - 0.5) * 0.15;
    const jitterY = (Math.random() - 0.5) * 0.15;

    const newStamp: StampItem = {
      id: `stamp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      x: Math.max(0.2, Math.min(0.8, 0.5 + jitterX)),
      y: Math.max(0.2, Math.min(0.8, 0.5 + jitterY)),
      scale: 0.22,
      rotation: Math.round((Math.random() - 0.5) * 20),
      motionId: defaultMotion,
      motionSpeed: 1.0,
      motionOffsetMs: Math.round(Math.random() * 600),
      color: defaultColor,
      accentColor: defaultAccent,
    };

    setStamps((prev) => [...prev, newStamp]);
    setSelectedStampId(newStamp.id);
  };

  // Foreground Avatar PoC Handlers
  const handleAddForegroundSample = async () => {
    try {
      const item = await createForegroundItem(SAMPLE_AVATAR_DATA_URL, 0.44);
      setStamps((prev) => [...prev, item]);
      setSelectedStampId(item.id);
    } catch (err) {
      console.error('Failed to create sample foreground item:', err);
    }
  };

  const handleAddForegroundFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          const item = await createForegroundItem(dataUrl, 0.44);
          setStamps((prev) => [...prev, item]);
          setSelectedStampId(item.id);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || '透過画像の読み込みに失敗しました');
    }
  };

  const handleUpdateStamp = (updated: StampItem) => {
    setStamps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleUpdateStampMotion = (motionId: MotionId) => {
    if (!selectedStampId) return;
    setStamps((prev) =>
      prev.map((s) => (s.id === selectedStampId ? { ...s, motionId } : s))
    );
  };

  const handleUpdateStampScale = (newScale: number) => {
    if (!selectedStampId) return;
    setStamps((prev) =>
      prev.map((s) => (s.id === selectedStampId ? { ...s, scale: newScale } : s))
    );
  };

  const handleUpdateStampColor = (color: string) => {
    if (!selectedStampId) return;
    setStamps((prev) =>
      prev.map((s) => (s.id === selectedStampId ? { ...s, color, accentColor: color } : s))
    );
  };

  const handleDeleteSelectedStamp = () => {
    if (!selectedStampId) return;
    setStamps((prev) => prev.filter((s) => s.id !== selectedStampId));
    setSelectedStampId(null);
  };

  // Background export trigger
  const runExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText('書き出しを準備中…');
    setExportError(null);

    try {
      const result = await exportArtwork(
        baseImage,
        stamps,
        sceneMotionId,
        preferredExportMode,
        exportQuality,
        (percent, text) => {
          setExportProgress(percent);
          setExportStatusText(text);
        }
      );

      setExportResult(result);
      setDevInfo((prev) => ({
        ...prev,
        exportQuality: result.quality,
        requestedBitrate: result.requestedBitrate,
        exportTimeMs: result.durationMs,
        exportFps: result.exportFps,
        exportFileSize: `${(result.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        exportMethod: result.method,
        exportMimeType: result.mimeType,
        outputResolution: `${result.width} × ${result.height} px`,
        isGifFallback: result.isGifFallback,
        gifFallbackReason: result.fallbackReason || null,
      }));
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportError(err.message || '書き出し処理中にエラーが発生しました');
    } finally {
      setIsExporting(false);
    }
  }, [baseImage, stamps, sceneMotionId, preferredExportMode, exportQuality]);

  // Handle "完成" (Finish)
  const handleFinishClick = () => {
    setIsFinishedMode(true);
    setSelectedStampId(null);
    runExport();
  };

  // User selects image from Photo Library
  const handleSelectUserFile = async (file: File) => {
    try {
      const processed = await processUserImage(file);
      setBaseImage(processed);
      refreshViewportMetrics();
    } catch (err: any) {
      alert(err.message || '画像の処理に失敗しました');
    }
  };

  // User selects sample preset
  const handleSelectPreset = async (preset: SamplePreset) => {
    try {
      const loaded = await loadPresetImage(preset);
      setBaseImage(loaded);
      refreshViewportMetrics();
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedStamp = stamps.find((s) => s.id === selectedStampId) || null;

  return (
    <div
      id="app-root"
      style={{
        height: 'var(--app-height, 100dvh)',
        maxHeight: 'var(--app-height, 100dvh)',
      }}
      className="flex flex-col w-full overflow-hidden bg-neutral-950 text-neutral-100 font-sans select-none"
    >
      {/* Header bar */}
      <Header
        isFinishedMode={isFinishedMode}
        onFinishClick={handleFinishClick}
        onSelectUserFile={handleSelectUserFile}
        onSelectPreset={handleSelectPreset}
        onToggleDevInfo={() => setIsDevInfoOpen(!isDevInfoOpen)}
        isDevInfoOpen={isDevInfoOpen}
      />

      {/* Main Canvas Viewport Area - min-h-0 ensures canvas shrinks appropriately when toolbar expands */}
      <main className="flex-1 min-h-0 relative w-full flex items-center justify-center overflow-hidden">
        <CanvasStage
          baseImage={baseImage}
          stamps={stamps}
          selectedStampId={selectedStampId}
          sceneMotionId={sceneMotionId}
          sceneMotionTrigger={sceneMotionTrigger}
          isFinishedMode={isFinishedMode}
          onSelectStamp={setSelectedStampId}
          onUpdateStamp={handleUpdateStamp}
          onFpsUpdate={handleFpsUpdate}
          onCanvasMetricsUpdate={handleCanvasMetricsUpdate}
        />
      </main>

      {/* Bottom controls: Toolbar when in edit mode, FinishView when finished */}
      {!isFinishedMode ? (
        <Toolbar
          stamps={stamps}
          selectedStamp={selectedStamp}
          sceneMotionId={sceneMotionId}
          onUpdateSceneMotion={(id) => {
            setSceneMotionId(id);
            setSceneMotionTrigger(Date.now());
            setDevInfo((prev) => ({
              ...prev,
              sceneMotion: SCENE_MOTION_RECIPES[id]?.nameJa || 'なし',
            }));
          }}
          onAddStamp={handleAddStamp}
          onAddForegroundSample={handleAddForegroundSample}
          onAddForegroundFile={handleAddForegroundFile}
          onUpdateStampMotion={handleUpdateStampMotion}
          onUpdateStampColor={handleUpdateStampColor}
          onUpdateStampScale={handleUpdateStampScale}
          onDeleteSelectedStamp={handleDeleteSelectedStamp}
          onDeselect={() => setSelectedStampId(null)}
        />
      ) : (
        <FinishView
          isExporting={isExporting}
          exportProgress={exportProgress}
          exportStatusText={exportStatusText}
          exportResult={exportResult}
          exportError={exportError}
          onBackToEdit={() => setIsFinishedMode(false)}
          onRetryExport={runExport}
        />
      )}

      {/* Developer Diagnostics Modal */}
      <DeveloperInfoModal
        isOpen={isDevInfoOpen}
        onClose={() => setIsDevInfoOpen(false)}
        devInfo={devInfo}
        preferredMode={preferredExportMode}
        onSelectPreferredMode={setPreferredExportMode}
        exportQuality={exportQuality}
        onSelectExportQuality={(q) => {
          setExportQuality(q);
          const newPlanned = calculateExportDimensions(
            baseImage.processedWidth || baseImage.originalWidth || 720,
            baseImage.processedHeight || baseImage.originalHeight || 1280,
            q
          );
          setDevInfo((prev) => ({
            ...prev,
            exportQuality: q,
            requestedBitrate: QUALITY_PRESETS[q].bitrateLabel,
            outputResolution: prev.outputResolution && !prev.outputResolution.includes('予定')
              ? prev.outputResolution
              : `${newPlanned.width} × ${newPlanned.height} px (予定)`,
          }));
        }}
        onRefreshMetrics={refreshViewportMetrics}
      />
    </div>
  );
}
