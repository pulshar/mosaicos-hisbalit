import React, { useState } from 'react';
import { MotifDefinition, MotifCustomization, CompositionSettings } from '../types';
import {
  generateSingleMotifSvg,
  generateCompositionSvg,
  downloadFile,
  downloadSvgAsPng
} from '../utils/exportUtils';
import {
  X,
  Download,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Check,
  Copy
} from 'lucide-react';

interface ExportModalProps {
  motif: MotifDefinition;
  customization: MotifCustomization;
  composition: CompositionSettings;
  onClose: () => void;
  onOpenSimulation: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  motif,
  customization,
  composition,
  onClose,
  onOpenSimulation
}) => {
  const [exportScope, setExportScope] = useState<'single' | 'composition'>('composition');
  const [resolution, setResolution] = useState<'4k' | '2k' | '1k'>('4k');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);

  const activeFormat = customization.format;

  const currentSvgString = exportScope === 'single'
    ? generateSingleMotifSvg(motif, customization, true)
    : generateCompositionSvg(motif, customization, composition);

  const handleDownloadSvg = () => {
    const fileName = `Mosaico-Studio_${motif.name}_${activeFormat}_${exportScope}.svg`;
    downloadFile(currentSvgString, fileName, 'image/svg+xml');
  };

  const handleDownloadPng = async () => {
    try {
      setIsDownloading(true);
      const width = resolution === '4k' ? 3840 : resolution === '2k' ? 1920 : 1080;
      const fileName = `Mosaico-Studio_${motif.name}_${activeFormat}_${width}p.png`;
      await downloadSvgAsPng(currentSvgString, fileName, width);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-white rounded-2xl border border-[#E7E4DE] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E7E4DE] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#242424]">
              Exportar proyecto de mosaico
            </h3>
            <p className="text-xs text-[#77736C] mt-0.5">
              Descarga vectores limpios o imágenes en alta fidelidad listas para presentación
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#77736C] hover:text-[#242424] hover:bg-[#F7F6F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Scope Selector */}
          <div>
            <label className="text-xs font-semibold text-[#242424] block mb-2">
              Contenido a exportar:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportScope('composition')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportScope === 'composition'
                    ? 'border-[#242424] bg-[#FAF9F5] shadow-xs ring-1 ring-[#242424]/10'
                    : 'border-[#E7E4DE] bg-white hover:border-[#C5C1BA]'
                }`}
              >
                <div className="text-xs font-bold text-[#242424]">
                  Composición completa ({composition.repeatX}×{composition.repeatY})
                </div>
                <p className="text-[11px] text-[#77736C] mt-0.5">
                  Superficie repetida continua con la separación y alineación elegidas.
                </p>
              </button>

              <button
                onClick={() => setExportScope('single')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportScope === 'single'
                    ? 'border-[#242424] bg-[#FAF9F5] shadow-xs ring-1 ring-[#242424]/10'
                    : 'border-[#E7E4DE] bg-white hover:border-[#C5C1BA]'
                }`}
              >
                <div className="text-xs font-bold text-[#242424]">
                  Motivo individual aislado
                </div>
                <p className="text-[11px] text-[#77736C] mt-0.5">
                  El módulo original de {motif.name} con las 7 teselas personalizadas.
                </p>
              </button>
            </div>
          </div>

          {/* Export Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Vector SVG */}
            <div className="p-4 rounded-xl border border-[#E7E4DE] bg-[#FAF9F5] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-[#242424]" />
                  <span className="text-xs font-bold text-[#242424]">Vectorial SVG puro</span>
                </div>
                <p className="text-[11px] text-[#77736C] leading-relaxed mb-4">
                  Archivo SVG nativo apto para AutoCAD, Revit, Adobe Illustrator o máquinas de corte de malla de mosaico.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDownloadSvg}
                  className="w-full py-2 px-3 bg-white hover:bg-[#F7F6F2] border border-[#242424] text-[#242424] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar archivo .svg</span>
                </button>
                <button
                  onClick={handleCopySvgCode}
                  className="w-full py-1.5 px-3 bg-transparent hover:bg-white/50 text-[#77736C] hover:text-[#242424] text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSvg ? '¡Código copiado al portapapeles!' : 'Copiar código SVG'}</span>
                </button>
              </div>
            </div>

            {/* 2. High-Res PNG */}
            <div className="p-4 rounded-xl border border-[#E7E4DE] bg-[#FAF9F5] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-[#242424]" />
                  <span className="text-xs font-bold text-[#242424]">Imagen de alta definición</span>
                </div>
                <p className="text-[11px] text-[#77736C] leading-relaxed mb-3">
                  Renderizado de píxeles nítido para dossieres de arquitectura e interiorismo.
                </p>

                {/* Resolution buttons */}
                <div className="grid grid-cols-3 gap-1 mb-4">
                  {(['4k', '2k', '1k'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-1 text-[11px] font-mono rounded border transition-all ${
                        resolution === res
                          ? 'border-[#242424] bg-[#242424] text-white font-bold'
                          : 'border-[#E7E4DE] bg-white text-[#77736C]'
                      }`}
                    >
                      {res === '4k' ? '4K Ultra' : res === '2k' ? '1080p' : '720p'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownloadPng}
                disabled={isDownloading}
                className="w-full py-2 px-3 bg-[#242424] hover:bg-black text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Generando imagen...' : 'Descargar imagen PNG'}</span>
              </button>
            </div>
          </div>

          {/* Banner to Space Simulator */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>¿Deseas la simulación en un baño o suelo real?</span>
              </div>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Aplica este mosaico sobre un paramento fotorrealista y descárgalo con perspectiva y luz natural.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSimulation();
              }}
              className="px-3.5 py-2 bg-amber-900 text-white hover:bg-amber-950 rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              Ir a simulación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
