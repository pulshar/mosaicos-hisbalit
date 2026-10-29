import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
    Grid3X3,
    Palette,
    Download,
    X,
    Info
} from 'lucide-react';

export interface TourStep {
    targetId: string;
    badge: string;
    title: string;
    description?: string;
    highlights?: string[];
    tip?: string;
    icon?: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'tour-motif-library',
        badge: '1. Biblioteca',
        title: '1. Selecciona y explora motivos',
        description: 'Colección Petite. Motivos pequeños, sutiles y elegantes, pensados para quienes buscan el punto justo de personalización sin excesos. Formas suaves y puras en formato hexagonal o redondo, trabajadas a mano por nuestros artesanos.',
        tip: 'Oculta o muestra el panel pulsando el botón lateral o Ctrl+B.',
        icon: <Grid3X3 className="w-4 h-4 text-[#DDA743]" />
    },
    {
        targetId: 'tour-customization-panel',
        badge: '2. Personalización',
        title: '2. Personaliza piezas y color de fondo',
        description: 'Haz clic sobre cualquier pieza en el lienzo o en la paleta de colores. Puedes cambiar el color, el fondo, el formato (hexagonal o redondo) o la distancia entre motivos, combinar modelos y crear composiciones únicas.',
        tip: 'Mantén pulsado Shift o Ctrl para seleccionar varias teselas, o usa Ctrl+A para seleccionarlas todas.',
        icon: <Palette className="w-4 h-4 text-[#DDA743]" />
    },
    {
        targetId: 'tour-view-modes',
        badge: '3. Modos de Visualización',
        title: '3. Alterna entre modos de trabajo',
        highlights: [
            'Motivo individual: diseña la pieza al detalle.',
            'Composición repetida: crea mallas continuas, cadencias con lisas o combina con motivos secundarios.',
            'Simulación en espacio: prueba tu composición en estancias reales.'
        ],
        tip: 'En "Simulación en espacio" puedes descargar la imagen generada pulsando el botón de descarga.',
    },
    {
        targetId: 'tour-export-button',
        badge: '4. Exportación',
        title: '4. Exporta tu diseño en alta definición',
        highlights: [
            'SVG vectorial sin pérdida de definición.',
            'Imágenes PNG en 2K y 4K con fichas técnicas de despiece, referencias de color y proporciones reales.',
            'Descargas de las simulaciones en espacios reales.'
        ],
        tip: 'Todo el material generado está optimizado con las referencias de color exactas de Hisbalit.',
        icon: <Download className="w-4 h-4 text-[#DDA743]" />
    }
];

interface WalkthroughTourProps {
    isOpen: boolean;
    onClose: () => void;
    onStepChange?: (stepIndex: number) => void;
}

export const WalkthroughTour: React.FC<WalkthroughTourProps> = ({
    isOpen,
    onClose,
    onStepChange
}) => {
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isPositionReady, setIsPositionReady] = useState<boolean>(false);
    const isFirstRenderRef = useRef<boolean>(true);

    const step = TOUR_STEPS[currentStep];

    // Always reset to step 0 whenever the tour is opened
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            isFirstRenderRef.current = true;
        }
    }, [isOpen]);

    // Update target bounding box synchronously before browser paint to prevent layout jumps
    useLayoutEffect(() => {
        if (!isOpen) {
            setIsPositionReady(false);
            return;
        }
        const currentTargetId = TOUR_STEPS[currentStep].targetId;
        const el = document.getElementById(currentTargetId);
        if (el) {
            setTargetRect(el.getBoundingClientRect());
            setIsPositionReady(true);
        }
    }, [isOpen, currentStep]);

    // Synchronize when step changes or window resizes
    useEffect(() => {
        if (!isOpen) return;
        onStepChange?.(currentStep);

        const updateTarget = () => {
            const currentTargetId = TOUR_STEPS[currentStep].targetId;
            const el = document.getElementById(currentTargetId);
            if (el) {
                setTargetRect(el.getBoundingClientRect());
                setIsPositionReady(true);
            }
        };

        updateTarget();

        // Re-check after 100ms and 320ms in case a side panel was animating
        const t1 = setTimeout(updateTarget, 100);
        const t2 = setTimeout(updateTarget, 320);

        // After initial mount, enable smooth glide transition between tour steps
        const animTimer = setTimeout(() => {
            isFirstRenderRef.current = false;
        }, 60);

        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(animTimer);
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [isOpen, currentStep, onStepChange]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (currentStep < TOUR_STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1);
                } else {
                    onClose();
                }
            } else if (e.key === 'ArrowLeft') {
                if (currentStep > 0) {
                    setCurrentStep(prev => prev - 1);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentStep, onClose]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Determine tooltip placement so it never clips off-screen or flies from wrong default position
    const getTooltipPositionStyle = (): React.CSSProperties => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const cardWidth = 430;
        const cardHeight = 380;
        const margin = 16;

        if (isMobile) {
            return {
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(440px, calc(100vw - 32px))',
                zIndex: 60
            };
        }

        // Step 0: Motif Library (Left panel) -> Place to the right of the panel
        if (currentStep === 0) {
            const targetRight = targetRect ? targetRect.right : 320;
            const targetTop = targetRect ? targetRect.top : 57;
            const left = targetRight + margin + 10;

            const top = Math.min(
                window.innerHeight - cardHeight - margin,
                Math.max(margin, targetTop + 85)
            );
            return {
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                width: `${cardWidth}px`,
                zIndex: 60
            };
        }

        // Step 1: Customization Panel (Right panel) -> Place to the left of the panel
        if (currentStep === 1) {
            const targetLeft = targetRect ? targetRect.left : (window.innerWidth - 376);
            const targetTop = targetRect ? targetRect.top : 57;
            const left = Math.max(margin, targetLeft - cardWidth - margin);

            const top = Math.min(
                window.innerHeight - cardHeight - margin,
                Math.max(margin, targetTop + 85)
            );
            return {
                position: 'fixed',
                left: `${left - 4}px`,
                top: `${top}px`,
                width: `${cardWidth}px`,
                zIndex: 60
            };
        }

        // Step 2: View Modes (Header center) -> Place below the switcher
        if (currentStep === 2) {
            const targetCenter = targetRect ? (targetRect.left + targetRect.width / 2) : (window.innerWidth / 2);
            const targetBottom = targetRect ? targetRect.bottom : 57;
            const left = Math.max(
                margin,
                Math.min(
                    window.innerWidth - cardWidth - margin,
                    targetCenter - cardWidth / 2
                )
            );
            const top = targetBottom + margin;
            return {
                position: 'fixed',
                left: `${left}px`,
                top: `${top + 4}px`,
                width: `${cardWidth}px`,
                zIndex: 60
            };
        }

        // Step 3: Export Button (Header right) -> Place below, right-aligned to button
        if (currentStep === 3) {
            const targetRight = targetRect ? targetRect.right : (window.innerWidth - 20);
            const targetBottom = targetRect ? targetRect.bottom : 57;
            const left = Math.max(margin, targetRight - cardWidth);
            const top = targetBottom + margin + 4;
            return {
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                width: `${cardWidth}px`,
                zIndex: 60
            };
        }

        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${cardWidth}px`,
            zIndex: 60
        };
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in">
            {/* 1. Spotlight Cutout / Backdrop */}
            {targetRect ? (
                <div
                    className={`fixed pointer-events-none z-50 rounded-xl ${isFirstRenderRef.current ? 'transition-none' : 'transition-all duration-300 ease-out'}`}
                    style={{
                        top: `${Math.max(0, targetRect.top - (currentStep === 0 ? 12 : 6))}px`,
                        left: `${Math.max(0, targetRect.left - 6)}px`,
                        width: `${targetRect.width + 12}px`,
                        height: `${targetRect.height + 12}px`,
                        boxShadow:
                            '0 0 0 9999px rgba(18, 18, 18, 0.68), 0 0 0 2px #DDA743, 0 0 28px rgba(221, 167, 67, 0.45)'
                    }}
                />
            ) : (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-black/68 backdrop-blur-[1px] z-50"
                />
            )}

            {/* Invisible backdrop click catcher to dismiss tour on outside click */}
            <div
                className="fixed inset-0 z-50 bg-transparent cursor-default"
                onClick={onClose}
            />

            {/* 2. Tour Card Modal */}
            <div
                style={getTooltipPositionStyle()}
                onClick={e => e.stopPropagation()}
                className={`bg-white rounded-xl border border-[#E7E4DE] shadow-2xl p-5 flex flex-col space-y-4 pointer-events-auto transition-all duration-300 ease-out ${isPositionReady ? 'opacity-100 scale-100' : 'opacity-0 scale-98 pointer-events-none'}`}
            >
                {/* Card Header: Step counter, icon, close button */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div>
                            <h3 className="text-sm font-bold text-charcoal leading-snug">
                                {step.title}
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-md hover:bg-[#F7F6F2] text-taupe hover:text-charcoal flex items-center justify-center transition-colors shrink-0"
                        title="Omitir tutorial (Esc)"
                        aria-label="Cerrar tutorial"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Body */}
                <div className="space-y-3">
                    {step.description &&
                        <p className="text-xs text-[#55514B] leading-relaxed">
                            {step.description}
                        </p>
                    }


                    {/* Bullet Highlights */}
                    <ul className="space-y-1.5">
                        {step.highlights?.map((highlight, index) => (
                            <li
                                key={index}
                                className="text-[11.5px] text-charcoal flex items-start gap-2 leading-relaxed"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                                <span>{highlight}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Pro Tip Box */}
                    {step.tip && (
                        <div className="p-2.5 rounded-lg border bg-slate-100 text-slate-700 border-slate-300 text-[11px] text-taupe flex items-start gap-2">
                            <Info className="w-4 h-4 shrink-0 stroke-2" />
                            <span className="leading-snug">{step.tip}</span>
                        </div>
                    )}
                </div>

                {/* Card Footer: Progress dots, Back, Next / Finish */}
                <div className="pt-2 flex items-center justify-between gap-3">
                    {/* Step indicator dots */}
                    <div className="flex items-center gap-1.5">
                        {TOUR_STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === currentStep
                                    ? 'w-6 bg-brand'
                                    : 'w-1.5 bg-[#E7E4DE] hover:bg-[#C5C1BA]'
                                    }`}
                                title={`Ir al paso ${idx + 1}`}
                                aria-label={`Ir al paso ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3 py-1.5 text-xs font-semibold text-taupe hover:text-charcoal hover:bg-[#F7F6F2] rounded-md transition-colors flex items-center gap-1"
                            >
                                <span>Atrás</span>
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-charcoal hover:bg-black rounded-md transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            {currentStep < TOUR_STEPS.length - 1 ? (
                                <>
                                    <span>Siguiente</span>
                                </>
                            ) : (
                                <>
                                    <span>Empezar a diseñar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footnote: Skip tour anytime */}
                {/* <div className="flex items-center justify-between text-[10px] text-[#A8A49C] pt-0.5">
                    <span className="flex items-center gap-1">
                        <Keyboard className="w-3 h-3 text-[#A8A49C]" /> Usa las flechas o Esc
                    </span>
                    <button
                        onClick={onClose}
                        className="hover:text-[#55514B] underline transition-colors cursor-pointer"
                    >
                        No volver a mostrar
                    </button>
                </div> */}
            </div>
        </div>
    );
};
