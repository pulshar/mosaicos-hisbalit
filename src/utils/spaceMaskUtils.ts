import { SpaceMaskCutout } from '../types';

/**
 * Generates an SVG path string in normalized 0..1 coordinates for use in
 * an SVG <clipPath clipPathUnits="objectBoundingBox"> with clipRule="evenodd".
 * The outer polygon covers the target architectural surface (wall, floor),
 * and inner cutouts (mirrors, basins, faucets, furniture) are punched out.
 */
export function generateEvenOddClipPath(
    surfacePoints: [number, number][],
    cutouts?: SpaceMaskCutout[]
): string {
    if (!surfacePoints || surfacePoints.length === 0) return '';

    let d = '';
    // Outer polygon in normalized coordinates 0..1
    surfacePoints.forEach(([x, y], idx) => {
        const nx = (x / 100).toFixed(4);
        const ny = (y / 100).toFixed(4);
        d += (idx === 0 ? 'M ' : ' L ') + nx + ' ' + ny;
    });
    d += ' Z ';

    // Punch out each cutout shape in evenodd mode
    if (cutouts && cutouts.length > 0) {
        cutouts.forEach((c) => {
            if (c.type === 'circle' && c.cx !== undefined && c.cy !== undefined && c.r !== undefined) {
                const cx = c.cx / 100;
                const cy = c.cy / 100;
                const r = c.r / 100;
                // Two 180-degree arcs forming a circle
                d += `M ${(cx - r).toFixed(4)} ${cy.toFixed(4)} ` +
                    `A ${r.toFixed(4)} ${r.toFixed(4)} 0 1 0 ${(cx + r).toFixed(4)} ${cy.toFixed(4)} ` +
                    `A ${r.toFixed(4)} ${r.toFixed(4)} 0 1 0 ${(cx - r).toFixed(4)} ${cy.toFixed(4)} Z `;
            } else if (c.type === 'polygon' && c.points && c.points.length > 0) {
                c.points.forEach(([px, py], pidx) => {
                    const nx = (px / 100).toFixed(4);
                    const ny = (py / 100).toFixed(4);
                    d += (pidx === 0 ? 'M ' : ' L ') + nx + ' ' + ny;
                });
                d += ' Z ';
            }
        });
    }

    return d.trim();
}
