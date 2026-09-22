import { describe, expect, it } from 'vitest';
import { datatableLightStyles } from '../styles';

/**
 * The sortable header's click target must be the whole cell, not just the label.
 *
 * Reported from the running demo: clicking a column header did nothing unless
 * the pointer was on the text. The `<th>` carried the padding and set
 * `cursor: pointer` plus a hover background, so the entire cell read as
 * clickable while only the `<button>` inside it was — and a short label in a
 * wide column left most of the header dead.
 *
 * **This is a stylesheet assertion because jsdom has no layout.** No amount of
 * DOM testing can see that a button fails to cover its cell; the same blind spot
 * is why the filter panel shipped without `position: fixed` (PRD §13). Asserting
 * the two declarations that make the button fill the cell is the strongest guard
 * available without a browser, and the e2e pass covers the rest.
 *
 * Rule bodies are looked up by EXACT selector, not by substring: a substring
 * test on CSS text already produced one false positive on this component, where
 * `--mp-overlay-container-z-index` matched a search for `contain`, and a
 * "contains all these fragments" lookup matched the virtual-scroll `:hover`
 * rule before reaching the one it wanted.
 */
const SORTABLE_TH = 'thead[data-mps=datatable] th[data-sortable=true][data-mps=datatable]';
const SORT_BUTTON = 'button.header-sort[data-mps=datatable]';
const RESIZE_HANDLE = '.resize-handle[data-mps=datatable]';

function ruleBody(css: string, selector: string): string {
  const match = css.split('}').find((rule) => (rule.split('{')[0] ?? '').trim() === selector);
  return (match?.split('{')[1] ?? '').trim();
}

function declaration(body: string, property: string): string | null {
  const found = body
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.split(':')[0]?.trim() === property);
  return found ? found.slice(found.indexOf(':') + 1).trim() : null;
}

describe('mp-datatable sortable header click target', () => {
  const css = datatableLightStyles.toString();

  it('gives the sort button the full width of its cell', () => {
    const body = ruleBody(css, SORT_BUTTON);
    expect(body).not.toBe('');
    expect(declaration(body, 'width')).toBe('100%');
    // Without border-box the inherited padding would push the button past the
    // cell instead of filling it.
    expect(declaration(body, 'box-sizing')).toBe('border-box');
    // `.header-cell` — which the button also carries — is inline-flex, and an
    // inline-flex box shrink-wraps its text however wide the cell is.
    expect(declaration(body, 'display')).toBe('flex');
  });

  it('moves the padding off the sortable cell so the button can own it', () => {
    const th = ruleBody(css, SORTABLE_TH);
    expect(declaration(th, 'padding')).toBe('0');

    // The same padding, now inside the button: the cell's total width is
    // unchanged, so the `auto`-phase measure pass reads what it always did.
    const button = ruleBody(css, SORT_BUTTON);
    expect(declaration(button, 'padding')).toBe('0.5rem 2rem 0.5rem 0.75rem');
  });

  it('keeps the resize handle above the button', () => {
    // The handle is absolutely positioned inside the same cell. Now that the
    // button spans the cell, only the stacking order keeps a resize drag from
    // being swallowed as a sort click.
    const handle = ruleBody(css, RESIZE_HANDLE);
    expect(declaration(handle, 'position')).toBe('absolute');
    expect(Number(declaration(handle, 'z-index'))).toBeGreaterThan(0);
  });
});
