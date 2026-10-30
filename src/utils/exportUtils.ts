import { MotifDefinition, MotifCustomization, CompositionSettings, SpacePreset, PerspectiveTransformConfig, PlainTileCadence, MotifFormat } from '../types';
import { getMotifById } from '../data/motifs';
import { resolveEffectiveMotifCustomization } from './motifColorUtils';

/**
 * Resolves the specific motif ID or null (plain tile) for a given cell (rowIndex, colIndex)
 */
export function getCellMotif(
  rowIndex: number,
  colIndex: number,
  cadence: PlainTileCadence = 'none',
  repeatX: number = 4,
  cellOverrides?: Record<string, boolean | string>,
  defaultMotifId: string = 'soleil'
): string | null {
  const key = `${rowIndex}-${colIndex}`;
  if (cellOverrides && cellOverrides[key] !== undefined) {
    const val = cellOverrides[key];
    if (val === false || val === 'plain') return null;
    if (val === true) return defaultMotifId;
    return typeof val === 'string' ? val : defaultMotifId;
  }

  let hasMotif = true;
  switch (cadence) {
    case 'none':
      hasMotif = true;
      break;
    case 'checkerboard':
      hasMotif = (rowIndex + colIndex) % 2 === 0;
      break;
    case 'ratio1_2':
      hasMotif = (colIndex + rowIndex * 2) % 3 === 0;
      break;
    case 'ratio1_3':
      hasMotif = (colIndex + (rowIndex % 2) * 2) % 4 === 0;
      break;
    case 'rows':
      hasMotif = rowIndex % 2 === 0;
      break;
    case 'cols':
      hasMotif = colIndex % 2 === 0;
      break;
    default:
      hasMotif = true;
  }

  return hasMotif ? defaultMotifId : null;
}

/**
 * Evaluates whether a grid cell (rowIndex, colIndex) contains any motif or is plain background
 */
export function isCellWithMotif(
  rowIndex: number,
  colIndex: number,
  cadence: PlainTileCadence = 'none',
  repeatX: number = 4,
  cellOverrides?: Record<string, boolean | string>
): boolean {
  const key = `${rowIndex}-${colIndex}`;
  if (cellOverrides && cellOverrides[key] !== undefined) {
    const val = cellOverrides[key];
    return val !== false && val !== 'plain';
  }

  switch (cadence) {
    case 'none':
      return true;
    case 'checkerboard':
      return (rowIndex + colIndex) % 2 === 0;
    case 'ratio1_2':
      return (colIndex + rowIndex * 2) % 3 === 0;
    case 'ratio1_3':
      return (colIndex + (rowIndex % 2) * 2) % 4 === 0;
    case 'rows':
      return rowIndex % 2 === 0;
    case 'cols':
      return colIndex % 2 === 0;
    default:
      return true;
  }
}

/**
 * Calculates plate counts for motif vs plain tiles in repeated composition, including breakdown by motif
 */
export function getCompositionPlatesCount(
  repeatX: number,
  repeatY: number,
  cadence: PlainTileCadence = 'none',
  cellOverrides?: Record<string, boolean | string>,
  defaultMotifId: string = 'soleil'
): {
  motifCount: number;
  plainCount: number;
  totalCount: number;
  motifCounts: Record<string, number>;
} {
  let motifCount = 0;
  const motifCounts: Record<string, number> = {};
  const totalCount = repeatX * repeatY;

  for (let r = 0; r < repeatY; r++) {
    for (let c = 0; c < repeatX; c++) {
      const mId = getCellMotif(r, c, cadence, repeatX, cellOverrides, defaultMotifId);
      if (mId) {
        motifCount++;
        motifCounts[mId] = (motifCounts[mId] || 0) + 1;
      }
    }
  }

  return {
    motifCount,
    plainCount: totalCount - motifCount,
    totalCount,
    motifCounts
  };
}

/**
 * Calculates official dimensions (cm) and total surface area (m²) for Hisbalit Petite plates.
 * Real plate dimensions:
 * - Redondo: 31,00 × 33,33 cm
 * - Hexagonal: 31,2 × 33,2 cm
 */
export function calculateSurfaceSpecs(
  format: MotifFormat,
  repeatX: number = 1,
  repeatY: number = 1,
  scope: 'single' | 'composition' = 'composition'
) {
  const isRound = format === 'round';
  const widthCm = isRound ? 31.00 : 31.2;
  const heightCm = isRound ? 33.33 : 33.2;
  const widthFormatted = isRound ? '31,00' : '31,2';
  const heightFormatted = isRound ? '33,33' : '33,2';
  const singlePlateDimensions = `${widthFormatted} × ${heightFormatted} cm`;

  if (scope === 'single') {
    const areaM2 = ((widthCm * heightCm) / 10000).toFixed(2).replace('.', ',');
    return {
      formatName: isRound ? 'Redondo' : 'Hexagonal',
      plateDimensions: singlePlateDimensions,
      totalDimensions: singlePlateDimensions,
      areaM2: `${areaM2} m²`,
      totalAreaVal: (widthCm * heightCm) / 10000,
      summaryText: `${singlePlateDimensions} (${areaM2} m²)`
    };
  } else {
    const totalWidthVal = repeatX * widthCm;
    const totalHeightVal = repeatY * heightCm;
    const totalWidthCm = (totalWidthVal % 1 === 0 ? totalWidthVal.toFixed(1) : totalWidthVal.toFixed(2))
      .replace(/\.?0+$/, '')
      .replace('.', ',');
    const totalHeightCm = (totalHeightVal % 1 === 0 ? totalHeightVal.toFixed(1) : totalHeightVal.toFixed(2))
      .replace(/\.?0+$/, '')
      .replace('.', ',');
    const totalAreaM2 = ((totalWidthVal * totalHeightVal) / 10000).toFixed(2).replace('.', ',');
    return {
      formatName: isRound ? 'Redondo' : 'Hexagonal',
      plateDimensions: singlePlateDimensions,
      totalDimensions: `${totalWidthCm} × ${totalHeightCm} cm`,
      areaM2: `${totalAreaM2} m²`,
      totalAreaVal: (totalWidthVal * totalHeightVal) / 10000,
      summaryText: `${totalWidthCm} × ${totalHeightCm} cm (${totalAreaM2} m²)`
    };
  }
}

/**
 * Builds a plain tile SVG inner string where all pieces are uniform background color
 */
export function generatePlainTileSvgInner(
  motif: MotifDefinition,
  customization: MotifCustomization,
  rotationOverride?: number
): string {
  const format = customization.format;
  const svgData = motif.svgData[format];
  if (!svgData) return '';
  const bgColor = customization.backgroundColor || '#D9D9D9';
  const rotation = rotationOverride !== undefined ? rotationOverride : (customization.rotation || 0);
  const rotTransform = getTileRotationTransform(rotation, svgData.width, svgData.height);

  const bgShapes = svgData.backgroundShapes.map(s =>
    s.type === 'circle'
      ? `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${bgColor}" />`
      : `<path d="${s.d}" fill="${bgColor}" />`
  ).join('\n');

  const pieceShapes = svgData.motifPieces.map(p =>
    p.type === 'circle'
      ? `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${bgColor}" />`
      : `<path d="${p.d}" fill="${bgColor}" />`
  ).join('\n');

  return `
    <g transform="${rotTransform}">
      <g>
        ${bgShapes}
      </g>
      <g>
        ${pieceShapes}
      </g>
    </g>
  `;
}

/**
 * Calculates SVG transform for rotated tile so it fits tightly in positive [0, W]x[0, H] quadrant
 */
export function getTileRotationTransform(rotation: number, width: number, height: number): string {
  const norm = ((rotation % 360) + 360) % 360;
  if (norm === 90) {
    return `translate(${height}, 0) rotate(90)`;
  }
  if (norm === 180) {
    return `translate(${width}, ${height}) rotate(180)`;
  }
  if (norm === 270) {
    return `translate(0, ${width}) rotate(270)`;
  }
  return '';
}

/**
 * Builds a clean standalone SVG string for the single motif
 */
export function generateSingleMotifSvg(
  motif: MotifDefinition,
  customization: MotifCustomization,
  includeXmlHeader = true
): string {
  const format = customization.format;
  const svgData = motif.svgData[format];

  if (!svgData) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="150" y="150" text-anchor="middle">SVG no disponible</text></svg>`;
  }

  const bgColor = customization.backgroundColor || '#D9D9D9';
  const rotation = customization.rotation || 0;
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const displayW = isRotated90or270 ? svgData.height : svgData.width;
  const displayH = isRotated90or270 ? svgData.width : svgData.height;

  // Render background elements
  const bgElementsStr = svgData.backgroundShapes.map(shape => {
    if (shape.type === 'circle') {
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${bgColor}" />`;
    } else {
      return `<path d="${shape.d}" fill="${bgColor}" />`;
    }
  }).join('\n    ');

  // Render motif pieces
  const motifElementsStr = svgData.motifPieces.map(piece => {
    const color = customization.pieceColors[piece.id] || piece.originalColor;
    if (piece.type === 'circle') {
      return `<circle id="${piece.id}" cx="${piece.cx}" cy="${piece.cy}" r="${piece.r}" fill="${color}" />`;
    } else {
      return `<path id="${piece.id}" d="${piece.d}" fill="${color}" />`;
    }
  }).join('\n    ');

  const transformAttr = rotation !== 0
    ? `transform="${getTileRotationTransform(rotation, svgData.width, svgData.height)}"`
    : '';

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="${displayW}" height="${displayH}" viewBox="0 0 ${displayW} ${displayH}">
  <g id="motif-container" ${transformAttr}>
    <g id="background-group">
      ${bgElementsStr}
    </g>
    <g id="motif-group">
      ${motifElementsStr}
    </g>
  </g>
</svg>`.trim();

  return includeXmlHeader
    ? `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generado por Mosaico Studio - Colección Petite -->\n${svgContent}`
    : svgContent;
}

/**
 * Builds a tiled composition SVG string
 */
export function generateCompositionSvg(
  motif: MotifDefinition,
  customization: MotifCustomization,
  composition: CompositionSettings,
  secondaryMotif?: MotifDefinition | null,
  customizationsMap: Record<string, MotifCustomization> = {},
  editedMotifIds: Record<string, boolean> = {}
): string {
  const format = customization.format;
  const svgData = motif.svgData[format];

  if (!svgData) {
    return generateSingleMotifSvg(motif, customization);
  }

  const cols = composition.repeatX;
  const rows = composition.repeatY;
  const baseRotation = customization.rotation || 0;
  const isRotated90or270 = baseRotation === 90 || baseRotation === 270;

  const tileW = isRotated90or270 ? svgData.height : svgData.width;
  const tileH = isRotated90or270 ? svgData.width : svgData.height;

  // Paso exacto de la trama de teselas según orientación para encaje continuo perfecto sin juntas
  // En 0° y 180°: X = 286 (13 columnas), Y = 304 (16 filas)
  // En 90° y 270°: X = 304 (16 filas), Y = 286 (13 columnas)
  const rawBaseStepX = format === 'round' ? 286 : 286.19;
  const rawBaseStepY = format === 'round' ? 304 : 299.40;
  const baseStepX = isRotated90or270 ? rawBaseStepY : rawBaseStepX;
  const baseStepY = isRotated90or270 ? rawBaseStepX : rawBaseStepY;

  const unitW = baseStepX + composition.spacingX;
  const unitH = baseStepY + composition.spacingY;

  // En tresbolillo: desplazamiento horizontal para encaje continuo según orientación
  const rawStaggerShiftX = isRotated90or270
    ? (format === 'round' ? 152 : 149.70)
    : (format === 'round' ? 132 : 132.09);

  const staggerShiftX = composition.staggered
    ? rawStaggerShiftX + (composition.spacingX * 0.5)
    : 0;

  const totalWidth = (cols - 1) * unitW + tileW + staggerShiftX;
  const totalHeight = (rows - 1) * unitH + tileH;

  const instances: string[] = [];
  const motifSvgInnersCache: Record<string, string> = {};

  const getSvgInnerForMotif = (mId: string, rot: number): string => {
    const cacheKey = `${mId}_${rot}`;
    if (motifSvgInnersCache[cacheKey]) return motifSvgInnersCache[cacheKey];

    const targetMotif = getMotifById(mId);
    if (!targetMotif || !targetMotif.svgData[format]) {
      return generatePlainTileSvgInner(motif, customization, rot);
    }

    const effCust = resolveEffectiveMotifCustomization(
      mId,
      format,
      customization,
      customizationsMap,
      editedMotifIds
    );

    const custWithRot: MotifCustomization = {
      ...effCust,
      rotation: rot
    };

    const inner = generateSingleMotifSvg(targetMotif, custWithRot, false)
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');

    motifSvgInnersCache[cacheKey] = inner;
    return inner;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = c * unitW + (composition.staggered && r % 2 === 1 ? staggerShiftX : 0);
      const offsetY = r * unitH;
      const cellKey = `${r}-${c}`;

      const cellMotifId = getCellMotif(
        r,
        c,
        composition.plainTileCadence || 'none',
        cols,
        composition.cellOverrides,
        motif.id
      );

      const cellOffset = composition.cellRotations?.[cellKey] ?? 0;
      const cellRot = ((baseRotation ?? 0) + cellOffset) % 360;

      let content: string;
      if (!cellMotifId) {
        content = generatePlainTileSvgInner(motif, customization, cellRot);
      } else {
        content = getSvgInnerForMotif(cellMotifId, cellRot);
      }

      instances.push(`
    <g transform="translate(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})">
      ${content}
    </g>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Mosaico Studio - Composición Repetida Colección Petite -->
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth.toFixed(0)}" height="${totalHeight.toFixed(0)}" viewBox="0 0 ${totalWidth.toFixed(0)} ${totalHeight.toFixed(0)}">
  <rect width="100%" height="100%" fill="#F7F6F2" />
  <g id="composition-grid">
    ${instances.join('\n')}
  </g>
</svg>`.trim();
}

/**
 * Downloads a text/svg file to client device
 */
export function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
* Metadata for rendering technical specifications underneath the exported image
 */
export interface ExportImageMetadata {
  scope: 'single' | 'composition';
  motifsTitle: string;
  motifsDetail?: string;
  colors: import('../data/palette').ColorReferenceInfo[];
  totalArea: string;
  totalDimensions: string;
  formatName: string;
  collectionTitle?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  ctx.fillText(truncated + '...', x, y);
}

/**
 * Renders SVG to Canvas and triggers high-resolution PNG download.
 * When metadata is provided, appends an architectural technical specifications card underneath the image
 * showing the motifs used, official color references (never hex codes), and total surface area.
 */
export async function downloadSvgAsPng(
  svgString: string,
  fileName: string,
  targetWidth = 3840,
  targetHeight?: number,
  metadata?: ExportImageMetadata
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const aspect = img.width / (img.height || 1);

      if (!metadata) {
        // Standard raw export without footer
        const canvasW = targetWidth;
        const canvasH = targetHeight || Math.round(targetWidth / aspect);

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Draw background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Render crisp image
        ctx.drawImage(img, 0, 0, canvasW, canvasH);

        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Failed to create PNG blob'));
            return;
          }

          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          resolve();
        }, 'image/png');
        return;
      }

      // High-resolution architectural presentation sheet with technical footer
      // When targetWidth is 1080 (1K export) or lower, linear scaling s = 1080/1920 (0.5625)
      // would shrink fonts to 6-10px, making them hard to read.
      // We calibrate typography and card dimensions so that at 1080px all values and labels
      // remain large, crisp, and comfortable to read, while scaling proportionally for 2K (1920) and 4K (3840).
      const is1080 = targetWidth <= 1200;
      const s = is1080 ? 1 : targetWidth / 1920;

      // Layout spacing (proportional to targetWidth)
      const margin = Math.round(is1080 ? 32 : 44 * s);
      const gap = Math.round(is1080 ? 22 : 28 * s);
      const cardPad = Math.round(is1080 ? 26 : 30 * s);
      const cardRadius = Math.round(is1080 ? 14 : 16 * s);

      const mosaicW = targetWidth - margin * 2;
      const mosaicH = Math.round(mosaicW / aspect);


      // Typography sizes (px) calibrated for high legibility
      const fontBrandTitle = Math.round(is1080 ? 15 : 15 * s);
      const fontBrandSub = Math.round(is1080 ? 13 : 13 * s);
      const fontBadge = Math.round(is1080 ? 12.5 : 12.5 * s);
      const fontLabel = Math.round(is1080 ? 11 : 11 * s);
      const fontMotifTitle = Math.round(is1080 ? 17 : 17 * s);
      const fontMotifDetail = Math.round(is1080 ? 12 : 12 * s);
      const fontColorRef = Math.round(is1080 ? 13 : 13 * s);
      const fontTotalArea = Math.round(is1080 ? 20 : 20 * s);
      const fontDimensions = Math.round(is1080 ? 12 : 12 * s);
      const fontFooter = Math.round(is1080 ? 11 : 10.5 * s);

      const swatchR = Math.round(is1080 ? 8 : 8 * s);
      const colorRowH = Math.round(is1080 ? 28 : 28 * s);

      // Dynamically calculate panel height based on number of colors
      const numColorRows = Math.max(1, Math.ceil(metadata.colors.length / 2));
      const colorsBlockH = Math.max(Math.round(84 * s), numColorRows * colorRowH + Math.round(26 * s));
      const mainContentH = Math.max(Math.round(96 * s), colorsBlockH);
      const panelH = Math.round(52 * s + mainContentH + 42 * s);

      const canvasW = targetWidth;
      const canvasH = margin + mosaicH + gap + panelH + margin;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Clean background for entire presentation sheet
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // 2. Render crisp mosaic image
      ctx.drawImage(img, margin, margin, mosaicW, mosaicH);

      // Delicate border around mosaic
      ctx.strokeStyle = '#E7E4DE';
      ctx.lineWidth = Math.max(1, Math.round(1 * s));
      ctx.strokeRect(margin, margin, mosaicW, mosaicH);

      // 3. Technical footer card underneath the image
      const panelX = margin;
      const panelY = margin + mosaicH + gap;

      drawRoundedRect(ctx, panelX, panelY, mosaicW, panelH, cardRadius);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, Math.round(1.5 * s));
      ctx.stroke();

      // --- Header Bar of the Technical Card ---
      const headerY = panelY + Math.round(26 * s);

      // Brand Title
      ctx.fillStyle = '#242424';
      ctx.font = `bold ${fontBrandTitle}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText('HISBALIT MOSAICO', panelX + cardPad, headerY);

      // Brand Subtitle
      const brandWidth = ctx.measureText('HISBALIT MOSAICO').width;
      ctx.fillStyle = '#7B7871';
      ctx.font = `500 ${fontBrandSub}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText('  ·  Colección Petite', panelX + cardPad + brandWidth, headerY);

      // Right format pill/text
      const formatBadgeText = `${metadata.formatName} · ${metadata.scope === 'single' ? 'Motivo individual' : 'Composición completa'}`;
      ctx.fillStyle = '#524F4A';
      ctx.font = `600 ${fontBadge}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      const formatW = ctx.measureText(formatBadgeText).width;
      ctx.fillText(formatBadgeText, panelX + mosaicW - cardPad - formatW, headerY);

      // Separator line under header
      const sep1Y = headerY + Math.round(15 * s);
      ctx.beginPath();
      ctx.strokeStyle = '#E7E4DE';
      ctx.lineWidth = Math.max(1, Math.round(1 * s));
      ctx.moveTo(panelX + cardPad, sep1Y);
      ctx.lineTo(panelX + mosaicW - cardPad, sep1Y);
      ctx.stroke();

      // --- 3-Column Specifications Section ---
      const contentW = mosaicW - cardPad * 2;
      const colGap = Math.round(26 * s);
      const col1W = Math.round(contentW * 0.28);
      const col3W = Math.round(contentW * 0.24);
      const col2W = contentW - col1W - col3W - colGap * 2;

      const labelY = sep1Y + Math.round(24 * s);

      // COLUMN 1: MOTIVO(S) UTILIZADOS
      const c1X = panelX + cardPad;
      ctx.fillStyle = '#7B7871';
      ctx.font = `bold ${fontLabel}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      const motifLabel = metadata.motifsTitle.includes('+') || metadata.motifsTitle.includes(',')
        ? 'MOTIVOS UTILIZADOS'
        : 'MOTIVO UTILIZADO';
      ctx.fillText(motifLabel, c1X, labelY);

      ctx.fillStyle = '#242424';
      ctx.font = `bold ${fontMotifTitle}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      drawTextWithEllipsis(ctx, metadata.motifsTitle, c1X, labelY + Math.round(24 * s), col1W);

      if (metadata.motifsDetail) {
        ctx.fillStyle = '#524F4A';
        ctx.font = `normal ${fontMotifDetail}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
        drawTextWithEllipsis(ctx, metadata.motifsDetail, c1X, labelY + Math.round(44 * s), col1W);
      }

      // COLUMN 2: COLORES UTILIZADOS (REFERENCIAS)
      const c2X = c1X + col1W + colGap;
      ctx.fillStyle = '#7B7871';
      ctx.font = `bold ${fontLabel}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText('COLORES UTILIZADOS', c2X, labelY);

      const halfColors = Math.ceil(metadata.colors.length / 2);
      const subColW = Math.round((col2W - Math.round(16 * s)) / 2);

      metadata.colors.forEach((col, i) => {
        const inSecondSubCol = i >= halfColors && metadata.colors.length > 2;
        const itemX = inSecondSubCol ? c2X + subColW + Math.round(16 * s) : c2X;
        const rowIdx = inSecondSubCol ? (i - halfColors) : i;
        const itemY = labelY + Math.round(22 * s) + rowIdx * colorRowH;

        // Circular swatch
        ctx.beginPath();
        ctx.arc(itemX + swatchR, itemY - Math.round(4 * s), swatchR, 0, Math.PI * 2);
        ctx.fillStyle = col.hex;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = Math.max(1, Math.round(1 * s));
        ctx.stroke();

        // Reference text (Reference code and name, no hex)
        ctx.fillStyle = '#242424';
        ctx.font = `600 ${fontColorRef}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
        const maxTextW = (metadata.colors.length > 2 ? subColW : col2W) - swatchR * 2 - Math.round(10 * s);
        drawTextWithEllipsis(ctx, col.reference, itemX + swatchR * 2 + Math.round(8 * s), itemY, maxTextW);
      });

      // COLUMN 3: SUPERFICIE TOTAL
      const c3X = c2X + col2W + colGap;
      ctx.fillStyle = '#7B7871';
      ctx.font = `bold ${fontLabel}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText('SUPERFICIE TOTAL', c3X, labelY);

      ctx.fillStyle = '#242424';
      ctx.font = `bold ${fontTotalArea}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      drawTextWithEllipsis(ctx, metadata.totalArea, c3X, labelY + Math.round(24 * s), col3W);

      ctx.fillStyle = '#524F4A';
      ctx.font = `normal ${fontDimensions}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      drawTextWithEllipsis(ctx, metadata.totalDimensions, c3X, labelY + Math.round(44 * s), col3W);

      // --- Bottom fine print and footer ---
      const bottomLineY = panelY + panelH - Math.round(30 * s);
      ctx.beginPath();
      ctx.strokeStyle = '#E7E4DE';
      ctx.lineWidth = Math.max(1, Math.round(1 * s));
      ctx.moveTo(panelX + cardPad, bottomLineY);
      ctx.lineTo(panelX + mosaicW - cardPad, bottomLineY);
      ctx.stroke();

      const footerTextY = bottomLineY + Math.round(18 * s);
      ctx.fillStyle = '#8C8880';
      ctx.font = `normal ${fontFooter}px "General Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillText('www.hisbalit.es · Mosaico de vidrio 100% reciclado y ecológico', panelX + cardPad, footerTextY);

      const creditText = 'Configurado con Mosaico Studio';
      const creditW = ctx.measureText(creditText).width;
      ctx.fillText(creditText, panelX + mosaicW - cardPad - creditW, footerTextY);

      // 4. Output blob and download
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error('Failed to create PNG blob'));
          return;
        }

        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, 'image/png');
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}


/**
 * Generates a full continuous mosaic surface SVG specifically crafted for the room simulation.
 * Blankets the entire viewport/wall area with seamless interlocking tesserae (no gaps, no repeating seams,
 * exact tresbolillo staggering, custom colors preserved, individual tile rotations honored).
 */
export function generateSimulationWallSvg(
  motif: MotifDefinition,
  customization: MotifCustomization,
  composition: CompositionSettings,
  aspectRatio: number,
  scale: number = 1.0,
  customizationsMap: Record<string, MotifCustomization> = {},
  editedMotifIds: Record<string, boolean> = {},
  baseResolution: number = 1920
): string {
  const format = customization.format;
  const svgData = motif.svgData[format];

  if (!svgData) {
    return generateSingleMotifSvg(motif, customization, true);
  }

  const baseRotation = customization.rotation || 0;
  const isRotated90or270 = baseRotation === 90 || baseRotation === 270;

  // Exact geometric step between tiles according to orientation
  // In 0°/180°: X = 286 (13 columns), Y = 304 (16 rows)
  // In 90°/270°: X = 304 (16 rows), Y = 286 (13 columns)
  const rawBaseStepX = format === 'round' ? 286 : 286.19;
  const rawBaseStepY = format === 'round' ? 304 : 299.40;
  const baseStepX = isRotated90or270 ? rawBaseStepY : rawBaseStepX;
  const baseStepY = isRotated90or270 ? rawBaseStepX : rawBaseStepY;

  const unitW = baseStepX + composition.spacingX;
  const unitH = baseStepY + composition.spacingY;

  // Horizontal shift in tresbolillo (staggered)
  const rawStaggerShiftX = isRotated90or270
    ? (format === 'round' ? 152 : 149.70)
    : (format === 'round' ? 132 : 132.09);

  const staggerShiftX = composition.staggered
    ? rawStaggerShiftX + (composition.spacingX * 0.5)
    : 0;

  // Simulation virtual coordinate space matching photo aspect ratio and export resolution
  const roomW = baseResolution;
  const roomH = Math.round(baseResolution / Math.max(0.2, aspectRatio));

  // Determine scaling so scale=1.0 represents realistic architectural proportion
  // e.g. at scale 1.0, one tile is ~130.625px wide in the 1920 space, scaled proportionally for higher resolutions
  const resFactor = baseResolution / 1920;
  const effectiveScale = Math.max(0.2, Math.min(4.0, scale));
  const BASE_TILE_WIDTH = 130.625 * resFactor;
  const tileDisplayW = BASE_TILE_WIDTH * effectiveScale;
  const scaleFactor = tileDisplayW / unitW;

  // Calculate needed columns and rows in unscaled tile coordinates to fully blanket [0, roomW] x [0, roomH]
  const scaledUnitW = unitW * scaleFactor;
  const scaledUnitH = unitH * scaleFactor;
  const colsCount = Math.ceil(roomW / scaledUnitW) + 2;
  const rowsCount = Math.ceil(roomH / scaledUnitH) + 2;

  // Cache for SVG motif definitions
  const motifSvgInnersCache: Record<string, string> = {};

  const getSvgInnerForMotif = (mId: string, rot: number): string => {
    const cacheKey = `${mId}_${rot}`;
    if (motifSvgInnersCache[cacheKey]) return motifSvgInnersCache[cacheKey];

    const targetMotif = getMotifById(mId);
    if (!targetMotif || !targetMotif.svgData[format]) {
      return generatePlainTileSvgInner(motif, customization, rot);
    }

    const effCust = resolveEffectiveMotifCustomization(
      mId,
      format,
      customization,
      customizationsMap,
      editedMotifIds
    );

    const custWithRot: MotifCustomization = {
      ...effCust,
      rotation: rot
    };

    const inner = generateSingleMotifSvg(targetMotif, custWithRot, false)
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '');

    motifSvgInnersCache[cacheKey] = inner;
    return inner;
  };

  const compCols = Math.max(1, composition.repeatX);
  const compRows = Math.max(1, composition.repeatY);

  const instances: string[] = [];

  // Loop with safety buffer tiles on all borders to prevent edge clipping under any stagger, offset or scale
  for (let r = -2; r <= rowsCount + 2; r++) {
    for (let c = -2; c <= colsCount + 2; c++) {
      // Calculate stagger row parity (handles negative r correctly)
      const isOddRow = Math.abs(r) % 2 === 1;
      const offsetX = c * unitW + (composition.staggered && isOddRow ? staggerShiftX : 0);
      const offsetY = r * unitH;

      // Map to composition grid with positive modulo
      const compR = ((r % compRows) + compRows) % compRows;
      const compC = ((c % compCols) + compCols) % compCols;
      const cellKey = `${compR}-${compC}`;

      const cellMotifId = getCellMotif(
        compR,
        compC,
        composition.plainTileCadence || 'none',
        compCols,
        composition.cellOverrides,
        motif.id
      );

      const cellOffset = composition.cellRotations?.[cellKey] ?? 0;
      const cellRot = ((baseRotation ?? 0) + cellOffset) % 360;

      let content: string;
      if (!cellMotifId) {
        content = generatePlainTileSvgInner(motif, customization, cellRot);
      } else {
        content = getSvgInnerForMotif(cellMotifId, cellRot);
      }

      instances.push(`
    <g transform="translate(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})">
      ${content}
    </g>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${roomW}" height="${roomH}" viewBox="0 0 ${roomW} ${roomH}">
  <g transform="scale(${scaleFactor.toFixed(5)})">
    ${instances.join('\n')}
  </g>
</svg>`.trim();
}



/**
 * Renders pattern onto canvas with perspective/3D slice projection matching the CSS viewer 1:1
 */
function drawPatternWithPerspective(
  ctx: CanvasRenderingContext2D,
  patternImg: HTMLImageElement,
  targetW: number,
  targetH: number,
  config?: PerspectiveTransformConfig,
  viewerW?: number
) {
  if (!config) {
    ctx.drawImage(patternImg, 0, 0, targetW, targetH);
    return;
  }

  const imgW = patternImg.naturalWidth || patternImg.width || targetW;
  const imgH = patternImg.naturalHeight || patternImg.height || targetH;

  // Scale camera perspective distance proportionally to match the interactive viewer's camera distance ratio (d / width)
  const refW = viewerW && viewerW > 100 ? viewerW : 1080;
  const viewScale = targetW / refW;
  const d = (config.perspective ?? 1500) * viewScale;

  const originXPercent = parseFloat(config.originX ?? '50') / 100;
  const originYPercent = parseFloat(config.originY ?? '50') / 100;
  const x0 = targetW * originXPercent;
  const y0 = targetH * originYPercent;

  const rotX = (config.rotateX ?? 0) * (Math.PI / 180);
  const rotY = (config.rotateY ?? 0) * (Math.PI / 180);
  const rotZ = (config.rotateZ ?? 0) * (Math.PI / 180);
  const skewY = (config.skewY ?? 0) * (Math.PI / 180);
  const overallScale = config.scale ?? 1.0;
  const sxComp = (config.scaleX ?? 1.0) * overallScale;
  const syComp = (config.scaleY ?? 1.0) * overallScale;
  const offX = ((config.offsetX ?? 0) / 100) * targetW;
  const offY = ((config.offsetY ?? 0) / 100) * targetH;

  // 1. Pure affine 2D transform (no 3D rotation)
  if (!config.rotateY && !config.rotateX && !config.perspective) {
    ctx.save();
    ctx.translate(x0, y0);
    if (config.rotateZ) ctx.rotate(rotZ);
    if (config.skewY) ctx.transform(1, Math.tan(skewY), 0, 1, 0, 0);
    ctx.scale(sxComp, syComp);
    ctx.translate(offX, offY);
    ctx.drawImage(patternImg, 0, 0, imgW, imgH, -x0, -y0, targetW, targetH);
    ctx.restore();
    return;
  }

  // 2. 3D horizontal strip projection for floor / pitch (rotateX)
  if (Math.abs(config.rotateX ?? 0) > 0.05) {
    // Number of horizontal slices: adaptive for smooth continuity in 2K and 4K without performance bottlenecks
    const numSlices = Math.min(1800, Math.max(900, Math.round(targetH * 0.5)));
    const deltaY = targetH / numSlices;

    // Helper functions matching CSS 3D transform pipeline exactly
    const getProjY = (y: number): number => {
      const ry = y - y0 + offY;
      const yLocal = ry * syComp;
      const z = yLocal * Math.sin(rotX);
      const s = d / Math.max(0.1, d - z);
      return y0 + (yLocal * Math.cos(rotX)) * s;
    };

    const getScale = (y: number): number => {
      const ry = y - y0 + offY;
      const yLocal = ry * syComp;
      const z = yLocal * Math.sin(rotX);
      return d / Math.max(0.1, d - z);
    };

    ctx.save();
    for (let i = 0; i < numSlices; i++) {
      const yA = i * deltaY;
      const yB = Math.min(targetH, (i + 1) * deltaY);
      const yMid = (yA + yB) / 2;

      const yProjA = getProjY(yA);
      const yProjB = getProjY(yB);

      const sMid = getScale(yMid);
      if (sMid <= 0 || sMid > 30) continue;

      // Slice destination geometry: exact contiguous bounds with 0.65px subpixel overlap to prevent seams
      const yDst = yProjA;
      const sliceDstH = Math.max(0.5, (yProjB - yProjA) + 0.65);

      // Center and width of slice honoring originX, in-plane offX and scaleX
      const xDst = x0 + (-x0 + offX) * sxComp * sMid;
      const sliceDstW = targetW * sxComp * sMid;

      // Source rectangle normalized to patternImg native size
      const sy = (yA / targetH) * imgH;
      const sh = ((yB - yA) / targetH) * imgH;

      ctx.drawImage(
        patternImg,
        0, sy, imgW, sh,
        xDst, yDst, sliceDstW, sliceDstH
      );
    }
    ctx.restore();
    return;
  }

  // 3. 3D vertical strip projection for wall perspective (rotateY)
  const numSlices = Math.min(1800, Math.max(900, Math.round(targetW * 0.5)));
  const deltaX = targetW / numSlices;

  const getProjX = (x: number): number => {
    const rx = x - x0 + offX;
    const xLocal = rx * sxComp;
    const z = -xLocal * Math.sin(rotY);
    const s = d / Math.max(0.1, d - z);
    return x0 + (xLocal * Math.cos(rotY)) * s;
  };

  const getScaleX = (x: number): number => {
    const rx = x - x0 + offX;
    const xLocal = rx * sxComp;
    const z = -xLocal * Math.sin(rotY);
    return d / Math.max(0.1, d - z);
  };

  const tanSkew = Math.tan(skewY);

  ctx.save();
  for (let i = 0; i < numSlices; i++) {
    const xA = i * deltaX;
    const xB = Math.min(targetW, (i + 1) * deltaX);
    const xMid = (xA + xB) / 2;

    const xProjA = getProjX(xA);
    const xProjB = getProjX(xB);

    const sMid = getScaleX(xMid);
    if (sMid <= 0 || sMid > 30) continue;

    const xDst = xProjA;
    const sliceDstW = Math.max(0.5, (xProjB - xProjA) + 0.65);

    // In CSS: y3 = (y - y0 + offY) * syComp + (x - x0 + offX) * sxComp * tan(skewY)
    const rxMid = xMid - x0 + offX;
    const skewShift = rxMid * sxComp * tanSkew;
    const yTopLocal = (-y0 + offY) * syComp + skewShift;
    const yDstTop = y0 + yTopLocal * sMid;
    const sliceDstH = targetH * syComp * sMid;

    // Source rectangle normalized to patternImg native size
    const sx = (xA / targetW) * imgW;
    const sw = ((xB - xA) / targetW) * imgW;

    ctx.drawImage(
      patternImg,
      sx, 0, sw, imgH,
      xDst, yDstTop, sliceDstW, sliceDstH
    );
  }
  ctx.restore();
}

/**
 * Render Room Simulation combined with the Mosaic Pattern and export in high-res / 4K
 */
export async function exportSimulationAsPng(
  roomImageUrl: string,
  svgPatternString: string,
  polygonPoints: [number, number][],
  scale = 1.0,
  blendMode: 'multiply' | 'normal' = 'multiply',
  fileName = 'Hisbalit_Simulacion_Espacio_4K.png',
  resolution: '4k' | '2k' = '4k',
  isForegroundOverlay = false,
  opacity = 1,
  perspectiveTransform?: PerspectiveTransformConfig,
  viewerWidth?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const roomImg = new Image();
    roomImg.crossOrigin = 'anonymous';

    roomImg.onload = () => {
      const patternImg = new Image();
      const svgBlob = new Blob([svgPatternString], { type: 'image/svg+xml;charset=utf-8' });
      const patternUrl = URL.createObjectURL(svgBlob);

      patternImg.onload = () => {
        const targetW = resolution === '4k' ? 3840 : 1920;
        const roomNatW = roomImg.naturalWidth || roomImg.width || targetW;
        const roomNatH = roomImg.naturalHeight || roomImg.height || Math.round(targetW / (16 / 9));
        const aspect = roomNatW / roomNatH;
        const targetH = Math.round(targetW / aspect);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(patternUrl);
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Helper to construct outer surface
        const buildSurfacePath = () => {
          ctx.beginPath();
          polygonPoints.forEach(([px, py], idx) => {
            const x = (px / 100) * targetW;
            const y = (py / 100) * targetH;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.clip();
        };

        if (isForegroundOverlay) {
          // 1. Draw warm base wall background
          ctx.fillStyle = '#FAF8F5';
          ctx.fillRect(0, 0, targetW, targetH);

          // 2. Render continuous mosaic surface with exact perspective and offsets in the wall polygon area
          ctx.save();
          buildSurfacePath();
          ctx.globalAlpha = opacity;
          drawPatternWithPerspective(ctx, patternImg, targetW, targetH, perspectiveTransform, viewerWidth);

          // Subtle ambient softening overlay matching interactive viewer
          ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.restore();

          // 3. Draw foreground room image with transparent wall cutout and realistic shadows on top!
          ctx.drawImage(roomImg, 0, 0, targetW, targetH);
        } else {
          // 1. Draw original room photo in high resolution
          ctx.drawImage(roomImg, 0, 0, targetW, targetH);

          // 2. Setup polygon clipping region with foreground object holes
          ctx.save();
          buildSurfacePath();

          // 3. Apply realistic blend mode and render mosaic pattern with perspective/offsets
          ctx.globalCompositeOperation = blendMode === 'multiply' ? 'multiply' : 'source-over';
          ctx.globalAlpha = opacity;
          drawPatternWithPerspective(ctx, patternImg, targetW, targetH, perspectiveTransform, viewerWidth);

          // Subtle ambient softening overlay matching interactive viewer
          ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.restore();

          // Optional subtle lighting overlay if multiply
          if (blendMode === 'multiply') {
            ctx.save();
            buildSurfacePath();
            ctx.globalCompositeOperation = 'soft-light';
            ctx.drawImage(roomImg, 0, 0, targetW, targetH);
            ctx.restore();
          }
        }

        // Export result
        canvas.toBlob(blob => {
          URL.revokeObjectURL(patternUrl);
          if (!blob) {
            reject(new Error('Failed to create simulation blob'));
            return;
          }
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          resolve();
        }, 'image/png');
      };

      patternImg.onerror = (e) => {
        URL.revokeObjectURL(patternUrl);
        reject(e);
      };

      patternImg.src = patternUrl;
    };

    roomImg.onerror = (e) => reject(e);
    roomImg.src = roomImageUrl;
  });
}
