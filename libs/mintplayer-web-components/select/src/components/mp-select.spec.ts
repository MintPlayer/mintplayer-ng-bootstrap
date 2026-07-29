import { describe, expect, it } from 'vitest';
import './mp-select';


describe('mp-select optgroup support (audit Critical: groups used to vanish)', () => {
  it('slotted optgroups render with their label, and their options are selectable', async () => {
    document.body.innerHTML = `
      <mp-select>
        <option value="a">Plain A</option>
        <optgroup label="Group 1">
          <option value="g1a">G1 A</option>
          <option value="g1b" disabled>G1 B</option>
        </optgroup>
      </mp-select>`;
    await customElements.whenDefined('mp-select');
    const el = document.querySelector('mp-select') as HTMLElement & { updateComplete: Promise<unknown>; value: string | null };
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    const select = el.shadowRoot!.querySelector('select')!;
    const group = select.querySelector('optgroup');
    expect(group).not.toBeNull();
    expect(group!.label).toBe('Group 1');
    expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual(['a', 'g1a', 'g1b']);
    expect(select.querySelector('option[value="g1b"]')!.disabled).toBe(true);

    select.value = 'g1a';
    select.dispatchEvent(new Event('change'));
    expect(el.value).toBe('g1a');
  });

  it('the options property accepts groups too', async () => {
    document.body.innerHTML = `<mp-select></mp-select>`;
    await customElements.whenDefined('mp-select');
    const el = document.querySelector('mp-select') as HTMLElement & {
      updateComplete: Promise<unknown>;
      options: unknown;
    };
    el.options = [
      { value: 'x', label: 'X' },
      { label: 'G', options: [{ value: 'y', label: 'Y' }] },
    ];
    await el.updateComplete;
    const select = el.shadowRoot!.querySelector('select')!;
    expect(select.querySelector('optgroup')?.label).toBe('G');
    expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual(['x', 'y']);
  });
});
