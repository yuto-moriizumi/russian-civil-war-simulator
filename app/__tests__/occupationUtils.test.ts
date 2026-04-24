import { describe, expect, it } from 'vitest';

import { determineNewOwner } from '../domain/game/occupationUtils';
import type { Country, Relationship } from '../types/game';

const countries: Country[] = [
  { id: 'soviet', name: 'Soviet', flag: 'soviet.svg', color: '#f00', coreRegions: ['SOV-CORE'] },
  { id: 'ukraine', name: 'Ukraine', flag: 'ukraine.svg', color: '#ff0', coreRegions: ['UKR-CORE'] },
  { id: 'white', name: 'White', flag: 'white.svg', color: '#fff', coreRegions: ['WHT-CORE'] },
  { id: 'don', name: 'Don', flag: 'don.svg', color: '#00f', coreRegions: ['DON-CORE'] },
];

describe('determineNewOwner', () => {
  it('returns the attacker when the region is the attacker core', () => {
    expect(
      determineNewOwner('ukraine', 'UKR-CORE', countries, [], 'white')
    ).toBe('ukraine');
  });

  it('returns the overlord when the attacker is a puppet and the region is the overlord core', () => {
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'ukraine', type: 'autonomy' },
    ];

    expect(
      determineNewOwner('ukraine', 'SOV-CORE', countries, relationships, 'white')
    ).toBe('soviet');
  });

  it('prefers the overlord core transfer before liberation logic', () => {
    const countriesWithSharedCore = countries.map(country =>
      country.id === 'don' ? { ...country, coreRegions: ['SOV-CORE'] } : country
    );
    const relationships: Relationship[] = [
      { fromCountry: 'soviet', toCountry: 'ukraine', type: 'autonomy' },
      { fromCountry: 'don', toCountry: 'ukraine', type: 'military_access' },
      { fromCountry: 'don', toCountry: 'white', type: 'war' },
    ];

    expect(
      determineNewOwner('ukraine', 'SOV-CORE', countriesWithSharedCore, relationships, 'white')
    ).toBe('soviet');
  });
});
