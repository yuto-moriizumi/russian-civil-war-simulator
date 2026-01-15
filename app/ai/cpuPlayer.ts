import { AIState, FactionId, RegionState, Region, ActiveCombat, Movement, ArmyGroup, ProductionQueueItem, FactionBonuses } from '../types/game';
import { calculateFactionIncome } from '../utils/mapUtils';
import { canProduceDivision, getCommandPowerInfo } from '../utils/commandPower';

// Cost to create one division
const DIVISION_COST = 10;

/**
 * Creates initial AI state for a faction
 */
export function createInitialAIState(factionId: FactionId): AIState {
  return {
    factionId,
    money: 100,
    income: 0, // Income is now calculated dynamically based on controlled regions
  };
}

/**
 * Creates initial AI army group for a faction
 */
export function createInitialAIArmyGroup(factionId: FactionId, regions: RegionState): ArmyGroup {
  const ownedRegions = getOwnedRegions(regions, factionId);
  const ownedRegionIds = ownedRegions.map(r => r.id);
  
  const nameMap: Record<string, string> = {
    soviet: 'Soviet Army Group',
    white: 'White Army Group',
    finland: 'Finnish Army Group',
    ukraine: 'Ukrainian Army Group',
    don: 'Don Cossack Army Group',
  };
  const name = nameMap[factionId] || 'Army Group';
  
  return {
    id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    regionIds: ownedRegionIds,
    color: '#6B7280',
    owner: factionId,
    theaterId: null,
    mode: 'advance', // AI automatically advances toward enemies
  };
}

/**
 * Get all regions owned by a faction
 */
function getOwnedRegions(regions: RegionState, factionId: FactionId): Region[] {
  return Object.values(regions).filter(region => region.owner === factionId);
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
function generateAIDivisionName(factionId: FactionId, regions: RegionState, productionQueue: ProductionQueueItem[], offset: number = 0): string {
  const prefixMap: Record<string, string> = {
    soviet: 'Red Guard',
    white: 'White Guard',
    finland: 'Finnish Guard',
    ukraine: 'Ukrainian Guard',
    don: 'Don Cossack',
  };
  const prefix = prefixMap[factionId] || 'Guard';
  
  // Count existing divisions owned by this faction
  const existingCount = Object.values(regions).reduce((acc, region) => 
    acc + region.divisions.filter(d => d.owner === factionId).length, 0
  );
  
  // Count divisions in production for this faction
  const productionCount = productionQueue.filter(p => p.owner === factionId).length;
  
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
 * @param factionBonuses - Faction bonuses from completed missions
 */
export function runAITick(
  aiState: AIState,
  regions: RegionState,
  armyGroups: ArmyGroup[],
  activeCombats: ActiveCombat[] = [],
  movingUnits: Movement[] = [],
  productionQueue: ProductionQueueItem[] = [],
  productionQueues: Record<FactionId, ProductionQueueItem[]> = {} as Record<FactionId, ProductionQueueItem[]>,
  factionBonuses: FactionBonuses
): AIActions {
  const { factionId } = aiState;
  let { money } = aiState;
  
  // 1. Calculate income from controlled regions (using region values/weights) minus unit maintenance costs
  const income = calculateFactionIncome(regions, factionId, movingUnits);
  
  // 2. Earn income
  money += income;
  
  // 3. Find or create an army group for the AI
  let aiArmyGroup = armyGroups.find(g => g.owner === factionId);
  let newArmyGroup: ArmyGroup | undefined = undefined;
  
  if (!aiArmyGroup) {
    // Create a default AI army group
    const ownedRegions = getOwnedRegions(regions, factionId);
    const ownedRegionIds = ownedRegions.map(r => r.id);
    
    const nameMap: Record<string, string> = {
      soviet: 'Soviet Army Group',
      white: 'White Army Group',
      finland: 'Finnish Army Group',
      ukraine: 'Ukrainian Army Group',
    };
    const name = nameMap[factionId] || 'Army Group';
    
    newArmyGroup = {
      id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      regionIds: ownedRegionIds,
      color: '#6B7280',
      owner: factionId,
      theaterId: null,
      mode: 'advance', // AI automatically advances toward enemies
    };
    
    aiArmyGroup = newArmyGroup;
  }
  
  // 4. Create production requests
  const productionRequests: AIProductionRequest[] = [];
  const ownedRegions = getOwnedRegions(regions, factionId);
  
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
        factionId,
        money,
        income,
      },
      newArmyGroup,
    };
  }
  
  // AI limit: don't spend ALL money at once if income is low, 
  // but for now we follow the existing logic of spending what we have.
  while (money >= DIVISION_COST) {
    // Check command power before producing
    if (!canProduceDivision(factionId, regions, movingUnits, productionQueues, factionBonuses)) {
      const capInfo = getCommandPowerInfo(factionId, regions, movingUnits, productionQueues, factionBonuses);
      console.log(
        `[AI] ${factionId} reached command power limit. Current: ${capInfo.current}, In Production: ${capInfo.inProduction}, Cap: ${capInfo.cap}`
      );
      break;
    }
    
    money -= DIVISION_COST;
    
    // Pick target region
    const targetRegion = pickRandomRegion(availableRegions);
    if (!targetRegion) break;
    
    productionRequests.push({
      divisionName: generateAIDivisionName(factionId, regions, productionQueue, divisionsCreated),
      targetRegionId: targetRegion.id,
      armyGroupId: aiArmyGroup.id,
    });
    
    divisionsCreated += 1;
    
    // Limit AI to starting at most 2 divisions per tick to avoid massive queue build-up
    if (divisionsCreated >= 2) break;
  }
  
  return {
    divisionsCreated,
    productionRequests,
    updatedAIState: {
      factionId,
      money,
      income,
    },
    newArmyGroup,
  };
}
