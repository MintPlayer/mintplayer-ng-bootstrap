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

  // The regexes are ASCII \w, so scripts without a Latin decomposition are
  // removed entirely. Pinning this down because it is surprising and load-
  // bearing for any consumer slugifying non-Latin titles.
  it('drops characters outside the ASCII word class', () => {
    expect(pipe.transform('日本語 title')).toBe('title');
  });

  it('is idempotent — slugifying a slug changes nothing', () => {
    const slug = pipe.transform('Crème Brûlée, deluxe!');
    expect(pipe.transform(slug)).toBe(slug);
  });
});
