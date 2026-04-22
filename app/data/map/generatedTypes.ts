import type { CountryId } from '../../types/game';

export interface MapDataNotes {
  file?: string;
  regions?: Record<string, string>;
  countries?: Record<string, string>;
  armyGroups?: Record<string, string>;
}

export interface UnitPlacementEntry {
  owner: CountryId;
  armyGroupName: string;
  count: number;
}

export type UnitPlacementData = Record<string, UnitPlacementEntry[]>;

export interface ArmyGroupDef {
  name: string;
  color: string;
}

export interface GeneratedUnitPlacementData {
  schemaVersion: number;
  notes?: MapDataNotes;
  armyGroupDefs: Record<string, ArmyGroupDef[]>;
  placement: UnitPlacementData;
}

export interface GeneratedOwnershipData {
  schemaVersion: number;
  notes?: MapDataNotes;
  ownership: Record<string, CountryId>;
}

export interface GeneratedRegionValuesData {
  schemaVersion: number;
  notes?: MapDataNotes;
  values: Record<string, number>;
}
