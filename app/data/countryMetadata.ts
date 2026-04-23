/**
 * Centralized country configuration
 * This is the single source of truth for all country-related metadata.
 * Data is stored in countryMetadata.json; this file provides type definitions and the loader.
 */

import rawData from './countryMetadata.json';

export interface CountryMetadata {
  id: string;
  /** Historical/game notes (preserved from original source comments) */
  comment?: string;
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
  /** Whether this country can be selected by players (defaults to true) */
  selectable?: boolean;
  /** Core regions that belong to this country */
  coreRegions?: string[];
}

/**
 * Complete country metadata registry
 */
export const COUNTRY_METADATA = rawData satisfies Record<string, CountryMetadata>;

/**
 * Helper function to get all country IDs with proper typing
 * This is used throughout the codebase to iterate over countries
 */
export function getAllCountryIds(): (keyof typeof COUNTRY_METADATA)[] {
  return Object.keys(COUNTRY_METADATA) as (keyof typeof COUNTRY_METADATA)[];
}
