import {
  AIState,
  ArmyGroup,
  CountryBonuses,
  CountryId,
  DivisionState,
  Movement,
  ProductionQueueItem,
  RegionState,
  ActiveCombat,
} from '../../../types/game';
import { canProduceDivision, clampProductionQueueToCommandPower } from '../../../utils/commandPower';
import { getBaseProductionTime } from '../../../utils/bonusCalculator';
import { countries } from '../../../data/countries';
import { createInitialAIState } from '../aiInitialization';
import { generateAIDivisionName } from '../divisionNaming';

export interface AIProductionRequest {
  divisionName: string;
  targetRegionId: string;
  armyGroupId: string;
}

export interface AIActions {
  divisionsCreated: number;
  productionRequests: AIProductionRequest[];
  updatedAIState: AIState;
  newArmyGroup?: ArmyGroup;
}

function countAssignedDivisions(
  groupId: string,
  divisions: DivisionState,
  movingUnits: Movement[],
  productionQueue: ProductionQueueItem[]
): number {
  const onMap = Object.values(divisions).filter(d => d.armyGroupId === groupId && d.regionId !== null).length;
  const inTransit = movingUnits.reduce(
    (count, movement) => count + movement.divisionIds.filter(id => divisions[id]?.armyGroupId === groupId).length,
    0
  );
  const queued = productionQueue.filter(item => item.armyGroupId === groupId).length;

  return onMap + inTransit + queued;
}

function selectProductionArmyGroup(
  countryId: CountryId,
  divisions: DivisionState,
  regions: RegionState,
  armyGroups: ArmyGroup[],
  movingUnits: Movement[],
  productionQueue: ProductionQueueItem[]
): ArmyGroup | undefined {
  return armyGroups
    .filter(group => group.owner === countryId)
    .sort(
      (a, b) =>
        countAssignedDivisions(a.id, divisions, movingUnits, productionQueue) -
        countAssignedDivisions(b.id, divisions, movingUnits, productionQueue)
    )[0];
}

function pickRandomRegion<T extends { id: string }>(regionList: T[]): T | null {
  if (regionList.length === 0) return null;
  const index = Math.floor(Math.random() * regionList.length);
  return regionList[index];
}

export function runAITick(
  aiState: AIState,
  divisions: DivisionState,
  regions: RegionState,
  armyGroups: ArmyGroup[],
  activeCombats: ActiveCombat[] = [],
  movingUnits: Movement[] = [],
  productionQueue: ProductionQueueItem[] = [],
  productionQueues: Record<CountryId, ProductionQueueItem[]> = {} as Record<CountryId, ProductionQueueItem[]>,
  countryBonuses: CountryBonuses,
  coreRegions?: string[]
): AIActions {
  const { countryId } = aiState;

  let aiArmyGroup = selectProductionArmyGroup(countryId, divisions, regions, armyGroups, movingUnits, productionQueue);
  let newArmyGroup: ArmyGroup | undefined = undefined;

  if (!aiArmyGroup) {
    const ownedRegionIds = Object.values(regions)
      .filter(region => region.owner === countryId)
      .map(r => r.id);

    const nameMap: Record<string, string> = {
      soviet: 'Soviet Army Group',
      white: 'White Army Group',
      finland: 'Finnish Army Group',
      ukraine: 'Ukrainian Army Group',
      fswr: 'Red Guard Army Group',
      romania: 'Romanian Army Group',
      bulgaria: 'Bulgarian Army Group',
    };
    const name = nameMap[countryId] || 'Army Group';

    newArmyGroup = {
      id: `ai-army-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      regionIds: ownedRegionIds,
      color: '#6B7280',
      owner: countryId,
      theaterId: null,
      mode: 'advance',
    };

    aiArmyGroup = newArmyGroup;
  }

  const availableArmyGroups = newArmyGroup ? [...armyGroups, newArmyGroup] : armyGroups;

  const productionRequests: AIProductionRequest[] = [];
  const ownedRegions = Object.values(regions).filter(region => region.owner === countryId);

  const regionsWithActiveCombat = new Set(
    activeCombats.filter(c => !c.isComplete).map(c => c.defenderRegionId)
  );
  const availableRegions = ownedRegions.filter(r => !regionsWithActiveCombat.has(r.id));

  let divisionsCreated = 0;

  if (availableRegions.length === 0) {
    return {
      divisionsCreated: 0,
      productionRequests: [],
      updatedAIState: { countryId },
      newArmyGroup,
    };
  }

  let localQueues: Record<CountryId, ProductionQueueItem[]> = { ...productionQueues };

  while (divisionsCreated < 2) {
    if (!canProduceDivision(countryId, divisions, regions, movingUnits, localQueues, countryBonuses, coreRegions)) {
      break;
    }

    aiArmyGroup = selectProductionArmyGroup(countryId, divisions, regions, availableArmyGroups, movingUnits, localQueues[countryId] ?? []);
    if (!aiArmyGroup) break;

    const groupRegionIds = new Set(aiArmyGroup.regionIds);
    const groupAvailableRegions = availableRegions.filter(region => groupRegionIds.has(region.id));
    const deploymentRegions = groupAvailableRegions.length > 0 ? groupAvailableRegions : availableRegions;

    const targetRegion = pickRandomRegion(deploymentRegions);
    if (!targetRegion) break;

    productionRequests.push({
      divisionName: generateAIDivisionName(countryId, divisions, productionQueue, divisionsCreated),
      targetRegionId: targetRegion.id,
      armyGroupId: aiArmyGroup.id,
    });

    divisionsCreated += 1;

    const placeholder: ProductionQueueItem = {
      id: `ai-pending-${divisionsCreated}`,
      divisionName: '',
      owner: countryId,
      startTime: new Date(),
      completionTime: new Date(),
      targetRegionId: null,
      armyGroupId: aiArmyGroup.id,
    };
    localQueues = {
      ...localQueues,
      [countryId]: [...(localQueues[countryId] ?? []), placeholder],
    };
  }

  return {
    divisionsCreated,
    productionRequests,
    updatedAIState: { countryId },
    newArmyGroup,
  };
}

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
  nextDivisions: DivisionState;
  nextMovingUnits: Movement[];
  nextActiveCombats: ActiveCombat[];
  countryBonuses: Record<CountryId, CountryBonuses>;
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
      country?.coreRegions
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

