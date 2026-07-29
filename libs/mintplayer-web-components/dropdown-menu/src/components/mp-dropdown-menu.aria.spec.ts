import { beforeEach, describe, expect, it } from 'vitest';
import './mp-dropdown-menu';
import type { MpDropdownMenu } from './mp-dropdown-menu';

/**
 * Naming contract for `<mp-dropdown-menu>`, plus the regression guard on the
 * defect its old API *was*: `label-id` wrote `aria-labelledby` on the `<ul>`
 * inside the shadow root pointing at a document id — an IDREF cannot cross that
 * boundary, so the attribute was visible in devtools and conveyed nothing. The
 * property is deleted, not aliased.
 *
 * A menu has no intrinsic text, so unlike the form toggles the name here is
 * genuinely the consumer's to give (PRD 5.2b category 4) — and it stays optional,
 * degrading to no name rather than an invented one.
 */
async function mount(html: string): Promise<{ host: MpDropdownMenu; list: HTMLUListElement }> {
  document.body.innerHTML = html;
  const host = document.querySelector('mp-dropdown-menu') as MpDropdownMenu;
  await host.updateComplete;
  return { host, list: host.shadowRoot!.querySelector('ul') as HTMLUListElement };
}

describe('mp-dropdown-menu naming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the list from input-label', async () => {
    const { list } = await mount('<mp-dropdown-menu input-label="User actions"></mp-dropdown-menu>');
    expect(list.getAttribute('aria-label')).toBe('User actions');
  });

  it('lets a host aria-label win over input-label', async () => {
    const { list } = await mount(
      '<mp-dropdown-menu aria-label="From host" input-label="From property"></mp-dropdown-menu>',
    );
    expect(list.getAttribute('aria-label')).toBe('From host');
  });

  it('invents no name when the consumer gives none', async () => {
    const { list } = await mount('<mp-dropdown-menu></mp-dropdown-menu>');
    expect(list.hasAttribute('aria-label')).toBe(false);
  });

  it('no longer accepts label-id, and never writes its dead IDREF', async () => {
    // The old mechanism. If either assertion fails, someone has resurrected it.
    const { host, list } = await mount(
      '<span id="outer">Menu</span><mp-dropdown-menu label-id="outer"></mp-dropdown-menu>',
    );
    expect(list.hasAttribute('aria-labelledby')).toBe(false);
    expect('labelId' in host && (host as unknown as { labelId?: unknown }).labelId !== undefined).toBe(false);
  });

  it('does not copy a host aria-labelledby inward as an IDREF string either', async () => {
    const { list } = await mount(
      '<span id="outer">Menu</span><mp-dropdown-menu aria-labelledby="outer"></mp-dropdown-menu>',
    );
    // Tier 2 assigns element references (spike 0.2); the string must not be copied.
    expect(list.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('keeps the name live when input-label changes', async () => {
    const { host, list } = await mount('<mp-dropdown-menu input-label="First"></mp-dropdown-menu>');
    host.setAttribute('input-label', 'Second');
    await host.updateComplete;
    expect(list.getAttribute('aria-label')).toBe('Second');
  });

  it('keeps the list role intact alongside the naming attributes', async () => {
    const { list } = await mount('<mp-dropdown-menu mode="menu" aria-label="Actions"></mp-dropdown-menu>');
    expect(list.getAttribute('role')).toBe('menu');
    expect(list.getAttribute('aria-label')).toBe('Actions');
  });
});
