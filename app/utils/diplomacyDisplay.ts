import { getAllCountryIds } from '../data/countryMetadata';
import type { CountryId, Relationship, RelationshipType } from '../types/game';

export const NON_DIPLOMACY_COUNTRIES: CountryId[] = ['neutral', 'foreign'];

export interface RelationshipSummary {
  countryId: CountryId;
  outwardRelation: RelationshipType;
  inwardRelation: RelationshipType;
}

export function getDiplomacyCountryIds(currentCountry: CountryId): CountryId[] {
  return getAllCountryIds().filter(
    countryId => countryId !== currentCountry && !NON_DIPLOMACY_COUNTRIES.includes(countryId)
  );
}

export function getRelationshipStatus(
  relationships: Relationship[],
  from: CountryId,
  to: CountryId
): RelationshipType {
  return relationships.find(
    relationship => relationship.fromCountry === from && relationship.toCountry === to
  )?.type ?? 'neutral';
}

export function getNonNeutralRelationshipSummaries(
  relationships: Relationship[],
  countryId: CountryId
): RelationshipSummary[] {
  return getDiplomacyCountryIds(countryId)
    .map((otherId): RelationshipSummary => ({
      countryId: otherId,
      outwardRelation: getRelationshipStatus(relationships, countryId, otherId),
      inwardRelation: getRelationshipStatus(relationships, otherId, countryId),
    }))
    .filter(
      summary => summary.outwardRelation !== 'neutral' || summary.inwardRelation !== 'neutral'
    );
}
