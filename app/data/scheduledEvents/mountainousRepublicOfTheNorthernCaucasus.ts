import type { ScheduledEvent } from '../../types/game';

export const mountainousRepublicOfTheNorthernCaucasusEvents: ScheduledEvent[] = [
  {
    id: 'mountainous-republic-of-the-northern-caucasus-independence',
    title: 'Mountainous Republic of the Northern Caucasus Declares Independence',
    description: 'The Mountainous Republic of the Northern Caucasus asserts its independence, taking control of Ingushetia and Chechnya while securing mutual military access with the White Army and the Ottoman Empire.',
    conditions: [{ type: 'date', date: '1918-05-11' }],
    actions: [
      {
        type: 'transferRegion',
        regionId: 'RU-IN',
        newOwner: 'mrnc',
      },
      {
        type: 'transferRegion',
        regionId: 'RU-CE',
        newOwner: 'mrnc',
      },
      {
        type: 'setRelationship',
        fromCountry: 'mrnc',
        toCountry: 'white',
        relationshipType: 'military_access',
      },
      {
        type: 'setRelationship',
        fromCountry: 'white',
        toCountry: 'mrnc',
        relationshipType: 'military_access',
      },
      {
        type: 'setRelationship',
        fromCountry: 'mrnc',
        toCountry: 'ottoman',
        relationshipType: 'military_access',
      },
      {
        type: 'setRelationship',
        fromCountry: 'ottoman',
        toCountry: 'mrnc',
        relationshipType: 'military_access',
      },
    ],
    triggered: false,
  },
  {
    id: 'mrnc-war-with-soviet-russia',
    title: 'Mountainous Republic Enters War with Soviet Russia',
    description: 'As Soviet-aligned forces hold parts of the North Caucasus, the Mountainous Republic of the Northern Caucasus enters the war against Soviet Russia.',
    conditions: [
      {
        type: 'dateReached',
        date: '1918-05-11',
      },
      {
        type: 'atLeastOneRegionOwnedByOrPuppetOf',
        regions: ['RU-CE', 'RU-IN', 'RU-KB', 'RU-SE'],
        country: 'soviet',
      },
    ],
    actions: [
      {
        type: 'declareWar',
        fromCountry: 'mrnc',
        toCountry: 'soviet',
      },
    ],
    triggered: false,
  },
];
