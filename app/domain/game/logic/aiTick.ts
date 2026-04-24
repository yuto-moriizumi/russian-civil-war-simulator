import { AIState, ArmyGroup, CountryId, CountryBonuses, ProductionQueueItem, RegionState, ActiveCombat, Movement, Modifier } from '../../../types/game';
import { createInitialAIState, runAITick } from '../../../ai/cpuPlayer';
import { clampProductionQueueToCommandPower } from '../../../utils/commandPower';
import { getBaseProductionTime } from '../bonusCalculator';
import { countries } from '../../../data/gameData';

export function hasOwnershipChangedForCountries(
  countryIds: Set<CountryId>,
  prevRegions: RegionState,
  nextRegions: RegionState
): boolean {
  for (const regionId of Object.keys(nextRegions)) {
    const prevOwner = prevRegions[regionId]?.owner;
    const nextOwner = nextRegions[regionId]?.owner;
    if (prevOwner !== nextOwner && (countryIds.has(prevOwner as CountryId) || countryIds.has(nextOwner as CountryId))) {
      return true;
    }
  }
  return false;
}

export function initializeAIStatesForNewCountries(
  aiStates: AIState[],
  regions: RegionState,
  playerCountryId: CountryId | undefined
): AIState[] {
  const excluded = new Set<CountryId>(['neutral' as CountryId, 'foreign' as CountryId]);
  const known = new Set(aiStates.map(s => s.countryId));
  const newStates: AIState[] = [];
  Object.values(regions).forEach(region => {
    if (!known.has(region.owner) && region.owner !== playerCountryId && !excluded.has(region.owner)) {
      known.add(region.owner);
      newStates.push(createInitialAIState(region.owner));
    }
  });
  return newStates.length > 0 ? [...aiStates, ...newStates] : aiStates;
}

export function getEffectiveAIStates(
  aiStates: AIState[],
  playerCountryId: CountryId | undefined,
  isPlayerAIEnabled: boolean
): AIState[] {
  if (!playerCountryId) return aiStates;
  const nonPlayerAIStates = aiStates.filter(s => s.countryId !== playerCountryId);
  if (!isPlayerAIEnabled) return nonPlayerAIStates;
  const existing = aiStates.find(s => s.countryId === playerCountryId);
  return [...nonPlayerAIStates, existing ?? createInitialAIState(playerCountryId)];
}

interface ProcessAITickArgs {
  effectiveAIStates: AIState[];
  nextArmyGroups: ArmyGroup[];
  nextProductionQueues: Record<CountryId, ProductionQueueItem[]>;
  nextRegions: RegionState;
  nextDivisions: import('../../../types/game').DivisionState;
  nextMovingUnits: Movement[];
  nextActiveCombats: ActiveCombat[];
  countryBonuses: Record<CountryId, CountryBonuses>;
  modifiers: Record<CountryId, Modifier[]>;
  newDate: Date;
  selectedCountryId: CountryId | undefined;
}

interface ProcessAITickResult {
  nextAIStates: AIState[];
  nextArmyGroups: ArmyGroup[];
  nextProductionQueues: Record<CountryId, ProductionQueueItem[]>;
}

export function processAITick({
  effectiveAIStates,
  nextArmyGroups: initialArmyGroups,
  nextProductionQueues: initialQueues,
  nextRegions,
  nextDivisions,
  nextMovingUnits,
  nextActiveCombats,
  countryBonuses,
  modifiers,
  newDate,
  selectedCountryId,
}: ProcessAITickArgs): ProcessAITickResult {
  let nextArmyGroups = initialArmyGroups;
  let nextProductionQueues = initialQueues;

  const nextAIStates = effectiveAIStates.map(aiState => {
    const country = countries.find(c => c.id === aiState.countryId);
    const bonuses = countryBonuses[aiState.countryId];
    const trimmedQueue = clampProductionQueueToCommandPower(
      aiState.countryId,
      nextProductionQueues[aiState.countryId] || [],
      nextDivisions,
      nextRegions,
      nextMovingUnits,
      bonuses,
      country?.coreRegions,
      modifiers?.[aiState.countryId]
    );
    if (trimmedQueue !== nextProductionQueues[aiState.countryId]) {
      nextProductionQueues = { ...nextProductionQueues, [aiState.countryId]: trimmedQueue };
    }

    const aiActions = runAITick(
      aiState,
      nextDivisions,
      nextRegions,
      nextArmyGroups,
      nextActiveCombats,
      nextMovingUnits,
      nextProductionQueues[aiState.countryId] || [],
      nextProductionQueues,
      bonuses,
      country?.coreRegions
    );

    if (aiActions.newArmyGroup) {
      nextArmyGroups = [...nextArmyGroups, aiActions.newArmyGroup];
    }

    if (aiActions.productionRequests.length > 0) {
      const countryQueue = [...(nextProductionQueues[aiState.countryId] || [])];
      const productionTimeHours = getBaseProductionTime(bonuses);
      aiActions.productionRequests.forEach(req => {
        const completionTime = new Date(newDate.getTime() + productionTimeHours * 60 * 60 * 1000);
        countryQueue.push({
          id: `prod-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          divisionName: req.divisionName,
          owner: aiState.countryId,
          startTime: newDate,
          completionTime,
          targetRegionId: req.targetRegionId,
          armyGroupId: req.armyGroupId,
        });
      });
      nextProductionQueues = { ...nextProductionQueues, [aiState.countryId]: countryQueue };
    }

    return aiActions.updatedAIState;
  }).filter(s => s.countryId !== selectedCountryId);

  return { nextAIStates, nextArmyGroups, nextProductionQueues };
}
