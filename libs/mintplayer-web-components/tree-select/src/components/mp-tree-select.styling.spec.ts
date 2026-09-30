import { afterEach, describe, expect, it } from 'vitest';
import './mp-tree-select';
import type { MpTreeSelect } from './mp-tree-select';
import { InMemoryTreeSelectProvider } from '../providers/in-memory-provider';

/**
 * The no-inline-styles contract: the caret icon and the panel body are
 * styled by the component's stylesheet, and the panel's max height travels as
 * a host custom property that stylesheet reads.
 */

const MAX_HEIGHT = '--mp-tree-select-panel-max-height';

async function mount(setup: (el: MpTreeSelect) => void = () => undefined): Promise<MpTreeSelect> {
  const el = document.createElement('mp-tree-select') as MpTreeSelect;
  el.provider = new InMemoryTreeSelectProvider([]);
  setup(el);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const q = (el: MpTreeSelect, selector: string) =>
  (el.renderRoot as unknown as ParentNode).querySelector<HTMLElement>(selector);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-tree-select — styling without inline styles', () => {
  it.each(['textbox', 'button'] as const)('the %s caret icon is class-styled and scoped', async (variant) => {
    const el = await mount((e) => (e.variant = variant));
    const icon = q(el, '.ts-caret .ts-caret-icon')!;
    expect(icon.hasAttribute('style')).toBe(false);
    expect(icon.getAttribute('data-mps')).toBe('tree-select');
    expect(icon.querySelector('svg')).not.toBeNull();
  });

  it('the panel body carries no inline style', async () => {
    const el = await mount((e) => (e.panelScrollHeight = '120px'));
    expect(q(el, '.ts-panel-body')!.hasAttribute('style')).toBe(false);
  });

  it('the panel max height reaches the stylesheet as a host custom property', async () => {
    const el = await mount((e) => (e.panelScrollHeight = '120px'));
    expect(el.style.getPropertyValue(MAX_HEIGHT)).toBe('120px');
    el.panelScrollHeight = '50vh';
    expect(el.style.getPropertyValue(MAX_HEIGHT)).toBe('50vh');
  });

  it('the scroll-height attribute sets it, and removing it restores 300px', async () => {
    const el = await mount();
    el.setAttribute('scroll-height', '200px');
    expect(el.panelScrollHeight).toBe('200px');
    expect(el.style.getPropertyValue(MAX_HEIGHT)).toBe('200px');
    el.removeAttribute('scroll-height');
    expect(el.style.getPropertyValue(MAX_HEIGHT)).toBe('300px');
  });

  it('an empty value falls back to 300px', async () => {
    const el = await mount((e) => (e.panelScrollHeight = ''));
    expect(el.panelScrollHeight).toBe('300px');
    expect(el.style.getPropertyValue(MAX_HEIGHT)).toBe('300px');
  });

  it('declares no custom property until a height is set, so the stylesheet default applies', async () => {
    const el = await mount();
    expect(el.style.getPropertyValue(MAX_HEIGHT)).toBe('');
  });
});
