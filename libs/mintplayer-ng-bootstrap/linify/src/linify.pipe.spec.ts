import { BsLinifyPipe } from './linify.pipe';

describe('BsLinifyPipe', () => {
  const pipe = new BsLinifyPipe();

  it('splits on newlines', () => {
    expect(pipe.transform('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty lines by default', () => {
    expect(pipe.transform('a\n\nb')).toEqual(['a', 'b']);
  });

  it('keeps empty lines when asked', () => {
    expect(pipe.transform('a\n\nb', false)).toEqual(['a', '', 'b']);
  });

  it('returns a single entry when there is no newline', () => {
    expect(pipe.transform('single')).toEqual(['single']);
  });

  it('returns nothing for an empty string when removing empties', () => {
    expect(pipe.transform('')).toEqual([]);
  });

  it('returns one empty entry for an empty string when keeping empties', () => {
    expect(pipe.transform('', false)).toEqual(['']);
  });

  it('does not trim the lines it keeps', () => {
    expect(pipe.transform('  a  \n  b  ')).toEqual(['  a  ', '  b  ']);
  });

  // `.replace('\r\n', '\n')` without the /g flag rewrites only the FIRST CRLF,
  // so every later line keeps a trailing \r. Asserted as-is rather than as the
  // behaviour one would expect: consumers splitting Windows-authored text get
  // this today, and changing it is a behaviour change, not a test fix.
  it('normalizes only the first CRLF, leaving later ones with a trailing CR', () => {
    expect(pipe.transform('a\r\nb\r\nc')).toEqual(['a', 'b\r', 'c']);
  });

  it('handles a lone CRLF-separated pair correctly', () => {
    expect(pipe.transform('a\r\nb')).toEqual(['a', 'b']);
  });

  it('does not treat a bare CR as a line break', () => {
    expect(pipe.transform('a\rb')).toEqual(['a\rb']);
  });
});
