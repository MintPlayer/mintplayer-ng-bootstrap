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

  // Regression guard: without the /g flag only the FIRST CRLF was rewritten, so
  // every later line of Windows-authored text kept a trailing \r.
  it('normalizes every CRLF, not just the first', () => {
    expect(pipe.transform('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });

  it('handles a lone CRLF-separated pair correctly', () => {
    expect(pipe.transform('a\r\nb')).toEqual(['a', 'b']);
  });

  it('does not treat a bare CR as a line break', () => {
    expect(pipe.transform('a\rb')).toEqual(['a\rb']);
  });
});
