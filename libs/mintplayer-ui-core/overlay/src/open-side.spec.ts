import { describe, expect, it } from 'vitest';

import { openSide } from './open-side';

describe('openSide', () => {
  it('opens below when the panel fits there', () => {
    expect(openSide({ top: 100, bottom: 130 }, 200, 800)).toBe('below');
  });

  it('flips above near the viewport bottom when there is more room above', () => {
    expect(openSide({ top: 700, bottom: 730 }, 200, 800)).toBe('above');
  });

  it('stays below when neither side fits and below is roomier', () => {
    expect(openSide({ top: 300, bottom: 330 }, 1000, 800)).toBe('below');
  });
});
