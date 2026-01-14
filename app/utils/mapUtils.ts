import { Adjacency, FactionId, RegionState, Movement } from '../types/game';
import { initialRegionOwnership, regionValues } from '../data/map';

// Faction colors for map display
export const FACTION_COLORS: Record<FactionId, string> = {
  soviet: '#CC0000',      // Red
  white: '#0d3b0d',       // Very Dark Green (White Army)
  finland: '#FFFFFF',     // White (Finnish white guard color)
  ukraine: '#0057B7',     // Blue (Ukrainian national color)
  neutral: '#808080',     // Gray
  foreign: '#4A90D9',     // Blue
};

// Check if movement between two regions is valid
export function canMoveTo(adjacency: Adjacency, from: string, to: string): boolean {
  return adjacency[from]?.includes(to) ?? false;
}

// Get all adjacent regions
export function getAdjacentRegions(adjacency: Adjacency, regionId: string): string[] {
  return adjacency[regionId] ?? [];
}

// Get regions controlled by a specific faction
export function getRegionsByFaction(regions: RegionState, faction: FactionId): string[] {
  return Object.entries(regions)
    .filter(([, region]) => region.owner === faction)
    .map(([id]) => id);
}

// Count total units owned by a faction (in regions and in transit)
export function countFactionUnits(regions: RegionState, faction: FactionId, movingUnits: Movement[] = []): number {
  // Count units in regions
  const unitsInRegions = Object.values(regions)
    .filter(region => region.owner === faction)
    .reduce((total, region) => total + region.divisions.length, 0);
  
  // Count units in transit
  const unitsInTransit = movingUnits
    .filter(movement => movement.owner === faction)
    .reduce((total, movement) => total + movement.divisions.length, 0);
  
  return unitsInRegions + unitsInTransit;
}

// Calculate total income from regions controlled by a faction (using region values/weights)
// minus unit maintenance costs ($1 per unit per hour)
export function calculateFactionIncome(regions: RegionState, faction: FactionId, movingUnits: Movement[] = []): number {
  const grossIncome = Object.values(regions)
    .filter(region => region.owner === faction)
    .reduce((total, region) => total + region.value, 0);
  
  const unitCount = countFactionUnits(regions, faction, movingUnits);
  const maintenanceCost = unitCount; // $1 per unit per hour
  
  return grossIncome - maintenanceCost;
}

// Initialize region state from GeoJSON features
export function initializeRegionState(
  features: GeoJSON.Feature[],
  defaultOwner: FactionId = 'neutral'
): RegionState {
  const state: RegionState = {};
  
  for (const feature of features) {
    const props = feature.properties;
    if (!props) continue;
    
    const id = props.shapeISO || props.id;
    if (!id) continue;
    
    state[id] = {
      id,
      name: props.shapeName || props.name || id,
      countryIso3: props.shapeGroup || 'UNK',
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
    
    const id = props.shapeISO || props.id;
    if (!id) continue;
    
    const countryIso3 = props.shapeGroup || 'UNK';
    
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
  const expression: ['match', ['get', string], ...Array<string>] = ['match', ['get', 'shapeISO']];
  
  for (const [id, region] of Object.entries(regions)) {
    expression.push(id, FACTION_COLORS[region.owner]);
  }
  
  // Default color for unmatched regions
  expression.push(FACTION_COLORS.neutral);
  
  return expression;
}
