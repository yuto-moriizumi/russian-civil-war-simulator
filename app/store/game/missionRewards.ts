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
import { getCountryName, getDivisionPrefix } from '../../data/countries';
import { COUNTRY_METADATA } from '../../data/countryMetadata';
import { calculateCountryBonuses, getDivisionStats } from '../../utils/bonusCalculator';
import { createGameEvent } from '../../utils/eventUtils';
import { applyRelationshipChange, getRelationshipStatus, joinPuppetToOverlordWars } from '../../utils/relationshipUtils';
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
  if (rewards.declareWar) {
    rewardParts.push(`Declare war on ${getCountryName(rewards.declareWar.target)}`);
  }
  return rewardParts.length > 0 ? rewardParts.join(', ') : 'No bonuses';
}

function applyDeclareWarReward(
  reward: MissionRewards['declareWar'],
  declarerId: CountryId,
  relationships: Relationship[],
  dateTime: Date,
): {
  updatedRelationships: Relationship[];
  warEvents: GameEvent[];
} {
  if (!reward || reward.target === declarerId) {
    return { updatedRelationships: relationships, warEvents: [] };
  }

  const targetId = reward.target;
  const hasAutonomy = relationships.some(
    r => (
      (r.fromCountry === declarerId && r.toCountry === targetId) ||
      (r.fromCountry === targetId && r.toCountry === declarerId)
    ) && r.type === 'autonomy'
  );
  if (hasAutonomy) {
    return { updatedRelationships: relationships, warEvents: [] };
  }

  let updatedRelationships = relationships;
  const warEvents: GameEvent[] = [];
  const declarerName = getCountryName(declarerId);
  const targetName = getCountryName(targetId);

  if (getRelationshipStatus(relationships, declarerId, targetId) !== 'war') {
    warEvents.push(createGameEvent(
      'war_declared',
      `${declarerName} declares war against ${targetName}`,
      `${declarerName} has declared war on ${targetName}!`,
      dateTime,
      declarerId,
    ));
  }

  updatedRelationships = applyRelationshipChange(updatedRelationships, declarerId, targetId, 'war');
  updatedRelationships = applyRelationshipChange(updatedRelationships, targetId, declarerId, 'war');

  const servantsOfDeclarer = relationships.filter(
    r => r.fromCountry === declarerId && r.type === 'autonomy'
  );
  servantsOfDeclarer.forEach(servant => {
    if (getRelationshipStatus(relationships, servant.toCountry, targetId) === 'war') return;

    const servantName = getCountryName(servant.toCountry);
    warEvents.push(createGameEvent(
      'war_declared',
      `${servantName} joins war against ${targetName}`,
      `${servantName} joins their Master (${declarerName}) in war against ${targetName}!`,
      dateTime,
      servant.toCountry,
    ));
    updatedRelationships = applyRelationshipChange(updatedRelationships, servant.toCountry, targetId, 'war');
    updatedRelationships = applyRelationshipChange(updatedRelationships, targetId, servant.toCountry, 'war');
  });

  const servantsOfTarget = relationships.filter(
    r => r.fromCountry === targetId && r.type === 'autonomy'
  );
  servantsOfTarget.forEach(servant => {
    if (getRelationshipStatus(relationships, servant.toCountry, declarerId) === 'war') return;

    const servantName = getCountryName(servant.toCountry);
    warEvents.push(createGameEvent(
      'war_declared',
      `${servantName} joins defense against ${declarerName}`,
      `${servantName} joins their Master (${targetName}) to defend against ${declarerName}!`,
      dateTime,
      servant.toCountry,
    ));
    updatedRelationships = applyRelationshipChange(updatedRelationships, servant.toCountry, declarerId, 'war');
    updatedRelationships = applyRelationshipChange(updatedRelationships, declarerId, servant.toCountry, 'war');
  });

  return { updatedRelationships, warEvents };
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
  updatedRelationships = joinPuppetToOverlordWars(
    updatedRelationships,
    overlordId,
    puppetId
  ).updatedRelationships;

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
  const {
    updatedRelationships: relationshipsAfterWar,
    warEvents,
  } = applyDeclareWarReward(
    mission.rewards.declareWar,
    countryId,
    updatedRelationships,
    state.dateTime,
  );

  return {
    updatedCountryBonuses: newCountryBonuses,
    updatedRegions: regionsAfterPuppet,
    updatedMovingUnits,
    updatedRelationships: relationshipsAfterWar,
    updatedArmyGroups,
    updatedAIStates,
    rewardEvents: [...puppetEvents, ...warEvents],
  };
}
