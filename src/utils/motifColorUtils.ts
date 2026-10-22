import { MotifDefinition, MotifCustomization, MotifFormat } from '../types';
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
 * Resolves effective customization for any motif:
 * - If motif was edited previously by user: returns its customized colors (Memoria de Personalización)
 * - If motif has NOT been edited: returns its original default customization with the shared background color.
 *   No automatic dominant color inheritance between motifs, ensuring each motif preserves its authentic author design until explicitly customized.
 */
export function resolveEffectiveMotifCustomization(
    targetMotifId: string,
    format: MotifFormat,
    activeCustomization: MotifCustomization,
    customizationsMap: Record<string, MotifCustomization>,
    editedMotifIds: Record<string, boolean>
): MotifCustomization {
    const bgColor = activeCustomization.backgroundColor || '#D9D9D9';

    // If user previously edited this motif, respect its stored individual customization
    if (editedMotifIds[targetMotifId] && customizationsMap[targetMotifId]) {
        const existing = customizationsMap[targetMotifId];
        return {
            ...existing,
            format,
            backgroundColor: bgColor
        };
    }

    // Not edited yet: return original default colors for this motif (no automatic inheritance)
    const defaultCust = getDefaultCustomization(targetMotifId, format);
    return {
        ...defaultCust,
        backgroundColor: bgColor
    };
}
