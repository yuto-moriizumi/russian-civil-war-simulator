import { CountryId, Country, Relationship } from '../types/game';

export function determineNewOwner(
  attackerCountry: CountryId,
  regionId: string,
  countries: Country[],
  relationships: Relationship[]
): CountryId {
  const attackerData = countries.find(c => c.id === attackerCountry);
  if (attackerData?.coreRegions?.includes(regionId)) {
    return attackerCountry;
  }
  const puppets = relationships
    .filter(r => r.fromCountry === attackerCountry && r.type === 'autonomy')
    .map(r => r.toCountry);
  for (const puppetId of puppets) {
    const puppetData = countries.find(c => c.id === puppetId);
    if (puppetData?.coreRegions?.includes(regionId)) {
      return puppetId;
    }
  }
  return attackerCountry;
}
