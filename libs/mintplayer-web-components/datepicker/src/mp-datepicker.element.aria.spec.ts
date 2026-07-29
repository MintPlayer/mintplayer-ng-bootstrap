import { afterEach, describe, expect, it } from 'vitest';
import './mp-datepicker.element';
import type { MpDatepickerElement } from './mp-datepicker.element';

/**
 * Popup ARIA for `<mp-datepicker>`. The naming contract (`input-label`, host
 * `aria-label` winning, no IDREF copies) is asserted centrally in
 * `_conformance/naming.spec.ts` for the display input; the element spec next to
 * this one owns focus movement. What is left — and what nothing asserted before
 * — is the trigger's popup relationship: `aria-haspopup`, an `aria-controls`
 * that actually resolves, and `aria-expanded` staying true to the overlay under
 * BOTH the programmatic `open()`/`close()` API and a user click. A frozen
 * `aria-expanded` was the audit's canonical popup defect, and it is invisible
 * unless both drivers are exercised.
 */
async function flush(el: MpDatepickerElement): Promise<void> {
  await el.updateComplete;
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  await el.updateComplete;
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

const trigger = (el: MpDatepickerElement) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('button.trigger')!;
const popup = (el: MpDatepickerElement) =>
  el.shadowRoot!.querySelector<HTMLElement>('.popup')!;
const displayInput = (el: MpDatepickerElement) =>
  el.shadowRoot!.querySelector<HTMLInputElement>('input.form-control')!;

describe('mp-datepicker — trigger/popup ARIA relationship', () => {
  let el: MpDatepickerElement;
  afterEach(() => el.remove());

  it('claims a dialog popup and points aria-controls at a node that exists in the same root', async () => {
    el = await mount();
    expect(trigger(el).getAttribute('aria-haspopup')).toBe('dialog');

    const controls = trigger(el).getAttribute('aria-controls')!;
    expect(controls).toBeTruthy();
    // Same shadow root, so the IDREF resolves — the reference is not decorative.
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

describe('mp-datepicker — dialog and display-input semantics', () => {
  let el: MpDatepickerElement;
  afterEach(() => el.remove());

  it('names the dialog and the trigger from triggerLabel, and both follow a change', async () => {
    el = await mount();
    expect(popup(el).getAttribute('role')).toBe('dialog');
    expect(popup(el).getAttribute('aria-label')).toBe('Choose date');
    expect(trigger(el).getAttribute('aria-label')).toBe('Choose date');

    el.triggerLabel = 'Pick a delivery date';
    await flush(el);
    expect(popup(el).getAttribute('aria-label')).toBe('Pick a delivery date');
    expect(trigger(el).getAttribute('aria-label')).toBe('Pick a delivery date');
  });

  it('announces the display field as read-only rather than an editable text box', async () => {
    el = await mount();
    expect(displayInput(el).getAttribute('aria-readonly')).toBe('true');
    expect(displayInput(el).readOnly).toBe(true);
  });

  it('never copies the host IDREF attributes onto the trigger or the dialog', async () => {
    // The conformance suite covers the display input; the popup nodes are the
    // ones a hand-rolled forward would most plausibly leak onto.
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
