import { Adjacency, CountryId, RegionState, Movement } from '../types/game';
import { initialRegionOwnership, regionValues } from '../data/map';

// Country colors for map display
export const COUNTRY_COLORS: Record<CountryId, string> = {
  soviet: '#CC0000',      // Red
  white: '#0d3b0d',       // Very Dark Green (White Army)
  finland: '#FFFFFF',     // White (Finnish white guard color)
  ukraine: '#0057B7',     // Blue (Ukrainian national color)
  don: '#FFD700',         // Gold (Don Republic)
  fswr: '#CC0000',        // Red (Finnish Socialist Workers' Republic)
  iskolat: '#8B0000',     // Dark Red (Iskolat Soviet Republic)
  neutral: '#808080',     // Gray
  foreign: '#4A90D9',     // Blue
  germany: '#1a1a1a',     // Dark Gray/Black (German Empire)
};

// Check if movement between two regions is valid
export function canMoveTo(adjacency: Adjacency, from: string, to: string): boolean {
  return adjacency[from]?.includes(to) ?? false;
}

// Get all adjacent regions
export function getAdjacentRegions(adjacency: Adjacency, regionId: string): string[] {
  return adjacency[regionId] ?? [];
}

// Get regions controlled by a specific country
export function getRegionsByCountry(regions: RegionState, country: CountryId): string[] {
  return Object.entries(regions)
    .filter(([, region]) => region.owner === country)
    .map(([id]) => id);
}

// Count total units owned by a country (in regions and in transit)
export function countCountryUnits(regions: RegionState, country: CountryId, movingUnits: Movement[] = []): number {
  // Count units in regions
  const unitsInRegions = Object.values(regions)
    .filter(region => region.owner === country)
    .reduce((total, region) => total + region.divisions.length, 0);
  
  // Count units in transit
  const unitsInTransit = movingUnits
    .filter(movement => movement.owner === country)
    .reduce((total, movement) => total + movement.divisions.length, 0);
  
  return unitsInRegions + unitsInTransit;
}

/**
 * Count units in a specific army group across regions and in transit
 * @param regionIds - Region IDs that belong to the army group
 * @param regions - Current region state
 * @param country - Country that owns the army group
 * @param armyGroupId - ID of the army group
 * @param movingUnits - Units currently in transit
 * @returns Total unit count for the army group
 */
export function getArmyGroupUnitCount(
  regionIds: string[],
  regions: RegionState,
  country: CountryId,
  armyGroupId: string,
  movingUnits: Movement[] = []
): number {
  // Count divisions in regions that belong to this army group
  const unitsInRegions = regionIds.reduce((count, regionId) => {
    const region = regions[regionId];
    if (!region || region.owner !== country) return count;
    
    // Count divisions that belong to this army group
    const groupDivisions = region.divisions.filter(d => d.armyGroupId === armyGroupId).length;
    return count + groupDivisions;
  }, 0);
  
  // Count divisions in transit that belong to this army group
  const unitsInTransit = movingUnits
    .filter(m => m.owner === country)
    .reduce((count, movement) => {
      const groupDivisions = movement.divisions.filter(d => d.armyGroupId === armyGroupId).length;
      return count + groupDivisions;
    }, 0);
  
  return unitsInRegions + unitsInTransit;
}

// Calculate total income from regions controlled by a country (using region values/weights)
// minus unit maintenance costs ($1 per unit per hour)
export function calculateCountryIncome(regions: RegionState, country: CountryId, movingUnits: Movement[] = []): number {
  const grossIncome = Object.values(regions)
    .filter(region => region.owner === country)
    .reduce((total, region) => total + region.value, 0);
  
  const unitCount = countCountryUnits(regions, country, movingUnits);
  const maintenanceCost = unitCount; // $1 per unit per hour
  
  return grossIncome - maintenanceCost;
}

// Initialize region state from GeoJSON features
export function initializeRegionState(
  features: GeoJSON.Feature[],
  defaultOwner: CountryId = 'neutral'
): RegionState {
  const state: RegionState = {};
  
  for (const feature of features) {
    const props = feature.properties;
    if (!props) continue;
    
    const id = props.regionId || props.shapeISO || props.id;
    if (!id) continue;
    
    state[id] = {
      id,
      name: props.shapeName || props.name || id,
      countryIso3: props.countryIso3 || props.shapeGroup || 'UNK',
      owner: defaultOwner,
      divisions: [],
      value: regionValues[id] ?? 1,  // Default value of 1 if not specified
    };
  }
  
  return state;
}

// Create initial ownership based on master data
export function createInitialOwnership(
  features: GeoJSON.Feature[]
): RegionState {
  const state: RegionState = {};
  
  for (const feature of features) {
    const props = feature.properties;
    if (!props) continue;
    
    const id = props.regionId || props.shapeISO || props.id;
    if (!id) continue;
    
    const countryIso3 = props.countryIso3 || props.shapeGroup || 'UNK';
    
    // Get ownership from master data, default to neutral if not defined
    const owner = initialRegionOwnership[id] ?? 'neutral';
    
    state[id] = {
      id,
      name: props.shapeName || props.name || id,
      countryIso3,
      owner,
      divisions: [],
      value: regionValues[id] ?? 1,  // Default value of 1 if not specified
    };
  }
  
  return state;
}

// Generate color expression for MapLibre based on region ownership
export function generateOwnershipColorExpression(
  regions: RegionState
): ['match', ['get', string], ...Array<string>] {
  const expression: ['match', ['get', string], ...Array<string>] = ['match', ['get', 'regionId']];
  
  for (const [id, region] of Object.entries(regions)) {
    expression.push(id, COUNTRY_COLORS[region.owner]);
  }
  
  // Default color for unmatched regions
  expression.push(COUNTRY_COLORS.neutral);
  
  return expression;
}
