import React, { useRef, useState, useEffect } from 'react';
import {
  MotifDefinition,
  MotifCustomization,
  CompositionSettings,
  MotifFormat
} from '../types';
import { getTileRotationTransform, isCellWithMotif, getCellMotif, getCellRotationOffset } from '../utils/exportUtils';
import { getMotifById } from '../data/motifs';
import { findMaterialByHex } from '../data/palette';
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
  selectedPieceIds?: string[];
  customizationsMap?: Record<string, MotifCustomization>;
  editedMotifIds?: Record<string, boolean>;
  onSelectPiece: (pieceId: string | string[] | null, isMulti?: boolean) => void;
  onUpdateComposition?: (settings: Partial<CompositionSettings>) => void;
  onOpenTour?: () => void;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  motif,
  customization,
  composition,
  selectedPieceIds = [],
  customizationsMap = {},
  editedMotifIds = {},
  onSelectPiece,
  onUpdateComposition,
  onOpenTour,
}) => {
  const viewMode = composition.viewMode;
  const selectedPieceId = selectedPieceIds[0] || null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [hoveredGridCell, setHoveredGridCell] = useState<{ row: number; col: number } | null>(null);
  const [backgroundNotice, setBackgroundNotice] = useState<string | null>(null);
  const [selectedGridCells, setSelectedGridCells] = useState<Array<{ row: number; col: number }>>([]);
  const [popoverCustomPos, setPopoverCustomPos] = useState<{ x: number; y: number } | null>(null);
  const [activeCellMenu, setActiveCellMenu] = useState<{
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);

  const PAN_HINT_STORAGE_KEY = 'mosaico_canvas_pan_hint_seen';

  const [hasSeenPanHint, setHasSeenPanHint] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PAN_HINT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const markPanHintSeen = () => {
    setHasSeenPanHint(true);
    try {
      localStorage.setItem(PAN_HINT_STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save pan hint preference to localStorage:', e);
    }
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

  // Clear pattern cell selection if switching away from pattern view
  useEffect(() => {
    if (viewMode !== 'pattern') {
      setActiveCellMenu(null);
      setSelectedGridCells([]);
    }
  }, [viewMode]);

  // Keep selected cells within valid grid bounds if grid size changes
  useEffect(() => {
    setSelectedGridCells(prev =>
      prev.filter(c => c.row < composition.repeatY && c.col < composition.repeatX)
    );
  }, [composition.repeatX, composition.repeatY]);

  // Dynamic reference for composition updates (zoom, pan, etc.)
  const onUpdateCompositionRef = useRef(onUpdateComposition);
  onUpdateCompositionRef.current = onUpdateComposition;

  // Zoom with Ctrl + Mouse Wheel (and Cmd + Mouse Wheel / Trackpad pinch)
  const zoomRef = useRef(composition.zoom);
  zoomRef.current = composition.zoom;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const zoomFactor = 1 + Math.max(-0.25, Math.min(0.25, delta * 0.0015));
        const currentZoom = zoomRef.current;
        const nextZoom = Math.min(2.5, Math.max(0.4, Math.round(currentZoom * zoomFactor * 100) / 100));
        if (nextZoom !== currentZoom) {
          onUpdateCompositionRef.current?.({ zoom: nextZoom });
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Spacebar pan (hand tool) support
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0
  });

  const panRef = useRef<{ x: number; y: number }>({
    x: composition.panX || 0,
    y: composition.panY || 0
  });
  panRef.current = { x: composition.panX || 0, y: composition.panY || 0 };

  // Listen for Spacebar keydown / keyup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement | null;
        const isInput = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        );
        if (!isInput) {
          e.preventDefault();
          isSpacePressedRef.current = true;
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
        markPanHintSeen();
        if (isPanningRef.current) {
          isPanningRef.current = false;
          setIsPanning(false);
        }
      }
    };

    const handleBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
      markPanHintSeen();
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Auto-dismiss the pan hint after 3 seconds of showing it
  useEffect(() => {
    if (isSpacePressed && !hasSeenPanHint) {
      const timer = setTimeout(() => {
        markPanHintSeen();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSpacePressed, hasSeenPanHint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left-click with spacebar, or middle mouse button (button 1)
    const isMiddleClick = e.button === 1;
    const isSpaceClick = isSpacePressedRef.current && e.button === 0;

    if (isSpaceClick || isMiddleClick) {
      e.preventDefault();
      e.stopPropagation();

      markPanHintSeen();
      isPanningRef.current = true;
      setIsPanning(true);
      didDragRef.current = false;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isPanningRef.current) return;
        const dx = moveEvent.clientX - dragStartRef.current.x;
        const dy = moveEvent.clientY - dragStartRef.current.y;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          didDragRef.current = true;
        }

        const newPanX = Math.round(dragStartRef.current.panX + dx);
        const newPanY = Math.round(dragStartRef.current.panY + dy);

        if (onUpdateCompositionRef.current) {
          onUpdateCompositionRef.current({ panX: newPanX, panY: newPanY });
        }
      };

      const handleMouseUp = () => {
        isPanningRef.current = false;
        setIsPanning(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handlePieceClick = (e: React.MouseEvent, pieceId: string) => {
    e.stopPropagation();
    if (didDragRef.current || isSpacePressedRef.current || isPanningRef.current) return;
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelectPiece(pieceId, isMulti);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDragRef.current || isSpacePressedRef.current || isPanningRef.current) return;
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
    if (didDragRef.current || isSpacePressedRef.current || isPanningRef.current) return;
    if (!onUpdateComposition) return;

    const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;

    if (isMultiKey) {
      // Toggle cell in multi-selection atomically
      setSelectedGridCells(prev => {
        const alreadySelected = prev.some(c => c.row === rowIndex && c.col === colIndex);
        const nextCells = alreadySelected
          ? prev.filter(c => !(c.row === rowIndex && c.col === colIndex))
          : [...prev, { row: rowIndex, col: colIndex }];

        if (nextCells.length === 0) {
          setActiveCellMenu(null);
        } else {
          const lastCell = nextCells[nextCells.length - 1];
          setActiveCellMenu(curr => ({
            row: lastCell.row,
            col: lastCell.col,
            x: curr ? curr.x : e.clientX,
            y: curr ? curr.y : e.clientY
          }));
        }
        return nextCells;
      });
      return;
    }

    // Normal click without modifiers: single selection
    setSelectedGridCells([{ row: rowIndex, col: colIndex }]);
    setActiveCellMenu({
      row: rowIndex,
      col: colIndex,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleSelectCellMotif = (motifId: string | null) => {
    if (!onUpdateComposition) return;
    const targets = selectedGridCells.length > 0
      ? selectedGridCells
      : (activeCellMenu ? [{ row: activeCellMenu.row, col: activeCellMenu.col }] : []);
    if (targets.length === 0) return;

    const nextOverrides = { ...(composition.cellOverrides || {}) };

    let unitX = composition.patternUnitX || composition.repeatX;
    let unitY = composition.patternUnitY || composition.repeatY;

    targets.forEach(({ row, col }) => {
      const key = `${row}-${col}`;
      if (motifId === null) {
        nextOverrides[key] = false;
      } else {
        nextOverrides[key] = motifId;
      }
      if (col >= unitX) unitX = col + 1;
      if (row >= unitY) unitY = row + 1;
    });

    onUpdateComposition({
      cellOverrides: nextOverrides,
      patternUnitX: unitX,
      patternUnitY: unitY,
      isPatternTiled: true
    });

    const motifName = motifId === null ? 'Fondo liso' : (getMotifById(motifId)?.name || motifId);
    if (targets.length > 1) {
      setBackgroundNotice(`${targets.length} placas actualizadas: "${motifName}"`);
    } else {
      setBackgroundNotice(`Celda (${targets[0].row + 1}, ${targets[0].col + 1}): ${motifName}`);
    }
  };

  const handleSelectCellRotation = (rotation: number) => {
    if (!onUpdateComposition) return;
    const targets = selectedGridCells.length > 0
      ? selectedGridCells
      : (activeCellMenu ? [{ row: activeCellMenu.row, col: activeCellMenu.col }] : []);
    if (targets.length === 0) return;

    const nextRotations = { ...(composition.cellRotations || {}) };

    let unitX = composition.patternUnitX || composition.repeatX;
    let unitY = composition.patternUnitY || composition.repeatY;

    targets.forEach(({ row, col }) => {
      const key = `${row}-${col}`;
      if (rotation === 0) {
        delete nextRotations[key];
      } else {
        nextRotations[key] = rotation;
      }
      if (col >= unitX) unitX = col + 1;
      if (row >= unitY) unitY = row + 1;
    });

    onUpdateComposition({
      cellRotations: nextRotations,
      patternUnitX: unitX,
      patternUnitY: unitY,
      isPatternTiled: true
    });

    const rotLabel = rotation === 180 ? 'Invertida (+180°)' : 'Normal (0°)';
    if (targets.length > 1) {
      setBackgroundNotice(`Orientación ${rotLabel} aplicada a ${targets.length} placas`);
    } else {
      setBackgroundNotice(`Celda (${targets[0].row + 1}, ${targets[0].col + 1}): Orientación ${rotLabel}`);
    }
  };

  const handleApplyToRow = (motifId: string | null, rotation: number) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { row } = activeCellMenu;
    const nextOverrides = { ...(composition.cellOverrides || {}) };
    const nextRotations = { ...(composition.cellRotations || {}) };

    for (let c = 0; c < composition.repeatX; c++) {
      const key = `${row}-${c}`;
      nextOverrides[key] = motifId === null ? false : (motifId || motif.id);
      if (rotation === 0) {
        delete nextRotations[key];
      } else {
        nextRotations[key] = rotation;
      }
    }

    onUpdateComposition({
      cellOverrides: nextOverrides,
      cellRotations: nextRotations,
      patternUnitX: composition.patternUnitX || composition.repeatX,
      patternUnitY: composition.patternUnitY || composition.repeatY,
      isPatternTiled: true
    });
    setBackgroundNotice(`Fila ${row + 1} actualizada`);
  };

  const handleApplyToCol = (motifId: string | null, rotation: number) => {
    if (!activeCellMenu || !onUpdateComposition) return;
    const { col } = activeCellMenu;
    const nextOverrides = { ...(composition.cellOverrides || {}) };
    const nextRotations = { ...(composition.cellRotations || {}) };

    for (let r = 0; r < composition.repeatY; r++) {
      const key = `${r}-${col}`;
      nextOverrides[key] = motifId === null ? false : (motifId || motif.id);
      if (rotation === 0) {
        delete nextRotations[key];
      } else {
        nextRotations[key] = rotation;
      }
    }

    onUpdateComposition({
      cellOverrides: nextOverrides,
      cellRotations: nextRotations,
      patternUnitX: composition.patternUnitX || composition.repeatX,
      patternUnitY: composition.patternUnitY || composition.repeatY,
      isPatternTiled: true
    });
    setBackgroundNotice(`Columna ${col + 1} actualizada`);
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
          if (rotation === 0) {
            delete nextRotations[key];
          } else {
            nextRotations[key] = rotation;
          }
        } else {
          nextOverrides[key] = false;
        }
      }
    }

    onUpdateComposition({
      cellOverrides: nextOverrides,
      cellRotations: nextRotations,
      patternUnitX: composition.patternUnitX || composition.repeatX,
      patternUnitY: composition.patternUnitY || composition.repeatY,
      isPatternTiled: true
    });
    setBackgroundNotice('Patrón damero aplicado');
  };

  const handleResetCell = () => {
    if (!onUpdateComposition) return;
    const targets = selectedGridCells.length > 0
      ? selectedGridCells
      : (activeCellMenu ? [{ row: activeCellMenu.row, col: activeCellMenu.col }] : []);
    if (targets.length === 0) return;

    const nextOverrides = { ...(composition.cellOverrides || {}) };
    const nextRotations = { ...(composition.cellRotations || {}) };

    targets.forEach(({ row, col }) => {
      const key = `${row}-${col}`;
      delete nextOverrides[key];
      delete nextRotations[key];
    });

    const hasAnyCustom = Object.keys(nextOverrides).length > 0 || Object.keys(nextRotations).length > 0;

    onUpdateComposition({
      cellOverrides: nextOverrides,
      cellRotations: nextRotations,
      isPatternTiled: hasAnyCustom,
      ...(hasAnyCustom ? {} : { patternUnitX: undefined, patternUnitY: undefined })
    });

    if (targets.length > 1) {
      setBackgroundNotice(`${targets.length} placas restablecidas`);
    } else {
      setBackgroundNotice(`Celda (${targets[0].row + 1}, ${targets[0].col + 1}) restablecida`);
    }
  };

  const handleSelectAllCells = () => {
    const allCells: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < composition.repeatY; r++) {
      for (let c = 0; c < composition.repeatX; c++) {
        allCells.push({ row: r, col: c });
      }
    }
    setSelectedGridCells(allCells);
    if (!activeCellMenu && allCells.length > 0) {
      setActiveCellMenu({
        row: 0,
        col: 0,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    }
    setBackgroundNotice(`Todas las placas (${allCells.length}) seleccionadas`);
  };

  const handleClearSelection = () => {
    setSelectedGridCells([]);
    setActiveCellMenu(null);
  };

  const selectedPieces = svgData?.motifPieces.filter(p => selectedPieceIds.includes(p.id)) || [];
  const selectedPiece = selectedPieces[0] || svgData?.motifPieces.find(p => p.id === selectedPieceId);

  const handleMainCanvasClick = (e: React.MouseEvent) => {
    if (didDragRef.current || isSpacePressedRef.current || isPanningRef.current) {
      didDragRef.current = false;
      return;
    }
    if (viewMode === 'pattern') {
      // If clicking outside any tile without Shift/Ctrl/Cmd modifiers, clear selection
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement | null;
        if (target && !target.closest?.('[data-grid-tile]') && !target.closest?.('[data-popover-menu]')) {
          setSelectedGridCells([]);
          setActiveCellMenu(null);
        }
      }
    } else {
      onSelectPiece(null);
    }
  };

  return (
    <main
      id="tour-design-canvas"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleMainCanvasClick}
      className={`flex-1 h-full bg-[#F7F6F2] relative overflow-hidden flex flex-col select-none ${isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : ''
        }`}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-20 pointer-events-none">
        {/* Active Motif Title Badge & Show Library Toggle */}
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 pr-2 rounded-lg border border-[#E7E4DE] shadow-xs flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-charcoal" />
          <div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-charcoal">
                Motivo {motif.catalogueNumber} · {motif.name}
              </span>
              <span className="text-[10px] text-taupe bg-[#F7F6F2] px-1.5 py-0.2 rounded border border-[#E7E4DE] font-medium">
                {activeFormat === 'round' ? 'Redonda' : 'Hexagonal'}
              </span>
            </div>
            <p className="text-[11px] text-taupe">
              {viewMode === 'single'
                ? 'Vista detallada'
                : `Composición ${composition.repeatX}×${composition.repeatY}`}
            </p>
          </div>
        </div>


        {/* View & Canvas Tools */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-[#E7E4DE] shadow-xs">
          <button
            onClick={() => onUpdateComposition?.({ zoom: Math.max(0.4, Math.round((composition.zoom - 0.15) * 100) / 100) })}
            className="p-2 text-taupe hover:text-charcoal hover:bg-[#F7F6F2] rounded-lg transition-colors cursor-pointer"
            title="Reducir zoom (Ctrl + rueda hacia abajo)"
            aria-label="Reducir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span
            className="text-xs font-mono text-charcoal px-1 w-12 text-center tabular-nums cursor-default"
            title="Zoom actual (Ctrl + rueda del ratón)"
          >
            {Math.round(composition.zoom * 100)}%
          </span>
          <button
            onClick={() => onUpdateComposition?.({ zoom: Math.min(2.5, Math.round((composition.zoom + 0.15) * 100) / 100) })}
            className="p-2 text-taupe hover:text-charcoal hover:bg-[#F7F6F2] rounded-lg transition-colors cursor-pointer"
            title="Aumentar zoom (Ctrl + rueda hacia arriba)"
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#E7E4DE] mx-1" />

          <button
            onClick={() => onUpdateComposition?.({ zoom: 1.0, panX: 0, panY: 0 })}
            className="p-2 text-taupe hover:text-charcoal hover:bg-[#F7F6F2] rounded-lg transition-colors cursor-pointer"
            title="Centrar y restablecer vista (Zoom 100% y posición original)"
            aria-label="Centrar y restablecer vista"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#E7E4DE] mx-1" />

          <button
            onClick={onOpenTour}
            className="p-2 rounded-lg transition-colors cursor-pointer text-taupe hover:text-charcoal hover:bg-[#F7F6F2]"
            title="Ver tutorial de uso"
            aria-label="Ver tutorial de uso"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Spacebar Pan Cue (only shown the very first time the user triggers the gesture) */}
      {isSpacePressed && !hasSeenPanHint && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 bg-charcoal/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-medium shadow-md z-30 flex items-center gap-2 animate-fade-in pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[#DDA743] animate-pulse" />
          <span>Arrastra con el ratón para mover el lienzo</span>
        </div>
      )}

      {/* Background feedback notice toast */}
      {backgroundNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-charcoal text-white px-4 py-2 rounded-lg text-xs font-medium shadow-lg z-30 flex items-center gap-2 animate-fade-in pointer-events-none">
          <HelpCircle className="w-4 h-4 text-[#DDA743]" />
          <span>{backgroundNotice}</span>
        </div>
      )}

      {/* Floating Selected Piece(s) Tooltip / Quick Info */}
      {selectedPieceIds.length > 1 && !selectedPieceIds.includes('background') && viewMode !== 'simulation' && (
        <div className="absolute bottom-4 left-5 z-20 bg-white/95 backdrop-blur-md p-3 px-4 rounded-lg border border-charcoal shadow-md flex items-center gap-3 animate-fade-in">
          <div className="flex -space-x-1.5 overflow-hidden">
            {selectedPieceIds.slice(0, 5).map(id => (
              <div
                key={id}
                className="w-6 h-6 rounded-full border-2 border-white shadow-xs shrink-0"
                style={{ backgroundColor: customization.pieceColors[id] || '#000000' }}
              />
            ))}
            {selectedPieceIds.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-charcoal text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shrink-0">
                +{selectedPieceIds.length - 5}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-charcoal">
              {selectedPieceIds.length} piezas seleccionadas
            </div>
            <div className="text-[11px] text-taupe">
              Ctrl + clic para añadir o quitar piezas
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPiece(null);
            }}
            className="text-[11px] text-taupe hover:text-charcoal ml-4 px-2.5 py-1 rounded-lg bg-[#F7F6F2] hover:bg-[#EDEBE6] border border-[#E7E4DE] cursor-pointer transition-colors"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {selectedPieceIds.length === 1 && selectedPiece && !selectedPieceIds.includes('background') && viewMode !== 'simulation' && (() => {
        const pieceColor = customization.pieceColors[selectedPiece.id] || selectedPiece.originalColor || '#000000';
        const pieceMat = findMaterialByHex(pieceColor);
        return (
          <div className="absolute bottom-4 left-5 z-20 bg-white/95 backdrop-blur-md p-3 rounded-lg border border-charcoal shadow-md flex items-center gap-3 animate-fade-in">
            <div
              className="w-7 h-7 rounded-full border border-black/10 shadow-xs shrink-0"
              style={{ backgroundColor: pieceColor }}
            />
            <div>
              <div className="text-xs font-bold text-charcoal">{selectedPiece.name}</div>
              <div className="text-[11px] text-taupe">
                {pieceMat ? `Ref. ${pieceMat.code} · ${pieceMat.name}` : pieceColor}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectPiece(null);
              }}
              className="text-[11px] text-taupe hover:text-charcoal ml-4 px-2 py-1 rounded bg-[#F7F6F2] border border-[#E7E4DE] cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        );
      })()}

      {(selectedPieceIds.includes('background') || selectedPieceId === 'background') && viewMode !== 'simulation' && (() => {
        const bgHex = customization.backgroundColor || '#D9D9D9';
        const bgMat = findMaterialByHex(bgHex);
        return (
          <div className="absolute bottom-4 left-5 z-20 bg-white/95 backdrop-blur-md p-3 rounded-lg border border-charcoal shadow-md flex items-center gap-3 animate-fade-in">
            <div
              className="w-7 h-7 rounded-full border border-black/10 shadow-xs shrink-0"
              style={{ backgroundColor: bgHex }}
            />
            <div>
              <div className="text-xs font-bold text-charcoal">Fondo del mosaico</div>
              <div className="text-[11px] text-taupe">
                {bgMat ? `Ref. ${bgMat.code} · ${bgMat.name}` : bgHex}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectPiece(null);
              }}
              className="text-[11px] text-taupe hover:text-charcoal ml-4 px-2 py-1 rounded bg-[#F7F6F2] border border-[#E7E4DE] cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        );
      })()}

      {/* Main Vector Rendering Canvas Area */}
      <div
        className={`flex-1 w-full h-full flex items-center justify-center p-8 overflow-hidden ${isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : ''
          }`}
      >
        <div
          className={`relative ${isPanning ? 'transition-none' : 'transition-transform duration-150 ease-out'} ${isSpacePressed ? 'pointer-events-none' : ''
            }`}
          style={{
            transform: `translate(${composition.panX || 0}px, ${composition.panY || 0}px) scale(${composition.zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* SVG Canvas Board */}
          {!svgData ? (
            <div className="w-[420px] h-[420px] bg-white rounded-2xl border border-dashed border-[#C5C1BA] flex flex-col items-center justify-center p-8 text-center shadow-xs">
              <Layers className="w-10 h-10 text-[#AFAAA0] mb-3 stroke-[1.5]" />
              <h3 className="text-sm font-semibold text-charcoal">
                Trazado oficial pendiente
              </h3>
              <p className="text-xs text-taupe mt-1 max-w-xs leading-relaxed">
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
                    ? 'border-2 border-charcoal ring-4 ring-charcoal/10 shadow-md'
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
                  data-pattern-canvas="true"
                  className="bg-white rounded-2xl p-6 shadow-sm border border-[#E7E4DE] overflow-hidden flex items-center justify-center"
                  style={{
                    width: Math.min(1300, totalWidth + 48),
                    height: Math.min(850, Math.round(((totalHeight + 48) / (totalWidth + 48)) * Math.min(1300, totalWidth + 48)))
                  }}
                >
                  <svg
                    data-pattern-canvas="true"
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
                          motif.id,
                          composition.patternUnitX,
                          composition.patternUnitY,
                          composition.isPatternTiled
                        );
                        const hasMotif = cellMotifId !== null;
                        const cellOffset = getCellRotationOffset(
                          rowIndex,
                          colIndex,
                          composition.cellRotations,
                          composition.patternUnitX,
                          composition.patternUnitY,
                          composition.isPatternTiled
                        );
                        const cellRot = ((customization.rotation ?? 0) + cellOffset) % 360;
                        const cellMotifDef = cellMotifId ? (getMotifById(cellMotifId) || motif) : motif;
                        const cellSvgData = cellMotifDef.svgData[activeFormat] || svgData;
                        const cellCust = cellMotifId
                          ? getCustomizationForMotif(cellMotifId)
                          : customization;

                        const isSelected = selectedGridCells.some(
                          c => c.row === rowIndex && c.col === colIndex
                        );
                        const isHovered =
                          hoveredGridCell?.row === rowIndex && hoveredGridCell?.col === colIndex;

                        const isOverridden = Boolean(
                          (composition.cellOverrides && composition.cellOverrides[cellKey] !== undefined) ||
                          (composition.cellRotations && composition.cellRotations[cellKey] !== undefined) ||
                          (composition.isPatternTiled && (
                            (composition.patternUnitX && composition.patternUnitY && (
                              (composition.cellOverrides && composition.cellOverrides[`${rowIndex % composition.patternUnitY}-${colIndex % composition.patternUnitX}`] !== undefined) ||
                              (composition.cellRotations && composition.cellRotations[`${rowIndex % composition.patternUnitY}-${colIndex % composition.patternUnitX}`] !== undefined)
                            ))
                          ))
                        );

                        return (
                          <g
                            key={`cell-${rowIndex}-${colIndex}`}
                            data-grid-tile="true"
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
                              data-grid-tile="true"
                              x={0}
                              y={0}
                              width={tileW}
                              height={tileH}
                              fill="transparent"
                              className="cursor-pointer"
                            />

                            {/* Interactive Hover & Selection Feedback Indicator */}
                            {isSelected && (
                              <g className="pointer-events-none">
                                {/* Solid ring for selected tiles */}
                                <rect
                                  x={1.5}
                                  y={1.5}
                                  width={tileW - 3}
                                  height={tileH - 3}
                                  rx={8}
                                  fill="rgba(36, 36, 36, 0.1)"
                                // stroke="#242424"
                                // strokeWidth={3}
                                />
                                {/* Selection Checkmark Badge */}
                                <g transform={`translate(${Math.max(10, tileW - 34)}, 8)`}>
                                  <rect
                                    x={0}
                                    y={0}
                                    width={24}
                                    height={24}
                                    rx={12}
                                    fill="#242424"
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                  />
                                  <path
                                    d="M7 12l3.5 3.5 6.5-7"
                                    fill="none"
                                    stroke="#FFFFFF"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                              </g>
                            )}

                            {isHovered && !isSelected && (
                              <g className="pointer-events-none">
                                {/* Distinct dashed perimeter border */}
                                <rect
                                  x={1.5}
                                  y={1.5}
                                  width={tileW - 3}
                                  height={tileH - 3}
                                  rx={8}
                                  fill="rgba(36, 36, 36, 0.1)"
                                // stroke="#242424"
                                // strokeWidth={2}
                                // strokeDasharray="6 4"
                                />
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

      {/* Floating Multi-selection Toolbar / Chip */}
      {viewMode === 'pattern' && selectedGridCells.length > 1 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-charcoal/95 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg border border-black/10 flex items-center gap-3 animate-fade-in select-none">
          <div className="w-2 h-2 rounded-full bg-[#DDA743]" />
          <span className="text-xs font-semibold">
            {selectedGridCells.length} placas seleccionadas
          </span>
          <span className="text-[11px] text-[#A8A49C] hidden sm:inline">
            (Ctrl + clic para añadir o quitar)
          </span>
          <button
            onClick={handleClearSelection}
            className="text-[11px] font-semibold text-[#DDA743] hover:text-white transition-colors cursor-pointer pl-2"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* Contextual Cell Popover Menu */}
      {activeCellMenu && viewMode === 'pattern' && (() => {
        const isBatch = selectedGridCells.length > 1;
        const refRow = activeCellMenu.row;
        const refCol = activeCellMenu.col;

        let currentMotifId: string | null = null;
        let currentRotation = 0;

        if (isBatch) {
          const firstCell = selectedGridCells[0];
          const firstMotifId = getCellMotif(
            firstCell.row,
            firstCell.col,
            composition.plainTileCadence || 'none',
            composition.repeatX,
            composition.cellOverrides,
            motif.id,
            composition.patternUnitX,
            composition.patternUnitY,
            composition.isPatternTiled
          );
          const allSameMotif = selectedGridCells.every(c => {
            const mId = getCellMotif(
              c.row,
              c.col,
              composition.plainTileCadence || 'none',
              composition.repeatX,
              composition.cellOverrides,
              motif.id,
              composition.patternUnitX,
              composition.patternUnitY,
              composition.isPatternTiled
            );
            return mId === firstMotifId;
          });
          currentMotifId = allSameMotif ? firstMotifId : undefined as unknown as string | null;

          const firstOffset = getCellRotationOffset(
            firstCell.row,
            firstCell.col,
            composition.cellRotations,
            composition.patternUnitX,
            composition.patternUnitY,
            composition.isPatternTiled
          );
          const allSameRot = selectedGridCells.every(c => {
            const r = getCellRotationOffset(
              c.row,
              c.col,
              composition.cellRotations,
              composition.patternUnitX,
              composition.patternUnitY,
              composition.isPatternTiled
            );
            return r === firstOffset;
          });
          currentRotation = allSameRot ? firstOffset : -1;
        } else {
          currentMotifId = getCellMotif(
            refRow,
            refCol,
            composition.plainTileCadence || 'none',
            composition.repeatX,
            composition.cellOverrides,
            motif.id,
            composition.patternUnitX,
            composition.patternUnitY,
            composition.isPatternTiled
          );
          currentRotation = getCellRotationOffset(
            refRow,
            refCol,
            composition.cellRotations,
            composition.patternUnitX,
            composition.patternUnitY,
            composition.isPatternTiled
          );
        }

        return (
          <CellPopoverMenu
            row={refRow}
            col={refCol}
            selectedCells={selectedGridCells}
            currentMotifId={currentMotifId}
            currentRotation={currentRotation}
            activeFormat={activeFormat}
            primaryMotif={motif}
            clickPosition={{ x: activeCellMenu.x, y: activeCellMenu.y }}
            initialPosition={popoverCustomPos}
            getCustomizationForMotif={getCustomizationForMotif}
            onSelectMotif={handleSelectCellMotif}
            onSelectRotation={handleSelectCellRotation}
            onApplyToRow={handleApplyToRow}
            onApplyToCol={handleApplyToCol}
            onResetCell={handleResetCell}
            onClearSelection={handleClearSelection}
            onSelectAll={handleSelectAllCells}
            onPositionChange={setPopoverCustomPos}
            onClose={() => {
              setActiveCellMenu(null);
              setSelectedGridCells([]);
            }}
          />
        );
      })()}

    </main>
  );
};
