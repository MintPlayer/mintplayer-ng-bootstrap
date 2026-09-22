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
  '.filter-comparison',
  '.filter-operator',
  '.filter-operand',
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

/** The body of the rule whose selector matches EXACTLY, or `''`. */
function ruleBody(css: string, selector: string): string {
  return rules(css).find((r) => r.selector === selector)?.body ?? '';
}

/** One declaration's value out of a rule body, or `null` when absent. */
function declaration(body: string, property: string): string | null {
  const found = body
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.split(':')[0]?.trim() === property);
  return found ? found.slice(found.indexOf(':') + 1).trim() : null;
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

  /**
   * The search box, the operand box and the operator select must look like one
   * family. They had drifted three copies at a time — `font: inherit` was
   * missing from the search box, so it rendered in the UA's system font while
   * its neighbours used the page's, and a `type=number` operand grew spinner
   * buttons that made it a different size from a `type=text` one.
   *
   * Asserting they share ONE rule is stronger than asserting three rules happen
   * to agree today: a fourth field added to the panel has to join it or fail
   * here.
   */
  it('styles every field in the panel from one shared rule', () => {
    const shared = rules(css).find(
      (r) =>
        r.selector.includes('.filter-search[data-mps=datatable]') &&
        r.selector.includes('.filter-operand[data-mps=datatable]') &&
        r.selector.includes('.filter-operator[data-mps=datatable]'),
    );
    expect(shared).toBeDefined();

    // A form control inherits neither of these from the page.
    expect(declaration(shared!.body, 'font')).toBe('inherit');
    expect(declaration(shared!.body, 'line-height')).toBe('1.5');
    expect(declaration(shared!.body, 'box-sizing')).toBe('border-box');
    expect(declaration(shared!.body, 'border-radius')).toBe('0.25rem');
  });

  it('strips the number input’s spinners so it matches a text one', () => {
    const numeric = ruleBody(css, '.filter-operand[type=number][data-mps=datatable]');
    expect(declaration(numeric, 'appearance')).toBe('textfield');

    const spinners = rules(css).find((r) => r.selector.includes('-webkit-inner-spin-button'));
    expect(spinners).toBeDefined();
    expect(declaration(spinners!.body, 'appearance')).toBe('none');
    // Both halves are scoped, so a consumer's own number input is untouched.
    expect(spinners!.selector).toContain('[data-mps=datatable]::-webkit-inner-spin-button');
  });

  it('lets the flex row equalise the select against the input', () => {
    // A select and an input disagree on intrinsic height whatever font and
    // padding they share — Chromium forces `line-height: normal` on a select.
    const row = ruleBody(css, '.filter-comparison[data-mps=datatable]');
    expect(declaration(row, 'align-items')).toBe('stretch');
  });

  it('keeps the panel border resolvable outside the element', () => {
    const panel = portalled.find((r) => r.selector.startsWith('.filter-panel[data-mps=datatable]'));
    expect(panel).toBeDefined();
    // An unresolvable border-color drops border-style to none, so the panel
    // loses its border entirely rather than merely its colour.
    expect(panel!.body).toMatch(/border:\s*1px solid var\(--mp-datatable-border-color,/);
  });
});
