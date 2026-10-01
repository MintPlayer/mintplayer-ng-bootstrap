import { describe, expect, it } from 'vitest';

import { allocateKeyTip } from './key-tip-allocator';

describe('allocateKeyTip', () => {
  it('takes the explicit tip, upper-cased and cut to one character, even when taken', () => {
    const used = new Set(['X']);
    expect(allocateKeyTip('Home', 'xy', used)).toBe('X');
    expect(used.has('X')).toBe(true);
  });

  it('prefers the first letter of the label', () => {
    const used = new Set<string>();
    expect(allocateKeyTip('paste', null, used)).toBe('P');
    expect([...used]).toEqual(['P']);
  });

  it('accepts a leading digit as the first-letter tip', () => {
    expect(allocateKeyTip('3D Models', null, new Set())).toBe('3');
  });

  it('falls through to the next consonant, skipping vowels', () => {
    expect(allocateKeyTip('Paste', null, new Set(['P']))).toBe('S');
  });

  it('falls back to a vowel of the label once its consonants are taken', () => {
    expect(allocateKeyTip('Pa', null, new Set(['P']))).toBe('A');
  });

  it('falls back to digits, then the alphabet, once every label letter is taken', () => {
    expect(allocateKeyTip('Ab', null, new Set(['A', 'B']))).toBe('1');
    const digits = new Set([...'123456789']);
    expect(allocateKeyTip('', null, digits)).toBe('A');
  });

  it('skips a non-alphanumeric first character', () => {
    expect(allocateKeyTip('-Bold', null, new Set())).toBe('B');
  });

  it('returns ? when every tip is taken, and claims nothing', () => {
    const all = new Set([...'123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0']);
    expect(allocateKeyTip('Home', null, all)).toBe('?');
    expect(all.has('?')).toBe(false);
  });
});
