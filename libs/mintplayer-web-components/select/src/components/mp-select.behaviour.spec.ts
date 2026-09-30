import { beforeEach, describe, expect, it } from 'vitest';
import './mp-select';
import type { MpSelect, SelectChangeEventDetail } from './mp-select';

/**
 * Selection, form association and the property/attribute surface of
 * mp-select, driven through the inner native select the way a user would.
 */
async function mount(markup = '<mp-select></mp-select>'): Promise<MpSelect> {
  document.body.innerHTML = markup;
  const el = document.body.querySelector('mp-select') as MpSelect;
  await el.updateComplete;
  return el;
}

const inner = (el: MpSelect) => el.shadowRoot!.querySelector('select') as HTMLSelectElement;

/** Slot assignment and the MutationObserver both settle a task later. */
async function settle(el: MpSelect): Promise<void> {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

const ABC = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
];

/** jsdom's ElementInternals has no setValidity; record what the element reports. */
function recordValidity(el: MpSelect): ValidityStateFlags[] {
  const calls: ValidityStateFlags[] = [];
  const internals = (el as unknown as { internals: ElementInternals }).internals;
  (internals as unknown as { setValidity: (f: ValidityStateFlags) => void }).setValidity = (f) => calls.push(f);
  return calls;
}

describe('mp-select behaviour', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('single selection', () => {
    it('emits value-change and a composed change when the user picks an option', async () => {
      const el = await mount();
      el.options = ABC;
      await el.updateComplete;
      const details: SelectChangeEventDetail[] = [];
      let changes = 0;
      el.addEventListener('value-change', (e) => details.push((e as CustomEvent<SelectChangeEventDetail>).detail));
      el.addEventListener('change', () => changes++);

      inner(el).value = 'b';
      inner(el).dispatchEvent(new Event('change'));

      expect(details).toEqual([{ value: 'b', values: ['b'] }]);
      expect(changes).toBe(1);
      expect(el.value).toBe('b');
      expect(el.formValue()).toBe('b');
    });

    it('treats the empty option as no selection', async () => {
      const el = await mount();
      el.options = [{ value: '', label: '(none)' }, ...ABC];
      el.value = 'a';
      await el.updateComplete;
      inner(el).value = '';
      inner(el).dispatchEvent(new Event('change'));
      expect(el.value).toBeNull();
      expect(el.values).toEqual([]);
    });

    it('restores the native selection from value after every re-render', async () => {
      const el = await mount();
      el.options = ABC;
      el.value = 'c';
      await el.updateComplete;
      el.options = [...ABC];
      await el.updateComplete;
      expect(inner(el).value).toBe('c');
    });

    it('the value attribute drives the selection', async () => {
      const el = await mount('<mp-select value="b"></mp-select>');
      el.options = ABC;
      await el.updateComplete;
      expect(el.value).toBe('b');
      expect(inner(el).value).toBe('b');
    });
  });

  describe('multiple selection', () => {
    it('reports every selected option in values, the first as value', async () => {
      const el = await mount('<mp-select multiple></mp-select>');
      el.options = ABC;
      await el.updateComplete;
      const details: SelectChangeEventDetail[] = [];
      el.addEventListener('value-change', (e) => details.push((e as CustomEvent<SelectChangeEventDetail>).detail));

      const opts = inner(el).options;
      opts[0].selected = true;
      opts[2].selected = true;
      inner(el).dispatchEvent(new Event('change'));

      expect(details.at(-1)).toEqual({ value: 'a', values: ['a', 'c'] });
      expect(el.values).toEqual(['a', 'c']);
    });

    it('marks the options from values after a render', async () => {
      const el = await mount();
      el.multiple = true;
      el.options = ABC;
      el.values = ['b', 'c'];
      await el.updateComplete;
      expect(Array.from(inner(el).selectedOptions).map((o) => o.value)).toEqual(['b', 'c']);
      expect(el.value).toBe('b');
    });

    it('submits one FormData entry per selected option, keyed by name', async () => {
      const el = await mount('<mp-select multiple name="tags"></mp-select>');
      el.options = ABC;
      el.values = ['a', 'b'];
      const data = el.formValue() as FormData;
      expect(data.getAll('tags')).toEqual(['a', 'b']);
    });

    it('submits nothing without a name or without a selection', async () => {
      const unnamed = await mount('<mp-select multiple></mp-select>');
      unnamed.values = ['a'];
      expect(unnamed.formValue()).toBeNull();

      const empty = await mount('<mp-select multiple name="tags"></mp-select>');
      expect(empty.formValue()).toBeNull();
    });

    it('with no selection, value becomes null', async () => {
      const el = await mount('<mp-select multiple></mp-select>');
      el.options = ABC;
      el.values = ['a'];
      await el.updateComplete;
      inner(el).options[0].selected = false;
      inner(el).dispatchEvent(new Event('change'));
      expect(el.value).toBeNull();
      expect(el.values).toEqual([]);
    });

    it('a non-array values write clears the selection', async () => {
      const el = await mount();
      el.values = ['a'];
      el.values = 'a' as unknown as string[];
      expect(el.values).toEqual([]);
    });

    it('values hands out a copy', async () => {
      const el = await mount();
      el.values = ['a'];
      el.values.push('b');
      expect(el.values).toEqual(['a']);
    });
  });

  describe('form association', () => {
    it('a form reset clears both value and values', async () => {
      const el = await mount();
      el.options = ABC;
      el.value = 'b';
      el.values = ['b'];
      await el.updateComplete;
      el.formReset();
      await el.updateComplete;
      expect(el.value).toBeNull();
      expect(el.values).toEqual([]);
    });

    it('formRestore takes a string state and ignores anything else', async () => {
      const el = await mount();
      el.formRestore('c');
      expect(el.value).toBe('c');
      el.formRestore(new FormData());
      expect(el.value).toBe('c');
    });

    it('reports valueMissing only while required and empty', async () => {
      const el = await mount();
      el.options = ABC;
      const calls = recordValidity(el);
      el.setAttribute('required', '');
      await el.updateComplete;
      expect(calls.at(-1)).toEqual({ valueMissing: true });
      expect(inner(el).getAttribute('aria-required')).toBe('true');

      el.value = 'a';
      await el.updateComplete;
      expect(calls.at(-1)).toEqual({ valueMissing: false });
    });

    it('anchors validity on the inner select', async () => {
      const el = await mount();
      expect(el.formValidityAnchor()).toBe(inner(el));
    });
  });

  describe('property and attribute surface', () => {
    it('size maps to the Bootstrap size class and rejects unknown sizes', async () => {
      const el = await mount();
      el.size = 'lg';
      await el.updateComplete;
      expect(inner(el).className).toBe('form-select form-select-lg');
      el.size = 'huge' as never;
      await el.updateComplete;
      expect(el.size).toBe('lg');
      el.setAttribute('size', 'sm');
      await el.updateComplete;
      expect(inner(el).className).toBe('form-select form-select-sm');
      el.setAttribute('size', 'bogus');
      await el.updateComplete;
      expect(el.size).toBe('sm');
      el.size = 'md';
      await el.updateComplete;
      expect(inner(el).className).toBe('form-select');
    });

    it('numberVisible becomes the native size; null removes it', async () => {
      const el = await mount();
      el.numberVisible = 4;
      await el.updateComplete;
      expect(inner(el).getAttribute('size')).toBe('4');
      el.numberVisible = null;
      await el.updateComplete;
      expect(inner(el).hasAttribute('size')).toBe(false);
      el.setAttribute('number-visible', '3');
      await el.updateComplete;
      expect(el.numberVisible).toBe(3);
      el.removeAttribute('number-visible');
      expect(el.numberVisible).toBeNull();
    });

    it('multiple and disabled reflect as attributes and reach the native select', async () => {
      const el = await mount();
      el.multiple = true;
      el.disabled = true;
      await el.updateComplete;
      expect(el.hasAttribute('multiple')).toBe(true);
      expect(el.hasAttribute('disabled')).toBe(true);
      expect(inner(el).multiple).toBe(true);
      expect(inner(el).disabled).toBe(true);

      el.multiple = false;
      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('multiple')).toBe(false);
      expect(el.hasAttribute('disabled')).toBe(false);
      expect(inner(el).disabled).toBe(false);
    });

    it('the disabled and multiple attributes drive the properties', async () => {
      const el = await mount('<mp-select disabled multiple></mp-select>');
      expect(el.disabled).toBe(true);
      expect(el.multiple).toBe(true);
      el.removeAttribute('disabled');
      expect(el.disabled).toBe(false);
    });

    it('host aria-label outranks input-label on the inner select', async () => {
      const el = await mount('<mp-select input-label="Fallback"></mp-select>');
      expect(inner(el).getAttribute('aria-label')).toBe('Fallback');
      el.setAttribute('aria-label', 'Host');
      await el.updateComplete;
      expect(inner(el).getAttribute('aria-label')).toBe('Host');
      el.removeAttribute('aria-label');
      el.inputLabel = null;
      await el.updateComplete;
      expect(inner(el).hasAttribute('aria-label')).toBe(false);
    });

    it('errorText is referenced from the select only while invalid', async () => {
      const el = await mount();
      el.errorText = 'Pick one';
      await el.updateComplete;
      expect(inner(el).hasAttribute('aria-errormessage')).toBe(false);

      el.setAttribute('invalid', '');
      await el.updateComplete;
      const id = inner(el).getAttribute('aria-errormessage')!;
      expect(el.shadowRoot!.getElementById(id)?.textContent).toContain('Pick one');
      expect(inner(el).getAttribute('aria-invalid')).toBe('true');

      el.setAttribute('error-text', 'Other');
      await el.updateComplete;
      expect(el.errorText).toBe('Other');
      expect(el.shadowRoot!.getElementById(id)?.textContent).toContain('Other');
    });
  });

  describe('slotted options', () => {
    it('re-mirrors a slotted option whose value and text change after render', async () => {
      const el = await mount('<mp-select><option value="x">X</option></mp-select>');
      await settle(el);
      const option = el.querySelector('option')!;
      option.value = 'y';
      option.textContent = 'Why';
      await settle(el);
      const mirrored = inner(el).querySelector('option')!;
      expect(mirrored.value).toBe('y');
      expect(mirrored.textContent?.trim()).toBe('Why');
    });

    it('ignores slotted children that are neither option nor optgroup', async () => {
      const el = await mount('<mp-select><span>noise</span><option value="x">X</option></mp-select>');
      await settle(el);
      expect(Array.from(inner(el).options).map((o) => o.value)).toEqual(['x']);
    });

    it('drops the mirror when every slotted option is removed', async () => {
      const el = await mount('<mp-select><option value="x">X</option></mp-select>');
      await settle(el);
      el.querySelector('option')!.remove();
      await settle(el);
      expect(inner(el).options).toHaveLength(0);
    });

    it('stops observing slotted options once disconnected', async () => {
      const el = await mount('<mp-select><option value="x">X</option></mp-select>');
      await settle(el);
      const option = el.querySelector('option')!;
      el.remove();
      option.value = 'changed';
      await settle(el);
      expect(inner(el).querySelector('option')!.value).toBe('x');
    });
  });
});
