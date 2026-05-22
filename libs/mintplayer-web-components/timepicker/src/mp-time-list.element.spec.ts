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
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
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

  it('aria-activedescendant points at the focusable slot', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    el.selectedTime = today;
    await flush(el);
    const aad = el.getAttribute('aria-activedescendant');
    expect(aad).toBeTruthy();
    const target = shadow(el).querySelector(`#${aad}`);
    expect(target).not.toBeNull();
    expect(target!.getAttribute('aria-selected')).toBe('true');
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

  it('ArrowDown advances focus by one step', async () => {
    dispatchKey(el, 'ArrowDown');
    await flush(el);
    const aad = el.getAttribute('aria-activedescendant');
    expect(aad).toContain('-slot-555'); // 09:15 = 9*60 + 15 = 555
  });

  it('ArrowUp retreats focus by one step', async () => {
    dispatchKey(el, 'ArrowUp');
    await flush(el);
    const aad = el.getAttribute('aria-activedescendant');
    expect(aad).toContain('-slot-525'); // 08:45
  });

  it('Home jumps to first slot, End jumps to last', async () => {
    dispatchKey(el, 'Home');
    await flush(el);
    expect(el.getAttribute('aria-activedescendant')).toContain('-slot-0');
    dispatchKey(el, 'End');
    await flush(el);
    // 23:45 = 23*60 + 45 = 1425
    expect(el.getAttribute('aria-activedescendant')).toContain('-slot-1425');
  });

  it('PageDown advances by one hour', async () => {
    dispatchKey(el, 'PageDown');
    await flush(el);
    // 09:00 + 60 = 10:00 = 600
    expect(el.getAttribute('aria-activedescendant')).toContain('-slot-600');
  });

  it('Enter selects the focused slot and emits', async () => {
    const events: Date[] = [];
    el.addEventListener('selected-time-change', (e) =>
      events.push((e as CustomEvent<Date>).detail),
    );
    dispatchKey(el, 'ArrowDown'); // focus moves to 09:15
    await flush(el);
    dispatchKey(el, 'Enter');
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0].getHours()).toBe(9);
    expect(events[0].getMinutes()).toBe(15);
  });

  it('preventDefault is called on navigation keys', () => {
    const ev = dispatchKey(el, 'ArrowDown');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does not preventDefault on unrelated keys', () => {
    const ev = dispatchKey(el, 'a');
    expect(ev.defaultPrevented).toBe(false);
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
