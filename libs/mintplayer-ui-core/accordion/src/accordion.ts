/**
 * The accordion has no machine (PRD #437 §8, wave A; spike S2): each tab is a
 * native `<details>` and its `open` IS the tab's state, so it works with
 * JavaScript off. Single-open is the platform's `<details name>` exclusivity,
 * scoped to one accordion by a name derived from the front's root id. What
 * the fronts share is the markup contract (ids, classes, ARIA), the keyboard
 * extras, and the one DOM handler that keeps a front's model in step.
 *
 * Markup (every front renders the same):
 *
 *   <div class="accordion" [data-highlight-active]>
 *     <details class="accordion-item" name=<id>-group open>
 *       <summary class="accordion-button collapsed" id aria-controls>…header…</summary>
 *       <div class="accordion-content" id role=region aria-labelledby>…body…</div>
 *     </details>
 *     …other content…
 *   </div>
 *
 * The summary keeps a static `collapsed` class so Bootstrap's own
 * `.accordion-button:not(.collapsed)` rules never fire: the open state is
 * styled from `details[open]` (spike 0.1b). A closed `<details>` takes its
 * content out of the tab order and the accessibility tree with no CSS.
 *
 * The `toggle` contract (spike 0.1a, all three engines): it does not bubble
 * (listen in the CAPTURE phase), it is asynchronous, and same-task flips are
 * coalesced into one event carrying the final state. A front's root listener
 * therefore also hears every nested accordion's rows, which
 * `accordionToggled` filters out.
 */

export type AccordionBag = Record<string, string | boolean | null>;

export const ACCORDION_SCOPE = 'accordion';

export interface AccordionOptions {
  /** Root id from the front, so server and client agree on every IDREF and on the group name. */
  readonly id: string;
  /** Allow several tabs open at once (no `name`, so no exclusivity). */
  readonly multi?: boolean;
  /** Paint the open header with Bootstrap's active background. */
  readonly highlightActiveTab?: boolean;
}

export interface AccordionTabState {
  readonly disabled?: boolean;
}

export interface AccordionTabView {
  /** The `<details>`. `open` is not in the bag: each front binds the live property (and the attribute, for SSR). */
  readonly item: AccordionBag;
  readonly summary: AccordionBag;
  readonly content: AccordionBag;
}

/** Detail of a front's tab-toggle event. */
export interface AccordionTabToggle {
  /** Zero-based position of the tab that changed. */
  readonly index: number;
  /** Its new state. */
  readonly active: boolean;
}

const scope = { 'data-mps': ACCORDION_SCOPE };

export function accordionIds(rootId: string, index: number): { readonly header: string; readonly content: string } {
  return { header: `${rootId}-h${index}`, content: `${rootId}-c${index}` };
}

export function connectAccordion(options: AccordionOptions): AccordionBag {
  return {
    ...scope,
    class: 'accordion',
    'data-highlight-active': options.highlightActiveTab ? '' : null,
  };
}

export function connectAccordionTab(options: AccordionOptions, index: number, tab: AccordionTabState = {}): AccordionTabView {
  const ids = accordionIds(options.id, index);
  const disabled = tab.disabled ?? false;
  return {
    item: { ...scope, class: 'accordion-item', name: options.multi ? null : `${options.id}-group` },
    summary: {
      ...scope,
      id: ids.header,
      class: 'accordion-button collapsed',
      'aria-controls': ids.content,
      'aria-disabled': disabled ? 'true' : null,
      tabindex: disabled ? '-1' : null,
    },
    content: { ...scope, id: ids.content, class: 'accordion-content', role: 'region', 'aria-labelledby': ids.header },
  };
}

/** The accordion's own rows: direct children only, never a nested accordion's. */
export function accordionRows(root: Element): HTMLDetailsElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLDetailsElement => child.localName === 'details' && child.matches('.accordion-item[data-mps=accordion]'),
  );
}

function isDisabledRow(row: HTMLDetailsElement): boolean {
  return row.querySelector(':scope > summary[aria-disabled=true]') !== null;
}

/**
 * Closes every accordion row inside a closing row, at any depth, so a
 * collapsed branch never hides expanded descendants. Each nested front hears
 * its own rows' `toggle` and updates its model.
 */
export function closeNestedAccordions(row: Element): void {
  row.querySelectorAll<HTMLDetailsElement>('details.accordion-item[data-mps=accordion][open]').forEach((nested) => {
    nested.open = false;
  });
}

/**
 * The root's capture-phase `toggle` handler. Returns the change to apply to the
 * front's model, or `null` when the event belongs to a nested accordion.
 * Single-open is also enforced here from the DOM, so engines without `name`
 * support (and jsdom) behave the same; the siblings it closes report through
 * their own `toggle`.
 */
export function accordionToggled(root: Element, event: Event, multi: boolean): AccordionTabToggle | null {
  const rows = accordionRows(root);
  const row = event.target as HTMLDetailsElement;
  const index = rows.indexOf(row);
  if (index < 0) return null;
  if (row.open && !multi) {
    rows
      .filter((other) => other !== row && other.open && !isDisabledRow(other))
      .forEach((other) => {
        other.open = false;
      });
  }
  if (!row.open) closeNestedAccordions(row);
  return { index, active: row.open };
}

/**
 * Up/Down move between headers (wrapping), Home/End go to the ends: the APG
 * accordion extras. Enter/Space are native to `<summary>`. Returns the header
 * to focus, or `null` when the key is not one of these.
 */
export function accordionKeyTarget(key: string, index: number, count: number): number | null {
  const last = count - 1;
  switch (key) {
    case 'ArrowDown': return index === last ? 0 : index + 1;
    case 'ArrowUp': return index === 0 ? last : index - 1;
    case 'Home': return 0;
    case 'End': return last;
    default: return null;
  }
}

/**
 * A summary's keydown: blocks activating a disabled tab (`toggle` cannot be
 * cancelled, but keydown can, before the UA acts) and moves focus between
 * headers. Returns whether the key was consumed.
 */
export function accordionKeydown(root: Element, event: KeyboardEvent, index: number, disabled: boolean): boolean {
  if (disabled && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    return true;
  }
  const rows = accordionRows(root);
  const target = accordionKeyTarget(event.key, index, rows.length);
  if (target === null) return false;
  event.preventDefault();
  rows[target]?.querySelector<HTMLElement>(':scope > summary')?.focus();
  return true;
}

/** A disabled summary also ignores a synthesized click (the sheet blocks the pointer). */
export function accordionSummaryClick(event: Event, disabled: boolean): void {
  if (!disabled) return;
  event.preventDefault();
  event.stopPropagation();
}

/** Closes every open row, and with it every nested accordion. */
export function closeAccordion(root: Element): void {
  accordionRows(root)
    .filter((row) => row.open)
    .forEach((row) => {
      row.open = false;
      closeNestedAccordions(row);
    });
}
