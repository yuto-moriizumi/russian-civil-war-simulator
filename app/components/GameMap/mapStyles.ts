import type { RegionState, FactionId, MapMode } from '../../types/game';
import { FACTION_COLORS } from '../../utils/mapUtils';

// Colors for diplomacy map mode
const DIPLOMACY_COLORS = {
  player: '#3B82F6',      // Blue - Your country
  autonomy: '#10B981',    // Green - Autonomy/allied countries
  enemy: '#EF4444',       // Red - Enemy countries
  neutral: '#9CA3AF',     // Gray - Neutral countries
};

/**
 * Build color expression for region fill based on ownership (country map mode)
 */
export function createFillColorExpression(regions: RegionState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expression: any[] = ['match', ['get', 'shapeISO']];
  
  for (const [id, region] of Object.entries(regions)) {
    expression.push(id, FACTION_COLORS[region.owner]);
  }
  
  // Default color for unmatched regions
  expression.push(FACTION_COLORS.neutral);
  
  return expression;
}

/**
 * Build color expression for region fill based on diplomatic relationships (diplomacy map mode)
 */
export function createDiplomacyFillColorExpression(
  regions: RegionState,
  playerFaction: FactionId,
  getRelationship: (from: FactionId, to: FactionId) => string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expression: any[] = ['match', ['get', 'shapeISO']];
  
  for (const [id, region] of Object.entries(regions)) {
    const owner = region.owner;
    let color: string;
    
    if (owner === playerFaction) {
      // Your country
      color = DIPLOMACY_COLORS.player;
    } else if (owner === 'neutral' || owner === 'foreign') {
      // Neutral territories
      color = DIPLOMACY_COLORS.neutral;
    } else {
      // Check relationship (check both directions for mutual status like war or hierarchical like autonomy)
      const relForward = getRelationship(playerFaction, owner);
      const relBackward = getRelationship(owner, playerFaction);
      
      if (relForward === 'autonomy' || relBackward === 'autonomy') {
        color = DIPLOMACY_COLORS.autonomy;
      } else if (relForward === 'war' || relBackward === 'war') {
        color = DIPLOMACY_COLORS.enemy;
      } else {
        // neutral or military_access
        color = DIPLOMACY_COLORS.neutral;
      }
    }
    
    expression.push(id, color);
  }
  
  // Default color for unmatched regions
  expression.push(DIPLOMACY_COLORS.neutral);
  
  return expression;
}

/**
 * Build color expression for region fill based on command power (value map mode)
 * Uses a gradient from dark to bright based on the region's value (command power)
 */
export function createValueFillColorExpression(regions: RegionState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expression: any[] = ['match', ['get', 'shapeISO']];
  
  // Find min and max values for normalization
  const values = Object.values(regions).map(r => r.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  // Define color gradient: dark blue to bright yellow
  // Low value = dark blue (#1e3a8a)
  // High value = bright yellow (#fbbf24)
  const interpolateColor = (normalizedValue: number): string => {
    // normalizedValue is 0-1, representing position in gradient
    // Use a multi-stop gradient for better visualization
    if (normalizedValue <= 0.25) {
      // Dark blue to medium blue
      const t = normalizedValue / 0.25;
      return rgbToHex(
        Math.round(30 + (59 - 30) * t),    // R: 30 -> 59
        Math.round(58 + (130 - 58) * t),   // G: 58 -> 130
        Math.round(138 + (246 - 138) * t)  // B: 138 -> 246
      );
    } else if (normalizedValue <= 0.5) {
      // Medium blue to cyan
      const t = (normalizedValue - 0.25) / 0.25;
      return rgbToHex(
        Math.round(59 + (34 - 59) * t),    // R: 59 -> 34
        Math.round(130 + (211 - 130) * t), // G: 130 -> 211
        Math.round(246 + (238 - 246) * t)  // B: 246 -> 238
      );
    } else if (normalizedValue <= 0.75) {
      // Cyan to orange
      const t = (normalizedValue - 0.5) / 0.25;
      return rgbToHex(
        Math.round(34 + (251 - 34) * t),   // R: 34 -> 251
        Math.round(211 + (146 - 211) * t), // G: 211 -> 146
        Math.round(238 + (60 - 238) * t)   // B: 238 -> 60
      );
    } else {
      // Orange to bright yellow
      const t = (normalizedValue - 0.75) / 0.25;
      return rgbToHex(
        Math.round(251 + (251 - 251) * t), // R: 251 -> 251
        Math.round(146 + (191 - 146) * t), // G: 146 -> 191
        Math.round(60 + (36 - 60) * t)     // B: 60 -> 36
      );
    }
  };
  
  for (const [id, region] of Object.entries(regions)) {
    const normalized = range > 0 ? (region.value - minValue) / range : 0.5;
    const color = interpolateColor(normalized);
    expression.push(id, color);
  }
  
  // Default color for unmatched regions
  expression.push('#808080');
  
  return expression;
}

/**
 * Helper function to convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Build the appropriate fill color expression based on map mode
 */
export function createMapModeFillColorExpression(
  mapMode: MapMode,
  regions: RegionState,
  playerFaction: FactionId | undefined,
  getRelationship: (from: FactionId, to: FactionId) => string
) {
  if (mapMode === 'diplomacy' && playerFaction) {
    return createDiplomacyFillColorExpression(regions, playerFaction, getRelationship);
  }
  
  if (mapMode === 'value') {
    return createValueFillColorExpression(regions);
  }
  
  // Default to country map mode
  return createFillColorExpression(regions);
}

/**
 * Build line color expression using feature-state
 */
export function createLineColorExpression() {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    '#FFD700',
    ['boolean', ['feature-state', 'theaterFrontline'], false],
    '#FF6B35',
    ['boolean', ['feature-state', 'hover'], false],
    '#FFFFFF',
    '#333333'
  ];
}

/**
 * Build line width expression using feature-state
 */
export function createLineWidthExpression() {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    3,
    ['boolean', ['feature-state', 'theaterFrontline'], false],
    3,
    ['boolean', ['feature-state', 'hover'], false],
    2,
    1
  ];
}

/**
 * Build opacity expression for fill using feature-state for performance
 */
export function createFillOpacityExpression() {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    0.95,
    ['boolean', ['feature-state', 'hover'], false],
    0.9,
    ['boolean', ['feature-state', 'adjacent'], false],
    0.85,
    0.8
  ];
}

/**
 * Create fill paint properties for the map
 */
export function createFillPaint(
  fillColorExpression: unknown,
  fillOpacityExpression: unknown
) {
  return {
    'fill-color': fillColorExpression,
    'fill-opacity': fillOpacityExpression,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/**
 * Create line paint properties for the map
 */
export function createLinePaint(
  lineColorExpression: unknown,
  lineWidthExpression: unknown
) {
  return {
    'line-color': lineColorExpression,
    'line-width': lineWidthExpression,
    'line-dasharray': [
      'case',
      ['boolean', ['feature-state', 'theaterFrontline'], false],
      ['literal', [4, 2]],
      ['literal', [1, 0]]
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/**
 * Create the base map style object
 */
export function createMapStyle() {
  return {
    version: 8 as const,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background' as const,
        paint: {
          'background-color': '#808080',
        },
      },
    ],
  };
}
