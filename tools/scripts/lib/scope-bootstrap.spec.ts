import { scopeBootstrapPart } from './scope-bootstrap.mjs';

/** The examples of docs/prd/per-component-styles-452.md §3.2. */
const scope = (selector: string, partial: string) =>
  scopeBootstrapPart(`${selector} { color: red; }`, partial).css.replace(/\s*\{[\s\S]*$/, '');

describe('scopeBootstrapPart', () => {
  it.each([
    ['.card > .list-group', 'card', '.card:where([data-mps]) > .list-group'],
    ['.btn-group > .btn', 'button-group', '.btn-group:where([data-mps]) > .btn'],
    ['.was-validated .form-control:invalid', 'forms', '.was-validated .form-control:where([data-mps]):invalid'],
    ['.table > :not(caption) > * > *', 'tables', '.table:where([data-mps]) > :not(caption) > * > *'],
    ['.navbar-text a', 'navbar', '.navbar-text:where([data-mps]) a'],
    ['[data-bs-theme=dark] .form-select', 'forms', '[data-bs-theme=dark] .form-select:where([data-mps])'],
    ['.form-control::placeholder', 'forms', '.form-control:where([data-mps])::placeholder'],
    ['.active > .page-link, .page-link.active', 'pagination', '.active > .page-link:where([data-mps]), .page-link:where([data-mps]).active'],
  ])('%s (%s) → %s', (stock, partial, expected) => {
    expect(scope(stock, partial)).toBe(expected);
  });

  it('ships class-less token blocks verbatim and reports them', () => {
    const { css, verbatim } = scopeBootstrapPart(':root { --x: 1; } [data-bs-theme=dark] { --x: 2; }', 'close');
    expect(css).not.toContain('data-mps');
    expect(verbatim).toEqual([':root', '[data-bs-theme=dark]']);
  });

  it('leaves @keyframes alone', () => {
    expect(scopeBootstrapPart('@keyframes spin { from { a: b; } to { a: c; } }', 'spinners').css).not.toContain('data-mps');
  });

  it('fails loudly on a selector whose classes the partial does not own', () => {
    expect(() => scopeBootstrapPart('.foo .bar { a: b; }', 'card')).toThrow(/OWNED_CLASSES/);
  });

  it('only counts top-level classes, not those inside :not()', () => {
    expect(() => scope('.btn:not(.card)', 'card')).toThrow(/OWNED_CLASSES/);
    expect(scope('.btn .card:not(.card-body)', 'card')).toBe('.btn .card:where([data-mps]):not(.card-body)');
  });
});
