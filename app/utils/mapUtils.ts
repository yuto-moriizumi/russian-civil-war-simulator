import { Adjacency, FactionId, RegionState } from '../types/game';
import { initialRegionOwnership } from '../data/map';

// Faction colors for map display
export const FACTION_COLORS: Record<FactionId, string> = {
  soviet: '#CC0000',      // Red
  white: '#FFFFFF',       // White
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

// Calculate income based on controlled states (1 money per state per hour)
export function calculateFactionIncome(regions: RegionState, faction: FactionId): number {
  const controlledRegions = getRegionsByFaction(regions, faction);
  return controlledRegions.length; // 1 money per state per hour
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
      units: 0,
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
      units: 0,
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
