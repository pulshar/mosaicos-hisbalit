export type MotifFormat = 'round' | 'hexagonal';

export interface EditablePiece {
  id: string;
  name: string;
  originalColor: string;
}

export interface MotifSvgData {
  viewBox: string;
  width: number;
  height: number;
  // Background pieces are rendered together with uniform background color
  backgroundShapes: Array<{
    type: 'circle' | 'path';
    cx?: number;
    cy?: number;
    r?: number;
    d?: string;
  }>;
  // Pieces of the motif that can be customized individually
  motifPieces: Array<{
    id: string;
    name: string;
    type: 'circle' | 'path';
    cx?: number;
    cy?: number;
    r?: number;
    d?: string;
    originalColor: string;
  }>;
}

export interface MotifDefinition {
  id: string;
  name: string;
  catalogueNumber: string;
  description: string;
  available: boolean;
  supportedFormats: MotifFormat[];
  svgData: Partial<Record<MotifFormat, MotifSvgData>>;
  provisionalThumbnail?: string;
}

export interface MotifCustomization {
  motifId: string;
  format: MotifFormat;
  pieceColors: Record<string, string>;
  backgroundColor: string;
  rotation: number; // 0, 45, 90, 180, 270
}

export type PlainTileCadence =
  | 'none'
  | 'checkerboard'
  | 'ratio1_2'
  | 'ratio1_3'
  | 'rows'
  | 'cols';

export interface CompositionSettings {
  viewMode: 'single' | 'pattern' | 'simulation';
  repeatX: number;
  repeatY: number;
  patternUnitX?: number; // Base module width (columns) for periodic pattern repetition (default 3)
  patternUnitY?: number; // Base module height (rows) for periodic pattern repetition (default 2)
  spacingX: number; // in pixels or unit delta
  spacingY: number;
  staggered: boolean;
  plainTileCadence?: PlainTileCadence;
  cellOverrides?: Record<string, boolean | string>; // Overrides per cell "row-col": true (default motif) | false (plain) | string (specific motif id, e.g. 'diamant')
  cellRotations?: Record<string, number>; // Optional rotation override per cell
  showPlainBackground: boolean;
  secondaryMotifId: string | null;
  combineRatio: 'alternate' | 'single';
  zoom: number;
  panX: number;
  panY: number;
}


export interface SpacePreset {
  id: string;
  name: string;
  category: 'bath' | 'floor' | 'kitchen' | 'living' | 'dining';
  image: string;
  description: string;
  surfaceLabel: string;
  aspectRatio?: string;
  // Polygon coordinates [ [x1,y1], [x2,y2], [x3,y3], [x4,y4] ] in percent 0..100
  polygonPoints: [number, number][];
  defaultScale: number;
  offsetX?: number;
  offsetY?: number;
  blendMode: 'multiply' | 'normal';
  isForegroundOverlay?: boolean;
}

export interface SimulationSettings {
  activeSpaceId: string;
  customUploadedImage: string | null;
  customPolygonPoints: [number, number][];
  scale: number;
  opacity: number;
  blendMode: 'multiply' | 'normal';
  brightness: number;
  perspectiveAngle: number;
}
