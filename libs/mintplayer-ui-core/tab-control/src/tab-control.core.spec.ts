import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { activeTabIndex, tabControlCore, tabPageKeys, type TabControlComponentView, type TabControlInputs } from './tab-control.core';

afterEach(() => document.body.replaceChildren());

const page = (tabId: string | null, disabled: unknown = false) => ({ inputs: { tabId, disabled }, within: null });
const pages = [page('a'), page(null), page('c', true), page('d')];

const inputs = (o: Partial<TabControlInputs> = {}): TabControlInputs => ({
  activeTab: null,
  border: true,
  selectFirstTab: true,
  tabsPosition: 'top',
  pages,
  ...o,
});

function mount(o: Partial<TabControlInputs> = {}) {
  const markup = ({ view }: { view: TabControlComponentView }, host: HTMLElement) => {
    applyBag(host, view.root);
    return [
      ...view.entries.map((e) => el('input', { ...e.radio, class: 'tab-radio' })),
      el('div', view.strip, el('ul', view.list, ...view.entries.map((e) => el('li', view.item, el('label', { ...e.tab, class: 'nav-link' }, e.key))))),
      el('div', view.content, ...view.entries.map((e) => el('div', e.pane))),
    ];
  };
  const h = hostCore(tabControlCore, inputs(o), { markup });
  h.attach();
  const tab = (i: number) => h.host.querySelectorAll<HTMLElement>('label.nav-link')[i];
  const radio = (i: number) => h.host.querySelectorAll<HTMLInputElement>('input.tab-radio')[i];
  return { ...h, tab, radio };
}

describe('tab control helpers', () => {
  it('keys pages by tabId, else by position, and resolves the active one', () => {
    expect(tabPageKeys(pages)).toEqual(['a', '1', 'c', 'd']);
    expect(activeTabIndex({ pages, selectFirstTab: true }, 'zzz')).toBe(0);
    expect(activeTabIndex({ pages, selectFirstTab: false }, null)).toBeNull();
    expect(activeTabIndex({ pages, selectFirstTab: false }, 'd')).toBe(3);
  });
});

describe('tabControlCore', () => {
  it('renders the first tab selected, at the bottom when asked', () => {
    const h = mount({ tabsPosition: 'bottom' });
    expect(h.props().view.bottom).toBe(true);
    expect(h.props().view.entries.map((e) => e.checked)).toEqual([true, false, false, false]);
    expect(h.props().view.entries[0].radio['checked']).toBe(true);
  });

  it('selects a clicked tab, never a disabled one, and ignores the current one', () => {
    const h = mount();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    h.tab(1).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(h.state().activeTab).toBe('1');
    h.tab(1).click();
    h.tab(2).click();
    h.host.click();
    expect(h.events('activeTabChange')).toEqual(['1']);
  });

  it('moves between tabs with the arrow keys, skipping disabled ones', () => {
    const h = mount({ activeTab: '1' });
    h.tab(1).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(h.state().activeTab).toBe('d');
    expect(document.activeElement).toBe(h.tab(3));
    h.tab(3).dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }));
    h.host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(h.events('activeTabChange')).toEqual(['d']);
  });

  it('follows a radio changed before the labels took over, and the consumer’s tab', () => {
    const h = mount();
    h.radio(3).checked = true;
    h.radio(3).dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().activeTab).toBe('d');
    h.host.appendChild(el('input')).dispatchEvent(new Event('change', { bubbles: true }));
    h.setInputs({ activeTab: 'a' });
    h.setInputs({ border: false });
    expect(h.state().activeTab).toBe('a');
    // A page that disappeared cannot be selected.
    h.setInputs({ pages: [page('a')] });
    h.radio(0).dispatchEvent(new Event('change', { bubbles: true }));
    h.dispose();
  });
});
