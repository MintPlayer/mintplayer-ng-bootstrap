import { afterEach, describe, expect, it } from 'vitest';

import './mp-ribbon-split-button.element';
import './mp-ribbon-dropdown-button.element';
import './mp-ribbon-menu-item.element';

import type { MpRibbonSplitButton } from './mp-ribbon-split-button.element';
import type { MpRibbonDropdownButton } from './mp-ribbon-dropdown-button.element';

/**
 * The two menu-owning ribbon items. Both drive an `OverlayController`, so what
 * is asserted here is the contract around it rather than the positioning it
 * does: `aria-expanded` on the element that carries `aria-haspopup`, the
 * `menu-toggle` event in both directions, the keyboard opener, and menu-item
 * dismissal.
 *
 * `aria-expanded` matters more than it looks: it is written from the overlay's
 * open state during render, so an open path that forgets to re-render leaves
 * the attribute lying about a visibly open menu, and nothing else would catch it.
 */

const mounted: HTMLElement[] = [];

async function mount<T extends HTMLElement>(markup: string): Promise<T> {
  const container = document.createElement('div');
  container.innerHTML = markup;
  document.body.appendChild(container);
  mounted.push(container);
  const element = container.firstElementChild as T;
  await (element as unknown as { updateComplete: Promise<void> }).updateComplete;
  return element;
}

function record(element: HTMLElement, type: string): CustomEvent[] {
  const seen: CustomEvent[] = [];
  document.addEventListener(type, (e) => seen.push(e as CustomEvent));
  return seen;
}

const shadow = (element: HTMLElement) => element.shadowRoot!;

/** Let the overlay's async open/close settle, then the element re-render. */
async function settle(element: HTMLElement & { updateComplete: Promise<unknown> }) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.remove();
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-split-button', () => {
  const main = (el: HTMLElement) => shadow(el).querySelector<HTMLButtonElement>('.ribbon-split-button-main')!;
  const chevron = (el: HTMLElement) => shadow(el).querySelector<HTMLButtonElement>('.ribbon-split-button-dropdown')!;

  const markup = `
    <mp-ribbon-split-button item-id="paste" label="Paste">
      <mp-ribbon-menu-item slot="menu" item-id="special" label="Paste special"></mp-ribbon-menu-item>
    </mp-ribbon-split-button>`;

  it('groups its two buttons under one accessible name', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    const group = shadow(el).querySelector('[role="group"]')!;
    expect(group.getAttribute('aria-label')).toBe('Paste');
  });

  // Two buttons in one group need distinguishable names, or a screen-reader
  // user hears "Paste, Paste" and cannot tell which one opens the menu.
  it('names the chevron distinctly from the main action', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    expect(chevron(el).getAttribute('aria-label')).toBe('Paste options');
  });

  it('declares the popup on the chevron, not the main button', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    expect(chevron(el).getAttribute('aria-haspopup')).toBe('menu');
    expect(main(el).hasAttribute('aria-haspopup')).toBe(false);
  });

  it('starts collapsed', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    expect(chevron(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('emits main-action from the primary button', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    const seen = record(el, 'main-action');
    main(el).click();
    expect(seen[0].detail).toEqual({ itemId: 'paste' });
  });

  // The base `item-click` is emitted too, so a consumer that only knows the
  // simple event still works on a split button.
  it('emits item-click alongside main-action', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    const seen = record(el, 'item-click');
    main(el).click();
    expect(seen[0].detail).toEqual({ itemId: 'paste' });
  });

  it('does not open the menu from the primary button', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    const seen = record(el, 'menu-toggle');
    main(el).click();
    await settle(el);
    expect(seen).toEqual([]);
  });

  it('opens from the chevron and says so on the role', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    chevron(el).click();
    await settle(el);
    expect(chevron(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('emits menu-toggle open then closed', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    const seen = record(el, 'menu-toggle');
    chevron(el).click();
    await settle(el);
    chevron(el).click();
    await settle(el);
    expect(seen.map((e) => e.detail.open)).toEqual([true, false]);
    expect(seen[0].detail.itemId).toBe('paste');
  });

  it('collapses aria-expanded on close', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    chevron(el).click();
    await settle(el);
    chevron(el).click();
    await settle(el);
    expect(chevron(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on ArrowDown', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    chevron(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    expect(chevron(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('ignores an unrelated key', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    chevron(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await settle(el);
    expect(chevron(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when a menu item is chosen', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    chevron(el).click();
    await settle(el);
    el.querySelector<HTMLElement>('mp-ribbon-menu-item')!.click();
    await settle(el);
    expect(chevron(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('does not emit or open when disabled', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    el.disabled = true;
    await el.updateComplete;
    const actions = record(el, 'main-action');
    const toggles = record(el, 'menu-toggle');
    main(el).click();
    chevron(el).click();
    await settle(el);
    expect(actions).toEqual([]);
    expect(toggles).toEqual([]);
  });

  it('disables both buttons', async () => {
    const el = await mount<MpRibbonSplitButton>(markup);
    el.disabled = true;
    await el.updateComplete;
    expect(main(el).disabled).toBe(true);
    expect(chevron(el).disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('mp-ribbon-dropdown-button', () => {
  const trigger = (el: HTMLElement) => shadow(el).querySelector<HTMLButtonElement>('.ribbon-dropdown-button')!;

  const markup = `
    <mp-ribbon-dropdown-button item-id="styles" label="Styles">
      <mp-ribbon-menu-item slot="menu" item-id="h1" label="Heading 1"></mp-ribbon-menu-item>
    </mp-ribbon-dropdown-button>`;

  it('declares a menu popup on its trigger', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    expect(trigger(el).getAttribute('aria-haspopup')).toBe('menu');
  });

  it('starts collapsed', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('renders a menu panel for the projected items', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    const panel = shadow(el).querySelector('.menu-panel')!;
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.querySelector('slot[name="menu"]')).not.toBeNull();
  });

  it('opens on click and says so on the role', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    trigger(el).click();
    await settle(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles closed on a second click', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    trigger(el).click();
    await settle(el);
    trigger(el).click();
    await settle(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('emits menu-toggle in both directions', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    const seen = record(el, 'menu-toggle');
    trigger(el).click();
    await settle(el);
    trigger(el).click();
    await settle(el);
    expect(seen.map((e) => e.detail)).toEqual([
      { itemId: 'styles', open: true },
      { itemId: 'styles', open: false },
    ]);
  });

  it('opens on ArrowDown', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
  });

  // ArrowDown is an opener, never a toggle — pressing it on an open menu must
  // not close what the user is about to walk into.
  it('leaves an open menu open on a second ArrowDown', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when a menu item is chosen', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    trigger(el).click();
    await settle(el);
    el.querySelector<HTMLElement>('mp-ribbon-menu-item')!.click();
    await settle(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('neither opens nor emits when disabled', async () => {
    const el = await mount<MpRibbonDropdownButton>(markup);
    el.disabled = true;
    await el.updateComplete;
    const seen = record(el, 'menu-toggle');
    trigger(el).click();
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    expect(seen).toEqual([]);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });
});
