import { describe, expect, it } from 'vitest';

import { rescopeCss } from './rescope-css.mjs';

const scope = (css: string, opts: Record<string, unknown> = {}) =>
  rescopeCss(css, { scope: 'badge', ...opts });

describe('rescopeCss — :host mapping', () => {
  it(':host becomes the element tag', () => {
    expect(scope(':host { color: red; }')).toBe('mp-badge { color: red; }');
  });

  it(':host(.x) unwraps onto the tag', () => {
    expect(scope(':host(.pill) { border-radius: 50rem; }')).toBe(
      'mp-badge.pill { border-radius: 50rem; }',
    );
  });

  it(':host([attr=value]) unwraps onto the tag', () => {
    expect(scope(':host([color=danger]) { background: red; }')).toBe(
      'mp-badge[color=danger] { background: red; }',
    );
  });

  it(':host descendant compounds still get the scope attribute', () => {
    expect(scope(':host .icon { width: 1em; }')).toBe(
      'mp-badge .icon[data-mps=badge] { width: 1em; }',
    );
  });

  it('a literal host-tag compound behaves like :host', () => {
    expect(scope('mp-badge .icon { width: 1em; }')).toBe(
      'mp-badge .icon[data-mps=badge] { width: 1em; }',
    );
  });
});

describe('rescopeCss — compound scoping', () => {
  it('scopes a bare class', () => {
    expect(scope('.badge { padding: 1px; }')).toBe(
      '.badge[data-mps=badge] { padding: 1px; }',
    );
  });

  it('scopes EVERY compound of a complex selector (Angular parity)', () => {
    // With `.a .b` scoped only on `.b`, a consumer element with class `a`
    // that happens to contain the stamped `.b` would satisfy the rule — the
    // ancestor test answered by someone else's DOM.
    expect(scope('.a .b { color: red; }')).toBe(
      '.a[data-mps=badge] .b[data-mps=badge] { color: red; }',
    );
  });

  it('scopes only the subject when scopeAllCompounds is false', () => {
    expect(scope('.a .b { color: red; }', { scopeAllCompounds: false })).toBe(
      '.a .b[data-mps=badge] { color: red; }',
    );
  });

  it('handles comma lists', () => {
    expect(scope('.a, .b { color: red; }')).toBe(
      '.a[data-mps=badge], .b[data-mps=badge] { color: red; }',
    );
  });

  it('keeps the attribute before pseudo-elements', () => {
    expect(scope('.x:hover::before { content: ""; }')).toBe(
      '.x:hover[data-mps=badge]::before { content: ""; }',
    );
  });

  it('treats legacy single-colon pseudo-elements as pseudo-elements', () => {
    expect(scope('.x:after { content: ""; }')).toBe(
      '.x[data-mps=badge]:after { content: ""; }',
    );
  });

  it('replaces a lone universal selector with the attribute', () => {
    expect(scope('* { box-sizing: border-box; }')).toBe(
      '[data-mps=badge] { box-sizing: border-box; }',
    );
  });

  it('treats :is()/:where()/:not() as opaque units of their compound', () => {
    expect(scope(':is(.a, .b):hover { color: red; }')).toBe(
      ':is(.a, .b):hover[data-mps=badge] { color: red; }',
    );
    expect(scope('.x:not(.y) { color: red; }')).toBe(
      '.x:not(.y)[data-mps=badge] { color: red; }',
    );
  });

  it('scopes child/sibling combinator chains per compound', () => {
    expect(scope('.a > .b + .c { color: red; }')).toBe(
      '.a[data-mps=badge] > .b[data-mps=badge] + .c[data-mps=badge] { color: red; }',
    );
  });

  it('leaves attribute selectors with combinator-lookalike values intact', () => {
    expect(scope('[title=">"] { color: red; }')).toBe(
      '[title=">"][data-mps=badge] { color: red; }',
    );
  });
});

describe('rescopeCss — at-rules', () => {
  it('recurses into conditional groups', () => {
    expect(scope('@media (min-width: 600px) { .x { color: red; } }')).toBe(
      '@media (min-width: 600px) { .x[data-mps=badge] { color: red; } }',
    );
    expect(scope('@container (inline-size > 10em) { .x { color: red; } }')).toBe(
      '@container (inline-size > 10em) { .x[data-mps=badge] { color: red; } }',
    );
    expect(scope('@layer base { .x { color: red; } }')).toBe(
      '@layer base { .x[data-mps=badge] { color: red; } }',
    );
  });

  it('leaves @keyframes frame selectors untouched', () => {
    const css = '@keyframes spin { from { rotate: 0deg; } to { rotate: 360deg; } }';
    expect(scope(css)).toBe(css);
  });

  it('leaves @font-face and @property untouched', () => {
    const ff = '@font-face { font-family: X; src: url("x.woff2"); }';
    expect(scope(ff)).toBe(ff);
    const prop = '@property --x { syntax: "*"; inherits: false; }';
    expect(scope(prop)).toBe(prop);
  });
});

describe('rescopeCss — loud failures and the escape hatch', () => {
  it('throws on ::slotted', () => {
    expect(() => scope('::slotted(.x) { color: red; }')).toThrow(/shadow-only/);
  });

  it('throws on :host-context', () => {
    expect(() => scope(':host-context(.dark) { color: red; }')).toThrow(/shadow-only/);
  });

  it('throws on :root', () => {
    expect(() => scope(':root { --x: 1; }')).toThrow(/:root/);
  });

  it('throws on html/body subjects', () => {
    expect(() => scope('body .x { color: red; }')).toThrow(/body/);
  });

  it('emits an @mps-global rule verbatim and consumes the marker', () => {
    const css = '/*! @mps-global */\n[data-bs-theme=dark] .x { color: white; }';
    expect(scope(css)).toBe('[data-bs-theme=dark] .x { color: white; }');
  });

  it('ancestor-subject rules WITHOUT the marker are scoped — the documented trap', () => {
    // This is close.component.scss's [_nghost] trap: the ancestor test now
    // requires a stamped ancestor, so the rule goes dead unless marked global.
    expect(scope('[data-bs-theme=dark] .x { color: white; }')).toBe(
      '[data-bs-theme=dark][data-mps=badge] .x[data-mps=badge] { color: white; }',
    );
  });

  it('rejects invalid scope names', () => {
    expect(() => rescopeCss('.x{}', { scope: 'Bad Scope' })).toThrow(/invalid scope/);
    expect(() => rescopeCss('.x{}', {})).toThrow(/invalid scope/);
  });
});

describe('rescopeCss — values are never touched', () => {
  it('leaves declarations, strings and urls alone', () => {
    expect(
      scope('.x { background: url("a>b.png"); content: ".y"; }'),
    ).toBe('.x[data-mps=badge] { background: url("a>b.png"); content: ".y"; }');
  });
});
