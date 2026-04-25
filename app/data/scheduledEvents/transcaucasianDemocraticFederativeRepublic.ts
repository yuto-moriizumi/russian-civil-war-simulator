import type { ScheduledEvent } from '../../types/game';

export const transcaucasianDemocraticFederativeRepublicEstablishedEvent: ScheduledEvent = {
  id: 'transcaucasian-democratic-federative-republic-established',
  title: 'Transcaucasian Democratic Federative Republic Established',
  description: 'The Transcaucasian Sejm declares the Transcaucasian Democratic Federative Republic. White-held Transcaucasian core regions pass to the new federation, which raises an initial defense force as the Ottoman Empire opens hostilities.',
  conditions: [
    {
      type: 'or',
      conditions: [
        {
          type: 'date',
          date: '1918-04-22',
        },
        {
          type: 'atLeastOneRegionNotOwnedByOrPuppetOf',
          regions: ['RU-DA'],
          country: 'white',
        },
        {
          type: 'atLeastOneRegionOwnedByOrPuppetOf',
          regions: ['RU-KDA'],
          country: 'soviet',
        },
      ],
    },
  ],
  actions: [
    {
      type: 'transferCoreRegionsFromCountry',
      newOwner: 'tdfr',
      fromCountry: 'white',
    },
    {
      type: 'spawnDivision',
      owner: 'tdfr',
      regionId: 'GEO',
      armyGroupName: 'Transcaucasian Defense Force',
    },
    {
      type: 'declareWar',
      fromCountry: 'ottoman',
      toCountry: 'tdfr',
    },
  ],
  triggered: false,
};
