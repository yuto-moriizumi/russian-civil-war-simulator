import { CountryId } from '../../types/game';

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
  'austriahungary': [
    { name: 'k.u.k. Armee', color: '#3B82F6' },
    { name: 'Austro-Hungarian Group 2', color: '#10B981' },
  ],
  'serbia': [
    { name: 'Serbian Army Group', color: '#3B82F6' },
  ],
  'soviet': [
    { name: 'Red Army Group', color: '#3B82F6' },
  ],
  'ukraine': [
    { name: 'Ukrainian Army', color: '#3B82F6' },
  ],
  'white': [
    { name: 'Volunteer Army', color: '#3B82F6' },
  ],
} as Record<CountryId, ArmyGroupDef[]>;

export const initialUnitPlacement: UnitPlacementData = {
  'BA-SRP*': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'BY-MI': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'BY-VI': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'EE-57': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'GEO': [
    { owner: 'white', armyGroupName: 'Volunteer Army', count: 1 },
  ],
  'HR-16': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'MNE': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'RO-BR': [
    { owner: 'austriahungary', armyGroupName: 'Austro-Hungarian Group 2', count: 1 },
  ],
  'RO-BZ': [
    { owner: 'austriahungary', armyGroupName: 'Austro-Hungarian Group 2', count: 1 },
  ],
  'RO-CS': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'RO-HR': [
    { owner: 'austriahungary', armyGroupName: 'Austro-Hungarian Group 2', count: 1 },
  ],
  'RO-SV': [
    { owner: 'austriahungary', armyGroupName: 'Austro-Hungarian Group 2', count: 1 },
  ],
  'RO-TM': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'RS-00': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
  'RS-02': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'RS-04': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
  'RS-06': [
    { owner: 'austriahungary', armyGroupName: 'k.u.k. Armee', count: 1 },
  ],
  'RS-07': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
  'RS-08': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
  'RS-16': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
  'RS-18': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
  'RU-IVA': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-KIR': [
    { owner: 'white', armyGroupName: 'Volunteer Army', count: 1 },
  ],
  'RU-KOS': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-LEN': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-ME': [
    { owner: 'white', armyGroupName: 'Volunteer Army', count: 1 },
  ],
  'RU-MOS': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-MOW': [
    { owner: 'soviet', armyGroupName: 'Red Army Group', count: 1 },
  ],
  'RU-NGR': [
    { owner: 'white', armyGroupName: 'Volunteer Army', count: 1 },
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
  'UA-30': [
    { owner: 'ukraine', armyGroupName: 'Ukrainian Army', count: 1 },
  ],
  'XKX': [
    { owner: 'serbia', armyGroupName: 'Serbian Army Group', count: 1 },
  ],
} as UnitPlacementData;
