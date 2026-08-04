import { beforeEach, describe, expect, it } from 'vitest';
import './mp-input-group';
import type { MpInputGroup } from './mp-input-group';

/**
 * The group's whole ARIA contract: `role="group"` exactly while it has an
 * accessible name. An unnamed group is decorative and must add nothing to the
 * accessibility tree; a named one must expose the role the name belongs to —
 * and the sync has to survive a consumer localizing the label late.
 */
async function mount(html: string): Promise<MpInputGroup> {
  document.body.innerHTML = html;
  const el = document.body.querySelector('mp-input-group') as MpInputGroup;
  await el.updateComplete;
  return el;
}

describe('mp-input-group ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes no role while unnamed', async () => {
    const el = await mount(`<mp-input-group><input /></mp-input-group>`);
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('claims role=group when named by aria-label, also when named late', async () => {
    const el = await mount(`<mp-input-group aria-label="Phone number"><input /></mp-input-group>`);
    expect(el.getAttribute('role')).toBe('group');

    const late = await mount(`<mp-input-group><input /></mp-input-group>`);
    late.setAttribute('aria-label', 'Telefoonnummer');
    expect(late.getAttribute('role')).toBe('group');
  });

  it('claims role=group when named by aria-labelledby', async () => {
    const el = await mount(`
      <span id="lbl">Phone</span>
      <mp-input-group aria-labelledby="lbl"><input /></mp-input-group>
    `);
    expect(el.getAttribute('role')).toBe('group');
  });

  it('drops the role it claimed when the name goes away', async () => {
    const el = await mount(`<mp-input-group aria-label="Phone"><input /></mp-input-group>`);
    el.removeAttribute('aria-label');
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('never overwrites a consumer-set role', async () => {
    const el = await mount(`<mp-input-group role="search" aria-label="Site search"><input /></mp-input-group>`);
    expect(el.getAttribute('role')).toBe('search');
    // …and removing the name must not strip a role that is not ours.
    el.removeAttribute('aria-label');
    expect(el.getAttribute('role')).toBe('search');
  });
});
