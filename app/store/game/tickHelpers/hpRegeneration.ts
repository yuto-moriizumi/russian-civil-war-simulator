import { Division, DivisionState, Movement } from '../../../types/game';

/**
 * Regenerates HP for all stationary divisions (not in transit, not in combat).
 * In-transit divisions get HP regen in processMovements instead.
 */
export function regenerateDivisionHP(
  divisions: DivisionState,
  movingUnits: Movement[]
): DivisionState {
  const inTransitIds = new Set(movingUnits.flatMap(m => m.divisions.map((d: Division) => d.id)));
  const result: DivisionState = {};
  for (const [id, div] of Object.entries(divisions)) {
    if (div.regionId !== null && !inTransitIds.has(id)) {
      result[id] = { ...div, hp: Math.min(div.hp + 10, div.maxHp) };
    } else {
      result[id] = div;
    }
  }
  return result;
}
