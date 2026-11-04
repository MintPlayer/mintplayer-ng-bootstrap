import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBodyHost } from './body-host';
import { OVERLAY_Z_BASE, OVERLAY_Z_STEP, openOverlay, resetOverlayStackForTesting } from './overlay-stack';

const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
const pointerdown = (el: Element) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }));

function host(id: string, html = '<button>inside</button>'): HTMLElement {
  const el = createBodyHost(document, id, null);
  el.innerHTML = html;
  return el;
}

describe('overlay-stack (#458 §4.4)', () => {
  let app: HTMLElement;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = '<main id="app"><button id="trigger">open</button></main>';
    app = document.getElementById('app') as HTMLElement;
    trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
  });
  afterEach(() => resetOverlayStackForTesting());

  it('stacks hosts by open order, above Bootstrap component z-indices', () => {
    const modal = openOverlay(host('a'), { modal: true });
    const dropdown = openOverlay(host('b'));
    expect(modal.zIndex).toBe(OVERLAY_Z_BASE + OVERLAY_Z_STEP);
    expect(dropdown.zIndex).toBeGreaterThan(modal.zIndex);
    const b = document.querySelector<HTMLElement>('[data-mp-overlay="b"]');
    expect(b?.style.zIndex).toBe(String(dropdown.zIndex));
    expect(b?.style.position).toBe('absolute');
    dropdown.close();
    expect(b?.style.zIndex).toBe('');
  });

  it('one Escape dismisses only the top overlay', () => {
    const dismissed: string[] = [];
    const outer = openOverlay(host('a'), { onDismiss: () => dismissed.push('outer') });
    const inner = openOverlay(host('b'), { onDismiss: () => dismissed.push('inner') });
    escape();
    expect(dismissed).toEqual(['inner']);
    inner.close();
    escape();
    expect(dismissed).toEqual(['inner', 'outer']);
    outer.close();
  });

  it('dismisses on an outside pointerdown only when told what is inside', () => {
    const dismissed: string[] = [];
    const menu = openOverlay(host('a'), { inside: () => [trigger], onDismiss: (r) => dismissed.push(r) });
    pointerdown(trigger);
    pointerdown(document.querySelector('[data-mp-overlay="a"] button') as Element);
    expect(dismissed).toEqual([]);
    pointerdown(app);
    expect(dismissed).toEqual(['outside']);
    menu.close();
  });

  it('inerts the page behind the topmost modal, and keeps it inert while an outer modal is open', () => {
    const a = host('a');
    const outer = openOverlay(a, { modal: true });
    expect(app.hasAttribute('inert')).toBe(true);
    expect(a.hasAttribute('inert')).toBe(false);

    const b = host('b');
    const inner = openOverlay(b, { modal: true });
    expect(a.hasAttribute('inert')).toBe(true);
    expect(b.hasAttribute('inert')).toBe(false);

    inner.close();
    expect(a.hasAttribute('inert')).toBe(false);
    expect(app.hasAttribute('inert')).toBe(true);
    outer.close();
    expect(app.hasAttribute('inert')).toBe(false);
  });

  it('a non-modal overlay above a modal stays interactive', () => {
    const outer = openOverlay(host('a'), { modal: true });
    const b = host('b');
    const menu = openOverlay(b);
    expect(b.hasAttribute('inert')).toBe(false);
    menu.close();
    outer.close();
  });

  it('traps focus in a modal and returns it to the trigger on close', () => {
    const a = host('a', '<button id="first">first</button>');
    const modal = openOverlay(a, { modal: true });
    expect(document.activeElement?.id).toBe('first');
    modal.close();
    expect(document.activeElement).toBe(trigger);
  });

  it('close is idempotent', () => {
    const modal = openOverlay(host('a'), { modal: true });
    modal.close();
    modal.close();
    expect(app.hasAttribute('inert')).toBe(false);
  });
});
