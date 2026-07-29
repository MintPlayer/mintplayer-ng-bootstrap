import { afterEach, describe, expect, it } from 'vitest';
import './mp-timepicker.element';
import type { MpTimepickerElement } from './mp-timepicker.element';

/**
 * Popup ARIA for `<mp-timepicker>` — the picker shell, not the list. The list's
 * own role/option/selection contract is fully covered by
 * `mp-time-list.element.spec.ts`, and the display input's name by
 * `_conformance/naming.spec.ts`; the sibling element spec owns focus movement.
 *
 * The shell's untested surface is the trigger→popup wiring: it advertises a
 * LISTBOX popup (not a dialog, unlike the datepicker), so the promise has to be
 * kept by what is actually inside, `aria-controls` has to resolve, and
 * `aria-expanded` has to follow the overlay under both the programmatic API and
 * a click.
 */
async function flush(el: MpTimepickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  await el.updateComplete;
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

const trigger = (el: MpTimepickerElement) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('button.trigger')!;
const popup = (el: MpTimepickerElement) =>
  el.shadowRoot!.querySelector<HTMLElement>('.popup')!;
const displayInput = (el: MpTimepickerElement) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input.form-control')!;

describe('mp-timepicker — trigger/popup ARIA relationship', () => {
  let el: MpTimepickerElement;
  afterEach(() => el.remove());

  it('advertises a listbox popup and delivers one — the wrapper stays presentational', async () => {
    el = await mount();
    expect(trigger(el).getAttribute('aria-haspopup')).toBe('listbox');
    // The listbox role belongs to mp-time-list; a second role on the wrapper
    // would make the promise resolve to the wrong node.
    expect(popup(el).hasAttribute('role')).toBe(false);
    expect(popup(el).querySelector('mp-time-list')!.getAttribute('role')).toBe('listbox');
  });

  it('points aria-controls at a node that exists in the same root', async () => {
    el = await mount();
    const controls = trigger(el).getAttribute('aria-controls')!;
    expect(controls).toBeTruthy();
    expect(el.shadowRoot!.getElementById(controls)).toBe(popup(el));
  });

  it('flips aria-expanded both ways through the programmatic open()/close() API', async () => {
    el = await mount();
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');

    await el.open();
    await flush(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');

    el.close();
    await flush(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('flips aria-expanded both ways on trigger clicks too', async () => {
    el = await mount();
    trigger(el).click();
    await flush(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');

    trigger(el).click();
    await flush(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps aria-expanded honest when disabled — the popup never opened', async () => {
    el = await mount((host) => (host.disabled = true));
    await el.open();
    await flush(el);
    expect(el.isOpen).toBe(false);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(el).disabled).toBe(true);
  });
});

describe('mp-timepicker — trigger name and display-input semantics', () => {
  let el: MpTimepickerElement;
  afterEach(() => el.remove());

  it('names the trigger from triggerLabel and follows a change', async () => {
    el = await mount();
    expect(trigger(el).getAttribute('aria-label')).toBe('Choose time');

    el.triggerLabel = 'Pick a pickup time';
    await flush(el);
    expect(trigger(el).getAttribute('aria-label')).toBe('Pick a pickup time');
  });

  it('announces the display field as read-only rather than an editable text box', async () => {
    el = await mount();
    expect(displayInput(el).getAttribute('aria-readonly')).toBe('true');
    expect(displayInput(el).readOnly).toBe(true);
  });

  it('never copies the host IDREF attributes onto the trigger or the popup', async () => {
    el = await mount((host) => {
      host.setAttribute('aria-labelledby', 'outer-label');
      host.setAttribute('aria-describedby', 'outer-hint');
    });
    for (const node of [trigger(el), popup(el)]) {
      expect(node.hasAttribute('aria-labelledby')).toBe(false);
      expect(node.hasAttribute('aria-describedby')).toBe(false);
    }
  });
});
