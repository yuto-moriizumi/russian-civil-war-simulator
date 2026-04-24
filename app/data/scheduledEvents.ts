import { ScheduledEvent } from '../types/game';
import { retreatFromTabrizEvent } from './scheduledEvents/retreatFromTabriz';
import { transcaucasianDemocraticFederativeRepublicEstablishedEvent } from './scheduledEvents/transcaucasianDemocraticFederativeRepublic';

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
    id: 'moldavian-democratic-republic-established',
    date: '1917-12-16',
    title: 'Moldavian Democratic Republic Established',
    description: 'The Sfatul Tarii proclaims the Moldavian Democratic Republic in Bessarabia, aligned under White Army protection.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'MDA', // Bessarabia / Moldavia
        newOwner: 'moldavia',
      },
      {
        type: 'setRelationship',
        fromCountry: 'white',
        toCountry: 'moldavia',
        relationshipType: 'autonomy',
      },
    ],
    triggered: false,
  },
  {
    id: 'moldavian-independence',
    date: '1918-02-06',
    title: 'Moldavia Declares Independence',
    description: 'The Moldavian Democratic Republic declares independence, ending its protectorate relationship with the White Army.',
    actions: [
      {
        type: 'removeRelationship',
        fromCountry: 'white',
        toCountry: 'moldavia',
        relationshipType: 'autonomy',
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
  {
    id: 'kuban-peoples-republic-established',
    date: '1918-01-28',
    title: 'Kuban People\'s Republic Established',
    description: 'The Kuban Rada proclaims the Kuban People\'s Republic, establishing an independent Cossack state under the protection of the Volunteer Army (White Army).',
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
  },
  {
    id: 'treaty-of-brest-litovsk-ukraine',
    date: '1918-02-09',
    title: 'Treaty of Brest-Litovsk (Ukraine)',
    description: 'The Central Powers sign a separate peace treaty with the Ukrainian People\'s Republic. Germany and Ukraine grant each other military access, and Germany declares war on Soviet Russia to enforce the treaty.',
    actions: [
      {
        type: 'setRelationship',
        fromCountry: 'germany',
        toCountry: 'ukraine',
        relationshipType: 'military_access',
      },
      {
        type: 'setRelationship',
        fromCountry: 'ukraine',
        toCountry: 'germany',
        relationshipType: 'military_access',
      },
      {
        type: 'declareWar',
        fromCountry: 'germany',
        toCountry: 'soviet',
      },
      {
        type: 'transferCoreRegionsFromCountry',
        newOwner: 'ukraine',
        fromCountry: 'germany',
      },
    ],
    triggered: false,
  },
  {
    id: 'treaty-of-brest-litovsk-soviet',
    date: '1918-03-03',
    title: 'Treaty of Brest-Litovsk',
    description: 'Soviet Russia signs the Treaty of Brest-Litovsk with the Central Powers, renouncing its revolutionary client ties in Ukraine and ending the war with Germany and its puppet states.',
    actions: [
      {
        type: 'removeRelationship',
        fromCountry: 'soviet',
        toCountry: 'odessa',
        relationshipType: 'autonomy',
      },
      {
        type: 'removeRelationship',
        fromCountry: 'soviet',
        toCountry: 'ukrainesoviet',
        relationshipType: 'autonomy',
      },
      {
        type: 'removeRelationship',
        fromCountry: 'soviet',
        toCountry: 'dkr',
        relationshipType: 'autonomy',
      },
      {
        type: 'endWarWithCountryAndPuppets',
        masterCountry: 'germany',
        enemyCountry: 'soviet',
      },
    ],
    triggered: false,
  },
  retreatFromTabrizEvent,
  transcaucasianDemocraticFederativeRepublicEstablishedEvent,
  {
    id: 'dissolution-of-the-transcaucasian-democratic-federative-republic',
    date: '1918-05-26',
    title: 'Dissolution of the Transcaucasian Democratic Federative Republic',
    description: 'The Transcaucasian federation collapses. Azerbaijan secures AZE, Armenian core territories break away to the First Republic of Armenia, and the remaining TDFR-held lands pass to Democratic Republic of Georgia.',
    actions: [{ type: 'transferRegion', regionId: 'AZE', newOwner: 'adr' }, { type: 'transferCoreRegionsFromCountry', newOwner: 'armenia', fromCountry: 'tdfr' }, { type: 'transferAllRegionsFromCountry', newOwner: 'georgia', fromCountry: 'tdfr' }],
    triggered: false,
  },
  {
    id: 'odessa-soviet-republic-proclaimed',
    date: '1918-02-01',
    title: 'Odessa Soviet Republic Proclaimed',
    description: 'Bolshevik forces establish control over Odessa and the surrounding region, proclaiming the Odessa Soviet Republic as a revolutionary Soviet state.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'UA-51', // Odessa Oblast
        newOwner: 'odessa',
      },
      {
        type: 'transferRegion',
        regionId: 'MD-01', // Bessarabia
        newOwner: 'odessa',
      },
      {
        type: 'spawnDivision',
        owner: 'odessa',
        regionId: 'UA-51',
        armyGroupName: 'Odessa Red Guard',
      },
      {
        type: 'setRelationship',
        fromCountry: 'soviet',
        toCountry: 'odessa',
        relationshipType: 'autonomy',
      },
    ],
    triggered: false,
  },
];
