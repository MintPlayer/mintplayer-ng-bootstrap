import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-datetime-picker.element';
import type { MpDatetimePickerElement } from './mp-datetime-picker.element';
import '@mintplayer/web-components/calendar';
import '@mintplayer/web-components/timepicker';

async function flush(el: MpDatetimePickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
}

async function mount(setup?: (el: MpDatetimePickerElement) => void): Promise<MpDatetimePickerElement> {
  const el = document.createElement('mp-datetime-picker') as MpDatetimePickerElement;
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function shadow(el: MpDatetimePickerElement): ShadowRoot {
  return el.shadowRoot!;
}

function dispatchKey(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

describe('mp-datetime-picker — ARIA', () => {
  let el: MpDatetimePickerElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('display input is readonly + aria-readonly="true"', () => {
    const input = shadow(el).querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute('aria-readonly')).toBe('true');
  });

  it('date trigger has aria-haspopup="dialog" and aria-controls pointing at the date popup', () => {
    const trig = shadow(el).querySelector('button.date')!;
    expect(trig.getAttribute('aria-haspopup')).toBe('dialog');
    const controlsId = trig.getAttribute('aria-controls')!;
    expect(controlsId).toBeTruthy();
    expect(shadow(el).querySelector(`#${controlsId}`)).not.toBeNull();
  });

  it('time trigger has aria-haspopup="dialog"', () => {
    expect(shadow(el).querySelector('button.time')!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('date popup and time popup are both role="dialog" (each wraps its own listbox/grid)', () => {
    expect(shadow(el).querySelector('.popup-date')!.getAttribute('role')).toBe('dialog');
    expect(shadow(el).querySelector('.popup-time')!.getAttribute('role')).toBe('dialog');
  });

  it('triggers have descriptive aria-labels (overridable)', () => {
    expect(shadow(el).querySelector('button.date')!.getAttribute('aria-label')).toBe('Choose date');
    expect(shadow(el).querySelector('button.time')!.getAttribute('aria-label')).toBe('Choose time');
  });

  it('aria-expanded flips on the date trigger when the date popup opens', async () => {
    expect(shadow(el).querySelector('button.date')!.getAttribute('aria-expanded')).toBe('false');
    await el.openDate();
    await flush(el);
    expect(shadow(el).querySelector('button.date')!.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('mp-datetime-picker — keyboard on triggers', () => {
  let el: MpDatetimePickerElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('ArrowDown on the date trigger opens the date popup', async () => {
    const trig = shadow(el).querySelector('button.date') as HTMLButtonElement;
    dispatchKey(trig, 'ArrowDown');
    await flush(el);
    expect(el.openPopup).toBe('date');
  });

  it('Enter on the time trigger opens the time popup', async () => {
    const trig = shadow(el).querySelector('button.time') as HTMLButtonElement;
    dispatchKey(trig, 'Enter');
    await flush(el);
    expect(el.openPopup).toBe('time');
  });

  it('Space on the date trigger opens the date popup', async () => {
    const trig = shadow(el).querySelector('button.date') as HTMLButtonElement;
    dispatchKey(trig, ' ');
    await flush(el);
    expect(el.openPopup).toBe('date');
  });

  it('navigation keys are preventDefaulted on triggers', () => {
    const trig = shadow(el).querySelector('button.date') as HTMLButtonElement;
    const ev = dispatchKey(trig, 'ArrowDown');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does not preventDefault on unrelated keys', () => {
    const trig = shadow(el).querySelector('button.date') as HTMLButtonElement;
    const ev = dispatchKey(trig, 'a');
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('mp-datetime-picker — live region', () => {
  let el: MpDatetimePickerElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('renders a polite aria-live region in the shadow tree', () => {
    const region = shadow(el).querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });

  it('announces the new value on user-driven changes', async () => {
    el.setValue(new Date(2026, 4, 14, 9, 30), true);
    await flush(el);
    const region = shadow(el).querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region.textContent).toContain('selected');
    expect(region.textContent).toContain('2026');
  });

  it('announces clear when value is cleared', async () => {
    el.setValue(new Date(2026, 4, 14, 9, 30), true);
    await flush(el);
    el.clearLabel = 'Clear';
    el.setValue(null, true);
    await flush(el);
    const region = shadow(el).querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region.textContent).toContain('Clear');
  });
});

/** Walks activeElement through nested shadow roots. */
function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

describe('mp-datetime-picker — dialog initial focus', () => {
  let el: MpDatetimePickerElement;
  beforeEach(async () => {
    el = await mount((host) => host.setValue(new Date(2026, 4, 15, 9, 30), false));
  });
  afterEach(() => el.remove());

  it('openDate() moves focus to the calendar grid roving cell', async () => {
    await el.openDate();
    await flush(el);
    const active = deepActive() as HTMLElement;
    expect(active?.getAttribute('role')).toBe('gridcell');
    expect(active.getAttribute('tabindex')).toBe('0');
  });

  it('openTime() moves focus to the active time option', async () => {
    await el.openTime();
    await flush(el);
    const active = deepActive() as HTMLElement;
    expect(active?.getAttribute('role')).toBe('option');
  });

  it('closing the date popup returns focus to its trigger', async () => {
    await el.openDate();
    await flush(el);
    el.closePopups();
    await flush(el);
    expect(shadow(el).activeElement).toBe(shadow(el).querySelector('button.date'));
  });
});

/**
 * The `error-text` channel (D12.14). A consumer cannot describe this control
 * from outside — the role lives on an input in this shadow root and an IDREF
 * does not cross the boundary — so the message comes in as text and is wired
 * up in here.
 */
describe('mp-datetime-picker — error-text', () => {
  let el: MpDatetimePickerElement;
  afterEach(() => el?.remove());

  const input = () => shadow(el).querySelector<HTMLInputElement>('input.form-control')!;

  it('describes the display input from a message node it renders itself', async () => {
    el = await mount((host) => {
      host.invalid = true;
      host.errorText = 'End must be after start.';
    });

    const message = shadow(el).querySelector('.invalid-feedback')!;
    expect(message.textContent).toContain('End must be after start.');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-errormessage')).toBe(message.id);
    expect(input().getAttribute('aria-describedby')).toBe(message.id);
  });

  it('renders nothing while valid — aria-errormessage is defined only on an invalid control', async () => {
    el = await mount((host) => {
      host.errorText = 'End must be after start.';
    });

    expect(shadow(el).querySelector('.invalid-feedback')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBe('false');
    expect(input().hasAttribute('aria-errormessage')).toBe(false);
    expect(input().hasAttribute('aria-describedby')).toBe(false);
  });

  it('focus() lands on the display input, which carries the name and the description', async () => {
    el = await mount((host) => {
      host.invalid = true;
      host.errorText = 'End must be after start.';
    });

    el.focus();
    expect(shadow(el).activeElement).toBe(input());
  });
});
