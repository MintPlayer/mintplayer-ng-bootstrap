import { BsSplitStringPipe } from './split-string.pipe';

describe('BsSplitStringPipe', () => {
  const pipe = new BsSplitStringPipe();

  it('splits on newlines by default', () => {
    expect(pipe.transform('a\nb')).toEqual(['a', 'b']);
  });

  it('splits on a given separator', () => {
    expect(pipe.transform('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('splits on a multi-character separator', () => {
    expect(pipe.transform('a<->b', '<->')).toEqual(['a', 'b']);
  });

  it('drops empty entries by default', () => {
    expect(pipe.transform('a,,b', ',')).toEqual(['a', 'b']);
  });

  it('keeps empty entries when asked', () => {
    expect(pipe.transform('a,,b', ',', false)).toEqual(['a', '', 'b']);
  });

  it('drops the empties a leading or trailing separator produces', () => {
    expect(pipe.transform(',a,', ',')).toEqual(['a']);
  });

  it('keeps them when asked', () => {
    expect(pipe.transform(',a,', ',', false)).toEqual(['', 'a', '']);
  });

  it('returns nothing for an empty string when removing empties', () => {
    expect(pipe.transform('', ',')).toEqual([]);
  });

  it('returns one empty entry for an empty string when keeping empties', () => {
    expect(pipe.transform('', ',', false)).toEqual(['']);
  });

  it('returns the whole string when the separator is absent', () => {
    expect(pipe.transform('abc', ',')).toEqual(['abc']);
  });

  // Splitting on '' is String.prototype.split's character-wise mode, not a
  // degenerate no-op.
  it('splits into characters on an empty separator', () => {
    expect(pipe.transform('abc', '')).toEqual(['a', 'b', 'c']);
  });

  it('does not trim the entries it keeps', () => {
    expect(pipe.transform(' a , b ', ',')).toEqual([' a ', ' b ']);
  });
});
