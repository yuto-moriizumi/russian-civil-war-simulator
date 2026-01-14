import { RegionState, Adjacency, FactionId, Theater, Region } from '../types/game';

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
 * Uses sophisticated analysis of region positions, names, and context.
 */
function generateTheaterName(
  regionIds: string[],
  regions: RegionState,
  enemyFaction: FactionId,
  index: number
): string {
  if (regionIds.length === 0) return `Theater ${index + 1}`;
  
  const regionData = regionIds.map(id => regions[id]).filter(r => r != null);
  if (regionData.length === 0) return `Theater ${index + 1}`;
  
  // Analyze geographic distribution
  const geoAnalysis = analyzeGeography(regionData);
  
  // Try different naming strategies in order of specificity
  
  // Strategy 1: Named geographic regions (highest priority)
  const namedRegionName = getNamedRegionName(regionData);
  if (namedRegionName) return namedRegionName;
  
  // Strategy 2: Country-based names for border theaters
  const countryName = getCountryTheaterName(regionData);
  if (countryName) return countryName;
  
  // Strategy 3: Directional names based on geographic center
  const directionalName = getDirectionalName(geoAnalysis);
  if (directionalName) return directionalName;
  
  // Strategy 4: Regional descriptors from region names
  const regionalName = getRegionalDescriptor(regionData);
  if (regionalName) return regionalName;
  
  // Fallback: Enemy-based naming with ordinal
  return getEnemyBasedName(enemyFaction, index);
}

/**
 * Analyze geographic distribution of regions
 */
function analyzeGeography(regionData: Region[]): {
  hasNorthern: boolean;
  hasSouthern: boolean;
  hasEastern: boolean;
  hasWestern: boolean;
  hasCentral: boolean;
  dominantCountry: string | null;
  countries: Set<string>;
} {
  const regionNames = regionData.map(r => r.name.toLowerCase());
  const countries = new Set(regionData.map(r => r.countryIso3));
  
  // Count country occurrences
  const countryCounts: Record<string, number> = {};
  regionData.forEach(r => {
    countryCounts[r.countryIso3] = (countryCounts[r.countryIso3] || 0) + 1;
  });
  const dominantCountry = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  return {
    hasNorthern: regionNames.some(n => n.includes('north') || n.includes('arkhangelsk') || n.includes('murmansk') || n.includes('karelia')),
    hasSouthern: regionNames.some(n => n.includes('south') || n.includes('crimea') || n.includes('kuban') || n.includes('krasnodar') || n.includes('rostov')),
    hasEastern: regionNames.some(n => n.includes('east') || n.includes('vladivostok') || n.includes('khabarovsk') || n.includes('sakhalin')),
    hasWestern: regionNames.some(n => n.includes('west') || n.includes('kaliningrad') || n.includes('smolensk') || n.includes('bryansk')),
    hasCentral: regionNames.some(n => n.includes('central') || n.includes('moscow') || n.includes('tula') || n.includes('ryazan')),
    dominantCountry,
    countries,
  };
}

/**
 * Get name based on well-known geographic regions
 */
function getNamedRegionName(regionData: Region[]): string | null {
  const regionNames = regionData.map(r => r.name.toLowerCase());
  const allNames = regionNames.join(' ');
  
  // Major geographic regions (specific to general)
  const namedRegions = [
    { keywords: ['crimea', 'sevastopol'], name: 'Crimean Front' },
    { keywords: ['caucasus', 'georgia', 'armenia', 'azerbaijan', 'dagestan', 'chechnya'], name: 'Caucasus Front' },
    { keywords: ['siberia', 'siberian', 'irkutsk', 'krasnoyarsk', 'novosibirsk'], name: 'Siberian Front' },
    { keywords: ['far east', 'vladivostok', 'khabarovsk', 'primorsky', 'sakhalin'], name: 'Far Eastern Front' },
    { keywords: ['urals', 'ural', 'sverdlovsk', 'chelyabinsk', 'perm'], name: 'Ural Front' },
    { keywords: ['volga', 'samara', 'saratov', 'volgograd', 'kazan', 'nizhny novgorod'], name: 'Volga Front' },
    { keywords: ['don', 'rostov', 'voronezh', 'kursk'], name: 'Don Front' },
    { keywords: ['baltic', 'estonia', 'latvia', 'lithuania', 'kaliningrad'], name: 'Baltic Front' },
    { keywords: ['karelia', 'murmansk', 'arkhangelsk'], name: 'Karelian Front' },
    { keywords: ['ukraine', 'ukrainian', 'kiev', 'kharkiv', 'odessa', 'lviv'], name: 'Ukrainian Front' },
    { keywords: ['belarus', 'belarusian', 'minsk', 'vitebsk', 'gomel'], name: 'Belarusian Front' },
    { keywords: ['central asia', 'kazakhstan', 'uzbekistan', 'turkmenistan', 'tashkent'], name: 'Central Asian Front' },
    { keywords: ['kuban', 'krasnodar'], name: 'Kuban Front' },
    { keywords: ['transbaikal', 'chita'], name: 'Transbaikal Front' },
  ];
  
  for (const region of namedRegions) {
    const matchCount = region.keywords.filter(kw => allNames.includes(kw)).length;
    if (matchCount > 0) {
      return region.name;
    }
  }
  
  return null;
}

/**
 * Get theater name based on country
 */
function getCountryTheaterName(regionData: Region[]): string | null {
  const countries = new Set(regionData.map(r => r.countryIso3));
  
  // Single country theaters
  if (countries.size === 1) {
    const country = Array.from(countries)[0];
    const countryNames: Record<string, string> = {
      'UKR': 'Ukrainian Theater',
      'BLR': 'Belarusian Theater',
      'KAZ': 'Central Asian Theater',
      'GEO': 'Caucasian Theater',
      'ARM': 'Caucasian Theater',
      'AZE': 'Caucasian Theater',
      'EST': 'Baltic Theater',
      'LVA': 'Baltic Theater',
      'LTU': 'Baltic Theater',
      'FIN': 'Finnish Theater',
      'POL': 'Polish Theater',
    };
    
    if (countryNames[country]) {
      return countryNames[country];
    }
  }
  
  return null;
}

/**
 * Get directional name based on geographic analysis
 */
function getDirectionalName(
  geoAnalysis: ReturnType<typeof analyzeGeography>
): string | null {
  const directions: string[] = [];
  
  if (geoAnalysis.hasNorthern) directions.push('Northern');
  if (geoAnalysis.hasSouthern) directions.push('Southern');
  if (geoAnalysis.hasEastern) directions.push('Eastern');
  if (geoAnalysis.hasWestern) directions.push('Western');
  if (geoAnalysis.hasCentral && directions.length === 0) directions.push('Central');
  
  if (directions.length === 1) {
    return `${directions[0]} Front`;
  } else if (directions.length === 2) {
    // Combine directions (e.g., "North-Western Front")
    return `${directions[0]}-${directions[1]} Front`;
  }
  
  return null;
}

/**
 * Get regional descriptor from region names
 */
function getRegionalDescriptor(regionData: Region[]): string | null {
  const firstRegion = regionData[0];
  if (!firstRegion) return null;
  
  const name = firstRegion.name;
  
  // Extract key terms from region name
  const descriptors = [
    'Maritime', 'Coastal', 'Mountain', 'Steppe', 'Forest',
    'Industrial', 'Agricultural', 'Border'
  ];
  
  for (const descriptor of descriptors) {
    if (name.toLowerCase().includes(descriptor.toLowerCase())) {
      return `${descriptor} Front`;
    }
  }
  
  return null;
}

/**
 * Get enemy-based fallback name
 */
function getEnemyBasedName(enemyFaction: FactionId, index: number): string {
  const enemyNames: Record<FactionId, string> = {
    white: 'White',
    soviet: 'Soviet',
    finland: 'Finnish',
    neutral: 'Independent',
    foreign: 'Foreign',
  };
  
  const enemyName = enemyNames[enemyFaction] || 'Unknown';
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  const ordinal = ordinals[index] || `${index + 1}th`;
  
  return `${ordinal} ${enemyName} Front`;
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
