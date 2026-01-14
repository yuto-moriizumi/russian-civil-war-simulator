import { FactionId } from '../../types/game';

// Map faction to flag image URL
export const FACTION_FLAGS: Record<FactionId, string> = {
  soviet: '/images/flags/soviet.svg',
  white: '/images/flags/white.svg',
  finland: '/images/flags/finland.svg',
  ukraine: '/images/flags/ukraine.svg',
  neutral: '',
  foreign: '',
};
