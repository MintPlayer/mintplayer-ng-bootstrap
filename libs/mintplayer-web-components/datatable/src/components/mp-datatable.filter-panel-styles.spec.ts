import { describe, expect, it } from 'vitest';
import { datatableLightStyles } from '../styles';

/**
 * The filter panel is rendered into `<mp-overlay-container>` at `document.body`,
 * so it is NOT a descendant of `<mp-datatable>` — and custom properties inherit
 * down the DOM tree. Every `--mp-datatable-*` property is declared on the
 * element itself, so inside the portalled panel they resolve to nothing.
 *
 * Found in a browser, not here: `border: 1px solid var(--mp-datatable-border-color)`
 * on the panel was invalid at computed-value time, which drops `border-style` to
 * `none`, so the panel shipped with no border at all while its background — which
 * uses a `--bs-*` property declared on `:root` — looked perfectly fine. Nothing
 * throws, nothing warns, and jsdom has no cascade to reveal it.
 *
 * So: any rule that can land in the portal must give every `--mp-datatable-*`
 * reference a fallback. `--bs-*` properties are exempt because Bootstrap
 * declares them on `:root`, which the portalled panel does inherit from.
 */
const PORTALLED_SELECTOR_MARKERS = [
  '.filter-panel',
  '.filter-panel-body',
  '.filter-clear',
  '.filter-search',
  '.filter-invert',
  '.filter-options',
  '.filter-option',
  '.filter-remaining',
  '.filter-loading',
  '.filter-no-values',
  '.filter-has-more',
];

interface Rule {
  selector: string;
  body: string;
}

function rules(css: string): Rule[] {
  return css
    .split('}')
    .map((chunk) => {
      const [selector, body] = chunk.split('{');
      return { selector: (selector ?? '').trim(), body: (body ?? '').trim() };
    })
    .filter((r) => r.selector !== '' && r.body !== '');
}

/** `var(--mp-datatable-x)` with no comma before its closing paren. */
function bareDatatableVars(body: string): string[] {
  return [...body.matchAll(/var\(\s*(--mp-datatable-[a-z-]+)\s*\)/g)].map((m) => m[1]);
}

describe('mp-datatable filter panel styles survive the portal', () => {
  const css = datatableLightStyles.toString();

  const portalled = rules(css).filter((rule) =>
    PORTALLED_SELECTOR_MARKERS.some((marker) => rule.selector.includes(marker)),
  );

  it('has rules to check', () => {
    // Guards the guard: a renamed class would otherwise make this suite vacuous.
    expect(portalled.length).toBeGreaterThan(5);
  });

  it('never depends on a datatable custom property without a fallback', () => {
    const offenders = portalled
      .map((rule) => ({ selector: rule.selector, vars: bareDatatableVars(rule.body) }))
      .filter((r) => r.vars.length > 0);

    expect(offenders).toEqual([]);
  });

  it('keeps the panel border resolvable outside the element', () => {
    const panel = portalled.find((r) => r.selector.startsWith('.filter-panel[data-mps=datatable]'));
    expect(panel).toBeDefined();
    // An unresolvable border-color drops border-style to none, so the panel
    // loses its border entirely rather than merely its colour.
    expect(panel!.body).toMatch(/border:\s*1px solid var\(--mp-datatable-border-color,/);
  });
});
