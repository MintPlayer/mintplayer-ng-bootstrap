import { rovingTarget } from '@mintplayer/ui-core/roving';
import { hydratedAttr } from '@mintplayer/ui-core/store';
import { connectDropdownMenu, dropdownItemControl, dropdownItemDisabled, dropdownMenuItems, syncDropdownMenu } from '@mintplayer/ui-core/dropdown-menu';

/**
 * The navbar has no machine (PRD #437 §8, wave B): a native checkbox is the
 * collapse state and native `<details>` are the dropdowns, so the whole bar
 * works with JavaScript off (no-JS tier 1). What the fronts share is the markup
 * contract (ids, classes, ARIA) and one DOM attachment for what only script can
 * add: dismiss on navigate, Escape, outside click, the arrow-key shortcuts and
 * the submenu flip.
 *
 * Markup (every front renders the same):
 *
 *   <nav class="navbar navbar-expand-<bp> [bg-<color>] [fixed-top]" data-breakpoint aria-label>
 *     <div class="navbar-brand">…brand…</div>
 *     <input type=checkbox class="navbar-toggle" id aria-label aria-controls>
 *     <label class="navbar-toggler" for aria-hidden=true>…3 bars, or a custom glyph…</label>
 *     <div class="navbar-collapse" id>
 *       <div class="navbar-collapse-inner">
 *         <div class="navbar-nav">                          (one per nav group, `nav-end` pushes right)
 *           <div class="nav-item"><a href>…</a></div>
 *           <details class="nav-item dropdown" name>
 *             <summary class="nav-link dropdown-toggle">…label…</summary>
 *             <div class="dropdown-menu show">              (the dropdown-menu front's panel)
 *               <div class="dropdown-item"><a href>…</a></div>
 *               <details class="dropdown dropdown-submenu" name>
 *                 <summary class="dropdown-item dropdown-toggle">…</summary>
 *                 <div class="dropdown-menu show">…</div>
 *               </details>
 *             </div>
 *           </details>
 *         </div>
 *       </div>
 *     </div>
 *   </nav>
 *
 * The dropdowns follow the APG disclosure-navigation pattern, not the menu
 * pattern: the summary keeps its native role and state (axe forbids any role
 * on a summary, and a native disclosure stays correct with no write path), and
 * every link stays in the tab order. A `<div>` panel, not a `<ul>`: its
 * children are item wrappers, which a role-less list may not contain.
 *
 * `name` makes the dropdowns of one level exclusive, natively. It is per depth,
 * not per navbar: a submenu sharing its parent's name would close the parent.
 *
 * The checkbox reads correctly in both positions ("Toggle navigation",
 * checked = revealed). Once hydrated it also carries `role=button` and a live
 * `aria-expanded`, written by the front from its own expanded state.
 */

export type NavbarBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type NavbarPositioning = 'fixed';
export type NavbarBag = Record<string, string | boolean | null>;

export const NAVBAR_SCOPE = 'navbar';

/** `detail` of the `expandedchange` event a front fires when the collapse toggles. */
export interface NavbarExpandedChangeEventDetail {
  /** Whether the collapse is now expanded. */
  expanded: boolean;
}

/** Bootstrap's grid breakpoints, the min-width at which the bar expands. */
export const NAVBAR_BREAKPOINTS: Readonly<Record<NavbarBreakpoint, number>> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

/**
 * The `data-bs-theme` a background colour needs for readable text: light
 * colours keep the page's theme off, the adaptive `body-*` backgrounds follow
 * the page's theme, every solid theme colour gets dark (light text).
 */
export function navbarTheme(color: string | null | undefined): 'light' | 'dark' | null {
  if (!color) return null;
  if (color === 'light' || color === 'white') return 'light';
  if (color === 'body' || color === 'transparent' || color.startsWith('body-')) return null;
  return 'dark';
}

export interface NavbarLabels {
  /** Names the navigation landmark. */
  nav: string;
  /** Names the collapse checkbox; reads correctly checked and unchecked. */
  toggle: string;
}

export const DEFAULT_NAVBAR_LABELS: NavbarLabels = {
  nav: 'Main navigation',
  toggle: 'Toggle navigation',
};

export interface NavbarOptions {
  /** Root id from the front, so server and client agree on every IDREF. */
  id: string;
  breakpoint?: NavbarBreakpoint | null;
  /** A Bootstrap background name (`primary`, `body-tertiary`, …). */
  color?: string | null;
  positioning?: NavbarPositioning | null;
  /** Whether the collapse is expanded (narrow mode). */
  expanded?: boolean;
  /** Written by the front once it has rendered on the client. */
  hydrated: boolean;
  labels?: Partial<NavbarLabels> | null;
}

export interface NavbarView {
  readonly root: NavbarBag;
  /** The checkbox; `checked` is its initial state, the front binds the property too. */
  readonly toggle: NavbarBag;
  readonly toggler: NavbarBag;
  /** The three hamburger bars (the toggler's default content). */
  readonly bar: NavbarBag;
  readonly collapse: NavbarBag;
  readonly inner: NavbarBag;
}

const classes = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

export function connectNavbar(options: NavbarOptions): NavbarView {
  const { id, hydrated, expanded = false } = options;
  const labels = { ...DEFAULT_NAVBAR_LABELS, ...(options.labels ?? {}) };
  const breakpoint = options.breakpoint ?? 'md';
  const toggleId = `${id}-toggle`;
  const collapseId = `${id}-collapse`;
  return {
    root: {
      class: classes(
        'navbar',
        breakpoint === 'xs' ? 'navbar-expand' : `navbar-expand-${breakpoint}`,
        options.color && `bg-${options.color}`,
        options.positioning === 'fixed' && 'fixed-top',
      ),
      'data-breakpoint': breakpoint,
      'data-bs-theme': navbarTheme(options.color),
      'aria-label': labels.nav,
      ...hydratedAttr(hydrated),
    },
    toggle: {
      type: 'checkbox',
      id: toggleId,
      class: 'navbar-toggle',
      'aria-label': labels.toggle,
      'aria-controls': collapseId,
      checked: expanded ? true : null,
      // Only script keeps these true to the checkbox; the server output relies
      // on the native checked state alone.
      role: hydrated ? 'button' : null,
      'aria-expanded': hydrated ? String(expanded) : null,
    },
    toggler: { class: 'navbar-toggler', for: toggleId, 'aria-hidden': 'true' },
    bar: { class: 'navbar-toggler-bar' },
    collapse: { class: 'navbar-collapse', id: collapseId },
    inner: { class: 'navbar-collapse-inner' },
  };
}

/** A nav group; `end` pushes it to the far side when the bar is wide. */
export function connectNavbarNav(align: 'start' | 'end' | null = 'start'): NavbarBag {
  return { class: classes('navbar-nav', align === 'end' ? 'nav-end' : 'nav-start') };
}

export function connectNavbarBrand(): NavbarBag {
  return { class: 'navbar-brand' };
}

/** A front's own host element around a bar node, taken out of the layout. */
export function connectNavbarContents(): NavbarBag {
  return { class: 'navbar-contents' };
}

export interface NavbarItemOptions {
  /** Inside a dropdown panel the item is a `.dropdown-item`, else a `.nav-item`. */
  inMenu?: boolean;
  active?: boolean;
  disabled?: boolean;
}

/** The wrapper around one consumer link or button. */
export function connectNavbarItem(options: NavbarItemOptions = {}): NavbarBag {
  const { inMenu = false, active = false, disabled = false } = options;
  return {
    class: classes(inMenu ? 'dropdown-item' : 'nav-item', active && 'active', disabled && 'disabled'),
    'aria-disabled': disabled ? 'true' : null,
    'aria-current': active ? (inMenu ? 'true' : 'page') : null,
  };
}

export interface NavbarDropdownOptions {
  /** 0 for a dropdown in a nav group, 1+ for a submenu inside a panel. */
  depth: number;
  /** A descendant link's route is active. */
  active?: boolean;
}

export interface NavbarDropdownView {
  readonly details: NavbarBag;
  readonly summary: NavbarBag;
  readonly panel: NavbarBag;
}

export function connectNavbarDropdown(options: NavbarDropdownOptions): NavbarDropdownView {
  const submenu = options.depth > 0;
  const active = options.active ?? false;
  return {
    details: {
      class: submenu ? 'dropdown dropdown-submenu' : 'nav-item dropdown',
      name: `mp-navbar-${options.depth}`,
    },
    summary: {
      class: classes(submenu ? 'dropdown-item' : 'nav-link', 'dropdown-toggle', active && 'active'),
    },
    // Navigation, not a menu: never role=menu, whatever the hydration state.
    panel: connectDropdownMenu({ hydrated: false }),
  };
}

/* ------------------------------------------------------------------------ */
/* DOM attachment                                                           */
/* ------------------------------------------------------------------------ */

const DETAILS = 'details.dropdown[data-mps=navbar]';

function toggleOf(root: HTMLElement): HTMLInputElement | null {
  return root.querySelector<HTMLInputElement>('.navbar-toggle[data-mps=navbar]');
}

function isWide(root: HTMLElement): boolean {
  const bp = (root.dataset['breakpoint'] ?? 'md') as NavbarBreakpoint;
  const px = NAVBAR_BREAKPOINTS[bp] ?? NAVBAR_BREAKPOINTS.md;
  return px === 0 || (typeof matchMedia !== 'undefined' && matchMedia(`(min-width: ${px}px)`).matches);
}

/** Close every open dropdown in the bar, optionally sparing the ones that contain `keep`. */
export function closeNavbarDropdowns(root: HTMLElement, keep?: Node | null): void {
  [...root.querySelectorAll<HTMLDetailsElement>(`${DETAILS}[open]`)]
    .filter((details) => !keep || !details.contains(keep))
    .map((details) => (details.open = false));
}

/**
 * Opens or closes the collapse, returning the new state, or `null` when
 * nothing is rendered yet.
 */
export function setNavbarExpanded(root: HTMLElement, expanded: boolean): boolean | null {
  const input = toggleOf(root);
  if (!input) return null;
  input.checked = expanded;
  return expanded;
}

function panelOf(details: HTMLDetailsElement): HTMLElement | null {
  return [...details.children].find((el): el is HTMLElement => el.classList.contains('dropdown-menu')) ?? null;
}

function summaryOf(details: HTMLDetailsElement): HTMLElement | null {
  return [...details.children].find((el): el is HTMLElement => el.localName === 'summary') ?? null;
}

function focusFirstItem(details: HTMLDetailsElement): void {
  const panel = panelOf(details);
  const first = panel && dropdownMenuItems(panel).find((item) => !dropdownItemDisabled(item));
  if (first) dropdownItemControl(first).focus();
}

export interface AttachNavbarOptions {
  /** The collapse opened or closed through the bar (the checkbox, or a navigation). */
  readonly onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Own the script-only behaviour of a rendered navbar. The open states stay in
 * the DOM (the checkbox, each `<details>`), so a front only mirrors the
 * collapse through `onExpandedChange`. Returns the disposer.
 */
export function attachNavbar(root: HTMLElement, options: AttachNavbarOptions = {}): () => void {
  const report = (expanded: boolean) => options.onExpandedChange?.(expanded);
  const rtl = () => typeof getComputedStyle !== 'undefined' && getComputedStyle(root).direction === 'rtl';
  let wide = isWide(root);
  /** The trigger a mouse press just toggled; its click is swallowed (see onPointerdown). */
  let pressed: HTMLElement | null = null;

  const collapse = () => {
    const input = toggleOf(root);
    if (input?.checked) {
      input.checked = false;
      report(false);
    }
  };

  const onChange = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target === toggleOf(root)) report((target as HTMLInputElement).checked);
  };

  // A navigation closes the dropdowns and the collapse. A summary is a
  // disclosure, not a navigation, whatever it contains.
  const onClick = (event: MouseEvent) => {
    const summary = pressed;
    pressed = null;
    if (summary && event.composedPath().includes(summary)) {
      event.preventDefault(); // the press already toggled it
      return;
    }
    const link = event
      .composedPath()
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement && el.hasAttribute('href'));
    if (!link || link.closest('summary')) return;
    closeNavbarDropdowns(root);
    collapse();
  };

  const onKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const input = toggleOf(root);
    if (target === input && event.key === 'Enter') {
      // role=button: Enter activates it, as Space does natively.
      event.preventDefault();
      input.checked = !input.checked;
      report(input.checked);
      return;
    }

    const details = target.closest<HTMLDetailsElement>(DETAILS);
    if (event.key === 'Escape') {
      const open = target.closest<HTMLDetailsElement>(`${DETAILS}[open]`);
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      open.open = false;
      summaryOf(open)?.focus();
      return;
    }

    // On a trigger: open and step into the panel (Down for a dropdown, the
    // inline-end arrow for a submenu, mirrored in RTL).
    if (details && target === summaryOf(details)) {
      const submenu = details.classList.contains('dropdown-submenu');
      const into = submenu ? (rtl() ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
      if (event.key === into) {
        event.preventDefault();
        details.open = true;
        focusFirstItem(details);
        return;
      }
    }

    // In a submenu's panel: the inline-start arrow closes it.
    const panel = target.closest<HTMLElement>('.dropdown-menu');
    const owner = panel?.parentElement;
    if (panel && owner instanceof HTMLDetailsElement && owner.classList.contains('dropdown-submenu')) {
      if (event.key === (rtl() ? 'ArrowRight' : 'ArrowLeft')) {
        event.preventDefault();
        owner.open = false;
        summaryOf(owner)?.focus();
        return;
      }
    }

    // Up/Down/Home/End rove a panel's items: a shortcut only, Tab still
    // reaches every link (disclosure navigation).
    if (!panel || !root.contains(panel)) return;
    const items = dropdownMenuItems(panel);
    const from = items.findIndex((item) => item.contains(target));
    if (from < 0) return;
    const to = rovingTarget(
      event.key,
      { count: items.length, from, orientation: 'vertical', wrap: true, isDisabled: (i) => dropdownItemDisabled(items[i]) },
      event,
    );
    if (to === null) return;
    event.preventDefault();
    dropdownItemControl(items[to]).focus();
  };

  // `toggle` does not bubble: capture it. On open: name the panel's chrome,
  // and flip a wide submenu that would run off the viewport's end.
  const onToggle = (event: Event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.matches(DETAILS) || !details.open) return;
    const panel = panelOf(details);
    if (!panel) return;
    syncDropdownMenu(panel, 0, 'navigation');
    if (!details.classList.contains('dropdown-submenu')) return;
    details.removeAttribute('data-flip');
    if (!wide || typeof innerWidth === 'undefined') return;
    const rect = panel.getBoundingClientRect();
    const overflows = rtl() ? rect.left < 0 : rect.right > innerWidth;
    if (overflows) details.setAttribute('data-flip', '');
  };

  // A mouse press on a trigger toggles its dropdown at press time, and the
  // click that follows is swallowed. Resolving on the click loses a drifting
  // press: the previous panel closes at pointerdown, the content under the
  // pointer moves, the click lands on a common ancestor and the next dropdown
  // never opens. Any other press closes every dropdown it is not inside.
  const onPointerdown = (event: PointerEvent) => {
    const target = event.target as Node | null;
    const inside = target && root.contains(target) ? target : null;
    const summary = inside instanceof Element ? inside.closest('summary') : null;
    const details = summary?.parentElement;
    pressed = null;
    if (summary instanceof HTMLElement && details instanceof HTMLDetailsElement && details.matches(DETAILS) && event.pointerType === 'mouse' && event.button === 0) {
      pressed = summary;
      closeNavbarDropdowns(root, details);
      details.open = !details.open;
      return;
    }
    closeNavbarDropdowns(root, inside);
  };

  // A breakpoint crossing changes where every panel sits: close them.
  const onResize = () => {
    const now = isWide(root);
    if (now === wide) return;
    wide = now;
    closeNavbarDropdowns(root);
  };

  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('toggle', onToggle, true);
  document.addEventListener('pointerdown', onPointerdown, true);
  addEventListener('resize', onResize);
  return () => {
    root.removeEventListener('change', onChange);
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('toggle', onToggle, true);
    document.removeEventListener('pointerdown', onPointerdown, true);
    removeEventListener('resize', onResize);
  };
}
