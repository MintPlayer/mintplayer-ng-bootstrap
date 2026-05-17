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
