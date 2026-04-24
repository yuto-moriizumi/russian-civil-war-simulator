import { Mission, MissionCondition } from '../types/game';
import { getCountryName } from '../data/countries';
import { initialMissions } from '../data/gameData';

/**
 * Formats a mission condition into a human-readable string.
 */
export function formatCondition(condition: MissionCondition): string {
  switch (condition.type) {
    case 'controlRegions':
      return `Control regions: ${condition.regionIds.join(', ')}`;
    case 'controlRegionCount':
      return `Control at least ${condition.count} regions`;
    case 'controlCoreRegionCountByOverlord':
      return `Control at least ${condition.count} core regions of ${getCountryName(condition.country)} directly or by puppet`;
    case 'hasUnits':
      return `Have at least ${condition.count} divisions`;
    case 'dateAfter':
      return `Current date is after ${condition.date.replace(/-/g, '/')}`;
    case 'combatVictories':
      return `Win at least ${condition.count} combats`;
    case 'enemyRegionCount':
      return `${getCountryName(condition.country)} controls at most ${condition.maxCount} regions`;
    case 'allRegionsControlled':
      return `Control all ${condition.regionIds.length} assigned regions`;
    case 'theaterExists':
      return `Have at least one theater facing ${getCountryName(condition.enemyCountry)}`;
    case 'armyGroupCount':
      return `Have at least ${condition.count} army groups`;
    case 'controlRegion':
      return `Control region: ${condition.regionId}`;
    case 'controlRegionByOverlord':
      return `Control region directly or by puppet: ${condition.regionId}`;
    default:
      return 'Unknown condition';
  }
}

/**
 * Merges current missions with initial missions, keeping any
 * state changes (progress, claimed) while filling in defaults from initialMissions.
 */
export function mergeMissionsWithInitial(currentMissions: Mission[]): Mission[] {
  const currentById = new Map(currentMissions.map(mission => [mission.id, mission]));
  return initialMissions.map(initialMission => currentById.get(initialMission.id) ?? { ...initialMission });
}
