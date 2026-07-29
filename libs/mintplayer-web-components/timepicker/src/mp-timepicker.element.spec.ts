import { afterEach, describe, expect, it } from 'vitest';
import './mp-timepicker.element';
import type { MpTimepickerElement } from './mp-timepicker.element';

async function flush(el: MpTimepickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
}

async function mount(setup?: (el: MpTimepickerElement) => void): Promise<MpTimepickerElement> {
  const el = document.createElement('mp-timepicker') as MpTimepickerElement;
  el.selectedTime = new Date(2026, 4, 15, 9, 30);
  el.step = 30;
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function shadow(el: MpTimepickerElement): ShadowRoot {
  return el.shadowRoot!;
}

/** Walks activeElement through nested shadow roots. */
function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

describe('mp-timepicker — popup initial focus', () => {
  let el: MpTimepickerElement;
  afterEach(() => el.remove());

  it('open() moves focus to the active time option (the selected time slot)', async () => {
    el = await mount();
    await el.open();
    await flush(el);
    const active = deepActive() as HTMLElement;
    expect(active?.getAttribute('role')).toBe('option');
    expect(active.dataset['minutes']).toBe(String(9 * 60 + 30));
  });

  it('open() with no selection still focuses an option, never <body>', async () => {
    el = await mount((host) => (host.selectedTime = null));
    await el.open();
    await flush(el);
    const active = deepActive() as HTMLElement;
    expect(active?.getAttribute('role')).toBe('option');
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
