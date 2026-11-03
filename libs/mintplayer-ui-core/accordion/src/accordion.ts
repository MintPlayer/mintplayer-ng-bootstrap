import { defineContext, defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Accordion and accordion tab (#458 M4, one D10 group). Each tab is a native
 * `<details>` and its `open` IS the tab's state, so it works with JavaScript
 * off. Single-open is the platform's `<details name>` exclusivity, scoped to
 * one accordion by the name the accordion hands its tabs.
 *
 * Markup (every front renders the same; Angular and Lit add a tab host element
 * around each `<details>`, taken out of the layout):
 *
 *   <div class="accordion" data-accordion>
 *     <details class="accordion-item" name=<accordion id>-group open>
 *       <summary class="accordion-button collapsed" id aria-controls>…header…</summary>
 *       <div class="accordion-content" id role=region aria-labelledby>…body…</div>
 *     </details>
 *   </div>
 *
 * The summary keeps a static `collapsed` class so Bootstrap's own
 * `.accordion-button:not(.collapsed)` rules never fire: the open state is
 * styled from `details[open]`. A closed `<details>` takes its content out of
 * the tab order and the accessibility tree with no CSS.
 *
 * The `toggle` contract: it does not bubble (listen in the CAPTURE phase), it
 * is asynchronous, and same-task flips are coalesced into one event carrying
 * the final state. The accordion's root listener therefore also hears every
 * nested accordion's rows, which `accordionToggled` filters out.
 */

/** Marks an accordion's root: a row belongs to the accordion whose root is its closest marked ancestor. */
export const ACCORDION_ATTR = 'data-accordion';

/** What an accordion hands its tabs. */
export interface AccordionContext {
  /** The `<details name>` shared by the tabs; null when several may be open. */
  readonly name: string | null;
  /** Paint the open header with Bootstrap's active background. */
  readonly highlightActiveTab: boolean;
}

export const ACCORDION = defineContext<AccordionContext>('accordion', { name: null, highlightActiveTab: false });

/** Detail of the accordion's `tabToggle` output. */
export interface AccordionTabToggle {
  /** Zero-based position of the tab that changed. */
  readonly index: number;
  /** Its new state. */
  readonly active: boolean;
}

const ROW = 'details.accordion-item';

/** The accordion's own rows, in document order: never a nested accordion's. */
export function accordionRows(root: Element): HTMLDetailsElement[] {
  return [...root.querySelectorAll<HTMLDetailsElement>(ROW)].filter((row) => row.parentElement?.closest(`[${ACCORDION_ATTR}]`) === root);
}

/** A row's own header. Walks children rather than `:scope >`, which jsdom's selector engine can miss. */
function rowSummary(row: HTMLDetailsElement): HTMLElement | undefined {
  return [...row.children].find((child): child is HTMLElement => child.localName === 'summary');
}

function isDisabledRow(row: HTMLDetailsElement): boolean {
  return rowSummary(row)?.getAttribute('aria-disabled') === 'true';
}

/**
 * Closes every accordion row inside a closing row, at any depth, so a
 * collapsed branch never hides expanded descendants. Each nested tab hears its
 * own `toggle` and updates its model.
 */
export function closeNestedAccordions(row: Element): void {
  row.querySelectorAll<HTMLDetailsElement>(`${ROW}[open]`).forEach((nested) => {
    nested.open = false;
  });
}

/**
 * The root's capture-phase `toggle` handler. Returns the change, or `null` when
 * the event belongs to a nested accordion. Single-open is also enforced here
 * from the DOM, so engines without `name` support (and jsdom) behave the same;
 * the siblings it closes report through their own `toggle`.
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

/** Closes every open row, and with it every nested accordion. */
export function closeAccordion(root: Element): void {
  accordionRows(root)
    .filter((row) => row.open)
    .forEach((row) => {
      row.open = false;
      closeNestedAccordions(row);
    });
}

// ---------------------------------------------------------------- accordion

export interface AccordionInputs {
  /** Allow several tabs open at once (no `name`, so no exclusivity). */
  multi: boolean;
  /** Paint the open header with Bootstrap's active background. */
  highlightActiveTab: boolean;
}

export interface AccordionMethods {
  /** Close every open tab, and every accordion nested inside them. */
  closeAll(): void;
}

export function connectAccordion(): CoreBag {
  return { class: 'accordion', [ACCORDION_ATTR]: '' };
}

export const accordionCore = defineCore<
  AccordionInputs,
  undefined,
  { root: CoreBag },
  { tabToggle: AccordionTabToggle },
  undefined,
  AccordionContext,
  AccordionMethods
>({
  provides: ACCORDION,
  view: () => ({ root: connectAccordion() }),
  provide: ({ inputs, id }) => ({
    name: inputs.multi ? null : `${id}-group`,
    highlightActiveTab: !!inputs.highlightActiveTab,
  }),
  attach: (api) => {
    // `toggle` does not bubble: one capture-phase listener on the root hears every row.
    const onToggle = (event: Event) => {
      const change = accordionToggled(api.host, event, !!api.inputs().multi);
      if (change) api.emit('tabToggle', change);
    };
    api.host.addEventListener('toggle', onToggle, { capture: true });
    return () => api.host.removeEventListener('toggle', onToggle, { capture: true });
  },
  methods: {
    closeAll: (api) => closeAccordion(api.host),
  },
});

// ---------------------------------------------------------------- accordion tab

export interface AccordionTabInputs {
  /** Whether the tab is open. Two-way. */
  open: boolean;
  /** A disabled tab neither opens nor closes, and leaves the tab order. */
  disabled: boolean;
}

export interface AccordionTabView {
  /** The `<details>`; `open` is its attribute, which the property reflects. */
  readonly item: CoreBag;
  readonly summary: CoreBag;
  readonly content: CoreBag;
}

export function connectAccordionTab(id: string, accordion: AccordionContext, open: boolean, disabled: boolean): AccordionTabView {
  const header = `${id}-header`;
  const content = `${id}-content`;
  return {
    item: {
      class: 'accordion-item',
      name: accordion.name,
      open,
      'data-highlight-active': accordion.highlightActiveTab ? '' : null,
    },
    summary: {
      id: header,
      class: 'accordion-button collapsed',
      'aria-controls': content,
      'aria-disabled': disabled ? 'true' : null,
      tabindex: disabled ? '-1' : null,
    },
    content: { id: content, class: 'accordion-content', role: 'region', 'aria-labelledby': header },
  };
}

export interface AccordionTabMethods {
  /**
   * Open or close the tab through its `<details>`, so single-open exclusivity
   * and the nested-accordion collapse both apply.
   */
  setOpen(open: boolean): void;
}

function tabDetails(host: HTMLElement): HTMLDetailsElement | null {
  return host.localName === 'details' ? (host as HTMLDetailsElement) : host.querySelector<HTMLDetailsElement>(`:scope > ${ROW}`);
}

export const accordionTabCore = defineCore<
  AccordionTabInputs,
  { open: boolean },
  { view: AccordionTabView },
  { openChange: boolean },
  AccordionContext,
  undefined,
  AccordionTabMethods
>({
  consume: ACCORDION,
  host: () => ({ class: 'accordion-tab' }),
  state: (inputs) => ({ open: !!inputs.open }),
  view: ({ inputs, state, id, context }) => ({ view: connectAccordionTab(id, context, state.open, !!inputs.disabled) }),
  attach: (api) => {
    const row = tabDetails(api.host);
    const summary = row && rowSummary(row);
    if (!row || !summary) return;
    const onToggle = (event: Event) => {
      if (event.target !== row || row.open === api.state().open) return;
      api.setState({ open: row.open });
      api.emit('openChange', row.open);
    };
    // A disabled summary ignores a synthesized click (the sheet blocks the pointer).
    const onClick = (event: Event) => {
      if (!api.inputs().disabled) return;
      event.preventDefault();
      event.stopPropagation();
    };
    // Blocks activating a disabled tab (`toggle` cannot be cancelled, keydown
    // can, before the UA acts) and moves focus between the accordion's headers.
    const onKeydown = (event: KeyboardEvent) => {
      if (api.inputs().disabled && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        return;
      }
      const root = row.parentElement?.closest(`[${ACCORDION_ATTR}]`);
      if (!root) return;
      const rows = accordionRows(root);
      const target = accordionKeyTarget(event.key, rows.indexOf(row), rows.length);
      if (target === null) return;
      event.preventDefault();
      (rows[target] && rowSummary(rows[target]))?.focus();
    };
    row.addEventListener('toggle', onToggle);
    summary.addEventListener('click', onClick);
    summary.addEventListener('keydown', onKeydown);
    return () => {
      row.removeEventListener('toggle', onToggle);
      summary.removeEventListener('click', onClick);
      summary.removeEventListener('keydown', onKeydown);
    };
  },
  inputsChanged: (api, prev) => {
    const open = !!api.inputs().open;
    if (open === !!prev.open) return;
    // Through the <details>, so exclusivity and the nested collapse apply; its toggle reports back.
    const row = tabDetails(api.host);
    if (row) row.open = open;
    api.setState({ open });
  },
  methods: {
    setOpen: (api, open) => {
      const row = tabDetails(api.host);
      if (row) row.open = open;
    },
  },
});
