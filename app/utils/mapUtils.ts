import { Adjacency, CountryId, RegionState, Movement, ArmyGroup, Division, ActiveCombat, DivisionState } from '../types/game';
import { DIVISIONS_PER_STATE } from './commandPower';
import { regionValues } from '../data/map/regionValues';
import { initialRegionOwnership } from '../data/map';
import { COUNTRY_COLORS } from '../data/countries';
import { UnitPlacementData } from '../data/map/initialUnitPlacement';
import { generateDivisionId } from '../domain/game/combat';
import { getInitialCountryBonuses, getDivisionStats } from '../domain/game/bonusCalculator';
import { COUNTRY_METADATA } from '../data/countryMetadata';

interface ArmyGroupDef {
  name: string;
  color: string;
}

/**
 * Given the placement data + army group definitions, create ArmyGroup records
 * and populate regions with the corresponding Division objects.
 *
 * Called by useMapData after createInitialOwnership to pre-populate units.
 */
export function applyInitialUnitPlacement(
  regions: RegionState,
  placement: UnitPlacementData,
  armyGroupDefs: Record<string, ArmyGroupDef[]>
): { regions: RegionState; armyGroups: ArmyGroup[]; divisions: DivisionState } {
  const armyGroupMap = new Map<string, ArmyGroup>();

  for (const [countryId, groups] of Object.entries(armyGroupDefs)) {
    for (const def of groups) {
      const key = `${countryId}::${def.name}`;
      armyGroupMap.set(key, {
        id: `initial-${countryId}-${def.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: def.name,
        regionIds: [],
        color: def.color,
        owner: countryId as CountryId,
        theaterId: null,
        mode: 'none',
      });
    }
  }

  const updatedRegions: RegionState = {};
  for (const [id, region] of Object.entries(regions)) {
    updatedRegions[id] = { ...region };
  }

  const divisions: DivisionState = {};

  for (const [regionId, entries] of Object.entries(placement)) {
    const region = updatedRegions[regionId];
    if (!region) continue;

    for (const entry of entries) {
      const owner = entry.owner as CountryId;
      const key = `${owner}::${entry.armyGroupName}`;

      if (!armyGroupMap.has(key)) {
        armyGroupMap.set(key, {
          id: `initial-${owner}-${entry.armyGroupName.replace(/\s+/g, '-').toLowerCase()}`,
          name: entry.armyGroupName,
          regionIds: [],
          color: '#3B82F6',
          owner,
          theaterId: null,
          mode: 'none',
        });
      }

      const armyGroup = armyGroupMap.get(key)!;

      if (!armyGroup.regionIds.includes(regionId)) {
        armyGroup.regionIds.push(regionId);
      }

      const initialBonuses = getInitialCountryBonuses();
      const stats = getDivisionStats(owner, initialBonuses);
      const meta = COUNTRY_METADATA[owner];
      const prefix = meta?.divisionPrefix ?? owner;

      for (let i = 0; i < entry.count; i++) {
        const division: Division = {
          id: generateDivisionId(),
          name: `${prefix} ${i + 1}`,
          owner,
          armyGroupId: armyGroup.id,
          hp: stats.maxHp,
          maxHp: stats.maxHp,
          attack: stats.attack,
          defence: stats.defence,
          regionId,
        };
        divisions[division.id] = division;
      }
    }
  }

  const armyGroups = Array.from(armyGroupMap.values());
  return { regions: updatedRegions, armyGroups, divisions };
}

export { COUNTRY_COLORS };

export function canMoveTo(adjacency: Adjacency, from: string, to: string): boolean {
  return adjacency[from]?.includes(to) ?? false;
}

export function getAdjacentRegions(adjacency: Adjacency, regionId: string): string[] {
  return adjacency[regionId] ?? [];
}

export function getRegionsByCountry(regions: RegionState, country: CountryId): string[] {
  return Object.entries(regions)
    .filter(([, region]) => region.owner === country)
    .map(([id]) => id);
}

export function countCountryUnits(divisions: DivisionState, country: CountryId): number {
  return Object.values(divisions).filter(d => d.owner === country).length;
}

export function getArmyGroupUnitCount(
  _regionIds: string[],
  _regions: RegionState,
  country: CountryId,
  armyGroupId: string,
  _movingUnits: Movement[] = [],
  activeCombats: ActiveCombat[] = [],
  divisions: DivisionState = {}
): number {
  const unitsInRegions = Object.values(divisions).filter(
    d => d.armyGroupId === armyGroupId && d.owner === country && d.regionId !== null
  ).length;

  const seenCombatDivIds = new Set<string>();
  activeCombats
    .filter(c => !c.isComplete)
    .forEach(combat => {
      if (combat.attackerCountry === country) {
        combat.attackerDivisionIds
          .filter(id => divisions[id]?.armyGroupId === armyGroupId)
          .forEach(id => seenCombatDivIds.add(id));
      }
      if (combat.defenderCountry === country) {
        combat.defenderDivisionIds
          .filter(id => divisions[id]?.armyGroupId === armyGroupId)
          .forEach(id => seenCombatDivIds.add(id));
      }
    });

  return unitsInRegions + seenCombatDivIds.size;
}

export function calculateCountryIncome(divisions: DivisionState, regions: RegionState, country: CountryId): number {
  const grossIncome = Object.entries(regions)
    .filter(([, region]) => region.owner === country)
    .reduce((total, [id, ]) => total + (regionValues[id] ?? DIVISIONS_PER_STATE), 0);

  const unitCount = Object.values(divisions).filter(d => d.owner === country).length;
  const maintenanceCost = unitCount;

  return grossIncome - maintenanceCost;
}

export function initializeRegionState(
  features: GeoJSON.Feature[],
  defaultOwner: CountryId = 'neutral'
): RegionState {
  const state: RegionState = {};

  for (const feature of features) {
    const props = feature.properties;
    if (!props) continue;

    const id = feature.id as string;
    if (!id) continue;

    state[id] = {
      id,
      name: props.shapeName || props.name || id,
      countryIso3: props.countryIso3 || props.shapeGroup || 'UNK',
      owner: defaultOwner,
    };
  }

  return state;
}

export function createInitialOwnership(
  features: GeoJSON.Feature[]
): RegionState {
  const state: RegionState = {};

  for (const feature of features) {
    const props = feature.properties;
    if (!props) continue;

    const id = feature.id as string;
    if (!id) continue;

    const countryIso3 = props.countryIso3 || props.shapeGroup || 'UNK';
    const owner = initialRegionOwnership[id] ?? 'neutral';

    state[id] = {
      id,
      name: props.shapeName || props.name || id,
      countryIso3,
      owner,
    };
  }

  return state;
}

export function generateOwnershipColorExpression(
  regions: RegionState
): unknown[] {
  const regionIdExpression = ['id'];

  const expression: unknown[] = ['match', regionIdExpression];

  for (const [id, region] of Object.entries(regions)) {
    expression.push(id, COUNTRY_COLORS[region.owner]);
  }

  expression.push(COUNTRY_COLORS.neutral);

  return expression;
}
