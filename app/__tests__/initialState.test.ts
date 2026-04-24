import { describe, expect, it } from 'vitest';
import { COUNTRY_METADATA } from '../data/countryMetadata';
import { initialGameState } from '../store/game/initialState';
import { getDiplomacyCountryIds } from '../utils/diplomacyDisplay';

describe('initial game state relationships', () => {
  it('does not start with an Ottoman-Greek war', () => {
    expect(initialGameState.relationships).not.toContainEqual({
      fromCountry: 'ottoman',
      toCountry: 'greece',
      type: 'war',
    });
  });

  it('includes the French Republic as an off-map diplomacy country', () => {
    expect(COUNTRY_METADATA.france).toMatchObject({
      id: 'france',
      name: 'French Republic',
      selectable: false,
      coreRegions: [],
    });
    expect(initialGameState.productionQueues.france).toEqual([]);
    expect(getDiplomacyCountryIds('soviet')).toContain('france');
  });
});
