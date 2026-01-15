import { ScheduledEvent } from '../types/game';

/**
 * List of all scheduled historical events
 */
export const scheduledEvents: ScheduledEvent[] = [
  {
    id: 'finnish-civil-war',
    date: '1918-01-26',
    title: 'Finnish Civil War Begins',
    description: 'The Finnish Civil War erupts as the Finnish Socialist Workers\' Republic (Red Guards) seizes control of southern Finland with Soviet support.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'FI-18', // Uusimaa (Helsinki) - South Finland
        newOwner: 'fswr',
      },
      {
        type: 'declareWar',
        fromFaction: 'fswr',
        toFaction: 'finland',
      },
      {
        type: 'declareWar',
        fromFaction: 'soviet',
        toFaction: 'finland',
      },
    ],
    triggered: false,
  },
];
