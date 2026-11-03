import { describe, expect, it } from 'vitest';
import {
  ACCORDION_ATTR,
  accordionKeyTarget,
  accordionRows,
  accordionToggled,
  closeAccordion,
  connectAccordionTab,
} from './accordion';

function row(open: boolean, disabled = false, inner = ''): string {
  return `<details class="accordion-item"${open ? ' open' : ''}>`
    + `<summary class="accordion-button collapsed"${disabled ? ' aria-disabled="true"' : ''}>h</summary>`
    + `<div class="accordion-content">${inner}</div></details>`;
}

const nested = (html: string) => `<div class="accordion" ${ACCORDION_ATTR}>${html}</div>`;

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'accordion';
  root.setAttribute(ACCORDION_ATTR, '');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

const toggleOn = (target: Element) => ({ target }) as unknown as Event;

describe('accordion core', () => {
  it('wires each tab from its own id and takes the name the accordion hands it', () => {
    const tab = connectAccordionTab('t1', { name: 'a1-group', highlightActiveTab: false }, true, false);
    expect(tab.summary).toMatchObject({ id: 't1-header', 'aria-controls': 't1-content', class: 'accordion-button collapsed' });
    expect(tab.content).toMatchObject({ id: 't1-content', role: 'region', 'aria-labelledby': 't1-header' });
    expect(tab.item).toMatchObject({ name: 'a1-group', open: true, 'data-highlight-active': null });
    expect(connectAccordionTab('t1', { name: null, highlightActiveTab: true }, false, false).item).toMatchObject({
      name: null,
      'data-highlight-active': '',
    });
  });

  it('takes a disabled tab out of the tab order', () => {
    const tab = connectAccordionTab('t', { name: null, highlightActiveTab: false }, false, true);
    expect(tab.summary).toMatchObject({ 'aria-disabled': 'true', tabindex: '-1' });
  });

  it('finds its rows through tab hosts, never a nested accordion\'s', () => {
    const root = mount(`<span>${row(false)}</span><span>${row(false, false, nested(row(true)))}</span>`);
    expect(accordionRows(root)).toHaveLength(2);
  });

  it('enforces single-open from the DOM, sparing a disabled sibling', () => {
    const root = mount(row(true) + row(true, true) + row(true));
    const [first, disabled, third] = accordionRows(root);
    expect(accordionToggled(root, toggleOn(third), false)).toEqual({ index: 2, active: true });
    expect(first.open).toBe(false);
    expect(disabled.open).toBe(true);
    expect(third.open).toBe(true);
  });

  it('leaves siblings alone when multi', () => {
    const root = mount(row(true) + row(true));
    const [first, second] = accordionRows(root);
    accordionToggled(root, toggleOn(second), true);
    expect(first.open).toBe(true);
  });

  it('closes nested accordions with their row and ignores a nested row event', () => {
    const root = mount(row(false, false, nested(row(true))));
    const [outer] = accordionRows(root);
    const inner = outer.querySelector('details') as HTMLDetailsElement;
    expect(accordionToggled(root, toggleOn(inner), false)).toBeNull();
    expect(accordionToggled(root, toggleOn(outer), false)).toEqual({ index: 0, active: false });
    expect(inner.open).toBe(false);
  });

  it('closeAccordion closes a whole branch', () => {
    const root = mount(row(true, false, nested(row(true))) + row(true));
    closeAccordion(root);
    expect(Array.from(root.querySelectorAll('details')).some((d) => d.open)).toBe(false);
  });

  it('moves between headers with wrapping arrows and Home/End', () => {
    expect(accordionKeyTarget('ArrowDown', 2, 3)).toBe(0);
    expect(accordionKeyTarget('ArrowUp', 0, 3)).toBe(2);
    expect(accordionKeyTarget('Home', 1, 3)).toBe(0);
    expect(accordionKeyTarget('End', 0, 3)).toBe(2);
    expect(accordionKeyTarget('a', 0, 3)).toBeNull();
  });
});
