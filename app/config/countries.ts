import { CountryId } from '../types/game';

/**
 * Centralized country configuration
 * This is the single source of truth for all country-related metadata
 */

export interface CountryMetadata {
  id: CountryId;
  /** Official/full country name */
  name: string;
  /** Display name for combat contexts (short, action-oriented) */
  combatName: string;
  /** Flag image path */
  flag: string;
  /** Primary color (hex) */
  color: string;
  /** Short adjective form (e.g., "Finnish", "Soviet") */
  adjective: string;
  /** First army group name */
  firstArmyGroupName: string;
  /** Division name prefix */
  divisionPrefix: string;
}

/**
 * Complete country metadata registry
 */
export const COUNTRY_METADATA: Record<CountryId, CountryMetadata> = {
  soviet: {
    id: 'soviet',
    name: 'Soviet Russia',
    combatName: 'Red Army',
    flag: '/images/flags/soviet.svg',
    color: '#CC0000',
    adjective: 'Soviet',
    firstArmyGroupName: 'Red Army Group',
    divisionPrefix: 'Red Guard',
  },
  white: {
    id: 'white',
    name: 'White Army',
    combatName: 'White Army',
    flag: '/images/flags/white.svg',
    color: '#0d3b0d',
    adjective: 'White',
    firstArmyGroupName: 'Volunteer Army',
    divisionPrefix: 'White Guard',
  },
  finland: {
    id: 'finland',
    name: 'Finland',
    combatName: 'Finnish Army',
    flag: '/images/flags/finland.svg',
    color: '#FFFFFF',
    adjective: 'Finnish',
    firstArmyGroupName: 'Finnish Defense Forces',
    divisionPrefix: 'Finnish Guard',
  },
  ukraine: {
    id: 'ukraine',
    name: 'Ukraine',
    combatName: 'Ukrainian Army',
    flag: '/images/flags/ukraine.svg',
    color: '#0057B7',
    adjective: 'Ukrainian',
    firstArmyGroupName: 'Ukrainian Army',
    divisionPrefix: 'Ukrainian Guard',
  },
  don: {
    id: 'don',
    name: 'Don Republic',
    combatName: 'Don Cossacks',
    flag: '/images/flags/don.svg',
    color: '#FFD700',
    adjective: 'Don',
    firstArmyGroupName: 'Don Cossack Host',
    divisionPrefix: 'Don Cossack',
  },
  fswr: {
    id: 'fswr',
    name: "Finnish Socialist Workers' Republic",
    combatName: 'Red Guards',
    flag: '/images/flags/fswr.svg',
    color: '#CC0000',
    adjective: 'Red Guard',
    firstArmyGroupName: 'Red Guard Army Group',
    divisionPrefix: 'Red Guard',
  },
  iskolat: {
    id: 'iskolat',
    name: 'Iskolat (Latvian Soviet Republic)',
    combatName: 'Red Latvian Riflemen',
    flag: '/images/flags/iskolat.svg',
    color: '#8B0000',
    adjective: 'Iskolat',
    firstArmyGroupName: 'Red Latvian Riflemen',
    divisionPrefix: 'Latvian Guard',
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    combatName: 'Neutral Forces',
    flag: '',
    color: '#808080',
    adjective: 'Independent',
    firstArmyGroupName: '1st Army',
    divisionPrefix: 'Militia',
  },
  foreign: {
    id: 'foreign',
    name: 'Foreign',
    combatName: 'Foreign Forces',
    flag: '',
    color: '#4A90D9',
    adjective: 'Foreign',
    firstArmyGroupName: 'Expeditionary Force',
    divisionPrefix: 'Foreign Legion',
  },
  germany: {
    id: 'germany',
    name: 'German Empire',
    combatName: 'Imperial German Army',
    flag: '/images/flags/germany.svg',
    color: '#1a1a1a',
    adjective: 'German',
    firstArmyGroupName: 'Imperial German Army',
    divisionPrefix: 'German Guard',
  },
  poland: {
    id: 'poland',
    name: 'Kingdom of Poland',
    combatName: 'Polnische Wehrmacht',
    flag: '/images/flags/poland.svg',
    color: '#DC143C',
    adjective: 'Polish',
    firstArmyGroupName: 'Polnische Wehrmacht',
    divisionPrefix: 'Polish Guard',
  },
};

/**
 * Utility functions for accessing country metadata
 */

/** Get the full display name of a country */
export function getCountryName(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.name || countryId;
}

/** Get the combat/military name of a country (used in battle contexts) */
export function getCountryCombatName(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.combatName || countryId;
}

/** Get the country color (hex code) */
export function getCountryColor(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.color || '#808080';
}

/** Get the country flag path */
export function getCountryFlag(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.flag || '';
}

/** Get the country adjective form (e.g., "Finnish", "Soviet") */
export function getCountryAdjective(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.adjective || countryId;
}

/** Get the first army group name for a country */
export function getFirstArmyGroupName(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.firstArmyGroupName || '1st Army';
}

/** Get the division name prefix for a country */
export function getDivisionPrefix(countryId: CountryId): string {
  return COUNTRY_METADATA[countryId]?.divisionPrefix || 'Division';
}

/**
 * Legacy exports for backward compatibility
 */

/** Map of country IDs to display names */
export const COUNTRY_NAMES: Record<CountryId, string> = Object.fromEntries(
  Object.values(COUNTRY_METADATA).map(meta => [meta.id, meta.name])
) as Record<CountryId, string>;

/** Map of country IDs to colors */
export const COUNTRY_COLORS: Record<CountryId, string> = Object.fromEntries(
  Object.values(COUNTRY_METADATA).map(meta => [meta.id, meta.color])
) as Record<CountryId, string>;

/** Map of country IDs to flag paths */
export const FACTION_FLAGS: Record<CountryId, string> = Object.fromEntries(
  Object.values(COUNTRY_METADATA).map(meta => [meta.id, meta.flag])
) as Record<CountryId, string>;
