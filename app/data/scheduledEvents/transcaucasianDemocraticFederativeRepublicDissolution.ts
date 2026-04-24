import type { ScheduledEvent } from '../../types/game';

export const transcaucasianDemocraticFederativeRepublicDissolutionEvent: ScheduledEvent = {
  id: 'dissolution-of-the-transcaucasian-democratic-federative-republic',
  date: '1918-05-26',
  title: 'Dissolution of the Transcaucasian Democratic Federative Republic',
  description: 'The Transcaucasian federation collapses. Azerbaijan secures AZE, Armenian core territories break away to the First Republic of Armenia, five Armenian divisions assemble in ARM, and the remaining TDFR-held lands pass to Democratic Republic of Georgia.',
  conditions: [
    {
      type: 'eventTriggered',
      eventId: 'transcaucasian-democratic-federative-republic-established',
    },
    {
      type: 'atLeastOneRegionNotOwnedByOrPuppetOf',
      regions: ['TR-08', 'TR-25', 'TR-04'],
      country: 'tdfr',
    },
  ],
  conditionLogic: 'or',
  actions: [
    { type: 'mergeCountry', newOwner: 'georgia', fromCountry: 'tdfr' },
    { type: 'transferRegion', regionId: 'AZE', newOwner: 'adr' },
    { type: 'transferCoreRegionsFromCountry', newOwner: 'armenia', fromCountry: 'georgia' },
    { type: 'spawnDivision', owner: 'armenia', regionId: 'ARM', armyGroupName: 'Armenian Army', count: 5 },
    { type: 'declareWar', fromCountry: 'ottoman', toCountry: 'armenia' },
    { type: 'setRelationship', fromCountry: 'adr', toCountry: 'ottoman', relationshipType: 'military_access' },
    { type: 'setRelationship', fromCountry: 'ottoman', toCountry: 'adr', relationshipType: 'military_access' },
  ],
  triggered: false,
};
