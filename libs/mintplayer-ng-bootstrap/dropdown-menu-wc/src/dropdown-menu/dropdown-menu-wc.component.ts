import { afterNextRender, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';
import type { DropdownMode, DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';

/**
 * `<bs-dropdown-wc-menu>` — Angular wrapper around the `<mp-dropdown-menu>` web
 * component.
 *
 * Keyboard navigation, roving tabindex, the ARIA roles and the
 * theme-aware styling all live in the WC (single source of UI truth). This
 * wrapper only bridges inputs to attributes and projects items/dividers/headers
 * into the WC's default slot.
 *
 * The WC is registered **client-side only** (`afterNextRender`); on the server
 * Angular emits a bare `<mp-dropdown-menu>` tag and the SSR layer injects its
 * Declarative Shadow DOM (see `injectMpDropdownDsd`), so it renders with JS off.
 *
 * Distinct selector from the legacy `bs-dropdown-menu`
 * (`@mintplayer/ng-bootstrap/dropdown-menu`) to avoid a collision.
 */
@Component({
  selector: 'bs-dropdown-wc-menu',
  templateUrl: './dropdown-menu-wc.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // The COMPANION light-DOM sheet: the one thing the menu's shadow `::slotted`
  // rules cannot reach is a nested `<a>`/`<button>` inside an item. Ship it as an
  // un-encapsulated (global, class-scoped) rule so the link fills the padded item
  // box and inherits its color — the whole row navigates, like Bootstrap. The
  // `--bs-dropdown-item-padding-*` tokens inherit out of the menu's shadow through
  // the flat tree (fallbacks cover standalone use).
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .dropdown-item > a,
    .dropdown-item > button {
      display: block;
      width: auto;
      margin: calc(-1 * var(--bs-dropdown-item-padding-y, 0.25rem)) calc(-1 * var(--bs-dropdown-item-padding-x, 1rem));
      padding: var(--bs-dropdown-item-padding-y, 0.25rem) var(--bs-dropdown-item-padding-x, 1rem);
      color: inherit;
      text-decoration: none;
      text-align: inherit;
      background: none;
      border: 0;
      font: inherit;
    }
  `],
})
export class BsDropdownMenuWc {
  /** `menu` (default, roving-tabindex nav) | `listbox` (consumer manages focus). */
  readonly mode = input<DropdownMode>('menu');
  /** Pixel cap on the menu height; scrolls beyond. */
  readonly maxHeight = input<number>();
  /** Id of an external label, set as `aria-labelledby` on the WC's list. */
  readonly labelId = input<string>();

  /** Fires when an enabled item is activated (re-emits the WC's `select`). */
  readonly select = output<DropdownSelectEventDetail>();

  /** `max-height` attribute is numeric-or-absent; derive once via a signal. */
  protected readonly maxHeightAttr = computed(() => {
    const value = this.maxHeight();
    return value === undefined ? null : `${value}`;
  });

  protected readonly labelIdAttr = computed(() => this.labelId() ?? null);

  protected onSelect(event: Event) {
    // The WC's `select` is a general-purpose DOM event (bubbles + composed).
    // The public Angular API is this typed `output()`, so consume the raw
    // event here. Without `stopPropagation` it keeps bubbling to the consumer's
    // `<bs-dropdown-wc-menu>` host, where their `(select)` binding fires a
    // SECOND time with the raw `CustomEvent` (Angular doesn't unwrap `.detail`).
    event.stopPropagation();
    this.select.emit((event as CustomEvent<DropdownSelectEventDetail>).detail);
  }

  constructor() {
    afterNextRender(() => {
      // Side-effect import registers <mp-dropdown-menu> and friends; client-only
      // so SSR stays a bare tag for DSD injection.
      import('@mintplayer/web-components/dropdown-menu');
    });
  }
}
