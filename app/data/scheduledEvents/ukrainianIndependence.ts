import type { ScheduledEvent } from '../../types/game';

export const ukrainianIndependenceEvent: ScheduledEvent = {
  id: 'ukrainian-independence',
  title: 'Ukrainian Independence Proclaimed',
  description: 'The Ukrainian People\'s Republic proclaims its independence, ending its puppet relationship with the White Army.',
  conditions: [{ type: 'date', date: '1918-01-22' }],
  actions: [
    {
      type: 'removeRelationship',
      fromCountry: 'white',
      toCountry: 'ukraine',
      relationshipType: 'autonomy',
    },
  ],
  triggered: false,
};
