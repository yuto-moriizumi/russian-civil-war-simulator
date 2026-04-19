import { ScheduledEvent } from '../types/game';

/**
 * List of all scheduled historical events
 */
export const scheduledEvents: ScheduledEvent[] = [
  {
    id: 'finnish-civil-war',
    date: '1918-01-26',
    title: 'Finnish Civil War Begins',
    description: 'The Finnish Civil War erupts as the Finnish Socialist Workers\' Republic (Red Guards) seizes control of southern Finland.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'FI-18', // Uusimaa (Helsinki) - South Finland
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-19', // Southwest Finland
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-17', // Satakunta
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-11', // Pirkanmaa
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-16', // Päijänne Tavastia
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-09', // Kymenlaakso
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-06', // Tavastia Proper
        newOwner: 'fswr',
      },
      {
        type: 'transferRegion',
        regionId: 'FI-02', // South Karelia (Viipuri)
        newOwner: 'fswr',
      },
      {
        type: 'declareWar',
        fromCountry: 'fswr',
        toCountry: 'finland',
      },
    ],
    triggered: false,
  },
  {
    id: 'stavropol-soviet-republic-uprising',
    date: '1918-01-14',
    title: 'Stavropol Soviet Republic Proclaimed',
    description: 'Bolshevik forces seize control of Stavropol, proclaiming the Stavropol Soviet Republic as a revolutionary government under Soviet Russian patronage.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'RU-STA',
        newOwner: 'stavropol',
      },
      {
        type: 'spawnDivision',
        owner: 'stavropol',
        regionId: 'RU-STA',
        armyGroupName: 'Stavropol Red Guard',
      },
      {
        type: 'setRelationship',
        fromCountry: 'soviet',
        toCountry: 'stavropol',
        relationshipType: 'autonomy',
      },
    ],
    triggered: false,
  },
];
