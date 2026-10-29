export interface ColorSwatch {
  code: string;
  name: string;
  hex: string;
  category: 'Neutros' | 'Tierras' | 'Mediterráneo' | 'Acentos';
}

/**
 * Paleta Oficial Unicolor de Hisbalit Mosaico (57 referencias)
 * Ordenada exactamente según la carta oficial de referencias
 */
export const HISBALIT_PALETTE: ColorSwatch[] = [
  // Fila 1
  { code: '335', name: 'Azul Turquesa', hex: '#5BBFD2', category: 'Mediterráneo' },
  { code: '313', name: 'Verde Abeto', hex: '#223B38', category: 'Mediterráneo' },
  { code: '305', name: 'Gris Salvia', hex: '#7B8B87', category: 'Neutros' },
  { code: '108', name: 'Celadón Suave', hex: '#A0B2AB', category: 'Neutros' },
  { code: '127', name: 'Azul Petróleo', hex: '#1F7A85', category: 'Mediterráneo' },
  { code: '222', name: 'Verde Marisma', hex: '#5DA391', category: 'Mediterráneo' },

  // Fila 2
  { code: '314', name: 'Celeste Suave', hex: '#A7CBD2', category: 'Mediterráneo' },
  { code: '316', name: 'Blanco Bruma', hex: '#DDE6EA', category: 'Neutros' },
  { code: '317', name: 'Gris Tormenta', hex: '#758690', category: 'Neutros' },
  { code: '318', name: 'Azul Denim', hex: '#506679', category: 'Mediterráneo' },
  { code: '319', name: 'Azul Marino', hex: '#364A5F', category: 'Mediterráneo' },
  { code: '240', name: 'Azul Océano', hex: '#1A6A9D', category: 'Mediterráneo' },

  // Fila 3
  { code: '315', name: 'Azul Hielo', hex: '#D2DFE8', category: 'Mediterráneo' },
  { code: '320', name: 'Azul Real', hex: '#1C51B6', category: 'Mediterráneo' },
  { code: '220', name: 'Verde Bosque', hex: '#355C45', category: 'Mediterráneo' },
  { code: '221', name: 'Verde Hoja', hex: '#597B41', category: 'Mediterráneo' },
  { code: '115', name: 'Verde Manzana', hex: '#A1C677', category: 'Acentos' },
  { code: '301', name: 'Verde Lima', hex: '#CBD526', category: 'Acentos' },

  // Fila 4
  { code: '302', name: 'Amarillo Canario', hex: '#F7DF00', category: 'Acentos' },
  { code: '303', name: 'Amarillo Pastel', hex: '#F8F6A8', category: 'Acentos' },
  { code: '103', name: 'Blanco Puro', hex: '#FFFFFF', category: 'Neutros' },
  { code: '306', name: 'Gris Perla', hex: '#D9D9D9', category: 'Neutros' },
  { code: '106', name: 'Gris Cemento', hex: '#787A77', category: 'Neutros' },
  { code: '260', name: 'Gris Antracita', hex: '#535655', category: 'Neutros' },

  // Fila 5
  { code: '101', name: 'Negro Ébano', hex: '#000000', category: 'Neutros' },
  { code: '255', name: 'Rosa Pálido', hex: '#DCBCBB', category: 'Acentos' },
  { code: '166', name: 'Rosa Empolvado', hex: '#BA898D', category: 'Acentos' },
  { code: '251', name: 'Malva Ceniza', hex: '#88707E', category: 'Acentos' },
  { code: '309', name: 'Lila Suave', hex: '#B9AAB9', category: 'Acentos' },
  { code: '308', name: 'Violeta Profundo', hex: '#54466B', category: 'Acentos' },

  // Fila 6
  { code: '176', name: 'Rojo Pasión', hex: '#CF2828', category: 'Acentos' },
  { code: '177', name: 'Coral Vivo', hex: '#EE5B5F', category: 'Acentos' },
  { code: '172', name: 'Terracota', hex: '#BA4E3B', category: 'Tierras' },
  { code: '324', name: 'Visón Cálido', hex: '#89807E', category: 'Tierras' },
  { code: '323', name: 'Pardo Arcilla', hex: '#807467', category: 'Tierras' },
  { code: '163', name: 'Café Espresso', hex: '#3E342F', category: 'Tierras' },

  // Fila 7
  { code: '322', name: 'Caqui Olivo', hex: '#7B715A', category: 'Tierras' },
  { code: '327', name: 'Gris Piedra', hex: '#A09E91', category: 'Neutros' },
  { code: '328', name: 'Greige Arena', hex: '#8F876C', category: 'Tierras' },
  { code: '329', name: 'Lino Almendra', hex: '#C9C6AE', category: 'Tierras' },
  { code: '325', name: 'Caliza Suave', hex: '#C1BEAC', category: 'Neutros' },
  { code: '321', name: 'Bronce Olivo', hex: '#635E44', category: 'Tierras' },

  // Fila 8
  { code: '337', name: 'Verde Laurel', hex: '#8B8A4F', category: 'Tierras' },
  { code: '307', name: 'Ocre Dorado', hex: '#A79344', category: 'Tierras' },
  { code: '336', name: 'Vainilla Cálida', hex: '#F5D79B', category: 'Tierras' },
  { code: '231', name: 'Ámbar Sol', hex: '#F5B229', category: 'Acentos' },
  { code: '304', name: 'Naranja Caldera', hex: '#CE5B33', category: 'Acentos' },
  { code: '326', name: 'Melocotón', hex: '#EE9D59', category: 'Acentos' },

  // Fila 9
  { code: '210', name: 'Castaño Tostado', hex: '#563423', category: 'Tierras' },
  { code: '212', name: 'Caramelo Cuero', hex: '#9C633A', category: 'Tierras' },
  { code: '330', name: 'Blanco Marfil', hex: '#F3EEDA', category: 'Neutros' },
  { code: '311', name: 'Menta Suave', hex: '#C7DFD5', category: 'Mediterráneo' },
  { code: '334', name: 'Gris Ceniza', hex: '#BFBCB5', category: 'Neutros' },
  { code: '173', name: 'Trigo Dorado', hex: '#E0C693', category: 'Tierras' },

  // Fila 10
  { code: '333', name: 'Arena Nude', hex: '#E5D5B9', category: 'Tierras' },
  { code: '332', name: 'Crema Suave', hex: '#EBDEB3', category: 'Tierras' },
  { code: '331', name: 'Lino Tiza', hex: '#DED7BF', category: 'Neutros' }
];

export function findMaterialByHex(hex: string): ColorSwatch | undefined {
  const norm = hex.toUpperCase();
  return HISBALIT_PALETTE.find(s => s.hex.toUpperCase() === norm);
}

export function findMaterialByCode(code: string): ColorSwatch | undefined {
  return HISBALIT_PALETTE.find(s => s.code === code);
}

export interface ColorReferenceInfo {
  hex: string;
  code: string;
  name: string;
  reference: string;
  shortReference: string;
}

/**
 * Returns the official Hisbalit color reference for a given hex code.
 * Always resolves to a human-readable reference name and code, never returning a raw hex string.
 */
export function getColorReference(hex: string): ColorReferenceInfo {
  if (!hex) {
    return {
      hex: '#000000',
      code: '—',
      name: 'Sin color',
      reference: 'Sin color',
      shortReference: 'Ref. —'
    };
  }

  let cleanHex = hex.trim().toUpperCase();
  if (cleanHex.length === 4 && cleanHex.startsWith('#')) {
    cleanHex = `#${cleanHex[1]}${cleanHex[1]}${cleanHex[2]}${cleanHex[2]}${cleanHex[3]}${cleanHex[3]}`;
  }

  const direct = findMaterialByHex(cleanHex);
  if (direct) {
    return {
      hex: direct.hex,
      code: direct.code,
      name: direct.name,
      reference: `Ref. ${direct.code} · ${direct.name}`,
      shortReference: `Ref. ${direct.code}`
    };
  }

  // Parse RGB for closest match in Hisbalit palette
  const r1 = parseInt(cleanHex.slice(1, 3), 16) || 0;
  const g1 = parseInt(cleanHex.slice(3, 5), 16) || 0;
  const b1 = parseInt(cleanHex.slice(5, 7), 16) || 0;

  let bestMatch: ColorSwatch | null = null;
  let minDiff = Infinity;

  for (const swatch of HISBALIT_PALETTE) {
    const sHex = swatch.hex.toUpperCase();
    const r2 = parseInt(sHex.slice(1, 3), 16) || 0;
    const g2 = parseInt(sHex.slice(3, 5), 16) || 0;
    const b2 = parseInt(sHex.slice(5, 7), 16) || 0;
    const diff = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = swatch;
    }
  }

  if (bestMatch && minDiff < 30) {
    return {
      hex: cleanHex,
      code: bestMatch.code,
      name: bestMatch.name,
      reference: `Ref. ${bestMatch.code} · ${bestMatch.name}`,
      shortReference: `Ref. ${bestMatch.code}`
    };
  }

  return {
    hex: cleanHex,
    code: 'Especial',
    name: 'Color a medida',
    reference: 'Ref. Especial · Color a medida',
    shortReference: 'Ref. Especial'
  };
}

export const RECENT_COLORS_STORAGE_KEY = 'mosaico_studio_recent_colors';

export function getStoredRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 8);
    }
  } catch {
    // fallback
  }
  return ['#000000', '#D9D9D9', '#BA4E3B', '#1C51B6', '#597B41', '#F5B229', '#FFFFFF', '#535655'];
}

export function saveRecentColor(color: string): string[] {
  try {
    const current = getStoredRecentColors();
    const normalized = color.toUpperCase();
    const updated = [normalized, ...current.filter(c => c.toUpperCase() !== normalized)].slice(0, 8);
    localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [color];
  }
}

export {
  isLightColor,
  getContrastTextColor,
  getContrastHex,
  getRelativeLuminance
} from '../utils/colorContrast';