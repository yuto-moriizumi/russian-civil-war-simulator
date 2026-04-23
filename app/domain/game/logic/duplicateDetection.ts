import { DivisionState, Movement, ActiveCombat } from '../../../types/game';
import { SimulationLogger } from '../engine/types';

interface DuplicateReport {
  divisionId: string;
  locations: { type: 'movement' | 'combat'; locationId: string; side?: string }[];
  pattern: 'multi-movement' | 'multi-combat';
}

export interface DuplicationCheckResult {
  hasDuplicates: boolean;
  reports: DuplicateReport[];
}

/**
 * Scans division IDs across movements and combats for duplicates.
 */
export function detectDivisionDuplicates(
  _regions: Record<string, unknown>,
  movingUnits: Movement[],
  _activeCombats: ActiveCombat[],
  _divisions?: DivisionState
): DuplicationCheckResult {
  const reports: DuplicateReport[] = [];

  // Check: Same division in multiple movements
  const divInMovements = new Map<string, string[]>();
  for (const movement of movingUnits) {
    for (const divId of movement.divisionIds) {
      if (!divInMovements.has(divId)) divInMovements.set(divId, []);
      divInMovements.get(divId)!.push(movement.id);
    }
  }
  for (const [divId, movementIds] of divInMovements) {
    const uniqueMovements = [...new Set(movementIds)];
    if (uniqueMovements.length > 1) {
      reports.push({
        divisionId: divId,
        locations: uniqueMovements.map(id => ({ type: 'movement' as const, locationId: id })),
        pattern: 'multi-movement',
      });
    }
  }

  // Multi-combat participation is valid (same division can fight in multiple combats).
  // Only check for duplicate movement assignments.

  return { hasDuplicates: reports.length > 0, reports };
}

export function logDivisionDuplicates(reports: DuplicateReport[], tickNumber: number, logger: SimulationLogger): void {
  if (reports.length === 0) return;

  logger.error(`\n[DIVISION DUPLICATE DETECTED] Tick #${tickNumber} — ${reports.length} duplicate(s) found:`);
  for (const report of reports) {
    logger.error(`  Division: ${report.divisionId}  [pattern: ${report.pattern}]`);
    for (const loc of report.locations) {
      const locStr = loc.type === 'combat' ? `[combat] ${loc.locationId} (${loc.side})`
        : `[movement] ${loc.locationId}`;
      logger.error(`    ${locStr}`);
    }
    logger.error('');
  }
}
