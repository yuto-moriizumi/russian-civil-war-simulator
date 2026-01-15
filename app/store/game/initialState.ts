import { GameState } from '../../types/game';
import { initialMissions, GAME_START_DATE } from '../../data/gameData';
import { getInitialFactionBonuses } from '../../utils/bonusCalculator';

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
  money: 100,
  income: 0,
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
    neutral: [],
    foreign: [],
  },
  relationships: [
    { fromFaction: 'white', toFaction: 'ukraine', type: 'autonomy' }
  ], // Initially no relationships (all neutral)
  mapMode: 'country', // Default map mode
  regionCentroids: {}, // Will be loaded asynchronously
  factionBonuses: {
    soviet: getInitialFactionBonuses(),
    white: getInitialFactionBonuses(),
    finland: getInitialFactionBonuses(),
    ukraine: getInitialFactionBonuses(),
    neutral: getInitialFactionBonuses(),
    foreign: getInitialFactionBonuses(),
  },
};
