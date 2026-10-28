import { html } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { MpSelect } from './generated';

void MpSelect; // force the side-effect registration

/**
 * The Lit select front (#437): light DOM, rendered from the template compiled
 * out of `@mintplayer/ui-core/select`. The core's own spec covers the bags;
 * this file pins what the element does: a native select that names, selects,
 * reports and submits, from `options` or from authored `<option>` children.
 */

async function settle(el: MpSelect): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(markup: string): Promise<MpSelect> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-select') as MpSelect;
  await settle(el);
  return el;
}

const inner = (el: MpSelect) => el.querySelector('select') as HTMLSelectElement;

function pick(el: MpSelect, value: string): void {
  inner(el).value = value;
  inner(el).dispatchEvent(new Event('change', { bubbles: true }));
}

const FRUIT = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-select', () => {
  it('renders a native form-select in the light DOM, with no role on the host', async () => {
    const el = await mount('<mp-select></mp-select>');
    expect(el.shadowRoot).toBeNull();
    expect(inner(el).classList.contains('form-select')).toBe(true);
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('renders the options property, groups included, with disabled options', async () => {
    const el = await mount('<mp-select></mp-select>');
    el.options = [{ value: 'x', label: 'X' }, { label: 'Fruit', options: FRUIT }];
    await settle(el);
    const select = inner(el);
    expect([...select.options].map((o) => o.value)).toEqual(['x', 'a', 'b', 'c']);
    expect(select.querySelector('optgroup')?.label).toBe('Fruit');
    expect(select.options[3].disabled).toBe(true);
  });

  it('moves authored option and optgroup children into the select, keeping their identity', async () => {
    const el = await mount('<mp-select><option value="1">One</option><optgroup label="G"><option value="2">Two</option></optgroup></mp-select>');
    const select = inner(el);
    expect([...select.options].map((o) => o.value)).toEqual(['1', '2']);
    expect(select.querySelector('optgroup')?.label).toBe('G');
  });

  it('selects from value, also when the value arrives after the options', async () => {
    const el = await mount('<mp-select value="b"></mp-select>');
    el.options = FRUIT;
    await settle(el);
    expect(inner(el).value).toBe('b');
    el.value = 'a';
    await settle(el);
    expect(inner(el).value).toBe('a');
  });

  it('reports a pick with valuechange, writes value back, and lets the native change bubble', async () => {
    const el = await mount('<mp-select></mp-select>');
    el.options = FRUIT;
    await settle(el);
    const details: unknown[] = [];
    let changes = 0;
    el.addEventListener('valuechange', (e) => details.push((e as CustomEvent).detail));
    el.addEventListener('change', () => changes++);
    pick(el, 'b');
    expect(details).toEqual([{ value: 'b', values: ['b'] }]);
    expect(el.value).toBe('b');
    expect(changes).toBe(1);
  });

  it('treats an empty option as no selection', async () => {
    const el = await mount('<mp-select value="a"><option value="">None</option><option value="a">A</option></mp-select>');
    pick(el, '');
    expect(el.value).toBeNull();
  });

  it('reports every selected option of a multiple select, the first as value', async () => {
    const el = await mount('<mp-select multiple></mp-select>');
    el.options = FRUIT;
    el.values = ['a', 'b'];
    await settle(el);
    expect([...inner(el).selectedOptions].map((o) => o.value)).toEqual(['a', 'b']);
    inner(el).options[0].selected = false;
    inner(el).dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.values).toEqual(['b']);
    expect(el.value).toBe('b');
  });

  it('submits natively, one entry per selected option, keyed by name', async () => {
    const host = document.createElement('form');
    host.innerHTML = '<mp-select name="f" multiple></mp-select>';
    document.body.append(host);
    const el = host.querySelector('mp-select') as MpSelect;
    el.options = FRUIT;
    el.values = ['a', 'b'];
    await settle(el);
    expect(new FormData(host).getAll('f')).toEqual(['a', 'b']);
  });

  it('maps size to the Bootstrap class, number-visible to the native size, and reaches disabled', async () => {
    const el = await mount('<mp-select size="lg" number-visible="4" disabled></mp-select>');
    const select = inner(el);
    expect(select.className).toBe('form-select form-select-lg');
    expect(select.getAttribute('size')).toBe('4');
    expect(select.disabled).toBe(true);
    el.size = 'nope' as never;
    el.numberVisible = null;
    await settle(el);
    expect(inner(el).className).toBe('form-select');
    expect(inner(el).hasAttribute('size')).toBe(false);
  });

  it('names the select from input-label, and a host aria-label wins', async () => {
    const named = await mount('<mp-select input-label="Fruit"></mp-select>');
    expect(inner(named).getAttribute('aria-label')).toBe('Fruit');
    named.inputLabel = 'Veg';
    await settle(named);
    expect(inner(named).getAttribute('aria-label')).toBe('Veg');
    const both = await mount('<mp-select aria-label="Host" input-label="Inner"></mp-select>');
    expect(inner(both).getAttribute('aria-label')).toBe('Host');
  });

  it('references the error message only while invalid, and tracks a late required', async () => {
    const el = await mount('<mp-select error-text="Pick one"></mp-select>');
    expect(el.querySelector('.invalid-feedback')).toBeNull();
    expect(inner(el).hasAttribute('aria-describedby')).toBe(false);
    el.invalid = true;
    el.required = true;
    await settle(el);
    const message = el.querySelector('.invalid-feedback')!;
    expect(message.textContent?.trim()).toBe('Pick one');
    expect(inner(el).getAttribute('aria-errormessage')).toBe(message.id);
    expect(inner(el).getAttribute('aria-describedby')).toBe(message.id);
    expect(inner(el).getAttribute('aria-invalid')).toBe('true');
    expect(inner(el).getAttribute('aria-required')).toBe('true');
    el.invalid = false;
    await settle(el);
    expect(el.querySelector('.invalid-feedback')).toBeNull();
    expect(inner(el).hasAttribute('aria-errormessage')).toBe(false);
  });

  it('stays plain where customizable select is unsupported, even with an option renderer', async () => {
    const el = await mount('<mp-select></mp-select>');
    el.options = FRUIT;
    el.optionRenderer = ({ option }) => html`<b>${option.label}</b>`;
    await settle(el);
    expect(inner(el).querySelector('button')).toBeNull();
    expect(inner(el).querySelector('b')).toBeNull();
    expect(inner(el).options[0].text).toBe('Apple');
  });
});
