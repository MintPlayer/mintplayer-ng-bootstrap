import { defineContext, defineCore, type CoreApi, type CoreBag } from '@mintplayer/ui-core/component';
import {
  isKept,
  isRendered,
  isShown,
  OverlayPresence,
  phaseBag,
  phaseState,
  placeBeside,
  trackBeside,
  type AnchorAlign,
  type OverlayPhase,
  type PresenceState,
} from '@mintplayer/ui-core/overlay';
import {
  activatedItem,
  attachDropdownMenu,
  connectDropdownMenu,
  dropdownItemControl,
  dropdownItemDisabled,
  dropdownMenuItems,
  type DropdownItemElement,
  type DropdownMenuMode,
  type DropdownSelectEventDetail,
} from '@mintplayer/ui-core/dropdown-menu';

/**
 * Bootstrap's dropdown (#458 M6, PRD §4.5): one group for the standalone
 * dropdown and the menu it usually holds.
 *
 *   <button aria-haspopup="menu" aria-expanded aria-controls=<panel>>…</button>   (the consumer's trigger, [bsDropdown])
 *   <div data-mp-overlay>                                                         (end of <body>, while open)
 *     <div class="dropdown-panel [show]" id=<panel>>                              (dropdown-panel)
 *       <div class="dropdown-menu show" role=menu aria-labelledby=<trigger>>       (dropdown-menu)
 *         <div class="dropdown-header">…</div>                                     (dropdown-header)
 *         <div class="dropdown-item"><a href>…</a></div>                           (dropdown-item)
 *         <div class="dropdown-divider"></div>                                     (dropdown-divider)
 *
 * The menu is a `div`, not a `ul`: in Angular and Lit an item's host is a
 * custom element, which a list may not contain. The menu also works on its
 * own, in place (its behaviour is `ui-core/dropdown-menu`).
 *
 * In a navbar nav group (`DROPDOWN_NESTING` in `navigation` mode) the same
 * `bs-dropdown-menu` renders the navbar's dropdown instead, an APG
 * disclosure-navigation `<details>` (no-JS tier 1, nested menus are submenus):
 *
 *   <details class="nav-item dropdown" name>                      (dropdown-menu, `label` is the trigger text)
 *     <summary class="nav-link dropdown-toggle">…label…</summary>
 *     <div class="dropdown-menu show">
 *       <div class="dropdown-item" aria-current?><a href>…</a></div>   (dropdown-item)
 *       <details class="dropdown dropdown-submenu" name>…</details>   (a nested dropdown-menu)
 *
 * The trigger is an APG menu button: a click (Enter and Space on a trigger that
 * is not natively focusable, which then becomes a focusable button) toggles
 * it; ArrowDown opens it on the first item and ArrowUp on the last. Escape
 * closes it and returns focus to the trigger, as does activating an item; a
 * press outside, or focus leaving both panel and trigger, closes it. It sits
 * `bottom-start` of the trigger by default (`placement`), flipped when it does
 * not fit, optionally as wide as the trigger (`sameWidth`). `hasPopup="dialog"`
 * is for content that is not a menu (a calendar, a form): the panel is then a
 * non-modal dialog and takes focus itself.
 *
 * No-JS tier 2 standalone: the trigger renders `aria-expanded="false"` and the
 * dropdown does not open without JavaScript (an overlay, like the tooltip). The
 * navbar's dropdowns are tier 1: native `<details>`, and before hydration a
 * `:focus-within` reveal as well (the navbar sheet).
 */
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
export type DropdownPopup = 'menu' | 'dialog';

export interface DropdownInputs {
  /** Where the panel sits; it flips vertically when it does not fit. */
  placement: DropdownPlacement;
  /** The panel is as wide as the trigger. */
  sameWidth: boolean;
  /** What opens: a `menu` (the usual) or a `dialog` (any other content). */
  hasPopup: DropdownPopup;
}

export interface DropdownState extends PresenceState {
  /** The side it landed on (the opposite of the placement's when that did not fit). */
  side: 'top' | 'bottom';
  /** The trigger is not natively focusable: the core makes it a focusable button. */
  promote: boolean;
  /** The trigger's id (given one when it had none): it names the menu or dialog. */
  triggerId: string | null;
}

/** The panel's inputs: what the directive hands the `dropdown-panel` component. */
export interface DropdownPanelInputs {
  /** The panel's id, which the trigger's `aria-controls` names. */
  overlayId: string;
  side: string;
  /** The overlay phase: `.show` while `shown`, `hidden` while `closed` (#465). */
  phase: OverlayPhase;
  /** `dialog` makes the panel itself a non-modal dialog. */
  hasPopup: string;
  /** The trigger's id, naming a dialog panel. */
  triggerId: string | null;
}

export interface DropdownProps {
  /** The trigger's bag. */
  readonly anchor: CoreBag;
  /** The panel's inputs from its first open on (kept while closed, #465); null before. */
  readonly overlay: DropdownPanelInputs | null;
}

export interface DropdownMenuInputs {
  /** Pixel cap on the menu height; it scrolls beyond. */
  maxHeight: number | null;
  /**
   * A menu's accessible name (inside a dropdown its trigger names it); in a
   * navbar, the trigger text (the `labelTemplate` slot replaces it).
   */
  label: string | null;
  /** In a navbar: a descendant link's route is active (Angular derives it from the router). */
  active: boolean;
}

export interface DropdownMenuProps {
  /** The menu's bag; unused in a navbar. */
  readonly root: CoreBag;
  /** The disclosure in a navbar; null for a menu. */
  readonly nav: DropdownDisclosureView | null;
  /** The navbar trigger's text. */
  readonly label?: string;
}

export interface DropdownItemInputs {
  active: boolean;
  disabled: boolean;
  /** Opaque value carried in the menu's `select` detail. */
  value: unknown;
}

/**
 * Where a `bs-dropdown-menu` sits: `navigation` inside a navbar nav group (it
 * renders a `<details>` disclosure), `menu` anywhere else. `depth` counts the
 * menus around it: -1 for none.
 */
export interface DropdownNesting {
  readonly mode: DropdownMenuMode;
  readonly depth: number;
}

export const DROPDOWN_NESTING = defineContext<DropdownNesting>('dropdown-nesting', { mode: 'menu', depth: -1 });

/** What a navbar nav group provides. */
export const NAVIGATION_NESTING: DropdownNesting = { mode: 'navigation', depth: -1 };

const MENU_NESTING: DropdownNesting = { mode: 'menu', depth: -1 };

/** The Angular / Lit host around a menu: out of the layout, so the navbar's flex and Bootstrap's child rules see the real node. */
const CONTENTS: CoreBag = { class: 'dropdown-contents' };

const classes = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** The trigger names its panel's id here, so the core finds the body-hosted panel. */
export const DROPDOWN_OF_ATTR = 'data-mp-dropdown';

/** Bootstrap's `--bs-dropdown-spacer`. */
const GAP = 2;

const NATIVELY_FOCUSABLE = 'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable]';

const PLACEMENTS: Record<DropdownPlacement, { side: 'top' | 'bottom'; align: AnchorAlign }> = {
  'bottom-start': { side: 'bottom', align: 'start' },
  'bottom-end': { side: 'bottom', align: 'end' },
  'top-start': { side: 'top', align: 'start' },
  'top-end': { side: 'top', align: 'end' },
};
const placementOf = (value: unknown) => PLACEMENTS[value as DropdownPlacement] ?? PLACEMENTS['bottom-start'];

export function connectDropdown(inputs: DropdownInputs, state: DropdownState, id: string): DropdownProps {
  const overlayId = `${id}-dropdown`;
  const rendered = isRendered(state.phase);
  const dialog = inputs.hasPopup === 'dialog';
  return {
    anchor: {
      'aria-haspopup': dialog ? 'dialog' : 'menu',
      'aria-expanded': rendered ? 'true' : 'false',
      'aria-controls': rendered ? overlayId : null,
      [DROPDOWN_OF_ATTR]: overlayId,
      role: state.promote ? 'button' : null,
      tabindex: state.promote ? 0 : null,
    },
    overlay: isKept(state)
      ? { overlayId, side: state.side, phase: state.phase, hasPopup: dialog ? 'dialog' : 'menu', triggerId: state.triggerId }
      : null,
  };
}

export function connectDropdownPanel(inputs: DropdownPanelInputs): CoreBag {
  const dialog = inputs.hasPopup === 'dialog';
  const phase = inputs.phase ?? 'closed';
  return {
    ...phaseBag(phase),
    class: `dropdown-panel${isShown(phase) ? ' show' : ''}`,
    id: inputs.overlayId || null,
    'data-side': inputs.side === 'top' ? 'top' : 'bottom',
    role: dialog ? 'dialog' : null,
    // Focus lands on the panel itself in a dialog, or in a menu that holds no enabled item.
    tabindex: -1,
    'aria-labelledby': dialog ? inputs.triggerId : null,
  };
}

/**
 * The item's bag. In a menu, its classes only: the menu (`syncDropdownMenu`)
 * writes the role and `aria-disabled` on whichever node is the menuitem, the
 * item or the link / button it wraps, so a presentational item carries no ARIA
 * of its own. In a navbar's disclosure panel nothing writes roles, so the item
 * states its own `aria-current` and `aria-disabled`.
 */
export function connectDropdownItem(inputs: DropdownItemInputs, mode: DropdownMenuMode = 'menu'): CoreBag {
  const cls = classes('dropdown-item', inputs.active && 'active', inputs.disabled && 'disabled');
  if (mode === 'menu') return { class: cls };
  return { class: cls, 'aria-current': inputs.active ? 'true' : null, 'aria-disabled': inputs.disabled ? 'true' : null };
}

/** A `bs-dropdown-menu` in a navbar: a native `<details>` disclosure. */
export interface DropdownDisclosureView {
  readonly details: CoreBag;
  readonly summary: CoreBag;
  readonly panel: CoreBag;
}

export interface DropdownDisclosureOptions {
  /** 0 for a dropdown in a nav group, 1+ for a submenu inside a panel. */
  depth: number;
  /** A descendant link's route is active. */
  active?: boolean;
  /**
   * Script runs: a submenu's panel becomes a manual popover, which the navbar's
   * attachment shows in the top layer next to its trigger, so the panel it sits
   * in can scroll without clipping it.
   */
  hydrated?: boolean;
}

/**
 * The APG disclosure-navigation dropdown (not a menu): the summary keeps its
 * native role and state, and every link stays in the tab order. `name` makes
 * the dropdowns of one level exclusive, natively; it is per depth, since a
 * submenu sharing its parent's name would close the parent.
 */
export function connectDropdownDisclosure(options: DropdownDisclosureOptions): DropdownDisclosureView {
  const submenu = options.depth > 0;
  return {
    details: { class: submenu ? 'dropdown dropdown-submenu' : 'nav-item dropdown', name: `mp-navbar-${options.depth}` },
    summary: { class: classes(submenu ? 'dropdown-item' : 'nav-link', 'dropdown-toggle', options.active && 'active') },
    // Navigation, not a menu: never role=menu, whatever the hydration state.
    panel: { ...connectDropdownMenu({ hydrated: false }), popover: submenu && options.hydrated ? 'manual' : null },
  };
}

type Api = CoreApi<DropdownInputs, DropdownState, Record<never, never>>;

export const dropdownCore = defineCore<DropdownInputs, DropdownState, DropdownProps>({
  state: (inputs) => ({ phase: 'closed', kept: false, side: placementOf(inputs.placement).side, promote: false, triggerId: null }),
  view: ({ inputs, state, id }) => connectDropdown(inputs, state, id),
  attach: (api: Api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    if (!host.id) host.id = `${host.getAttribute(DROPDOWN_OF_ATTR)?.replace(/-dropdown$/, '') ?? 'mp-dropdown'}-trigger`;
    api.setState({ promote: !host.matches(NATIVELY_FOCUSABLE), triggerId: host.id });
    const find = () => {
      const id = host.getAttribute(DROPDOWN_OF_ATTR);
      return id ? doc.getElementById(id) : null;
    };

    let open = false;
    /** Where focus lands when the panel is wired: the first or the last item. */
    let entry: 'first' | 'last' = 'first';
    const set = (next: boolean, refocus = false) => {
      if (next === open) return;
      open = next;
      presence.set(next);
      if (!next && refocus) host.focus();
    };
    const place = (panel: HTMLElement) => {
      const { side, align } = placementOf(api.inputs().placement);
      // CSSOM writes, not a style attribute: a strict CSP style-src holds.
      if (api.inputs().sameWidth) panel.style.setProperty('--mp-dropdown-width', `${host.getBoundingClientRect().width}px`);
      else panel.style.removeProperty('--mp-dropdown-width');
      const landed = placeBeside(host, panel, side, GAP, 8, align) === 'top' ? 'top' : 'bottom';
      if (landed !== api.state().side) api.setState({ side: landed });
    };

    const presence = new OverlayPresence({
      doc,
      find,
      setPhase: (phase) => api.setState(phaseState(phase)),
      overlay: () => ({
        inside: () => [host],
        onDismiss: (reason) => set(false, reason === 'escape'),
      }),
      wire: (panel) => {
        place(panel);
        const untrack = trackBeside(panel, () => place(panel));
        const menu = panel.querySelector<HTMLElement>('.dropdown-menu');
        // The trigger names a menu that has no name of its own.
        if (menu && !menu.hasAttribute('aria-label') && !menu.hasAttribute('aria-labelledby')) menu.setAttribute('aria-labelledby', host.id);
        const items = menu && api.inputs().hasPopup !== 'dialog' ? dropdownMenuItems(menu).filter((item) => !dropdownItemDisabled(item)) : [];
        const first = entry === 'last' ? items[items.length - 1] : items[0];
        (first ? dropdownItemControl(first) : panel).focus({ preventScroll: true });
        // Focus leaving both the panel and its trigger closes it.
        const onFocusOut = (event: FocusEvent) => {
          const next = event.relatedTarget as Node | null;
          if (next && !panel.contains(next) && !host.contains(next)) set(false);
        };
        // Activating an item (a click; the menu turns Enter / Space into one) closes the menu and
        // returns focus to the trigger (APG menu button). A submenu's summary is not a choice.
        const onClick = (event: Event) => {
          if (activatedItem(panel, event)) set(false, true);
        };
        panel.addEventListener('focusout', onFocusOut);
        panel.addEventListener('click', onClick);
        return () => {
          untrack();
          panel.removeEventListener('focusout', onFocusOut);
          panel.removeEventListener('click', onClick);
        };
      },
    });

    const onClick = () => {
      entry = 'first';
      set(!open);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        entry = event.key === 'ArrowUp' ? 'last' : 'first';
        set(true);
        return;
      }
      if (!api.state().promote || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      onClick();
    };
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onKeyDown);
    return () => {
      host.removeEventListener('click', onClick);
      host.removeEventListener('keydown', onKeyDown);
      presence.dispose();
    };
  },
});

/**
 * The panel: a pure view of the inputs the directive hands it. It resets the
 * nesting: a framework context follows the declaration, not the body teleport,
 * so a `[bsDropdown]` inside a navbar would otherwise render its menu as a disclosure.
 */
export const dropdownPanelCore = defineCore<DropdownPanelInputs, Record<string, never>, { root: CoreBag }, Record<never, never>, undefined, DropdownNesting>({
  view: ({ inputs }) => ({ root: connectDropdownPanel(inputs) }),
  provides: DROPDOWN_NESTING,
  provide: () => MENU_NESTING,
});

// Zero is a cap like any other; only an unset value leaves the menu uncapped.
const applyMaxHeight = (host: HTMLElement, maxHeight: number | null) =>
  maxHeight != null ? host.style.setProperty('--mp-dropdown-max-height', `${maxHeight}px`) : host.style.removeProperty('--mp-dropdown-max-height');

/**
 * In a navbar the disclosure is the navbar's: its attachment owns the keys,
 * dismissal and the panel's height, so the menu attaches nothing there.
 */
const inNavbar = (host: HTMLElement) => host.localName === 'details';

export const dropdownMenuCore = defineCore<
  DropdownMenuInputs,
  Record<string, never>,
  DropdownMenuProps,
  { itemSelect: DropdownSelectEventDetail },
  DropdownNesting,
  DropdownNesting
>({
  consume: DROPDOWN_NESTING,
  provides: DROPDOWN_NESTING,
  view: ({ inputs, hydrated, context, label }) =>
    context.mode === 'navigation'
      ? { root: {}, nav: connectDropdownDisclosure({ depth: context.depth + 1, active: inputs.active, hydrated }), label: inputs.label ?? undefined }
      : { root: connectDropdownMenu({ hydrated, label: inputs.label ?? label }), nav: null },
  provide: ({ context }) => ({ mode: context.mode, depth: context.depth + 1 }),
  host: () => CONTENTS,
  attach: (api) => {
    if (inNavbar(api.host)) return undefined;
    applyMaxHeight(api.host, api.inputs().maxHeight);
    return attachDropdownMenu(api.host, { onSelect: (detail) => api.emit('itemSelect', detail) });
  },
  inputsChanged: (api) => {
    if (!inNavbar(api.host)) applyMaxHeight(api.host, api.inputs().maxHeight);
  },
});

/** The item carries its opaque value as the `dropdownValue` property the menu reads. */
export const dropdownItemCore = defineCore<DropdownItemInputs, Record<string, never>, { root: CoreBag }, Record<never, never>, DropdownNesting>({
  consume: DROPDOWN_NESTING,
  view: ({ inputs, context }) => ({ root: connectDropdownItem(inputs, context.mode) }),
  attach: (api) => {
    (api.host as DropdownItemElement).dropdownValue = api.inputs().value;
  },
  inputsChanged: (api) => {
    (api.host as DropdownItemElement).dropdownValue = api.inputs().value;
  },
});

export const dropdownHeaderCore = defineCore<Record<string, never>, Record<string, never>, { root: CoreBag }>({
  view: () => ({ root: { class: 'dropdown-header' } }),
});

export const dropdownDividerCore = defineCore<Record<string, never>, Record<string, never>, { root: CoreBag }>({
  view: () => ({ root: { class: 'dropdown-divider' } }),
});
