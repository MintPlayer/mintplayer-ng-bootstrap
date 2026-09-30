import { beforeEach, describe, expect, it } from 'vitest';
import './mp-toggle-button';
import type { MpToggleButton } from './mp-toggle-button';

/** Form association and the property surface of mp-toggle-button. */
async function mount(markup: string): Promise<MpToggleButton> {
  document.body.innerHTML = markup;
  const el = document.body.querySelector('mp-toggle-button') as MpToggleButton;
  await el.updateComplete;
  return el;
}

const inner = (el: MpToggleButton) => el.shadowRoot!.querySelector('input') as HTMLInputElement;

/** jsdom's ElementInternals has no setFormValue; record what the element submits. */
function recordFormValue(el: MpToggleButton): unknown[] {
  const calls: unknown[] = [];
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  (internals as unknown as { setFormValue: (v: unknown) => void }).setFormValue = (v) => calls.push(v);
  return calls;
}

describe('mp-toggle-button form association', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('submits its value while checked, "on" without a value, nothing while unchecked', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    expect(el.formValue()).toBeNull();
    el.checked = true;
    expect(el.formValue()).toBe('on');
    el.value = 'yes';
    expect(el.formValue()).toBe('yes');
  });

  it('pushes the new form value after the user toggles', async () => {
    const el = await mount('<mp-toggle-button value="v">T</mp-toggle-button>');
    const calls = recordFormValue(el);
    inner(el).checked = true;
    inner(el).dispatchEvent(new Event('change'));
    await el.updateComplete;
    expect(el.hasAttribute('checked')).toBe(true);
    expect(calls.at(-1)).toBe('v');
  });

  it('a form reset unchecks and drops the reflected checked attribute', async () => {
    const el = await mount('<form><mp-toggle-button checked>T</mp-toggle-button></form>');
    expect(el.checked).toBe(true);
    (el as unknown as { formResetCallback(): void }).formResetCallback();
    await el.updateComplete;
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
    expect(inner(el).checked).toBe(false);
  });

  it('a form reset on an unchecked toggle leaves it unchecked', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.formReset();
    await el.updateComplete;
    expect(el.checked).toBe(false);
  });

  it('formRestore checks for any saved state and unchecks for none', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.formRestore('on');
    await el.updateComplete;
    expect(el.checked).toBe(true);
    expect(inner(el).checked).toBe(true);
    el.formRestore(null);
    await el.updateComplete;
    expect(el.checked).toBe(false);
  });

  it('anchors validity on the inner checkbox', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    expect(el.formValidityAnchor()).toBe(inner(el));
  });
});

describe('mp-toggle-button property surface', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('name and value reach the inner input and clear on null', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.name = 'opt';
    el.value = 'a';
    await el.updateComplete;
    expect(inner(el).getAttribute('name')).toBe('opt');
    expect(inner(el).getAttribute('value')).toBe('a');
    expect([el.name, el.value]).toEqual(['opt', 'a']);

    el.name = null;
    el.value = null;
    await el.updateComplete;
    expect(inner(el).hasAttribute('name')).toBe(false);
    expect(inner(el).hasAttribute('value')).toBe(false);
  });

  it('the name and value attributes drive the same state', async () => {
    const el = await mount('<mp-toggle-button name="n" value="v">T</mp-toggle-button>');
    expect([el.name, el.value]).toEqual(['n', 'v']);
    expect(inner(el).getAttribute('name')).toBe('n');
  });

  it('disabled reflects both ways', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.disabled = true;
    await el.updateComplete;
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(inner(el).disabled).toBe(true);
    el.disabled = false;
    await el.updateComplete;
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(inner(el).disabled).toBe(false);
  });

  it('unchecking programmatically removes the reflected attribute', async () => {
    const el = await mount('<mp-toggle-button checked>T</mp-toggle-button>');
    el.checked = false;
    await el.updateComplete;
    expect(el.hasAttribute('checked')).toBe(false);
    expect(inner(el).checked).toBe(false);
  });

  it('the checked attribute drives the inner checkbox', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.setAttribute('checked', '');
    await el.updateComplete;
    expect(el.checked).toBe(true);
    expect(inner(el).checked).toBe(true);
  });

  it('the color property maps onto the label class and rejects unknown colors', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.color = 'outline-danger';
    await el.updateComplete;
    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.className).toBe('btn btn-outline-danger');
    el.color = 'neon' as never;
    await el.updateComplete;
    expect(el.color).toBe('outline-danger');
  });

  it('reflects required as aria-required on the inner input', async () => {
    const el = await mount('<mp-toggle-button>T</mp-toggle-button>');
    el.setAttribute('required', '');
    await el.updateComplete;
    expect(inner(el).getAttribute('aria-required')).toBe('true');
  });
});
