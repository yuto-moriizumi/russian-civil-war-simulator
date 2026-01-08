import { AIState, FactionId, RegionState, Region } from '../types/game';
import { calculateFactionIncome } from '../utils/mapUtils';

// Cost to create one infantry unit
const UNIT_COST = 10;

/**
 * Creates initial AI state for a faction
 */
export function createInitialAIState(factionId: FactionId): AIState {
  return {
    factionId,
    money: 100,
    income: 0, // Income is now calculated dynamically based on controlled states
    infantryUnits: 0,
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
 * AI decision result - what actions the AI wants to take
 */
export interface AIActions {
  unitsCreated: number;
  deployments: { regionId: string; count: number }[];
  updatedAIState: AIState;
}

/**
 * Run AI logic for one tick (1 game hour)
 * - Earns income based on controlled states (1 money per state)
 * - Creates units if it has enough money
 * - Deploys reserve units to random owned regions
 */
export function runAITick(
  aiState: AIState,
  regions: RegionState
): AIActions {
  let { money, infantryUnits, factionId } = aiState;
  
  // 1. Calculate income from controlled regions (using region values/weights)
  const income = calculateFactionIncome(regions, factionId);
  
  // 2. Earn income
  money += income;
  
  // 3. Create units if we have enough money
  let unitsCreated = 0;
  while (money >= UNIT_COST) {
    money -= UNIT_COST;
    infantryUnits += 1;
    unitsCreated += 1;
  }
  
  // 4. Deploy all reserve units to random owned regions
  const deployments: { regionId: string; count: number }[] = [];
  const ownedRegions = getOwnedRegions(regions, factionId);
  
  while (infantryUnits > 0 && ownedRegions.length > 0) {
    const targetRegion = pickRandomRegion(ownedRegions);
    if (!targetRegion) break;
    
    // Deploy 1 unit at a time to random regions
    deployments.push({
      regionId: targetRegion.id,
      count: 1,
    });
    infantryUnits -= 1;
  }
  
  return {
    unitsCreated,
    deployments,
    updatedAIState: {
      factionId,
      money,
      income,
      infantryUnits,
    },
  };
}
