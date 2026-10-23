import React, { useState, useRef, useEffect } from 'react';
import { SPACE_PRESETS } from '../data/spaces';
import { SpacePreset, MotifDefinition, MotifCustomization, CompositionSettings } from '../types';
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

interface SpaceSimulatorProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  customizationsMap?: Record<string, MotifCustomization>;
  editedMotifIds?: Record<string, boolean>;
  onClose: () => void;
}

export const SpaceSimulator: React.FC<SpaceSimulatorProps> = ({
  motif,
  customization,
  composition,
  customizationsMap = {},
  editedMotifIds = {},
  onClose
}) => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(SPACE_PRESETS[0].id);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [customAspectRatio, setCustomAspectRatio] = useState<number | null>(null);
  const [customIsOverlay, setCustomIsOverlay] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(0.45);
  const [blendMode, setBlendMode] = useState<'multiply' | 'normal'>('multiply');
  const [opacity, setOpacity] = useState<number>(1);
  const [isAdjustingSurface, setIsAdjustingSurface] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Active space preset
  const activePreset = SPACE_PRESETS.find(s => s.id === selectedSpaceId) || SPACE_PRESETS[0];
  const isForegroundOverlay = customPhotoUrl ? customIsOverlay : Boolean(activePreset.isForegroundOverlay);

  // Polygon points in % coordinates [[x, y], ...]
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(activePreset.polygonPoints);

  // When changing space preset, update polygon points
  useEffect(() => {
    if (!customPhotoUrl) {
      setPolygonPoints(activePreset.polygonPoints);
      setScale(activePreset.defaultScale);
      setBlendMode(activePreset.blendMode);
    }
  }, [selectedSpaceId, customPhotoUrl]);

  const activeImageUrl = customPhotoUrl || activePreset.image;

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
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setCustomAspectRatio(img.naturalWidth / img.naturalHeight);
        }
      };
      img.src = url;
      setCustomPhotoUrl(url);
      // Set reasonable default polygon covering center wall/floor
      setPolygonPoints([
        [20, 20],
        [80, 20],
        [80, 80],
        [20, 80]
      ]);
      setIsAdjustingSurface(true);
    }
  };

  // Dragging polygon control points
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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
      const fileName = `Mosaico-Studio_${motif.name}_Simulacion_${resolution.toUpperCase()}.png`;
      await exportSimulationAsPng(
        activeImageUrl,
        simulationSvgStr,
        polygonPoints,
        scale,
        blendMode,
        fileName,
        resolution,
        isForegroundOverlay,
        opacity
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
        <div className="flex-1 w-full h-full flex items-center justify-center p-6 relative overflow-auto bg-[#141414]">
          <div
            ref={imageContainerRef}
            onPointerMove={handlePointerMoveContainer}
            onPointerUp={handlePointerUpContainer}
            className="relative rounded-lg overflow-hidden shadow-2xl max-w-full max-h-full border border-white/10 bg-[#FAF8F5]"
            style={{
              aspectRatio: activePreset.aspectRatio || '16/9',
              width: '100%',
              maxWidth: '1200px'
            }}
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
                  // style={{
                  //   transform: `translate(${activePreset.offsetX ?? 0}px, ${activePreset.offsetY ?? 0}px)`
                  // }}
                  />
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
                  />
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
          <div className="flex items-center gap-3">
            <span>Arrastra los 4 puntos para adaptar el mosaico a cualquier superficie</span>
          </div>
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
                  onClick={() => setCustomPhotoUrl(null)}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Restaurar predefinidos
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SPACE_PRESETS.map((preset) => {
                const isSelected = selectedSpaceId === preset.id && !customPhotoUrl;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setCustomPhotoUrl(null);
                      setSelectedSpaceId(preset.id);
                    }}
                    className={`relative rounded-lg overflow-hidden border p-1 text-left transition-all ${isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/20 bg-white/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                  >
                    <div className="aspect-video w-full rounded overflow-hidden mb-1.5 bg-white/40">
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
                  min={0.35}
                  max={2.2}
                  step={0.05}
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
            <span>{isExporting ? 'Generando imagen...' : 'Descargar simulación en 4K (3840×2160)'}</span>
          </button>

          <button
            onClick={() => handleDownloadSimulation('2k')}
            disabled={isExporting}
            className="w-full py-2 px-3 bg-white/10 hover:bg-white/15 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>Descargar PNG estándar (1080p)</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
