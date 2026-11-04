import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { dismissStack } from '@mintplayer/ui-core/overlay';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import { computeOverflowIds, computeOverflowOrder } from './overflow';
import { isClosingActivation } from './overflow-activation';

/**
 * A priority navigation (#458 M7): a horizontal strip that keeps as many items visible as fit and
 * moves the rest, least important first, into a "More" disclosure.
 *
 *   <nav class="priority-nav" aria-label=<label> data-priority-nav=<id>>
 *     [no JS: <input type=checkbox class="priority-nav-more-checkbox" id=<id>-more aria-controls=<id>-overflow>]
 *     [JS: <div class="priority-nav-measure-wrapper" aria-hidden="true" inert> every item, measured </div>]
 *     <div class="priority-nav-strip">
 *       <span class="priority-nav-item [priority-nav-hidden]"> item </span> …
 *       [no JS: <label for=<id>-more class="priority-nav-more-toggle">More ▾</label>]
 *       [JS: <span class="priority-nav-more-slot"><button aria-expanded aria-controls=<id>-overflow>More ▾</button></span>]
 *     </div>
 *     <div id=<id>-overflow class="priority-nav-overflow [priority-nav-overflow-open]"> the same items </div>
 *   </nav>
 *
 * The items are data (`items`); the consumer renders each one through the `itemTemplate` slot,
 * which every front renders once per place (measure strip, strip, overflow), or gets a plain link
 * from the item's `label` and `href`. A LOWER `priority` is more important; an item without one
 * overflows first. The overflow is measured: every item's width in an inert measure strip, the
 * strip's width and gap, the More toggle's width. `collapseAt` moves everything into More below a
 * breakpoint.
 *
 * The overflow is a disclosure (APG disclosure navigation), not a menu: activating a link or a
 * button in it closes it and gives focus back to More; Escape and a click outside close it too.
 *
 * No-JS tier 1: the server renders a clipped checkbox as the disclosure control and a `<label>`
 * as its skin; items hide below their `hideBelow` breakpoint through media queries and show in
 * the overflow instead, which `:checked` reveals. Once hydrated the button takes over.
 */
export type PriorityNavBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface PriorityNavItem {
  /** Identifies the item across renders; also the measure strip's handle on it. */
  key: string | number;
  /** Lower is more important; null (or absent) overflows first. */
  priority?: number | null;
  /** Without JS, the item moves into the overflow below this breakpoint. */
  hideBelow?: PriorityNavBreakpoint | null;
  /** The default rendering's text (when no `itemTemplate` is given). */
  label?: string;
  /** The default rendering's link. */
  href?: string;
  /** Anything else the consumer's template needs. */
  [data: string]: unknown;
}

export interface PriorityNavInputs {
  items: readonly PriorityNavItem[];
  moreLabel: string;
  /** Below this breakpoint every item is in the overflow. */
  collapseAt: PriorityNavBreakpoint | null;
  /** Which end of the strip overflows first among items of equal priority. */
  overflowFrom: 'start' | 'end';
  /** Hides the More toggle while nothing overflows. */
  hideEmptyMore: boolean;
  /** Names the navigation landmark; a consumer `aria-label` wins. */
  label: string;
}

export interface PriorityNavState {
  /** Keys (as strings) of the items in the overflow. */
  overflowing: readonly string[];
  open: boolean;
  /** The More toggle's measured width, for the host's min-width. */
  moreWidth: number | null;
}

export interface PriorityNavRow {
  key: string;
  item: PriorityNavItem;
  measure: CoreBag;
  inline: CoreBag;
  overflow: CoreBag;
  /** The default rendering: a plain link. */
  link: CoreBag;
  /** The default link's target. */
  href: string | undefined;
}

export interface PriorityNavView {
  root: CoreBag;
  css: string | null;
  cssName: string;
  checkbox: CoreBag | null;
  measure: CoreBag | null;
  strip: CoreBag;
  rows: PriorityNavRow[];
  noscriptToggle: CoreBag | null;
  moreSlot: CoreBag | null;
  more: CoreBag | null;
  open: boolean;
  moreLabel: string;
  overflow: CoreBag;
}

const ROOT_ATTR = 'data-priority-nav';
/** Marks a measured item; its value is the item's key. */
export const PRIORITY_NAV_MEASURE_ATTR = 'data-priority-measure';
const STRIP_ATTR = 'data-priority-strip';
const MORE_SLOT_ATTR = 'data-priority-more';
const MORE_ATTR = 'data-priority-toggle';
const OVERFLOW_ATTR = 'data-priority-overflow';

export const PRIORITY_NAV_BREAKPOINTS: Record<PriorityNavBreakpoint, number> = {
  xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400,
};

const keyOf = (item: PriorityNavItem) => String(item.key);

/** The host's min-width: never below the More toggle, so a shrink-wrapped nav can still collapse. */
export function moreWidthCss(id: string, width: number | null): string | null {
  return width === null ? null : `[${ROOT_ATTR}="${id}"]{--priority-nav-more-width:${width}px}`;
}

export function connectPriorityNav(
  inputs: PriorityNavInputs,
  state: PriorityNavState,
  id: string,
  hydrated: boolean,
  consumerLabel: string | null = null,
): PriorityNavView {
  const items = inputs.items ?? [];
  const overflowing = new Set(hydrated ? state.overflowing : []);
  const overflowId = `${id}-overflow`;
  const checkboxId = `${id}-more`;
  const open = hydrated && state.open;
  const showMore = !inputs.hideEmptyMore || overflowing.size > 0;
  const fullyCollapsed = items.length > 0 && overflowing.size === items.length;
  return {
    root: {
      class: hydrated ? 'priority-nav' : 'priority-nav noscript',
      'aria-label': consumerLabel ?? inputs.label,
      [ROOT_ATTR]: id,
      ...hydratedAttr(hydrated),
    },
    css: hydrated && items.length ? moreWidthCss(id, state.moreWidth) : null,
    cssName: `priority-nav-${id}`,
    // The checkbox IS the no-JS disclosure: clipped, never display:none, so Tab reaches it and
    // its checked state is a live expanded state (a static aria-expanded would lie).
    checkbox: hydrated ? null : { type: 'checkbox', id: checkboxId, class: 'priority-nav-more-checkbox', 'aria-controls': overflowId },
    // Inert, not just aria-hidden: the copies' links must be unreachable by Tab too. Measuring
    // needs geometry, which inert keeps (display:none would zero every width).
    measure: hydrated ? { class: 'priority-nav-measure-wrapper', 'aria-hidden': 'true', inert: '' } : null,
    strip: { class: 'priority-nav-strip', [STRIP_ATTR]: '' },
    rows: items.map((item) => {
      const key = keyOf(item);
      const below = item.hideBelow ? ` priority-nav-item-hide-below-${item.hideBelow}` : '';
      const out = overflowing.has(key);
      return {
        key,
        item,
        measure: { class: 'priority-nav-measure-item', [PRIORITY_NAV_MEASURE_ATTR]: key },
        inline: { class: `priority-nav-item${below}${out ? ' priority-nav-hidden' : ''}` },
        overflow: { class: `priority-nav-overflow-item${below}${hydrated && !out ? ' priority-nav-overflow-hidden' : ''}` },
        // href is a template binding: the bag setters refuse URL attributes.
        link: { class: 'priority-nav-link' },
        href: item.href,
      };
    }),
    noscriptToggle: hydrated ? null : { class: 'priority-nav-more-toggle priority-nav-more-toggle-noscript', for: checkboxId },
    // The slot is what gets measured: its box is the button's, padding and consumer CSS included.
    // With nothing to show it leaves the flow and turns invisible, but keeps its width.
    moreSlot: hydrated ? { class: `priority-nav-more-slot${showMore ? '' : ' priority-nav-more-slot-idle'}`, [MORE_SLOT_ATTR]: '' } : null,
    // A disclosure: aria-expanded, no aria-haspopup (the overflow is a list, not a menu).
    more: hydrated
      ? { type: 'button', class: 'priority-nav-more-toggle', 'aria-controls': overflowId, 'aria-expanded': open ? 'true' : 'false', [MORE_ATTR]: '' }
      : null,
    open,
    moreLabel: inputs.moreLabel,
    overflow: {
      id: overflowId,
      class: `priority-nav-overflow${open ? ' priority-nav-overflow-open' : ''}${hydrated && fullyCollapsed ? ' priority-nav-overflow-align-start' : ''}`,
      [OVERFLOW_ATTR]: '',
    },
  };
}

type PriorityNavEvents = { overflowChange: PriorityNavItem[] };

export const priorityNavCore = defineCore<PriorityNavInputs, PriorityNavState, { view: PriorityNavView }, PriorityNavEvents>({
  state: () => ({ overflowing: [], open: false, moreWidth: null }),
  view: ({ inputs, state, id, hydrated, label }) => ({ view: connectPriorityNav(inputs, state, id, hydrated, label) }),
  attach: (api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    const win = doc.defaultView;
    /** This nav's own element of a part, never a nested nav's. */
    const part = (attr: string) =>
      [...host.querySelectorAll<HTMLElement>(`[${attr}]`)].find((el) => el.closest(`[${ROOT_ATTR}]`) === host) ?? null;

    const measure = () => {
      const strip = part(STRIP_ATTR);
      if (!strip || !win) return;
      const inputs = api.inputs();
      const items = inputs.items ?? [];
      const slot = part(MORE_SLOT_ATTR);
      const moreWidth = slot ? slot.getBoundingClientRect().width : null;
      const style = win.getComputedStyle(strip);
      const gap = parseFloat(style.columnGap || style.gap || '0');
      const stripWidth = strip.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const widths = new Map(
        [...host.querySelectorAll<HTMLElement>(`[${PRIORITY_NAV_MEASURE_ATTR}]`)]
          .filter((el) => el.closest(`[${ROOT_ATTR}]`) === host)
          .map((el) => [el.getAttribute(PRIORITY_NAV_MEASURE_ATTR) ?? '', el.getBoundingClientRect().width] as const),
      );
      const breakpoint = inputs.collapseAt ? PRIORITY_NAV_BREAKPOINTS[inputs.collapseAt] : null;
      const collapsed = breakpoint !== null && win.innerWidth > 0 && win.innerWidth < breakpoint;
      const order = computeOverflowOrder(items.map((item) => ({ key: keyOf(item), priority: item.priority ?? null })), inputs.overflowFrom === 'end')
        .map(({ key }) => key);
      const ids = collapsed
        ? new Set(items.map(keyOf))
        : computeOverflowIds({ stripWidth, moreWidth: moreWidth ?? 0, gap: Number.isFinite(gap) ? gap : 0, widths, order });
      const overflowing = items.map(keyOf).filter((key) => ids.has(key));
      const state = api.state();
      const changed = overflowing.length !== state.overflowing.length || overflowing.some((key, i) => key !== state.overflowing[i]);
      if (changed || moreWidth !== state.moreWidth) api.setState({ overflowing, moreWidth });
      if (changed) api.emit('overflowChange', items.filter((item) => ids.has(keyOf(item))));
    };

    // Everything that can change a width: the host, the strip, the measured items (their row
    // grows with any of them) and the More slot. Re-observed after each render, since the
    // measure rows come and go with the items.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    const observe = () => {
      if (!observer) return;
      observer.disconnect();
      [host, part(STRIP_ATTR), part(MORE_SLOT_ATTR), part(PRIORITY_NAV_MEASURE_ATTR)?.parentElement ?? null]
        .filter((el): el is HTMLElement => !!el)
        .forEach((el) => observer.observe(el));
    };
    const settle = () => {
      observe();
      measure();
    };
    const frame = win?.requestAnimationFrame?.(settle);
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => settle());
    mutations?.observe(host, { childList: true, subtree: true });

    let token: symbol | null = null;
    const setOpen = (open: boolean) => {
      if (open === api.state().open) return;
      const panel = part(OVERFLOW_ATTR);
      const focusInPanel = !!panel && panel.contains(doc.activeElement);
      if (open) token = dismissStack.push('priority-nav');
      else if (token) {
        dismissStack.release(token);
        token = null;
      }
      api.setState({ open });
      // Closing hides the panel: focus in it goes back to More (an action that already moved
      // focus elsewhere, a dialog it opened, keeps it).
      if (!open && focusInPanel) part(MORE_ATTR)?.focus();
    };

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const toggle = target?.closest(`[${MORE_ATTR}]`);
      if (toggle && toggle.closest(`[${ROOT_ATTR}]`) === host) return setOpen(!api.state().open);
      const panel = part(OVERFLOW_ATTR);
      if (api.state().open && panel && isClosingActivation(event.composedPath(), panel)) setOpen(false);
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0 || !api.state().open) return;
      if (!host.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !api.state().open || !token || !dismissStack.isTop(token)) return;
      setOpen(false);
    };
    const onResize = () => measure();

    host.addEventListener('click', onClick);
    doc.addEventListener('click', onDocumentClick);
    doc.addEventListener('keydown', onKeyDown);
    win?.addEventListener('resize', onResize);
    return () => {
      if (frame !== undefined) win?.cancelAnimationFrame?.(frame);
      observer?.disconnect();
      mutations?.disconnect();
      if (token) dismissStack.release(token);
      host.removeEventListener('click', onClick);
      doc.removeEventListener('click', onDocumentClick);
      doc.removeEventListener('keydown', onKeyDown);
      win?.removeEventListener('resize', onResize);
    };
  },
});
