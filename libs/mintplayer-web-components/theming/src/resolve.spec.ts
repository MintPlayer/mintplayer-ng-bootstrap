import { describe, it, expect, afterEach } from 'vitest';
import {
  BS_THEME_DEFAULT_MODE_META,
  injectThemeAttribute,
  readDefaultModeMeta,
  resolveMode,
  resolveServerTheme,
} from './resolve';

describe('resolveMode', () => {
  it.each<[string, boolean, string]>([
    ['auto', false, 'light'],
    ['auto', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['sepia', true, 'sepia'],
    ['sepia', false, 'sepia'],
  ])('resolveMode(%j, prefersDark=%j) → %j', (mode, prefersDark, expected) => {
    expect(resolveMode(mode, prefersDark)).toBe(expected);
  });
});

describe('readDefaultModeMeta', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  const setMeta = (content: string) => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', BS_THEME_DEFAULT_MODE_META);
    meta.setAttribute('content', content);
    document.head.append(meta);
  };

  it('uses the D5b meta name', () => {
    expect(BS_THEME_DEFAULT_MODE_META).toBe('bs-theme-default-mode');
  });

  it('is null without the meta', () => {
    expect(readDefaultModeMeta(document)).toBeNull();
  });

  it.each([
    ['dark', 'dark'],
    ['auto', 'auto'],
    ['Sepia', 'sepia'],
    ['', null],
    ['x"><script>', null],
    ['dark mode', null],
  ])('content=%j → %j', (content, expected) => {
    setMeta(content);
    expect(readDefaultModeMeta(document)).toBe(expected);
  });

  it('is null for a non-document argument', () => {
    expect(readDefaultModeMeta(null as unknown as Document)).toBeNull();
  });
});

describe('resolveServerTheme', () => {
  it.each<[string | null | undefined, string | null | undefined, string | null]>([
    // No cookie, no default → auto → no attribute.
    [null, undefined, null],
    [undefined, null, null],
    ['', undefined, null],
    ['other=1', undefined, null],
    // Explicit cookie.
    ['bs-theme-mode=dark', undefined, 'dark'],
    ['bs-theme-mode=light', undefined, 'light'],
    ['bs-theme-mode=sepia', undefined, 'sepia'],
    ['a=1; bs-theme-mode=dark; b=2', undefined, 'dark'],
    ['bs-theme-mode=auto', undefined, null],
    // A non-auto default counts as explicit.
    [null, 'dark', 'dark'],
    [null, 'DARK', 'dark'],
    [null, 'auto', null],
    // A valid cookie beats the default, including a valid auto cookie.
    ['bs-theme-mode=light', 'dark', 'light'],
    ['bs-theme-mode=auto', 'dark', null],
    // An invalid cookie is absent, so the default applies.
    ['bs-theme-mode=x%22%3E%3Cscript%3E', 'dark', 'dark'],
    ['bs-theme-mode=x"><script>', undefined, null],
    // An invalid default is absent.
    [null, 'x"><script>', null],
    ['bs-theme-mode=light', 'x"><script>', 'light'],
  ])('cookie %j, defaultMode %j → %j', (cookie, defaultMode, expected) => {
    expect(resolveServerTheme(cookie, { defaultMode })).toBe(expected);
  });

  it('works without options', () => {
    expect(resolveServerTheme('bs-theme-mode=dark')).toBe('dark');
    expect(resolveServerTheme(null)).toBeNull();
  });
});

describe('injectThemeAttribute', () => {
  it('adds the attribute to a bare <html>', () => {
    expect(injectThemeAttribute('<!doctype html><html><head></head></html>', 'dark')).toBe(
      '<!doctype html><html data-bs-theme="dark"><head></head></html>',
    );
  });

  it('merges with existing attributes, keeping them', () => {
    expect(injectThemeAttribute('<html lang="en" dir="ltr"><body></body></html>', 'dark')).toBe(
      '<html lang="en" dir="ltr" data-bs-theme="dark"><body></body></html>',
    );
  });

  it.each([
    '<html data-bs-theme="light" lang="en">',
    "<html data-bs-theme='light' lang=\"en\">",
    '<html data-bs-theme=light lang="en">',
    '<html data-bs-theme lang="en">',
    '<html DATA-BS-THEME="light" lang="en">',
  ])('replaces an existing attribute in %j instead of duplicating it', (tag) => {
    const out = injectThemeAttribute(tag, 'dark');
    expect(out).toBe('<html lang="en" data-bs-theme="dark">');
    expect(out.match(/data-bs-theme/gi)).toHaveLength(1);
  });

  it('keeps a different attribute that merely starts with data-bs-theme', () => {
    expect(injectThemeAttribute('<html data-bs-theme-source="cms">', 'dark')).toBe(
      '<html data-bs-theme-source="cms" data-bs-theme="dark">',
    );
  });

  it('is idempotent', () => {
    const once = injectThemeAttribute('<html lang="nl"><head></head></html>', 'sepia');
    expect(injectThemeAttribute(once, 'sepia')).toBe(once);
    expect(injectThemeAttribute(injectThemeAttribute(once, 'light'), 'sepia')).toBe(once);
  });

  it('touches only the <html> open tag', () => {
    const html = '<html lang="en"><body><div data-bs-theme="light"></div><htmlish></htmlish></body></html>';
    expect(injectThemeAttribute(html, 'dark')).toBe(
      '<html lang="en" data-bs-theme="dark"><body><div data-bs-theme="light"></div><htmlish></htmlish></body></html>',
    );
  });

  it('leaves the markup unchanged for null (auto)', () => {
    const html = '<html lang="en"><head></head></html>';
    expect(injectThemeAttribute(html, null)).toBe(html);
  });

  it('leaves markup with no <html> tag unchanged', () => {
    expect(injectThemeAttribute('<div></div>', 'dark')).toBe('<div></div>');
  });

  it('lower-cases the mode', () => {
    expect(injectThemeAttribute('<html>', 'DARK')).toBe('<html data-bs-theme="dark">');
  });

  // SECURITY INVARIANT (PRD D3): resolveServerTheme output is spliced into
  // markup unescaped. Only the isValidThemeMode regex keeps that safe, so both
  // the resolver and the splice must refuse anything outside it.
  describe('security invariant: the mode regex guards the unescaped splice', () => {
    const payloads = [
      'x"><script>alert(1)</script>',
      'dark" onload="alert(1)',
      "dark' onload='alert(1)",
      'dark onload=alert(1)',
      'dark>',
      'da rk',
    ];

    it.each(payloads)('resolveServerTheme never returns %j from a cookie', (payload) => {
      expect(resolveServerTheme(`bs-theme-mode=${encodeURIComponent(payload)}`)).toBeNull();
      expect(resolveServerTheme(`bs-theme-mode=${payload}`)).toBeNull();
    });

    it.each(payloads)('resolveServerTheme never returns %j from the default meta', (payload) => {
      expect(resolveServerTheme(null, { defaultMode: payload })).toBeNull();
    });

    it.each(payloads)('injectThemeAttribute refuses %j even when called directly', (payload) => {
      const html = '<html lang="en">';
      expect(injectThemeAttribute(html, payload)).toBe(html);
    });

    it('every value resolveServerTheme can return is inert in an attribute', () => {
      const out = injectThemeAttribute('<html>', resolveServerTheme('bs-theme-mode=high-contrast'));
      expect(out).toBe('<html data-bs-theme="high-contrast">');
      expect(out).toMatch(/^<html data-bs-theme="[a-z0-9-]{1,32}">$/);
    });
  });
});
