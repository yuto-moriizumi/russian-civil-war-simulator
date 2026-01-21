import { GameState, CountryId, ProductionQueueItem, CountryBonuses } from '../../types/game';
import { initialMissions, GAME_START_DATE } from '../../data/gameData';
import { scheduledEvents } from '../../data/scheduledEvents';
import { getInitialCountryBonuses } from '../../utils/bonusCalculator';
import { getAllCountryIds } from '../../data/countryMetadata';

// Predefined colors for army groups
export const ARMY_GROUP_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
];

/**
 * Create empty production queues for all countries
 * This automatically includes all countries defined in COUNTRY_METADATA
 */
function createEmptyProductionQueues(): Record<CountryId, ProductionQueueItem[]> {
  const queues = {} as Record<CountryId, ProductionQueueItem[]>;
  for (const countryId of getAllCountryIds()) {
    queues[countryId] = [];
  }
  return queues;
}

/**
 * Create initial country bonuses for all countries
 * This automatically includes all countries defined in COUNTRY_METADATA
 */
function createInitialCountryBonuses(): Record<CountryId, CountryBonuses> {
  const bonuses = {} as Record<CountryId, CountryBonuses>;
  for (const countryId of getAllCountryIds()) {
    bonuses[countryId] = getInitialCountryBonuses();
  }
  return bonuses;
}

export const initialGameState: GameState = {
  currentScreen: 'title',
  selectedCountry: null,
  dateTime: new Date(GAME_START_DATE),
  isPlaying: false,
  gameSpeed: 1,
  missions: initialMissions,
  movingUnits: [],
  gameEvents: [],
  notifications: [],
  activeCombats: [],
  theaters: [],
  armyGroups: [],
  productionQueues: createEmptyProductionQueues(),

  relationships: [
    { fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy' },
    { fromCountry: 'soviet', toCountry: 'iskolat', type: 'autonomy' },
    { fromCountry: 'germany', toCountry: 'poland', type: 'autonomy' },
    { fromCountry: 'germany', toCountry: 'romania', type: 'war' },
    { fromCountry: 'germany', toCountry: 'bulgaria', type: 'military_access' },
    // Ottoman Empire relationships (November 1917)
    { fromCountry: 'ottoman', toCountry: 'germany', type: 'military_access' },
    { fromCountry: 'ottoman', toCountry: 'austriahungary', type: 'military_access' },
    { fromCountry: 'ottoman', toCountry: 'greece', type: 'war' },
    // Serbia relationships
    { fromCountry: 'serbia', toCountry: 'austriahungary', type: 'war' },
    { fromCountry: 'serbia', toCountry: 'germany', type: 'war' }
  ], // Initial relationships (autonomy = puppet state)
  mapMode: 'country', // Default map mode
  regionCentroids: {}, // Will be loaded asynchronously
  scheduledEvents: scheduledEvents, // Historical events
  countryBonuses: createInitialCountryBonuses(),
};
