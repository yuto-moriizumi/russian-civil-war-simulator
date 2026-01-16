import { AIState, CountryId, RegionState, Region, ActiveCombat, Movement, ArmyGroup, ProductionQueueItem, CountryBonuses } from '../types/game';
import { canProduceDivision } from '../utils/commandPower';
import { getFirstArmyGroupName, getDivisionPrefix } from '../data/countries';

/**
 * Creates initial AI state for a faction
 */
export function createInitialAIState(countryId: CountryId): AIState {
  return {
    countryId,
  };
}

/**
 * Creates initial AI army group for a faction
 */
export function createInitialAIArmyGroup(countryId: CountryId, regions: RegionState): ArmyGroup {
  const ownedRegions = getOwnedRegions(regions, countryId);
  const ownedRegionIds = ownedRegions.map(r => r.id);
  
  const name = getFirstArmyGroupName(countryId);
  
  return {
    id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    regionIds: ownedRegionIds,
    color: '#6B7280',
    owner: countryId,
    theaterId: null,
    mode: 'advance', // AI automatically advances toward enemies
  };
}

/**
 * Get all regions owned by a faction
 */
function getOwnedRegions(regions: RegionState, countryId: CountryId): Region[] {
  return Object.values(regions).filter(region => region.owner === countryId);
}

/**
 * Pick a random region from a list
 */
function pickRandomRegion(regionList: Region[]): Region | null {
  if (regionList.length === 0) return null;
  const index = Math.floor(Math.random() * regionList.length);
  return regionList[index];
}

/**
 * Generate a unique division name for the AI
 */
function generateAIDivisionName(countryId: CountryId, regions: RegionState, productionQueue: ProductionQueueItem[], offset: number = 0): string {
  const prefix = getDivisionPrefix(countryId);
  
  // Count existing divisions owned by this faction
  const existingCount = Object.values(regions).reduce((acc, region) => 
    acc + region.divisions.filter(d => d.owner === countryId).length, 0
  );
  
  // Count divisions in production for this faction
  const productionCount = productionQueue.filter(p => p.owner === countryId).length;
  
  const totalCount = existingCount + productionCount + offset;
  
  // Simple ordinal suffix
  const n = totalCount + 1;
  const suffix = (n % 10 === 1 && n % 100 !== 11) ? 'st' :
                 (n % 10 === 2 && n % 100 !== 12) ? 'nd' :
                 (n % 10 === 3 && n % 100 !== 13) ? 'rd' : 'th';
                 
  return `${prefix} ${n}${suffix} Division`;
}

/**
 * AI production request - describes a division to be added to the production queue
 */
export interface AIProductionRequest {
  divisionName: string;
  targetRegionId: string;
  armyGroupId: string;
}

/**
 * AI decision result - what actions the AI wants to take
 */
export interface AIActions {
  divisionsCreated: number;
  productionRequests: AIProductionRequest[];
  updatedAIState: AIState;
  newArmyGroup?: ArmyGroup; // New army group created by AI if needed
}

/**
 * Run AI logic for one tick (1 game hour)
 * - Earns income based on controlled regions (using region values/weights) minus unit maintenance costs
 * - Adds divisions to the production queue if it has enough money
 * 
 * @param armyGroups - All army groups in the game
 * @param countryBonuses - Country bonuses from completed missions
 * @param coreRegions - Optional list of core region IDs for this country
 */
export function runAITick(
  aiState: AIState,
  regions: RegionState,
  armyGroups: ArmyGroup[],
  activeCombats: ActiveCombat[] = [],
  movingUnits: Movement[] = [],
  productionQueue: ProductionQueueItem[] = [],
  productionQueues: Record<CountryId, ProductionQueueItem[]> = {} as Record<CountryId, ProductionQueueItem[]>,
  countryBonuses: CountryBonuses,
  coreRegions?: string[]
): AIActions {
  const { countryId } = aiState;
  
  // 1. Find or create an army group for the AI
  let aiArmyGroup = armyGroups.find(g => g.owner === countryId);
  let newArmyGroup: ArmyGroup | undefined = undefined;
  
  if (!aiArmyGroup) {
    // Create a default AI army group
    const ownedRegions = getOwnedRegions(regions, countryId);
    const ownedRegionIds = ownedRegions.map(r => r.id);
    
    const nameMap: Record<string, string> = {
      soviet: 'Soviet Army Group',
      white: 'White Army Group',
    finland: 'Finnish Army Group',
    ukraine: 'Ukrainian Army Group',
    fswr: 'Red Guard Army Group',
  };
    const name = nameMap[countryId] || 'Army Group';
    
    newArmyGroup = {
      id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      regionIds: ownedRegionIds,
      color: '#6B7280',
      owner: countryId,
      theaterId: null,
      mode: 'advance', // AI automatically advances toward enemies
    };
    
    aiArmyGroup = newArmyGroup;
  }
  
  // 2. Create production requests
  const productionRequests: AIProductionRequest[] = [];
  const ownedRegions = getOwnedRegions(regions, countryId);
  
  // Filter out regions with active combat
  const regionsWithActiveCombat = new Set(
    activeCombats.filter(c => !c.isComplete).map(c => c.regionId)
  );
  const availableRegions = ownedRegions.filter(r => !regionsWithActiveCombat.has(r.id));
  
  let divisionsCreated = 0;
  
  if (availableRegions.length === 0) {
    // No regions available to deploy to
    return {
      divisionsCreated: 0,
      productionRequests: [],
      updatedAIState: {
        countryId,
      },
      newArmyGroup,
    };
  }
  
  // AI production logic: produce up to 2 divisions per tick if under cap
  while (divisionsCreated < 2) {
    // Check command power before producing
    if (!canProduceDivision(countryId, regions, movingUnits, productionQueues, countryBonuses, coreRegions)) {
      break;
    }
    
    // Pick target region
    const targetRegion = pickRandomRegion(availableRegions);
    if (!targetRegion) break;
    
    productionRequests.push({
      divisionName: generateAIDivisionName(countryId, regions, productionQueue, divisionsCreated),
      targetRegionId: targetRegion.id,
      armyGroupId: aiArmyGroup.id,
    });
    
    divisionsCreated += 1;
  }
  
  return {
    divisionsCreated,
    productionRequests,
    updatedAIState: {
      countryId,
    },
    newArmyGroup,
  };
}
