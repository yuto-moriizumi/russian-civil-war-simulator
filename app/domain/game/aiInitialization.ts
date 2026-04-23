import { AIState, ArmyGroup, CountryId, RegionState } from '../../types/game';
import { getFirstArmyGroupName } from '../../data/countries';

export function createInitialAIState(countryId: CountryId): AIState {
  return {
    countryId,
  };
}

export function createInitialAIArmyGroup(countryId: CountryId, regions: RegionState): ArmyGroup {
  const ownedRegionIds = Object.values(regions)
    .filter(region => region.owner === countryId)
    .map(r => r.id);

  const name = getFirstArmyGroupName(countryId);

  return {
    id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    regionIds: ownedRegionIds,
    color: '#6B7280',
    owner: countryId,
    theaterId: null,
    mode: 'advance',
  };
}
