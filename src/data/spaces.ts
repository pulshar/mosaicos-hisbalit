import { SpacePreset } from '../types';

export const SPACE_PRESETS: SpacePreset[] = [
  {
    id: 'comedor-hornacina',
    name: 'Comedor con hornacina',
    category: 'living',
    image: '/assets/images/comedor-hornacina.webp',
    description: 'Pared de comedor con hornacina en arco, baldas de madera rústica, mesa y sillas con sombras reales integradas en recorte alfa.',
    surfaceLabel: 'Pared con Hornacina',
    aspectRatio: '2000/1333',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 0.94,
    blendMode: 'normal'
  },
  {
    id: 'despacho-nordico',
    name: 'Despacho Nórdico',
    category: 'office',
    image: '/assets/images/despacho-nordico.webp',
    description: 'Zona de trabajo con escritorio de madera negra, silla de rejilla, portátil, cuadro minimalista, planta y sombras reales integradas en recorte alfa.',
    surfaceLabel: 'Pared Despacho',
    aspectRatio: '2000/1333',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 1.6,
    blendMode: 'normal'
  },
  {
    id: 'comedor-nordico',
    name: 'Comedor Nórdico',
    category: 'living',
    image: '/assets/images/comedor-nordico.webp',
    description: 'Pared frontal de comedor de diseño con mesa, sillas nórdicas, aparador de roble y sombras realistas integradas en recorte alfa.',
    surfaceLabel: 'Pared Frontal Comedor',
    aspectRatio: '2000/1333',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 1,
    blendMode: 'normal',
    perspectiveTransform: {
      offsetX: 3,
      offsetY: 2
    }
  },
  {
    id: 'kitchen_fleche',
    name: 'Cocina Nórdica',
    category: 'kitchen',
    image: '/assets/images/cocina-nordica.webp',
    description: 'Frontal completo de cocina nórdica con encimera negra, cafetera espresso, tostador, estantes flotantes, menaje y sombras realistas integradas en recorte alfa.',
    surfaceLabel: 'Frontal Cocina',
    aspectRatio: '2000/1333',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 1.475,
    blendMode: 'normal'
  },
  {
    id: 'cocina-arco',
    name: 'Cocina con Arco',
    category: 'kitchen',
    image: '/assets/images/cocina-arco.webp',
    description: 'Frontal de cocina con balda flotante, isla con fregadero, libros, arco exterior y fuga en perspectiva real calibrada.',
    surfaceLabel: 'Pared Cocina',
    aspectRatio: '2000/1333',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 1.35,
    blendMode: 'normal',
    perspectiveTransform: {
      perspective: 1550,
      rotateY: -30,
      skewY: 1,
      originX: '36.7%',
      originY: '60%',
      scaleX: 1.1,
      scaleY: 0.99,
      offsetX: 0,
      offsetY: -6
    }
  },
  {
    id: 'cocina-rustica',
    name: 'Cocina Rústica',
    category: 'kitchen',
    image: '/assets/images/cocina-rustica.webp',
    description: 'Cocina de ambiente cálido con encimera de madera maciza, fregadero blanco, grifo vintage de latón, menaje y frontal alicatado con sombras de contacto reales.',
    surfaceLabel: 'Frontal Fregadero Rústico',
    aspectRatio: '2000/1972',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 2.125,
    blendMode: 'normal',
    perspectiveTransform: {
      offsetX: -4,
      offsetY: 0
    }
  },
  {
    id: 'hall_floor_perspective',
    name: 'Recibidor / Hall',
    category: 'floor',
    image: '/assets/images/recibidor-hall.webp',
    description: 'Recibidor luminoso con puertas dobles acristaladas, espejo, perchero, plantas, banqueta de madera rústica y pavimento en perspectiva real con sombras de contacto integradas.',
    surfaceLabel: 'Suelo Recibidor',
    aspectRatio: '2000/1333',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 1.0,
    blendMode: 'normal',
    perspectiveTransform: {
      perspective: 1100,
      rotateX: 68,
      originX: '50%',
      originY: '100%',
      scale: 1.5,
      scaleY: 1.4,
      offsetX: 0,
      offsetY: 2
    }
  },
  {
    id: 'suelo-comedor',
    name: 'Suelo Salón-Comedor',
    category: 'floor',
    image: '/assets/images/suelo-comedor.webp',
    description: 'Salón comedor contemporáneo con aparador de nogal, mesa de centro, sillones de madera y rejilla, cuadro botánico y pavimento en perspectiva real con sombras de contacto integradas.',
    surfaceLabel: 'Suelo Salón-Comedor',
    aspectRatio: '2000/2069',
    isForegroundOverlay: true,
    polygonPoints: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    defaultScale: 1.0,
    blendMode: 'normal',
    perspectiveTransform: {
      perspective: 1100,
      rotateX: 68,
      originX: '50%',
      originY: '100%',
      scale: 1.8,
      scaleY: 1.55,
      offsetX: -1,
      offsetY: 2
    }
  }
];
