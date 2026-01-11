import { AIState, FactionId, RegionState, Region, Division } from '../types/game';
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
    reserveDivisions: [],
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
function generateAIDivisionName(factionId: FactionId, index: number): string {
  const prefix = factionId === 'white' ? 'White Guard' : 'Red Guard';
  return `${prefix} ${index + 1}st Division`;
}

/**
 * AI decision result - what actions the AI wants to take
 */
export interface AIActions {
  divisionsCreated: number;
  deployments: { regionId: string; divisions: Division[] }[];
  updatedAIState: AIState;
}

/**
 * Run AI logic for one tick (1 game hour)
 * - Earns income based on controlled regions (using region values/weights)
 * - Creates divisions if it has enough money
 * - Deploys reserve divisions to random owned regions
 */
export function runAITick(
  aiState: AIState,
  regions: RegionState
): AIActions {
  const { factionId } = aiState;
  let { money, reserveDivisions } = aiState;
  reserveDivisions = [...reserveDivisions]; // Clone to avoid mutation
  
  // 1. Calculate income from controlled regions (using region values/weights)
  const income = calculateFactionIncome(regions, factionId);
  
  // 2. Earn income
  money += income;
  
  // 3. Create divisions if we have enough money
  let divisionsCreated = 0;
  while (money >= DIVISION_COST) {
    money -= DIVISION_COST;
    const newDivision = createDivision(
      factionId,
      generateAIDivisionName(factionId, reserveDivisions.length + divisionsCreated)
    );
    reserveDivisions.push(newDivision);
    divisionsCreated += 1;
  }
  
  // 4. Deploy all reserve divisions to random owned regions
  const deployments: { regionId: string; divisions: Division[] }[] = [];
  const ownedRegions = getOwnedRegions(regions, factionId);
  
  while (reserveDivisions.length > 0 && ownedRegions.length > 0) {
    const targetRegion = pickRandomRegion(ownedRegions);
    if (!targetRegion) break;
    
    // Deploy 1 division at a time to random regions
    const divisionToDeploy = reserveDivisions.pop()!;
    
    // Find existing deployment to this region or create new one
    const existingDeployment = deployments.find(d => d.regionId === targetRegion.id);
    if (existingDeployment) {
      existingDeployment.divisions.push(divisionToDeploy);
    } else {
      deployments.push({
        regionId: targetRegion.id,
        divisions: [divisionToDeploy],
      });
    }
  }
  
  return {
    divisionsCreated,
    deployments,
    updatedAIState: {
      factionId,
      money,
      income,
      reserveDivisions,
    },
  };
}
