import { RegionState, Adjacency, CountryId, Theater, Region, Relationship, DivisionState } from '../types/game';
import { getCountryAdjective } from '../data/countries';
import { buildIsHostilePredicate } from './pathfinding';
import { getDivisionsInRegion } from './divisionState';

/**
 * Detect theaters of operation by finding connected groups of frontline regions.
 * A frontline region is a player-owned region adjacent to at least one hostile region.
 * Hostile means: actively at war, OR a real foreign country with no explicit
 * relationship (neutral), OR the special 'neutral' country (unowned territory).
 * Excluded: autonomy servants and military-access partners.
 * 
 * @param existingTheaters - Optional array of existing theaters to preserve IDs
 * @param relationships - Diplomatic/military relationships used to determine hostility
 */
export function detectTheaters(
  regions: RegionState,
  adjacency: Adjacency,
  playerCountry: CountryId,
  existingTheaters: Theater[] = [],
  relationships: Relationship[] = []
): Theater[] {
  // Build a predicate that is true only for genuinely hostile (at-war) regions
  const isHostile = buildIsHostilePredicate(playerCountry, regions, relationships);

  // Build relMap to distinguish at-war vs neutral relationships
  const relMap = new Map<string, string>();
  for (const r of relationships) {
    relMap.set(`${r.fromCountry}|${r.toCountry}`, r.type);
  }

  // Build map of puppet -> overlord for merging frontlines
  const puppetOverlords = new Map<CountryId, CountryId>();
  for (const r of relationships) {
    if (r.type === 'autonomy') {
      puppetOverlords.set(r.toCountry, r.fromCountry);
    }
  }

  // Build set of allied owners: playerCountry + puppet states (autonomy servants)
  const alliedOwners = new Set<CountryId>([playerCountry]);
  for (const r of relationships) {
    // If playerCountry is the overlord (fromCountry) and the other is a puppet (autonomy),
    // the puppet's territory counts as allied frontline.
    if (r.fromCountry === playerCountry && r.type === 'autonomy') {
      alliedOwners.add(r.toCountry);
    }
    // If playerCountry is the puppet (toCountry) and another country declared autonomy,
    // that country is the overlord — include overlord territory as well.
    if (r.toCountry === playerCountry && r.type === 'autonomy') {
      alliedOwners.add(r.fromCountry);
    }
  }

  /**
   * Return a theater key for an enemy country:
   *   - "war"           for at-war enemies (C, D → grouped together)
   *   - "neutral:<id>"  for neutral countries (A, B → each gets its own theater)
   *   - "war"           for unowned 'neutral' territory (treated like war)
   */
  function theaterKeyFor(enemyCountry: CountryId): string {
    if (enemyCountry === 'neutral') return 'war';
    const theirType = relMap.get(`${enemyCountry}|${playerCountry}`);
    const ourType   = relMap.get(`${playerCountry}|${enemyCountry}`);
    if (theirType === 'war' || ourType === 'war') return 'war';
    // If this enemy is a puppet, merge its frontline with the overlord's theater
    const overlord = puppetOverlords.get(enemyCountry);
    if (overlord) return theaterKeyFor(overlord);
    return `neutral:${enemyCountry}`;
  }

  // Step 1: For each frontline region, record the theater keys it belongs to.
  // A single region can face multiple keys (e.g. neutral-A, neutral-B, and war).
  const regionKeys = new Map<string, Set<string>>(); // regionId -> Set<theaterKey>

  Object.entries(regions).forEach(([regionId, region]) => {
    if (!alliedOwners.has(region.owner)) return;

    const keys = new Set<string>();
    (adjacency[regionId] || []).forEach(neighborId => {
      const neighbor = regions[neighborId];
      if (neighbor && isHostile(neighborId)) {
        keys.add(theaterKeyFor(neighbor.owner));
      }
    });

    if (keys.size > 0) {
      regionKeys.set(regionId, keys);
    }
  });

  if (regionKeys.size === 0) {
    return []; // No frontlines = no theaters
  }

  // Step 2: For each theater key, find connected components of regions that share it.
  const allKeys = new Set<string>();
  regionKeys.forEach(keys => keys.forEach(k => allKeys.add(k)));

  const theaterGroups: Array<{ regions: string[]; enemies: Set<CountryId> }> = [];

  allKeys.forEach(key => {
    // Regions that participate in this theater key
    const keyRegions = new Set<string>(
      [...regionKeys.entries()]
        .filter(([, keys]) => keys.has(key))
        .map(([id]) => id)
    );

    // BFS to find connected components of frontline regions, traversing through
    // allied territories (including puppet states) for connectivity
    const visited = new Set<string>();
    keyRegions.forEach(startId => {
      if (visited.has(startId)) return;

      const component: string[] = [];
      const queue = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const cur = queue.shift()!;
        // Only include frontline regions in the component
        if (keyRegions.has(cur)) {
          component.push(cur);
        }

        (adjacency[cur] || []).forEach(nId => {
          if (visited.has(nId)) return;
          // Only traverse to other frontline regions — traversing through
          // non-frontline allied territory would merge discontinuous frontlines.
          if (keyRegions.has(nId)) {
            visited.add(nId);
            queue.push(nId);
          }
        });
      }

      // Collect the enemy countries this component actually faces for this key
      const enemies = new Set<CountryId>();
      component.forEach(regionId => {
        (adjacency[regionId] || []).forEach(nId => {
          const n = regions[nId];
          if (n && isHostile(nId) && theaterKeyFor(n.owner) === key) {
            enemies.add(n.owner);
          }
        });
      });

      theaterGroups.push({ regions: component, enemies });
    });
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
      return overlap > 0.8 && existingTheater.enemyCountry === primaryEnemy;
    });

    return {
      id: matchingTheater?.id || `theater-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      frontlineRegions: group.regions,
      enemyCountry: primaryEnemy,
      owner: playerCountry,
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
  enemyCountry: CountryId,
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
  return getEnemyBasedName(enemyCountry, index);
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
      'ROU': 'Romanian Theater',
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
function getEnemyBasedName(enemyCountry: CountryId, index: number): string {
  const enemyName = getCountryAdjective(enemyCountry);
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  const ordinal = ordinals[index] || `${index + 1}th`;
  
  return `${ordinal} ${enemyName} Front`;
}

/**
 * Get theater statistics (total divisions, region count, etc.)
 */
export function getTheaterStats(
  theater: Theater,
  regions: RegionState,
  divisions: DivisionState
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
      const divCount = getDivisionsInRegion(divisions, regionId).length;
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
