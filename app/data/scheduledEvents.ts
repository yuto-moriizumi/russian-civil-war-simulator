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
    id: 'crimean-peoples-republic',
    date: '1917-12-13',
    title: 'Crimean People\'s Republic Declared',
    description: 'The Crimean Tatar National Assembly (Kurultay) proclaims the Crimean People\'s Republic, the first democratic republic in the Muslim world.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'UA-43',
        newOwner: 'crimea',
      },
      {
        type: 'transferRegion',
        regionId: 'UA-40',
        newOwner: 'crimea',
      },
      {
        type: 'spawnDivision',
        owner: 'crimea',
        regionId: 'UA-43',
        armyGroupName: 'Crimean National Army',
      },
    ],
    triggered: false,
  },
  {
    id: 'donetsk-krivoy-rog-soviet-republic-independence',
    date: '1918-02-12',
    title: 'Donetsk–Krivoy Rog Soviet Republic Declared',
    description: 'The Donetsk–Krivoy Rog Soviet Republic is proclaimed as an independent Soviet republic, encompassing the industrial Donbass and Krivoy Rog regions under Bolshevik control.',
    conditions: [
      {
        type: 'atLeastOneRegionOwnedByOrPuppetOf',
        regions: ['UA-09', 'UA-12', 'UA-14', 'UA-23', 'UA-59', 'UA-63', 'UA-65'],
        country: 'soviet',
      },
    ],
    actions: [
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-09',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-12',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-14',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-23',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-59',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-63',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'transferRegionIfOwnedByOrPuppetOf',
        regionId: 'UA-65',
        newOwner: 'dkr',
        overlordCountry: 'soviet',
      },
      {
        type: 'spawnDivision',
        owner: 'dkr',
        regionId: 'UA-14',
        armyGroupName: 'Southern Red Guard',
      },
      {
        type: 'setRelationship',
        fromCountry: 'soviet',
        toCountry: 'dkr',
        relationshipType: 'autonomy',
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
