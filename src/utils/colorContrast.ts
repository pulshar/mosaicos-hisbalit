/**
 * Utilidades para cálculo de luminancia y contraste inteligente según WCAG 2.1.
 * Determina dinámicamente si el texto o iconos sobre cualquier fondo deben ser
 * negros o blancos para garantizar un contraste y legibilidad óptimos.
 */

export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Convierte cualquier color hexadecimal (#RGB, #RRGGBB, #RRGGBBAA) o función rgb/rgba
 * a componentes numéricos RGB en el rango [0, 255].
 */
export function parseColorToRgb(color: string | undefined | null): RgbColor {
    if (!color || typeof color !== 'string') {
        return { r: 255, g: 255, b: 255 };
    }

    const trimmed = color.trim();

    // Soporte para funciones rgb(...) / rgba(...)
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if (rgbMatch) {
        return {
            r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
            g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
            b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
        };
    }

    // Quitar '#' inicial si existe
    let hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

    // Manejo de hex corto (#RGB o #RGBA -> #RRGGBB)
    if (hex.length === 3 || hex.length === 4) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Manejo de hex estándar (#RRGGBB o #RRGGBBAA)
    if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return { r, g, b };
        }
    }

    return { r: 255, g: 255, b: 255 };
}

/**
 * Calcula la luminancia relativa según el estándar WCAG 2.1 (sRGB).
 * Devuelve un valor normalizado entre 0 (negro absoluto) y 1 (blanco absoluto).
 * 
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 */
export function getRelativeLuminance(color: string): number {
    const { r, g, b } = parseColorToRgb(color);

    const linearize = (val: number): number => {
        const s = val / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const rLin = linearize(r);
    const gLin = linearize(g);
    const bLin = linearize(b);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Determina de forma inteligente si un color es claro (requiere texto oscuro/negro)
 * o es oscuro (requiere texto claro/blanco).
 *
 * Matemáticamente, según la fórmula de ratio de contraste WCAG:
 * Ratio contra negro = (L + 0.05) / 0.05
 * Ratio contra blanco = 1.05 / (L + 0.05)
 * El punto de equilibrio exacto donde el texto negro ofrece mayor contraste que el blanco
 * es L = sqrt(1.05 * 0.05) - 0.05 ≈ 0.1791.
 * 
 * Cuando L > 0.179, el texto negro ofrece mayor contraste visual y legibilidad garantizada.
 */
export function isLightColor(color: string, threshold = 0.179): boolean {
    return getRelativeLuminance(color) > threshold;
}

/**
 * Devuelve la clase CSS de Tailwind para el color de texto ('text-black' o 'text-white')
 * asegurando contraste óptimo con el fondo especificado.
 */
export function getContrastTextColor(
    color: string,
    lightClass = 'text-black',
    darkClass = 'text-white'
): string {
    return isLightColor(color) ? lightClass : darkClass;
}

/**
 * Devuelve el código hexadecimal '#000000' o '#FFFFFF' de mayor contraste.
 */
export function getContrastHex(color: string): '#000000' | '#FFFFFF' {
    return isLightColor(color) ? '#000000' : '#FFFFFF';
}
