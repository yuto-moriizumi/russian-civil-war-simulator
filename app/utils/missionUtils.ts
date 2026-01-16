import { MissionCondition, CountryId } from '../types/game';

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
      return `${formatCountryName(condition.country)} controls at most ${condition.maxCount} regions`;
    case 'allRegionsControlled':
      return `Control all regions in ${condition.countryIso3}`;
    case 'theaterExists':
      return `Have at least one theater facing ${formatCountryName(condition.enemyCountry)}`;
    case 'armyGroupCount':
      return `Have at least ${condition.count} army groups`;
    case 'controlRegion':
      return `Control region: ${condition.regionId}`;
    default:
      return 'Unknown condition';
  }
}

/**
 * Formats a country ID into a human-readable name.
 */
function formatCountryName(countryId: CountryId): string {
  switch (countryId) {
    case 'soviet':
      return 'Soviet Russia';
    case 'white':
      return 'White Army';
    case 'neutral':
      return 'Neutral forces';
    case 'foreign':
      return 'Foreign Intervention';
    default:
      return countryId;
  }
}
