import { afterEach, describe, expect, it } from 'vitest';
import { MpInputGroup } from './index';

void MpInputGroup; // force the side-effect registration

/**
 * The Lit input group (#437): the host IS the `.input-group`, in the light DOM,
 * like `bs-input-group`. Geometry (corner pairing, the -1px overlap, RTL) is
 * exercised by the demo e2e; jsdom does no layout.
 */
function mount(html: string): MpInputGroup {
  document.body.innerHTML = html;
  return document.body.querySelector('mp-input-group') as MpInputGroup;
}

describe('mp-input-group', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is the .input-group itself, its children untouched and unwrapped', () => {
    const el = mount('<mp-input-group><input class="form-control" data-probe="kept"><span class="input-group-text">@</span></mp-input-group>');
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('input-group')).toBe(true);
    expect(el.getAttribute('data-mps')).toBe('input-group');
    expect(el.children[0].getAttribute('data-probe')).toBe('kept');
    expect(document.head.querySelector('style[data-mp-light-styles="input-group"]')).not.toBeNull();
  });

  it('sizes through the group class, never an attribute on the children, and keeps consumer classes', () => {
    const el = mount('<mp-input-group class="mine" size="sm"><select class="form-select"></select></mp-input-group>');
    expect(el.className).toBe('mine input-group input-group-sm');
    el.size = 'lg';
    expect(el.className).toBe('mine input-group input-group-lg');
    el.size = 'md';
    expect(el.className).toBe('mine input-group');
    expect(el.querySelector('select')?.hasAttribute('size')).toBe(false);
  });

  it('is a group only once named, and keeps a consumer role', () => {
    const el = mount('<mp-input-group></mp-input-group>');
    expect(el.hasAttribute('role')).toBe(false);
    el.setAttribute('aria-label', 'Amount');
    expect(el.getAttribute('role')).toBe('group');
    el.removeAttribute('aria-label');
    expect(el.hasAttribute('role')).toBe(false);

    const own = mount('<mp-input-group role="toolbar" aria-label="Tools"></mp-input-group>');
    expect(own.getAttribute('role')).toBe('toolbar');
  });
});
