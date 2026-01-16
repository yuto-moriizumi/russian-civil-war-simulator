import { GameState } from '../../types/game';
import { initialMissions, GAME_START_DATE } from '../../data/gameData';
import { scheduledEvents } from '../../data/scheduledEvents';
import { getInitialCountryBonuses } from '../../utils/bonusCalculator';

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
  productionQueues: {
    soviet: [],
    white: [],
    finland: [],
    ukraine: [],
    don: [],
    fswr: [],
    iskolat: [],
    neutral: [],
    foreign: [],
    germany: [],
    bulgaria: [],
    poland: [],
    austriahungary: [],
    romania: [],
  },
  relationships: [
    { fromCountry: 'white', toCountry: 'ukraine', type: 'autonomy' },
    { fromCountry: 'soviet', toCountry: 'iskolat', type: 'autonomy' },
    { fromCountry: 'germany', toCountry: 'poland', type: 'autonomy' },
    { fromCountry: 'germany', toCountry: 'romania', type: 'war' },
    { fromCountry: 'germany', toCountry: 'bulgaria', type: 'military_access' }
  ], // Initial relationships (autonomy = puppet state)
  mapMode: 'country', // Default map mode
  regionCentroids: {}, // Will be loaded asynchronously
  scheduledEvents: scheduledEvents, // Historical events
  countryBonuses: {
    soviet: getInitialCountryBonuses(),
    white: getInitialCountryBonuses(),
    finland: getInitialCountryBonuses(),
    ukraine: getInitialCountryBonuses(),
    don: getInitialCountryBonuses(),
    fswr: getInitialCountryBonuses(),
    iskolat: getInitialCountryBonuses(),
    neutral: getInitialCountryBonuses(),
    foreign: getInitialCountryBonuses(),
    germany: getInitialCountryBonuses(),
    bulgaria: getInitialCountryBonuses(),
    poland: getInitialCountryBonuses(),
    austriahungary: getInitialCountryBonuses(),
    romania: getInitialCountryBonuses(),
  },
};
