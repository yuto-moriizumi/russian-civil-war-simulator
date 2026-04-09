import { GameStore } from './types';
import { StoreApi } from 'zustand';

/**
 * Actions for selecting/deselecting individual divisions in the Division
 * Selection Window.  Extracted from basicActions to keep file sizes under
 * the 350-line lint limit.
 */
export const createDivisionSelectionActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  /** Select all divisions in a region. Clears selectedRegion (mutual exclusivity). */
  selectDivisionsInRegion: (regionId: string) => {
    const { regions } = get();
    const region = regions[regionId];
    if (!region) return;
    const divisionIds = region.divisions.map(d => d.id);
    set({ selectedDivisionIds: divisionIds, selectedUnitRegion: regionId, selectedRegion: null });
  },

  /**
   * Shift+click on a unit marker: append all divisions from regionId to the
   * current selection (HOI4-style multi-region select).
   * selectedUnitRegion keeps pointing to the first selected region so
   * right-click movement has a sensible source.
   */
  addDivisionsInRegion: (regionId: string) => {
    const { regions, selectedDivisionIds, selectedUnitRegion } = get();
    const region = regions[regionId];
    if (!region) return;
    const newIds = region.divisions.map(d => d.id);
    const existing = new Set(selectedDivisionIds);
    const merged = [...selectedDivisionIds, ...newIds.filter(id => !existing.has(id))];
    set({
      selectedDivisionIds: merged,
      selectedUnitRegion: selectedUnitRegion ?? regionId,
      selectedRegion: null,
    });
  },

  /**
   * Shift+click a division row: toggle it in/out of the current selection.
   * Clears selectedUnitRegion when the last division is removed.
   */
  toggleDivisionInSelection: (divisionId: string) => {
    const { selectedDivisionIds } = get();
    const next = selectedDivisionIds.includes(divisionId)
      ? selectedDivisionIds.filter(id => id !== divisionId)
      : [...selectedDivisionIds, divisionId];
    set({ selectedDivisionIds: next, ...(next.length === 0 ? { selectedUnitRegion: null } : {}) });
  },

  /** Narrow the selection to a single division; keeps selectedUnitRegion. */
  selectSingleDivision: (divisionId: string) => {
    set({ selectedDivisionIds: [divisionId] });
  },

  /** Clear all selected divisions and reset the unit region. */
  clearSelectedDivisions: () => {
    set({ selectedDivisionIds: [], selectedUnitRegion: null });
  },
});
