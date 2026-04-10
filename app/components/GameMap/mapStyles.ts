import type { RegionState, CountryId, MapMode } from '../../types/game';
import { COUNTRY_COLORS } from '../../utils/mapUtils';

// Colors for diplomacy map mode
const DIPLOMACY_COLORS = {
  player: '#3B82F6',      // Blue - Your country
  autonomy: '#10B981',    // Green - Autonomy/allied countries
  enemy: '#EF4444',       // Red - Enemy countries
  neutral: '#9CA3AF',     // Gray - Neutral countries
};

/**
 * Helper to get the consistent region ID expression used for matching.
 * Logic matches createInitialOwnership in mapUtils.ts
 */
function getRegionIdExpression() {
  return ['id'];
}

/**
 * Build color expression for region fill based on ownership (country map mode)
 */
export function createFillColorExpression(regions: RegionState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expression: any[] = ['match', getRegionIdExpression()];
  
  for (const [id, region] of Object.entries(regions)) {
    expression.push(id, COUNTRY_COLORS[region.owner]);
  }
  
  // Default color for unmatched regions
  expression.push(COUNTRY_COLORS.neutral);
  
  return expression;
}

/**
 * Build color expression for region fill based on diplomatic relationships (diplomacy map mode)
 */
export function createDiplomacyFillColorExpression(
  regions: RegionState,
  playerCountry: CountryId,
  getRelationship: (from: CountryId, to: CountryId) => string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expression: any[] = ['match', getRegionIdExpression()];
  
  for (const [id, region] of Object.entries(regions)) {
    const owner = region.owner;
    let color: string;
    
    if (owner === playerCountry) {
      // Your country
      color = DIPLOMACY_COLORS.player;
    } else if (owner === 'neutral' || owner === 'foreign') {
      // Neutral territories
      color = DIPLOMACY_COLORS.neutral;
    } else {
      // Check relationship (check both directions for mutual status like war or hierarchical like autonomy)
      const relForward = getRelationship(playerCountry, owner);
      const relBackward = getRelationship(owner, playerCountry);
      
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

// Fixed colors per value level (matches MapToolCanvas heat-map)
const VALUE_COLORS: Record<number, string> = {
  1: '#1a3a5c',
  2: '#2e6da4',
  3: '#f0a500',
  4: '#e06000',
  5: '#c00000',
};

/**
 * Build color expression for region fill based on income value (value map mode)
 * Uses fixed discrete colors per value level (1–5) to match the map-tool heat-map.
 */
export function createValueFillColorExpression(regions: RegionState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expression: any[] = ['match', getRegionIdExpression()];

  for (const [id, region] of Object.entries(regions)) {
    const clamped = Math.min(Math.max(region.value, 1), 5);
    expression.push(id, VALUE_COLORS[clamped] ?? '#8b0000');
  }

  // Default color for unmatched regions
  expression.push('#808080');

  return expression;
}


/**
 * Build the appropriate fill color expression based on map mode
 */
export function createMapModeFillColorExpression(
  mapMode: MapMode,
  regions: RegionState,
  playerCountry: CountryId | undefined,
  _playerCoreRegions: string[] | undefined,
  getRelationship: (from: CountryId, to: CountryId) => string
) {
  if (mapMode === 'diplomacy' && playerCountry) {
    return createDiplomacyFillColorExpression(regions, playerCountry, getRelationship);
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
