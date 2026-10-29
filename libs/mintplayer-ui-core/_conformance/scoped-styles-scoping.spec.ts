import { typeaheadScopedStyles } from '@mintplayer/ui-core/typeahead';

/**
 * The no-leak property of every scoped sheet the core ships (the ui-core half
 * of `libs/mintplayer-web-components/_conformance/light-styles-scoping.spec.ts`):
 * every compound of every selector carries its own `[data-mps=<scope>]`, and
 * no selector matches a decoy tree that uses the same class names without the
 * scope attribute. A sheet that fails this styles the consumer's page.
 */
const SHEETS: ReadonlyArray<{ scope: string; css: string }> = [{ scope: 'typeahead', css: typeaheadScopedStyles }];

function rulesOf(css: string): CSSStyleRule[] {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const collect = (list: CSSRuleList): CSSStyleRule[] =>
    Array.from(list).flatMap((rule) => {
      if (rule instanceof CSSStyleRule) return [rule];
      if ('cssRules' in rule) return collect((rule as CSSGroupingRule).cssRules);
      return [];
    });
  const rules = collect(style.sheet!.cssRules);
  style.remove();
  return rules;
}

/** Split a selector list on top-level commas, then each selector on combinators. */
function compoundsOf(selectorText: string): string[] {
  return selectorText
    .split(/\s*,\s*(?![^()]*\))/)
    .flatMap((selector) => selector.split(/\s*[>+~]\s*|\s+/))
    .map((c) => c.replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, ''))
    .filter((c) => c.length > 0 && c !== '*');
}

describe.each(SHEETS)('scoped sheet "$scope"', ({ scope, css }) => {
  const rules = rulesOf(css);
  const marker = `[data-mps=${scope}]`;

  it('has rules', () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  // PRD #437 C1-C2: the order statement first, then every rule in mp.components,
  // so the sheet ranks above the Bootstrap baseline whichever reaches the page first.
  it('declares the layer order first and keeps every rule in @layer mp.components', () => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const top = Array.from(style.sheet!.cssRules);
    style.remove();
    expect(top.map((rule) => rule.constructor.name)).toEqual(['CSSLayerStatementRule', 'CSSLayerBlockRule']);
    expect((top[0] as CSSLayerStatementRule).nameList).toEqual(['mp.bootstrap', 'mp.components']);
    expect((top[1] as CSSLayerBlockRule).name).toBe('mp.components');
  });

  it('every compound of every selector carries the scope attribute (or is the component\'s own tag)', () => {
    const hostTag = `mp-${scope}`;
    const offenders = rules
      .flatMap((rule) => compoundsOf(rule.selectorText).map((compound) => ({ compound, selector: rule.selectorText })))
      // The CSSOM re-serializes the attribute value quoted: [data-mps="typeahead"].
      .filter(({ compound }) => !compound.replace(/"/g, '').includes(marker) && compound !== hostTag)
      .map(({ selector }) => selector);
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('matches nothing in a decoy tree that reuses the class names unstamped', () => {
    const decoy = document.createElement('div');
    decoy.innerHTML = `
      <div class="mp-typeahead">
        <input class="form-control" type="text" />
        <ul class="dropdown-menu" aria-busy="true"><li class="ta-status">x</li><li class="dropdown-item" aria-selected="true">y</li></ul>
        <span class="visually-hidden"></span><div class="ta-error"></div>
      </div>`;
    document.body.appendChild(decoy);
    const hits = rules
      .filter((rule) => {
        try {
          return decoy.querySelector(rule.selectorText) !== null;
        } catch {
          return false; // a selector jsdom cannot parse (e.g. ::before) cannot match either
        }
      })
      .map((rule) => rule.selectorText);
    decoy.remove();
    expect(hits).toEqual([]);
  });

  it('matches a stamped tree (positive control)', () => {
    const tree = document.createElement('div');
    tree.innerHTML = `<div class="mp-typeahead" data-mps="${scope}"><input class="form-control" data-mps="${scope}" /></div>`;
    document.body.appendChild(tree);
    const hit = rules.some((rule) => {
      try {
        return tree.querySelector(rule.selectorText) !== null;
      } catch {
        return false;
      }
    });
    tree.remove();
    expect(hit).toBe(true);
  });
});
