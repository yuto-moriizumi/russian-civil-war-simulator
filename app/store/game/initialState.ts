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
       dkr: [],
       neutral: [],
       foreign: [],
       germany: [],
       bulgaria: [],
       poland: [],
       austriahungary: [],
       romania: [],
       greece: [],
       ottoman: [],
       serbia: [],
        albania: [],
        persia: [],
         ukrainesoviet: [],
         lithuania: [],
         balticdutchy: [],
         stavropol: [],
          odessa: [],
          terek: [],
          taurida: [],
          donsoviets: [],
            kuban: [],
            kuban_soviet: [],
            moldavia: [],
            bpr: [],
            tdfr: [],
            georgia: [],
             mrnc: [],
             adr: [],
             armenia: [],
           },

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
   countryBonuses: {
     soviet: getInitialCountryBonuses(),
     white: getInitialCountryBonuses(),
     finland: getInitialCountryBonuses(),
     ukraine: getInitialCountryBonuses(),
     don: getInitialCountryBonuses(),
     fswr: getInitialCountryBonuses(),
     iskolat: getInitialCountryBonuses(),
     dkr: getInitialCountryBonuses(),
     neutral: getInitialCountryBonuses(),
     foreign: getInitialCountryBonuses(),
     germany: getInitialCountryBonuses(),
     bulgaria: getInitialCountryBonuses(),
     poland: getInitialCountryBonuses(),
     austriahungary: getInitialCountryBonuses(),
     romania: getInitialCountryBonuses(),
     greece: getInitialCountryBonuses(),
     ottoman: getInitialCountryBonuses(),
     serbia: getInitialCountryBonuses(),
     albania: getInitialCountryBonuses(),
     persia: getInitialCountryBonuses(),
     ukrainesoviet: getInitialCountryBonuses(),
     lithuania: getInitialCountryBonuses(),
     balticdutchy: getInitialCountryBonuses(),
     stavropol: getInitialCountryBonuses(),
     odessa: getInitialCountryBonuses(),
     terek: getInitialCountryBonuses(),
     taurida: getInitialCountryBonuses(),
     donsoviets: getInitialCountryBonuses(),
       kuban: getInitialCountryBonuses(),
       kuban_soviet: getInitialCountryBonuses(),
       moldavia: getInitialCountryBonuses(),
      bpr: getInitialCountryBonuses(),
      tdfr: getInitialCountryBonuses(),
      georgia: getInitialCountryBonuses(),
      mrnc: getInitialCountryBonuses(),
      adr: getInitialCountryBonuses(),
      armenia: getInitialCountryBonuses(),
    },
};
