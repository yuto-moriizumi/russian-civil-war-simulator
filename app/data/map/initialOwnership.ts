import generatedOwnership from './generated/ownership.json';
import type { CountryId } from '../../types/game';
import type { MapDataNotes } from './generatedTypes';

/**
 * Compatibility wrapper for map-tool generated ownership data.
 * The editable source of truth is app/data/map/generated/ownership.json.
 */
export const initialRegionOwnership = generatedOwnership.ownership as Record<string, CountryId>;

export const initialRegionOwnershipNotes = generatedOwnership.notes as MapDataNotes | undefined;
