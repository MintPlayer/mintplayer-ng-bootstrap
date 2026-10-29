import { describe, expect, it } from 'vitest';
import {
  connectTabControl,
  resolveActiveTab,
  tabControlChanged,
  tabControlKeyTarget,
  tabControlTabs,
} from './tab-control';

const three = [{}, {}, { disabled: true }];

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'tab-control';
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

describe('tab-control core', () => {
  it('resolves the requested tab, else the first enabled one', () => {
    expect(resolveActiveTab(three, 1)).toBe(1);
    expect(resolveActiveTab(three, 2)).toBe(0);
    expect(resolveActiveTab(three, null)).toBe(0);
    expect(resolveActiveTab(three, null, false)).toBeNull();
    expect(resolveActiveTab([{ disabled: true }], null)).toBeNull();
  });

  it('ships the radio tier until enhanced: focusable radios, region panes, no tab roles', () => {
    const view = connectTabControl({ id: 'c' }, three, 0);
    expect(view.tabs[1].radio).toMatchObject({ type: 'radio', name: 'c-group', id: 'c-r1', hidden: false, 'aria-controls': 'c-p1' });
    expect(view.tabs[1].tab).toMatchObject({ id: 'c-t1', for: 'c-r1', role: null, 'aria-selected': null, tabindex: null });
    expect(view.tabs[1].pane).toMatchObject({ id: 'c-p1', role: 'region', 'aria-labelledby': 'c-t1' });
    expect(view.list['role']).toBeNull();
    // The strip scrolls when the tabs overflow, and holds no focusable content (axe scrollable-region-focusable).
    expect(view.list['tabindex']).toBe('0');
    expect(view.tabs[2].radio['disabled']).toBe(true);
  });

  it('switches to APG tabs when enhanced', () => {
    const view = connectTabControl({ id: 'c', enhanced: true }, three, 1);
    expect(view.list['role']).toBe('tablist');
    expect(view.list['tabindex']).toBeNull(); // the tabs carry the roving stop
    expect(view.item['role']).toBe('presentation');
    expect(view.tabs.map((tab) => tab.tab['aria-selected'])).toEqual(['false', 'true', 'false']);
    expect(view.tabs.map((tab) => tab.tab['tabindex'])).toEqual(['-1', '0', '-1']);
    expect(view.tabs[2].tab['aria-disabled']).toBe('true');
    expect(view.tabs[0].tab['aria-controls']).toBe('c-p0');
    expect(view.tabs[0].radio).toMatchObject({ hidden: true, 'aria-controls': null });
    expect(view.tabs[0].pane).toMatchObject({ role: 'tabpanel', tabindex: '0' });
  });

  it('places and borders the strip from the options', () => {
    const view = connectTabControl({ id: 'c', tabsPosition: 'bottom' }, three, 0);
    expect(view.strip['class']).toBe('tsc bottom-tabs');
    expect(view.root['data-tabs-position']).toBe('bottom');
    expect(view.content['class']).toBe('tab-content border');
    expect(connectTabControl({ id: 'c' }, three, null).content['class']).toBe('tab-content border-top');
    expect(connectTabControl({ id: 'c', border: false }, three, 0).content['class']).toBe('tab-content');
  });

  it('moves with the arrow keys, wrapping and skipping disabled tabs', () => {
    expect(tabControlKeyTarget('ArrowRight', 1, three)).toBe(0);
    expect(tabControlKeyTarget('ArrowLeft', 0, three)).toBe(1);
    expect(tabControlKeyTarget('ArrowRight', 0, three, { rtl: true })).toBe(1);
    expect(tabControlKeyTarget('End', 0, three)).toBe(1);
    expect(tabControlKeyTarget('Home', 1, three)).toBe(0);
    expect(tabControlKeyTarget('Enter', 1, three)).toBe(1);
    expect(tabControlKeyTarget('ArrowRight', 0, three, { ctrlKey: true })).toBeNull();
    expect(tabControlKeyTarget('a', 0, three)).toBeNull();
  });

  it('finds only its own tabs and radios, never a nested control', () => {
    const root = mount(
      '<input type="radio" class="tab-radio"><input type="radio" class="tab-radio">'
      + '<div class="tsc"><ul><li><label class="nav-link"></label></li><li><label class="nav-link"></label></li></ul></div>'
      + '<div class="tab-content"><div class="tab-pane"><div class="tab-control"><input type="radio" class="tab-radio" id="inner"></div></div></div>',
    );
    expect(tabControlTabs(root)).toHaveLength(2);
    const radios = root.querySelectorAll(':scope > input');
    expect(tabControlChanged(root, { target: radios[1] } as unknown as Event)).toBe(1);
    expect(tabControlChanged(root, { target: root.querySelector('#inner') } as unknown as Event)).toBeNull();
    root.remove();
  });
});
