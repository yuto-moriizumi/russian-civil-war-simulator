import type { ScheduledEvent } from '../../types/game';

export const vardarOffensiveEvent: ScheduledEvent = {
  id: 'vardar-offensive',
  title: 'Vardar Offensive',
  description: 'The Entente forces launch the Vardar Offensive on the Macedonian Front. Britain, France, Greece, and Serbia declare war on Austria-Hungary and Bulgaria, breaking through the Bulgarian lines and forcing Bulgaria to seek an armistice.',
  conditions: [{ type: 'date', date: '1918-09-15' }],
  actions: [
    { type: 'declareWar', fromCountry: 'britain', toCountry: 'austriahungary' },
    { type: 'declareWar', fromCountry: 'britain', toCountry: 'bulgaria' },
    { type: 'declareWar', fromCountry: 'france', toCountry: 'austriahungary' },
    { type: 'declareWar', fromCountry: 'france', toCountry: 'bulgaria' },
    { type: 'declareWar', fromCountry: 'greece', toCountry: 'austriahungary' },
    { type: 'declareWar', fromCountry: 'greece', toCountry: 'bulgaria' },
    { type: 'declareWar', fromCountry: 'serbia', toCountry: 'austriahungary' },
    { type: 'declareWar', fromCountry: 'serbia', toCountry: 'bulgaria' },
  ],
  triggered: false,
};
