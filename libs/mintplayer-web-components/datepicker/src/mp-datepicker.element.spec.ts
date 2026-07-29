import { afterEach, describe, expect, it } from 'vitest';
import './mp-datepicker.element';
import type { MpDatepickerElement } from './mp-datepicker.element';
import type { MpCalendarElement } from '@mintplayer/web-components/calendar';

async function flush(el: MpDatepickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
}

async function mount(setup?: (el: MpDatepickerElement) => void): Promise<MpDatepickerElement> {
  const el = document.createElement('mp-datepicker') as MpDatepickerElement;
  el.selectedDate = new Date(2026, 4, 15);
  el.currentMonth = new Date(2026, 4, 1);
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function shadow(el: MpDatepickerElement): ShadowRoot {
  return el.shadowRoot!;
}

/** Walks activeElement through nested shadow roots. */
function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

describe('mp-datepicker — dialog initial focus (APG Date Picker Dialog)', () => {
  let el: MpDatepickerElement;
  afterEach(() => el.remove());

  it('open() moves focus to the calendar grid roving cell (the selected date)', async () => {
    el = await mount();
    await el.open();
    await flush(el);
    const active = deepActive() as HTMLElement;
    expect(active?.getAttribute('role')).toBe('gridcell');
    expect(active.getAttribute('tabindex')).toBe('0');
    expect(active.id).toContain('-cell-2026-4-15');
  });

  it('a slotted consumer calendar wins over the shadow default', async () => {
    const slotted = document.createElement('mp-calendar') as MpCalendarElement;
    slotted.slot = 'calendar';
    slotted.currentMonth = new Date(2026, 4, 1);
    slotted.selectedDate = new Date(2026, 4, 20);
    el = await mount((host) => host.appendChild(slotted));
    await slotted.updateComplete;
    await el.open();
    await flush(el);
    // The focused node lives inside the light-DOM calendar, not the default one.
    expect(document.activeElement).toBe(slotted);
    const active = deepActive() as HTMLElement;
    expect(active.id).toContain('-cell-2026-4-20');
  });

  it('close() returns focus to the trigger button', async () => {
    el = await mount();
    await el.open();
    await flush(el);
    el.close();
    await flush(el);
    expect(shadow(el).activeElement).toBe(shadow(el).querySelector('button.trigger'));
  });
});
