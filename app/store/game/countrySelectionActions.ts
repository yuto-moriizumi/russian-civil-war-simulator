import { Country, CountryId, RegionState, Relationship } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { buildSelectCountryPatch } from './services/selectCountry';

const DEFAULT_AI_COUNTRIES: CountryId[] = [
  'soviet',
  'white',
  'finland',
  'ukraine',
  'don',
  'fswr',
  'iskolat',
  'germany',
  'bulgaria',
  'poland',
  'austriahungary',
  'romania',
  'ottoman',
  'serbia',
];

export function getAIControlledCountries(
  playerCountryId: CountryId,
  regions: RegionState,
  productionQueues: ActionsState['productionQueues'],
  relationships: Relationship[],
): CountryId[] {
  const countryIds = new Set<CountryId>(DEFAULT_AI_COUNTRIES);

  Object.values(regions).forEach(region => {
    countryIds.add(region.owner);
  });

  Object.entries(productionQueues).forEach(([countryId, queue]) => {
    if (queue.length > 0) {
      countryIds.add(countryId as CountryId);
    }
  });

  relationships.forEach(relationship => {
    if (relationship.type === 'autonomy') {
      countryIds.add(relationship.toCountry);
    }
  });

  countryIds.delete(playerCountryId);
  countryIds.delete('neutral');
  countryIds.delete('foreign');

  return Array.from(countryIds);
}

export const createCountrySelectionActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState'],
) => ({
  selectCountry: (country: Country, isInitial = false) => {
    const currentState = get();
    const aiCountries = getAIControlledCountries(
      country.id,
      currentState.regions,
      currentState.productionQueues,
      currentState.relationships,
    );
    set(buildSelectCountryPatch(currentState, country, isInitial, aiCountries));
  },
});
