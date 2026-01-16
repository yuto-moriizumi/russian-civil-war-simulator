import { Mission } from '../../types/game';
import { sovietMissions, whiteMissions } from './russia';
import { finnishMissions, ukrainianMissions, donMissions, romaniaMissions } from './eastern-europe';
import { germanMissions, bulgarianMissions, polandMissions } from './central-powers';

/**
 * Combined missions for all countries in the game.
 * Missions are organized by regional/political groupings:
 * - Russia: Soviet and White Army missions
 * - Eastern Europe: Finland, Ukraine, and Don Republic missions
 * - Central Powers: Germany, Bulgaria, and Poland missions
 */
export const initialMissions: Mission[] = [
  ...sovietMissions,
  ...whiteMissions,
  ...finnishMissions,
  ...ukrainianMissions,
  ...donMissions,
  ...germanMissions,
  ...bulgarianMissions,
  ...polandMissions,
  ...romaniaMissions,
];
