// Shared helpers for the mp-card* WC family.
//
// The family extends plain HTMLElement, not LitElement — and this is a
// deliberate divergence from dock/ribbon/otp-input. LitElement's `render()`
// REPLACES the host's children on every update, so light-DOM composition
// (`createRenderRoot() { return this; }`) with slotted children does not
// survive a re-render. Plain HTMLElement + classList manipulation in
// connectedCallback / attributeChangedCallback gives the same reactive
// surface for purely structural elements without that pitfall.
// Trap: a future maintainer who "consistency-fixes" to LitElement reintroduces
// the slotted-children-clobbering bug. See docs/issue_308_PRD.md §Chosen
// Design (light DOM) for the upstream rationale.

// Color tokens accepted on `[color]` attributes across the card WC family.
// Mirrors libs/mintplayer-ng-bootstrap/src/lib/enums/color.enum.ts as string
// literals — the WC layer is framework-agnostic and reads attribute strings,
// while the Angular wrapper resolves the numeric enum into the matching
// token via `Color[value]`. The trio `body`/`white`/`transparent` have no
// upstream `text-bg-*` definition; mp-card.element.scss fills those in.
export const COLOR_NAMES = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
  'body',
  'white',
  'transparent',
] as const;

export type CardColorName = (typeof COLOR_NAMES)[number];

export function isCardColorName(value: string | null | undefined): value is CardColorName {
  return value !== null && value !== undefined && (COLOR_NAMES as readonly string[]).includes(value);
}

/**
 * Remove every class on `el` whose name starts with `prefix` (e.g.
 * `text-bg-`, `border-`). Used to clear a previous colour selection before
 * applying the new one.
 */
export function clearPrefixedClasses(el: HTMLElement, prefix: string): void {
  // Snapshot via Array.from — DOMTokenList is live and the loop would skip
  // entries as we remove them.
  const classes = Array.from(el.classList);
  for (const cls of classes) {
    if (cls.startsWith(prefix)) el.classList.remove(cls);
  }
}

/**
 * Apply the card root's colour contract to an element: `text-bg-<name>` for
 * the filled variant, or `border border-<name> bg-transparent` for outline.
 * Used by both `mp-card` and the Angular `bs-card` wrapper so both layers
 * stay byte-identical without each duplicating the bootstrap-utility logic.
 */
export function applyCardColorClasses(
  el: HTMLElement,
  color: string | null,
  outline: boolean,
): void {
  clearPrefixedClasses(el, 'text-bg-');
  clearPrefixedClasses(el, 'border-');
  el.classList.remove('border', 'bg-transparent');
  if (!isCardColorName(color)) return;
  if (outline) {
    el.classList.add('border', `border-${color}`, 'bg-transparent');
  } else {
    el.classList.add(`text-bg-${color}`);
  }
}

/**
 * Apply the `text-bg-<name>` background to `el`, clearing any prior value.
 * Used by the header / footer Bootstrap-classed regions, which don't have an
 * outline mode upstream.
 */
export function applyTextBgClass(el: HTMLElement, color: string | null): void {
  clearPrefixedClasses(el, 'text-bg-');
  if (isCardColorName(color)) el.classList.add(`text-bg-${color}`);
}

/**
 * Apply `card-header-tabs` or `card-header-pills` to the first slotted
 * `nav` / `ul` / `.nav` inside `host`. The header element observes child
 * changes and re-invokes this on mutation, so a nav inserted lazily (e.g.
 * via an Angular `@if`) still receives the right class.
 *
 * The `.nav` selector covers Bootstrap's `<div class="nav">` and
 * `<span class="nav">` forms, where the tag is incidental and the `nav`
 * class carries the semantics.
 */
export function applyHeaderNavStyle(
  host: HTMLElement,
  style: 'tabs' | 'pills' | null,
): void {
  const target = host.querySelector('nav, ul, .nav');
  if (!target) return;
  target.classList.remove('card-header-tabs', 'card-header-pills');
  if (style === 'tabs') target.classList.add('card-header-tabs');
  else if (style === 'pills') target.classList.add('card-header-pills');
}

/**
 * True if any of `nodes` is an Element that would qualify as a slotted
 * nav target (`nav` / `ul` tag, or anything carrying the `nav` class).
 * Used by the header's MutationObserver to skip the full re-walk when the
 * mutation only touches non-nav content.
 */
export function isNavTargetNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return node.tagName === 'NAV' || node.tagName === 'UL' || node.classList.contains('nav');
}
