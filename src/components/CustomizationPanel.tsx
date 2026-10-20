import React, { useState, useEffect } from 'react';
import {
  MotifDefinition,
  MotifCustomization,
  CompositionSettings,
  MotifFormat,
  PlainTileCadence
} from '../types';
import { HISBALIT_PALETTE, getStoredRecentColors, saveRecentColor } from '../data/palette';
import { getCompositionPlatesCount } from '../utils/exportUtils';
import {
  Palette,
  Shapes,
  Grid,
  RotateCw,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Check,
  Circle,
  Hexagon,
  Layers,
  Search,
  X,
  Info,
  MousePointerClick,
} from 'lucide-react';

interface CustomizationPanelProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  selectedPieceId?: string | null;
  selectedPieceIds?: string[];
  onSelectPiece: (id: string | string[] | null, isMulti?: boolean) => void;
  onSelectMultiplePieces?: (pieceIds: string[]) => void;
  onUpdatePieceColor: (pieceId: string, color: string) => void;
  onUpdatePieceColors?: (pieceIds: string[], color: string) => void;
  onApplyColorToAllMotifPieces: (color: string) => void;
  onUpdateBackgroundColor: (color: string) => void;
  onUpdateFormat: (format: MotifFormat) => void;
  onUpdateRotation: (deg: number) => void;
  onUpdateComposition: (settings: Partial<CompositionSettings>) => void;
  onResetMotifOriginalColors: () => void;
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
  onChangeViewMode?: (mode: 'single' | 'pattern' | 'simulation') => void;
}

const CADENCE_PRESETS: Array<{
  id: PlainTileCadence;
  label: string;
  subtitle: string;
  badge: string;
}> = [
    { id: 'none', label: 'Continuo', subtitle: 'Todas con motivo', badge: '100%' },
    { id: 'checkerboard', label: 'Ajedrezado', subtitle: 'Damero alterno', badge: '1 : 1' },
    { id: 'ratio1_2', label: 'Intercalado', subtitle: '1 motivo / 2 lisas', badge: '1 : 2' },
    { id: 'ratio1_3', label: 'Espaciado', subtitle: '1 motivo / 3 lisas', badge: '1 : 3' },
    { id: 'rows', label: 'Franjas H.', subtitle: 'Filas alternas', badge: 'Filas' },
    { id: 'cols', label: 'Franjas V.', subtitle: 'Columnas alternas', badge: 'Col.' }
  ];

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  motif,
  customization,
  composition,
  selectedPieceId,
  selectedPieceIds = [],
  onSelectPiece,
  onSelectMultiplePieces,
  onUpdatePieceColor,
  onUpdatePieceColors,
  onApplyColorToAllMotifPieces,
  onUpdateBackgroundColor,
  onUpdateFormat,
  onUpdateRotation,
  onUpdateComposition,
  onResetMotifOriginalColors,
  onDownloadSvg,
  onDownloadPng,
  onChangeViewMode
}) => {
  // Accordion collapsed states
  const [openSections, setOpenSections] = useState({
    colors: true,
    format: true,
    distribution: true,
    rotation: true,
    composition: false,
    export: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isSingleMode = composition.viewMode === 'single';
  const activeFormat = customization.format;
  const svgData = motif.svgData[activeFormat];
  const recentColors = getStoredRecentColors();

  const plates = getCompositionPlatesCount(
    composition.repeatX,
    composition.repeatY,
    composition.plainTileCadence || 'none',
    composition.cellOverrides
  );

  // Active target for coloring: either the selected piece or the background
  const [colorTarget, setColorTarget] = useState<'piece' | 'background'>('piece');

  // Sync color target when selectedPieceId or selectedPieceIds changes (e.g. clicking background or piece on SVG canvas)
  useEffect(() => {
    if (selectedPieceIds.includes('background') || selectedPieceId === 'background') {
      setColorTarget('background');
      setOpenSections(prev => ({ ...prev, colors: true }));
    } else if (selectedPieceIds.length > 0 || selectedPieceId) {
      setColorTarget('piece');
      setOpenSections(prev => ({ ...prev, colors: true }));
    }
  }, [selectedPieceId, selectedPieceIds]);

  // Category filter and search state for materials palette
  const [materialCategory, setMaterialCategory] = useState<'Todos' | 'Neutros' | 'Tierras' | 'Mediterráneo' | 'Acentos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [noSelectionNotice, setNoSelectionNotice] = useState(false);
  const pendingColorRef = React.useRef<string | null>(null);
  const noticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear notice when pieces become selected
  useEffect(() => {
    if (selectedPieceIds.length > 0 && !selectedPieceIds.includes('background')) {
      setNoSelectionNotice(false);
    }
  }, [selectedPieceIds]);

  const hasPieceSelection = selectedPieceIds.length > 0 && !selectedPieceIds.includes('background');
  const selectedPieces = hasPieceSelection
    ? (svgData?.motifPieces.filter(p => selectedPieceIds.includes(p.id)) || [])
    : [];
  const selectedPiece = hasPieceSelection
    ? (selectedPieces[0] || (selectedPieceId && selectedPieceId !== 'background' ? svgData?.motifPieces.find(p => p.id === selectedPieceId) : null))
    : null;

  // Determine if all pieces share the exact same color
  const allPiecesSameColor = svgData?.motifPieces.length
    ? svgData.motifPieces.every(p => {
      const col = (customization.pieceColors[p.id] || p.originalColor).toLowerCase();
      const firstCol = (customization.pieceColors[svgData.motifPieces[0].id] || svgData.motifPieces[0].originalColor).toLowerCase();
      return col === firstCol;
    })
    : false;
  const commonMotifColor = allPiecesSameColor && svgData?.motifPieces[0]
    ? (customization.pieceColors[svgData.motifPieces[0].id] || svgData.motifPieces[0].originalColor)
    : null;

  // Active color for piece: only defined if there is an active piece selection
  const activeColorForPiece = selectedPiece
    ? customization.pieceColors[selectedPiece.id] || selectedPiece.originalColor
    : null;

  const currentColor = colorTarget === 'background'
    ? (customization.backgroundColor || '#D9D9D9')
    : activeColorForPiece;

  const activeMaterial = currentColor
    ? HISBALIT_PALETTE.find(s => s.hex.toUpperCase() === currentColor.toUpperCase())
    : null;

  const handleSelectMaterial = (hex: string) => {
    saveRecentColor(hex);

    if (colorTarget === 'background') {
      onUpdateBackgroundColor(hex);
    } else {
      if (selectedPieceIds.length > 0 && !selectedPieceIds.includes('background')) {
        if (onUpdatePieceColors) {
          onUpdatePieceColors(selectedPieceIds, hex);
        } else {
          selectedPieceIds.forEach(id => onUpdatePieceColor(id, hex));
        }
      } else if (selectedPieceId && selectedPieceId !== 'background') {
        onUpdatePieceColor(selectedPieceId, hex);
      } else {
        // Opción A: Estado neutro estricto - No teñir arbitrariamente ninguna pieza
        pendingColorRef.current = hex;
        setNoSelectionNotice(true);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => {
          setNoSelectionNotice(false);
        }, 5000);
      }
    }
  };

  const filteredMaterials = HISBALIT_PALETTE.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        s.code.includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.hex.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }
    return materialCategory === 'Todos' || s.category === materialCategory;
  });

  return (
    <aside className="w-94 h-full border-l border-[#E7E4DE] bg-[#FFFFFF] flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Panel Title */}
      <div className="p-4 border-b border-[#E7E4DE] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20">
        <div>
          <h2 className="text-sm font-semibold text-[#242424] tracking-tight">
            Personalización
          </h2>
          <p className="text-[11px] text-[#77736C] mt-0.5">
            Colores, formato, escala y repetición
          </p>
        </div>
        <button
          onClick={onResetMotifOriginalColors}
          className="text-[11px] text-[#77736C] hover:text-[#242424] px-2.5 py-1 rounded bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E7E4DE] transition-colors flex items-center gap-1.5 font-medium"
          title="Restaurar colores originales de las teselas y del fondo"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Restaurar</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* ======================================================== */}
        {/* 1. SECCIÓN DE COLORES                                    */}
        {/* ======================================================== */}
        <div className="border border-[#E7E4DE] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => toggleSection('colors')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#FAF9F5] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#242424]" />
              <span className="text-xs font-semibold text-[#242424]">Colores del mosaico</span>
            </div>
            {openSections.colors ? (
              <ChevronUp className="w-4 h-4 text-[#77736C]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#77736C]" />
            )}
          </button>

          {openSections.colors && (
            <div className="p-3.5 pt-2 border-t border-[#E7E4DE] space-y-4">
              {/* Target selector: Pieza vs Fondo */}
              <div>
                <label className="text-[11px] font-medium text-[#77736C] block mb-1.5">
                  Elemento a personalizar:
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F7F6F2] rounded-lg border border-[#E7E4DE]">
                  <button
                    onClick={() => {
                      setColorTarget('piece');
                      if (selectedPieceId === 'background') {
                        onSelectPiece(null);
                      }
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${colorTarget === 'piece'
                      ? 'bg-white text-[#242424] shadow-xs font-semibold'
                      : 'text-[#77736C] hover:text-[#242424]'
                      }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: activeColorForPiece || commonMotifColor || '#D9D9D9' }}
                    />
                    <span>Piezas ({svgData?.motifPieces.length || 7})</span>
                  </button>
                  <button
                    onClick={() => {
                      setColorTarget('background');
                      onSelectPiece('background');
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${colorTarget === 'background'
                      ? 'bg-white text-[#242424] shadow-xs font-semibold'
                      : 'text-[#77736C] hover:text-[#242424]'
                      }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/10"
                      style={{ backgroundColor: customization.backgroundColor || '#D9D9D9' }}
                    />
                    {/* <span>Fondo ({svgData?.backgroundShapes.length || 118})</span> */}
                    <span>Fondo</span>
                  </button>
                </div>
              </div>

              {/* If ColorTarget is PIECE: Show piece selector tabs */}
              {colorTarget === 'piece' && svgData && (
                <div>
                  {/* <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-[#77736C]">
                      Piezas editables:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {selectedPieceIds.length > 1 ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                          {selectedPieceIds.length} seleccionadas
                        </span>
                      ) : selectedPieceIds.length === 1 ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                          1 seleccionada
                        </span>
                      ) : null}
                    </div>
                  </div> */}
                  <div className="grid grid-cols-7 gap-1">
                    {svgData.motifPieces.map((p, idx) => {
                      const isSel = selectedPieceIds.includes(p.id) || selectedPieceId === p.id;
                      const col = customization.pieceColors[p.id] || p.originalColor;
                      return (
                        <button
                          key={p.id}
                          onClick={(e) => onSelectPiece(p.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                          className={`h-8 rounded-lg border flex items-center justify-center relative transition-all cursor-pointer ${isSel
                            ? 'border-[#242424] ring-2 ring-[#242424]/30 scale-105 z-10 shadow-xs'
                            : 'border-[#E7E4DE] hover:border-[#AFAAA0]'
                            }`}
                          style={{ backgroundColor: col }}
                          title={`${p.name} - Pulsa Ctrl+Clic para selección múltiple`}
                        >
                          <span
                            className={`text-[9px] font-bold ${col.toLowerCase() === '#ffffff' || col.toLowerCase() === '#f5f3ec'
                              ? 'text-black'
                              : 'text-white'
                              }`}
                          >
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick actions for multi-selection */}
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#77736C]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setColorTarget('piece');
                          const allIds = svgData.motifPieces.map(p => p.id);
                          if (onSelectMultiplePieces) {
                            onSelectMultiplePieces(allIds);
                          } else {
                            onSelectPiece(allIds);
                          }
                        }}
                        className="font-semibold text-[#77736C] hover:text-[#242424] underline underline-offset-2 cursor-pointer transition-colors"
                        title="Seleccionar todas las piezas del motivo"
                      >
                        Seleccionar todas
                      </button>
                      {selectedPieceIds.length > 0 && !selectedPieceIds.includes('background') && (
                        <span className="text-[#9E9B95]">
                          ({selectedPieceIds.length} de {svgData.motifPieces.length})
                        </span>
                      )}
                    </div>
                    {selectedPieceIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onSelectPiece(null)}
                        className="font-semibold hover:text-[#242424] underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Active Material Display Card */}
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E7E4DE] space-y-2.5">
                {colorTarget === 'background' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg border border-black/15 shadow-2xs shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: currentColor || '#D9D9D9' }}
                      />
                      <div>
                        <div className="text-xs font-bold text-[#242424]">
                          {activeMaterial ? `Ref. ${activeMaterial.code} · ${activeMaterial.name}` : 'Color personalizado'}
                        </div>
                        <div className="text-[11px] text-[#77736C]">
                          Fondo de la malla
                        </div>
                      </div>
                    </div>
                  </div>
                ) : hasPieceSelection ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg border border-black/15 shadow-2xs shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: currentColor || '#000000' }}
                        />
                        <div>
                          <div className="text-xs font-bold text-[#242424]">
                            {activeMaterial ? `Ref. ${activeMaterial.code} · ${activeMaterial.name}` : 'Color personalizado'}
                          </div>
                          <div className="text-[11px] text-[#77736C]">
                            {selectedPieceIds.length > 1
                              ? `${selectedPieceIds.length} piezas seleccionadas`
                              : selectedPiece
                                ? selectedPiece.name
                                : 'Pieza seleccionada'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* If coloring piece: button to apply this material to ALL pieces */}
                    {currentColor && (
                      <button
                        onClick={() => onApplyColorToAllMotifPieces(currentColor)}
                        className="w-full py-1.5 px-2 text-[11px] font-medium text-[#242424] bg-white hover:bg-[#F7F6F2] border border-[#E7E4DE] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#77736C]" />
                        <span>Aplicar este color a todo el motivo</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg border border-dashed border-[#AFAAA0] bg-white/80 shrink-0 flex items-center justify-center text-[#77736C]">
                        <MousePointerClick className="w-4 h-4 text-[#77736C]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#242424]">
                          Ninguna pieza seleccionada
                        </div>
                        <div className="text-[11px] text-[#77736C]">
                          Utiliza el dibujo o los números de arriba
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (svgData) {
                          const allIds = svgData.motifPieces.map(p => p.id);
                          if (onSelectMultiplePieces) {
                            onSelectMultiplePieces(allIds);
                          } else {
                            onSelectPiece(allIds);
                          }
                        }
                      }}
                      className="w-full py-1.5 px-2 text-[11px] font-medium text-[#242424] bg-white hover:bg-[#F7F6F2] border border-[#E7E4DE] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#77736C]" />
                      <span>Seleccionar todas las piezas del motivo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Notice when clicking a material swatch with no selection */}
              {noSelectionNotice && !hasPieceSelection && colorTarget === 'piece' && (
                <div className="p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-950 text-xs flex items-center justify-between gap-2 animate-fadeIn transition-all">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-[11px] font-medium text-amber-950">
                      Selecciona antes las piezas para aplicar el color
                    </span>
                  </div>
                </div>
              )}

              {/* Material Palette Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#242424]">
                    Paleta Unicolor Hisbalit:
                  </span>
                  <span className="text-[10px] text-[#77736C] font-mono">
                    {filteredMaterials.length} de {HISBALIT_PALETTE.length}
                  </span>
                </div>

                {/* Search bar & Category Filter Tabs */}
                <div className="space-y-4 mb-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#AFAAA0] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por ref. o nombre (ej. 335, azul)..."
                      className="w-full pl-8 pr-7 py-1 text-[11px] bg-[#F7F6F2] border border-[#E7E4DE] rounded-lg focus:outline-none focus:border-[#242424] focus:bg-white transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#77736C] hover:text-[#242424]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {(['Todos', 'Neutros', 'Tierras', 'Mediterráneo', 'Acentos'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setMaterialCategory(cat);
                          setSearchQuery('');
                        }}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-md whitespace-nowrap transition-colors ${materialCategory === cat && !searchQuery
                          ? 'bg-[#242424] text-white shadow-2xs'
                          : 'bg-[#F7F6F2] text-[#77736C] hover:text-[#242424] hover:bg-[#EFECE6]'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Swatches Grid */}
                <div className="grid grid-cols-6 gap-x-1.5 gap-y-2 max-h-80 overflow-y-auto p-0.5 pr-1">
                  {filteredMaterials.map((swatch) => {
                    const isSelected = currentColor
                      ? swatch.hex.toUpperCase() === currentColor.toUpperCase()
                      : false;
                    const isLight = [
                      '#FFFFFF', '#F8F6A8', '#F7DF00', '#DDE6EA', '#D2DFE8', '#D9D9D9',
                      '#F3EEDA', '#C7DFD5', '#E5D5B9', '#EBDEB3', '#DED7BF', '#F5D79B',
                      '#CBD526', '#A1C677', '#A0B2AB', '#A7CBD2', '#DCBCBB', '#B9AAB9',
                      '#C9C6AE', '#C1BEAC', '#BFBCB5', '#E0C693'
                    ].includes(swatch.hex.toUpperCase());

                    return (
                      <button
                        key={swatch.code}
                        onClick={() => handleSelectMaterial(swatch.hex)}
                        className={`group relative flex flex-col items-center rounded-lg p-0.5 border transition-all text-center ${isSelected
                          ? 'border-[#242424] bg-[#FAF9F5] ring-2 ring-[#242424]/20 shadow-xs scale-105 z-10'
                          : 'border-transparent hover:border-[#E7E4DE] hover:bg-[#FBFBFA]'
                          }`}
                        title={`Ref. ${swatch.code} - ${swatch.name} (${swatch.hex})`}
                      >
                        <div
                          className={`w-full aspect-square rounded-md border flex items-center justify-center relative transition-transform ${isSelected
                            ? 'border-[#242424]/40 shadow-xs'
                            : 'border-black/10 group-hover:scale-105'
                            }`}
                          style={{ backgroundColor: swatch.hex }}
                        >
                          {isSelected && (
                            <Check
                              className={`w-3.5 h-3.5 stroke-[3] ${isLight ? 'text-black' : 'text-white'
                                }`}
                            />
                          )}
                        </div>
                        <span
                          className={`mt-1 text-[9px] font-mono leading-none tracking-tight transition-colors ${isSelected
                            ? 'font-bold text-[#242424]'
                            : 'text-[#77736C] group-hover:text-[#242424]'
                            }`}
                        >
                          {swatch.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Material Legend List */}
              <div className="pt-2 border-t border-[#E7E4DE] text-[10px] text-[#77736C] flex items-center justify-between">
                <span>57 referencias oficiales Unicolor</span>
                <span className="font-medium text-[#242424]">Hisbalit Mosaico</span>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 2. SECCIÓN DE FORMATO                                    */}
        {/* ======================================================== */}
        <div className="border border-[#E7E4DE] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => toggleSection('format')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#FAF9F5] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shapes className="w-4 h-4 text-[#242424]" />
              <span className="text-xs font-semibold text-[#242424]">Formato de tesela</span>
            </div>
            {openSections.format ? (
              <ChevronUp className="w-4 h-4 text-[#77736C]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#77736C]" />
            )}
          </button>

          {openSections.format && (
            <div className="p-3.5 pt-2 border-t border-[#E7E4DE] space-y-2">
              <p className="text-[11px] text-[#77736C] leading-relaxed">
                Selecciona la geometría de la tesela:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateFormat('round')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${activeFormat === 'round'
                    ? 'border-[#242424] bg-[#FAF9F5] shadow-xs ring-1 ring-[#242424]/10'
                    : 'border-[#E7E4DE] hover:border-[#C5C1BA] bg-white'
                    }`}
                >
                  <Circle className="w-5 h-5 text-[#242424]" />
                  <div>
                    <div className="text-xs font-bold text-[#242424]">Redondo</div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-medium">
                      Disponible
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => onUpdateFormat('hexagonal')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${activeFormat === 'hexagonal'
                    ? 'border-[#242424] bg-[#FAF9F5] shadow-xs ring-1 ring-[#242424]/10'
                    : 'border-[#E7E4DE] hover:border-[#C5C1BA] bg-white'
                    }`}
                >
                  <Hexagon className="w-5 h-5 text-[#242424]" />
                  <div>
                    <div className="text-xs font-bold text-[#242424]">Hexagonal</div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-medium">
                      Disponible
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. ROTACIÓN DEL MOTIVO                                   */}
        {/* ======================================================== */}
        <div className="border border-[#E7E4DE] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => toggleSection('rotation')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#FAF9F5] transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-[#242424]" />
              <span className="text-xs font-semibold text-[#242424]">Rotación del motivo</span>
            </div>
            {openSections.rotation ? (
              <ChevronUp className="w-4 h-4 text-[#77736C]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#77736C]" />
            )}
          </button>

          {openSections.rotation && (
            <div className="p-3.5 pt-2 border-t border-[#E7E4DE] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-[#77736C]">Ángulo de giro:</span>
                <span className="font-mono font-medium text-[#242424]">
                  {customization.rotation}°
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 90, 180, 270].map((angle) => (
                  <button
                    key={angle}
                    onClick={() => onUpdateRotation(angle)}
                    className={`py-2 text-xs font-medium rounded-lg border transition-all ${customization.rotation === angle
                      ? 'border-[#242424] bg-[#242424] text-white shadow-xs font-semibold'
                      : 'border-[#E7E4DE] bg-white text-[#242424] hover:bg-[#FAF9F5]'
                      }`}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 4. DISTRIBUCIÓN Y ESCALA                                 */}
        {/* ======================================================== */}
        <div
          className={`border rounded-xl overflow-hidden transition-all ${isSingleMode ? 'border-[#E7E4DE] bg-[#FAF9F5]' : 'border-[#E7E4DE] bg-white'
            }`}
        >
          <button
            onClick={() => toggleSection('distribution')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#FAF9F5] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Grid className={`w-4 h-4 ${isSingleMode ? 'text-[#8C8880]' : 'text-[#242424]'}`} />
              <span className={`text-xs font-semibold ${isSingleMode ? 'text-[#77736C]' : 'text-[#242424]'}`}>
                Distribución y escala
              </span>
              {/*
              {isSingleMode && (
                <span className="text-[10px] text-[#8C8880] bg-[#EFECE6] px-1.5 py-0.5 rounded font-medium">
                  Solo en repetición
                </span>
              )}
              */}
            </div>
            {openSections.distribution ? (
              <ChevronUp className="w-4 h-4 text-[#77736C]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#77736C]" />
            )}
          </button>

          {openSections.distribution && (
            isSingleMode ? (
              /* Estado disabled en Motivo individual con aviso pedagógico y acción directa */
              <div className="p-3.5 pt-2 border-t border-[#E7E4DE] space-y-3">
                <div className="p-3 bg-white rounded-xl border border-[#E7E4DE] space-y-2.5 shadow-2xs">
                  <div className="flex items-start gap-2">
                    <Layers className="w-4 h-4 text-[#77736C] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#77736C] leading-relaxed">
                      La cuadrícula de repeticiones y la alineación se configuran en la <strong>Composición repetida</strong>.
                    </p>
                  </div>
                  {onChangeViewMode && (
                    <button
                      onClick={() => onChangeViewMode('pattern')}
                      className="w-full py-1.5 px-3 bg-[#242424] hover:bg-black text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Cambiar a Composición repetida</span>
                    </button>
                  )}
                </div>

                {/* Previsualización desactivada de los controles */}
                <div className="space-y-3.5 opacity-40 pointer-events-none select-none">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-[#77736C]">
                        Repetición en cuadrícula:
                      </span>
                      <span className="text-[11px] font-mono text-[#77736C] font-medium">
                        {composition.repeatX} col × {composition.repeatY} fil
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#8C8880] block mb-1">Columnas</label>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          disabled
                          value={composition.repeatX}
                          className="w-full accent-[#242424]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8C8880] block mb-1">Filas</label>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          disabled
                          value={composition.repeatY}
                          className="w-full accent-[#242424]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-[#77736C] block mb-1.5">
                      Alineación de teselas:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F7F6F2] rounded-lg border border-[#E7E4DE]">
                      <button
                        disabled
                        className={`py-1.5 text-xs font-medium rounded-md ${!composition.staggered
                          ? 'bg-white text-[#242424] shadow-xs'
                          : 'text-[#77736C]'
                          }`}
                      >
                        Regular
                      </button>
                      <button
                        disabled
                        className={`py-1.5 text-xs font-medium rounded-md ${composition.staggered
                          ? 'bg-white text-[#242424] shadow-xs'
                          : 'text-[#77736C]'
                          }`}
                      >
                        Alternada
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-[#77736C] block mb-1.5">
                      Módulos lisos de fondo:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CADENCE_PRESETS.slice(0, 4).map((preset) => (
                        <div
                          key={preset.id}
                          className="p-2 rounded-lg border border-[#E7E4DE] bg-white text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#77736C]">{preset.label}</span>
                            <span className="text-[9px] font-mono text-[#8C8880]">{preset.badge}</span>
                          </div>
                          <span className="text-[10px] text-[#8C8880]">{preset.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Estado activo en Composición repetida */
              <div className="p-3.5 pt-2 border-t border-[#E7E4DE] space-y-3.5">
                {/* Repetitions Columns & Rows */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#77736C]">
                      Repetición en cuadrícula:
                    </span>
                    <span className="text-[11px] font-mono text-[#242424] font-medium">
                      {composition.repeatX} col × {composition.repeatY} fil
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-[#8C8880]">Columnas</label>
                        <span className="text-[10px] font-mono text-[#242424] font-semibold">{composition.repeatX}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={composition.repeatX}
                        onChange={(e) =>
                          onUpdateComposition({ repeatX: parseInt(e.target.value) })
                        }
                        className="w-full accent-[#242424] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-[#8C8880]">Filas</label>
                        <span className="text-[10px] font-mono text-[#242424] font-semibold">{composition.repeatY}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={composition.repeatY}
                        onChange={(e) =>
                          onUpdateComposition({ repeatY: parseInt(e.target.value) })
                        }
                        className="w-full accent-[#242424] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Alignment: Regular vs Staggered */}
                <div>
                  <span className="text-[11px] font-medium text-[#77736C] block mb-1.5">
                    Alineación de teselas:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F7F6F2] rounded-lg border border-[#E7E4DE]">
                    <button
                      onClick={() => onUpdateComposition({ staggered: false })}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${!composition.staggered
                        ? 'bg-white text-[#242424] shadow-xs'
                        : 'text-[#77736C] hover:text-[#242424]'
                        }`}
                    >
                      Regular
                    </button>
                    <button
                      onClick={() => onUpdateComposition({ staggered: true })}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${composition.staggered
                        ? 'bg-white text-[#242424] shadow-xs'
                        : 'text-[#77736C] hover:text-[#242424]'
                        }`}
                    >
                      Alternada
                    </button>
                  </div>
                </div>

                {/* Módulos lisos de fondo (Intercalado) */}
                <div className="pt-2.5 border-t border-[#E7E4DE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#77736C]">
                      Módulos lisos de fondo:
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {CADENCE_PRESETS.map((preset) => {
                      const isActive =
                        (composition.plainTileCadence || 'none') === preset.id &&
                        (!composition.cellOverrides || Object.keys(composition.cellOverrides).length === 0);
                      return (
                        <button
                          key={preset.id}
                          onClick={() => onUpdateComposition({ plainTileCadence: preset.id, cellOverrides: {} })}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${isActive
                            ? 'border-[#242424] bg-[#242424] text-white shadow-xs'
                            : 'border-[#E7E4DE] bg-white text-[#242424] hover:bg-[#FAF9F5]'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-xs font-semibold leading-tight">{preset.label}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#F7F6F2] text-[#77736C] border border-[#E7E4DE]'
                                }`}
                            >
                              {preset.badge}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] mt-0.5 leading-snug ${isActive ? 'text-white/80' : 'text-[#77736C]'
                              }`}
                          >
                            {preset.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual canvas override indicator banner */}
                  {composition.cellOverrides && Object.keys(composition.cellOverrides).length > 0 && (
                    <div className="p-2.5 rounded-lg border-[#242424] bg-[#242424] shadow-xs flex items-center justify-between text-[11px] animate-fade-in">
                      <div className="flex items-center gap-1.5 text-white">
                        <div>
                          <p className="font-semibold">Personalizado</p>
                          <span className="text-white/80 text-[10px] mt-0.5 leading-snug">
                            {Object.keys(composition.cellOverrides).length} celda{Object.keys(composition.cellOverrides).length > 1 ? 's' : ''} modificada{Object.keys(composition.cellOverrides).length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onUpdateComposition({ cellOverrides: {} })}
                        className="text-[10px] font-semibold text-[#242424] hover:text-black bg-white hover:bg-[#F0EEE9] px-2 py-0.5 rounded border border-[#E7E4DE] transition-colors"
                        title="Restablecer patrón automático sin modificaciones manuales"
                      >
                        Restablecer
                      </button>
                    </div>
                  )}

                  {/* Resumen de placas de producción */}
                  <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#E7E4DE] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#77736C]">
                      <Layers className="w-3.5 h-3.5 text-[#242424]" />
                      <span>Total de placas ({plates.totalCount}):</span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-[#242424]">
                      {plates.motifCount} motivo + {plates.plainCount} lisa{plates.plainCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* ======================================================== */}
        {/* 5. EXPORTACIÓN RÁPIDA                                    */}
        {/* ======================================================== */}
        <div className="border border-[#E7E4DE] rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => toggleSection('export')}
            className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#FAF9F5] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#242424]" />
              <span className="text-xs font-semibold text-[#242424]">Descargas inmediatas</span>
            </div>
            {openSections.export ? (
              <ChevronUp className="w-4 h-4 text-[#77736C]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#77736C]" />
            )}
          </button>

          {openSections.export && (
            <div className="p-3.5 pt-3 border-t border-[#E7E4DE] space-y-2">
              <button
                onClick={onDownloadSvg}
                className="w-full py-2.5 px-3 border border-[#E7E4DE] hover:border-[#242424] bg-white hover:bg-[#FAF9F5] rounded-lg text-xs font-semibold text-[#242424] transition-colors flex items-center justify-between"
              >
                <span>Descargar patrón vectorial (SVG)</span>
                <span className="text-[10px] font-mono text-[#77736C]">.svg</span>
              </button>
              <button
                onClick={onDownloadPng}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-between shadow-xs"
              >
                <span>Descargar imagen 4K Ultra HD</span>
                <span className="text-[10px] font-mono opacity-80">3840×2160</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
