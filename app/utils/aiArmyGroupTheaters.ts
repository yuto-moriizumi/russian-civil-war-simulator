import {
  ActiveCombat,
  Adjacency,
  ArmyGroup,
  CountryId,
  Movement,
  ProductionQueueItem,
  RegionState,
  Relationship,
  Theater,
  DivisionState,
} from '../types/game';
import { generateArmyGroupName } from './armyGroupNaming';
import { detectTheaters } from './theaterDetection';

const AI_ARMY_GROUP_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#84CC16',
];

interface DetectTheatersForCountriesArgs {
  regions: RegionState;
  adjacency: Adjacency;
  countryIds: CountryId[];
  existingTheaters: Theater[];
  relationships: Relationship[];
}

interface SyncAIArmyGroupsArgs {
  aiCountryIds: CountryId[];
  theaters: Theater[];
  armyGroups: ArmyGroup[];
  regions: RegionState;
  divisions: DivisionState;
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  productionQueues: Record<CountryId, ProductionQueueItem[]>;
}

export interface SyncAIArmyGroupsResult {
  armyGroups: ArmyGroup[];
  regions: RegionState;
  divisions: DivisionState;
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  productionQueues: Record<CountryId, ProductionQueueItem[]>;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function detectTheatersForCountries({
  regions,
  adjacency,
  countryIds,
  existingTheaters,
  relationships,
}: DetectTheatersForCountriesArgs): Theater[] {
  const countrySet = new Set(countryIds);
  const preservedTheaters = existingTheaters.filter(theater => !countrySet.has(theater.owner));
  const detectedTheaters = countryIds.flatMap(countryId =>
    detectTheaters(
      regions,
      adjacency,
      countryId,
      existingTheaters.filter(theater => theater.owner === countryId),
      relationships
    )
  );

  return [...preservedTheaters, ...detectedTheaters];
}

function createAIArmyGroup(
  countryId: CountryId,
  theater: Theater | null,
  armyGroups: ArmyGroup[],
  regions: RegionState
): ArmyGroup {
  const countryGroups = armyGroups.filter(group => group.owner === countryId);
  const regionIds = theater
    ? [...theater.frontlineRegions]
    : Object.values(regions)
        .filter(region => region.owner === countryId)
        .map(region => region.id);

  return {
    id: `ai-army-group-${countryId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: generateArmyGroupName(armyGroups, countryId),
    regionIds,
    color: AI_ARMY_GROUP_COLORS[countryGroups.length % AI_ARMY_GROUP_COLORS.length],
    owner: countryId,
    theaterId: theater?.id ?? null,
    mode: 'advance',
  };
}

function replaceDivisionArmyGroupId<T extends { armyGroupId: string }>(
  division: T,
  fromGroupId: string,
  toGroupId: string
): T {
  return division.armyGroupId === fromGroupId
    ? { ...division, armyGroupId: toGroupId }
    : division;
}

function overlapCount(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter(item => rightSet.has(item)).length;
}

export function syncAIArmyGroupsToTheaters({
  aiCountryIds,
  theaters,
  armyGroups,
  regions,
  divisions: baseDivisions,
  movingUnits,
  activeCombats,
  productionQueues,
}: SyncAIArmyGroupsArgs): SyncAIArmyGroupsResult {
  let nextArmyGroups = [...armyGroups];
  const nextRegions = regions;
  let nextDivisions = { ...baseDivisions };
  let nextMovingUnits = movingUnits;
  let nextActiveCombats = activeCombats;
  let nextProductionQueues = productionQueues;

  const aiCountrySet = new Set(aiCountryIds);

  // Reverse index: armyGroupId -> division IDs in regions
  const groupToRegionDivIds = new Map<string, Set<string>>();
  for (const div of Object.values(baseDivisions)) {
    if (div.regionId) {
      let set = groupToRegionDivIds.get(div.armyGroupId);
      if (!set) { set = new Set(); groupToRegionDivIds.set(div.armyGroupId, set); }
      set.add(div.id);
    }
  }

  // Reverse index: armyGroupId -> movement indices
  const groupToMovementIndices = new Map<string, number[]>();
  for (let i = 0; i < movingUnits.length; i++) {
    for (const div of movingUnits[i].divisions) {
      let arr = groupToMovementIndices.get(div.armyGroupId);
      if (!arr) { arr = []; groupToMovementIndices.set(div.armyGroupId, arr); }
      arr.push(i);
    }
  }

  const getCountryGroups = (countryId: CountryId) =>
    nextArmyGroups.filter(group => group.owner === countryId);

  const updateGroup = (groupId: string, update: (group: ArmyGroup) => ArmyGroup) => {
    nextArmyGroups = nextArmyGroups.map(group => group.id === groupId ? update(group) : group);
  };

  const replaceGroupId = (fromGroupId: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;

    // Update divisions in DivisionState
    for (const [divId, div] of Object.entries(nextDivisions)) {
      if (div.armyGroupId === fromGroupId) {
        nextDivisions = { ...nextDivisions, [divId]: { ...div, armyGroupId: toGroupId } };
      }
    }

    // Update only affected movements via reverse index
    const affectedMovements = groupToMovementIndices.get(fromGroupId);
    if (affectedMovements && affectedMovements.length > 0) {
      const newMovingUnits = [...nextMovingUnits];
      const uniqueIndices = [...new Set(affectedMovements)];
      for (const i of uniqueIndices) {
        newMovingUnits[i] = {
          ...newMovingUnits[i],
          divisions: newMovingUnits[i].divisions.map(division =>
            replaceDivisionArmyGroupId(division, fromGroupId, toGroupId)
          ),
        };
      }
      nextMovingUnits = newMovingUnits;
      // Update index
      let toArr = groupToMovementIndices.get(toGroupId);
      if (!toArr) { toArr = []; groupToMovementIndices.set(toGroupId, toArr); }
      toArr.push(...affectedMovements);
      groupToMovementIndices.delete(fromGroupId);
    }

    nextActiveCombats = nextActiveCombats.map(combat => ({
      ...combat,
      attackerDivisions: combat.attackerDivisions.map(division =>
        replaceDivisionArmyGroupId(division, fromGroupId, toGroupId)
      ),
      defenderDivisions: combat.defenderDivisions.map(division =>
        replaceDivisionArmyGroupId(division, fromGroupId, toGroupId)
      ),
    }));

    nextProductionQueues = Object.fromEntries(
      Object.entries(nextProductionQueues).map(([countryId, queue]) => [
        countryId,
        queue.map(item => item.armyGroupId === fromGroupId
          ? { ...item, armyGroupId: toGroupId }
          : item
        ),
      ])
    ) as Record<CountryId, ProductionQueueItem[]>;
  };

  const mergeGroupInto = (fromGroupId: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;
    const fromGroup = nextArmyGroups.find(group => group.id === fromGroupId);
    const toGroup = nextArmyGroups.find(group => group.id === toGroupId);
    if (!fromGroup || !toGroup) return;

    replaceGroupId(fromGroupId, toGroupId);
    nextArmyGroups = nextArmyGroups
      .filter(group => group.id !== fromGroupId)
      .map(group => group.id === toGroupId
        ? { ...group, regionIds: unique([...group.regionIds, ...fromGroup.regionIds]) }
        : group
      );
  };

  const assignFrontlineDivisions = (countryId: CountryId, countryTheaters: Theater[]) => {
    const regionToGroupId = new Map<string, string>();

    for (const theater of countryTheaters) {
      const group = nextArmyGroups.find(candidate =>
        candidate.owner === countryId && candidate.theaterId === theater.id
      );
      if (!group) continue;
      for (const regionId of theater.frontlineRegions) {
        if (!regionToGroupId.has(regionId)) {
          regionToGroupId.set(regionId, group.id);
        }
      }
    }

    if (regionToGroupId.size === 0) return;

    // Update divisions in DivisionState
    for (const [divId, div] of Object.entries(nextDivisions)) {
      if (div.owner === countryId && div.regionId && regionToGroupId.has(div.regionId)) {
        nextDivisions = { ...nextDivisions, [divId]: { ...div, armyGroupId: regionToGroupId.get(div.regionId)! } };
      }
    }

    nextMovingUnits = nextMovingUnits.map(movement => {
      if (movement.owner !== countryId) return movement;
      const groupId = regionToGroupId.get(movement.toRegion) ?? regionToGroupId.get(movement.fromRegion);
      if (!groupId) return movement;

      return {
        ...movement,
        divisions: movement.divisions.map(division =>
          division.owner === countryId ? { ...division, armyGroupId: groupId } : division
        ),
      };
    });

    nextActiveCombats = nextActiveCombats.map(combat => {
      const attackerGroupId = combat.attackerCountry === countryId
        ? regionToGroupId.get(combat.attackerRegionId)
        : undefined;
      const defenderGroupId = combat.defenderCountry === countryId
        ? regionToGroupId.get(combat.defenderRegionId)
        : undefined;

      if (!attackerGroupId && !defenderGroupId) return combat;

      return {
        ...combat,
        attackerDivisions: attackerGroupId
          ? combat.attackerDivisions.map(division =>
              division.owner === countryId ? { ...division, armyGroupId: attackerGroupId } : division
            )
          : combat.attackerDivisions,
        defenderDivisions: defenderGroupId
          ? combat.defenderDivisions.map(division =>
              division.owner === countryId ? { ...division, armyGroupId: defenderGroupId } : division
            )
          : combat.defenderDivisions,
      };
    });
  };

  for (const countryId of aiCountrySet) {
    const countryTheaters = theaters.filter(theater => theater.owner === countryId);

    if (countryTheaters.length === 0) {
      const countryGroups = getCountryGroups(countryId);
      if (countryGroups.length === 0) {
        const defaultGroup = createAIArmyGroup(countryId, null, nextArmyGroups, nextRegions);
        nextArmyGroups = [...nextArmyGroups, defaultGroup];
        continue;
      }
      if (countryGroups.length === 1) {
        countryGroups.forEach(group => {
          if (group.theaterId !== null || group.mode !== 'advance') {
            updateGroup(group.id, current => ({ ...current, theaterId: null, mode: 'advance' }));
          }
        });
        continue;
      }

      const [targetGroup, ...groupsToMerge] = countryGroups;
      updateGroup(targetGroup.id, current => ({ ...current, theaterId: null, mode: 'advance' }));
      groupsToMerge.forEach(group => mergeGroupInto(group.id, targetGroup.id));
      continue;
    }

    const currentTheaterIds = new Set(countryTheaters.map(theater => theater.id));
    const targetGroupIds = new Set<string>();

    for (const theater of countryTheaters) {
      const matchingGroups = getCountryGroups(countryId).filter(group => group.theaterId === theater.id);
      let targetGroup: ArmyGroup | undefined = matchingGroups[0];

      if (!targetGroup) {
        targetGroup = getCountryGroups(countryId).find(group =>
          !targetGroupIds.has(group.id) &&
          (group.theaterId === null || !currentTheaterIds.has(group.theaterId))
        );
      }

      if (!targetGroup) {
        targetGroup = createAIArmyGroup(countryId, theater, nextArmyGroups, nextRegions);
        nextArmyGroups = [...nextArmyGroups, targetGroup];
      }

      updateGroup(targetGroup.id, current => ({
        ...current,
        theaterId: theater.id,
        mode: 'advance',
        regionIds: unique([...current.regionIds, ...theater.frontlineRegions]),
      }));

      matchingGroups
        .filter(group => group.id !== targetGroup.id)
        .forEach(group => mergeGroupInto(group.id, targetGroup.id));

      targetGroupIds.add(targetGroup.id);
    }

    const targetGroups = getCountryGroups(countryId).filter(group => targetGroupIds.has(group.id));
    const extraGroups = getCountryGroups(countryId).filter(group => !targetGroupIds.has(group.id));

    for (const extraGroup of extraGroups) {
      const bestTarget = targetGroups
        .map(group => {
          const theater = countryTheaters.find(candidate => candidate.id === group.theaterId);
          return {
            group,
            score: theater ? overlapCount(extraGroup.regionIds, theater.frontlineRegions) : 0,
          };
        })
        .sort((a, b) => b.score - a.score)[0]?.group ?? targetGroups[0];

      if (bestTarget) {
        mergeGroupInto(extraGroup.id, bestTarget.id);
      }
    }

    assignFrontlineDivisions(countryId, countryTheaters);
  }

  return {
    armyGroups: nextArmyGroups,
    regions: nextRegions,
    divisions: nextDivisions,
    movingUnits: nextMovingUnits,
    activeCombats: nextActiveCombats,
    productionQueues: nextProductionQueues,
  };
}
