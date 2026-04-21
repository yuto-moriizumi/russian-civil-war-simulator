import type { CountryId, Relationship, RelationshipType } from '../types/game';

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
