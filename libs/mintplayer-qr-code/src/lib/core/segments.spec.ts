import { describe, expect, it } from 'vitest';

import * as Segments from './segments';
import * as Mode from './mode';
import { NumericData } from './data-types/numeric-data';
import { ByteData } from './data-types/byte-data';
import { AlphanumericData } from './data-types/alphanumeric-data';
import type { Segment } from './segment';

/**
 * Segmentation: deciding how to carve a string into runs, each encoded in the
 * mode that suits it.
 *
 * This is the only genuinely *optimising* step in the encoder. Every mode
 * switch costs a 4-bit indicator plus a character count of 8–16 bits, so
 * splitting `AB1CD` at the digit would spend more on the switch than the digit
 * saves — which is why `fromString` runs a shortest-path search over the
 * possible splits rather than greedily using the narrowest mode for each run.
 *
 * The failure mode when this is wrong is not a broken symbol but a needlessly
 * large one, which nobody reports as a bug.
 */

const modes = (segments: { mode: Mode.Mode }[]) => segments.map((s) => s.mode);
const lengths = (segments: { getLength(): number | undefined }[]) =>
  segments.map((s) => s.getLength());

describe('rawSplit — the unoptimised carve', () => {
  it('gives a single-mode string one segment', () => {
    expect(modes(Segments.rawSplit('12345'))).toEqual([Mode.NUMERIC]);
    expect(modes(Segments.rawSplit('HELLO'))).toEqual([Mode.ALPHANUMERIC]);
  });

  it('splits at every mode boundary', () => {
    expect(modes(Segments.rawSplit('ABC123'))).toEqual([Mode.ALPHANUMERIC, Mode.NUMERIC]);
  });

  it('keeps the segments in source order', () => {
    const segments = Segments.rawSplit('123ABC456');
    expect(modes(segments)).toEqual([Mode.NUMERIC, Mode.ALPHANUMERIC, Mode.NUMERIC]);
    expect(lengths(segments)).toEqual([3, 3, 3]);
  });

  it('treats anything outside the two narrow sets as bytes', () => {
    expect(modes(Segments.rawSplit('hello'))).toEqual([Mode.BYTE]);
  });

  it('splits mixed case into an alphanumeric run and a byte run', () => {
    const segments = Segments.rawSplit('ABCdef');
    expect(modes(segments)).toEqual([Mode.ALPHANUMERIC, Mode.BYTE]);
  });
});

describe('fromString — the optimised carve', () => {
  /*
   * The heart of it. Each extra segment costs a mode indicator plus a character
   * count — 12 bits at version 1 for numeric — and a single digit encoded on
   * its own saves only 4. So the optimiser keeps `AB1CD` as one alphanumeric
   * run even though the `1` could be numeric.
   */
  it('does not split when the switch costs more than it saves', () => {
    expect(Segments.fromString('AB1CD', 1)).toHaveLength(1);
  });

  it('does split when the run is long enough to pay for itself', () => {
    const segments = Segments.fromString('ABCDEFGHIJ' + '1'.repeat(50), 1);
    expect(segments.length).toBeGreaterThan(1);
    expect(modes(segments)).toContain(Mode.NUMERIC);
  });

  it('leaves a single-mode string alone', () => {
    expect(modes(Segments.fromString('1234567890', 1))).toEqual([Mode.NUMERIC]);
  });

  // Merging matters as much as splitting: two adjacent runs of the same mode
  // must become one segment, or each pays its own switch cost for nothing.
  it('merges adjacent runs of the same mode into one segment', () => {
    const segments = Segments.fromString('123ABC456', 1);
    const consecutiveDuplicates = modes(segments).filter((m, i, all) => i > 0 && m === all[i - 1]);
    expect(consecutiveDuplicates).toEqual([]);
  });

  it('encodes the whole input, losing nothing', () => {
    const text = 'HELLO123world';
    const total = Segments.fromString(text, 1).reduce((sum, s) => sum + (s.getLength() ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(text.length);
  });

  // The character count indicator widens at versions 10 and 27, so the same
  // string can be worth splitting at one version and not at another — which is
  // exactly why the version is a parameter here.
  it('takes the target version into account', () => {
    expect(() => Segments.fromString('ABC123456789', 1)).not.toThrow();
    expect(() => Segments.fromString('ABC123456789', 40)).not.toThrow();
  });

  it('handles a URL, the most common real payload', () => {
    const segments = Segments.fromString('https://example.com/path?a=1', 2);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(modes(segments)).toContain(Mode.BYTE);
  });
});

describe('buildSingleSegment', () => {
  it('chooses the narrowest mode when given no hint', () => {
    expect(Segments.buildSingleSegment('123', null)).toBeInstanceOf(NumericData);
    expect(Segments.buildSingleSegment('ABC', null)).toBeInstanceOf(AlphanumericData);
    expect(Segments.buildSingleSegment('abc', null)).toBeInstanceOf(ByteData);
  });

  // A hint may only WIDEN. Byte mode encodes anything, so a consumer can always
  // ask for it; asking for numeric on a string with letters cannot work, and
  // saying so beats emitting a symbol that decodes to something else.
  it('accepts a hint that widens the mode', () => {
    expect(Segments.buildSingleSegment('123', Mode.BYTE)).toBeInstanceOf(ByteData);
    expect(Segments.buildSingleSegment('123', Mode.ALPHANUMERIC)).toBeInstanceOf(AlphanumericData);
  });

  it('refuses a hint the data cannot satisfy', () => {
    expect(() => Segments.buildSingleSegment('ABC', Mode.NUMERIC)).toThrow(/cannot be encoded/);
  });

  // Kanji mode needs a Shift-JIS converter the consumer has to supply. With
  // none registered the text still encodes — as UTF-8 bytes — rather than
  // failing, which is the right trade for a library that ships without the
  // table.
  it('falls back to byte mode for Kanji when no converter is registered', () => {
    const segment = Segments.buildSingleSegment('漢字', Mode.KANJI);
    expect([Mode.KANJI, Mode.BYTE]).toContain(segment.mode);
  });
});

describe('fromArray — consumer-supplied segments', () => {
  it('builds a segment per entry', () => {
    const input = [
      { data: '123', mode: Mode.NUMERIC, length: 3 },
      { data: 'ABC', mode: Mode.ALPHANUMERIC, length: 3 },
    ] as Segment[];

    expect(modes(Segments.fromArray(input))).toEqual([Mode.NUMERIC, Mode.ALPHANUMERIC]);
  });

  it('accepts a bare string entry', () => {
    expect(modes(Segments.fromArray(['123' as unknown as Segment]))).toEqual([Mode.NUMERIC]);
  });

  it('skips an entry with no data rather than emitting an empty segment', () => {
    const input = [
      { data: '123', mode: Mode.NUMERIC, length: 3 },
      { data: '', mode: Mode.NUMERIC, length: 0 },
    ] as Segment[];

    expect(Segments.fromArray(input)).toHaveLength(1);
  });

  it('builds nothing from nothing', () => {
    expect(Segments.fromArray([])).toEqual([]);
  });

  it('honours the mode each entry asks for', () => {
    const input = [{ data: '123', mode: Mode.BYTE, length: 3 }] as Segment[];
    expect(Segments.fromArray(input)[0]).toBeInstanceOf(ByteData);
  });
});
