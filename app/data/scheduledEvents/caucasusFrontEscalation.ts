import type { ScheduledEvent } from '../../types/game';

export const caucasusFrontEscalationEvent: ScheduledEvent = {
  id: 'caucasus-front-escalation',
  date: '1918-02-05',
  title: 'Escalation of the Caucasus Front',
  description: 'Ottoman forces widen the Caucasus campaign and formally declare war on the White Army.',
  actions: [
    {
      type: 'declareWar',
      fromCountry: 'ottoman',
      toCountry: 'white',
    },
  ],
  triggered: false,
};
