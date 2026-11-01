/**
 * #452 §3.2: every compiled Bootstrap part ships two variants of one partial.
 * The scoped one (`bootstrap<Partial>`) must match only DOM a @mintplayer
 * component rendered and stamped with `data-mps`; the verbatim one
 * (`bootstrap<Partial>Page`) is stock Bootstrap. Both must cascade exactly
 * like stock Bootstrap, so they are interchangeable on one page under one
 * registry key.
 *
 * Checked per part:
 * - equivalence: deleting every `:where([data-mps])` from the scoped variant
 *   yields the page variant byte for byte (the guard is the only change, and
 *   `:where()` adds no specificity);
 * - structure: every selector carries the guard exactly once, top-level, right
 *   after the LEFTMOST class the partial owns; only class-less selectors
 *   (`:root`, `[data-bs-theme]` token blocks) ship without one;
 * - layering: the order statements first, then one `mp.bootstrap.components` block;
 * - decoy: no scoped selector matches an unstamped tree that uses the classes;
 *   a stamped copy of the same tree is matched (positive control).
 */
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
// The ownership table is the codegen's; the spec holds the output to it.
import { OWNED_CLASSES, SCOPE_GUARD } from '../../../tools/scripts/lib/scope-bootstrap.mjs';
import { BOOTSTRAP_PARTIAL_ORDER, BOOTSTRAP_SUBLAYERS } from '../../../tools/scripts/lib/wc-codegen.mjs';

type PartModule = Record<string, string>;
const modules = import.meta.glob<PartModule>('../styles/parts/*.bootstrap.styles.ts', { eager: true });

const parts = Object.entries(modules).map(([path, mod]) => {
  const name = /([\w-]+)\.bootstrap\.styles\.ts$/.exec(path)![1];
  const camel = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return { name, scoped: mod[`${camel}BootstrapStyles`], page: mod[`${camel}BootstrapPageStyles`] };
});

const owned = OWNED_CLASSES as Record<string, RegExp>;

/** Every style-rule selector, outside @keyframes and friends. */
function selectorsOf(css: string): string[] {
  const out: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    for (let p = rule.parent; p; p = p.parent) {
      if (p.type === 'atrule' && /keyframes/i.test((p as postcss.AtRule).name)) return;
    }
    selectorParser((list) => list.each((sel) => void out.push(String(sel).trim()))).processSync(rule.selector);
  });
  return out;
}

const isGuard = (node: selectorParser.Node) => node.type === 'pseudo' && String(node) === SCOPE_GUARD;

describe('Bootstrap parts', () => {
  it('compiles one module per component partial (buttons stays in the baseline)', () => {
    const expected = BOOTSTRAP_PARTIAL_ORDER.filter((name: string) => name !== 'buttons');
    expect(parts.map((part) => part.name).sort()).toEqual([...expected].sort());
    expect(parts.every((part) => typeof part.scoped === 'string' && typeof part.page === 'string')).toBe(true);
  });

  it('has an ownership entry for every part', () => {
    expect(parts.filter((part) => !owned[part.name]).map((part) => part.name)).toEqual([]);
  });
});

describe.each(parts)('part "$name"', ({ name, scoped, page }) => {
  it('differs from the verbatim variant only by the guard', () => {
    expect(scoped.split(SCOPE_GUARD).join('')).toBe(page);
    expect(scoped).not.toBe(page);
  });

  it('starts with the layer order and keeps every rule in the shared components sublayer', () => {
    const top = postcss.parse(scoped).nodes.filter((node) => node.type !== 'comment');
    expect(top.map((node) => (node as postcss.AtRule).name)).toEqual(['layer', 'layer', 'layer']);
    expect((top[0] as postcss.AtRule).params).toBe('mp.bootstrap, mp.components');
    expect((top[1] as postcss.AtRule).params).toBe(BOOTSTRAP_SUBLAYERS.map((s: string) => `mp.bootstrap.${s}`).join(', '));
    expect((top[2] as postcss.AtRule).params).toBe('mp.bootstrap.components');
  });

  it('guards exactly the leftmost owned class of every selector that has a class', () => {
    const offenders: string[] = [];
    selectorsOf(scoped).forEach((text) => {
      selectorParser((list) => {
        list.each((sel) => {
          const top = sel.nodes;
          const guards = top.filter(isGuard);
          const nested = String(sel).split(SCOPE_GUARD).length - 1;
          const firstOwned = top.find((node) => node.type === 'class' && owned[name].test(node.value));
          const hasClass = top.some((node) => node.type === 'class');
          if (!hasClass) {
            if (nested !== 0) offenders.push(text);
            return;
          }
          const ok = guards.length === 1 && nested === 1 && !!firstOwned && firstOwned.next() === guards[0];
          if (!ok) offenders.push(text);
        });
      }).processSync(text);
    });
    expect(offenders).toEqual([]);
  });

  it('ships only class-less token blocks unguarded', () => {
    const unguarded = [...new Set(selectorsOf(scoped).filter((text) => !text.includes(SCOPE_GUARD)))];
    expect(unguarded.filter((text) => !/^(:root|\[data-bs-theme=(light|dark)\])$/.test(text))).toEqual([]);
  });
});

/** Rules jsdom can evaluate: the guard left in, pseudo-elements stripped. */
function matchable(css: string): string[] {
  return selectorsOf(css)
    .filter((text) => text.includes(SCOPE_GUARD))
    .map((text) => text.replace(/::?(before|after|placeholder|-webkit-[\w-]+|-moz-[\w-]+|file-selector-button)\b/g, ''));
}

/** A tree using every class a part names, in Bootstrap's usual nesting. */
const DECOY = `
  <div class="container"><div class="row g-3"><div class="col-md-6 offset-md-1">
    <div class="card"><div class="card-header"><ul class="nav nav-tabs card-header-tabs"><li class="nav-item"><a class="nav-link active">a</a></li></ul></div>
      <div class="card-body"><h5 class="card-title">t</h5><p class="card-text">x</p></div>
      <ul class="list-group list-group-flush"><li class="list-group-item active">i</li></ul></div>
    <form class="was-validated"><div class="input-group"><input class="form-control is-invalid"><span class="input-group-text">@</span></div>
      <select class="form-select"></select><div class="form-check form-switch"><input class="form-check-input" type="checkbox"></div>
      <div class="invalid-feedback">bad</div><input class="btn-check" type="radio"><label class="btn">b</label></form>
    <div class="btn-group"><button class="btn">1</button><button class="btn">2</button></div>
    <div class="table-responsive"><table class="table table-striped"><tbody><tr><td>c</td></tr></tbody></table></div>
    <nav class="navbar navbar-expand-lg"><div class="container-fluid"><a class="navbar-brand">b</a><button class="navbar-toggler"><span class="navbar-toggler-icon"></span></button>
      <div class="navbar-collapse collapse show"><ul class="navbar-nav"><li class="nav-item dropdown"><a class="nav-link dropdown-toggle">d</a>
      <ul class="dropdown-menu show"><li><a class="dropdown-item">x</a></li></ul></li></ul></div></div></nav>
    <ul class="pagination"><li class="page-item"><a class="page-link">1</a></li></ul>
    <div class="alert alert-primary alert-dismissible"><button class="btn-close"></button></div><span class="badge">1</span>
    <ol class="breadcrumb"><li class="breadcrumb-item">h</li></ol>
    <div class="progress"><div class="progress-bar"></div></div><div class="spinner-border"></div><span class="placeholder"></span>
    <div class="accordion"><div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed">a</button></h2><div class="accordion-collapse collapse"><div class="accordion-body">b</div></div></div></div>
    <div class="carousel slide"><div class="carousel-inner"><div class="carousel-item active">s</div></div><button class="carousel-control-prev"><span class="carousel-control-prev-icon"></span></button></div>
    <div class="toast-container"><div class="toast show"><div class="toast-header">h</div><div class="toast-body">b</div></div></div>
    <div class="modal fade show"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">m</h5></div><div class="modal-body">b</div></div></div></div>
    <div class="modal-backdrop fade show"></div>
    <div class="offcanvas offcanvas-start show"><div class="offcanvas-header"><h5 class="offcanvas-title">o</h5></div><div class="offcanvas-body">b</div></div>
    <div class="tooltip bs-tooltip-top show"><div class="tooltip-arrow"></div><div class="tooltip-inner">t</div></div>
    <div class="popover bs-popover-top"><div class="popover-arrow"></div><h3 class="popover-header">h</h3><div class="popover-body">b</div></div>
  </div></div></div>`;

function hits(selectors: string[], root: HTMLElement): string[] {
  return selectors.filter((selector) => {
    try {
      return root.querySelector(selector) !== null;
    } catch {
      return false; // a selector jsdom cannot parse cannot match either
    }
  });
}

describe('Bootstrap parts against a decoy tree', () => {
  const host = document.createElement('div');
  beforeEach(() => {
    host.innerHTML = DECOY;
    document.body.appendChild(host);
  });
  afterEach(() => host.remove());

  it('match nothing the consumer rendered (no data-mps)', () => {
    expect(parts.flatMap(({ scoped }) => hits(matchable(scoped), host))).toEqual([]);
  });

  it('match the same tree once a component stamped it (positive control)', () => {
    host.querySelectorAll('*').forEach((el) => el.setAttribute('data-mps', 'x'));
    const unmatched = parts
      .filter(({ name }) => !['transitions'].includes(name))
      .filter(({ scoped }) => hits(matchable(scoped), host).length === 0)
      .map(({ name }) => name);
    expect(unmatched).toEqual([]);
  });
});
