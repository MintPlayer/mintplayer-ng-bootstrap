import { BsFormatBytesPipe } from './format-bytes.pipe';

describe('BsFormatBytesPipe', () => {
  const pipe = new BsFormatBytesPipe();

  it.each([
    [0, undefined, '0 Bytes'],
    [512, undefined, '512 Bytes'],
    [1024, undefined, '1 KB'],
    [1536, undefined, '1.5 KB'],
    [1234567, 1, '1.2 MB'],
    [1234567, 0, '1 MB'],
    [1234567, -3, '1 MB'],
    [5 * 1024 ** 4, undefined, '5 TB'],
  ])('formats %d bytes (decimals %s) as %s', (value, decimals, expected) => {
    expect(pipe.transform(value, decimals)).toBe(expected);
  });

  it('keeps a fraction of a byte in bytes, rather than an unnamed unit', () => {
    expect(pipe.transform(0.5)).toBe('0.5 Bytes');
  });

  it('keeps sizes past the last unit in that unit', () => {
    expect(pipe.transform(1024 ** 9)).toBe('1024 YB');
  });
});
