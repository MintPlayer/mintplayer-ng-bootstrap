import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  BsRibbon,
  BsRibbonButton,
  BsRibbonCheckBox,
  BsRibbonColorPicker,
  BsRibbonComboBox,
  BsRibbonContextualTabSet,
  BsRibbonDropdownButton,
  BsRibbonGallery,
  BsRibbonGalleryItem,
  BsRibbonGroup,
  BsRibbonGroupButton,
  BsRibbonMenuItem,
  BsRibbonMenuSeparator,
  BsRibbonSplitButton,
  BsRibbonTab,
  BsRibbonTemplateItem,
  BsRibbonToggleButton,
  BsQuickAccessToolbar,
} from '@mintplayer/react-bootstrap/ribbon';

import { emit, renderEl } from './harness';

/**
 * `BsRibbon.tsx` is 20 `createComponent` calls and nothing else, so the only
 * thing that can be wrong in it is a *name*: the DOM event string on the left
 * of the `events` map, and the tag it is bound to. Both are strings the
 * compiler never checks against the element, and both fail silently — the
 * ribbon renders, the button clicks, and the consumer's handler is simply
 * never called.
 *
 * Each case below dispatches the event the web component really dispatches and
 * asserts the React prop fires with that event's detail intact.
 */

interface EventCase {
  name: string;
  tag: string;
  /** The DOM event name the web component dispatches. */
  event: string;
  /** The React prop it must arrive on. */
  prop: string;
  detail: Record<string, unknown>;
  render: (props: Record<string, unknown>) => React.ReactElement;
}

const CASES: EventCase[] = [
  {
    name: 'BsRibbon',
    tag: 'mp-ribbon',
    event: 'tab-change',
    prop: 'onTabChange',
    detail: { tabId: 'home', index: 0 },
    render: (p) => <BsRibbon {...p} />,
  },
  {
    name: 'BsRibbon',
    tag: 'mp-ribbon',
    event: 'minimize-toggle',
    prop: 'onMinimizeToggle',
    detail: { minimized: true },
    render: (p) => <BsRibbon {...p} />,
  },
  {
    name: 'BsRibbonContextualTabSet',
    tag: 'mp-ribbon-contextual-tab-set',
    event: 'contextual-visibility-change',
    prop: 'onContextualVisibilityChange',
    detail: { hidden: false, label: 'Table Tools' },
    render: (p) => <BsRibbonContextualTabSet {...p} />,
  },
  {
    name: 'BsRibbonGroup',
    tag: 'mp-ribbon-group',
    event: 'dialog-launcher-click',
    prop: 'onDialogLauncherClick',
    detail: { groupId: 'font' },
    render: (p) => <BsRibbonGroup {...p} />,
  },
  {
    name: 'BsRibbonButton',
    tag: 'mp-ribbon-button',
    event: 'item-click',
    prop: 'onItemClick',
    detail: { itemId: 'bold' },
    render: (p) => <BsRibbonButton {...p} />,
  },
  {
    name: 'BsRibbonSplitButton',
    tag: 'mp-ribbon-split-button',
    event: 'main-action',
    prop: 'onMainAction',
    detail: { itemId: 'paste' },
    render: (p) => <BsRibbonSplitButton {...p} />,
  },
  {
    name: 'BsRibbonSplitButton',
    tag: 'mp-ribbon-split-button',
    event: 'menu-toggle',
    prop: 'onMenuToggle',
    detail: { itemId: 'paste', open: true },
    render: (p) => <BsRibbonSplitButton {...p} />,
  },
  {
    name: 'BsRibbonDropdownButton',
    tag: 'mp-ribbon-dropdown-button',
    event: 'menu-toggle',
    prop: 'onMenuToggle',
    detail: { itemId: 'styles', open: false },
    render: (p) => <BsRibbonDropdownButton {...p} />,
  },
  {
    name: 'BsRibbonMenuItem',
    tag: 'mp-ribbon-menu-item',
    event: 'menu-select',
    prop: 'onMenuSelect',
    detail: { itemId: 'keep-source' },
    render: (p) => <BsRibbonMenuItem {...p} />,
  },
  {
    name: 'BsRibbonToggleButton',
    tag: 'mp-ribbon-toggle-button',
    event: 'toggle',
    prop: 'onToggle',
    detail: { itemId: 'italic', pressed: true },
    render: (p) => <BsRibbonToggleButton {...p} />,
  },
  {
    name: 'BsRibbonCheckBox',
    tag: 'mp-ribbon-checkbox',
    event: 'check-change',
    prop: 'onCheckChange',
    detail: { itemId: 'gridlines', checked: true },
    render: (p) => <BsRibbonCheckBox {...p} />,
  },
  {
    name: 'BsRibbonComboBox',
    tag: 'mp-ribbon-combobox',
    event: 'value-change',
    prop: 'onValueChange',
    detail: { itemId: 'font-size', value: 14 },
    render: (p) => <BsRibbonComboBox {...p} />,
  },
  {
    name: 'BsRibbonColorPicker',
    tag: 'mp-ribbon-color-picker',
    event: 'color-change',
    prop: 'onColorChange',
    detail: { itemId: 'fill', color: '#ff0000' },
    render: (p) => <BsRibbonColorPicker {...p} />,
  },
  {
    name: 'BsRibbonGroupButton',
    tag: 'mp-ribbon-group-button',
    event: 'group-select',
    prop: 'onGroupSelect',
    detail: { itemId: 'align', value: 'left' },
    render: (p) => <BsRibbonGroupButton {...p} />,
  },
  {
    name: 'BsRibbonGalleryItem',
    tag: 'mp-ribbon-gallery-item',
    event: 'gallery-select',
    prop: 'onGallerySelect',
    detail: { itemId: 'style-3' },
    render: (p) => <BsRibbonGalleryItem {...p} />,
  },
];

describe('BsRibbon — event name mapping', () => {
  describe.each(CASES)('$name $event', (entry) => {
    it(`arrives on ${entry.prop} with its detail`, async () => {
      const seen: CustomEvent[] = [];
      const el = await renderEl(
        entry.render({ [entry.prop]: (e: CustomEvent) => seen.push(e) }),
        entry.tag,
      );

      await emit(el, entry.event, entry.detail);

      // `some`, not `[0]`: a few of these elements announce their own initial
      // state through the same event during their first update, so the handler
      // legitimately sees more than the one this test dispatched.
      const mine = seen.filter((e) => e.detail === entry.detail);
      expect(mine, `${entry.event} never reached ${entry.prop}`).toHaveLength(1);
      expect(mine[0].detail).toEqual(entry.detail);
    });

    // A handler bound to the wrong element would still fire if the event were
    // simply re-broadcast; asserting the target pins it to the right one.
    it('fires from the element the wrapper rendered', async () => {
      const seen: Event[] = [];
      const el = await renderEl(
        entry.render({ [entry.prop]: (e: Event) => seen.push(e) }),
        entry.tag,
      );

      await emit(el, entry.event, entry.detail);

      expect(seen.find((e) => (e as CustomEvent).detail === entry.detail)?.target).toBe(el);
    });
  });

  // The five elements with no `events` map still have a tag name that can be
  // wrong, and a typo there renders an inert unknown element rather than failing.
  it.each([
    ['BsQuickAccessToolbar', 'mp-quick-access-toolbar', <BsQuickAccessToolbar />],
    ['BsRibbonTab', 'mp-ribbon-tab', <BsRibbonTab />],
    ['BsRibbonMenuSeparator', 'mp-ribbon-menu-separator', <BsRibbonMenuSeparator />],
    ['BsRibbonGallery', 'mp-ribbon-gallery', <BsRibbonGallery />],
    ['BsRibbonTemplateItem', 'mp-ribbon-template-item', <BsRibbonTemplateItem />],
  ] as const)('%s renders <%s>', async (_name, tag, node) => {
    const el = await renderEl(node, tag);
    expect(el.tagName).toBe(tag.toUpperCase());
    // An unregistered tag stays an HTMLElement; a registered one upgrades.
    expect(customElements.get(tag)).toBeDefined();
  });

  // Every event the ribbon family exposes has a case. Raising this number
  // without adding one is the regression it guards against.
  it('covers every mapped ribbon event', () => {
    expect(CASES).toHaveLength(15);
  });
});
