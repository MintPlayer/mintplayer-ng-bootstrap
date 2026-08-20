import { beforeAll, describe, expect, it } from 'vitest';

import { AlphanumericData } from './alphanumeric-data';
import { ByteData } from './byte-data';
import { KanjiData } from './kanji-data';
import { NumericData } from './numeric-data';
import { BitBuffer } from '../bit-buffer';
import { setToSJISFunction } from '../utils';
import * as Mode from '../mode';

/**
 * The four segment encoders — the only part of the library that turns
 * characters into bits.
 *
 * Each mode's packing is specified exactly by ISO/IEC 18004 clause 7.4, and
 * each has an awkward tail: numeric groups threes into 10 bits but a leftover
 * pair takes 7 and a single digit 4; alphanumeric pairs into 11 with a leftover
 * taking 6. The tails are where an implementation quietly loses a character,
 * and the resulting symbol is a valid QR code containing the wrong data.
 *
 * `getBitsLength` is asserted against the bits actually written, not against a
 * separate expectation — the version chooser trusts that prediction to size the
 * symbol, so the two agreeing is the property that matters.
 */

const bits = (write: (buffer: BitBuffer) => void): string => {
  const buffer = new BitBuffer();
  write(buffer);
  return Array.from({ length: buffer.getLengthInBits() }, (_unused, i) =>
    buffer.get(i) ? '1' : '0',
  ).join('');
};

describe('NumericData', () => {
  it('reports its mode and character count', () => {
    const data = new NumericData('12345');
    expect(data.mode).toBe(Mode.NUMERIC);
    expect(data.getLength()).toBe(5);
  });

  // Clause 7.4.3: groups of three become 10 bits.
  it('packs a group of three digits into ten bits', () => {
    expect(bits((b) => new NumericData('123').write(b))).toBe('0001111011');
  });

  it('packs several groups back to back', () => {
    expect(bits((b) => new NumericData('123456').write(b))).toBe('0001111011' + '0111001000');
  });

  // The tails: two digits take 7 bits, one digit 4.
  it('packs a leftover pair into seven bits', () => {
    expect(bits((b) => new NumericData('12').write(b))).toBe('0001100');
  });

  it('packs a leftover single digit into four bits', () => {
    expect(bits((b) => new NumericData('7').write(b))).toBe('0111');
  });

  it('packs a group and a tail together', () => {
    expect(bits((b) => new NumericData('12345').write(b))).toHaveLength(17);
  });

  it('keeps leading zeros, which are data and not formatting', () => {
    expect(bits((b) => new NumericData('001').write(b))).toBe('0000000001');
  });

  it('predicts exactly the number of bits it writes', () => {
    for (const digits of ['1', '12', '123', '1234', '12345', '123456', '1234567']) {
      expect(new NumericData(digits).getBitsLength(), digits).toBe(
        bits((b) => new NumericData(digits).write(b)).length,
      );
    }
  });

  it('predicts from a length alone, without the data', () => {
    expect(NumericData.getBitsLength(3)).toBe(10);
    expect(NumericData.getBitsLength(2)).toBe(7);
    expect(NumericData.getBitsLength(1)).toBe(4);
    expect(NumericData.getBitsLength(0)).toBe(0);
  });
});

describe('AlphanumericData', () => {
  it('reports its mode and character count', () => {
    const data = new AlphanumericData('HELLO');
    expect(data.mode).toBe(Mode.ALPHANUMERIC);
    expect(data.getLength()).toBe(5);
  });

  // Clause 7.4.4: a pair encodes as first*45 + second, in 11 bits. 'HE' is
  // 17*45 + 14 = 779.
  it('packs a pair into eleven bits as first x 45 plus second', () => {
    expect(bits((b) => new AlphanumericData('HE').write(b))).toBe(
      (17 * 45 + 14).toString(2).padStart(11, '0'),
    );
  });

  it('packs a leftover character into six bits', () => {
    expect(bits((b) => new AlphanumericData('A').write(b))).toBe(
      (10).toString(2).padStart(6, '0'),
    );
  });

  // The 45-character set puts digits first, then the alphabet, then the eight
  // punctuation marks — a reordering would silently re-encode everything.
  it('indexes the character set in the documented order', () => {
    expect(bits((b) => new AlphanumericData('0').write(b))).toBe('000000');
    expect(bits((b) => new AlphanumericData('Z').write(b))).toBe(
      (35).toString(2).padStart(6, '0'),
    );
    expect(bits((b) => new AlphanumericData(':').write(b))).toBe(
      (44).toString(2).padStart(6, '0'),
    );
  });

  it('encodes a space as a real character, not a separator', () => {
    expect(bits((b) => new AlphanumericData(' ').write(b))).toBe(
      (36).toString(2).padStart(6, '0'),
    );
  });

  it('predicts exactly the number of bits it writes', () => {
    for (const text of ['A', 'AB', 'ABC', 'HELLO WORLD']) {
      expect(new AlphanumericData(text).getBitsLength(), text).toBe(
        bits((b) => new AlphanumericData(text).write(b)).length,
      );
    }
  });

  it('predicts from a length alone', () => {
    expect(AlphanumericData.getBitsLength(2)).toBe(11);
    expect(AlphanumericData.getBitsLength(1)).toBe(6);
    expect(AlphanumericData.getBitsLength(11)).toBe(5 * 11 + 6);
  });
});

describe('ByteData', () => {
  it('reports its mode', () => {
    expect(new ByteData('abc').mode).toBe(Mode.BYTE);
  });

  it('writes one byte per octet', () => {
    expect(bits((b) => new ByteData('AB').write(b))).toBe('0100000101000010');
  });

  /*
   * Byte mode counts BYTES, not characters. Text is encoded as UTF-8 first, so
   * a two-byte character costs two — and a character-count-based length would
   * under-size the symbol and truncate the payload. The two are equal only for
   * ASCII, which is exactly why this is easy to get wrong.
   */
  it('counts UTF-8 bytes rather than characters', () => {
    expect(new ByteData('abc').getLength()).toBe(3);
    expect(new ByteData('é').getLength()).toBe(2);
    expect(new ByteData('日').getLength()).toBe(3);
    expect(new ByteData('😀').getLength()).toBe(4);
  });

  it('writes the UTF-8 encoding, not the code points', () => {
    expect(bits((b) => new ByteData('é').write(b))).toBe('1100001110101001');
  });

  it('accepts raw binary as well as text', () => {
    const raw = new Uint8Array([0x00, 0xff, 0x7f]).buffer;
    expect(new ByteData(raw).getLength()).toBe(3);
    expect(bits((b) => new ByteData(raw).write(b))).toBe('000000001111111101111111');
  });

  it('predicts exactly the number of bits it writes', () => {
    for (const text of ['a', 'abc', 'héllo', '日本語']) {
      expect(new ByteData(text).getBitsLength(), text).toBe(
        bits((b) => new ByteData(text).write(b)).length,
      );
    }
  });

  it('predicts from a length alone', () => {
    expect(ByteData.getBitsLength(5)).toBe(40);
    expect(ByteData.getBitsLength(0)).toBe(0);
  });

  it('handles an empty payload', () => {
    expect(new ByteData('').getLength()).toBe(0);
    expect(bits((b) => new ByteData('').write(b))).toBe('');
  });
});

describe('KanjiData', () => {
  // Kanji mode needs a Shift-JIS converter, which the consumer supplies —
  // the table is far larger than the encoder itself.
  beforeAll(async () => {
    const { toSJIS } = await import('../../utils/functions/to-sjis');
    setToSJISFunction(toSJIS as unknown as (data: string) => number);
  });

  it('reports its mode and character count', () => {
    const data = new KanjiData('漢字');
    expect(data.mode).toBe(Mode.KANJI);
    expect(data.getLength()).toBe(2);
  });

  // Clause 7.4.6: thirteen bits per character, which is what makes Kanji mode
  // worth having — the same characters cost 24 bits each in UTF-8 byte mode.
  it('packs each character into thirteen bits', () => {
    expect(bits((b) => new KanjiData('漢').write(b))).toHaveLength(13);
    expect(bits((b) => new KanjiData('漢字').write(b))).toHaveLength(26);
  });

  it('beats byte mode for the same text', () => {
    expect(new KanjiData('漢字').getBitsLength()).toBeLessThan(new ByteData('漢字').getBitsLength());
  });

  it('predicts exactly the number of bits it writes', () => {
    expect(new KanjiData('漢字テスト').getBitsLength()).toBe(
      bits((b) => new KanjiData('漢字テスト').write(b)).length,
    );
  });

  it('predicts from a length alone', () => {
    expect(KanjiData.getBitsLength(3)).toBe(39);
  });

  // A character outside the two Shift-JIS ranges cannot be encoded in Kanji
  // mode at all, and reporting that beats emitting a symbol that decodes to
  // something else.
  it('refuses a character the converter cannot map', () => {
    expect(() => bits((b) => new KanjiData('A').write(b))).toThrow();
  });
});
