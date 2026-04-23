import { CountryId, Country, Relationship } from '../../types/game';

export function determineNewOwner(
  attackerCountry: CountryId,
  regionId: string,
  countries: Country[],
  relationships: Relationship[],
  previousOwner: CountryId
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

  // Liberation: if a country grants us military access, is at war with the previous owner,
  // and this region is their core state, transfer the territory to that country.
  const militaryAccessGrantors = relationships
    .filter(r => r.toCountry === attackerCountry && r.type === 'military_access')
    .map(r => r.fromCountry);
  for (const grantorId of militaryAccessGrantors) {
    const grantorData = countries.find(c => c.id === grantorId);
    if (!grantorData?.coreRegions?.includes(regionId)) continue;

    const isAtWarWithPreviousOwner = relationships.some(
      r => r.type === 'war' && r.fromCountry === grantorId && r.toCountry === previousOwner
    ) || relationships.some(
      r => r.type === 'war' && r.fromCountry === previousOwner && r.toCountry === grantorId
    );
    if (isAtWarWithPreviousOwner) {
      return grantorId;
    }
  }

  return attackerCountry;
}
