import { contentFlag, defineCore, type CoreBag, type ContentChild } from '@mintplayer/ui-core/component';
import {
  connectTabControl,
  resolveActiveTab,
  tabControlChanged,
  tabControlKeydown,
  tabControlTabClick,
  tabControlTabs,
  type TabControlView,
  type TabState,
  type TabsPosition,
} from './tab-control';

/**
 * The tab control as a D10 group (#458 M4). The markup contract, the active-tab
 * resolution and the keyboard stay in `tab-control.ts`; this core adds the
 * inputs, the two-way `activeTab` and the delegated listeners.
 *
 * Each `tab-page` is a declaration (#458 Q15): it renders nothing, and the
 * control renders its `header` slot inside the strip's `<label>` and its body
 * inside the pane, because the CSS pairs the n-th radio with the n-th tab and
 * pane as siblings. That is also why a rich header survives server rendering.
 */

export interface TabPageInputs {
  /** The page's identity in `activeTab`; defaults to its position (`'0'`, `'1'`, …). */
  tabId: string | null;
  disabled: boolean;
}

export interface TabControlInputs {
  /** The shown page's `tabId` (or position); two-way. Null: the first enabled page, with `selectFirstTab`. */
  activeTab: string | null;
  /** Draw the outline around the active pane. */
  border: boolean;
  /** Show the first enabled page while none is active. */
  selectFirstTab: boolean;
  tabsPosition: TabsPosition;
  /** The `tab-page`s in the content (a content query). */
  pages: readonly ContentChild[];
}

export interface TabControlEntry {
  readonly key: string;
  readonly radio: CoreBag;
  readonly checked: boolean;
  readonly tab: CoreBag;
  readonly pane: CoreBag;
}

export interface TabControlComponentView extends Omit<TabControlView, 'tabs'> {
  /** The strip renders after the panes. */
  readonly bottom: boolean;
  readonly entries: readonly TabControlEntry[];
}

/** Each page's identity: its `tabId`, else its position. */
export function tabPageKeys(pages: readonly ContentChild[]): string[] {
  return pages.map((page, index) => {
    const tabId = page.inputs['tabId'];
    return typeof tabId === 'string' && tabId !== '' ? tabId : String(index);
  });
}

function tabStates(pages: readonly ContentChild[]): TabState[] {
  return pages.map((page) => ({ disabled: contentFlag(page.inputs['disabled']) }));
}

/** The shown page's position, from the requested key. */
export function activeTabIndex(inputs: Pick<TabControlInputs, 'pages' | 'selectFirstTab'>, activeTab: string | null): number | null {
  const requested = activeTab === null ? -1 : tabPageKeys(inputs.pages).indexOf(activeTab);
  return resolveActiveTab(tabStates(inputs.pages), requested < 0 ? null : requested, inputs.selectFirstTab);
}

export const tabControlCore = defineCore<
  TabControlInputs,
  { activeTab: string | null },
  { view: TabControlComponentView },
  { activeTabChange: string }
>({
  state: (inputs) => ({ activeTab: inputs.activeTab }),
  view: ({ inputs, state, id, hydrated }) => {
    const keys = tabPageKeys(inputs.pages);
    const active = activeTabIndex(inputs, state.activeTab);
    const { tabs, ...view } = connectTabControl(
      { id, tabsPosition: inputs.tabsPosition, border: inputs.border, enhanced: hydrated },
      tabStates(inputs.pages),
      active,
    );
    return {
      view: {
        ...view,
        bottom: inputs.tabsPosition === 'bottom',
        entries: tabs.map((tab, index) => ({
          key: keys[index],
          // The attribute, so the server-rendered page shows the selection; the template binds the property live.
          radio: { ...tab.radio, checked: index === active },
          checked: index === active,
          tab: tab.tab,
          pane: tab.pane,
        })),
      },
    };
  },
  attach: (api) => {
    const root = api.host;
    const select = (index: number | null) => {
      if (index === null) return;
      const { pages } = api.inputs();
      if (!pages[index] || contentFlag(pages[index].inputs['disabled'])) return;
      const key = tabPageKeys(pages)[index];
      if (key === api.state().activeTab) return;
      api.setState({ activeTab: key });
    };
    const tabIndex = (event: Event) => {
      const label = (event.target as Element | null)?.closest?.('label.nav-link');
      return label ? tabControlTabs(root).indexOf(label as HTMLElement) : -1;
    };
    // The labels are the tabs once hydrated: the core selects, the label does not forward to its radio.
    const onClick = (event: MouseEvent) => {
      const index = tabIndex(event);
      if (index < 0) return;
      if (tabControlTabClick(event, contentFlag(api.inputs().pages[index]?.inputs['disabled']))) select(index);
    };
    const onKeydown = (event: KeyboardEvent) => {
      const index = tabIndex(event);
      if (index >= 0) select(tabControlKeydown(root, event, index, tabStates(api.inputs().pages)));
    };
    // A radio still changes before the labels took over (or on a page whose script is late).
    const onChange = (event: Event) => select(tabControlChanged(root, event));
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('change', onChange);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('change', onChange);
    };
  },
  inputsChanged: (api, prev) => {
    const next = api.inputs().activeTab;
    if (next !== prev.activeTab) api.setState({ activeTab: next });
  },
});
