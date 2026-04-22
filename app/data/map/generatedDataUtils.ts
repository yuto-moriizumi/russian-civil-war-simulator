import type {
  ArmyGroupDef,
  GeneratedOwnershipData,
  GeneratedRegionValuesData,
  GeneratedUnitPlacementData,
  MapDataNotes,
  UnitPlacementData,
} from './generatedTypes';
import type { CountryId } from '../../types/game';

export const MAP_DATA_SCHEMA_VERSION = 1;

export function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  ) as Record<string, T>;
}

function sortOptionalRecord(record?: Record<string, string>): Record<string, string> | undefined {
  if (!record || Object.keys(record).length === 0) {
    return undefined;
  }

  return sortRecord(record);
}

export function normalizeNotes(notes?: MapDataNotes): MapDataNotes | undefined {
  if (!notes) {
    return undefined;
  }

  const normalized: MapDataNotes = {};
  if (typeof notes.file === 'string' && notes.file.trim().length > 0) {
    normalized.file = notes.file;
  }

  normalized.regions = sortOptionalRecord(notes.regions);
  normalized.countries = sortOptionalRecord(notes.countries);
  normalized.armyGroups = sortOptionalRecord(notes.armyGroups);

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function buildGeneratedUnitPlacementData(
  placement: UnitPlacementData,
  armyGroupDefs: Record<CountryId, ArmyGroupDef[]> | Record<string, ArmyGroupDef[]>,
  previousNotes?: MapDataNotes,
  nextNotes?: MapDataNotes
): GeneratedUnitPlacementData {
  const sortedPlacementEntries = Object.entries(placement)
    .filter(([, entries]) => Array.isArray(entries) && entries.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return {
    schemaVersion: MAP_DATA_SCHEMA_VERSION,
    notes: normalizeNotes(nextNotes ?? previousNotes),
    armyGroupDefs: sortRecord(armyGroupDefs),
    placement: Object.fromEntries(sortedPlacementEntries) as UnitPlacementData,
  };
}

export function buildGeneratedOwnershipData(
  ownership: Record<string, CountryId>,
  previousNotes?: MapDataNotes,
  nextNotes?: MapDataNotes
): GeneratedOwnershipData {
  return {
    schemaVersion: MAP_DATA_SCHEMA_VERSION,
    notes: normalizeNotes(nextNotes ?? previousNotes),
    ownership: sortRecord(ownership),
  };
}

export function buildGeneratedRegionValuesData(
  regionValues: Record<string, number>,
  previousNotes?: MapDataNotes,
  nextNotes?: MapDataNotes
): GeneratedRegionValuesData {
  const values = Object.fromEntries(
    Object.entries(regionValues)
      .filter(([, value]) => typeof value === 'number' && value !== 1)
      .sort(([a], [b]) => a.localeCompare(b))
  ) as Record<string, number>;

  return {
    schemaVersion: MAP_DATA_SCHEMA_VERSION,
    notes: normalizeNotes(nextNotes ?? previousNotes),
    values,
  };
}

export function countPlacedDivisions(placement: UnitPlacementData): number {
  return Object.values(placement).reduce(
    (sum, entries) => sum + entries.reduce((entrySum, entry) => entrySum + entry.count, 0),
    0
  );
}
