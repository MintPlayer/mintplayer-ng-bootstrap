import { describe, expect, it } from 'vitest';
import {
  accordionKeyTarget,
  accordionRows,
  accordionToggled,
  closeAccordion,
  connectAccordion,
  connectAccordionTab,
} from './accordion';

function row(open: boolean, disabled = false, inner = ''): string {
  return `<details class="accordion-item" data-mps="accordion"${open ? ' open' : ''}>`
    + `<summary class="accordion-button collapsed" data-mps="accordion"${disabled ? ' aria-disabled="true"' : ''}>h</summary>`
    + `<div class="accordion-content" data-mps="accordion">${inner}</div></details>`;
}

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'accordion';
  root.setAttribute('data-mps', 'accordion');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

const toggleOn = (target: Element) => ({ target }) as unknown as Event;

describe('accordion core', () => {
  it('wires each tab from the root id and names the group only when single-open', () => {
    const tab = connectAccordionTab({ id: 'a1' }, 2);
    expect(tab.summary).toMatchObject({ id: 'a1-h2', 'aria-controls': 'a1-c2', class: 'accordion-button collapsed' });
    expect(tab.content).toMatchObject({ id: 'a1-c2', role: 'region', 'aria-labelledby': 'a1-h2' });
    expect(tab.item['name']).toBe('a1-group');
    expect(connectAccordionTab({ id: 'a1', multi: true }, 0).item['name']).toBeNull();
    expect(tab.item['open']).toBeUndefined();
  });

  it('takes a disabled tab out of the tab order', () => {
    const tab = connectAccordionTab({ id: 'a' }, 0, { disabled: true });
    expect(tab.summary).toMatchObject({ 'aria-disabled': 'true', tabindex: '-1' });
  });

  it('lowers highlightActiveTab onto a bare data attribute', () => {
    expect(connectAccordion({ id: 'a' })['data-highlight-active']).toBeNull();
    expect(connectAccordion({ id: 'a', highlightActiveTab: true })['data-highlight-active']).toBe('');
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
    const root = mount(row(false, false, `<div class="accordion" data-mps="accordion">${row(true)}</div>`));
    const [outer] = accordionRows(root);
    const nested = outer.querySelector('details') as HTMLDetailsElement;
    expect(accordionToggled(root, toggleOn(nested), false)).toBeNull();
    expect(accordionToggled(root, toggleOn(outer), false)).toEqual({ index: 0, active: false });
    expect(nested.open).toBe(false);
  });

  it('closeAccordion closes a whole branch', () => {
    const root = mount(row(true, false, `<div class="accordion" data-mps="accordion">${row(true)}</div>`) + row(true));
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
