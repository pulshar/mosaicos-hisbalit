import React from 'react';
import { Undo2, Redo2, RotateCcw, Download, Sparkles, Layers } from 'lucide-react';

interface HeaderProps {
  onNewDesign: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  viewMode: 'single' | 'pattern' | 'simulation';
  onChangeViewMode: (mode: 'single' | 'pattern' | 'simulation') => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewDesign,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  viewMode,
  onChangeViewMode,
  onOpenExport
}) => {
  return (
    <header className="h-16 border-b border-[#E7E4DE] bg-[#FFFFFF] px-6 flex items-center justify-between gap-8 shrink-0 select-none z-30">
      {/* Zone 1: Single element brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="flex items-center gap-2.5 text-decoration-none group">
          <div className="w-8 h-8 rounded-lg bg-[#242424] flex items-center justify-center text-white font-semibold text-sm tracking-tighter">
            M
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#242424] whitespace-nowrap">
              Mosaico Studio
            </span>
            <span className="text-[11px] text-[#77736C] -mt-0.5 tracking-normal whitespace-nowrap font-medium">
              Colección Petite · Hisbalit
            </span>
          </div>
        </a>
      </div>

      {/* Zone 2: Navigation & View Mode Switcher */}
      <nav
        id="tour-view-modes"
        className="flex items-center gap-1 bg-[#F7F6F2] p-1 rounded-lg border border-[#E7E4DE]">
        <button
          onClick={() => onChangeViewMode('single')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${viewMode === 'single'
            ? 'bg-[#242424] text-white shadow-xs'
            : 'text-[#77736C] hover:text-[#242424]'
            }`}
          title="Vista detallada de un motivo individual"
        >
          Motivo individual
        </button>
        <button
          onClick={() => onChangeViewMode('pattern')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${viewMode === 'pattern'
            ? 'bg-[#242424] text-white shadow-xs'
            : 'text-[#77736C] hover:text-[#242424]'
            }`}
          title="Vista de la composición y repetición continua"
        >
          Composición repetida
        </button>
        <button
          onClick={() => onChangeViewMode('simulation')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${viewMode === 'simulation'
            ? 'bg-[#242424] text-white shadow-xs'
            : 'text-[#77736C] hover:text-[#242424]'
            }`}
          title="Simular en espacios reales: Baño, Suelo, Cocina"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulación en espacio</span>
        </button>
      </nav>

      {/* Zone 3: Actions & Primary Export CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center border-r border-[#E7E4DE] pr-2 mr-1 gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-md transition-colors ${canUndo ? 'text-[#242424] hover:bg-[#F7F6F2]' : 'text-[#C5C1BA] cursor-not-allowed'
              }`}
            title="Deshacer (Ctrl+Z)"
            aria-label="Deshacer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-md transition-colors ${canRedo ? 'text-[#242424] hover:bg-[#F7F6F2]' : 'text-[#C5C1BA] cursor-not-allowed'
              }`}
            title="Rehacer (Ctrl+Y)"
            aria-label="Rehacer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>


        <button
          onClick={onNewDesign}
          className="px-3 py-1.5 text-xs font-medium text-[#77736C] hover:text-[#242424] hover:bg-[#F7F6F2] rounded-md transition-colors whitespace-nowrap"
          title="Iniciar nuevo diseño"
        >
          Nuevo diseño
        </button>

        <button
          id="tour-export-button"
          onClick={onOpenExport}
          className="px-4 py-2 text-xs font-medium text-white bg-[#242424] hover:bg-[#111111] rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs ml-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar diseño</span>
        </button>
      </div>
    </header>
  );
};
