import React, { useEffect, useRef, useState } from 'react';
import { MotifDefinition, MotifCustomization, MotifFormat } from '../types';
import { PETITE_MOTIFS } from '../data/motifs';
import {
    X,
    RotateCw,
    Sparkles,
    Check,
    CircleOff,
    ArrowRight,
    GripVertical
} from 'lucide-react';

interface CellPopoverMenuProps {
    row: number;
    col: number;
    currentMotifId: string | null;
    currentRotation: number;
    activeFormat: MotifFormat;
    primaryMotif: MotifDefinition;
    clickPosition: { x: number; y: number };
    initialPosition?: { x: number; y: number } | null;
    boundaryRef?: React.RefObject<HTMLElement | null>;
    getCustomizationForMotif: (motifId: string) => MotifCustomization;
    onSelectMotif: (motifId: string | null) => void;
    onSelectRotation: (rotation: number) => void;
    onApplyToRow: (motifId: string | null, rotation: number) => void;
    onApplyToCol: (motifId: string | null, rotation: number) => void;
    onResetCell: () => void;
    onPositionChange?: (position: { x: number; y: number }) => void;
    onClose: () => void;
}

export const CellPopoverMenu: React.FC<CellPopoverMenuProps> = ({
    row,
    col,
    currentMotifId,
    currentRotation,
    activeFormat,
    primaryMotif,
    clickPosition,
    initialPosition,
    boundaryRef,
    getCustomizationForMotif,
    onSelectMotif,
    onSelectRotation,
    onApplyToRow,
    onApplyToCol,
    onResetCell,
    onPositionChange,
    onClose
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    // Position state (draggable within editor bounds)
    const [position, setPosition] = useState<{ x: number; y: number }>(() => {
        const popWidth = 350;
        const popHeight = 480;
        let targetX = initialPosition ? initialPosition.x : clickPosition.x + 20;
        let targetY = initialPosition ? initialPosition.y : clickPosition.y - 40;

        if (boundaryRef?.current) {
            const rect = boundaryRef.current.getBoundingClientRect();
            const minX = rect.left + 8;
            const maxX = Math.max(minX, rect.right - popWidth - 8);
            const minY = rect.top + 8;
            const maxY = Math.max(minY, rect.bottom - popHeight - 8);

            if (!initialPosition && targetX + popWidth > rect.right - 8) {
                targetX = Math.max(minX, clickPosition.x - popWidth - 20);
            }
            targetX = Math.min(Math.max(targetX, minX), maxX);
            targetY = Math.min(Math.max(targetY, minY), maxY);
        } else {
            const minX = 16;
            const maxX = Math.max(minX, window.innerWidth - popWidth - 16);
            const minY = 60;
            const maxY = Math.max(minY, window.innerHeight - popHeight - 16);

            if (!initialPosition && targetX + popWidth > window.innerWidth - 16) {
                targetX = Math.max(minX, clickPosition.x - popWidth - 20);
            }
            targetX = Math.min(Math.max(targetX, minX), maxX);
            targetY = Math.min(Math.max(targetY, minY), maxY);
        }

        return { x: targetX, y: targetY };
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
        mouseX: 0,
        mouseY: 0,
        posX: 0,
        posY: 0
    });
    const currentPosRef = useRef<{ x: number; y: number }>(position);
    const hasMovedRef = useRef(false);

    useEffect(() => {
        currentPosRef.current = position;
    }, [position]);

    // If user has NOT dragged the modal yet, adjust position to new click position
    useEffect(() => {
        if (!initialPosition) {
            const popWidth = popoverRef.current?.offsetWidth || 350;
            const popHeight = popoverRef.current?.offsetHeight || 480;
            let targetX = clickPosition.x + 20;
            let targetY = clickPosition.y - 40;

            if (boundaryRef?.current) {
                const rect = boundaryRef.current.getBoundingClientRect();
                const minX = rect.left + 8;
                const maxX = Math.max(minX, rect.right - popWidth - 8);
                const minY = rect.top + 8;
                const maxY = Math.max(minY, rect.bottom - popHeight - 8);

                if (targetX + popWidth > rect.right - 8) {
                    targetX = Math.max(minX, clickPosition.x - popWidth - 20);
                }
                targetX = Math.min(Math.max(targetX, minX), maxX);
                targetY = Math.min(Math.max(targetY, minY), maxY);
            } else {
                const minX = 16;
                const maxX = Math.max(minX, window.innerWidth - popWidth - 16);
                const minY = 60;
                const maxY = Math.max(minY, window.innerHeight - popHeight - 16);

                if (targetX + popWidth > window.innerWidth - 16) {
                    targetX = Math.max(minX, clickPosition.x - popWidth - 20);
                }
                targetX = Math.min(Math.max(targetX, minX), maxX);
                targetY = Math.min(Math.max(targetY, minY), maxY);
            }

            setPosition({ x: targetX, y: targetY });
        }
    }, [clickPosition.x, clickPosition.y, initialPosition, boundaryRef]);

    // Keep position clamped if boundaries change (e.g. sidebar toggle or window resize)
    useEffect(() => {
        const clampPosition = () => {
            if (!popoverRef.current) return;
            const popWidth = popoverRef.current.offsetWidth || 350;
            const popHeight = popoverRef.current.offsetHeight || 480;

            if (boundaryRef?.current) {
                const rect = boundaryRef.current.getBoundingClientRect();
                const minX = rect.left + 8;
                const maxX = Math.max(minX, rect.right - popWidth - 8);
                const minY = rect.top + 8;
                const maxY = Math.max(minY, rect.bottom - popHeight - 8);

                setPosition(prev => {
                    const clampedX = Math.min(Math.max(prev.x, minX), maxX);
                    const clampedY = Math.min(Math.max(prev.y, minY), maxY);
                    if (clampedX !== prev.x || clampedY !== prev.y) {
                        onPositionChange?.({ x: clampedX, y: clampedY });
                        return { x: clampedX, y: clampedY };
                    }
                    return prev;
                });
            }
        };

        window.addEventListener('resize', clampPosition);
        let observer: ResizeObserver | null = null;
        if (boundaryRef?.current && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
                clampPosition();
            });
            observer.observe(boundaryRef.current);
        }

        return () => {
            window.removeEventListener('resize', clampPosition);
            if (observer) observer.disconnect();
        };
    }, [boundaryRef, onPositionChange]);

    // Drag handlers on Header
    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        e.preventDefault();
        setIsDragging(true);
        hasMovedRef.current = false;
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            posX: position.x,
            posY: position.y
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartRef.current.mouseX;
            const deltaY = e.clientY - dragStartRef.current.mouseY;

            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                hasMovedRef.current = true;
            }

            let newX = dragStartRef.current.posX + deltaX;
            let newY = dragStartRef.current.posY + deltaY;

            if (boundaryRef?.current && popoverRef.current) {
                const rect = boundaryRef.current.getBoundingClientRect();
                const popWidth = popoverRef.current.offsetWidth || 350;
                const popHeight = popoverRef.current.offsetHeight || 480;

                const minX = rect.left + 8;
                const maxX = Math.max(minX, rect.right - popWidth - 8);
                const minY = rect.top + 8;
                const maxY = Math.max(minY, rect.bottom - popHeight - 8);

                newX = Math.min(Math.max(newX, minX), maxX);
                newY = Math.min(Math.max(newY, minY), maxY);
            } else {
                const minX = 8;
                const maxX = window.innerWidth - (popoverRef.current?.offsetWidth || 350) - 8;
                const minY = 8;
                const maxY = window.innerHeight - (popoverRef.current?.offsetHeight || 480) - 8;
                newX = Math.min(Math.max(newX, minX), maxX);
                newY = Math.min(Math.max(newY, minY), maxY);
            }

            currentPosRef.current = { x: newX, y: newY };
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            if (hasMovedRef.current) {
                onPositionChange?.(currentPosRef.current);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, boundaryRef, onPositionChange]);

    // Close on Escape or click outside
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        const t = setTimeout(() => {
            window.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
            clearTimeout(t);
        };
    }, [onClose]);

    const isPlain = currentMotifId === null;
    const currentMotif = currentMotifId ? PETITE_MOTIFS.find(m => m.id === currentMotifId) : null;

    return (
        <div
            ref={popoverRef}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            className={`fixed z-50 w-[350px] bg-white rounded-2xl shadow-2xl border border-[#D7D3CA] flex flex-col overflow-hidden select-none text-[#242424] transition-shadow duration-150 ${isDragging ? 'shadow-2xl ring-2 ring-[#242424]/20' : ''
                }`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Draggable Header */}
            <div
                onMouseDown={handleHeaderMouseDown}
                className={`px-4 py-2.5 bg-[#FAF9F5] border-b border-[#E7E4DE] flex items-center justify-between select-none cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'bg-[#F2EFE8]' : 'hover:bg-[#F5F2EA]'
                    }`}
                title="Arrastrar para mover por el editor"
            >
                <div className="flex items-center gap-2">
                    <div className="text-[#A8A49C] hover:text-[#242424] cursor-grab active:cursor-grabbing p-0.5 -ml-1">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#242424]">
                            Placa ({row + 1}, {col + 1})
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E7E4DE] text-[#77736C]">
                            {isPlain ? 'Fondo liso' : (currentMotif?.name || currentMotifId)}
                        </span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-lg text-[#77736C] hover:text-[#242424] hover:bg-[#EFECE6] transition-colors cursor-pointer"
                    title="Cerrar menú"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-4 space-y-3.5 max-h-[min(500px,calc(100vh-160px))]">
                {/* Fast Tile Presets: Plain vs Active Primary */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#77736C] block">
                        Estado de la placa
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onSelectMotif(null)}
                            className={`p-2 rounded-lg border flex items-center gap-2.5 transition-all text-left cursor-pointer ${isPlain
                                ? 'border-[#242424] bg-[#242424] text-white shadow-xs'
                                : 'border-[#E7E4DE] bg-white hover:bg-[#FAF9F5] text-[#242424]'
                                }`}
                        >
                            <CircleOff className={`w-4 h-4 shrink-0 ${isPlain ? 'text-white' : 'text-[#77736C]'}`} />
                            <div className="truncate">
                                <div className="text-xs font-semibold">Liso</div>
                                {/* <div className={`text-[10px] truncate ${isPlain ? 'text-white/80' : 'text-[#8C8880]'}`}>
                                    Sin motivo
                                </div> */}
                            </div>
                            {isPlain && <Check className="w-3.5 h-3.5 ml-auto text-white shrink-0" />}
                        </button>

                        <button
                            onClick={() => onSelectMotif(primaryMotif.id)}
                            className={`p-2 rounded-lg border flex items-center gap-2.5 transition-all text-left cursor-pointer ${currentMotifId === primaryMotif.id
                                ? 'border-[#242424] bg-[#242424] text-white shadow-xs'
                                : 'border-[#E7E4DE] bg-white hover:bg-[#FAF9F5] text-[#242424]'
                                }`}
                        >
                            <Sparkles className={`w-4 h-4 shrink-0 ${currentMotifId === primaryMotif.id ? 'text-[#DDA743]' : 'text-[#77736C]'}`} />
                            <div className="truncate">
                                <div className="text-xs font-semibold truncate">{primaryMotif.name}</div>
                                {/* <div className={`text-[10px] truncate ${currentMotifId === primaryMotif.id ? 'text-white/80' : 'text-[#8C8880]'}`}>
                                    Principal ({primaryMotif.catalogueNumber})
                                </div> */}
                            </div>
                            {currentMotifId === primaryMotif.id && <Check className="w-3.5 h-3.5 ml-auto text-white shrink-0" />}
                        </button>
                    </div>
                </div>

                {/* 10 Motifs Grid */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[#77736C] block">
                            Seleccionar motivo
                        </label>
                        {/* <span className="text-[10px] text-[#8C8880]">10 modelos</span> */}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                        {PETITE_MOTIFS.map((m) => {
                            const isSelected = currentMotifId === m.id;
                            const cust = getCustomizationForMotif(m.id);
                            const svg = m.svgData[activeFormat];
                            const pieceCount = svg?.motifPieces.length || 0;

                            return (
                                <button
                                    key={m.id}
                                    onClick={() => onSelectMotif(m.id)}
                                    className={`p-2 rounded-lg border flex items-center gap-2.5 transition-all text-left cursor-pointer group ${isSelected
                                        ? 'border-[#242424] bg-[#F7F6F2] ring-1 ring-[#242424]'
                                        : 'border-[#E7E4DE] bg-white hover:bg-[#FAF9F5] hover:border-[#8C8880]'
                                        }`}
                                >
                                    {/* Micro SVG preview */}
                                    <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E7E4DE] flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                                        {svg ? (
                                            <svg
                                                viewBox={`0 0 ${svg.width} ${svg.height}`}
                                                className="w-full h-full"
                                            >
                                                {/* Background shapes subtle */}
                                                {svg.backgroundShapes.slice(0, 30).map((b, i) =>
                                                    b.type === 'circle' ? (
                                                        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="#E7E4DE" />
                                                    ) : (
                                                        <path key={i} d={b.d} fill="#E7E4DE" />
                                                    )
                                                )}
                                                {/* Motif pieces with rendered colors */}
                                                {svg.motifPieces.map(p => {
                                                    const col = cust.pieceColors[p.id] || p.originalColor;
                                                    return p.type === 'circle' ? (
                                                        <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill={col} />
                                                    ) : (
                                                        <path key={p.id} d={p.d} fill={col} />
                                                    );
                                                })}
                                            </svg>
                                        ) : (
                                            <span className="text-[8px] font-mono">{m.catalogueNumber}</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="truncate flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-[#242424] truncate">
                                                {m.name}
                                            </span>
                                            {isSelected && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#242424] shrink-0" />
                                            )}
                                        </div>
                                        {/* <div className="text-[10px] text-[#77736C] font-mono">
                                            Nº {m.catalogueNumber} · {pieceCount}p
                                        </div> */}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Cell Rotation Options */}
                {!isPlain && (
                    <div className="space-y-1.5 pt-3 border-t border-[#E7E4DE]">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-medium text-[#77736C] flex items-center gap-1">
                                <RotateCw className="w-3 h-3 text-[#242424]" />
                                <span>Giro de esta placa</span>
                            </label>
                            <span className="text-[10px] font-mono text-[#77736C] font-medium">
                                {currentRotation}°
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[0, 90, 180, 270].map((angle) => (
                                <button
                                    key={angle}
                                    onClick={() => onSelectRotation(angle)}
                                    className={`py-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer ${currentRotation === angle
                                        ? 'border-[#242424] bg-[#242424] text-white font-semibold shadow-xs'
                                        : 'border-[#E7E4DE] bg-white text-[#242424] hover:bg-[#FAF9F5]'
                                        }`}
                                >
                                    {angle}°
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid Replication Actions */}
                <div className="space-y-1.5 pt-3 border-t border-[#E7E4DE]">
                    <label className="text-[11px] font-medium text-[#77736C] block">
                        Acciones rápidas de réplica
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            onClick={() => onApplyToRow(currentMotifId, currentRotation)}
                            className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E7E4DE] rounded-lg text-[11px] font-medium text-[#242424] transition-colors text-left flex items-center justify-between cursor-pointer"
                            title={`Aplicar este motivo y giro a toda la fila ${row + 1}`}
                        >
                            <span>Fila {row + 1} completa</span>
                            <ArrowRight className="w-3 h-3 text-[#77736C]" />
                        </button>
                        <button
                            onClick={() => onApplyToCol(currentMotifId, currentRotation)}
                            className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E7E4DE] rounded-lg text-[11px] font-medium text-[#242424] transition-colors text-left flex items-center justify-between cursor-pointer"
                            title={`Aplicar este motivo y giro a toda la columna ${col + 1}`}
                        >
                            <span>Columna {col + 1} completa</span>
                            <ArrowRight className="w-3 h-3 text-[#77736C]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-[#FAF9F5] border-t border-[#E7E4DE] flex items-center justify-between text-[11px]">
                <button
                    onClick={() => {
                        onResetCell();
                        onClose();
                    }}
                    className="text-[#77736C] hover:text-[#242424] underline cursor-pointer"
                >
                    Restablecer celda
                </button>
                <button
                    onClick={onClose}
                    className="px-3.5 py-1 bg-[#242424] text-white font-semibold rounded-md hover:bg-black transition-colors cursor-pointer"
                >
                    Listo
                </button>
            </div>
        </div>
    );
};
