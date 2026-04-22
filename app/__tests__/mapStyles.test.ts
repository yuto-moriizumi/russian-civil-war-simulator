import { describe, expect, it } from 'vitest';

import { createValueFillColorExpression } from '../components/GameMap/mapStyles';
import type { Region, RegionState } from '../types/game';

function makeRegion(id: string, owner: Region['owner']): Region {
  return {
    id,
    name: id,
    countryIso3: 'TEST',
    owner,
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
  it('colors regions based on CP contribution', () => {
    const regions: RegionState = {
      // Regular region: CP contribution = 1
      'UA-01': makeRegion('UA-01', 'soviet'),
      // Major city with +2 bonus (UA-30 = Kyiv): CP contribution = 3
      'UA-30': makeRegion('UA-30', 'soviet'),
      // Major city with +2 bonus and core region: CP contribution = 6
      'RU-MOW': makeRegion('RU-MOW', 'soviet'),
    };

    const coreRegions = ['RU-MOW'];
    const expression = createValueFillColorExpression(regions, coreRegions) as unknown[];

    const lowColor = getRegionColor(expression, 'UA-01');
    const midColor = getRegionColor(expression, 'UA-30');
    const highColor = getRegionColor(expression, 'RU-MOW');

    // Higher CP contribution should produce different (warmer) colors
    expect(lowColor).not.toBe(highColor);
    expect(lowColor).not.toBe(midColor);
    expect(midColor).not.toBe(highColor);
  });
});
