import { 
  RegionState, 
  GameEvent, 
  Country, 
  Theater, 
  ArmyGroup, 
  Mission, 
  MissionCondition,
  CountryId,
  Adjacency,
  Relationship,
} from '../../types/game';
import { detectTheaters } from '../../utils/theaterDetection';

interface MissionEvaluationState {
  regions: RegionState;
  dateTime: Date;
  gameEvents: GameEvent[];
  selectedCountry?: Country | null;
  countryId?: CountryId;
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  adjacency?: Adjacency;
  relationships?: Relationship[];
}

function getMissionCountryId(state: MissionEvaluationState): CountryId | null {
  return state.countryId ?? state.selectedCountry?.id ?? null;
}

/**
 * Evaluates a single mission condition against the current game state
 * @returns true if the condition is met, false otherwise
 */
export function evaluateMissionCondition(
  condition: MissionCondition,
  state: MissionEvaluationState
): boolean {
  const { regions, dateTime, gameEvents, theaters, armyGroups } = state;
  const missionCountry = getMissionCountryId(state);
  if (!missionCountry) return false;

  switch (condition.type) {
    case 'controlRegion': {
      const region = regions[condition.regionId];
      return region?.owner === missionCountry;
    }
    
    case 'controlRegions': {
      return condition.regionIds.every(regionId => {
        const region = regions[regionId];
        return region?.owner === missionCountry;
      });
    }
    
    case 'controlRegionCount': {
      const controlledCount = Object.values(regions).filter(
        region => region.owner === missionCountry
      ).length;
      return controlledCount >= condition.count;
    }
    
    case 'hasUnits': {
      const totalUnits = Object.values(regions).reduce((acc, region) => {
        if (region.owner === missionCountry) {
          return acc + region.divisions.filter(d => d.owner === missionCountry).length;
        }
        return acc;
      }, 0);
      return totalUnits >= condition.count;
    }
    
    case 'dateAfter': {
      const targetDate = new Date(condition.date);
      return dateTime >= targetDate;
    }
    
    case 'combatVictories': {
      const victories = gameEvents.filter(
        event => event.type === 'combat_victory' && event.country === missionCountry
      ).length;
      return victories >= condition.count;
    }
    
    case 'enemyRegionCount': {
      const enemyCount = Object.values(regions).filter(
        region => region.owner === condition.country
      ).length;
      return enemyCount <= condition.maxCount;
    }
    
    case 'allRegionsControlled': {
      const countryRegions = condition.regionIds.map(id => regions[id]).filter(Boolean);
      return countryRegions.length > 0 && countryRegions.every(
        region => region.owner === missionCountry
      );
    }
    
    case 'theaterExists': {
      const existingTheater = theaters.some(
        theater => theater.owner === missionCountry && theater.enemyCountry === condition.enemyCountry
      );
      if (existingTheater) return true;
      if (!state.adjacency) return false;

      return detectTheaters(
        regions,
        state.adjacency,
        missionCountry,
        [],
        state.relationships ?? []
      ).some(theater => theater.enemyCountry === condition.enemyCountry);
    }
    
    case 'armyGroupCount': {
      const countryArmyGroups = armyGroups.filter(g => g.owner === missionCountry);
      return countryArmyGroups.length >= condition.count;
    }

    case 'controlRegionByOverlord': {
      const region = regions[condition.regionId];
      if (!region) return false;
      if (region.owner === missionCountry) return true;
      const puppets = (state.relationships ?? [])
        .filter(r => r.fromCountry === missionCountry && r.type === 'autonomy')
        .map(r => r.toCountry);
      return puppets.includes(region.owner);
    }

    default:
      console.warn('Unknown mission condition type:', condition);
      return false;
  }
}

/**
 * Checks if all conditions for a mission are met (AND logic)
 * @returns true if all conditions are met or no conditions exist
 */
export function areMissionConditionsMet(
  mission: Mission,
  state: MissionEvaluationState
): boolean {
  // If no conditions, mission is always available
  if (!mission.available || mission.available.length === 0) {
    return true;
  }
  
  // All conditions must be met (AND logic)
  return mission.available.every(condition => 
    evaluateMissionCondition(condition, state)
  );
}
