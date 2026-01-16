import { MissionCondition, CountryId } from '../types/game';
import { getCountryName } from '../config/countries';

/**
 * Formats a mission condition into a human-readable string.
 */
export function formatCondition(condition: MissionCondition): string {
  switch (condition.type) {
    case 'controlRegions':
      return `Control regions: ${condition.regionIds.join(', ')}`;
    case 'controlRegionCount':
      return `Control at least ${condition.count} regions`;
    case 'hasUnits':
      return `Have at least ${condition.count} divisions`;
    case 'dateAfter':
      return `Current date is after ${condition.date.replace(/-/g, '/')}`;
    case 'combatVictories':
      return `Win at least ${condition.count} combats`;
    case 'enemyRegionCount':
      return `${getCountryName(condition.country)} controls at most ${condition.maxCount} regions`;
    case 'allRegionsControlled':
      return `Control all regions in ${condition.countryIso3}`;
    case 'theaterExists':
      return `Have at least one theater facing ${getCountryName(condition.enemyCountry)}`;
    case 'armyGroupCount':
      return `Have at least ${condition.count} army groups`;
    case 'controlRegion':
      return `Control region: ${condition.regionId}`;
    default:
      return 'Unknown condition';
  }
}
