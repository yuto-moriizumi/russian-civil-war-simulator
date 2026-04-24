import type { CountryId, Relationship, RelationshipType } from '../../types/game';

/**
 * Returns the overlord (suzerain) of a country, or null if none.
 */
export function getOverlord(
  countryId: CountryId,
  relationships: Relationship[],
): CountryId | null {
  for (const r of relationships) {
    if (r.type === 'autonomy' && r.toCountry === countryId) {
      return r.fromCountry;
    }
  }
  return null;
}

/**
 * Returns true if two countries share the same overlord (suzerain).
 * Used to grant automatic military access between co-vassals.
 */
export function shareSameOverlord(
  countryA: CountryId,
  countryB: CountryId,
  relationships: Relationship[],
): boolean {
  const overlordA = getOverlord(countryA, relationships);
  const overlordB = getOverlord(countryB, relationships);
  return overlordA !== null && overlordA === overlordB;
}

export function getRelationshipStatus(
  relationships: Relationship[],
  fromCountry: CountryId,
  toCountry: CountryId,
): RelationshipType {
  return relationships.find(
    r => r.fromCountry === fromCountry && r.toCountry === toCountry
  )?.type ?? 'neutral';
}

export function applyRelationshipChange(
  relationships: Relationship[],
  fromCountry: CountryId,
  toCountry: CountryId,
  type: RelationshipType,
): Relationship[] {
  if (fromCountry === toCountry) return relationships;

  const existingIndex = relationships.findIndex(
    r => r.fromCountry === fromCountry && r.toCountry === toCountry
  );

  if (type === 'neutral') {
    if (existingIndex === -1) return relationships;
    return [
      ...relationships.slice(0, existingIndex),
      ...relationships.slice(existingIndex + 1),
    ];
  }

  const relationship: Relationship = { fromCountry, toCountry, type };
  if (existingIndex === -1) {
    return [...relationships, relationship];
  }

  const updatedRelationships = [...relationships];
  updatedRelationships[existingIndex] = relationship;
  return updatedRelationships;
}

export function getWarEnemies(
  relationships: Relationship[],
  countryId: CountryId,
): CountryId[] {
  const enemies = new Set<CountryId>();

  relationships.forEach(relationship => {
    if (relationship.type !== 'war') return;
    if (relationship.fromCountry === countryId) enemies.add(relationship.toCountry);
    if (relationship.toCountry === countryId) enemies.add(relationship.fromCountry);
  });

  return [...enemies];
}

export function getCountryAndPuppets(
  countryId: CountryId,
  relationships: Relationship[],
): CountryId[] {
  const belligerents = new Set<CountryId>([countryId]);
  const queue: CountryId[] = [countryId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    relationships.forEach(relationship => {
      if (
        relationship.type === 'autonomy' &&
        relationship.fromCountry === current &&
        !belligerents.has(relationship.toCountry)
      ) {
        belligerents.add(relationship.toCountry);
        queue.push(relationship.toCountry);
      }
    });
  }

  return [...belligerents];
}

export function declareWarBetweenCoalitions(
  relationships: Relationship[],
  attackerId: CountryId,
  defenderId: CountryId,
): {
  updatedRelationships: Relationship[];
  attackerBelligerents: CountryId[];
  defenderBelligerents: CountryId[];
} {
  const attackerBelligerents = getCountryAndPuppets(attackerId, relationships);
  const defenderBelligerents = getCountryAndPuppets(defenderId, relationships);

  let updatedRelationships = relationships;

  attackerBelligerents.forEach(attacker => {
    defenderBelligerents.forEach(defender => {
      if (attacker === defender) return;
      updatedRelationships = applyRelationshipChange(updatedRelationships, attacker, defender, 'war');
      updatedRelationships = applyRelationshipChange(updatedRelationships, defender, attacker, 'war');
    });
  });

  return {
    updatedRelationships,
    attackerBelligerents,
    defenderBelligerents,
  };
}

export function joinPuppetToOverlordWars(
  relationships: Relationship[],
  overlordId: CountryId,
  puppetId: CountryId,
): {
  updatedRelationships: Relationship[];
  joinedEnemies: CountryId[];
} {
  let updatedRelationships = relationships;
  const joinedEnemies: CountryId[] = [];

  getWarEnemies(relationships, overlordId).forEach(enemyId => {
    if (enemyId === overlordId || enemyId === puppetId) return;

    const puppetDeclaredWar = getRelationshipStatus(updatedRelationships, puppetId, enemyId) === 'war';
    const enemyDeclaredWar = getRelationshipStatus(updatedRelationships, enemyId, puppetId) === 'war';
    if (puppetDeclaredWar && enemyDeclaredWar) return;

    updatedRelationships = applyRelationshipChange(updatedRelationships, puppetId, enemyId, 'war');
    updatedRelationships = applyRelationshipChange(updatedRelationships, enemyId, puppetId, 'war');
    joinedEnemies.push(enemyId);
  });

  return { updatedRelationships, joinedEnemies };
}
