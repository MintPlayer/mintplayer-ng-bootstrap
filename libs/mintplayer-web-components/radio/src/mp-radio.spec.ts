import { afterEach, describe, expect, it } from 'vitest';
import { MpRadio, MpRadioGroup } from './index';

void MpRadio; // force the side-effect registrations
void MpRadioGroup;

/**
 * The generated Lit radio group (#458 M3): light DOM, Bootstrap form-check
 * markup, one native radio set per group. The group reacts only to its own
 * radios, so a radio list nested in another group is a set of its own.
 */
async function mount(html: string): Promise<void> {
  document.body.innerHTML = html;
  const elements = [...document.body.querySelectorAll<MpRadio | MpRadioGroup>('mp-radio, mp-radio-group')];
  await Promise.all(elements.map((el) => el.updateComplete));
  await Promise.all(elements.map((el) => el.updateComplete));
}

const radios = (selector: string) => [...document.body.querySelectorAll<HTMLInputElement>(`${selector} input[type=radio]`)];

function pick(input: HTMLInputElement): void {
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('mp-radio / mp-radio-group', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Bootstrap form-check markup in the light DOM', async () => {
    await mount('<mp-radio value="a">A</mp-radio>');
    const el = document.querySelector('mp-radio') as MpRadio;
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('form-check')).toBe(true);
    expect(el.getAttribute('data-mps')).toBe('radio');
    const input = el.querySelector(':scope > input.form-check-input[type=radio]') as HTMLInputElement;
    expect(el.querySelector(':scope > label.form-check-label')?.getAttribute('for')).toBe(input.id);
    expect(el.querySelector('label')?.textContent?.trim()).toBe('A');
  });

  it('a group is a radiogroup that hands its radios one name and its selection', async () => {
    await mount('<mp-radio-group name="fruit" value="b"><mp-radio value="a">A</mp-radio><mp-radio value="b">B</mp-radio></mp-radio-group>');
    expect(document.querySelector('mp-radio-group')?.getAttribute('role')).toBe('radiogroup');
    expect(radios('mp-radio-group').map((i) => i.name)).toEqual(['fruit', 'fruit']);
    expect(radios('mp-radio-group').map((i) => i.checked)).toEqual([false, true]);
  });

  it('a pick writes the group value back and dispatches valuechange', async () => {
    await mount('<mp-radio-group name="fruit"><mp-radio value="a">A</mp-radio><mp-radio value="b">B</mp-radio></mp-radio-group>');
    const group = document.querySelector('mp-radio-group') as MpRadioGroup;
    const seen: unknown[] = [];
    group.addEventListener('valuechange', (e) => seen.push((e as CustomEvent).detail));
    pick(radios('mp-radio-group')[0]);
    await group.updateComplete;
    expect(group.value).toBe('a');
    expect(seen).toEqual(['a']);
  });

  it('a nested group is a set of its own: the nearest group wins', async () => {
    await mount(`
      <mp-radio-group id="outer" name="row">
        <mp-radio value="r1">Row 1</mp-radio>
        <mp-radio-group id="inner"><mp-radio value="S">S</mp-radio><mp-radio value="L">L</mp-radio></mp-radio-group>
      </mp-radio-group>`);
    const outer = document.getElementById('outer') as MpRadioGroup;
    const inner = document.getElementById('inner') as MpRadioGroup;
    const innerRadios = radios('#inner');
    expect(innerRadios[0].name).not.toBe('row');

    pick(innerRadios[1]);
    await inner.updateComplete;
    expect(inner.value).toBe('L');
    expect(outer.value).toBeNull();
  });
});
