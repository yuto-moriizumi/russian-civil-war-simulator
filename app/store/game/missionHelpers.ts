import { 
  RegionState, 
  GameEvent, 
  Country, 
  Theater, 
  ArmyGroup, 
  Mission, 
  MissionCondition 
} from '../../types/game';

/**
 * Evaluates a single mission condition against the current game state
 * @returns true if the condition is met, false otherwise
 */
export function evaluateMissionCondition(
  condition: MissionCondition,
  state: {
    regions: RegionState;
    money: number;
    dateTime: Date;
    gameEvents: GameEvent[];
    selectedCountry: Country;
    theaters: Theater[];
    armyGroups: ArmyGroup[];
  }
): boolean {
  const { regions, money, dateTime, gameEvents, selectedCountry, theaters, armyGroups } = state;
  const playerFaction = selectedCountry.id;

  switch (condition.type) {
    case 'controlRegion': {
      const region = regions[condition.regionId];
      return region?.owner === playerFaction;
    }
    
    case 'controlRegions': {
      return condition.regionIds.every(regionId => {
        const region = regions[regionId];
        return region?.owner === playerFaction;
      });
    }
    
    case 'controlRegionCount': {
      const controlledCount = Object.values(regions).filter(
        region => region.owner === playerFaction
      ).length;
      return controlledCount >= condition.count;
    }
    
    case 'hasUnits': {
      const totalUnits = Object.values(regions).reduce((acc, region) => {
        if (region.owner === playerFaction) {
          return acc + region.divisions.filter(d => d.owner === playerFaction).length;
        }
        return acc;
      }, 0);
      return totalUnits >= condition.count;
    }
    
    case 'hasMoney': {
      return money >= condition.amount;
    }
    
    case 'dateAfter': {
      const targetDate = new Date(condition.date);
      return dateTime >= targetDate;
    }
    
    case 'combatVictories': {
      const victories = gameEvents.filter(
        event => event.type === 'combat_victory' && event.faction === playerFaction
      ).length;
      return victories >= condition.count;
    }
    
    case 'enemyRegionCount': {
      const enemyCount = Object.values(regions).filter(
        region => region.owner === condition.faction
      ).length;
      return enemyCount <= condition.maxCount;
    }
    
    case 'allRegionsControlled': {
      const countryRegions = Object.values(regions).filter(
        region => region.countryIso3 === condition.countryIso3
      );
      return countryRegions.length > 0 && countryRegions.every(
        region => region.owner === playerFaction
      );
    }
    
    case 'theaterExists': {
      return theaters.some(
        theater => theater.owner === playerFaction && theater.enemyFaction === condition.enemyFaction
      );
    }
    
    case 'armyGroupCount': {
      const playerArmyGroups = armyGroups.filter(g => g.owner === playerFaction);
      return playerArmyGroups.length >= condition.count;
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
  state: {
    regions: RegionState;
    money: number;
    dateTime: Date;
    gameEvents: GameEvent[];
    selectedCountry: Country;
    theaters: Theater[];
    armyGroups: ArmyGroup[];
  }
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
