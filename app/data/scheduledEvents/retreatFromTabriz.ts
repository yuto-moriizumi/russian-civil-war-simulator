import type { ScheduledEvent } from '../../types/game';

export const retreatFromTabrizEvent: ScheduledEvent = {
  id: 'retreat-from-tabriz',
  title: 'Retreat from Tabriz',
  description: 'White forces withdraw from Tabriz and relinquish every Persian core region under their control back to Qajar Iran.',
  conditions: [{ type: 'date', date: '1918-02-28' }],
  actions: [
    {
      type: 'transferCoreRegionsFromCountry',
      newOwner: 'persia',
      fromCountry: 'white',
    },
  ],
  triggered: false,
};
