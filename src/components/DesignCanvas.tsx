import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  MotifDefinition,
  MotifCustomization,
  CompositionSettings,
  MotifFormat
} from '../types';
import { getTileRotationTransform, isCellWithMotif, getCellMotif } from '../utils/exportUtils';
import { getMotifById } from '../data/motifs';
import { resolveEffectiveMotifCustomization } from '../utils/motifColorUtils';
import { CellPopoverMenu } from './CellPopoverMenu';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  HelpCircle,
  Check,
  Sparkles,
} from 'lucide-react';

interface DesignCanvasProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  selectedPieceId?: string | null;
  selectedPieceIds?: string[];
  customizationsMap?: Record<string, MotifCustomization>;
  editedMotifIds?: Record<string, boolean>;
  onSelectPiece: (pieceId: string | string[] | null, isMulti?: boolean) => void;
  onSelectMultiplePieces?: (pieceIds: string[]) => void;
  onUpdatePieceColor: (pieceId: string, color: string) => void;
  onUpdatePieceColors?: (pieceIds: string[], color: string) => void;
  onUpdateBackgroundColor: (color: string) => void;
  onChangeZoom: (zoom: number) => void;
  onResetView: () => void;
  viewMode: 'single' | 'pattern' | 'simulation';
  onChangeViewMode: (mode: 'single' | 'pattern' | 'simulation') => void;
  onUpdateComposition?: (settings: Partial<CompositionSettings>) => void;
  onGoToCustomizeMotif?: (motifId: string) => void;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  motif,
  customization,
  composition,
  selectedPieceId,
  selectedPieceIds = [],
  customizationsMap = {},
  editedMotifIds = {},
  onSelectPiece,
  onUpdatePieceColor,
  onUpdatePieceColors,
  onUpdateBackgroundColor,
  onChangeZoom,
  onResetView,
  viewMode,
  onChangeViewMode,
  onUpdateComposition,
  onGoToCustomizeMotif
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [hoveredGridCell, setHoveredGridCell] = useState<{ row: number; col: number } | null>(null);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);
  const [activeCellMenu, setActiveCellMenu] = useState<{
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);

  const [savedCellMenuPosition, setSavedCellMenuPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('mosaico_studio_cell_menu_pos');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return null;
  });

  const handleCellMenuPositionChange = useCallback((pos: { x: number; y: number }) => {
    setSavedCellMenuPosition(pos);
    try {
      localStorage.setItem('mosaico_studio_cell_menu_pos', JSON.stringify(pos));
    } catch {
      // ignore
    }
  }, []);

  const HELP_STORAGE_KEY = 'mosaico_canvas_help_dismissed';

  const [showHelpBanner, setShowHelpBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HELP_STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissHelp = () => {
    setShowHelpBanner(false);
    try {
      localStorage.setItem(HELP_STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save help preference to localStorage:', e);
    }
  };

  const handleToggleHelp = () => {
    setShowHelpBanner(prev => !prev);
  };

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
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelectPiece(pieceId, isMulti);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPiece('background', false);
  };

  const overrideCount = composition.cellOverrides
    ? Object.keys(composition.cellOverrides).length
    : 0;

  const getCustomizationForMotif = (targetMotifId: string) => {
    return resolveEffectiveMotifCustomization(
      targetMotifId,
      activeFormat,
      customization,
      customizationsMap,
      editedMotifIds
    );
  };

  const handleGridCellClick = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateComposition) return;

    if (e.shiftKey) {
      // Shift + click: quick toggle without opening popover
      const currentMotifId = getCellMotif(
        rowIndex,
        colIndex,
        composition.plainTileCadence || 'none',
        composition.repeatX,
        composition.cellOverrides,
        motif.id
      );
      const nextOverrides = { ...(composition.cellOverrides || {}) };
      const cellKey = `${rowIndex}-${colIndex}`;
      if (currentMotifId) {
        nextOverrides[cellKey] = false;
        setBackgroundNotice(`Celda (${rowIndex + 1}, ${colIndex + 1}): Sin motivo`);
      } else {
        nextOverrides[cellKey] = motif.id;
        setBackgroundNotice(`Celda (${rowIndex + 1}, ${colIndex + 1}): Con motivo ${motif.name}`);
      }
      onUpdateComposition({ cellOverrides: nextOverrides });
      return;
    }

    setActiveCellMenu({
      row: rowIndex,
      col: colIndex,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleSelectCellMotif = (motifId: string | null) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { row, col } = activeCellMenu;
    const key = `${row}-${col}`;
    const nextOverrides = { ...(composition.cellOverrides || {}) };

    if (motifId === null) {
      nextOverrides[key] = false;
      setBackgroundNotice(`Celda (${row + 1}, ${col + 1}): Fondo liso`);
    } else {
      nextOverrides[key] = motifId;
      const mDef = getMotifById(motifId);
      setBackgroundNotice(`Celda (${row + 1}, ${col + 1}): Motivo ${mDef?.name || motifId}`);
    }

    onUpdateComposition({ cellOverrides: nextOverrides });
  };

  const handleSelectCellRotation = (rotation: number) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { row, col } = activeCellMenu;
    const key = `${row}-${col}`;
    const nextRotations = { ...(composition.cellRotations || {}) };
    nextRotations[key] = rotation;
    onUpdateComposition({ cellRotations: nextRotations });
    setBackgroundNotice(`Celda (${row + 1}, ${col + 1}): Giro ${rotation}°`);
  };

  const handleApplyToRow = (motifId: string | null, rotation: number) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { row } = activeCellMenu;
    const nextOverrides = { ...(composition.cellOverrides || {}) };
    const nextRotations = { ...(composition.cellRotations || {}) };

    for (let c = 0; c < composition.repeatX; c++) {
      const key = `${row}-${c}`;
      nextOverrides[key] = motifId === null ? false : (motifId || motif.id);
      nextRotations[key] = rotation;
    }

    onUpdateComposition({ cellOverrides: nextOverrides, cellRotations: nextRotations });
    setBackgroundNotice(`Fila ${row + 1} actualizada por completo`);
  };

  const handleApplyToCol = (motifId: string | null, rotation: number) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { col } = activeCellMenu;
    const nextOverrides = { ...(composition.cellOverrides || {}) };
    const nextRotations = { ...(composition.cellRotations || {}) };

    for (let r = 0; r < composition.repeatY; r++) {
      const key = `${r}-${col}`;
      nextOverrides[key] = motifId === null ? false : (motifId || motif.id);
      nextRotations[key] = rotation;
    }

    onUpdateComposition({ cellOverrides: nextOverrides, cellRotations: nextRotations });
    setBackgroundNotice(`Columna ${col + 1} actualizada por completo`);
  };

  const handleApplyCheckerboard = (motifId: string | null, rotation: number) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const nextOverrides = { ...(composition.cellOverrides || {}) };
    const nextRotations = { ...(composition.cellRotations || {}) };

    for (let r = 0; r < composition.repeatY; r++) {
      for (let c = 0; c < composition.repeatX; c++) {
        const isMatch = (r + c) % 2 === 0;
        const key = `${r}-${c}`;
        if (isMatch) {
          nextOverrides[key] = motifId === null ? false : (motifId || motif.id);
          nextRotations[key] = rotation;
        } else {
          nextOverrides[key] = false;
        }
      }
    }

    onUpdateComposition({ cellOverrides: nextOverrides, cellRotations: nextRotations });
    setBackgroundNotice('Patrón damero aplicado');
  };

  const handleResetCell = () => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { row, col } = activeCellMenu;
    const key = `${row}-${col}`;
    const nextOverrides = { ...(composition.cellOverrides || {}) };
    delete nextOverrides[key];
    const nextRotations = { ...(composition.cellRotations || {}) };
    delete nextRotations[key];
    onUpdateComposition({ cellOverrides: nextOverrides, cellRotations: nextRotations });
    setBackgroundNotice(`Celda (${row + 1}, ${col + 1}) restablecida`);
  };

  const selectedPieces = svgData?.motifPieces.filter(p => selectedPieceIds.includes(p.id)) || [];
  const selectedPiece = selectedPieces[0] || svgData?.motifPieces.find(p => p.id === selectedPieceId);

  return (
    <main
      ref={containerRef}
      onClick={() => onSelectPiece(null)}
      className="flex-1 h-full bg-[#F7F6F2] relative overflow-hidden flex flex-col select-none"
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
        {/* Active Motif Title Badge & Show Library Toggle */}
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
              {viewMode === 'single'
                ? 'Vista detallada'
                : `Composición ${composition.repeatX}×${composition.repeatY} repeticiones`}
            </p>
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

          <div className="w-[1px] h-4 bg-[#E7E4DE] mx-1" />

          <button
            onClick={handleToggleHelp}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${showHelpBanner
              ? 'bg-[#242424] text-[#DDA743] shadow-xs'
              : 'text-[#77736C] hover:text-[#242424] hover:bg-[#F7F6F2]'
              }`}
            title={showHelpBanner ? "Ocultar guía de ayuda" : "Ver guía de ayuda e instrucciones"}
            aria-label="Guía de ayuda e instrucciones"
          >
            <HelpCircle className="w-4 h-4" />
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

      {/* Floating Selected Piece(s) Tooltip / Quick Info */}
      {selectedPieceIds.length > 1 && !selectedPieceIds.includes('background') && viewMode !== 'simulation' && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-3 px-4 rounded-xl border border-[#242424] shadow-md flex items-center gap-3 animate-fade-in">
          <div className="flex -space-x-1.5 overflow-hidden">
            {selectedPieceIds.slice(0, 5).map(id => (
              <div
                key={id}
                className="w-6 h-6 rounded-full border-2 border-white shadow-xs shrink-0"
                style={{ backgroundColor: customization.pieceColors[id] || '#DDA743' }}
              />
            ))}
            {selectedPieceIds.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-[#242424] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shrink-0">
                +{selectedPieceIds.length - 5}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-[#242424]">
              {selectedPieceIds.length} piezas seleccionadas
            </div>
            <div className="text-[11px] text-[#77736C]">
              Ctrl + clic para añadir o quitar piezas
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPiece(null);
            }}
            className="text-[11px] text-[#77736C] hover:text-[#242424] ml-2 px-2.5 py-1 rounded-lg bg-[#F7F6F2] hover:bg-[#EDEBE6] border border-[#E7E4DE] cursor-pointer transition-colors"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {selectedPieceIds.length === 1 && selectedPiece && !selectedPieceIds.includes('background') && viewMode !== 'simulation' && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#242424] shadow-md flex items-center gap-3 animate-fade-in">
          <div
            className="w-7 h-7 rounded-full border border-black/10 shadow-xs shrink-0"
            style={{ backgroundColor: customization.pieceColors[selectedPiece.id] || selectedPiece.originalColor }}
          />
          <div>
            <div className="text-xs font-bold text-[#242424]">{selectedPiece.name}</div>
            <div className="text-[11px] text-[#77736C]">
              Ctrl + clic para añadir más
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPiece(null);
            }}
            className="text-[11px] text-[#77736C] hover:text-[#242424] ml-2 px-2 py-1 rounded bg-[#F7F6F2] border border-[#E7E4DE] cursor-pointer"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {(selectedPieceIds.includes('background') || selectedPieceId === 'background') && viewMode !== 'simulation' && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#242424] shadow-md flex items-center gap-3 animate-fade-in">
          <div
            className="w-7 h-7 rounded-full border border-black/10 shadow-xs shrink-0"
            style={{ backgroundColor: customization.backgroundColor || '#D9D9D9' }}
          />
          <div>
            <div className="text-xs font-bold text-[#242424]">Fondo del mosaico</div>
            <div className="text-[11px] font-mono text-[#77736C]">
              {customization.backgroundColor || '#D9D9D9'}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPiece(null);
            }}
            className="text-[11px] text-[#77736C] hover:text-[#242424] ml-2 px-2 py-1 rounded bg-[#F7F6F2] border border-[#E7E4DE] cursor-pointer"
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
                  className={`bg-white rounded-2xl p-8 shadow-sm transition-all duration-150 relative ${selectedPieceIds.includes('background') || selectedPieceId === 'background'
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
                          const isSelected = selectedPieceIds.includes(piece.id) || selectedPieceId === piece.id;
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

                        const cellKey = `${rowIndex}-${colIndex}`;
                        const cellMotifId = getCellMotif(
                          rowIndex,
                          colIndex,
                          composition.plainTileCadence || 'none',
                          composition.repeatX,
                          composition.cellOverrides,
                          motif.id
                        );
                        const hasMotif = cellMotifId !== null;
                        const cellRot = composition.cellRotations?.[cellKey] ?? customization.rotation ?? 0;
                        const cellMotifDef = cellMotifId ? (getMotifById(cellMotifId) || motif) : motif;
                        const cellSvgData = cellMotifDef.svgData[activeFormat] || svgData;
                        const cellCust = cellMotifId
                          ? getCustomizationForMotif(cellMotifId)
                          : customization;

                        const isHovered =
                          hoveredGridCell?.row === rowIndex && hoveredGridCell?.col === colIndex;

                        const isSelected =
                          activeCellMenu?.row === rowIndex && activeCellMenu?.col === colIndex;

                        const isHighlighted = isHovered || isSelected;

                        const isOverridden =
                          composition.cellOverrides &&
                          composition.cellOverrides[cellKey] !== undefined;

                        return (
                          <g
                            key={`cell-${rowIndex}-${colIndex}`}
                            transform={`translate(${offsetX}, ${offsetY})`}
                            onClick={(e) => handleGridCellClick(rowIndex, colIndex, e)}
                            onMouseEnter={() => setHoveredGridCell({ row: rowIndex, col: colIndex })}
                            onMouseLeave={() => setHoveredGridCell(null)}
                            className="cursor-pointer group"
                          >
                            <g
                              transform={getTileRotationTransform(cellRot, cellSvgData.width, cellSvgData.height)}
                            >
                              {/* Background shapes */}
                              <g>
                                {cellSvgData.backgroundShapes.map((shape, idx) =>
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
                                {cellSvgData.motifPieces.map((piece) => {
                                  const currentColor = hasMotif
                                    ? (cellCust.pieceColors[piece.id] || piece.originalColor)
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

                            {/* Transparent click catch area covering the full tile box */}
                            <rect
                              x={0}
                              y={0}
                              width={tileW}
                              height={tileH}
                              fill="transparent"
                              className="cursor-pointer"
                            />

                            {/* Interactive Hover & Active Feedback Indicator */}
                            {isHighlighted && (
                              <g className="pointer-events-none">
                                {/* Distinct dashed perimeter border */}
                                <rect
                                  x={1.5}
                                  y={1.5}
                                  width={tileW - 3}
                                  height={tileH - 3}
                                  rx={8}
                                  fill="rgba(36, 36, 36, 0.04)"
                                  stroke="#242424"
                                  strokeWidth={2}
                                  strokeDasharray="6 4"
                                />

                                {/* Floating badge with active motif / action indicator */}
                                <g transform={`translate(${Math.max(10, tileW - 36)}, 10)`}>
                                  <rect
                                    x={0}
                                    y={0}
                                    width={26}
                                    height={26}
                                    rx={13}
                                    fill="#242424"
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                  />
                                  <circle
                                    cx={13}
                                    cy={13}
                                    r={3.5}
                                    fill={hasMotif ? '#10B981' : '#DDA743'}
                                  />
                                </g>
                              </g>
                            )}
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

      {/* Contextual Cell Popover Menu */}
      {activeCellMenu && viewMode === 'pattern' && (
        <CellPopoverMenu
          row={activeCellMenu.row}
          col={activeCellMenu.col}
          currentMotifId={getCellMotif(
            activeCellMenu.row,
            activeCellMenu.col,
            composition.plainTileCadence || 'none',
            composition.repeatX,
            composition.cellOverrides,
            motif.id
          )}
          currentRotation={
            composition.cellRotations?.[`${activeCellMenu.row}-${activeCellMenu.col}`] ??
            customization.rotation ??
            0
          }
          activeFormat={activeFormat}
          primaryMotif={motif}
          clickPosition={{ x: activeCellMenu.x, y: activeCellMenu.y }}
          initialPosition={savedCellMenuPosition}
          boundaryRef={containerRef}
          getCustomizationForMotif={getCustomizationForMotif}
          onSelectMotif={handleSelectCellMotif}
          onSelectRotation={handleSelectCellRotation}
          onApplyToRow={handleApplyToRow}
          onApplyToCol={handleApplyToCol}
          onResetCell={handleResetCell}
          onPositionChange={handleCellMenuPositionChange}
          onClose={() => setActiveCellMenu(null)}
        />
      )}

      {/* Floating Onboarding / Instructions Helper (shown first time, dismissable, stored in localStorage) */}
      {showHelpBanner && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92%] sm:w-auto bg-white/95 backdrop-blur-md border border-[#E7E4DE] shadow-xl rounded-2xl p-5 flex items-center gap-3.5 animate-fade-in transition-all">
          {/* <div className="w-8 h-8 rounded-xl bg-[#242424] text-[#DDA743] flex items-center justify-center shrink-0 shadow-xs">
            {viewMode === 'pattern' ? (
              <MousePointerClick className="w-4 h-4" />
            ) : (
              <PaletteIcon className="w-4 h-4" />
            )}
          </div> */}

          <div className="text-xs text-[#242424] min-w-0 pr-1">
            <div className="font-semibold flex items-center gap-2">
              <span>
                {viewMode === 'pattern'
                  ? 'Personalización de composición'
                  : 'Personalización de motivo'}
              </span>
            </div>
            <p className="text-[#77736C] text-[11px] mt-0.5 leading-normal">
              {viewMode === 'pattern'
                ? 'Haz clic en cualquier celda para quitar o añadir el motivo en esa celda.'
                : 'Haz clic en una pieza del motivo para editarla, usa Ctrl + clic para seleccionar varias o haz clic en el fondo para cambiar su color.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <button
              onClick={handleDismissHelp}
              className="px-2.5 py-1.5 rounded-lg bg-[#242424] hover:bg-black text-white text-[11px] font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1"
              title="Entendido, guardar preferencia"
            >
              <Check className="w-3.5 h-3.5 text-[#DDA743]" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      )}

    </main>
  );
};
