import { CountryId } from "../../types/game";

/**
 * Initial unit placement data.
 * Generated and maintained by the Map Tool (/map-tool, Units mode).
 */

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

export const initialArmyGroupDefs: Record<string, ArmyGroupDef[]> = {
  soviet: [{ name: "Red Army Group", color: "#3B82F6" }],
} as Record<CountryId, ArmyGroupDef[]>;

export const initialUnitPlacement: UnitPlacementData = {
  'BY-MI': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'BY-VI': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'EE-57': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-IVA': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-KOS': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-LEN': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-MOS': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-MOW': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-NIZ': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-PSK': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-RYA': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-SMO': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-TVE': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-VLA': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
} as UnitPlacementData;
