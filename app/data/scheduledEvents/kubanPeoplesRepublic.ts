import type { ScheduledEvent } from '../../types/game';

export const kubanPeoplesRepublicEvent: ScheduledEvent = {
  id: 'kuban-peoples-republic-established',
  title: 'Kuban People\'s Republic Established',
  description: 'The Kuban Rada proclaims the Kuban People\'s Republic, establishing an independent Cossack state under the protection of the Volunteer Army (White Army).',
  conditions: [
    {
      type: 'or',
      conditions: [
        {
          type: 'dateReached',
          date: '1918-01-28',
        },
        {
          type: 'atLeastOneRegionOwnedByOrPuppetOf',
          regions: ['RU-ROS'],
          country: 'soviet',
        },
      ],
    },
  ],
  actions: [
    {
      type: 'transferRegion',
      regionId: 'RU-KDA', // Krasnodar Krai (Kuban heartland)
      newOwner: 'kuban',
    },
    {
      type: 'transferRegion',
      regionId: 'RU-AD', // Adygea
      newOwner: 'kuban',
    },
    {
      type: 'spawnDivision',
      owner: 'kuban',
      regionId: 'RU-KDA',
      armyGroupName: 'Kuban Cossack Host',
    },
    {
      type: 'setRelationship',
      fromCountry: 'white',
      toCountry: 'kuban',
      relationshipType: 'autonomy',
    },
  ],
  triggered: false,
};
