import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-ribbon.element';
import './mp-ribbon-tab.element';
import './mp-ribbon-group.element';
import './items/mp-ribbon-button.element';
import type { MpRibbonGroup } from './mp-ribbon-group.element';

function nextRaf(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

async function mountGroup(html: string): Promise<MpRibbonGroup> {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const group = container.querySelector('mp-ribbon-group') as MpRibbonGroup;
  await (group as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return group;
}

describe('mp-ribbon-group — roving tabindex (FR-14)', () => {
  let group: MpRibbonGroup;

  beforeEach(async () => {
    group = await mountGroup(`
      <mp-ribbon-group group-id="g1" label="G1">
        <mp-ribbon-button item-id="a" label="A" size="small"></mp-ribbon-button>
        <mp-ribbon-button item-id="b" label="B" size="small"></mp-ribbon-button>
        <mp-ribbon-button item-id="c" label="C" size="small"></mp-ribbon-button>
      </mp-ribbon-group>
    `);
  });

  afterEach(() => group.parentElement?.remove());

  function items(): HTMLElement[] {
    return Array.from(group.querySelectorAll<HTMLElement>('mp-ribbon-button'));
  }

  it('exactly one item is tabbable (tabindex=0); the rest are -1', () => {
    const tabbable = items().filter((i) => i.getAttribute('tabindex') === '0');
    const skipped = items().filter((i) => i.getAttribute('tabindex') === '-1');
    expect(tabbable.length).toBe(1);
    expect(skipped.length).toBe(2);
  });

  it('the first item starts tabbable when no focus has been recorded yet', () => {
    expect(items()[0].getAttribute('tabindex')).toBe('0');
  });

  /**
   * Real keydown events flow up from the focused element. To exercise the
   * group's roving handler we dispatch on the item the user is "on" so
   * composedPath() includes it — that's how the handler finds the current
   * index. Dispatching on the group host itself would put currentIdx at -1.
   */
  function pressKeyOn(item: HTMLElement, key: string): void {
    item.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, composed: true })
    );
  }

  it('ArrowRight moves focus to the next item (and wraps from last to first)', () => {
    pressKeyOn(items()[0], 'ArrowRight');
    expect(document.activeElement === items()[1]).toBe(true);
    pressKeyOn(items()[2], 'ArrowRight');
    expect(document.activeElement === items()[0]).toBe(true);
  });

  it('Home jumps to first, End to last', () => {
    pressKeyOn(items()[1], 'End');
    expect(document.activeElement === items()[2]).toBe(true);
    pressKeyOn(items()[2], 'Home');
    expect(document.activeElement === items()[0]).toBe(true);
  });

  it('focusin records the visited item as the new tabbable (Tab-back returns there)', () => {
    items()[2].dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    expect(items()[2].getAttribute('tabindex')).toBe('0');
    expect(items()[0].getAttribute('tabindex')).toBe('-1');
  });
});

describe('mp-ribbon-group — priority + autoScale (FR-23)', () => {
  let group: MpRibbonGroup;

  beforeEach(async () => {
    group = await mountGroup(`
      <mp-ribbon-group group-id="g1" label="G1" priority="10" auto-scale="false">
        <mp-ribbon-button item-id="a" label="A" size="small"></mp-ribbon-button>
      </mp-ribbon-group>
    `);
  });

  afterEach(() => group.parentElement?.remove());

  it('accepts priority as a number property bound from an attribute', () => {
    expect(group.priority).toBe(10);
  });

  it('exposes auto-scale as a string attribute that the reflow can read', () => {
    expect(group.getAttribute('auto-scale')).toBe('false');
  });
});

describe('mp-ribbon-group — popup overlay (FR-7)', () => {
  let group: MpRibbonGroup;

  beforeEach(async () => {
    group = await mountGroup(`
      <mp-ribbon-group group-id="g1" label="G1">
        <mp-ribbon-button item-id="a" label="A" size="small"></mp-ribbon-button>
        <mp-ribbon-button item-id="b" label="B" size="small"></mp-ribbon-button>
      </mp-ribbon-group>
    `);
    // Simulate the reflow having collapsed this group into popup form.
    group.setAttribute('data-resolved-size', 'popup');
    await (group as unknown as { updateComplete: Promise<void> }).updateComplete;
  });

  afterEach(() => group.parentElement?.remove());

  it('renders a popup trigger with aria-haspopup + aria-expanded', () => {
    const trigger = group.shadowRoot!.querySelector<HTMLElement>('.ribbon-popup-trigger')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking the trigger opens the popup and updates aria-expanded', async () => {
    const trigger = group.shadowRoot!.querySelector<HTMLElement>('.ribbon-popup-trigger')!;
    trigger.click();
    await (group as unknown as { updateComplete: Promise<void> }).updateComplete;
    // OverlayController sets `data-menu-open` (the shared overlay attribute);
    // the ribbon-group SCSS uses this to switch the .ribbon-group into its
    // fixed-position popup form.
    expect(group.getAttribute('data-menu-open')).toBe('');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('Esc on an open popup closes it and removes the data-menu-open marker', async () => {
    const trigger = group.shadowRoot!.querySelector<HTMLElement>('.ribbon-popup-trigger')!;
    trigger.click();
    await (group as unknown as { updateComplete: Promise<void> }).updateComplete;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await (group as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(group.hasAttribute('data-menu-open')).toBe(false);
  });
});
