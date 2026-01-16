import { ArmyGroup, CountryId } from '../types/game';

/**
 * Army group naming hierarchy following historical conventions:
 * - Army Groups: Major formations (e.g., "Army Group North")
 * - Armies: Regional commands (e.g., "1st Army", "Southern Army")
 * - Corps: Smaller formations (e.g., "I Corps", "Guard Corps")
 */

const ORDINAL_NAMES = [
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th'
];

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
];

const GEOGRAPHIC_DIRECTIONS = ['Northern', 'Southern', 'Eastern', 'Western', 'Central'];

const ELITE_NAMES = [
  'Guards', 'Elite', 'Shock', 'Volunteer', 'Cavalry', 'Cossack', 'Siberian', 'Caucasian'
];

/**
 * Generate a systematic army group name based on existing groups and theater context
 */
export function generateArmyGroupName(
  existingGroups: ArmyGroup[],
  playerCountry: CountryId
): string {
  // Filter groups belonging to the same country
  const playerGroups = existingGroups.filter(g => g.owner === playerCountry);
  
  // Determine naming style based on number of existing groups
  const groupCount = playerGroups.length;
  
  if (groupCount === 0) {
    // First group - use country-specific name
    return getFirstGroupName(playerCountry);
  } else if (groupCount < 5) {
    // Early groups - use ordinal armies
    return `${ORDINAL_NAMES[groupCount]} Army`;
  } else if (groupCount < 10) {
    // Mid-game - use geographic armies
    const usedDirections = new Set(
      playerGroups.map(g => g.name.split(' ')[0]).filter(d => GEOGRAPHIC_DIRECTIONS.includes(d))
    );
    const availableDirection = GEOGRAPHIC_DIRECTIONS.find(d => !usedDirections.has(d));
    
    if (availableDirection) {
      return `${availableDirection} Army Group`;
    }
    // Fallback to numbered
    return `${ORDINAL_NAMES[groupCount % ORDINAL_NAMES.length]} Army`;
  } else if (groupCount < 20) {
    // Late game - use corps with roman numerals
    const corpsNumber = groupCount - 9;
    return `${ROMAN_NUMERALS[corpsNumber - 1]} Corps`;
  } else {
    // Very late game - use elite/special names
    const eliteIndex = groupCount % ELITE_NAMES.length;
    const suffix = Math.floor(groupCount / ELITE_NAMES.length);
    return suffix > 1 
      ? `${ORDINAL_NAMES[suffix - 1]} ${ELITE_NAMES[eliteIndex]} Corps`
      : `${ELITE_NAMES[eliteIndex]} Corps`;
  }
}

/**
 * Get the default name for the first army group based on country
 */
function getFirstGroupName(country: CountryId): string {
  const names: Record<CountryId, string> = {
    white: 'Volunteer Army',
    soviet: 'Red Army Group',
    finland: 'Finnish Defense Forces',
    ukraine: 'Ukrainian Army',
    don: 'Don Cossack Host',
    fswr: 'Red Guard Army Group',
    iskolat: 'Red Latvian Riflemen',
    neutral: '1st Army',
    foreign: 'Expeditionary Force',
  };
  return names[country] || '1st Army';
}

/**
 * Generate a name with a specific prefix (for custom naming)
 */
export function generateNumberedName(
  baseName: string,
  existingGroups: ArmyGroup[],
  playerCountry: CountryId
): string {
  const playerGroups = existingGroups.filter(g => g.owner === playerCountry);
  const existingWithBase = playerGroups.filter(g => g.name.includes(baseName));
  
  if (existingWithBase.length === 0) {
    return baseName;
  }
  
  // Find next available number
  const numbers = existingWithBase
    .map(g => {
      const match = g.name.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${nextNumber}${getOrdinalSuffix(nextNumber)} ${baseName}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
