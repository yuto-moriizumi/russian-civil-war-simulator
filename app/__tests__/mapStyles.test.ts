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
  it('colors regions based on their income value', () => {
    const regions: RegionState = {
      'UA-01': { ...makeRegion('UA-01', 'soviet'), value: 1 },
      'RU-AD': { ...makeRegion('RU-AD', 'soviet'), value: 3 },
      'UA-30': { ...makeRegion('UA-30', 'soviet'), value: 5 },
    };

    const expression = createValueFillColorExpression(regions) as unknown[];

    const lowColor = getRegionColor(expression, 'UA-01');
    const midColor = getRegionColor(expression, 'RU-AD');
    const highColor = getRegionColor(expression, 'UA-30');

    // Low value should be darkest (smallest red component)
    // High value should be brightest (largest red component)
    expect(lowColor).not.toBe(highColor);
    expect(lowColor).not.toBe(midColor);
    expect(midColor).not.toBe(highColor);
  });
});
