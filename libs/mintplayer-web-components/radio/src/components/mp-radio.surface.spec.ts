import { beforeEach, describe, expect, it } from 'vitest';
import './mp-radio';
import type { MpRadio } from './mp-radio';

/** The property surface of mp-radio and the group coordination it accepts. */
async function mount(markup: string): Promise<MpRadio> {
  document.body.innerHTML = markup;
  const el = document.body.querySelector('mp-radio') as MpRadio;
  await el.updateComplete;
  return el;
}

const inner = (el: MpRadio) => el.shadowRoot!.querySelector('input') as HTMLInputElement;

describe('mp-radio property surface', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('name and value reach the inner input and clear on null', async () => {
    const el = await mount('<mp-radio>R</mp-radio>');
    el.name = 'g';
    el.value = 'a';
    await el.updateComplete;
    expect(inner(el).getAttribute('name')).toBe('g');
    expect(inner(el).getAttribute('value')).toBe('a');
    expect([el.name, el.value]).toEqual(['g', 'a']);
    el.name = null;
    el.value = null;
    await el.updateComplete;
    expect(inner(el).hasAttribute('name')).toBe(false);
    expect(inner(el).hasAttribute('value')).toBe(false);
  });

  it('checked and disabled reflect in both directions', async () => {
    const el = await mount('<mp-radio>R</mp-radio>');
    el.checked = true;
    el.disabled = true;
    await el.updateComplete;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(inner(el).checked).toBe(true);
    expect(inner(el).disabled).toBe(true);
    el.checked = false;
    el.disabled = false;
    await el.updateComplete;
    expect(el.hasAttribute('checked')).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(inner(el).disabled).toBe(false);
  });

  it('the toggle-button variant takes its color and rejects unknown colors', async () => {
    const el = await mount('<mp-radio type="toggle_button">R</mp-radio>');
    const label = () => el.shadowRoot!.querySelector('label')!;
    expect(label().className).toBe('btn btn-secondary');
    el.color = 'danger';
    await el.updateComplete;
    expect(label().className).toBe('btn btn-danger');
    el.color = 'neon' as never;
    expect(el.color).toBe('danger');
  });

  it('the input-label property names the inner input, a host aria-label wins', async () => {
    const el = await mount('<mp-radio></mp-radio>');
    el.inputLabel = 'Option A';
    await el.updateComplete;
    expect(el.inputLabel).toBe('Option A');
    expect(inner(el).getAttribute('aria-label')).toBe('Option A');
    el.setAttribute('aria-label', 'Host');
    await el.updateComplete;
    expect(inner(el).getAttribute('aria-label')).toBe('Host');
  });

  it('the errorText property shows the message only while invalid', async () => {
    const el = await mount('<mp-radio>R</mp-radio>');
    el.errorText = 'Choose one';
    await el.updateComplete;
    expect(el.errorText).toBe('Choose one');
    expect(inner(el).hasAttribute('aria-errormessage')).toBe(false);
    el.setAttribute('invalid', '');
    await el.updateComplete;
    const id = inner(el).getAttribute('aria-errormessage')!;
    expect(el.shadowRoot!.getElementById(id)?.textContent).toContain('Choose one');
  });

  it('a user change reflects checked and emits the radio value', async () => {
    const el = await mount('<mp-radio value="a">R</mp-radio>');
    const details: unknown[] = [];
    el.addEventListener('change', (e) => details.push((e as CustomEvent).detail));
    inner(el).checked = true;
    inner(el).dispatchEvent(new Event('change'));
    expect(details).toEqual([{ checked: true, value: 'a' }]);
    expect(el.hasAttribute('checked')).toBe(true);
  });
});

describe('mp-radio group coordination', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('writes the roving tab stop and set position onto the inner input, in both variants', async () => {
    const el = await mount('<mp-radio>R</mp-radio>');
    el.groupTabIndex = -1;
    el.groupPosInSet = 2;
    el.groupSetSize = 3;
    await el.updateComplete;
    expect([el.groupTabIndex, el.groupPosInSet, el.groupSetSize]).toEqual([-1, 2, 3]);
    expect(inner(el).getAttribute('tabindex')).toBe('-1');
    expect(inner(el).getAttribute('aria-posinset')).toBe('2');
    expect(inner(el).getAttribute('aria-setsize')).toBe('3');

    el.setAttribute('type', 'toggle_button');
    await el.updateComplete;
    expect(inner(el).className).toBe('btn-check');
    expect(inner(el).getAttribute('aria-posinset')).toBe('2');
  });

  it('clears the coordination attributes again when the group lets go', async () => {
    const el = await mount('<mp-radio>R</mp-radio>');
    el.groupTabIndex = 0;
    el.groupPosInSet = 1;
    el.groupSetSize = 2;
    await el.updateComplete;
    el.groupTabIndex = null;
    el.groupPosInSet = null;
    el.groupSetSize = null;
    await el.updateComplete;
    expect(inner(el).hasAttribute('tabindex')).toBe(false);
    expect(inner(el).hasAttribute('aria-posinset')).toBe(false);
    expect(inner(el).hasAttribute('aria-setsize')).toBe(false);
  });
});
