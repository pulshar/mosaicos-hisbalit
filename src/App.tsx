import React, { useState, useEffect, useCallback } from 'react';
import { PETITE_MOTIFS, getMotifById, getDefaultCustomization } from './data/motifs';
import {
  MotifDefinition,
  MotifCustomization,
  CompositionSettings,
  MotifFormat
} from './types';
import { useDesignHistory, DesignSnapshot, DesignCompositionState } from './hooks/useDesignHistory';
import { Header } from './components/Header';
import { MotifLibrary } from './components/MotifLibrary';
import { DesignCanvas } from './components/DesignCanvas';
import { CustomizationPanel } from './components/CustomizationPanel';
import { SpaceSimulator } from './components/SpaceSimulator';
import { ExportModal } from './components/ExportModal';
import { WalkthroughTour } from './components/WalkthroughTour';
import {
  generateSingleMotifSvg,
  generateCompositionSvg,
  downloadFile,
  downloadSvgAsPng
} from './utils/exportUtils';
import { resolveEffectiveMotifCustomization, convertCustomizationFormat } from './utils/motifColorUtils';
import { ChevronLeft, ChevronRight, PaletteIcon } from 'lucide-react';

const STORAGE_KEY_CUSTOMIZATION = 'mosaico_studio_customization';
const STORAGE_KEY_COMPOSITION = 'mosaico_studio_composition';
const STORAGE_KEY_LIBRARY_OPEN = 'mosaico_studio_library_open';
const STORAGE_KEY_CUSTOMIZATION_PANEL_OPEN = 'mosaico_studio_customization_panel_open';
const STORAGE_KEY_CUSTOMIZATIONS_MAP = 'mosaico_studio_customizations_map';
const STORAGE_KEY_EDITED_MOTIFS = 'mosaico_studio_edited_motifs';
const STORAGE_KEY_TOUR_COMPLETED = 'mosaico_studio_tour_completed';

export default function App() {
  // 1. Initial State from storage or defaults
  const [activeMotif, setActiveMotif] = useState<MotifDefinition>(() => {
    return PETITE_MOTIFS[0]; // Point
  });

  const getInitialComposition = (): CompositionSettings => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMPOSITION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.repeatX) return parsed;
      }
    } catch {
      // fallback
    }
    return {
      viewMode: 'single',
      repeatX: 4,
      repeatY: 4,
      spacingX: 0,
      spacingY: 0,
      staggered: false,
      plainTileCadence: 'none',
      showPlainBackground: false,
      secondaryMotifId: null,
      combineRatio: 'single',
      zoom: 1.0,
      panX: 0,
      panY: 0
    };
  };

  const initialCompositionState = getInitialComposition();
  const [composition, setComposition] = useState<CompositionSettings>(initialCompositionState);

  const getInitialSnapshot = (): DesignSnapshot => {
    let initialCust = getDefaultCustomization(activeMotif.id, 'round');
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMIZATION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.motifId && parsed.pieceColors) initialCust = parsed;
      }
    } catch {
      // fallback
    }

    const initialCompDesign: DesignCompositionState = {
      repeatX: initialCompositionState.repeatX ?? 4,
      repeatY: initialCompositionState.repeatY ?? 4,
      patternUnitX: initialCompositionState.patternUnitX,
      patternUnitY: initialCompositionState.patternUnitY,
      isPatternTiled: initialCompositionState.isPatternTiled ?? false,
      ensureContinuity: initialCompositionState.ensureContinuity ?? false,
      spacingX: initialCompositionState.spacingX ?? 0,
      spacingY: initialCompositionState.spacingY ?? 0,
      staggered: initialCompositionState.staggered ?? false,
      plainTileCadence: initialCompositionState.plainTileCadence ?? 'none',
      cellOverrides: initialCompositionState.cellOverrides ?? {},
      cellRotations: initialCompositionState.cellRotations ?? {},
      showPlainBackground: initialCompositionState.showPlainBackground ?? false,
      secondaryMotifId: initialCompositionState.secondaryMotifId ?? null,
      combineRatio: initialCompositionState.combineRatio ?? 'single'
    };

    return {
      motifId: initialCust.motifId || activeMotif.id,
      customization: initialCust,
      composition: initialCompDesign
    };
  };

  // 2. Unified Undo / Redo history for customization + composition (cadences, cell overrides, rotations)
  const {
    snapshot,
    customization,
    compositionDesign,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    reset
  } = useDesignHistory(getInitialSnapshot());

  // Helper to update customization while pushing to unified history
  const setCustomization = useCallback((
    newCustomization: MotifCustomization | ((prev: MotifCustomization) => MotifCustomization)
  ) => {
    pushSnapshot(current => {
      const nextCust = typeof newCustomization === 'function'
        ? newCustomization(current.customization)
        : newCustomization;
      return {
        ...current,
        customization: nextCust
      };
    });
  }, [pushSnapshot]);

  // Synchronize composition design when history navigates backward or forward
  useEffect(() => {
    setComposition(prev => ({
      ...prev,
      repeatX: compositionDesign.repeatX,
      repeatY: compositionDesign.repeatY,
      patternUnitX: compositionDesign.patternUnitX,
      patternUnitY: compositionDesign.patternUnitY,
      isPatternTiled: compositionDesign.isPatternTiled,
      ensureContinuity: compositionDesign.ensureContinuity,
      spacingX: compositionDesign.spacingX,
      spacingY: compositionDesign.spacingY,
      staggered: compositionDesign.staggered,
      plainTileCadence: compositionDesign.plainTileCadence,
      cellOverrides: compositionDesign.cellOverrides,
      cellRotations: compositionDesign.cellRotations,
      showPlainBackground: compositionDesign.showPlainBackground,
      secondaryMotifId: compositionDesign.secondaryMotifId,
      combineRatio: compositionDesign.combineRatio
    }));
  }, [compositionDesign]);

  // Synchronize active motif if snapshot has a different motif
  useEffect(() => {
    if (snapshot.motifId && snapshot.motifId !== activeMotif.id) {
      const target = getMotifById(snapshot.motifId);
      if (target) {
        setActiveMotif(target);
      }
    }
  }, [snapshot.motifId, activeMotif.id]);

  // 3. Selection & Viewport States
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const selectedPieceId = selectedPieceIds[0] || null;

  const handleSelectPiece = useCallback((pieceId: string | string[] | null, isMulti = false) => {
    if (!pieceId) {
      setSelectedPieceIds([]);
      return;
    }
    // When user selects a piece or background, automatically open customization panel if hidden
    setIsCustomizationPanelOpen(true);

    if (Array.isArray(pieceId)) {
      setSelectedPieceIds(pieceId);
      return;
    }
    if (pieceId === 'background') {
      setSelectedPieceIds(['background']);
      return;
    }
    setSelectedPieceIds(prev => {
      const withoutBg = prev.filter(id => id !== 'background');
      if (!isMulti) {
        return [pieceId];
      }
      if (withoutBg.includes(pieceId)) {
        return withoutBg.filter(id => id !== pieceId);
      } else {
        return [...withoutBg, pieceId];
      }
    });
  }, []);

  const handleSelectMultiplePieces = useCallback((pieceIds: string[]) => {
    setSelectedPieceIds(pieceIds);
    if (pieceIds.length > 0) {
      setIsCustomizationPanelOpen(true);
    }
  }, []);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMotifLibraryOpen, setIsMotifLibraryOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LIBRARY_OPEN);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMIZATION_PANEL_OPEN);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Tour walkthrough state (opens automatically on first visit)
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY_TOUR_COMPLETED);
      return completed === null;
    } catch {
      return false;
    }
  });

  const handleCloseTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY_TOUR_COMPLETED, 'true');
    } catch {
      // ignore
    }
  }, []);

  const handleOpenTour = useCallback(() => {
    if (composition.viewMode === 'simulation') {
      setComposition(prev => ({ ...prev, viewMode: 'single' }));
    }
    setIsMotifLibraryOpen(true);
    setIsCustomizationPanelOpen(true);
    setIsTourOpen(true);
  }, [composition.viewMode]);

  const handleTourStepChange = useCallback((stepIndex: number) => {
    if (stepIndex === 0) {
      setIsMotifLibraryOpen(true);
    } else if (stepIndex === 1) {
      setIsCustomizationPanelOpen(true);
    }
  }, []);

  // 4. Multi-motif customizations map and edited memory
  const [customizationsMap, setCustomizationsMap] = useState<Record<string, MotifCustomization>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOMIZATIONS_MAP);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const [editedMotifIds, setEditedMotifIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EDITED_MOTIFS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  // LocalStorage persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMIZATION, JSON.stringify(customization));
    } catch {
      // ignore
    }
  }, [customization]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPOSITION, JSON.stringify(composition));
    } catch {
      // ignore
    }
  }, [composition]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LIBRARY_OPEN, JSON.stringify(isMotifLibraryOpen));
    } catch {
      // ignore
    }
  }, [isMotifLibraryOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMIZATION_PANEL_OPEN, JSON.stringify(isCustomizationPanelOpen));
    } catch {
      // ignore
    }
  }, [isCustomizationPanelOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMIZATIONS_MAP, JSON.stringify(customizationsMap));
    } catch {
      // ignore
    }
  }, [customizationsMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EDITED_MOTIFS, JSON.stringify(editedMotifIds));
    } catch {
      // ignore
    }
  }, [editedMotifIds]);

  // Synchronize active customization into map
  useEffect(() => {
    if (customization && customization.motifId) {
      setCustomizationsMap(prev => ({
        ...prev,
        [customization.motifId]: customization
      }));
    }
  }, [customization]);

  const getCustomizationForMotif = useCallback((motifId: string): MotifCustomization => {
    return resolveEffectiveMotifCustomization(
      motifId,
      customization.format,
      customization,
      customizationsMap,
      editedMotifIds
    );
  }, [customization, customizationsMap, editedMotifIds]);

  // 5. Keyboard shortcuts for Undo/Redo, Deselect & Panels Toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (canRedo) redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        // El shortcut Ctrl + b ocultará y/o mostrará ambos paneles
        const shouldOpen = !isMotifLibraryOpen && !isCustomizationPanelOpen;
        setIsMotifLibraryOpen(shouldOpen);
        setIsCustomizationPanelOpen(shouldOpen);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          const currentSvg = activeMotif.svgData[customization.format];
          if (currentSvg && currentSvg.motifPieces.length > 0) {
            setSelectedPieceIds(currentSvg.motifPieces.map(p => p.id));
          }
        }
      } else if (e.key === 'Escape') {
        setSelectedPieceIds([]);
        setIsExportModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, isMotifLibraryOpen, isCustomizationPanelOpen, activeMotif, customization.format]);

  // 6. Action Handlers
  const handleSelectMotif = useCallback((motif: MotifDefinition) => {
    if (!motif.available) return;
    setActiveMotif(motif);
    setSelectedPieceIds([]);
    const targetCust = getCustomizationForMotif(motif.id);
    pushSnapshot(current => ({
      ...current,
      motifId: motif.id,
      customization: targetCust
    }));
  }, [getCustomizationForMotif, pushSnapshot]);

  const handleGoToCustomizeMotif = useCallback((motifId: string) => {
    const target = getMotifById(motifId);
    if (!target) return;
    handleSelectMotif(target);
  }, [handleSelectMotif]);

  const handleUpdatePieceColor = useCallback((pieceId: string, color: string) => {
    setEditedMotifIds(prev => ({ ...prev, [activeMotif.id]: true }));
    setCustomization(prev => {
      const targetIds = (selectedPieceIds.length > 1 && selectedPieceIds.includes(pieceId))
        ? selectedPieceIds
        : [pieceId];
      const nextColors = { ...prev.pieceColors };
      targetIds.forEach(id => {
        if (id !== 'background') {
          nextColors[id] = color;
        }
      });
      return {
        ...prev,
        pieceColors: nextColors
      };
    });
  }, [activeMotif.id, selectedPieceIds, setCustomization]);

  const handleUpdatePieceColors = useCallback((pieceIds: string[], color: string) => {
    setEditedMotifIds(prev => ({ ...prev, [activeMotif.id]: true }));
    setCustomization(prev => {
      const nextColors = { ...prev.pieceColors };
      pieceIds.forEach(id => {
        if (id !== 'background') {
          nextColors[id] = color;
        }
      });
      return {
        ...prev,
        pieceColors: nextColors
      };
    });
  }, [activeMotif.id, setCustomization]);

  const handleApplyColorToAllMotifPieces = useCallback((color: string) => {
    const svgData = activeMotif.svgData[customization.format];
    if (!svgData) return;

    setEditedMotifIds(prev => ({ ...prev, [activeMotif.id]: true }));
    setCustomization(prev => {
      const nextColors = { ...prev.pieceColors };
      svgData.motifPieces.forEach(p => {
        nextColors[p.id] = color;
      });
      return {
        ...prev,
        pieceColors: nextColors
      };
    });
  }, [activeMotif, customization.format, setCustomization]);

  const handleUpdateBackgroundColor = useCallback((color: string) => {
    setCustomization(prev => ({
      ...prev,
      backgroundColor: color
    }));
  }, [setCustomization]);

  const handleUpdateFormat = useCallback((format: MotifFormat) => {
    if (customization.format === format) return;

    const targetMotif = activeMotif;
    const currentSvg = targetMotif.svgData[customization.format];
    const targetSvg = targetMotif.svgData[format];

    // Maintain selection state smoothly across format switch
    if (selectedPieceIds.includes('background')) {
      setSelectedPieceIds(['background']);
    } else if (selectedPieceIds.length > 0 && currentSvg && targetSvg) {
      const nextIds: string[] = [];
      selectedPieceIds.forEach(id => {
        const currentIdx = currentSvg.motifPieces.findIndex(p => p.id === id);
        if (currentIdx !== -1 && targetSvg.motifPieces[currentIdx]) {
          nextIds.push(targetSvg.motifPieces[currentIdx].id);
        }
      });
      setSelectedPieceIds(nextIds);
    } else {
      setSelectedPieceIds([]);
    }

    // 1. Convert active customization with homologous piece mapping
    setCustomization(prev => convertCustomizationFormat(activeMotif.id, prev, format));

    // 2. Convert ALL saved customizations in customizationsMap so secondary/combined motifs never lose colors
    setCustomizationsMap(prevMap => {
      const nextMap: Record<string, MotifCustomization> = {};
      for (const [mId, cust] of Object.entries(prevMap)) {
        nextMap[mId] = convertCustomizationFormat(mId, cust, format);
      }
      return nextMap;
    });
  }, [activeMotif.id, customization.format, selectedPieceIds, setCustomization]);

  const handleUpdateRotation = useCallback((rotation: number) => {
    setCustomization(prev => ({
      ...prev,
      rotation
    }));
  }, [setCustomization]);

  const handleResetMotifOriginalColors = useCallback(() => {
    const def = getDefaultCustomization(activeMotif.id, customization.format);
    setEditedMotifIds(prev => {
      const next = { ...prev };
      delete next[activeMotif.id];
      return next;
    });
    setCustomizationsMap(prev => ({
      ...prev,
      [activeMotif.id]: def
    }));
    setCustomization(def);
  }, [activeMotif.id, customization.format, setCustomization]);

  const [isConfirmNewModalOpen, setIsConfirmNewModalOpen] = useState(false);

  const handleResetColorsOnly = useCallback(() => {
    handleResetMotifOriginalColors();
  }, [handleResetMotifOriginalColors]);

  const handleConfirmNewDesign = useCallback(() => {
    const def = getDefaultCustomization(PETITE_MOTIFS[0].id, 'round');
    const defaultCompDesign: DesignCompositionState = {
      repeatX: 4,
      repeatY: 4,
      spacingX: 0,
      spacingY: 0,
      staggered: false,
      plainTileCadence: 'none',
      cellOverrides: {},
      cellRotations: {},
      showPlainBackground: false,
      secondaryMotifId: null,
      combineRatio: 'single'
    };

    setActiveMotif(PETITE_MOTIFS[0]);
    reset({
      motifId: PETITE_MOTIFS[0].id,
      customization: def,
      composition: defaultCompDesign
    });

    setComposition(prev => ({
      ...prev,
      ...defaultCompDesign,
      viewMode: 'single',
      zoom: 1.0,
      panX: 0,
      panY: 0
    }));

    setCustomizationsMap({ [PETITE_MOTIFS[0].id]: def });
    setEditedMotifIds({});
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOMIZATIONS_MAP);
      localStorage.removeItem(STORAGE_KEY_EDITED_MOTIFS);
      localStorage.removeItem(STORAGE_KEY_COMPOSITION);
      localStorage.removeItem(STORAGE_KEY_CUSTOMIZATION);
    } catch {
      // ignore
    }
    setSelectedPieceIds([]);
    setIsConfirmNewModalOpen(false);
  }, [reset]);

  const handleNewDesign = useCallback(() => {
    setIsConfirmNewModalOpen(true);
  }, []);

  const handleUpdateComposition = useCallback((settings: Partial<CompositionSettings>) => {
    // If only viewport/viewMode properties changed, do not push undo history step
    const isOnlyViewport = Object.keys(settings).every(k => ['viewMode', 'zoom', 'panX', 'panY'].includes(k));

    if (isOnlyViewport) {
      setComposition(prev => ({ ...prev, ...settings }));
      return;
    }

    pushSnapshot(current => {
      const updatedComposition: DesignCompositionState = {
        ...current.composition,
        ...(settings.repeatX !== undefined ? { repeatX: settings.repeatX } : {}),
        ...(settings.repeatY !== undefined ? { repeatY: settings.repeatY } : {}),
        ...(settings.patternUnitX !== undefined ? { patternUnitX: settings.patternUnitX } : {}),
        ...(settings.patternUnitY !== undefined ? { patternUnitY: settings.patternUnitY } : {}),
        ...(settings.isPatternTiled !== undefined ? { isPatternTiled: settings.isPatternTiled } : {}),
        ...(settings.ensureContinuity !== undefined ? { ensureContinuity: settings.ensureContinuity } : {}),
        ...(settings.spacingX !== undefined ? { spacingX: settings.spacingX } : {}),
        ...(settings.spacingY !== undefined ? { spacingY: settings.spacingY } : {}),
        ...(settings.staggered !== undefined ? { staggered: settings.staggered } : {}),
        ...(settings.plainTileCadence !== undefined ? { plainTileCadence: settings.plainTileCadence } : {}),
        ...(settings.cellOverrides !== undefined ? { cellOverrides: settings.cellOverrides } : {}),
        ...(settings.cellRotations !== undefined ? { cellRotations: settings.cellRotations } : {}),
        ...(settings.showPlainBackground !== undefined ? { showPlainBackground: settings.showPlainBackground } : {}),
        ...(settings.secondaryMotifId !== undefined ? { secondaryMotifId: settings.secondaryMotifId } : {}),
        ...(settings.combineRatio !== undefined ? { combineRatio: settings.combineRatio } : {})
      };

      return {
        ...current,
        composition: updatedComposition
      };
    });

    setComposition(prev => ({ ...prev, ...settings }));
  }, [pushSnapshot]);

  // Quick Direct Downloads from Panel
  const handleDownloadSvgDirect = () => {
    const svgStr = composition.viewMode === 'single'
      ? generateSingleMotifSvg(activeMotif, customization, true)
      : generateCompositionSvg(activeMotif, customization, composition, null, customizationsMap, editedMotifIds);
    const fileName = `Hisbalit_Coleccion_${activeMotif.name}_${customization.format}.svg`;
    downloadFile(svgStr, fileName, 'image/svg+xml');
  };

  const handleDownloadPngDirect = async () => {
    const svgStr = composition.viewMode === 'single'
      ? generateSingleMotifSvg(activeMotif, customization, true)
      : generateCompositionSvg(activeMotif, customization, composition, null, customizationsMap, editedMotifIds);
    const fileName = `Hisbalit_Coleccion_${activeMotif.name}_${customization.format}_4K.png`;
    await downloadSvgAsPng(svgStr, fileName, 3840);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#F7F6F2] overflow-hidden">
      {/* 1. Header (Follows anti-slop 3-zone contract) */}
      <Header
        onNewDesign={handleNewDesign}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        viewMode={composition.viewMode}
        onChangeViewMode={(mode) => setComposition(prev => ({ ...prev, viewMode: mode }))}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {composition.viewMode === 'simulation' ? (
          /* Simulation Mode */
          <SpaceSimulator
            motif={activeMotif}
            customization={customization}
            composition={composition}
            customizationsMap={customizationsMap}
            editedMotifIds={editedMotifIds}
            onClose={() => setComposition(prev => ({ ...prev, viewMode: 'single' }))}
          />
        ) : (
          /* Design Mode: Left Panel, Center Canvas, Right Panel */
          <>
            {/* Left Panel: Motifs Library */}
            <div
              id="tour-motif-library"
              className={`h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden flex justify-end relative z-10 ${isMotifLibraryOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'
                }`}
            >
              <div className="w-80 h-full">
                <MotifLibrary
                  activeMotifId={activeMotif.id}
                  onSelectMotif={handleSelectMotif}
                  activeFormat={customization.format}
                  getCustomizationForMotif={getCustomizationForMotif}
                />
              </div>
            </div>

            {/* Subtle edge toggle handle button on the seam */}
            <button
              onClick={() => setIsMotifLibraryOpen(prev => !prev)}
              className={`absolute z-30 top-1/2 -translate-y-1/2 w-4 h-12 bg-white/95 backdrop-blur-xs border border-[#E7E4DE] rounded-r-md shadow-xs hover:bg-[#F7F6F2] text-taupe hover:text-charcoal flex items-center justify-center transition-all duration-300 ease-in-out group cursor-pointer ${isMotifLibraryOpen ? 'left-80' : 'left-0'
                }`}
              title={isMotifLibraryOpen ? "Ocultar biblioteca de motivos (Ctrl+B)" : "Mostrar biblioteca de motivos (Ctrl+B)"}
              aria-label={isMotifLibraryOpen ? "Ocultar biblioteca de motivos" : "Mostrar biblioteca de motivos"}
            >
              {isMotifLibraryOpen ? (
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>

            {/* Center Canvas */}
            <DesignCanvas
              motif={activeMotif}
              customization={customization}
              composition={composition}
              selectedPieceIds={selectedPieceIds}
              customizationsMap={customizationsMap}
              editedMotifIds={editedMotifIds}
              onSelectPiece={handleSelectPiece}
              onUpdateComposition={handleUpdateComposition}
              onOpenTour={handleOpenTour}
            />

            {/* Right Panel: Customization Controls (smooth collapsible animation) */}
            <div
              id="tour-customization-panel"
              className={`h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden flex relative z-10 ${isCustomizationPanelOpen ? 'w-94 opacity-100' : 'w-0 opacity-0 pointer-events-none'
                }`}
            >
              <div className="w-94 h-full">
                <CustomizationPanel
                  motif={activeMotif}
                  customization={customization}
                  composition={composition}
                  selectedPieceId={selectedPieceId}
                  selectedPieceIds={selectedPieceIds}
                  onSelectPiece={handleSelectPiece}
                  onSelectMultiplePieces={handleSelectMultiplePieces}
                  onUpdatePieceColor={handleUpdatePieceColor}
                  onUpdatePieceColors={handleUpdatePieceColors}
                  onApplyColorToAllMotifPieces={handleApplyColorToAllMotifPieces}
                  onUpdateBackgroundColor={handleUpdateBackgroundColor}
                  onUpdateFormat={handleUpdateFormat}
                  onUpdateRotation={handleUpdateRotation}
                  onUpdateComposition={handleUpdateComposition}
                  onResetMotifOriginalColors={handleResetMotifOriginalColors}
                  onDownloadSvg={handleDownloadSvgDirect}
                  onDownloadPng={handleDownloadPngDirect}
                  onChangeViewMode={(mode) => setComposition(prev => ({ ...prev, viewMode: mode }))}
                />
              </div>
            </div>

            {/* Subtle edge toggle handle button on the right seam */}
            <button
              onClick={() => setIsCustomizationPanelOpen(prev => !prev)}
              className={`absolute z-30 top-1/2 -translate-y-1/2 w-4 h-12 bg-white/95 backdrop-blur-xs border border-[#E7E4DE] rounded-l-md shadow-xs hover:bg-[#F7F6F2] text-taupe hover:text-charcoal flex items-center justify-center transition-all duration-300 ease-in-out group cursor-pointer ${isCustomizationPanelOpen ? 'right-94' : 'right-0'
                }`}
              title={isCustomizationPanelOpen ? "Ocultar panel de personalización (Ctrl+B)" : "Mostrar panel de personalización (Ctrl+B)"}
              aria-label={isCustomizationPanelOpen ? "Ocultar panel de personalización" : "Mostrar panel de personalización"}
            >
              {isCustomizationPanelOpen ? (
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              )}
            </button>
          </>
        )}
      </div>

      {/* 3. Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          motif={activeMotif}
          customization={customization}
          composition={composition}
          customizationsMap={customizationsMap}
          editedMotifIds={editedMotifIds}
          onClose={() => setIsExportModalOpen(false)}
          onOpenSimulation={() => setComposition(prev => ({ ...prev, viewMode: 'simulation' }))}
        />
      )}

      {/* 4. Walkthrough Tour */}
      {isTourOpen && (
        <WalkthroughTour
          key="walkthrough-tour-active"
          isOpen={isTourOpen}
          onClose={handleCloseTour}
          onStepChange={handleTourStepChange}
        />
      )}

      {/* 4. Confirmation Dialog for Nuevo diseño */}
      {isConfirmNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-[#E7E4DE] shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F7F6F2] border border-[#E7E4DE] mx-auto flex items-center justify-center text-charcoal font-bold text-lg">
              <PaletteIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-charcoal">
                ¿Iniciar un nuevo diseño?
              </h3>
              <p className="text-xs text-taupe mt-1.5 leading-relaxed">
                Esto reiniciará el proyecto desde cero. Los colores volverán a los tonos originales, la rotación a 0°, y la cuadrícula a la vista individual por defecto.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsConfirmNewModalOpen(false)}
                className="py-2.5 px-3 rounded-lg border border-[#E7E4DE] bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-taupe hover:text-charcoal transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNewDesign}
                className="py-2.5 px-3 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Sí, nuevo diseño
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
