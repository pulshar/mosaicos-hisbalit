import React, { useRef, useState, useEffect } from 'react';
import {
  MotifDefinition,
  MotifCustomization,
  CompositionSettings,
  MotifFormat
} from '../types';
import { getTileRotationTransform, isCellWithMotif } from '../utils/exportUtils';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Palette,
  Eye,
  Layers,
  HelpCircle,
  PanelLeftOpen
} from 'lucide-react';

interface DesignCanvasProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string | null) => void;
  onUpdatePieceColor: (pieceId: string, color: string) => void;
  onUpdateBackgroundColor: (color: string) => void;
  onChangeZoom: (zoom: number) => void;
  onResetView: () => void;
  viewMode: 'single' | 'pattern' | 'simulation';
  onChangeViewMode: (mode: 'single' | 'pattern' | 'simulation') => void;
  isMotifLibraryOpen?: boolean;
  onToggleMotifLibrary?: () => void;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  motif,
  customization,
  composition,
  selectedPieceId,
  onSelectPiece,
  onUpdatePieceColor,
  onUpdateBackgroundColor,
  onChangeZoom,
  onResetView,
  viewMode,
  onChangeViewMode,
  isMotifLibraryOpen = true,
  onToggleMotifLibrary
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);

  const activeFormat: MotifFormat = customization.format;
  const svgData = motif.svgData[activeFormat];

  // Auto-clear background notice after 3 seconds
  useEffect(() => {
    if (backgroundNotice) {
      const t = setTimeout(() => setBackgroundNotice(null), 3000);
      return () => clearTimeout(t);
    }
  }, [backgroundNotice]);

  const handlePieceClick = (e: React.MouseEvent, pieceId: string) => {
    e.stopPropagation();
    onSelectPiece(pieceId);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPiece('background');
  };

  const selectedPiece = svgData?.motifPieces.find(p => p.id === selectedPieceId);

  return (
    <main
      ref={containerRef}
      onClick={() => onSelectPiece(null)}
      className="flex-1 h-full bg-[#F7F6F2] relative overflow-hidden flex flex-col select-none"
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
        {/* Active Motif Title Badge & Show Library Toggle */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {!isMotifLibraryOpen && onToggleMotifLibrary && (
            <button
              onClick={onToggleMotifLibrary}
              className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-[#E7E4DE] shadow-xs hover:bg-[#F7F6F2] text-[#242424] flex items-center gap-2 text-xs font-semibold transition-all hover:shadow-sm cursor-pointer group"
              title="Mostrar biblioteca de motivos"
              aria-label="Mostrar biblioteca de motivos"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#77736C] group-hover:text-[#242424] transition-colors" />
              <span>Motivos</span>
            </button>
          )}

          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-[#E7E4DE] shadow-xs flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#242424]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#242424]">
                  Motivo {motif.catalogueNumber} · {motif.name}
                </span>
                <span className="text-[10px] text-[#77736C] bg-[#F7F6F2] px-1.5 py-0.2 rounded border border-[#E7E4DE] font-medium">
                  {activeFormat === 'round' ? 'Tesela Redonda' : 'Tesela Hexagonal'}
                </span>
              </div>
              <p className="text-[11px] text-[#77736C]">
                {viewMode === 'single' ? 'Vista detallada de motivo único' : `Composición ${composition.repeatX}×${composition.repeatY} repeticiones`}
              </p>
            </div>
          </div>
        </div>

        {/* View & Canvas Tools */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-[#E7E4DE] shadow-xs">
          <button
            onClick={() => onChangeZoom(Math.max(0.4, composition.zoom - 0.15))}
            className="p-2 text-[#77736C] hover:text-[#242424] hover:bg-[#F7F6F2] rounded-lg transition-colors"
            title="Reducir zoom"
            aria-label="Reducir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-[#242424] px-1 w-12 text-center tabular-nums">
            {Math.round(composition.zoom * 100)}%
          </span>
          <button
            onClick={() => onChangeZoom(Math.min(2.5, composition.zoom + 0.15))}
            className="p-2 text-[#77736C] hover:text-[#242424] hover:bg-[#F7F6F2] rounded-lg transition-colors"
            title="Aumentar zoom"
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#E7E4DE] mx-1" />

          <button
            onClick={onResetView}
            className="p-2 text-[#77736C] hover:text-[#242424] hover:bg-[#F7F6F2] rounded-lg transition-colors"
            title="Centrar y restablecer vista"
            aria-label="Centrar y restablecer vista"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Background feedback notice toast */}
      {backgroundNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#242424] text-white px-4 py-2 rounded-lg text-xs font-medium shadow-lg z-30 flex items-center gap-2 animate-fade-in pointer-events-none">
          <HelpCircle className="w-4 h-4 text-[#DDA743]" />
          <span>{backgroundNotice}</span>
        </div>
      )}

      {/* Floating Selected Piece Tooltip / Quick Info */}
      {selectedPiece && viewMode !== 'simulation' && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#242424] shadow-md flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full border border-black/10 shadow-xs"
            style={{ backgroundColor: customization.pieceColors[selectedPiece.id] || selectedPiece.originalColor }}
          />
          <div>
            <div className="text-xs font-bold text-[#242424]">{selectedPiece.name}</div>
            <div className="text-[11px] font-mono text-[#77736C]">
              {customization.pieceColors[selectedPiece.id] || selectedPiece.originalColor}
            </div>
          </div>
          <button
            onClick={() => onSelectPiece(null)}
            className="text-[11px] text-[#77736C] hover:text-[#242424] ml-2 px-2 py-1 rounded bg-[#F7F6F2] border border-[#E7E4DE]"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {selectedPieceId === 'background' && viewMode !== 'simulation' && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#242424] shadow-md flex items-center gap-3 animate-fade-in">
          <div
            className="w-7 h-7 rounded-full border border-black/10 shadow-xs"
            style={{ backgroundColor: customization.backgroundColor || '#D9D9D9' }}
          />
          <div>
            <div className="text-xs font-bold text-[#242424]">Fondo del mosaico</div>
            <div className="text-[11px] font-mono text-[#77736C]">
              {customization.backgroundColor || '#D9D9D9'}
            </div>
          </div>
          <button
            onClick={() => onSelectPiece(null)}
            className="text-[11px] text-[#77736C] hover:text-[#242424] ml-2 px-2 py-1 rounded bg-[#F7F6F2] border border-[#E7E4DE]"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* Main Vector Rendering Canvas Area */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-8 overflow-auto">
        <div
          className="relative transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${composition.zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* SVG Canvas Board */}
          {!svgData ? (
            <div className="w-[420px] h-[420px] bg-white rounded-2xl border border-dashed border-[#C5C1BA] flex flex-col items-center justify-center p-8 text-center shadow-xs">
              <Layers className="w-10 h-10 text-[#AFAAA0] mb-3 stroke-[1.5]" />
              <h3 className="text-sm font-semibold text-[#242424]">
                Trazado oficial pendiente
              </h3>
              <p className="text-xs text-[#77736C] mt-1 max-w-xs leading-relaxed">
                El motivo <strong>{motif.name}</strong> está registrado en la colección Petite. Selecciona <strong>07 · Soleil</strong> para interactuar con las teselas redondas y hexagonales.
              </p>
            </div>
          ) : viewMode === 'single' ? (
            /* ======================================================== */
            /* SINGLE MOTIF VIEW: Razor-sharp interactive SVG           */
            /* ======================================================== */
            (() => {
              const isRotated90or270 = customization.rotation === 90 || customization.rotation === 270;
              const singleDisplayWidth = isRotated90or270 ? svgData.height : svgData.width;
              const singleDisplayHeight = isRotated90or270 ? svgData.width : svgData.height;

              return (
                <div
                  className={`bg-white rounded-2xl p-8 shadow-sm transition-all duration-150 relative ${
                    selectedPieceId === 'background'
                      ? 'border-2 border-[#242424] ring-4 ring-[#242424]/10 shadow-md'
                      : 'border border-[#E7E4DE]'
                  }`}
                  style={{
                    width: singleDisplayWidth + 64,
                    height: singleDisplayHeight + 64
                  }}
                >
                  <svg
                    width={singleDisplayWidth}
                    height={singleDisplayHeight}
                    viewBox={`0 0 ${singleDisplayWidth} ${singleDisplayHeight}`}
                    className="overflow-visible"
                  >
                    <g
                      transform={getTileRotationTransform(customization.rotation, svgData.width, svgData.height)}
                      style={{ transition: 'transform 0.2s ease-out' }}
                    >
                  {/* Background pieces group (All 96 tesserae) */}
                  <g
                    id="background-tesserae"
                    onClick={handleBackgroundClick}
                    className="cursor-pointer group"
                  >
                    {/* Transparent catch area across full tile grid */}
                    <rect
                      x={0}
                      y={0}
                      width={svgData.width}
                      height={svgData.height}
                      fill="transparent"
                      className="cursor-pointer"
                    />
                    {svgData.backgroundShapes.map((shape, idx) => {
                      if (shape.type === 'circle') {
                        return (
                          <circle
                            key={`bg-${idx}`}
                            cx={shape.cx}
                            cy={shape.cy}
                            r={shape.r}
                            fill={customization.backgroundColor || '#D9D9D9'}
                            className="transition-colors duration-150"
                          />
                        );
                      } else {
                        return (
                          <path
                            key={`bg-${idx}`}
                            d={shape.d}
                            fill={customization.backgroundColor || '#D9D9D9'}
                            className="transition-colors duration-150"
                          />
                        );
                      }
                    })}
                  </g>

                  {/* Editable motif pieces (7 individual pieces) */}
                  <g id="motif-pieces">
                    {svgData.motifPieces.map((piece) => {
                      const isSelected = selectedPieceId === piece.id;
                      const isHovered = hoveredPieceId === piece.id;
                      const currentColor =
                        customization.pieceColors[piece.id] || piece.originalColor;

                      if (piece.type === 'circle') {
                        return (
                          <g
                            key={piece.id}
                            onClick={(e) => handlePieceClick(e, piece.id)}
                            onMouseEnter={() => setHoveredPieceId(piece.id)}
                            onMouseLeave={() => setHoveredPieceId(null)}
                            className="cursor-pointer"
                          >
                            {/* Selection highlight ring */}
                            {isSelected && (
                              <circle
                                cx={piece.cx}
                                cy={piece.cy}
                                r={(piece.r || 10) + 4.5}
                                fill="none"
                                stroke="#242424"
                                strokeWidth="2.5"
                                style={{ transformOrigin: `${piece.cx}px ${piece.cy}px` }}
                              />
                            )}
                            {/* Hover halo */}
                            {isHovered && !isSelected && (
                              <circle
                                cx={piece.cx}
                                cy={piece.cy}
                                r={(piece.r || 10) + 3}
                                fill="none"
                                stroke="#242424"
                                strokeWidth="1.5"
                                opacity="0.6"
                              />
                            )}
                            {/* The piece itself */}
                            <circle
                              cx={piece.cx}
                              cy={piece.cy}
                              r={piece.r}
                              fill={currentColor}
                              stroke={isSelected ? '#FFFFFF' : 'none'}
                              strokeWidth={isSelected ? 1.5 : 0}
                              className="transition-all duration-100"
                            />
                          </g>
                        );
                      } else {
                        const cx = piece.cx ?? 0;
                        const cy = piece.cy ?? 0;

                        return (
                          <g
                            key={piece.id}
                            onClick={(e) => handlePieceClick(e, piece.id)}
                            onMouseEnter={() => setHoveredPieceId(piece.id)}
                            onMouseLeave={() => setHoveredPieceId(null)}
                            className="cursor-pointer"
                          >
                            {/* Selection highlight hexagon */}
                            {isSelected && (
                              <path
                                d={piece.d}
                                fill="none"
                                stroke="#242424"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                transform={`translate(${cx}, ${cy}) scale(1.24) translate(-${cx}, -${cy})`}
                              />
                            )}
                            {/* Hover halo (concentric hexagon) */}
                            {isHovered && !isSelected && (
                              <path
                                d={piece.d}
                                fill="none"
                                stroke="#242424"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                opacity="0.6"
                                transform={`translate(${cx}, ${cy}) scale(1.2) translate(-${cx}, -${cy})`}
                              />
                            )}
                            {/* The piece itself */}
                            <path
                              d={piece.d}
                              fill={currentColor}
                              stroke={isSelected ? '#FFFFFF' : 'none'}
                              strokeWidth={isSelected ? 1.5 : 0}
                              strokeLinejoin="round"
                              className="transition-all duration-100"
                            />
                          </g>
                        );
                      }
                    })}
                  </g>
                </g>
              </svg>
            </div>
          );
        })()
      ) : (
        /* ======================================================== */
        /* PATTERN COMPOSITION VIEW: Repeated mosaic surface         */
        /* ======================================================== */
        (() => {
          const isRotated90or270 = customization.rotation === 90 || customization.rotation === 270;
          const tileW = isRotated90or270 ? svgData.height : svgData.width;
          const tileH = isRotated90or270 ? svgData.width : svgData.height;

          // Paso geométrico exacto de la trama de teselas según rotación
          // En 0° y 180°: X = 286 (13 columnas), Y = 304 (16 filas)
          // En 90° y 270°: X = 304 (16 filas), Y = 286 (13 columnas)
          const rawBaseStepX = activeFormat === 'round' ? 286 : 286.19;
          const rawBaseStepY = activeFormat === 'round' ? 304 : 299.40;
          const baseStepX = isRotated90or270 ? rawBaseStepY : rawBaseStepX;
          const baseStepY = isRotated90or270 ? rawBaseStepX : rawBaseStepY;

          const unitW = baseStepX + composition.spacingX;
          const unitH = baseStepY + composition.spacingY;

          // En tresbolillo: desplazamiento horizontal calibrado según rotación
          const rawStaggerShiftX = isRotated90or270
            ? (activeFormat === 'round' ? 152 : 149.70)
            : (activeFormat === 'round' ? 132 : 132.09);

          const staggerShiftX = composition.staggered
            ? rawStaggerShiftX + (composition.spacingX * 0.5)
            : 0;

          const totalWidth = (composition.repeatX - 1) * unitW + tileW + staggerShiftX;
          const totalHeight = (composition.repeatY - 1) * unitH + tileH;

          return (
            <div
              className="bg-white rounded-2xl p-6 shadow-sm border border-[#E7E4DE] overflow-hidden flex items-center justify-center"
              style={{
                width: Math.min(1300, totalWidth + 48),
                height: Math.min(850, Math.round(((totalHeight + 48) / (totalWidth + 48)) * Math.min(1300, totalWidth + 48)))
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                className="w-full h-full"
              >
                {Array.from({ length: composition.repeatY }).map((_, rowIndex) =>
                  Array.from({ length: composition.repeatX }).map((_, colIndex) => {
                    const offsetX =
                      colIndex * unitW +
                      (composition.staggered && rowIndex % 2 === 1 ? staggerShiftX : 0);
                    const offsetY = rowIndex * unitH;

                    const hasMotif = isCellWithMotif(
                      rowIndex,
                      colIndex,
                      composition.plainTileCadence || 'none',
                      composition.repeatX
                    );

                    return (
                      <g
                        key={`cell-${rowIndex}-${colIndex}`}
                        transform={`translate(${offsetX}, ${offsetY})`}
                      >
                        <g
                          transform={getTileRotationTransform(customization.rotation, svgData.width, svgData.height)}
                        >
                          {/* Background shapes */}
                          <g>
                            {svgData.backgroundShapes.map((shape, idx) =>
                              shape.type === 'circle' ? (
                                <circle
                                  key={`pat-bg-${idx}`}
                                  cx={shape.cx}
                                  cy={shape.cy}
                                  r={shape.r}
                                  fill={customization.backgroundColor || '#D9D9D9'}
                                />
                              ) : (
                                <path
                                  key={`pat-bg-${idx}`}
                                  d={shape.d}
                                  fill={customization.backgroundColor || '#D9D9D9'}
                                />
                              )
                            )}
                          </g>

                          {/* Motif pieces - if cell is plain, they blend with background */}
                          <g>
                            {svgData.motifPieces.map((piece) => {
                              const currentColor = hasMotif
                                ? (customization.pieceColors[piece.id] || piece.originalColor)
                                : (customization.backgroundColor || '#D9D9D9');
                              return piece.type === 'circle' ? (
                                <circle
                                  key={`pat-p-${piece.id}`}
                                  cx={piece.cx}
                                  cy={piece.cy}
                                  r={piece.r}
                                  fill={currentColor}
                                />
                              ) : (
                                <path
                                  key={`pat-p-${piece.id}`}
                                  d={piece.d}
                                  fill={currentColor}
                                />
                              );
                            })}
                          </g>
                        </g>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>
          );
        })()
      )}
        </div>
      </div>

      {/* Footer Helper Strip */}
      {/*
      <footer className="h-10 border-t border-[#E7E4DE] bg-white px-6 flex items-center justify-between text-[11px] text-[#77736C]">
        <div className="flex items-center gap-4">
          <span>Haz clic en cualquier tesela negra para editarla individualmente</span>
          <span className="text-[#D8D4CC]">·</span>
          <span>El grupo gris es el fondo continuo personalizable</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Medidas originales: {svgData?.width || 295}×{svgData?.height || 305} px</span>
          <span className="text-[#D8D4CC]">·</span>
          <span className="font-mono text-[#242424]">Colección Petite</span>
        </div>
      </footer>
       */}
    </main>
  );
};
