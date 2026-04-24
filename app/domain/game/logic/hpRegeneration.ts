import { DivisionState, Movement, ActiveCombat } from '../../../types/game';
import { GAME_CONFIG } from '../../../constants/gameConfig';

/**
 * Regenerates HP for stationary divisions only.
 * Divisions in transit (movingUnits) or in combat (activeCombats) are excluded.
 */
export function regenerateDivisionHP(
  divisions: DivisionState,
  movingUnits: Movement[] = [],
  activeCombats: ActiveCombat[] = [],
): DivisionState {
  // Build set of division IDs that are in transit or combat
  const excludedIds = new Set<string>();
  for (const m of movingUnits) {
    for (const id of m.divisionIds) {
      excludedIds.add(id);
    }
  }
  for (const c of activeCombats) {
    for (const id of c.attackerDivisionIds) {
      excludedIds.add(id);
    }
    for (const id of c.defenderDivisionIds) {
      excludedIds.add(id);
    }
  }

  const result: DivisionState = {};
  for (const [id, div] of Object.entries(divisions)) {
    if (!excludedIds.has(id)) {
      result[id] = { ...div, hp: Math.min(div.hp + GAME_CONFIG.HP.REGEN_PER_TICK, div.maxHp) };
    } else {
      result[id] = div;
    }
  }
  return result;
}
