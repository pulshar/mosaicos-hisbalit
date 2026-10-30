import React, { useState, useMemo } from 'react';
import { MotifDefinition, MotifCustomization, CompositionSettings } from '../types';
import {
  generateSingleMotifSvg,
  generateCompositionSvg,
  downloadFile,
  downloadSvgAsPng,
  getCellMotif,
  ExportImageMetadata,
  calculateSurfaceSpecs
} from '../utils/exportUtils';
import { getMotifById } from '../data/motifs';
import { resolveEffectiveMotifCustomization } from '../utils/motifColorUtils';
import { findMaterialByHex } from '../data/palette';
import { getColorReference } from '../data/palette';
import {
  X,
  Download,
  FileCode,
  Image as ImageIcon,
  Check,
  Copy,
  LayoutGrid,
  Square,
  Loader2,
  Info
} from 'lucide-react';

interface ExportModalProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  customizationsMap?: Record<string, MotifCustomization>;
  editedMotifIds?: Record<string, boolean>;
  onClose: () => void;
  onOpenSimulation: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  motif,
  customization,
  composition,
  customizationsMap = {},
  editedMotifIds = {},
  onClose,
  onOpenSimulation
}) => {
  const [exportScope, setExportScope] = useState<'single' | 'composition'>('composition');
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png');
  const [resolution, setResolution] = useState<'4k' | '2k' | '1k'>('4k');
  const [includeFooter, setIncludeFooter] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);

  const activeFormat = customization.format;

  // Generate current SVG according to scope
  const currentSvgString = useMemo(() => {
    return exportScope === 'single'
      ? generateSingleMotifSvg(motif, customization, true)
      : generateCompositionSvg(motif, customization, composition, null, customizationsMap, editedMotifIds);
  }, [exportScope, motif, customization, composition, customizationsMap, editedMotifIds]);

  // Data URI for live preview
  const svgDataUri = useMemo(() => {
    try {
      return `data:image/svg+xml;utf8,${encodeURIComponent(currentSvgString)}`;
    } catch {
      return '';
    }
  }, [currentSvgString]);

  // Analyze motifs and colors across the composition (including combined motifs and plain tiles)
  const compositionAnalysis = useMemo(() => {
    if (exportScope === 'single') {
      const colorsSet = new Set<string>();
      if (customization.backgroundColor) colorsSet.add(customization.backgroundColor);
      Object.values(customization.pieceColors || {}).forEach(c => {
        if (c) colorsSet.add(c);
      });
      return {
        motifsList: [{ id: motif.id, name: motif.name, count: 1 }],
        motifsTitle: motif.name,
        plainCount: 0,
        palette: Array.from(colorsSet),
        isCombined: false
      };
    }

    const cols = composition.repeatX;
    const rows = composition.repeatY;
    const cadence = composition.plainTileCadence || 'none';
    const cellOverrides = composition.cellOverrides;
    const format = customization.format;

    const motifCounts: Record<string, number> = {};
    let plainCount = 0;
    const colorsSet = new Set<string>();
    if (customization.backgroundColor) colorsSet.add(customization.backgroundColor);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellMotifId = getCellMotif(r, c, cadence, cols, cellOverrides, motif.id);
        if (!cellMotifId) {
          plainCount++;
        } else {
          motifCounts[cellMotifId] = (motifCounts[cellMotifId] || 0) + 1;
        }
      }
    }

    const motifsList: Array<{ id: string; name: string; count: number; colors: string[] }> = [];

    Object.entries(motifCounts).forEach(([mId, count]) => {
      const targetDef = getMotifById(mId) || (mId === motif.id ? motif : null);
      const mName = targetDef?.name || mId;

      const effCust = resolveEffectiveMotifCustomization(
        mId,
        format,
        customization,
        customizationsMap,
        editedMotifIds
      );

      const mColors: string[] = [];
      if (effCust.backgroundColor) colorsSet.add(effCust.backgroundColor);
      Object.values(effCust.pieceColors || {}).forEach(c => {
        if (c) {
          colorsSet.add(c);
          if (!mColors.includes(c)) mColors.push(c);
        }
      });

      motifsList.push({
        id: mId,
        name: mName,
        count,
        colors: mColors
      });
    });

    if (plainCount > 0 && customization.backgroundColor) {
      colorsSet.add(customization.backgroundColor);
    }

    // Sort: primary active motif first, then by count descending
    motifsList.sort((a, b) => {
      if (a.id === motif.id) return -1;
      if (b.id === motif.id) return 1;
      return b.count - a.count;
    });

    const isCombined = motifsList.length > 1 || plainCount > 0;

    let motifsTitle: string;
    if (motifsList.length === 0) {
      motifsTitle = plainCount > 0 ? 'Placa lisa' : motif.name;
    } else if (motifsList.length === 1) {
      motifsTitle = plainCount > 0
        ? `${motifsList[0].name} + Placa lisa`
        : motifsList[0].name;
    } else {
      const names = motifsList.map(m => m.name).join(' + ');
      motifsTitle = plainCount > 0 ? `${names} + Placa lisa` : names;
    }

    return {
      motifsList,
      motifsTitle,
      plainCount,
      palette: Array.from(colorsSet),
      isCombined
    };
  }, [exportScope, motif, customization, composition, customizationsMap, editedMotifIds]);

  // Resolve official Hisbalit color references (codes and names, never raw hex)
  const colorReferences = useMemo(() => {
    return compositionAnalysis.palette.map(hex => getColorReference(hex));
  }, [compositionAnalysis.palette]);

  // Exact plate dimensions: Redondo: 31,00 x 33,33 cm | Hexagonal: 31,2 x 33,2 cm
  const plateSpecs = useMemo(() => {
    return calculateSurfaceSpecs(
      customization.format,
      composition.repeatX,
      composition.repeatY,
      exportScope
    );
  }, [customization.format, exportScope, composition.repeatX, composition.repeatY]);

  const handleDownloadSvg = () => {
    const fileName = `Hisbalit_Coleccion_${motif.name}_${activeFormat}_${exportScope}.svg`;
    downloadFile(currentSvgString, fileName, 'image/svg+xml');
  };

  const handleDownloadPng = async () => {
    try {
      setIsDownloading(true);
      await new Promise(resolve => setTimeout(resolve, 60));
      const width = resolution === '4k' ? 3840 : resolution === '2k' ? 1920 : 1080;
      // const fileName = `Hisbalit_Coleccion_${motif.name}_${activeFormat}_${width}p.png`;
      const fileName = `Hisbalit_Coleccion_${motif.name}_${activeFormat}_${exportScope}_${resolution.toUpperCase()}.png`;
      const metadata: ExportImageMetadata | undefined = includeFooter ? {
        scope: exportScope,
        motifsTitle: compositionAnalysis.motifsTitle,
        motifsDetail: exportScope === 'single'
          ? `1 placa individual (${plateSpecs.plateDimensions})`
          : `Cuadrícula ${composition.repeatX} × ${composition.repeatY} placas (${composition.repeatX * composition.repeatY} placas en total)`,
        colors: colorReferences,
        totalArea: plateSpecs.areaM2,
        totalDimensions: plateSpecs.totalDimensions,
        formatName: customization.format === 'round' ? 'Tesela redonda' : 'Tesela hexagonal',
        collectionTitle: 'Colección Petite · Hisbalit Mosaico'
      } : undefined;

      await downloadSvgAsPng(currentSvgString, fileName, width, undefined, metadata);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopySvgCode = () => {
    navigator.clipboard.writeText(currentSvgString);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in select-none">
      <div className="bg-white rounded-2xl border border-[#E7E4DE] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E7E4DE] flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-charcoal">
              Exportar proyecto de mosaico
            </h3>
            <p className="text-xs text-taupe mt-0.5">
              Descarga vectores limpios o imágenes en alta fidelidad listas para presentación y planos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-taupe hover:text-charcoal hover:bg-[#F7F6F2] transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Responsive Studio Layout */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0">
          {/* Left Column: Live Visual Preview & Specs */}
          <div className="md:w-[40%] bg-[#FAF9F5] p-4 border-b md:border-b-0 md:border-r border-[#E7E4DE] flex flex-col justify-between shrink-0">
            <div className="space-y-3.5">

              {/* Preview Canvas Box */}
              <div className="relative w-full aspect-square rounded-xl bg-white border border-[#E7E4DE] shadow-xs overflow-hidden flex items-center justify-center p-3.5">
                {svgDataUri ? (
                  <img
                    src={svgDataUri}
                    alt="Vista previa del mosaico"
                    className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xs transition-opacity duration-200"
                  />
                ) : (
                  <div className="text-xs text-taupe">Cargando vista previa</div>
                )}

                {/* Subtle Format Pill on Preview */}
                <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-xs border border-[#E7E4DE] text-[10px] font-semibold text-charcoal px-2 py-0.5 rounded-md shadow-xs pointer-events-none">
                  {customization.format === 'round' ? 'Tesela redonda' : 'Tesela hexagonal'}
                </div>
              </div>

              {/* Technical Specifications Card */}
              <div className="bg-white rounded-xl border border-[#E7E4DE] p-3.5 space-y-2.5 shadow-xs text-xs">
                <div className="flex items-start justify-between pb-2 border-b border-[#F0EFEB]">
                  <span className="text-taupe shrink-0 pt-0.5">
                    {compositionAnalysis.motifsList.length > 1 ? 'Motivos:' : 'Motivo:'}
                  </span>
                  <div className="text-right pl-2">
                    {!compositionAnalysis.isCombined && (
                      <span className="font-bold text-charcoal block">
                        {compositionAnalysis.motifsTitle}
                      </span>
                    )}
                    {exportScope === 'composition' && compositionAnalysis.isCombined && (
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {compositionAnalysis.motifsList.map((m, index) => (
                          <span
                            key={m.id}
                          >
                            <span className="font-bold text-charcoal block">
                              {m.count} {m.name}{index < compositionAnalysis.motifsList.length - 1 ? "," : ""}
                            </span>
                          </span>
                        ))}
                        {compositionAnalysis.plainCount > 0 && (
                          <span className="font-bold text-charcoal block">, {compositionAnalysis.plainCount} Lisa</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#F0EFEB]">
                  <div className="shrink-0 pt-0.5">
                    <span className="text-taupe">
                      {compositionAnalysis.palette.length} color{compositionAnalysis.palette.length !== 1 ? 'es' : ''} usados
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {compositionAnalysis.palette.map((col, idx) => {
                      const material = findMaterialByHex(col);

                      return (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-black/15 shadow-2xs inline-block transition-transform hover:scale-110"
                          style={{ backgroundColor: col }}
                          title={material ? `Ref. ${material.code} · ${material.name}` : col}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-taupe">Superficie total:</span>
                  <span className="font-semibold text-charcoal">
                    {plateSpecs.summaryText}
                  </span>

                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Guided Step-by-Step Export Options */}
          <div className="md:w-[60%] p-5 sm:p-6 flex flex-col space-y-8 overflow-y-auto">
            {/* STEP 1: What to Export */}
            <div>
              <label className="text-xs font-bold text-charcoal flex items-center gap-1.5 mb-2.5">
                <span className="w-4 h-4 rounded-full bg-charcoal text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <span>Selecciona el contenido a exportar</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportScope('composition')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${exportScope === 'composition'
                    ? 'border-charcoal bg-[#FAF9F5] shadow-xs ring-1 ring-charcoal/10'
                    : 'border-[#E7E4DE] bg-white hover:border-[#C5C1BA]'
                    }`}
                >
                  <div className="flex gap-2 mb-1">
                    <LayoutGrid className={`w-4 h-4 ${exportScope === 'composition' ? 'text-charcoal' : 'text-taupe'}`} />
                    <span className="text-xs font-bold text-charcoal">
                      Composición completa
                    </span>
                  </div>
                  <p className="text-[11px] text-taupe leading-snug">
                    Cuadrícula {composition.repeatX}×{composition.repeatY} placas.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('single')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${exportScope === 'single'
                    ? 'border-charcoal bg-[#FAF9F5] shadow-xs ring-1 ring-charcoal/10'
                    : 'border-[#E7E4DE] bg-white hover:border-[#C5C1BA]'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Square className={`w-4 h-4 ${exportScope === 'single' ? 'text-charcoal' : 'text-taupe'}`} />
                    <span className="text-xs font-bold text-charcoal">
                      Motivo individual
                    </span>
                  </div>
                  <p className="text-[11px] text-taupe leading-snug">
                    1 placa aislada de {motif.name}.
                  </p>
                </button>
              </div>
            </div>

            {/* STEP 2: Format Selection */}
            <div>
              <label className="text-xs font-bold text-charcoal flex items-center gap-1.5 mb-2.5">
                <span className="w-4 h-4 rounded-full bg-charcoal text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <span>Elige el formato de archivo</span>
              </label>

              {/* Format Tabs Switcher */}
              <div className="p-1 bg-[#F0EFEB] rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setExportFormat('png')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${exportFormat === 'png'
                    ? 'bg-white text-charcoal shadow-xs'
                    : 'text-taupe hover:text-charcoal'
                    }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Imagen PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('svg')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${exportFormat === 'svg'
                    ? 'bg-white text-charcoal shadow-xs'
                    : 'text-taupe hover:text-charcoal'
                    }`}
                >
                  <FileCode className="w-4 h-4" />
                  <span>Vectorial SVG</span>
                </button>
              </div>
            </div>

            {/* STEP 3: Resolution / Output Settings */}
            <div>
              <label className="text-xs font-bold text-charcoal flex items-center gap-1.5 mb-2.5">
                <span className="w-4 h-4 rounded-full bg-charcoal text-white text-[10px] font-bold flex items-center justify-center">3</span>
                <span>Resolución y opciones de salida</span>
              </label>

              {exportFormat === 'png' ? (
                <div className="space-y-3">
                  <div className="p-1 bg-[#F0EFEB] rounded-xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => setResolution('4k')}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${resolution === '4k'
                        ? 'bg-white text-charcoal shadow-xs'
                        : 'text-taupe hover:text-charcoal'
                        }`}
                    >
                      <span>4K Ultra</span>
                      <span className={`text-[10px] font-mono ${resolution === '4k' ? 'text-taupe' : 'opacity-70'}`}>
                        (3840px)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolution('2k')}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${resolution === '2k'
                        ? 'bg-white text-charcoal shadow-xs'
                        : 'text-taupe hover:text-charcoal'
                        }`}
                    >
                      <span>2K Full HD</span>
                      <span className={`text-[10px] font-mono ${resolution === '2k' ? 'text-taupe' : 'opacity-70'}`}>
                        (1920px)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolution('1k')}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${resolution === '1k'
                        ? 'bg-white text-charcoal shadow-xs'
                        : 'text-taupe hover:text-charcoal'
                        }`}
                    >
                      <span>1080p</span>
                      <span className={`text-[10px] font-mono ${resolution === '1k' ? 'text-taupe' : 'opacity-70'}`}>
                        (1080px)
                      </span>
                    </button>
                  </div>

                  {/* Toggle to include technical specifications sheet underneath the image */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIncludeFooter(!includeFooter)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIncludeFooter(!includeFooter);
                      }
                    }}
                    className="flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 pr-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${includeFooter ? 'bg-brand border-brand' : 'border-[#C5C1BA] bg-white'
                        }`}>
                        {includeFooter && <Check className="w-2.5 h-2.5 stroke-[4] text-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-charcoal">
                          Incluir ficha técnica al pie de la imagen
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-1 bg-[#F0EFEB] rounded-xl flex gap-1">
                  <div className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-white text-charcoal shadow-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-taupe" />
                      <span>Vectorial SVG</span>
                    </span>
                    <span className="text-[11px] text-taupe font-normal">Escalable a cualquier tamaño sin pixelar</span>
                  </div>
                </div>
              )}
            </div>

            {/* Banner to Space Simulator */}
            <div className="pt-5 border-t border-[#F0EFEB] text-[11px] text-charcoal flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 stroke-2" />
                  <span>¿Deseas ver la simulación en un espacio real?</span>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSimulation();
                }}
                className="py-2 px-3 rounded-lg border border-[#E7E4DE] bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-taupe hover:text-charcoal transition-colors"
              >
                Ir a simulación
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Isolated Download Action */}
        <div className="px-6 py-3.5 border-t border-[#E7E4DE] bg-white flex items-center justify-end gap-3 shrink-0">

          <div className="flex items-center gap-2.5">
            {exportFormat === 'svg' && (
              <button
                type="button"
                onClick={handleCopySvgCode}
                className="py-2.5 px-4 bg-white hover:bg-[#F7F6F2] border border-[#E7E4DE] text-charcoal font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                {copiedSvg ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">¡Código copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar código SVG</span>
                  </>
                )}
              </button>
            )}

            {exportFormat === 'png' ? (
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isDownloading}
                className={`py-2.5 px-6 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${isDownloading
                  ? 'bg-brand text-white/60 cursor-wait'
                  : 'bg-brand hover:bg-brand-hover text-white'
                  }`}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <span>Generando imagen PNG ({resolution.toUpperCase()})</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar imagen PNG ({resolution.toUpperCase()})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="py-2.5 px-6 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar archivo .SVG</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
