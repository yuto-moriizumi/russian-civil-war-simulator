import { CountryId } from '../types/game';
import { COUNTRY_METADATA, CountryMetadata } from './countryMetadata';

export type { CountryMetadata };
export { COUNTRY_METADATA };

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

/** Get all countries that consider a specific region as a core region */
export function getCountriesWithCoreRegion(regionId: string): CountryId[] {
  const countries: CountryId[] = [];
  
  for (const [countryId, metadata] of Object.entries(COUNTRY_METADATA)) {
    if (metadata.coreRegions?.includes(regionId)) {
      countries.push(countryId as CountryId);
    }
  }
  
  return countries;
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
export const COUNTRY_FLAGS: Record<CountryId, string> = Object.fromEntries(
  Object.values(COUNTRY_METADATA).map(meta => [meta.id, meta.flag])
) as Record<CountryId, string>;

/**
 * Countries array for backward compatibility
 * This is derived from COUNTRY_METADATA and maintains compatibility with existing code
 */
export const countries = Object.values(COUNTRY_METADATA).map(meta => ({
  id: meta.id,
  name: meta.name,
  flag: meta.flag,
  color: meta.color,
  selectable: meta.selectable,
  coreRegions: meta.coreRegions,
}));
