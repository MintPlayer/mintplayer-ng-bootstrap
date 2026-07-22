import { afterNextRender, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import type { NavbarBreakpoint, NavbarExpandedChangeEventDetail } from '@mintplayer/web-components/navbar';

/**
 * `<bs-navbar>` — Angular wrapper around the `<mp-navbar>` web component.
 *
 * Layout, the responsive collapse behaviour, the pure-CSS no-JS toggle and the
 * theme-aware styling all live in the WC (single source of UI truth). This
 * wrapper only bridges inputs to attributes and projects content into the WC's
 * slots:
 *  - mark the brand with `bs-navbar-brand` (→ `slot="brand"`);
 *  - left-aligned items go in the default slot;
 *  - right-aligned items get `slot="end"`.
 *
 * The WC is registered **client-side only** (`afterNextRender`); on the server
 * Angular emits a bare `<mp-navbar>` tag and the SSR layer injects its
 * Declarative Shadow DOM (see `injectMpNavbarDsd`), so it renders with JS off.
 */
@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsNavbarComponent {
  /** Bootstrap breakpoint the navbar expands at; collapses below it. */
  readonly breakpoint = input<NavbarBreakpoint>('md');
  /** Theme color of the navbar background (e.g. `primary`, `dark`, `body-tertiary`). */
  readonly color = input<string>();
  /** Accessible label for the `<nav>` landmark. */
  readonly ariaLabel = input<string>();
  /** Whether the collapse is (visually) expanded; reflected to the WC. */
  readonly expanded = input(false);

  /** Fires when the collapse toggles (re-emits the WC's `expandedchange`). */
  readonly expandedchange = output<NavbarExpandedChangeEventDetail>();

  /** String-or-absent attributes derived once via signals. */
  protected readonly colorAttr = computed(() => this.color() ?? null);
  protected readonly ariaLabelAttr = computed(() => this.ariaLabel() ?? null);
  /** Presence attribute: `''` when expanded, `null` when collapsed. */
  protected readonly expandedAttr = computed(() => (this.expanded() ? '' : null));

  protected onExpandedchange(event: Event) {
    // The WC's `expandedchange` is a general-purpose DOM event (bubbles +
    // composed). The public Angular API is this typed `output()`, so consume
    // the raw event here. Without `stopPropagation` it keeps bubbling to the
    // consumer's `<bs-navbar>` host, where their `(expandedchange)` binding
    // fires a SECOND time with the raw `CustomEvent` (Angular doesn't unwrap
    // `.detail`).
    event.stopPropagation();
    this.expandedchange.emit((event as CustomEvent<NavbarExpandedChangeEventDetail>).detail);
  }

  constructor() {
    afterNextRender(() => {
      // Side-effect import registers <mp-navbar> and friends; client-only so
      // SSR stays a bare tag for DSD injection.
      import('@mintplayer/web-components/navbar');
    });
  }
}
