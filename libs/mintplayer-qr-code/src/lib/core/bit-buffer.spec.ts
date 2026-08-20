import { describe, expect, it } from 'vitest';

import { BitBuffer } from './bit-buffer';

/**
 * The bit stream every segment writes into. A QR code's payload is not
 * byte-aligned — a numeric triple is 10 bits, an alphanumeric pair 11, a mode
 * indicator 4 — so the whole encoder depends on this writing bits in
 * **most-significant-first** order and packing them without gaps.
 *
 * Bit order is the thing worth pinning. Reversed, every symbol still encodes,
 * still masks, still renders, and decodes to garbage.
 */

const bits = (buffer: BitBuffer): string =>
  Array.from({ length: buffer.getLengthInBits() }, (_unused, i) => (buffer.get(i) ? '1' : '0')).join('');

describe('BitBuffer', () => {
  it('starts empty', () => {
    expect(new BitBuffer().getLengthInBits()).toBe(0);
  });

  it('writes single bits in order', () => {
    const buffer = new BitBuffer();
    buffer.putBit(true);
    buffer.putBit(false);
    buffer.putBit(true);

    expect(bits(buffer)).toBe('101');
    expect(buffer.getLengthInBits()).toBe(3);
  });

  // Most-significant bit first — the order the standard specifies for every
  // field in the bit stream.
  it('writes a value most-significant bit first', () => {
    const buffer = new BitBuffer();
    buffer.put(0b1011, 4);
    expect(bits(buffer)).toBe('1011');
  });

  it('pads a short value out to the requested width', () => {
    const buffer = new BitBuffer();
    buffer.put(1, 8);
    expect(bits(buffer)).toBe('00000001');
  });

  it('keeps only the low bits when the value overflows its width', () => {
    const buffer = new BitBuffer();
    buffer.put(0xff, 4);
    expect(bits(buffer)).toBe('1111');
  });

  it('writes nothing for a width of zero', () => {
    const buffer = new BitBuffer();
    buffer.put(0xff, 0);
    expect(buffer.getLengthInBits()).toBe(0);
  });

  // Fields do not align to bytes, so the buffer has to carry a value across a
  // byte boundary without dropping or duplicating a bit.
  it('carries a value across a byte boundary', () => {
    const buffer = new BitBuffer();
    buffer.put(0b111, 3);
    buffer.put(0b101010101, 9);

    expect(bits(buffer)).toBe('111101010101');
    expect(buffer.getLengthInBits()).toBe(12);
  });

  it('packs the real field widths the encoder uses', () => {
    const buffer = new BitBuffer();
    buffer.put(0b0001, 4); // numeric mode indicator
    buffer.put(11, 10); // character count, version 1
    buffer.put(123, 10); // one numeric triple

    expect(buffer.getLengthInBits()).toBe(24);
    expect(bits(buffer).slice(0, 4)).toBe('0001');
    expect(bits(buffer).slice(14)).toBe('0001111011');
  });

  it('grows a byte at a time as bits arrive', () => {
    const buffer = new BitBuffer();
    for (let i = 0; i < 17; i++) buffer.putBit(true);
    expect(buffer.getLengthInBits()).toBe(17);
    expect(bits(buffer)).toBe('1'.repeat(17));
  });

  // The encoder reads the packed bytes straight out of the private buffer to
  // build codewords, so a partially filled trailing byte must be zero-padded
  // rather than left holding stale bits.
  it('leaves the tail of a partial byte clear', () => {
    const buffer = new BitBuffer();
    buffer.put(0b101, 3);

    const packed = (buffer as unknown as { buffer: number[] }).buffer;

    expect(packed).toHaveLength(1);
    expect(packed[0]).toBe(0b10100000);
  });

  it('packs whole bytes exactly', () => {
    const buffer = new BitBuffer();
    buffer.put(0xec, 8);
    buffer.put(0x11, 8);

    expect((buffer as unknown as { buffer: number[] }).buffer).toEqual([0xec, 0x11]);
  });

  it('reads back every bit it was given, in order', () => {
    const buffer = new BitBuffer();
    const written = '110010101110001101';
    for (const bit of written) buffer.putBit(bit === '1');
    expect(bits(buffer)).toBe(written);
  });
});
