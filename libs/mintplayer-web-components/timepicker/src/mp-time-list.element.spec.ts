import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-time-list.element';
import type { MpTimeListElement } from './mp-time-list.element';

async function flush(el: MpTimeListElement): Promise<void> {
  await el.updateComplete;
}

async function mount(setup?: (el: MpTimeListElement) => void): Promise<MpTimeListElement> {
  const el = document.createElement('mp-time-list') as MpTimeListElement;
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function shadow(el: MpTimeListElement): ShadowRoot {
  return el.shadowRoot!;
}

function slotsIn(el: MpTimeListElement): HTMLButtonElement[] {
  return Array.from(shadow(el).querySelectorAll<HTMLButtonElement>('.slot'));
}

function dispatchKey(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(ev);
  return ev;
}

/** The single tab stop — where a real user's keydown originates. */
function activeSlot(el: MpTimeListElement): HTMLButtonElement {
  const active = shadow(el).querySelector<HTMLButtonElement>('button.slot[tabindex="0"]');
  expect(active, 'no slot carries the tab stop').not.toBeNull();
  return active!;
}

/** Keydown from the focused option, which is where the browser dispatches it. */
function keyOnActive(el: MpTimeListElement, key: string): KeyboardEvent {
  return dispatchKey(activeSlot(el), key);
}

describe('mp-time-list — rendering + ARIA', () => {
  let el: MpTimeListElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('host is role="listbox" with aria-label="Select time"', () => {
    expect(el.getAttribute('role')).toBe('listbox');
    expect(el.getAttribute('aria-label')).toBe('Select time');
  });

  it('renders 96 slots at 15-minute step by default', () => {
    const slots = slotsIn(el);
    expect(slots.length).toBe(96);
  });

  it('each slot is role="option" with aria-selected', () => {
    const slots = slotsIn(el);
    for (const s of slots) {
      expect(s.getAttribute('role')).toBe('option');
      expect(s.getAttribute('aria-selected')).toBeTruthy();
    }
  });

  it('step=30 produces 48 slots; step=60 produces 24', async () => {
    el.step = 30;
    await flush(el);
    expect(slotsIn(el).length).toBe(48);
    el.step = 60;
    await flush(el);
    expect(slotsIn(el).length).toBe(24);
  });

  it('selectedTime marks the matching slot aria-selected="true"', async () => {
    const today = new Date();
    today.setHours(9, 30, 0, 0);
    el.selectedTime = today;
    await flush(el);
    const selected = slotsIn(el).filter((s) => s.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent?.trim()).toContain('9:30');
  });

  it('min / max clamp produce aria-disabled on out-of-range slots', async () => {
    const minD = new Date(); minD.setHours(8, 0, 0, 0);
    const maxD = new Date(); maxD.setHours(10, 0, 0, 0);
    el.min = minD;
    el.max = maxD;
    await flush(el);
    const enabled = slotsIn(el).filter((s) => s.getAttribute('aria-disabled') !== 'true');
    // 08:00, 08:15, 08:30, 08:45, 09:00, 09:15, 09:30, 09:45, 10:00 = 9 slots
    expect(enabled.length).toBe(9);
  });

  it('the selected slot is the single roving tab stop (no aria-activedescendant)', async () => {
    /* The old model kept focus on the host and pointed aria-activedescendant at
       option ids INSIDE the shadow root — an IDREF resolves only in the
       holder's own tree, so it dangled forever and arrows announced nothing.
       Real focus + roving tabindex is the replacement. */
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    el.selectedTime = today;
    await flush(el);

    expect(el.hasAttribute('aria-activedescendant')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);

    const stops = slotsIn(el).filter((b) => b.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
    expect(stops[0].getAttribute('aria-selected')).toBe('true');
  });
});

describe('mp-time-list — events + selection', () => {
  let el: MpTimeListElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('clicking a slot emits selected-time-change with a Date detail', async () => {
    const events: Date[] = [];
    el.addEventListener('selected-time-change', (e) =>
      events.push((e as CustomEvent<Date>).detail),
    );
    const slot = slotsIn(el).find((s) => s.textContent?.trim().includes('9:30'))!;
    slot.click();
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0].getHours()).toBe(9);
    expect(events[0].getMinutes()).toBe(30);
  });

  it('clicking a disabled slot does not emit', async () => {
    const minD = new Date(); minD.setHours(10, 0, 0, 0);
    el.min = minD;
    await flush(el);
    const events: Date[] = [];
    el.addEventListener('selected-time-change', (e) =>
      events.push((e as CustomEvent<Date>).detail),
    );
    // 09:00 is below min; the slot is rendered but disabled.
    const slot = slotsIn(el).find((s) => s.textContent?.trim().includes('9:00'))!;
    expect(slot.getAttribute('aria-disabled')).toBe('true');
    slot.click();
    await flush(el);
    expect(events.length).toBe(0);
  });

  it('selectMinutes() programmatic API selects and emits', async () => {
    const events: Date[] = [];
    el.addEventListener('selected-time-change', (e) =>
      events.push((e as CustomEvent<Date>).detail),
    );
    el.selectMinutes(15 * 60); // 15:00
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0].getHours()).toBe(15);
  });
});

describe('mp-time-list — keyboard', () => {
  let el: MpTimeListElement;
  beforeEach(async () => {
    el = await mount((e) => {
      const t = new Date();
      t.setHours(9, 0, 0, 0);
      e.selectedTime = t;
    });
  });
  afterEach(() => el.remove());

  it('ArrowDown moves REAL focus and the tab stop by one step', async () => {
    keyOnActive(el, 'ArrowDown');
    await flush(el);
    const active = activeSlot(el);
    expect(active.dataset['minutes']).toBe('555'); // 09:15
    expect(shadow(el).activeElement).toBe(active);
  });

  it('ArrowUp retreats by one step', async () => {
    keyOnActive(el, 'ArrowUp');
    await flush(el);
    expect(activeSlot(el).dataset['minutes']).toBe('525'); // 08:45
  });

  it('Home jumps to first slot, End jumps to last', async () => {
    keyOnActive(el, 'Home');
    await flush(el);
    expect(activeSlot(el).dataset['minutes']).toBe('0');
    keyOnActive(el, 'End');
    await flush(el);
    expect(activeSlot(el).dataset['minutes']).toBe('1425'); // 23:45
  });

  it('PageDown advances by one hour', async () => {
    keyOnActive(el, 'PageDown');
    await flush(el);
    expect(activeSlot(el).dataset['minutes']).toBe('600'); // 10:00
  });

  it('activating the focused option emits (via its native click)', async () => {
    /* Enter/Space on a real <button> is native UA activation, which an
       untrusted KeyboardEvent cannot trigger in ANY environment (the Phase 0
       isTrusted mechanism) — so this asserts the click path the activation
       feeds into; the keypress itself is e2e material. */
    const events: Date[] = [];
    el.addEventListener('selected-time-change', (e) =>
      events.push((e as CustomEvent<Date>).detail),
    );
    keyOnActive(el, 'ArrowDown');
    await flush(el);
    activeSlot(el).click();
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0].getHours()).toBe(9);
    expect(events[0].getMinutes()).toBe(15);
  });

  it('preventDefault is called on navigation keys', () => {
    const ev = keyOnActive(el, 'ArrowDown');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does not preventDefault on unrelated keys', () => {
    const ev = keyOnActive(el, 'a');
    expect(ev.defaultPrevented).toBe(false);
  });

  it('host.focus() lands on the active option, not the host', async () => {
    el.focus();
    expect(shadow(el).activeElement).toBe(activeSlot(el));
  });
});

describe('mp-time-list — hour12 / locale', () => {
  let el: MpTimeListElement;
  afterEach(() => el?.remove());

  it('hour12=true forces 12-hour labels', async () => {
    el = await mount((e) => {
      e.hour12 = true;
      e.locale = 'en-US';
    });
    const labels = slotsIn(el).map((s) => s.textContent?.trim() ?? '');
    expect(labels.some((l) => /AM|PM/i.test(l))).toBe(true);
  });

  it('hour12=false forces 24-hour labels', async () => {
    el = await mount((e) => {
      e.hour12 = false;
      e.locale = 'en-US';
    });
    const labels = slotsIn(el).map((s) => s.textContent?.trim() ?? '');
    expect(labels.every((l) => !/AM|PM/i.test(l))).toBe(true);
  });
});
