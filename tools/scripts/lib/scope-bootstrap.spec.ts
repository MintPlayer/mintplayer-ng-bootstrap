import { scopeBootstrapPart, subGuard } from './scope-bootstrap.mjs';

/** The examples of docs/prd/per-component-styles-452.md §3.2, with the #458 sub-class guard. */
const scope = (selector: string, partial: string) =>
  scopeBootstrapPart(`${selector} { color: red; }`, partial).css.replace(/\s*\{[\s\S]*$/, '');

const ROOT = ':where([data-mps])';
const sub = (partial: string) => subGuard(partial) as string;

describe('scopeBootstrapPart', () => {
  it.each([
    // root classes: the element itself must be stamped
    ['.btn-group > .btn', 'button-group', `.btn-group${ROOT} > .btn`],
    ['.table > :not(caption) > * > *', 'tables', `.table${ROOT} > :not(caption) > * > *`],
    // sub classes: stamped, or inside a stamped root of their own partial
    ['.modal-header .btn-close', 'modal', `.modal-header${sub('modal')} .btn-close`],
    ['.navbar-nav .nav-link', 'navbar', `.navbar-nav${sub('navbar')} .nav-link`],
    ['.card > .list-group', 'card', `.card${sub('card')} > .list-group`],
    ['.was-validated .form-control:invalid', 'forms', `.was-validated .form-control${sub('forms')}:invalid`],
    ['.navbar-text a', 'navbar', `.navbar-text${sub('navbar')} a`],
    ['[data-bs-theme=dark] .form-select', 'forms', `[data-bs-theme=dark] .form-select${sub('forms')}`],
    ['.form-control::placeholder', 'forms', `.form-control${sub('forms')}::placeholder`],
    ['.active > .page-link, .page-link.active', 'pagination', `.active > .page-link${sub('pagination')}, .page-link${sub('pagination')}.active`],
    ['.table-active', 'tables', '.table-active:where([data-mps], .table[data-mps] *)'],
    ['.modal-title', 'modal', '.modal-title:where([data-mps], .modal-content[data-mps] *)'],
    ['.form-label', 'forms', '.form-label:where([data-mps], :is(form, .input-group, .form-floating)[data-mps] *)'],
  ])('%s (%s) → %s', (stock, partial, expected) => {
    expect(scope(stock, partial)).toBe(expected);
  });

  it('has no sub guard for a partial without sub classes', () => {
    expect(subGuard('spinners')).toBeNull();
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

  it('fails loudly on an owned class that is neither root nor sub', () => {
    // forms classifies its whole `form-*` family as sub; tables lists its sub classes one by one.
    expect(() => scopeBootstrapPart('.form-brandnew-thing { a: b; }', 'forms')).not.toThrow();
    expect(() => scopeBootstrapPart('.table-brandnew { a: b; }', 'tables')).toThrow(/PART_CLASSES/);
  });

  it('only counts top-level classes, not those inside :not()', () => {
    expect(() => scope('.btn:not(.card)', 'card')).toThrow(/OWNED_CLASSES/);
    expect(scope('.btn .card:not(.card-body)', 'card')).toBe(`.btn .card${sub('card')}:not(.card-body)`);
  });
});
