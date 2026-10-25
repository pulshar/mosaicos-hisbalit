import React, { useState, useRef, useEffect } from 'react';
import { SPACE_PRESETS } from '../data/spaces';
import { SpacePreset, PerspectiveTransformConfig, MotifDefinition, MotifCustomization, CompositionSettings } from '../types';
import { generateSimulationWallSvg, exportSimulationAsPng } from '../utils/exportUtils';
import {
  Download,
  Upload,
  Sliders,
  Move,
  Layers,
  Sparkles,
  Eye,
  Check,
  RefreshCw,
  Maximize2
} from 'lucide-react';

const getPerspectiveTransformStyle = (config?: PerspectiveTransformConfig): React.CSSProperties => {
  if (!config) return {};

  const transforms: string[] = [];
  if (config.perspective) transforms.push(`perspective(${config.perspective}px)`);
  if (config.rotateX) transforms.push(`rotateX(${config.rotateX}deg)`);
  if (config.rotateY) transforms.push(`rotateY(${config.rotateY}deg)`);
  if (config.rotateZ) transforms.push(`rotateZ(${config.rotateZ}deg)`);
  if (config.skewY) transforms.push(`skewY(${config.skewY}deg)`);
  if (config.scaleX || config.scaleY || config.scale) {
    const sx = (config.scaleX ?? 1) * (config.scale ?? 1);
    const sy = (config.scaleY ?? 1) * (config.scale ?? 1);
    transforms.push(`scale(${sx}, ${sy})`);
  }
  if (config.offsetX || config.offsetY) {
    transforms.push(`translate(${config.offsetX ?? 0}%, ${config.offsetY ?? 0}%)`);
  }

  return {
    transform: transforms.join(' '),
    transformOrigin: `${config.originX ?? '50%'} ${config.originY ?? '50%'}`,
    transformStyle: 'preserve-3d',
    willChange: 'transform'
  };
};

interface SpaceSimulatorProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  customizationsMap?: Record<string, MotifCustomization>;
  editedMotifIds?: Record<string, boolean>;
  onClose: () => void;
}

const STORAGE_KEY_SELECTED_SPACE = 'mosaico_studio_selected_space_id';

export const SpaceSimulator: React.FC<SpaceSimulatorProps> = ({
  motif,
  customization,
  composition,
  customizationsMap = {},
  editedMotifIds = {},
  onClose
}) => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTED_SPACE);
      if (saved && SPACE_PRESETS.some(s => s.id === saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return SPACE_PRESETS[0].id;
  });
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [customAspectRatio, setCustomAspectRatio] = useState<number | null>(null);
  const [customIsOverlay, setCustomIsOverlay] = useState<boolean>(false);

  // Active space preset
  const activePreset = SPACE_PRESETS.find(s => s.id === selectedSpaceId) || SPACE_PRESETS[0];
  const isForegroundOverlay = customPhotoUrl ? customIsOverlay : Boolean(activePreset.isForegroundOverlay);

  const [scale, setScale] = useState<number>(() => activePreset.defaultScale ?? 1.0);
  const [blendMode, setBlendMode] = useState<'multiply' | 'normal'>(() => activePreset.blendMode ?? 'normal');
  const [opacity, setOpacity] = useState<number>(1);
  const [isAdjustingSurface, setIsAdjustingSurface] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [pendingSpaceId, setPendingSpaceId] = useState<string | null>(null);
  const [loadingPresetTitle, setLoadingPresetTitle] = useState<string | null>(null);
  const switchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Clean up any pending switch timer on unmount
  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  // Dedicated switch handler: loader appears FIRST and old space fades out, then 200ms later the new space loads
  const handleSelectSpace = (preset: SpacePreset) => {
    if (preset.id === selectedSpaceId && !customPhotoUrl) return;

    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
    }

    // 1. Immediately activate loader with target title and begin fading out current space
    setPendingSpaceId(preset.id);
    setLoadingPresetTitle(preset.surfaceLabel || preset.name);
    setIsImageLoading(true);

    // 2. Wait 200ms so the loader and fade-out happen FIRST before swapping the image and geometry
    switchTimerRef.current = setTimeout(() => {
      setCustomPhotoUrl(null);
      setSelectedSpaceId(preset.id);
      setPendingSpaceId(null);
    }, 200);
  };

  // Polygon points in % coordinates [[x, y], ...]
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(() => activePreset.polygonPoints);

  // Persist the selected space to localStorage whenever it changes
  useEffect(() => {
    if (selectedSpaceId && !customPhotoUrl) {
      try {
        localStorage.setItem(STORAGE_KEY_SELECTED_SPACE, selectedSpaceId);
      } catch {
        // ignore
      }
    }
  }, [selectedSpaceId, customPhotoUrl]);

  // When changing space preset, update polygon points
  useEffect(() => {
    if (!customPhotoUrl) {
      setPolygonPoints(activePreset.polygonPoints);
      setScale(activePreset.defaultScale);
      setBlendMode(activePreset.blendMode);
    }
  }, [selectedSpaceId, customPhotoUrl]);

  const activeImageUrl = customPhotoUrl || activePreset.image;

  // Smooth preloading and transition when switching spaces (guaranteed min 1 second for a calm, polished transition)
  useEffect(() => {
    // Avoid triggering loading animation on initial mount (e.g. toggling from composition tab)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    let isMounted = true;
    setIsImageLoading(true);

    const startTime = Date.now();
    const MIN_LOADING_MS = 1000; // Always guarantee at least 1 second

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImageUrl;

    const finishLoading = () => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_MS - elapsed);

      setTimeout(() => {
        if (isMounted) {
          setIsImageLoading(false);
          setLoadingPresetTitle(null);
        }
      }, remainingTime);
    };

    if (img.complete && img.naturalWidth > 0) {
      finishLoading();
    } else {
      img.onload = finishLoading;
      img.onerror = () => {
        if (isMounted) finishLoading();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [selectedSpaceId, customPhotoUrl, activeImageUrl]);

  // Aspect ratio calculation
  const presetAspectParts = (activePreset.aspectRatio || '16/9').split('/').map(Number);
  const presetAspect = (presetAspectParts[0] && presetAspectParts[1]) ? presetAspectParts[0] / presetAspectParts[1] : 16 / 9;
  const currentAspectRatio = (customPhotoUrl && customAspectRatio) ? customAspectRatio : presetAspect;

  // Generate continuous, seamless simulation SVG with all piece colors, cadences and rotations preserved
  const simulationSvgStr = generateSimulationWallSvg(
    motif,
    customization,
    composition,
    currentAspectRatio,
    scale,
    customizationsMap,
    editedMotifIds
  );
  const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(simulationSvgStr)}`;

  // File upload handler for custom room photo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageLoading(true);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setCustomAspectRatio(img.naturalWidth / img.naturalHeight);
        }
        setCustomPhotoUrl(url);
        // Set reasonable default polygon covering center wall/floor
        setPolygonPoints([
          [20, 20],
          [80, 20],
          [80, 80],
          [20, 80]
        ]);
        setScale(1.0);
        setIsAdjustingSurface(true);
        setTimeout(() => setIsImageLoading(false), 1000);
      };
      img.src = url;
    }
  };

  // Dragging polygon control points
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  // Dynamically compute exact container dimensions so the photo's aspect ratio is always strictly respected without distortion
  useEffect(() => {
    if (!viewportRef.current) return;
    const updateSize = () => {
      if (!viewportRef.current) return;
      const { clientWidth, clientHeight } = viewportRef.current;
      // Subtract padding (p-6 = 24px each side)
      const availW = Math.max(0, clientWidth - 48);
      const availH = Math.max(0, clientHeight - 48);
      const maxW = Math.min(availW, 1200);
      const maxH = availH;

      if (maxW <= 0 || maxH <= 0 || !currentAspectRatio) return;

      let w = maxW;
      let h = w / currentAspectRatio;
      if (h > maxH) {
        h = maxH;
        w = h * currentAspectRatio;
      }
      setContainerDimensions({ width: Math.round(w), height: Math.round(h) });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [currentAspectRatio]);

  const handlePointerDownPoint = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingPointIndex(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveContainer = (e: React.PointerEvent) => {
    if (draggingPointIndex === null || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setPolygonPoints(prev => {
      const next = [...prev] as [number, number][];
      next[draggingPointIndex] = [Math.round(xPct * 10) / 10, Math.round(yPct * 10) / 10];
      return next;
    });
  };

  const handlePointerUpContainer = () => {
    setDraggingPointIndex(null);
  };

  // Convert polygon coordinates to CSS clip-path polygon(...)
  const clipPathString = `polygon(${polygonPoints
    .map(([px, py]) => `${px}% ${py}%`)
    .join(', ')})`;

  // High resolution download trigger
  const handleDownloadSimulation = async (resolution: '4k' | '2k' = '4k') => {
    try {
      setIsExporting(true);
      const fileName = `Hisbalit_Coleccion_${motif.name}_Simulacion_${resolution.toUpperCase()}.png`;
      await exportSimulationAsPng(
        activeImageUrl,
        simulationSvgStr,
        polygonPoints,
        scale,
        blendMode,
        fileName,
        resolution,
        isForegroundOverlay,
        opacity,
        customPhotoUrl ? undefined : activePreset.perspectiveTransform
      );
    } catch (err) {
      console.error('Simulation export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#1A1A1A] flex flex-col md:flex-row select-none overflow-hidden relative">
      {/* Main Simulation Viewport (Left/Center) */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        {/* Top Control Bar inside Simulator */}
        <div className="h-14 bg-[#242424]/90 backdrop-blur-md px-6 border-b border-white/10 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div>
              <span className="text-xs font-bold text-white tracking-wide">
                Simulación en espacio real
              </span>
              <span className="text-[11px] text-white/60 ml-2 hidden sm:inline">
                {customPhotoUrl ? 'Fotografía de cliente' : activePreset.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {customPhotoUrl && (
              <button
                onClick={() => setIsAdjustingSurface(!isAdjustingSurface)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${isAdjustingSurface
                  ? 'bg-amber-400 text-black font-semibold'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>{isAdjustingSurface ? 'Finalizar ajuste' : 'Ajustar superficie'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              Volver al lienzo
            </button>
          </div>
        </div>

        {/* The Viewport Container */}
        <div
          ref={viewportRef}
          className="flex-1 w-full h-full flex items-center justify-center p-6 relative overflow-hidden"
        >
          <div
            ref={imageContainerRef}
            onPointerMove={handlePointerMoveContainer}
            onPointerUp={handlePointerUpContainer}
            className={`relative rounded-lg overflow-hidden border border-white/10 shadow-2xl max-w-full max-h-full transition-[width,height] duration-200 ease-out ${isImageLoading ? 'bg-[#141414]' : 'bg-[#FAF8F5]'}`}
            style={{
              aspectRatio: `${currentAspectRatio}`,
              width: containerDimensions ? `${containerDimensions.width}px` : '100%',
              height: containerDimensions ? `${containerDimensions.height}px` : 'auto',
              maxWidth: '1200px'
            }}
          >
            {/* Visual Layers with Soft Dimming & Blur during Room Transition */}
            <div
              className={`w-full h-full relative transition-all duration-300 ease-out ${isImageLoading ? 'opacity-0 scale-[0.96]' : 'opacity-100 scale-100'
                }`}
            >
              {isForegroundOverlay ? (
                <>
                  {/* 1. Seamless Mosaic Surface Behind (Clipped to Polygon) */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-75 overflow-hidden"
                    style={{
                      clipPath: clipPathString,
                      opacity: opacity
                    }}
                  >
                    <img
                      src={svgDataUri}
                      alt="Mosaico simulación"
                      className="w-full h-full object-cover block select-none pointer-events-none"
                      style={getPerspectiveTransformStyle(activePreset.perspectiveTransform)}
                    />
                    <div
                      className="absolute inset-0 bg-black/6"
                    ></div>
                  </div>

                  {/* 2. Foreground Photorealistic Room with Cutout & Realistic Shadows */}
                  <img
                    src={activeImageUrl}
                    alt={activePreset.name}
                    className="w-full h-full object-cover block select-none pointer-events-none absolute inset-0 z-10"
                    crossOrigin="anonymous"
                  />
                </>
              ) : (
                <>
                  {/* 1. Base Room Photography */}
                  <img
                    src={activeImageUrl}
                    alt={activePreset.name}
                    className="w-full h-full object-cover block select-none pointer-events-none"
                    crossOrigin="anonymous"
                  />

                  {/* 2. Seamless Mosaic Surface Overlay (Clipped to Polygon) */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-75 overflow-hidden"
                    style={{
                      clipPath: clipPathString,
                      mixBlendMode: blendMode,
                      opacity: opacity
                    }}
                  >
                    <img
                      src={svgDataUri}
                      alt="Mosaico simulación"
                      className="w-full h-full object-cover block select-none pointer-events-none"
                      style={getPerspectiveTransformStyle(activePreset.perspectiveTransform)}
                    />
                    <div
                      className="absolute inset-0 bg-black/6"
                    ></div>
                  </div>

                  {/* 3. Subtle Lighting & Shadow Softening Overlay */}
                  {blendMode === 'multiply' && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-soft-light"
                      style={{
                        clipPath: clipPathString,
                        backgroundImage: `url(${activeImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Elegant Architectural Loading Overlay */}
            {/* Lightweight Minimal Loading Badge (No full-screen black overlay interfering with SVG) */}
            <div
              className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isImageLoading ? 'opacity-100' : 'opacity-0'
                }`}
            >
              <div className="bg-[#1C1C1C]/90 border border-white/15 px-4 py-2 rounded-full shadow-xl flex items-center gap-2.5 backdrop-blur-xs">
                <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
                <span className="text-xs font-medium text-white/95 tracking-wide">
                  Cargando {loadingPresetTitle || activePreset.surfaceLabel || 'espacio'}
                </span>
              </div>
            </div>


            {/* 4. Interactive Polygon Surface Boundary Points (When Adjusting) */}
            {isAdjustingSurface && customPhotoUrl && (
              <div className="absolute inset-0 z-30">
                {/* SVG Outline connecting the 4 points */}
                <svg className="w-full h-full absolute inset-0 pointer-events-none">
                  <polygon
                    points={polygonPoints.map(([x, y]) => `${x}%,${y}%`).join(' ')}
                    fill="rgba(245, 158, 11, 0.15)"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>

                {/* Draggable Corner Handles */}
                {polygonPoints.map(([px, py], index) => (
                  <div
                    key={index}
                    onPointerDown={(e) => handlePointerDownPoint(index, e)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-125 z-40"
                    style={{ left: `${px}%`, top: `${py}%` }}
                    title={`Punto de ajuste ${index + 1}`}
                  >
                    <span className="text-[10px] font-bold text-black">{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="h-10 bg-[#242424] px-6 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
          {customPhotoUrl && (
            <div className="flex items-center gap-3">
              <span>Arrastra los 4 puntos para adaptar el mosaico a cualquier superficie</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span>Resolución de render: 4K Ultra HD</span>
          </div>
        </div>
      </div>

      {/* Sidebar Controls (Right) */}
      <aside className="w-full md:w-94 h-auto md:h-full bg-[#1F1F1F] border-t md:border-t-0 md:border-l border-white/10 p-5 flex flex-col justify-between shrink-0 text-white overflow-y-auto">
        <div className="space-y-5">
          {/* Section: Spaces Library */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-white/90">
                Espacios de interiorismo:
              </label>
              {customPhotoUrl && (
                <button
                  onClick={() => {
                    setLoadingPresetTitle(activePreset.surfaceLabel || activePreset.name);
                    setIsImageLoading(true);
                    setTimeout(() => {
                      setCustomPhotoUrl(null);
                    }, 200);
                  }}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Restaurar predefinidos
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SPACE_PRESETS.map((preset) => {
                const isSelected = (pendingSpaceId ? pendingSpaceId === preset.id : selectedSpaceId === preset.id) && !customPhotoUrl;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectSpace(preset)}
                    disabled={isImageLoading}
                    className={`relative rounded-lg overflow-hidden border p-1 text-left transition-all ${isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/20 bg-white/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                  >
                    <div className="aspect-video w-full rounded overflow-hidden mb-1.5 bg-white/70">
                      <img
                        src={preset.image}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[11px] font-bold text-white truncate">
                      {preset.surfaceLabel}
                    </div>
                    <div className="text-[10px] text-white/50 truncate">
                      {preset.category === 'bath'
                        ? 'Baño'
                        : preset.category === 'kitchen'
                          ? 'Cocina'
                          : preset.category === 'office'
                            ? 'Despacho / Estudio'
                            : preset.category === 'living'
                              ? 'Comedor / Salón'
                              : 'Suelo'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Upload Custom Space Photo */}
            <div className="mt-2.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 border border-dashed border-white/20 hover:border-amber-400/70 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium text-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Cargar fotografía de tu espacio</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomPhotoUpload}
              />
            </div>
          </div>

          {/* Section: Surface Scale & Perspective */}
          {customPhotoUrl && (
            <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 space-y-3.5">
              <span className="text-xs font-semibold text-white/90 block">
                Ajuste de colocación y escala
              </span>

              {/* Scale Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white/70">Escala del mosaico:</span>
                  <span className="font-mono text-amber-400 font-medium">{scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-white/70">Opacidad del material:</span>
                  <span className="font-mono text-amber-400 font-medium">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.02}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Custom Photo Overlay Toggle if User Uploaded Custom Space */}
              <div>
                <span className="text-[11px] text-white/70 block mb-1.5">
                  Modo de capas:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomIsOverlay(false)}
                    className={`w-full py-1.5 px-2 text-[11px] rounded-md border text-left font-medium transition-all ${!customIsOverlay
                      ? 'border-amber-400 bg-amber-400/10 text-amber-300 font-semibold'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                  >
                    Mosaico superpuesto
                  </button>
                  <button
                    onClick={() => setCustomIsOverlay(true)}
                    className={`w-full py-1.5 px-2 text-[11px] rounded-md border text-left font-medium transition-all ${customIsOverlay
                      ? 'border-amber-400 bg-amber-400/10 text-amber-300 font-semibold'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                  >
                    Mosaico detrás
                  </button>
                </div>
              </div>

              {/* Blend Mode */}
              <div>
                <span className="text-[11px] text-white/70 block mb-1.5">
                  Efecto de iluminación y sombras:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'multiply', label: 'Realista / Sombras' },
                    { id: 'normal', label: 'Opaco / Directo' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setBlendMode(mode.id as any)}
                      className={`py-1.5 px-2 text-[11px] rounded-md border text-left font-medium transition-all ${blendMode === mode.id
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300 font-semibold'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Download High-Resolution Presentation */}
        <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
          <button
            onClick={() => handleDownloadSimulation('4k')}
            disabled={isExporting}
            className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-md text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generando imagen...' : 'Descargar simulación en 4K'}</span>
          </button>

          <button
            onClick={() => handleDownloadSimulation('2k')}
            disabled={isExporting}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>Descargar PNG estándar</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
