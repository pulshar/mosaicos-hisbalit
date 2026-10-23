import { SpacePreset } from '../types';

export const SPACE_PRESETS: SpacePreset[] = [
  {
    id: 'comedor-nordico',
    name: 'Comedor Nórdico',
    category: 'living',
    image: '/assets/images/comedor-nordico.webp',
    description: 'Pared frontal de comedor de diseño con mesa, sillas nórdicas, aparador de roble y sombras realistas integradas en recorte alfa.',
    surfaceLabel: 'Pared Frontal Comedor',
    aspectRatio: '3/2',
    isForegroundOverlay: true,
    polygonPoints: [
      [3.3, 2.4],
      [100, 2.4],
      [100, 100],
      [3.3, 100]
    ],
    defaultScale: 0.475,
    offsetX: 36,
    offsetY: 18,
    blendMode: 'normal'
  },
  {
    id: 'bathroom_wall',
    name: 'Baño Principal — Frontal Lavabo',
    category: 'bath',
    image: '/assets/images/bathroom_wall_space_1791898954529.jpg',
    description: 'Paramento vertical continuo sobre lavabo exento de piedra caliza con iluminación natural lateral.',
    surfaceLabel: 'Pared Frontal',
    // [[x, y] in %]
    polygonPoints: [
      [37, 6],
      [84, 6],
      [84, 92],
      [37, 92]
    ],
    defaultScale: 0.45,
    blendMode: 'multiply'
  },
  {
    id: 'living_floor',
    name: 'Estancia Interior — Pavimento Suelo',
    category: 'floor',
    image: '/assets/images/modern_floor_space_1791898955696.jpg',
    description: 'Superficie de pavimento continuo en estancia amplia y luminosa con mobiliario nórdico.',
    surfaceLabel: 'Suelo / Pavimento',
    polygonPoints: [
      [0, 68],
      [100, 62],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 0.45,
    blendMode: 'multiply'
  },
  {
    id: 'shower_wall',
    name: 'Ducha de Obra — Paramento & Hornacina',
    category: 'bath',
    image: '/assets/images/shower_vanity_space_1791898956491.jpg',
    description: 'Zona de ducha estilo boutique con grifería en latón cepillado y luz indirecta perimetral.',
    surfaceLabel: 'Pared Ducha',
    polygonPoints: [
      [28, 14],
      [72, 14],
      [72, 98],
      [28, 98]
    ],
    defaultScale: 0.45,
    blendMode: 'multiply'
  },
  {
    id: 'kitchen_backsplash',
    name: 'Cocina de Diseño — Frontal Antepecho',
    category: 'kitchen',
    image: '/assets/images/kitchen_backsplash_space_1791898956129.jpg',
    description: 'Frontal entre encimera de mármol y repisa de roble natural con iluminación cálida.',
    surfaceLabel: 'Antepecho Cocina',
    polygonPoints: [
      [42, 12],
      [99, 12],
      [99, 60],
      [42, 60]
    ],
    defaultScale: 0.45,
    blendMode: 'multiply'
  }
];
