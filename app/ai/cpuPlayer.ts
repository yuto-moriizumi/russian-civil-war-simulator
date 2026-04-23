import { AIState, CountryId, RegionState, Region, ActiveCombat, Movement, ArmyGroup, ProductionQueueItem, CountryBonuses, DivisionState } from '../types/game';
import { canProduceDivision } from '../utils/commandPower';
import { getFirstArmyGroupName, getDivisionPrefix } from '../data/countries';

/**
 * Creates initial AI state for a country
 */
export function createInitialAIState(countryId: CountryId): AIState {
  return {
    countryId,
  };
}

/**
 * Creates initial AI army group for a country
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
 * Get all regions owned by a country
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

function countAssignedDivisions(
  groupId: string,
  divisions: DivisionState,
  movingUnits: Movement[],
  productionQueue: ProductionQueueItem[]
): number {
  const transitIds = new Set<string>(
    movingUnits.flatMap(m => m.divisionIds)
  );
  const onMap = Object.values(divisions).filter(d => d.armyGroupId === groupId && !transitIds.has(d.id)).length;
  const inTransit = movingUnits.reduce(
    (count, movement) => count + movement.divisionIds.filter(id => divisions[id]?.armyGroupId === groupId).length,
    0
  );
  const queued = productionQueue.filter(item => item.armyGroupId === groupId).length;

  return onMap + inTransit + queued;
}

function selectProductionArmyGroup(
  countryId: CountryId,
  divisions: DivisionState,
  regions: RegionState,
  armyGroups: ArmyGroup[],
  movingUnits: Movement[],
  productionQueue: ProductionQueueItem[]
): ArmyGroup | undefined {
  return armyGroups
    .filter(group => group.owner === countryId)
    .sort((a, b) =>
      countAssignedDivisions(a.id, divisions, movingUnits, productionQueue) -
      countAssignedDivisions(b.id, divisions, movingUnits, productionQueue)
    )[0];
}

/**
 * Generate a unique division name for the AI
 */
function generateAIDivisionName(countryId: CountryId, divisions: DivisionState, productionQueue: ProductionQueueItem[], offset: number = 0): string {
  const prefix = getDivisionPrefix(countryId);
  const existingCount = Object.values(divisions).filter(d => d.owner === countryId).length;
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
  divisions: DivisionState,
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
  let aiArmyGroup = selectProductionArmyGroup(countryId, divisions, regions, armyGroups, movingUnits, productionQueue);
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
      romania: 'Romanian Army Group',
      bulgaria: 'Bulgarian Army Group',
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
  
  const availableArmyGroups = newArmyGroup ? [...armyGroups, newArmyGroup] : armyGroups;

  // 2. Create production requests
  const productionRequests: AIProductionRequest[] = [];
  const ownedRegions = getOwnedRegions(regions, countryId);
  
  // Filter out regions with active combat
  const regionsWithActiveCombat = new Set(
    activeCombats.filter(c => !c.isComplete).map(c => c.defenderRegionId)
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
  //
  // Use a local copy of productionQueues that is updated after each request is
  // committed so that the second canProduceDivision call reflects the first
  // division already queued this tick.  Without this, both checks read the
  // same stale snapshot and the AI can exceed the CP cap by 1 division per tick.
  let localQueues: Record<CountryId, ProductionQueueItem[]> = { ...productionQueues };

  while (divisionsCreated < 2) {
    // Check command power before producing (use the locally-updated queues)
    if (!canProduceDivision(countryId, divisions, regions, movingUnits, localQueues, countryBonuses, coreRegions)) {
      break;
    }
    
    aiArmyGroup = selectProductionArmyGroup(countryId, divisions, regions, availableArmyGroups, movingUnits, localQueues[countryId] ?? []);
    if (!aiArmyGroup) break;

    const groupRegionIds = new Set(aiArmyGroup.regionIds);
    const groupAvailableRegions = availableRegions.filter(region => groupRegionIds.has(region.id));
    const deploymentRegions = groupAvailableRegions.length > 0 ? groupAvailableRegions : availableRegions;

    // Pick target region
    const targetRegion = pickRandomRegion(deploymentRegions);
    if (!targetRegion) break;
    
    productionRequests.push({
      divisionName: generateAIDivisionName(countryId, divisions, productionQueue, divisionsCreated),
      targetRegionId: targetRegion.id,
      armyGroupId: aiArmyGroup.id,
    });
    
    divisionsCreated += 1;

    // Reflect this newly committed item in localQueues so the next iteration
    // of canProduceDivision sees the correct CP usage.
    const placeholder: ProductionQueueItem = {
      id: `ai-pending-${divisionsCreated}`,
      divisionName: '',
      owner: countryId,
      startTime: new Date(),
      completionTime: new Date(),
      targetRegionId: null,
      armyGroupId: aiArmyGroup.id,
    };
    localQueues = {
      ...localQueues,
      [countryId]: [...(localQueues[countryId] ?? []), placeholder],
    };
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
