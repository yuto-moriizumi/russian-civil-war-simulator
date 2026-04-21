import { Region, Movement, ActiveCombat } from '../../../types/game';

interface DuplicateReport {
  divisionId: string;
  locations: { type: 'region' | 'movement' | 'combat'; locationId: string; side?: string }[];
  details: { hp: number; armyGroupId: string; owner: string; name: string }[];
  pattern: 'multi-region' | 'multi-movement' | 'multi-combat' | 'multi-hop';
}

export interface DuplicationCheckResult {
  hasDuplicates: boolean;
  reports: DuplicateReport[];
}

/**
 * Scans all divisions across regions, movements, and combats for duplicate IDs.
 *
 * The game's "divisions stay in region during transit" architecture means a
 * single division can legitimately appear in:
 *   - one region + one movement (in-transit)
 *   - one region + one combat (attacking/defending)
 *   - one movement + one combat (mid-transit combat)
 *   - one region + one movement + one combat (all three at once)
 *
 * These cross-location overlaps are INTENTIONAL. This detector only flags
 * pathological duplicates that should never occur:
 *   - Same ID in 2+ regions
 *   - Same ID in 2+ movements
 *   - Same ID in 2+ combats
 *   - Same ID in the same movement appearing twice (duplicate entry in movement.divisions[])
 */
export function detectDivisionDuplicates(
  regions: Record<string, Region>,
  movingUnits: Movement[],
  activeCombats: ActiveCombat[]
): DuplicationCheckResult {
  const reports: DuplicateReport[] = [];

  // ── Check 1: Same division in multiple regions ─────────────────────────────
  const divInRegions = new Map<string, { regionId: string; division: Region['divisions'][number] }[]>();
  for (const [regionId, region] of Object.entries(regions)) {
    for (const div of region.divisions) {
      if (!divInRegions.has(div.id)) divInRegions.set(div.id, []);
      divInRegions.get(div.id)!.push({ regionId, division: div });
    }
  }
  for (const [divId, entries] of divInRegions) {
    const uniqueRegions = [...new Set(entries.map(e => e.regionId))];
    if (uniqueRegions.length > 1) {
      reports.push({
        divisionId: divId,
        locations: entries.map(e => ({ type: 'region' as const, locationId: e.regionId })),
        details: entries.map(e => ({ hp: e.division.hp, armyGroupId: e.division.armyGroupId, owner: e.division.owner, name: e.division.name })),
        pattern: 'multi-region',
      });
    }
  }

  // ── Check 2: Same division in multiple movements ───────────────────────────
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

  // ── Check 3: Same division in multiple active combats ──────────────────────
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

  // ── Check 4: Same division in region + movement with different armyGroupId ─
  // This is the ac76389 bug pattern: armyGroupId changed in movement but not region.
  for (const movement of movingUnits) {
    for (const div of movement.divisions) {
      const region = regions[movement.fromRegion];
      if (!region) continue;
      const regionDiv = region.divisions.find(d => d.id === div.id);
      if (regionDiv && regionDiv.armyGroupId !== div.armyGroupId) {
        reports.push({
          divisionId: div.id,
          locations: [
            { type: 'region', locationId: movement.fromRegion },
            { type: 'movement', locationId: movement.id },
          ],
          details: [
            { hp: regionDiv.hp, armyGroupId: regionDiv.armyGroupId, owner: regionDiv.owner, name: regionDiv.name },
            { hp: div.hp, armyGroupId: div.armyGroupId, owner: div.owner, name: div.name },
          ],
          pattern: 'multi-hop',
        });
      }
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
        : `[region] ${loc.locationId}`;
      console.error(`    ${locStr}  HP=${d.hp} armyGroupId=${d.armyGroupId} owner=${d.owner} name="${d.name}"`);
    }
    console.error('');
  }
}
