import { describe, expect, it } from 'vitest';

import {
  initialMapToolEditorState,
  mapToolEditorReducer,
  selectCanRedo,
  selectCanUndo,
  selectIsDirty,
} from '../map-tool/editor/reducer';
import type { MapToolDocument, MapToolEditorState } from '../map-tool/editor/types';

function makeDocument(overrides: Partial<MapToolDocument> = {}): MapToolDocument {
  return {
    ownership: { A: 'neutral', B: 'white' },
    coreRegions: { soviet: ['A'] } as MapToolDocument['coreRegions'],
    unitPlacement: {},
    armyGroupDefs: { soviet: [{ name: 'Red Army', color: '#ff0000' }] } as MapToolDocument['armyGroupDefs'],
    regionValues: { A: 1, B: 2 },
    ...overrides,
  };
}

function load(document = makeDocument()): MapToolEditorState {
  return mapToolEditorReducer(initialMapToolEditorState, {
    type: 'loadDocument',
    document,
  });
}

describe('mapToolEditorReducer', () => {
  it('records ownership paint in history', () => {
    const state = mapToolEditorReducer(load(), {
      type: 'paintOwnership',
      regionId: 'A',
      countryId: 'soviet',
    });

    expect(state.current.ownership.A).toBe('soviet');
    expect(selectIsDirty(state)).toBe(true);
    expect(selectCanUndo(state)).toBe(true);
    expect(state.history).toHaveLength(2);
  });

  it('undoes and redoes core, value, and unit edits through the same history', () => {
    let state = load();
    state = mapToolEditorReducer(state, {
      type: 'addCoreRegion',
      regionId: 'B',
      countryId: 'soviet',
    });
    state = mapToolEditorReducer(state, {
      type: 'changeRegionValue',
      regionId: 'A',
      delta: 2,
    });
    state = mapToolEditorReducer(state, {
      type: 'addUnit',
      regionId: 'A',
      countryId: 'soviet',
      armyGroupName: 'Red Army',
    });

    expect(state.current.coreRegions.soviet).toEqual(['A', 'B']);
    expect(state.current.regionValues.A).toBe(3);
    expect(state.current.unitPlacement.A).toEqual([
      { owner: 'soviet', armyGroupName: 'Red Army', count: 1 },
    ]);

    state = mapToolEditorReducer(state, { type: 'undo' });
    expect(state.current.unitPlacement.A).toBeUndefined();

    state = mapToolEditorReducer(state, { type: 'undo' });
    expect(state.current.regionValues.A).toBe(1);
    expect(state.current.coreRegions.soviet).toEqual(['A', 'B']);

    state = mapToolEditorReducer(state, { type: 'undo' });
    expect(state.current.coreRegions.soviet).toEqual(['A']);
    expect(selectCanRedo(state)).toBe(true);

    state = mapToolEditorReducer(state, { type: 'redo' });
    state = mapToolEditorReducer(state, { type: 'redo' });
    state = mapToolEditorReducer(state, { type: 'redo' });

    expect(state.current.coreRegions.soviet).toEqual(['A', 'B']);
    expect(state.current.regionValues.A).toBe(3);
    expect(state.current.unitPlacement.A).toEqual([
      { owner: 'soviet', armyGroupName: 'Red Army', count: 1 },
    ]);
  });

  it('clears dirty state after markSaved when the saved document matches current', () => {
    let state = mapToolEditorReducer(load(), {
      type: 'changeRegionValue',
      regionId: 'A',
      delta: 1,
    });

    expect(selectIsDirty(state)).toBe(true);
    state = mapToolEditorReducer(state, {
      type: 'markSaved',
      document: state.current,
    });

    expect(selectIsDirty(state)).toBe(false);
    expect(selectCanUndo(state)).toBe(false);
  });

  it('resets to the baseline document', () => {
    let state = mapToolEditorReducer(load(), {
      type: 'paintOwnership',
      regionId: 'A',
      countryId: 'soviet',
    });

    expect(state.current.ownership.A).toBe('soviet');
    state = mapToolEditorReducer(state, { type: 'reset' });

    expect(state.current.ownership.A).toBe('neutral');
    expect(selectIsDirty(state)).toBe(false);
    expect(selectCanUndo(state)).toBe(false);
  });

  it('does not lower region values below 1', () => {
    const state = mapToolEditorReducer(load(), {
      type: 'changeRegionValue',
      regionId: 'A',
      delta: -1,
    });

    expect(state.current.regionValues.A).toBe(1);
    expect(selectIsDirty(state)).toBe(false);
  });
});
