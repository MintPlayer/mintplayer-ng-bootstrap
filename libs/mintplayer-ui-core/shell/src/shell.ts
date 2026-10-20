/**
 * The shell has no machine (PRD #437 §8, wave A): the native checkboxes are
 * the open state, so it works with JavaScript off. What the fronts share is
 * the markup contract (ids, classes, ARIA), the per-state checkbox defaults
 * and a few DOM helpers for the programmatic API.
 *
 * Markup (every front renders the same):
 *
 *   <div class="shell" data-breakpoint>
 *     <a class="skip-link" href="#<content>">
 *     <input type=checkbox class="shell-toggle shell-toggle-narrow">
 *     <input type=checkbox class="shell-toggle shell-toggle-wide">
 *     <div class="topbar" role=banner>
 *       <label class="shell-hamburger shell-hamburger-narrow" for>
 *       <label class="shell-hamburger shell-hamburger-wide" for>
 *       …topbar…
 *     </div>
 *     <div class="sidebar-root">
 *       <aside class="sidebar">…sidebar…</aside>
 *       <div class="content" role=main tabindex=0>…content…</div>
 *     </div>
 *   </div>
 *
 * One checkbox per viewport mode, so `checked` always means "the sidebar is
 * revealed" (CLAUDE.md, no-JS tier 1). A single checkbox could not: the wide
 * default is open and the narrow default is closed, so one input would have to
 * mean "inverted from the default", and the state AT reads would lie in one of
 * the two modes. The inactive mode's checkbox and label are `display: none`,
 * out of the tab order and the accessibility tree; each mode keeps its own
 * state across a breakpoint crossing.
 *
 * `state` only sets the checkboxes: `auto` is closed narrow and open wide,
 * `show` / `hide` check or clear both. The hamburger still flips the current
 * mode's checkbox, and a front reports it through its `statechange` event.
 */

export type ShellState = 'auto' | 'show' | 'hide';
export type ShellBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type ShellMode = 'narrow' | 'wide';
export type ShellBag = Record<string, string | boolean | null>;

export const SHELL_SCOPE = 'shell';

export interface ShellLabels {
  /** Names the toggle checkbox; reads correctly checked and unchecked. */
  toggle: string;
  sidebar: string;
  skip: string;
}

export const DEFAULT_SHELL_LABELS: ShellLabels = {
  toggle: 'Show sidebar',
  sidebar: 'Sidebar',
  skip: 'Skip to content',
};

export interface ShellOptions {
  /** Root id from the front, so server and client agree on every IDREF. */
  id: string;
  state?: ShellState | null;
  breakpoint?: ShellBreakpoint | null;
  /** Hides the built-in hamburger; drive the shell through `state` or `toggle`. */
  externalToggle?: boolean;
  labels?: Partial<ShellLabels> | null;
}

export interface ShellToggleView {
  readonly mode: ShellMode;
  /** The checkbox's initial and controlled state. */
  readonly checked: boolean;
  readonly input: ShellBag;
  readonly label: ShellBag;
}

export interface ShellView {
  readonly root: ShellBag;
  readonly skip: ShellBag;
  /** Kept out of `skip` because the bridges refuse URL-bearing names. */
  readonly skipHref: string;
  readonly skipText: string;
  readonly toggles: readonly ShellToggleView[];
  readonly hamburgerText: string;
  readonly topbar: ShellBag;
  readonly sidebarRoot: ShellBag;
  readonly sidebar: ShellBag;
  readonly content: ShellBag;
}

const MODES: readonly ShellMode[] = ['narrow', 'wide'];

/** The checkbox state each mode starts in. */
export function shellChecks(state: ShellState | null | undefined): Record<ShellMode, boolean> {
  if (state === 'show') return { narrow: true, wide: true };
  if (state === 'hide') return { narrow: false, wide: false };
  return { narrow: false, wide: true };
}

export function connectShell(options: ShellOptions): ShellView {
  const { id, externalToggle = false } = options;
  const labels = { ...DEFAULT_SHELL_LABELS, ...(options.labels ?? {}) };
  const checks = shellChecks(options.state);
  const scope = { 'data-mps': SHELL_SCOPE };
  const sidebarId = `${id}-sidebar`;
  const contentId = `${id}-content`;
  const toggleId = (mode: ShellMode) => `${id}-toggle-${mode}`;
  return {
    root: {
      ...scope,
      class: 'shell',
      'data-breakpoint': options.breakpoint ?? 'md',
      'data-external-toggle': externalToggle ? '' : null,
    },
    skip: { ...scope, class: 'skip-link' },
    skipHref: `#${contentId}`,
    skipText: labels.skip,
    toggles: MODES.map((mode) => ({
      mode,
      checked: checks[mode],
      input: {
        ...scope,
        type: 'checkbox',
        id: toggleId(mode),
        class: `shell-toggle shell-toggle-${mode}`,
        'aria-label': labels.toggle,
        'aria-controls': sidebarId,
        checked: checks[mode] ? true : null,
      },
      label: {
        ...scope,
        for: toggleId(mode),
        class: `shell-hamburger shell-hamburger-${mode}`,
        title: labels.toggle,
      },
    })),
    hamburgerText: '☰',
    topbar: { ...scope, class: 'topbar', role: 'banner' },
    sidebarRoot: { ...scope, class: 'sidebar-root' },
    sidebar: { ...scope, id: sidebarId, class: 'sidebar', 'aria-label': labels.sidebar },
    content: { ...scope, id: contentId, class: 'content', role: 'main', tabindex: '0' },
  };
}

function sidebarRootOf(root: ParentNode): Element | null {
  return root.querySelector('.sidebar-root[data-mps=shell]');
}

/** Which mode the media queries resolved: read from the CSS, never re-derived. */
export function shellMode(root: ParentNode): ShellMode {
  const sidebarRoot = sidebarRootOf(root);
  if (!sidebarRoot || typeof getComputedStyle === 'undefined') return 'wide';
  return getComputedStyle(sidebarRoot).getPropertyValue('--mp-shell-wide').trim() === '1' ? 'wide' : 'narrow';
}

/** The checkbox that drives the current mode. */
export function activeShellToggle(root: ParentNode): HTMLInputElement | null {
  return root.querySelector<HTMLInputElement>(`.shell-toggle-${shellMode(root)}[data-mps=shell]`);
}

/** Whether the sidebar is open in the current mode. */
export function isShellOpen(root: ParentNode): boolean {
  return activeShellToggle(root)?.checked ?? false;
}

/** Sets both checkboxes to a state's defaults (a `state` change). */
export function applyShellState(root: ParentNode, state: ShellState | null | undefined): void {
  const checks = shellChecks(state);
  const narrow = root.querySelector<HTMLInputElement>('.shell-toggle-narrow[data-mps=shell]');
  const wide = root.querySelector<HTMLInputElement>('.shell-toggle-wide[data-mps=shell]');
  if (narrow) narrow.checked = checks.narrow;
  if (wide) wide.checked = checks.wide;
}

/**
 * Opens or closes the sidebar in the current mode, returning the new state,
 * or `null` when nothing is rendered yet.
 */
export function toggleShell(root: ParentNode, force?: boolean): boolean | null {
  const input = activeShellToggle(root);
  if (!input) return null;
  input.checked = force ?? !input.checked;
  return input.checked;
}

/**
 * `dismissOnNavigate`: whether a click should close the narrow drawer. Only a
 * link with an `href` inside the sidebar counts, unless it or a wrapper inside
 * the sidebar carries `data-no-dismiss` (a parent item that only expands a
 * sub-list). Walks the composed path, so it also sees slotted content.
 */
export function shouldDismissShell(event: Event, root: ParentNode): boolean {
  if (shellMode(root) !== 'narrow' || !isShellOpen(root)) return false;
  const path = event.composedPath();
  const sidebarIndex = path.findIndex((node) => node instanceof Element && node.matches('.sidebar[data-mps=shell]'));
  if (sidebarIndex < 0) return false;
  const within = path.slice(0, sidebarIndex).filter((node): node is Element => node instanceof Element);
  if (within.some((el) => el.hasAttribute('data-no-dismiss'))) return false;
  return within.some((el) => el.tagName === 'A' && el.hasAttribute('href'));
}

/** The skip link's click: focus the content region without touching the URL. */
export function focusShellContent(event: Event, root: ParentNode): void {
  event.preventDefault();
  root.querySelector<HTMLElement>('.content[data-mps=shell]')?.focus();
}
