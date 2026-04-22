import { DivisionState, Movement, ActiveCombat } from '../../../types/game';

interface DuplicateReport {
  divisionId: string;
  locations: { type: 'division-state' | 'movement' | 'combat'; locationId: string; side?: string }[];
  details: { hp: number; armyGroupId: string; owner: string; name: string }[];
  pattern: 'multi-movement' | 'multi-combat';
}

export interface DuplicationCheckResult {
  hasDuplicates: boolean;
  reports: DuplicateReport[];
}

/**
 * Scans all divisions across movements and combats for duplicate IDs.
 *
 * A division may legitimately appear in:
 *   - DivisionState + one movement (in-transit)
 *   - DivisionState (regionId=null) + one combat (defending)
 *
 * Pathological duplicates that should never occur:
 *   - Same ID in 2+ movements
 *   - Same ID in 2+ combats
 */
export function detectDivisionDuplicates(
  _regions: Record<string, unknown>,
  movingUnits: Movement[],
  activeCombats: ActiveCombat[],
  _divisions?: DivisionState
): DuplicationCheckResult {
  const reports: DuplicateReport[] = [];

  // Check: Same division in multiple movements
  const divInMovements = new Map<string, { movementId: string; division: Movement['divisions'][number] }[]>();
  for (const movement of movingUnits) {
    for (const div of movement.divisions) {
      if (!divInMovements.has(div.id)) divInMovements.set(div.id, []);
      divInMovements.get(div.id)!.push({ movementId: movement.id, division: div });
    }
  }
  for (const [divId, entries] of divInMovements) {
    const uniqueMovements = [...new Set(entries.map(e => e.movementId))];
    if (uniqueMovements.length > 1) {
      reports.push({
        divisionId: divId,
        locations: entries.map(e => ({ type: 'movement' as const, locationId: e.movementId })),
        details: entries.map(e => ({ hp: e.division.hp, armyGroupId: e.division.armyGroupId, owner: e.division.owner, name: e.division.name })),
        pattern: 'multi-movement',
      });
    }
  }

  // Check: Same division in multiple active combats
  const divInCombats = new Map<string, { combatId: string; side: string; division: ActiveCombat['attackerDivisions'][number] }[]>();
  for (const combat of activeCombats) {
    if (combat.isComplete) continue;
    for (const div of combat.attackerDivisions) {
      if (!divInCombats.has(div.id)) divInCombats.set(div.id, []);
      divInCombats.get(div.id)!.push({ combatId: combat.id, side: 'attacker', division: div });
    }
    for (const div of combat.defenderDivisions) {
      if (!divInCombats.has(div.id)) divInCombats.set(div.id, []);
      divInCombats.get(div.id)!.push({ combatId: combat.id, side: 'defender', division: div });
    }
  }
  for (const [divId, entries] of divInCombats) {
    const uniqueCombats = [...new Set(entries.map(e => e.combatId))];
    if (uniqueCombats.length > 1) {
      reports.push({
        divisionId: divId,
        locations: entries.map(e => ({ type: 'combat' as const, locationId: e.combatId, side: e.side })),
        details: entries.map(e => ({ hp: e.division.hp, armyGroupId: e.division.armyGroupId, owner: e.division.owner, name: e.division.name })),
        pattern: 'multi-combat',
      });
    }
  }

  return { hasDuplicates: reports.length > 0, reports };
}

/**
 * Logs duplicate division reports in a human-readable format.
 */
export function logDivisionDuplicates(reports: DuplicateReport[], tickNumber: number): void {
  if (reports.length === 0) return;

  console.error(`\n[DIVISION DUPLICATE DETECTED] Tick #${tickNumber} — ${reports.length} duplicate(s) found:`);
  for (const report of reports) {
    console.error(`  Division: ${report.divisionId}  [pattern: ${report.pattern}]`);
    for (let i = 0; i < report.details.length; i++) {
      const d = report.details[i];
      const loc = report.locations[i];
      const locStr = loc.type === 'combat' ? `[combat] ${loc.locationId} (${loc.side})`
        : loc.type === 'movement' ? `[movement] ${loc.locationId}`
        : `[division-state] ${loc.locationId}`;
      console.error(`    ${locStr}  HP=${d.hp} armyGroupId=${d.armyGroupId} owner=${d.owner} name="${d.name}"`);
    }
    console.error('');
  }
}
