import { BsSlugifyPipe } from './slugify.pipe';

describe('BsSlugifyPipe', () => {
  const pipe = new BsSlugifyPipe();

  it('lowercases', () => {
    expect(pipe.transform('Hello')).toBe('hello');
  });

  it('replaces spaces with hyphens', () => {
    expect(pipe.transform('hello world')).toBe('hello-world');
  });

  it('collapses runs of whitespace into a single hyphen', () => {
    expect(pipe.transform('hello   world')).toBe('hello-world');
  });

  it('treats tabs and newlines as whitespace', () => {
    expect(pipe.transform('hello\tbig\nworld')).toBe('hello-big-world');
  });

  it('strips diacritics rather than dropping the letters', () => {
    expect(pipe.transform('Crème Brûlée')).toBe('creme-brulee');
  });

  it('keeps digits and underscores', () => {
    expect(pipe.transform('Angular_22 rocks')).toBe('angular_22-rocks');
  });

  it('drops punctuation', () => {
    expect(pipe.transform('Hello, World!')).toBe('hello-world');
  });

  it('collapses consecutive hyphens', () => {
    expect(pipe.transform('a -- b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(pipe.transform('  hello world  ')).toBe('hello-world');
  });

  it('returns an empty string for an empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  // Every character is non-word, so the result is empty rather than a bare
  // separator — a slug of "-" would produce a broken route segment.
  it('returns an empty string when nothing survives', () => {
    expect(pipe.transform('!!! ???')).toBe('');
  });

  // Regression guard. The character class used to be ASCII \w, which removed
  // every character of a script with no Latin decomposition — so a non-Latin
  // title slugified to the empty string, i.e. a route segment that cannot work.
  it('keeps letters from any script', () => {
    expect(pipe.transform('日本語 title')).toBe('日本語-title');
  });

  it('keeps a non-Latin title that has no Latin part at all', () => {
    expect(pipe.transform('日本語')).toBe('日本語');
  });

  it('keeps Cyrillic', () => {
    expect(pipe.transform('Привет мир')).toBe('привет-мир');
  });

  it('is idempotent — slugifying a slug changes nothing', () => {
    const slug = pipe.transform('Crème Brûlée, deluxe!');
    expect(pipe.transform(slug)).toBe(slug);
  });
});
