import { encodeUtf8 } from './encode-utf8';

const bytes = (input: string) => Array.from(new Uint8Array(encodeUtf8(input)));
const platform = (input: string) => Array.from(new TextEncoder().encode(input));

describe('encodeUtf8', () => {
  describe('is byte-for-byte equivalent to the platform TextEncoder', () => {
    it('for every single UTF-16 code unit, lone surrogates included', () => {
      const mismatches = Array.from({ length: 0x10000 }, (_, unit) => String.fromCharCode(unit))
        .filter((s) => bytes(s).join() !== platform(s).join());
      expect(mismatches).toEqual([]);
    });

    it('for every valid surrogate pair (the whole astral range, U+10000..U+10FFFF)', () => {
      const all = Array.from({ length: 0x400 }, (_, hi) =>
        Array.from({ length: 0x400 }, (_, lo) => String.fromCharCode(0xd800 + hi, 0xdc00 + lo)).join(''),
      ).join('');
      const ours = new Uint8Array(encodeUtf8(all));
      const theirs = new TextEncoder().encode(all);
      expect(ours.length).toBe(theirs.length);
      expect(ours.every((b, i) => b === theirs[i])).toBe(true);
    });

    it.each([
      ['a high surrogate followed by another high surrogate', '\uD800\uD800'],
      ['a high surrogate at the end of the input', 'x\uD83D'],
      ['a low surrogate before a high surrogate', '\uDC00\uD800'],
      ['a high surrogate followed by an ordinary character', '\uD83Dx'],
      ['a high surrogate followed by a valid pair', '\uD83D😀'],
      ['the empty string', ''],
    ])('for %s', (_, input) => {
      expect(bytes(input)).toEqual(platform(input));
    });
  });

  describe('encodes each UTF-8 width', () => {
    it.each([
      ['US-ASCII as one byte', 'A', [0x41]],
      ['the last one-byte code point', '\u007F', [0x7f]],
      ['the first two-byte code point', '\u0080', [0xc2, 0x80]],
      ['a two-byte letter', 'é', [0xc3, 0xa9]],
      ['the last two-byte code point', '߿', [0xdf, 0xbf]],
      ['the first three-byte code point', 'ࠀ', [0xe0, 0xa0, 0x80]],
      ['a three-byte symbol', '€', [0xe2, 0x82, 0xac]],
      ['the code point just below the surrogates', '퟿', [0xed, 0x9f, 0xbf]],
      ['the code point just above the surrogates', '', [0xee, 0x80, 0x80]],
      ['the last BMP code point', '￿', [0xef, 0xbf, 0xbf]],
      ['a four-byte emoji from a surrogate pair', '😀', [0xf0, 0x9f, 0x98, 0x80]],
      ['the last Unicode code point', '\u{10FFFF}', [0xf4, 0x8f, 0xbf, 0xbf]],
      ['a lone high surrogate as U+FFFD', '\uD800', [0xef, 0xbf, 0xbd]],
      ['a lone low surrogate as U+FFFD', '\uDFFF', [0xef, 0xbf, 0xbd]],
    ])('%s', (_, input, expected) => {
      expect(bytes(input)).toEqual(expected);
    });
  });

  it('returns an ArrayBuffer sized to the encoded bytes', () => {
    const buffer = encodeUtf8('a€😀');
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBe(1 + 3 + 4);
  });
});
