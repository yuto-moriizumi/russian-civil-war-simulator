import {
  AIState,
  ArmyGroup,
  CountryId,
  GameEvent,
  Mission,
  MissionRewards,
  RegionState,
  Relationship,
} from '../../types/game';
import { createInitialAIArmyGroup, createInitialAIState } from '../../ai/cpuPlayer';
import { createDivision } from '../../utils/combat';
import { getDivisionPrefix } from '../../data/countries';
import { COUNTRY_METADATA } from '../../data/countryMetadata';
import { calculateCountryBonuses, getDivisionStats } from '../../utils/bonusCalculator';
import { createGameEvent } from '../../utils/eventUtils';
import type { GameStore } from './types';

export function buildMissionRewardDescription(rewards: MissionRewards): string {
  const rewardParts: string[] = [];
  if (rewards.attackBonus) rewardParts.push(`+${rewards.attackBonus} Attack`);
  if (rewards.defenceBonus) rewardParts.push(`+${rewards.defenceBonus} Defence`);
  if (rewards.hpBonus) rewardParts.push(`+${rewards.hpBonus} HP`);
  if (rewards.commandPowerBonus) rewardParts.push(`+${rewards.commandPowerBonus} Command Power`);
  if (rewards.productionSpeedBonus) {
    const percentReduction = Math.round(rewards.productionSpeedBonus * 100);
    rewardParts.push(`+${percentReduction}% Production Speed`);
  }
  if (rewards.liberatePuppet) {
    rewardParts.push(`Liberate ${rewards.liberatePuppet.country} as puppet`);
  }
  return rewardParts.length > 0 ? rewardParts.join(', ') : 'No bonuses';
}

export function applyLiberatePuppet(
  reward: MissionRewards['liberatePuppet'],
  overlordId: CountryId,
  state: Pick<GameStore, 'relationships' | 'armyGroups' | 'aiStates' | 'selectedCountry' | 'countryBonuses' | 'dateTime'>,
  regions: RegionState,
): {
  updatedRelationships: Relationship[];
  updatedRegions: RegionState;
  updatedArmyGroups: ArmyGroup[];
  updatedAIStates: AIState[];
  puppetEvents: GameEvent[];
} {
  if (!reward) {
    return {
      updatedRelationships: [...state.relationships],
      updatedRegions: regions,
      updatedArmyGroups: state.armyGroups,
      updatedAIStates: state.aiStates,
      puppetEvents: [],
    };
  }
  const { country: puppetId, spawnRegionId, divisions: divisionCount } = reward;
  let updatedRelationships: Relationship[] = [
    ...state.relationships.filter(r => !(r.fromCountry === overlordId && r.toCountry === puppetId)),
    { fromCountry: overlordId, toCountry: puppetId, type: 'autonomy' as const },
  ];

  // Auto-join overlord's existing wars.
  const overlordWars = state.relationships.filter(
    r => r.fromCountry === overlordId && r.type === 'war'
  );
  for (const war of overlordWars) {
    const enemy = war.toCountry;
    if (enemy === puppetId) continue;
    const alreadyAtWar = updatedRelationships.some(
      r => r.fromCountry === puppetId && r.toCountry === enemy && r.type === 'war'
    );
    if (!alreadyAtWar) {
      updatedRelationships = [
        ...updatedRelationships,
        { fromCountry: puppetId, toCountry: enemy, type: 'war' as const },
        { fromCountry: enemy, toCountry: puppetId, type: 'war' as const },
      ];
    }
  }

  const updatedRegions = { ...regions };

  // Transfer core regions currently owned by the overlord to the puppet.
  const puppetCoreRegions = COUNTRY_METADATA[puppetId as keyof typeof COUNTRY_METADATA]?.coreRegions ?? [];
  for (const regionId of puppetCoreRegions) {
    const region = updatedRegions[regionId];
    if (region && region.owner === overlordId) {
      updatedRegions[regionId] = { ...region, owner: puppetId };
    }
  }

  let updatedArmyGroups = [...state.armyGroups];
  let puppetArmyGroup = updatedArmyGroups.find(g => g.owner === puppetId);
  if (!puppetArmyGroup) {
    puppetArmyGroup = createInitialAIArmyGroup(puppetId, updatedRegions);
    updatedArmyGroups = [...updatedArmyGroups, puppetArmyGroup];
  } else if (puppetArmyGroup.mode === 'none') {
    puppetArmyGroup = { ...puppetArmyGroup, mode: 'advance' };
    updatedArmyGroups = updatedArmyGroups.map(group =>
      group.id === puppetArmyGroup!.id ? puppetArmyGroup! : group
    );
  }

  const puppetBonuses = state.countryBonuses[puppetId];
  const spawnRegion = updatedRegions[spawnRegionId];
  if (spawnRegion && puppetBonuses) {
    const prefix = getDivisionPrefix(puppetId);
    const newDivisions = Array.from({ length: divisionCount }, (_, i) =>
      createDivision(puppetId, `${prefix} ${i + 1}`, puppetArmyGroup.id, puppetBonuses)
    );
    updatedRegions[spawnRegionId] = { ...spawnRegion, divisions: [...spawnRegion.divisions, ...newDivisions] };
  }

  const updatedAIStates = state.aiStates.some(aiState => aiState.countryId === puppetId) ||
    state.selectedCountry?.id === puppetId
    ? state.aiStates
    : [...state.aiStates, createInitialAIState(puppetId)];

  const puppetEvents: GameEvent[] = [
    createGameEvent(
      'mission_claimed',
      `${puppetId} Liberated`,
      `The Ukrainian People's Republic of Soviets has been established as a puppet state!`,
      state.dateTime,
      overlordId,
    ),
  ];

  return { updatedRelationships, updatedRegions, updatedArmyGroups, updatedAIStates, puppetEvents };
}

export function applyClaimedMissionRewards(
  state: Pick<GameStore, 'regions' | 'movingUnits' | 'relationships' | 'armyGroups' | 'aiStates' | 'selectedCountry' | 'countryBonuses' | 'dateTime'>,
  mission: Mission,
  countryId: CountryId,
  updatedMissions: Mission[],
) {
  const newCountryBonuses = calculateCountryBonuses(updatedMissions, countryId);
  const newDivisionStats = getDivisionStats(countryId, newCountryBonuses);

  const updatedRegions: RegionState = {};
  Object.keys(state.regions).forEach(regionId => {
    const region = state.regions[regionId];
    const updatedDivisions = region.divisions.map(div => {
      if (div.owner !== countryId) return div;
      return {
        ...div,
        attack: newDivisionStats.attack,
        defence: newDivisionStats.defence,
        maxHp: newDivisionStats.maxHp,
        hp: Math.min(div.hp, newDivisionStats.maxHp),
      };
    });

    updatedRegions[regionId] = {
      ...region,
      divisions: updatedDivisions,
    };
  });

  const updatedMovingUnits = state.movingUnits.map(movement => {
    if (movement.owner !== countryId) return movement;
    return {
      ...movement,
      divisions: movement.divisions.map(div => ({
        ...div,
        attack: newDivisionStats.attack,
        defence: newDivisionStats.defence,
        maxHp: newDivisionStats.maxHp,
        hp: Math.min(div.hp, newDivisionStats.maxHp),
      })),
    };
  });

  const {
    updatedRelationships,
    updatedRegions: regionsAfterPuppet,
    updatedArmyGroups,
    updatedAIStates,
    puppetEvents,
  } = applyLiberatePuppet(mission.rewards.liberatePuppet, countryId, state, updatedRegions);

  return {
    updatedCountryBonuses: newCountryBonuses,
    updatedRegions: regionsAfterPuppet,
    updatedMovingUnits,
    updatedRelationships,
    updatedArmyGroups,
    updatedAIStates,
    puppetEvents,
  };
}
