import {
  ArmyGroup,
  CountryId,
  DivisionState,
  Movement,
  Relationship,
  Theater,
} from '../../../types/game';

function isAtWarWith(
  countryId: CountryId,
  enemyId: CountryId,
  relationships: Relationship[]
): boolean {
  return relationships.some(
    r =>
      r.type === 'war' &&
      ((r.fromCountry === countryId && r.toCountry === enemyId) ||
        (r.fromCountry === enemyId && r.toCountry === countryId))
  );
}

export function reallocateDivisionsAcrossArmyGroups(
  countryId: CountryId,
  armyGroups: ArmyGroup[],
  divisions: DivisionState,
  movingUnits: Movement[],
  theaters: Theater[],
  relationships: Relationship[]
): DivisionState {
  const countryGroups = armyGroups.filter(g => g.owner === countryId);
  if (countryGroups.length < 2) return divisions;

  const theaterMap = new Map(theaters.map(t => [t.id, t]));

  const groupWeights = countryGroups.map(group => {
    if (!group.theaterId) return { group, weight: 0 };
    const theater = theaterMap.get(group.theaterId);
    if (!theater) return { group, weight: 0 };
    const regionCount = theater.frontlineRegions.length;
    const warBonus = isAtWarWith(countryId, theater.enemyCountry, relationships) ? 10 : 1;
    return { group, weight: regionCount * warBonus };
  });

  const totalWeight = groupWeights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) return divisions;

  const transitIds = new Set(movingUnits.flatMap(m => m.divisionIds));
  const stationaryDivisions = Object.values(divisions).filter(
    d => d.owner === countryId && !transitIds.has(d.id)
  );
  const totalDivisions = stationaryDivisions.length;
  if (totalDivisions === 0) return divisions;

  const targets = groupWeights.map(({ group, weight }) => ({
    group,
    weight,
    target: Math.round((totalDivisions * weight) / totalWeight),
    current: stationaryDivisions.filter(d => d.armyGroupId === group.id).length,
  }));

  // Correct rounding drift
  const targetSum = targets.reduce((sum, t) => sum + t.target, 0);
  const drift = totalDivisions - targetSum;
  if (drift !== 0) {
    const heaviest = targets.reduce((max, t) => (t.weight > max.weight ? t : max), targets[0]);
    heaviest.target += drift;
  }

  // Pool surplus divisions, distribute to deficit groups
  const surplusDivisionIds: string[] = [];
  const deficitGroups: Array<{ groupId: string; need: number }> = [];

  for (const t of targets) {
    const groupDivisions = stationaryDivisions
      .filter(d => d.armyGroupId === t.group.id)
      .map(d => d.id);
    if (t.current > t.target) {
      surplusDivisionIds.push(...groupDivisions.slice(t.target));
    } else if (t.current < t.target) {
      deficitGroups.push({ groupId: t.group.id, need: t.target - t.current });
    }
  }

  if (surplusDivisionIds.length === 0 || deficitGroups.length === 0) return divisions;

  let updatedDivisions = { ...divisions };
  let surplusIdx = 0;

  for (const deficit of deficitGroups) {
    for (let i = 0; i < deficit.need && surplusIdx < surplusDivisionIds.length; i++, surplusIdx++) {
      const divId = surplusDivisionIds[surplusIdx];
      updatedDivisions = {
        ...updatedDivisions,
        [divId]: { ...updatedDivisions[divId], armyGroupId: deficit.groupId },
      };
    }
  }

  return updatedDivisions;
}
