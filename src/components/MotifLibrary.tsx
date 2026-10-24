import React from 'react';
import { PETITE_MOTIFS } from '../data/motifs';
import { MotifDefinition, MotifFormat, MotifCustomization } from '../types';
import { Check, Info } from 'lucide-react';

interface MotifLibraryProps {
  activeMotifId: string;
  onSelectMotif: (motif: MotifDefinition) => void;
  activeFormat: MotifFormat;
  getCustomizationForMotif?: (motifId: string) => MotifCustomization;
  editedMotifIds?: Record<string, boolean>;
}

export const MotifLibrary: React.FC<MotifLibraryProps> = ({
  activeMotifId,
  onSelectMotif,
  activeFormat,
  getCustomizationForMotif,
  editedMotifIds = {}
}) => {

  return (
    <aside className="w-80 h-full border-r border-[#E7E4DE] bg-[#FFFFFF] flex flex-col shrink-0 select-none">
      {/* Header of panel */}
      <div className="p-4 border-b border-[#E7E4DE] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#242424] tracking-tight">
            Biblioteca de motivos
          </h2>
          <p className="text-[11px] text-[#77736C] mt-0.5">
            Colección Petite · 10 diseños de autor
          </p>
        </div>
      </div>

      {/* Motif items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PETITE_MOTIFS.map((motif) => {
          const isActive = motif.id === activeMotifId;
          const isAvailable = motif.available;

          return (
            <div
              key={motif.id}
              onClick={() => {
                if (isAvailable) {
                  onSelectMotif(motif);
                }
              }}
              role="button"
              tabIndex={isAvailable ? 0 : -1}
              onKeyDown={(e) => {
                if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                  onSelectMotif(motif);
                }
              }}
              className={`group relative p-3 rounded-xl border transition-all text-left ${isActive
                ? 'border-[#242424] bg-[#FBFBFA] shadow-xs ring-1 ring-[#242424]/10'
                : isAvailable
                  ? 'border-[#E7E4DE] bg-white hover:border-[#C5C1BA] hover:bg-[#FAF9F5] cursor-pointer'
                  : 'border-[#EDEBE6] bg-[#FCFCFB] opacity-75 cursor-default'
                }`}
            >
              <div className="flex items-center gap-3">
                {/* Thumbnail container */}
                <div
                  className={`w-14 h-14 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden relative ${isActive
                    ? 'border-[#242424] bg-white'
                    : isAvailable
                      ? 'border-[#E7E4DE] bg-[#F7F6F2] group-hover:border-[#C5C1BA]'
                      : 'border-[#EDEBE6] bg-[#F4F3EF]'
                    }`}
                >
                  {isAvailable && (motif.svgData[activeFormat] || motif.svgData.round) ? (() => {
                    const thumbSvg = motif.svgData[activeFormat] || motif.svgData.round!;
                    const isEdited = Boolean(editedMotifIds?.[motif.id]);
                    const motifCust = isEdited && getCustomizationForMotif ? getCustomizationForMotif(motif.id) : null;

                    return (
                      <svg viewBox={thumbSvg.viewBox} className="w-12 h-12">
                        {/* Subdued neutral background tesserae */}
                        {thumbSvg.backgroundShapes.map((s, idx) =>
                          s.type === 'circle' ? (
                            <circle
                              key={idx}
                              cx={s.cx}
                              cy={s.cy}
                              r={s.r ? s.r * 0.9 : 9}
                              fill="#E5E2DB"
                            />
                          ) : (
                            <path key={idx} d={s.d} fill="#E5E2DB" />
                          )
                        )}
                        {/* Motif tesserae (customized piece colors if edited, otherwise default) */}
                        {thumbSvg.motifPieces.map((p) => {
                          const pieceFill = isEdited && motifCust
                            ? (motifCust.pieceColors[p.id] || p.originalColor || (isActive ? '#242424' : '#555555'))
                            : (isActive ? '#242424' : '#555555');

                          return p.type === 'circle' ? (
                            <circle
                              key={p.id}
                              cx={p.cx}
                              cy={p.cy}
                              r={p.r}
                              fill={pieceFill}
                            />
                          ) : (
                            <path key={p.id} d={p.d} fill={pieceFill} />
                          );
                        })}
                      </svg>
                    );
                  })() : (
                    /* Elegant placeholder sketch for pending motif */
                    <div className="flex flex-col items-center justify-center text-center p-1">
                      <div className="w-5 h-5 rounded-sm border border-dashed border-[#AFAAA0] flex items-center justify-center mb-1 text-[9px] font-mono text-[#77736C]">
                        {motif.catalogueNumber}
                      </div>
                      <span className="text-[8px] uppercase tracking-wider text-[#9E9A91] font-medium leading-none">
                        Próx.
                      </span>
                    </div>
                  )}

                  {isActive && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#242424] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Motif Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#242424] truncate">
                      {motif.catalogueNumber}. {motif.name}
                    </span>
                    {Boolean(editedMotifIds?.[motif.id]) && (
                      <span
                        className="text-[9px] font-medium text-[#77736C] bg-[#F2EFE9] px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 border border-[#E0DCD3]"
                        title="Motivo con colores personalizados"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DDA743]" />
                        Editado
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#77736C] line-clamp-1 mt-0.5">
                    {motif.description}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#8C8880]">
                    <span>Formatos:</span>
                    <span className="font-medium text-[#555]">
                      {isAvailable ? 'Redondo · Hexagonal' : 'Redondo · Hexagonal'}
                    </span>
                  </div>
                </div>
              </div>

              {!isAvailable && (
                <div className="mt-2 pt-2 border-t border-[#EDEBE6] flex items-center gap-1.5 text-[10px] text-[#8C8880]">
                  <Info className="w-3 h-3 text-[#AFAAA0] shrink-0" />
                  <span>Pendiente de incorporar trazado oficial</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
