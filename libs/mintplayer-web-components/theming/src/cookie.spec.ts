import { describe, it, expect } from 'vitest';
import { BS_THEME_COOKIE_NAME, isValidThemeMode, readThemeCookie, writeThemeCookie } from './cookie';

describe('BS_THEME_COOKIE_NAME', () => {
  it('is the D3 cookie name', () => {
    expect(BS_THEME_COOKIE_NAME).toBe('bs-theme-mode');
  });
});

describe('isValidThemeMode', () => {
  it.each(['auto', 'light', 'dark', 'sepia', 'high-contrast', 'DARK', 'a', '0', 'x'.repeat(32)])(
    'accepts %j',
    (value) => {
      expect(isValidThemeMode(value)).toBe(true);
    },
  );

  it.each([
    '',
    'x'.repeat(33),
    'dark mode',
    'dark_mode',
    'dark;',
    'dark=1',
    '"dark"',
    "'dark'",
    'x"><script>alert(1)</script>',
    '<dark>',
    'dark\n',
    'café',
    null,
    undefined,
    42,
    {},
    ['dark'],
  ])('rejects %j', (value) => {
    expect(isValidThemeMode(value)).toBe(false);
  });
});

describe('readThemeCookie', () => {
  it.each<[string | null | undefined, string | null]>([
    [null, null],
    [undefined, null],
    ['', null],
    ['bs-theme-mode=dark', 'dark'],
    ['bs-theme-mode=light', 'light'],
    ['bs-theme-mode=auto', 'auto'],
    ['bs-theme-mode=sepia', 'sepia'],
    ['bs-theme-mode=DARK', 'dark'],
    ['a=1; bs-theme-mode=dark; b=2', 'dark'],
    ['a=1;bs-theme-mode=dark;b=2', 'dark'],
    ['  bs-theme-mode = dark', null],
    ['bs-theme-mode=  dark  ', 'dark'],
    // First pair wins, even when a later one is valid.
    ['bs-theme-mode=dark; bs-theme-mode=light', 'dark'],
    ['bs-theme-mode=bad value; bs-theme-mode=light', null],
    // A cookie whose name merely ENDS or STARTS with ours is not ours.
    ['x-bs-theme-mode=dark', null],
    ['bs-theme-mode-old=dark', null],
    // Encoded values decode; undecodable ones count as absent.
    ['bs-theme-mode=%64ark', 'dark'],
    ['bs-theme-mode=%E0%A4%A', null],
    // Invalid after decoding: the markup-splice payload.
    ['bs-theme-mode=x%22%3E%3Cscript%3E', null],
    ['bs-theme-mode=x"><script>', null],
    ['bs-theme-mode=', null],
    ['bs-theme-mode', null],
    // RFC 6265 quoted values: one surrounding pair is stripped, nothing else.
    ['bs-theme-mode="dark"', 'dark'],
    ['bs-theme-mode=""', null],
    ['bs-theme-mode="', null],
    ['bs-theme-mode=""dark""', null],
  ])('%j → %j', (input, expected) => {
    expect(readThemeCookie(input)).toBe(expected);
  });
});

describe('writeThemeCookie', () => {
  const fakeDoc = () => {
    const writes: string[] = [];
    const doc = {
      set cookie(value: string) {
        writes.push(value);
      },
      get cookie() {
        return '';
      },
    } as unknown as Document;
    return { doc, writes };
  };

  it('writes Path, SameSite=Lax and a one-year Max-Age, without Secure or Domain by default', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('dark', { secure: false }, doc);
    expect(writes).toEqual(['bs-theme-mode=dark; Path=/; SameSite=Lax; Max-Age=31536000']);
  });

  it('adds Secure only when asked', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('light', { secure: true }, doc);
    expect(writes[0]).toMatch(/; Secure$/);
  });

  it('passes cookieDomain through verbatim, after expiring a shadowing host-only cookie', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('dark', { cookieDomain: '.example.com', secure: true }, doc);
    expect(writes).toEqual([
      'bs-theme-mode=; Path=/; Max-Age=0',
      'bs-theme-mode=dark; Path=/; SameSite=Lax; Max-Age=31536000; Domain=.example.com; Secure',
    ]);
  });

  it('does not expire anything without cookieDomain', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('dark', { secure: false }, doc);
    expect(writes).toHaveLength(1);
  });

  it('lower-cases the stored mode', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('Sepia', { secure: false }, doc);
    expect(writes[0]).toMatch(/^bs-theme-mode=sepia;/);
  });

  it('never writes an invalid mode', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('x"; Domain=evil.test', { secure: false }, doc);
    expect(writes).toEqual([]);
  });

  it('round-trips through readThemeCookie', () => {
    const { doc, writes } = fakeDoc();
    writeThemeCookie('high-contrast', { secure: false }, doc);
    expect(readThemeCookie(writes[0].split(';')[0])).toBe('high-contrast');
  });
});
