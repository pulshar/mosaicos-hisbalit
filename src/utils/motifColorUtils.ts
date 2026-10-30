import { MotifCustomization, MotifFormat } from '../types';
import { getMotifById, getDefaultCustomization } from '../data/motifs';

/**
 * Calculates the dominant (most frequent) color used in the customized motif pieces.
 * Falls back to first piece color or #242424.
 */
export function getDominantPieceColor(
    customization: MotifCustomization,
    fallback = '#242424'
): string {
    const colorCounts: Record<string, number> = {};
    const pieceColors = customization.pieceColors || {};

    Object.entries(pieceColors).forEach(([id, color]) => {
        if (id !== 'background' && color) {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        }
    });

    let dominantColor = fallback;
    let maxCount = 0;

    for (const [color, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
        }
    }

    return dominantColor;
}

/**
 * Homologously converts a motif customization between formats ('round' <-> 'hexagonal'),
 * mapping customized colors accurately piece-by-piece using geometric index homology
 * and ID matching, preserving user-edited colors across formats.
 */
export function convertCustomizationFormat(
    motifId: string,
    currentCust: MotifCustomization,
    targetFormat: MotifFormat
): MotifCustomization {
    const motif = getMotifById(motifId);
    const bgColor = currentCust.backgroundColor || '#D9D9D9';

    if (!motif) {
        return {
            ...currentCust,
            format: targetFormat,
            backgroundColor: bgColor
        };
    }

    const prevFormat = currentCust.format;
    const prevSvg = motif.svgData[prevFormat];
    const targetSvg = motif.svgData[targetFormat];

    if (!targetSvg) {
        return {
            ...currentCust,
            format: targetFormat,
            backgroundColor: bgColor
        };
    }

    // If already in target format and pieceColors has valid keys for this format, return as is
    if (prevFormat === targetFormat) {
        const hasValidPieces = targetSvg.motifPieces.every(p => currentCust.pieceColors?.[p.id] !== undefined);
        if (hasValidPieces) {
            return {
                ...currentCust,
                backgroundColor: bgColor
            };
        }
    }

    const newPieceColors: Record<string, string> = {};
    const prevColors = currentCust.pieceColors || {};
    const existingValues = Object.values(prevColors).filter(Boolean);
    const fallbackColor = existingValues[0] || '#000000';

    targetSvg.motifPieces.forEach((targetPiece, index) => {
        // 1. Homologous piece mapping by position/index (e.g. index 0 in round <-> index 0 in hex)
        const prevPiece = prevSvg?.motifPieces[index];
        if (prevPiece && prevColors[prevPiece.id]) {
            newPieceColors[targetPiece.id] = prevColors[prevPiece.id];
        } else if (prevColors[targetPiece.id]) {
            // 2. Direct ID match (for motifs where round and hex share the exact same IDs)
            newPieceColors[targetPiece.id] = prevColors[targetPiece.id];
        } else {
            // 3. Fallback to existing customized color or target piece original factory color
            newPieceColors[targetPiece.id] = targetPiece.originalColor || fallbackColor;
        }
    });

    return {
        ...currentCust,
        motifId: motif.id,
        format: targetFormat,
        pieceColors: newPieceColors,
        backgroundColor: bgColor
    };
}

/**
 * Resolves effective customization for any motif:
 * - If motif was edited previously by user: returns its customized colors (Memoria de Personalización),
 *   converting homologous piece colors if the target format differs from stored format.
 * - If motif has NOT been edited: returns its original default customization with the shared background color.
 *   No automatic dominant color inheritance between motifs, ensuring each motif preserves its authentic author design until explicitly customized.
 */
export function resolveEffectiveMotifCustomization(
    targetMotifId: string,
    format: MotifFormat,
    activeCustomization: MotifCustomization,
    customizationsMap: Record<string, MotifCustomization> = {},
    _editedMotifIds: Record<string, boolean> = {}
): MotifCustomization {
    const bgColor = activeCustomization.backgroundColor || '#D9D9D9';

    // 1. If target is the active motif, activeCustomization is the definitive source of truth
    if (targetMotifId === activeCustomization.motifId) {
        if (activeCustomization.format !== format) {
            return convertCustomizationFormat(targetMotifId, activeCustomization, format);
        }
        return {
            ...activeCustomization,
            format,
            backgroundColor: bgColor
        };
    }

    // 2. If motif has stored individual customization in the map, use it and convert format if needed
    if (customizationsMap && customizationsMap[targetMotifId]) {
        const existing = customizationsMap[targetMotifId];
        if (existing.format !== format) {
            return convertCustomizationFormat(targetMotifId, existing, format);
        }
        return {
            ...existing,
            format,
            backgroundColor: bgColor
        };
    }

    // 3. Fallback to author's original default colors for this motif with shared background
    const defaultCust = getDefaultCustomization(targetMotifId, format);
    return {
        ...defaultCust,
        backgroundColor: bgColor
    };
}
