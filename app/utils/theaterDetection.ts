import { RegionState, Adjacency, FactionId, Theater } from '../types/game';

/**
 * Detect theaters of operation by finding connected groups of frontline regions.
 * A frontline region is a player-owned region adjacent to at least one enemy region.
 * 
 * @param existingTheaters - Optional array of existing theaters to preserve IDs
 */
export function detectTheaters(
  regions: RegionState,
  adjacency: Adjacency,
  playerFaction: FactionId,
  existingTheaters: Theater[] = []
): Theater[] {
  // Step 1: Find all frontline regions (player regions adjacent to enemies)
  const frontlineRegions = new Map<string, Set<FactionId>>(); // regionId -> enemy factions it faces
  
  Object.entries(regions).forEach(([regionId, region]) => {
    if (region.owner !== playerFaction) return;
    
    const adjacentEnemies = new Set<FactionId>();
    const neighbors = adjacency[regionId] || [];
    
    neighbors.forEach(neighborId => {
      const neighbor = regions[neighborId];
      if (neighbor && neighbor.owner !== playerFaction && neighbor.owner !== 'neutral') {
        adjacentEnemies.add(neighbor.owner);
      }
    });
    
    if (adjacentEnemies.size > 0) {
      frontlineRegions.set(regionId, adjacentEnemies);
    }
  });
  
  if (frontlineRegions.size === 0) {
    return []; // No frontlines = no theaters
  }
  
  // Step 2: Group frontline regions into connected components (theaters)
  const visited = new Set<string>();
  const theaterGroups: Array<{ regions: string[]; enemies: Set<FactionId> }> = [];
  
  frontlineRegions.forEach((_, startRegionId) => {
    if (visited.has(startRegionId)) return;
    
    // BFS to find all connected frontline regions
    const theaterRegions: string[] = [];
    const theaterEnemies = new Set<FactionId>();
    const queue = [startRegionId];
    visited.add(startRegionId);
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      theaterRegions.push(currentId);
      
      // Add enemies this region faces
      const enemies = frontlineRegions.get(currentId);
      if (enemies) {
        enemies.forEach(e => theaterEnemies.add(e));
      }
      
      // Find adjacent frontline regions (must be player-owned and also frontline)
      const neighbors = adjacency[currentId] || [];
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId) && frontlineRegions.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }
    
    theaterGroups.push({ regions: theaterRegions, enemies: theaterEnemies });
  });
  
  // Step 3: Create Theater objects with auto-generated names
  // Try to preserve existing theater IDs by matching regions
  return theaterGroups.map((group, index) => {
    const primaryEnemy = Array.from(group.enemies)[0]; // Use first enemy as primary
    const name = generateTheaterName(group.regions, regions, primaryEnemy, index);
    
    // Check if this theater matches an existing one (same frontline regions)
    const matchingTheater = existingTheaters.find(existingTheater => {
      // Consider it a match if >80% of regions overlap
      const existingSet = new Set(existingTheater.frontlineRegions);
      const currentSet = new Set(group.regions);
      const intersection = group.regions.filter(r => existingSet.has(r)).length;
      const union = new Set([...existingTheater.frontlineRegions, ...group.regions]).size;
      const overlap = intersection / union;
      return overlap > 0.8 && existingTheater.enemyFaction === primaryEnemy;
    });
    
    return {
      id: matchingTheater?.id || `theater-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      frontlineRegions: group.regions,
      enemyFaction: primaryEnemy,
      owner: playerFaction,
    };
  });
}

/**
 * Generate a descriptive name for a theater based on geography and enemies.
 */
function generateTheaterName(
  regionIds: string[],
  regions: RegionState,
  enemyFaction: FactionId,
  index: number
): string {
  // Get the first region's name as a geographic reference
  const firstRegion = regions[regionIds[0]];
  if (!firstRegion) return `Theater ${index + 1}`;
  
  // Extract geographic terms from region names
  const regionNames = regionIds
    .map(id => regions[id]?.name || '')
    .filter(name => name.length > 0);
  
  // Look for common geographic terms
  const geoTerms = ['North', 'South', 'East', 'West', 'Central', 'Siberia', 'Caucasus', 'Urals', 'Far East'];
  for (const term of geoTerms) {
    if (regionNames.some(name => name.includes(term))) {
      return `${term}ern Theater`;
    }
  }
  
  // Check for country codes to identify borders
  const countryCode = firstRegion.countryIso3;
  if (countryCode === 'UKR') return 'Ukrainian Theater';
  if (countryCode === 'BLR') return 'Belarusian Theater';
  if (countryCode === 'KAZ') return 'Central Asian Theater';
  if (countryCode === 'GEO' || countryCode === 'ARM' || countryCode === 'AZE') return 'Caucasus Theater';
  
  // Use enemy faction as fallback
  const enemyNames: Record<FactionId, string> = {
    white: 'White',
    soviet: 'Soviet',
    neutral: 'Neutral',
    foreign: 'Foreign',
  };
  
  return `${enemyNames[enemyFaction]} Front`;
}

/**
 * Get theater statistics (total divisions, region count, etc.)
 */
export function getTheaterStats(
  theater: Theater,
  regions: RegionState
): {
  totalDivisions: number;
  totalRegions: number;
  regionsWithUnits: number;
} {
  let totalDivisions = 0;
  let regionsWithUnits = 0;
  
  theater.frontlineRegions.forEach(regionId => {
    const region = regions[regionId];
    if (region) {
      const divCount = region.divisions.length;
      totalDivisions += divCount;
      if (divCount > 0) regionsWithUnits++;
    }
  });
  
  return {
    totalDivisions,
    totalRegions: theater.frontlineRegions.length,
    regionsWithUnits,
  };
}
