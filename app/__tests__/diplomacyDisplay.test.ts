import { describe, expect, it } from 'vitest';
import { initialGameState } from '../store/game/initialState';
import {
  getDiplomacyCountryIds,
  getNonNeutralRelationshipSummaries,
} from '../utils/diplomacyDisplay';

describe('diplomacy display helpers', () => {
  it('includes Germany and Poland as diplomacy countries for the Soviet player', () => {
    const countryIds = getDiplomacyCountryIds('soviet');

    expect(countryIds).toContain('germany');
    expect(countryIds).toContain('poland');
    expect(countryIds).not.toContain('neutral');
    expect(countryIds).not.toContain('foreign');
  });

  it('shows Poland as an autonomy servant of Germany in global relationships', () => {
    const summaries = getNonNeutralRelationshipSummaries(
      initialGameState.relationships,
      'poland'
    );
    const germanyRelationship = summaries.find(summary => summary.countryId === 'germany');

    expect(germanyRelationship).toEqual({
      countryId: 'germany',
      outwardRelation: 'neutral',
      inwardRelation: 'autonomy',
    });
  });
});
