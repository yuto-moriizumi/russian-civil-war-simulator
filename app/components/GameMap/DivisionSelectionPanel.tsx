'use client';

import { useGameStore } from '../../store/useGameStore';
import { COUNTRY_COLORS, getAdjacentRegions } from '../../utils/mapUtils';
import { Division } from '../../types/game';

/**
 * DivisionSelectionPanel
 *
 * Shown when one or more divisions are selected (selectedDivisionIds.length > 0).
 * Displays a list of the selected divisions with their stats and provides
 * movement controls.
 *
 * This panel is mutually exclusive with RegionInfoPanel: opening this panel
 * clears the selected region, and selecting a region clears this panel.
 */
export function DivisionSelectionPanel() {
  const selectedDivisionIds = useGameStore(state => state.selectedDivisionIds);
  const selectedUnitRegion = useGameStore(state => state.selectedUnitRegion);
  const regions = useGameStore(state => state.regions);
  const movingUnits = useGameStore(state => state.movingUnits);
  const adjacency = useGameStore(state => state.adjacency);
  const playerCountry = useGameStore(state => state.selectedCountry?.id);
  const clearSelectedDivisions = useGameStore(state => state.clearSelectedDivisions);
  const toggleDivisionInSelection = useGameStore(state => state.toggleDivisionInSelection);
  const selectSingleDivision = useGameStore(state => state.selectSingleDivision);

  if (selectedDivisionIds.length === 0) return null;

  // Gather the actual Division objects from the source region
  const sourceRegion = selectedUnitRegion ? regions[selectedUnitRegion] : null;

  // Collect divisions: first look in the source region, then fall back to
  // scanning all regions (handles edge cases where a division moved regions).
  const allDivisions: Division[] = [];
  const divisionIdSet = new Set(selectedDivisionIds);

  if (sourceRegion) {
    for (const div of sourceRegion.divisions) {
      if (divisionIdSet.has(div.id)) allDivisions.push(div);
    }
  }
  // Append any that weren't found in the source region
  if (allDivisions.length < selectedDivisionIds.length) {
    const foundIds = new Set(allDivisions.map(d => d.id));
    for (const region of Object.values(regions)) {
      for (const div of region.divisions) {
        if (divisionIdSet.has(div.id) && !foundIds.has(div.id)) {
          allDivisions.push(div);
          foundIds.add(div.id);
        }
      }
      if (allDivisions.length >= selectedDivisionIds.length) break;
    }
    // Also search moving units
    for (const movement of movingUnits) {
      for (const div of movement.divisions) {
        if (divisionIdSet.has(div.id) && !foundIds.has(div.id)) {
          allDivisions.push(div);
          foundIds.add(div.id);
        }
      }
      if (allDivisions.length >= selectedDivisionIds.length) break;
    }
  }

  const adjacentCount = selectedUnitRegion
    ? getAdjacentRegions(adjacency, selectedUnitRegion).length
    : 0;

  const isPlayerOwned = sourceRegion?.owner === playerCountry;

  const totalHp = allDivisions.reduce((s, d) => s + d.hp, 0);
  const totalMaxHp = allDivisions.reduce((s, d) => s + d.maxHp, 0);
  const totalAttack = allDivisions.reduce((s, d) => s + d.attack, 0);
  const avgDefence =
    allDivisions.length > 0
      ? Math.round(allDivisions.reduce((s, d) => s + d.defence, 0) / allDivisions.length)
      : 0;

  return (
    <div className="absolute left-4 bottom-16 z-10 rounded-lg border-2 border-cyan-400 bg-stone-900/95 p-4 min-w-[280px]">
      {/* Header */}
      <div className="mb-1 text-lg font-bold text-cyan-400">
        Division Selection
      </div>
      {sourceRegion && (
        <div className="mb-3 text-xs text-stone-400">
          From:{' '}
          <span className="text-stone-200">{sourceRegion.name}</span>
          <span className="ml-2 inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COUNTRY_COLORS[sourceRegion.owner] }}
            />
            <span className="capitalize">{sourceRegion.owner}</span>
          </span>
        </div>
      )}

      {/* Division list */}
      <div className="rounded bg-stone-800 p-2 space-y-1 max-h-48 overflow-y-auto">
        <div className="text-xs font-semibold text-stone-300 mb-1">
          Selected Divisions ({allDivisions.length}):
        </div>
        {allDivisions.length === 0 ? (
          <div className="text-xs text-stone-500 italic">
            Division data unavailable
          </div>
        ) : (
          allDivisions.map((div) => (
            <div
              key={div.id}
              className={`flex items-center justify-between text-xs rounded px-1 py-0.5 cursor-pointer transition-colors select-none ${
                selectedDivisionIds.length === 1 && selectedDivisionIds[0] === div.id
                  ? 'bg-cyan-700/50 text-cyan-100'
                  : 'hover:bg-stone-700'
              }`}
              title="Click to select only this division · Shift+click to toggle"
              onClick={(e) => {
                if (e.shiftKey) {
                  toggleDivisionInSelection(div.id);
                } else {
                  selectSingleDivision(div.id);
                }
              }}
            >
              <span
                className="text-stone-300 truncate max-w-[130px]"
                title={div.name}
              >
                {div.name.length > 18
                  ? div.name.substring(0, 18) + '…'
                  : div.name}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-red-400" title={`HP: ${div.hp}/${div.maxHp}`}>
                  ❤ {div.hp}/{div.maxHp}
                </span>
                <span className="text-orange-400" title="Attack">
                  ⚔ {div.attack}
                </span>
                <span className="text-blue-400" title="Defence">
                  🛡 {div.defence}
                </span>
              </span>
            </div>
          ))
        )}

        {/* Totals row */}
        {allDivisions.length > 1 && (
          <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between text-xs font-semibold">
            <span className="text-stone-300">Total:</span>
            <span className="flex items-center gap-2">
              <span className="text-red-400">
                ❤ {totalHp}/{totalMaxHp}
              </span>
              <span className="text-orange-400">⚔ {totalAttack}</span>
              <span className="text-blue-400">🛡 {avgDefence}</span>
            </span>
          </div>
        )}
      </div>

      {/* Movement instructions */}
      {isPlayerOwned && allDivisions.length > 0 && (
        <div className="mt-3 rounded bg-cyan-900/30 p-2 space-y-1">
          <p className="text-xs text-cyan-300">
            Right-click an adjacent region to move {allDivisions.length}{' '}
            division(s)
          </p>
          {adjacentCount > 0 && (
            <p className="text-xs text-stone-500">
              {adjacentCount} adjacent region{adjacentCount !== 1 ? 's' : ''}{' '}
              available
            </p>
          )}
          <p className="text-xs text-stone-500">Travel time: ~6 hours</p>
          <p className="text-xs text-stone-500">
            Shift+click a marker to add more divisions
          </p>
          <p className="text-xs text-stone-500">
            Shift+click a row above to deselect it
          </p>
        </div>
      )}

      {/* Deselect button */}
      <button
        onClick={clearSelectedDivisions}
        className="mt-3 w-full rounded bg-stone-700 py-1 text-xs text-stone-300 hover:bg-stone-600"
      >
        Deselect
      </button>
    </div>
  );
}
