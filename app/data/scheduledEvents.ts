import { ScheduledEvent } from '../types/game';

/**
 * List of all scheduled historical events
 */
export const scheduledEvents: ScheduledEvent[] = [
  {
    id: 'finnish-civil-war',
    date: '1918-01-26',
    title: 'Finnish Civil War Begins',
    description: 'The Finnish Civil War erupts as Soviet-backed Red Guards seize control of southern Finland. Soviet Russia officially declares war on Finland.',
    actions: [
      {
        type: 'transferRegion',
        regionId: 'FI-18', // Uusimaa (Helsinki) - South Finland
        newOwner: 'soviet',
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
