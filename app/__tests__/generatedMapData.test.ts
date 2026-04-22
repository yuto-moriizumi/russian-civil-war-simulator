import { describe, expect, it } from 'vitest';
import {
  buildGeneratedOwnershipData,
  buildGeneratedRegionValuesData,
  buildGeneratedUnitPlacementData,
  countPlacedDivisions,
} from '../data/map/generatedDataUtils';
import type { ArmyGroupDef, UnitPlacementData } from '../data/map/generatedTypes';
import type { CountryId } from '../types/game';

describe('generated map data helpers', () => {
  it('preserves existing notes and sorts ownership keys', () => {
    const data = buildGeneratedOwnershipData(
      {
        'RU-MOW': 'soviet' as CountryId,
        'UA-30': 'ukraine' as CountryId,
      },
      {
        file: 'Human-facing ownership note.',
        regions: {
          'UA-30': 'Kyiv note',
          'RU-MOW': 'Moscow note',
        },
      }
    );

    expect(Object.keys(data.ownership)).toEqual(['RU-MOW', 'UA-30']);
    expect(data.notes).toEqual({
      file: 'Human-facing ownership note.',
      regions: {
        'RU-MOW': 'Moscow note',
        'UA-30': 'Kyiv note',
      },
    });
  });

  it('lets explicit notes replace previous notes for unit placement', () => {
    const placement: UnitPlacementData = {
      'RU-MOW': [
        { owner: 'soviet' as CountryId, armyGroupName: 'Red Army Group', count: 2 },
      ],
      'RU-NIZ': [],
    };
    const armyGroupDefs: Record<CountryId, ArmyGroupDef[]> = {
      soviet: [{ name: 'Red Army Group', color: '#CC0000' }],
    } as Record<CountryId, ArmyGroupDef[]>;

    const data = buildGeneratedUnitPlacementData(
      placement,
      armyGroupDefs,
      { file: 'old note' },
      { file: 'new note' }
    );

    expect(Object.keys(data.placement)).toEqual(['RU-MOW']);
    expect(data.notes).toEqual({ file: 'new note' });
    expect(countPlacedDivisions(data.placement)).toBe(2);
  });

  it('stores only non-default region values while preserving notes', () => {
    const data = buildGeneratedRegionValuesData(
      {
        'RU-MOW': 3,
        'RU-TVE': 1,
        'UA-30': 2,
      },
      {
        file: 'Region value notes.',
        regions: {
          'UA-30': 'Kyiv note',
        },
      }
    );

    expect(data.values).toEqual({
      'RU-MOW': 3,
      'UA-30': 2,
    });
    expect(data.notes).toEqual({
      file: 'Region value notes.',
      regions: {
        'UA-30': 'Kyiv note',
      },
    });
  });
});
