import { Country } from '../types/game';
import { countries as countriesFromMetadata } from './countries';

/**
 * Game start date: November 20, 1917
 * This date marks the declaration of the Ukrainian People's Republic
 */
export const GAME_START_DATE = new Date(1917, 10, 20);

/**
 * Countries configuration
 * This is now imported from the centralized countries.ts file
 */
export const countries: Country[] = countriesFromMetadata as Country[];

/**
 * Initial missions configuration
 * This is imported from the centralized missions directory
 */
export { initialMissions } from './missions';
