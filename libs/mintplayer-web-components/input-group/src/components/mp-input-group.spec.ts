import { beforeEach, describe, expect, it } from 'vitest';
import './mp-input-group';
import type { MpInputGroup } from './mp-input-group';

/**
 * jsdom covers the element's behaviour (attributes, slot handling, size
 * mirroring); the visual contract — corner pairing, the -1px overlap, RTL —
 * was measured per-engine in spike S1 and is exercised by the demo e2e, since
 * jsdom does no layout and resolves no ::slotted() rules.
 */
async function mount(html: string): Promise<MpInputGroup> {
  document.body.innerHTML = html;
  const el = document.body.querySelector('mp-input-group') as MpInputGroup;
  await el.updateComplete;
  return el;
}

describe('mp-input-group', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders its children through a single slot, untouched', async () => {
    const el = await mount(`
      <mp-input-group>
        <input type="text" class="form-control" data-probe="kept" />
        <span class="addon">@</span>
      </mp-input-group>
    `);
    // Light DOM stays light DOM — nothing is moved or wrapped.
    expect(el.querySelector('input')?.dataset['probe']).toBe('kept');
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('.input-group')).toBeTruthy();
  });

  it('mirrors sm/lg onto custom-element children and clears back to md', async () => {
    const el = await mount(`
      <mp-input-group size="sm">
        <mp-select></mp-select>
        <input type="text" />
      </mp-input-group>
    `);
    expect(el.querySelector('mp-select')?.getAttribute('size')).toBe('sm');
    // Native children are sized by the group's own stylesheet, never attributes.
    expect(el.querySelector('input')?.hasAttribute('size')).toBe(false);

    el.size = 'lg';
    await el.updateComplete;
    expect(el.querySelector('mp-select')?.getAttribute('size')).toBe('lg');

    el.size = 'md';
    await el.updateComplete;
    // md is the absence of a size, so the mirrored attribute is removed…
    expect(el.querySelector('mp-select')?.hasAttribute('size')).toBe(false);
  });

  it('does not clobber an unrelated size value a control carries', async () => {
    const el = await mount(`
      <mp-input-group>
        <mp-select size="7"></mp-select>
      </mp-input-group>
    `);
    el.size = 'md';
    await el.updateComplete;
    // …but only sm/lg are ever cleared: a foreign value is not ours to remove.
    expect(el.querySelector('mp-select')?.getAttribute('size')).toBe('7');
  });

  it('mirrors onto children slotted in later', async () => {
    const el = await mount(`<mp-input-group size="lg"></mp-input-group>`);
    const child = document.createElement('mp-select');
    el.appendChild(child);
    await el.updateComplete;
    // slotchange is async in jsdom too — one microtask is enough.
    await new Promise((resolve) => setTimeout(resolve));
    expect(child.getAttribute('size')).toBe('lg');
  });

  it('reflects the size property to the attribute, md as absence', async () => {
    const el = await mount(`<mp-input-group></mp-input-group>`);
    expect(el.size).toBe('md');
    expect(el.hasAttribute('size')).toBe(false);
    el.size = 'sm';
    expect(el.getAttribute('size')).toBe('sm');
    el.size = 'md';
    expect(el.hasAttribute('size')).toBe(false);
  });
});
