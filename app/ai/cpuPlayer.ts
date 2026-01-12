import { AIState, FactionId, RegionState, Region, Division, ActiveCombat, Movement, ArmyGroup } from '../types/game';
import { createDivision } from '../utils/combat';
import { calculateFactionIncome } from '../utils/mapUtils';

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
  
  return {
    id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${factionId === 'soviet' ? 'Soviet' : 'White'} Army Group`,
    regionIds: ownedRegionIds,
    color: '#6B7280',
    owner: factionId,
    theaterId: null,
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
function generateAIDivisionName(factionId: FactionId, regions: RegionState): string {
  const prefix = factionId === 'white' ? 'White Guard' : 'Red Guard';
  // Count existing divisions owned by this faction
  const existingCount = Object.values(regions).reduce((acc, region) => 
    acc + region.divisions.filter(d => d.owner === factionId).length, 0
  );
  return `${prefix} ${existingCount + 1}st Division`;
}

/**
 * AI decision result - what actions the AI wants to take
 */
export interface AIActions {
  divisionsCreated: number;
  deployments: { regionId: string; divisions: Division[] }[];
  updatedAIState: AIState;
  newArmyGroup?: ArmyGroup; // New army group created by AI if needed
}

/**
 * Run AI logic for one tick (1 game hour)
 * - Earns income based on controlled regions (using region values/weights) minus unit maintenance costs
 * - Creates divisions if it has enough money and deploys them immediately to random owned regions
 * 
 * @param armyGroups - All army groups in the game
 */
export function runAITick(
  aiState: AIState,
  regions: RegionState,
  armyGroups: ArmyGroup[],
  activeCombats: ActiveCombat[] = [],
  movingUnits: Movement[] = []
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
    
    newArmyGroup = {
      id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${factionId === 'soviet' ? 'Soviet' : 'White'} Army Group`,
      regionIds: ownedRegionIds,
      color: '#6B7280',
      owner: factionId,
      theaterId: null,
    };
    
    aiArmyGroup = newArmyGroup;
  }
  
  // 4. Create divisions and deploy them immediately
  const deployments: { regionId: string; divisions: Division[] }[] = [];
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
      deployments: [],
      updatedAIState: {
        factionId,
        money,
        income,
      },
      newArmyGroup,
    };
  }
  
  while (money >= DIVISION_COST) {
    money -= DIVISION_COST;
    
    // Create division assigned to AI's army group
    const newDivision = createDivision(
      factionId,
      generateAIDivisionName(factionId, regions),
      aiArmyGroup.id
    );
    
    // Deploy to random region
    const targetRegion = pickRandomRegion(availableRegions);
    if (!targetRegion) break;
    
    // Find existing deployment to this region or create new one
    const existingDeployment = deployments.find(d => d.regionId === targetRegion.id);
    if (existingDeployment) {
      existingDeployment.divisions.push(newDivision);
    } else {
      deployments.push({
        regionId: targetRegion.id,
        divisions: [newDivision],
      });
    }
    
    divisionsCreated += 1;
  }
  
  return {
    divisionsCreated,
    deployments,
    updatedAIState: {
      factionId,
      money,
      income,
    },
    newArmyGroup,
  };
}
