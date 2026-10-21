import { MotifDefinition, MotifSvgData } from '../types';
import { FLECHE_ROUND_SVG, FLECHE_HEXAGONAL_SVG } from './flecheData';
import { TRIANGLE_ROUND_SVG, TRIANGLE_HEXAGONAL_SVG } from './triangleData';
import { DIAMANT_ROUND_SVG, DIAMANT_HEXAGONAL_SVG } from './diamantData';
import { BONBON_ROUND_SVG, BONBON_HEXAGONAL_SVG } from './bonbonData';
import { LIGNE_ROUND_SVG, LIGNE_HEXAGONAL_SVG } from './ligneData';
import { POINT_ROUND_SVG, POINT_HEXAGONAL_SVG } from './pointData';
import { BIJOU_ROUND_SVG, BIJOU_HEXAGONAL_SVG } from './bijouData';
import { TULIPE_ROUND_SVG, TULIPE_HEXAGONAL_SVG } from './tulipeData';
import { SOLEIL_ROUND_SVG, SOLEIL_HEXAGONAL_SVG } from './soleilData';
import { ETOILE_ROUND_SVG, ETOILE_HEXAGONAL_SVG } from './etoileData';

// Full catalogue of the 10 motifs of Petite collection
export const PETITE_MOTIFS: MotifDefinition[] = [
  {
    id: 'fleche',
    name: 'Flèche',
    catalogueNumber: '01',
    description: 'Composición dinámica en flecha que aporta dirección y movimiento continuo al paramento.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: FLECHE_ROUND_SVG,
      hexagonal: FLECHE_HEXAGONAL_SVG
    }
  },
  {
    id: 'diamant',
    name: 'Diamant',
    catalogueNumber: '02',
    description: 'Rombo arquitectónico de líneas puras para patrones clásicos con carácter contemporáneo.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: DIAMANT_ROUND_SVG,
      hexagonal: DIAMANT_HEXAGONAL_SVG
    }
  },
  {
    id: 'bonbon',
    name: 'Bonbon',
    catalogueNumber: '03',
    description: 'Silueta lúdica y envolvente inspirada en formas orgánicas dulces y elegantes.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: BONBON_ROUND_SVG,
      hexagonal: BONBON_HEXAGONAL_SVG
    }
  },
  {
    id: 'ligne',
    name: 'Ligne',
    catalogueNumber: '04',
    description: 'Trazo continuo y esbelto ideal para cenefas y ritmos verticales u horizontales depurados.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: LIGNE_ROUND_SVG,
      hexagonal: LIGNE_HEXAGONAL_SVG
    }
  },
  {
    id: 'point',
    name: 'Point',
    catalogueNumber: '05',
    description: 'Punto de acento minimalista que crea texturas punteadas sutiles y armónicas.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: POINT_ROUND_SVG,
      hexagonal: POINT_HEXAGONAL_SVG
    }
  },
  {
    id: 'bijou',
    name: 'Bijou',
    catalogueNumber: '06',
    description: 'Detalle joya de escala menuda diseñado para crear destellos cromáticos rítmicos.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: BIJOU_ROUND_SVG,
      hexagonal: BIJOU_HEXAGONAL_SVG
    }
  },
  {
    id: 'soleil',
    name: 'Soleil',
    catalogueNumber: '07',
    description: 'Estrella solar radial con centro vibrante que ilumina composiciones de gran formato.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: SOLEIL_ROUND_SVG,
      hexagonal: SOLEIL_HEXAGONAL_SVG
    }
  },
  {
    id: 'tulipe',
    name: 'Tulipe',
    catalogueNumber: '08',
    description: 'Inspiración botánica estilizada en curvas suaves para atmósferas sosegadas.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: TULIPE_ROUND_SVG,
      hexagonal: TULIPE_HEXAGONAL_SVG
    }
  },
  {
    id: 'etoile',
    name: 'Étoile',
    catalogueNumber: '09',
    description: 'Constelación de cuatro puntas equilibrada, emblema de elegancia artesanal.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: ETOILE_ROUND_SVG,
      hexagonal: ETOILE_HEXAGONAL_SVG
    }
  },
  {
    id: 'triangle',
    name: 'Triangle',
    catalogueNumber: '10',
    description: 'Geometría primaria de gran fuerza visual para combinaciones modulares audaces.',
    available: true,
    supportedFormats: ['round', 'hexagonal'],
    svgData: {
      round: TRIANGLE_ROUND_SVG,
      hexagonal: TRIANGLE_HEXAGONAL_SVG
    }
  }
];

export function getMotifById(id: string): MotifDefinition | undefined {
  return PETITE_MOTIFS.find(m => m.id === id);
}

export function getDefaultCustomization(motifId: string, format: 'round' | 'hexagonal' = 'round'): {
  motifId: string;
  format: 'round' | 'hexagonal';
  pieceColors: Record<string, string>;
  backgroundColor: string;
  rotation: number;
} {
  const motif = getMotifById(motifId) || PETITE_MOTIFS[0];
  const activeFormat = motif.supportedFormats.includes(format) ? format : (motif.supportedFormats[0] || 'round');
  const svgData = motif.svgData[activeFormat];
  const initialColors: Record<string, string> = {};

  if (svgData) {
    svgData.motifPieces.forEach(piece => {
      initialColors[piece.id] = piece.originalColor;
    });
  }

  return {
    motifId: motif.id,
    format: activeFormat,
    pieceColors: initialColors,
    backgroundColor: '#D9D9D9',
    rotation: 0
  };
}
