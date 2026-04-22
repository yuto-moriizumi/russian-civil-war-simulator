import generatedRegionValues from './generated/regionValues.json';
import type { MapDataNotes } from './generatedTypes';

/**
 * Compatibility wrapper for map-tool generated region economic values.
 * The editable source of truth is app/data/map/generated/regionValues.json.
 */
export const regionValues = generatedRegionValues.values as Record<string, number>;

export const regionValueNotes = generatedRegionValues.notes as MapDataNotes | undefined;
