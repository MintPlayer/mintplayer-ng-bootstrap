import { firstEnabledIndex, rovingTarget } from '@mintplayer/ui-core/roving';

/**
 * The tab control has no machine (PRD #437 §8, wave A): one native radio per
 * tab IS the selection, so it works with JavaScript off. The page's CSS shows
 * the pane and paints the tab whose radio is `:checked`, and each tab is a
 * `<label for>` its radio. What the fronts share is the markup contract (ids,
 * classes, ARIA), the active-tab resolution and the keyboard.
 *
 * Markup (every front renders the same):
 *
 *   <div class="tab-control" [data-tabs-position=bottom]>
 *     <input type=radio class="tab-radio" name id checked …>   one per tab, first
 *     <div class="tsc">                                          after the panes when bottom
 *       <ul class="nav nav-tabs">
 *         <li class="nav-item"><label class="nav-link" for id>…header…</label></li>
 *       </ul>
 *     </div>
 *     <div class="tab-content"><div class="tab-pane" id>…page…</div> …</div>
 *   </div>
 *
 * Two semantic tiers over one tree, so server and client DOM are identical
 * and only attributes change at hydration:
 *
 * - **Not enhanced** (the server HTML, and JS off): the radios are the
 *   controls. Clipped, never `display:none`, so Tab reaches them and the
 *   native radio group gives arrow-key switching and a live checked state;
 *   the label names each one. No `role="tab"`: a static `aria-selected` would
 *   lie after the first switch. Panes are `region`s named by their label.
 * - **Enhanced** (the front sets it once it is interactive): the radios are
 *   `hidden` (out of the tab order and the accessibility tree; `:checked`
 *   still drives the CSS) and the labels become the APG tabs, with a roving
 *   tabindex, `aria-selected` and `tabpanel`s. Clicks and keys go through the
 *   front, which writes `checked` from its model.
 */

export type TabControlBag = Record<string, string | boolean | null>;

export const TAB_CONTROL_SCOPE = 'tab-control';

export type TabsPosition = 'top' | 'bottom';

export interface TabControlOptions {
  /** Root id from the front, so server and client agree on every IDREF and on the group name. */
  readonly id: string;
  readonly tabsPosition?: TabsPosition;
  /** Draw the outline around the active pane. Default true. */
  readonly border?: boolean;
  /** The front is interactive: switch from the radio tier to the tab tier. */
  readonly enhanced?: boolean;
}

export interface TabState {
  readonly disabled?: boolean;
}

export interface TabView {
  /** The radio. `checked` is not in the bag: each front binds the live property (and the attribute, for SSR). */
  readonly radio: TabControlBag;
  readonly tab: TabControlBag;
  readonly pane: TabControlBag;
}

export interface TabControlView {
  readonly root: TabControlBag;
  readonly strip: TabControlBag;
  readonly list: TabControlBag;
  readonly item: TabControlBag;
  readonly content: TabControlBag;
  readonly tabs: readonly TabView[];
}

const scope = { 'data-mps': TAB_CONTROL_SCOPE };

export function tabControlIds(rootId: string, index: number): { readonly radio: string; readonly tab: string; readonly pane: string } {
  return { radio: `${rootId}-r${index}`, tab: `${rootId}-t${index}`, pane: `${rootId}-p${index}` };
}

/**
 * The tab that is shown: the requested one when it exists and is enabled,
 * otherwise (with `selectFirstTab`) the first enabled tab, otherwise none.
 */
export function resolveActiveTab(tabs: readonly TabState[], requested: number | null, selectFirstTab = true): number | null {
  if (requested !== null && requested >= 0 && requested < tabs.length && !tabs[requested].disabled) return requested;
  if (!selectFirstTab) return null;
  const first = firstEnabledIndex(tabs.length, (index) => !!tabs[index].disabled);
  return first < 0 ? null : first;
}

export function connectTabControl(options: TabControlOptions, tabs: readonly TabState[], active: number | null): TabControlView {
  const enhanced = options.enhanced ?? false;
  const bottom = options.tabsPosition === 'bottom';
  const border = options.border ?? true;
  return {
    root: { ...scope, class: 'tab-control', 'data-tabs-position': bottom ? 'bottom' : null },
    strip: { ...scope, class: bottom ? 'tsc bottom-tabs' : 'tsc' },
    // Not enhanced, the strip (which scrolls when the tabs overflow) holds only
    // labels: a tab stop of its own is the keyboard's way to scroll it.
    list: { ...scope, class: 'nav nav-tabs', role: enhanced ? 'tablist' : null, tabindex: enhanced ? null : '0' },
    item: { ...scope, class: 'nav-item', role: enhanced ? 'presentation' : null },
    content: {
      ...scope,
      class: `tab-content${border ? (active === null ? ' border-top' : ' border') : ''}`,
    },
    tabs: tabs.map((tab, index) => {
      const ids = tabControlIds(options.id, index);
      const disabled = tab.disabled ?? false;
      const selected = index === active;
      return {
        radio: {
          ...scope,
          type: 'radio',
          class: 'tab-radio',
          name: `${options.id}-group`,
          id: ids.radio,
          disabled,
          hidden: enhanced,
          'aria-controls': enhanced ? null : ids.pane,
        },
        tab: {
          ...scope,
          id: ids.tab,
          for: ids.radio,
          class: `nav-link text-nowrap${disabled ? ' disabled' : ''}`,
          role: enhanced ? 'tab' : null,
          tabindex: enhanced ? (selected && !disabled ? '0' : '-1') : null,
          'aria-selected': enhanced ? (selected ? 'true' : 'false') : null,
          'aria-controls': enhanced ? ids.pane : null,
          'aria-disabled': enhanced && disabled ? 'true' : null,
        },
        pane: {
          ...scope,
          id: ids.pane,
          class: 'tab-pane',
          role: enhanced ? 'tabpanel' : 'region',
          'aria-labelledby': ids.tab,
          tabindex: enhanced ? '0' : null,
        },
      };
    }),
  };
}

/**
 * A tab's keydown in the enhanced tier: Left/Right move (wrapping, skipping
 * disabled tabs, mirrored under rtl) and Home/End go to the ends, each moving
 * focus and selection together (automatic activation); Enter/Space select.
 * Returns the tab to select, or `null` when the key is not one of these.
 */
export function tabControlKeyTarget(
  key: string,
  index: number,
  tabs: readonly TabState[],
  modifiers: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; rtl?: boolean } = {},
): number | null {
  if (modifiers.altKey || modifiers.ctrlKey || modifiers.metaKey) return null;
  if (key === 'Enter' || key === ' ') return tabs[index]?.disabled ? null : index;
  return rovingTarget(
    key,
    { count: tabs.length, from: index, orientation: 'horizontal', wrap: true, rtl: modifiers.rtl, isDisabled: (i) => !!tabs[i].disabled },
    modifiers,
  );
}

/**
 * A tab's keydown, applied to the DOM: consumes the key, focuses the target
 * tab, and returns the index the front must select (or `null`).
 */
export function tabControlKeydown(root: Element, event: KeyboardEvent, index: number, tabs: readonly TabState[]): number | null {
  const rtl = getComputedStyle(root).direction === 'rtl';
  const target = tabControlKeyTarget(event.key, index, tabs, { altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, rtl });
  if (target === null) return null;
  event.preventDefault();
  tabControlTabs(root)[target]?.focus();
  return target;
}

/** The control's own tabs: never a nested tab control's. */
export function tabControlTabs(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(':scope > .tsc > ul > li > label.nav-link'));
}

/**
 * A tab's click in the enhanced tier: the front selects from its model and
 * writes `checked` itself, so the label's own forwarding to the (hidden)
 * radio is cancelled. Returns whether the tab may be selected.
 */
export function tabControlTabClick(event: Event, disabled: boolean): boolean {
  event.preventDefault();
  return !disabled;
}

/**
 * The radios' `change` (the not-enhanced tier, before hydration finishes or
 * on a page whose script failed): the index of the radio that became checked,
 * or `null` when it belongs to a nested tab control.
 */
export function tabControlChanged(root: Element, event: Event): number | null {
  const radios = Array.from(root.querySelectorAll<HTMLInputElement>(':scope > input.tab-radio'));
  const index = radios.indexOf(event.target as HTMLInputElement);
  return index < 0 ? null : index;
}
