import { describe, expect, it } from 'vitest';

import { createValueFillColorExpression } from '../components/GameMap/mapStyles';
import type { Region, RegionState } from '../types/game';

function makeRegion(id: string, owner: Region['owner']): Region {
  return {
    id,
    name: id,
    countryIso3: 'TEST',
    owner,
    divisions: [],
    value: 1,
  };
}

function getRegionColor(expression: unknown[], regionId: string): string {
  const index = expression.indexOf(regionId);
  if (index === -1) {
    throw new Error(`Region ${regionId} not found in expression`);
  }

  return expression[index + 1] as string;
}

describe('createValueFillColorExpression', () => {
  it('colors a core +2 region differently from a regular +1 region', () => {
    const regions: RegionState = {
      'UA-01': makeRegion('UA-01', 'soviet'),
      'RU-AD': makeRegion('RU-AD', 'soviet'),
      'UA-30': makeRegion('UA-30', 'soviet'),
    };

    const expression = createValueFillColorExpression(regions, ['RU-AD']) as unknown[];

    expect(getRegionColor(expression, 'UA-01')).toBe('#1e3a8a');
    expect(getRegionColor(expression, 'RU-AD')).toBe('#22d3ee');
    expect(getRegionColor(expression, 'UA-30')).toBe('#fbbf24');
  });
});
