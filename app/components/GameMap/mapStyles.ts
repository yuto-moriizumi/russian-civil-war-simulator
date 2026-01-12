import type { RegionState } from '../../types/game';
import { FACTION_COLORS } from '../../utils/mapUtils';

/**
 * Build color expression for region fill based on ownership
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
    0.9,
    ['boolean', ['feature-state', 'hover'], false],
    0.8,
    ['boolean', ['feature-state', 'adjacent'], false],
    0.7,
    0.6
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
          'background-color': '#1a2e1a',
        },
      },
    ],
  };
}
