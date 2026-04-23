import { DivisionState } from '../../../types/game';
import { GAME_CONFIG } from '../../../constants/gameConfig';

/**
 * Regenerates HP for all stationary divisions (regionId !== null).
 * Divisions in transit or combat have regionId=null and are excluded automatically.
 */
export function regenerateDivisionHP(
  divisions: DivisionState,
): DivisionState {
  const result: DivisionState = {};
  for (const [id, div] of Object.entries(divisions)) {
    if (div.regionId !== null) {
      result[id] = { ...div, hp: Math.min(div.hp + GAME_CONFIG.HP.REGEN_PER_TICK, div.maxHp) };
    } else {
      result[id] = div;
    }
  }
  return result;
}
