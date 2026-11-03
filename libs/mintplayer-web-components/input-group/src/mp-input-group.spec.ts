import { afterEach, describe, expect, it } from 'vitest';
import { MpInputGroup } from './index';

void MpInputGroup; // force the side-effect registration

/**
 * The generated Lit input group (#458 M3): the host IS the `.input-group`, in
 * the light DOM, like `bs-input-group`. Geometry (corner pairing, the -1px
 * overlap, RTL) is exercised by the demo e2e; jsdom does no layout.
 */
async function mount(html: string): Promise<MpInputGroup> {
  document.body.innerHTML = html;
  const el = document.body.querySelector('mp-input-group') as MpInputGroup;
  await el.updateComplete;
  return el;
}

describe('mp-input-group', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is the .input-group itself, its children kept in order', async () => {
    const el = await mount('<mp-input-group><input class="form-control" data-probe="kept"><span class="input-group-text">@</span></mp-input-group>');
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('input-group')).toBe(true);
    expect(el.getAttribute('data-mps')).toBe('input-group');
    expect(el.querySelector(':scope > input')?.getAttribute('data-probe')).toBe('kept');
    expect(el.querySelector(':scope > input + span.input-group-text')).not.toBeNull();
  });

  it('sizes through the group class and keeps consumer classes', async () => {
    const el = await mount('<mp-input-group class="mine" size="sm"><select class="form-select"></select></mp-input-group>');
    expect(el.classList.contains('mine')).toBe(true);
    expect(el.classList.contains('input-group-sm')).toBe(true);
    el.size = 'lg';
    await el.updateComplete;
    expect(el.classList.contains('input-group-lg')).toBe(true);
    expect(el.classList.contains('input-group-sm')).toBe(false);
    el.size = 'md';
    await el.updateComplete;
    expect(el.className).not.toMatch(/input-group-(sm|lg)/);
    expect(el.classList.contains('mine')).toBe(true);
  });

  it('is a group only while it has a label', async () => {
    const el = await mount('<mp-input-group></mp-input-group>');
    expect(el.hasAttribute('role')).toBe(false);
    el.label = 'Amount';
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Amount');
    el.label = null;
    await el.updateComplete;
    expect(el.hasAttribute('role')).toBe(false);
  });
});
