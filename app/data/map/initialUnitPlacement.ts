import { CountryId } from '../../types/game';

/**
 * Initial unit placement data for the map tool.
 *
 * Structure:
 *   regionId -> array of placement entries
 *
 * Each entry describes a number of divisions to place in that region
 * belonging to a specific country and army group (identified by name,
 * since IDs are generated at runtime).
 *
 * Generated and maintained by the Map Tool (/map-tool, Units mode).
 */

export interface UnitPlacementEntry {
  /** Country that owns these divisions */
  owner: CountryId;
  /** Army group name (matched or created at game start) */
  armyGroupName: string;
  /** How many divisions to place */
  count: number;
}

/** Maps region ID -> list of unit placement entries */
export type UnitPlacementData = Record<string, UnitPlacementEntry[]>;

/** Army group definition from the map tool editor */
export interface ArmyGroupDef {
  name: string;
  color: string;
}

/** Army group definitions per country, written by the map tool save */
export const initialArmyGroupDefs: Record<string, ArmyGroupDef[]> = {} as Record<CountryId, ArmyGroupDef[]>;

export const initialUnitPlacement: UnitPlacementData = {};
