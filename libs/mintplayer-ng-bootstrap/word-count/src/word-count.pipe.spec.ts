import { BsWordCountPipe } from './word-count.pipe';

describe('BsWordCountPipe', () => {
  const pipe = new BsWordCountPipe();

  it('counts a single word', () => {
    expect(pipe.transform('hello')).toBe(1);
  });

  it('counts words separated by single spaces', () => {
    expect(pipe.transform('hello big world')).toBe(3);
  });

  it('collapses runs of spaces', () => {
    expect(pipe.transform('hello     world')).toBe(2);
  });

  it('ignores leading and trailing whitespace', () => {
    expect(pipe.transform('   hello world   ')).toBe(2);
  });

  it('returns 0 for an empty string', () => {
    expect(pipe.transform('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(pipe.transform(null as unknown as string)).toBe(0);
  });

  // Whitespace-only is not caught by the `=== ''` guard, so it goes through the
  // trim-and-split path — which is exactly why the `.filter(w => w !== '')` at
  // the end is load-bearing rather than defensive.
  it('returns 0 for whitespace only', () => {
    expect(pipe.transform('   ')).toBe(0);
  });

  // KNOWN DEFECT, pinned rather than endorsed. The implementation collapses
  // `\s{2,}` to a single space and then splits on a literal ' ', so a SINGLE
  // newline or tab between two words is neither collapsed nor split on — the
  // pair counts as one word. Two or more whitespace characters happen to work,
  // which is what makes it hard to notice.
  it('counts words separated by a single newline or tab as one', () => {
    expect(pipe.transform('hello\nbig\tworld')).toBe(1);
  });

  it('counts correctly when the separator is two or more whitespace characters', () => {
    expect(pipe.transform('hello \n world')).toBe(2);
  });

  it('counts punctuation-attached words once', () => {
    expect(pipe.transform('hello, world!')).toBe(2);
  });

  it('counts a hyphenated word as one', () => {
    expect(pipe.transform('state-of-the-art design')).toBe(2);
  });

  it('counts non-Latin words', () => {
    expect(pipe.transform('日本語 の テキスト')).toBe(3);
  });
});
