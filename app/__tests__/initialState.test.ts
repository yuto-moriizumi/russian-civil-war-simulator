import { describe, expect, it } from 'vitest';
import { initialGameState } from '../store/game/initialState';

describe('initial game state relationships', () => {
  it('does not start with an Ottoman-Greek war', () => {
    expect(initialGameState.relationships).not.toContainEqual({
      fromCountry: 'ottoman',
      toCountry: 'greece',
      type: 'war',
    });
  });
});
