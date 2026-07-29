import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { BS_DROPDOWN_MENU_CONTEXT } from '@mintplayer/ng-bootstrap/dropdown-menu';

/**
 * `<bs-navbar-item>` — one navbar entry, uniform at EVERY nesting level.
 *
 * Wraps a consumer light-DOM link: project an `<a routerLink>` / `<a href>` (or
 * a `<button>`) as content. The rendered shape is context-aware:
 *
 *  - **Directly in the navbar** (top level, or inside `<bs-navbar-nav>`): wraps
 *    the link in `<mp-navbar-item>`, which styles it as a `.nav-link` in its
 *    own shadow.
 *  - **Inside a dropdown** (`<bs-navbar-dropdown>` / `<bs-dropdown-menu>`,
 *    detected via `BS_DROPDOWN_MENU_CONTEXT`): the HOST itself becomes the
 *    `.dropdown-item` — the shape `mp-dropdown-menu` queries (roving tabindex,
 *    `role=menuitem` on the inner control) and styles via
 *    `::slotted(.dropdown-item)`. The link stays a DIRECT child of the host so
 *    the menu wrapper's companion `.dropdown-item > a` reset reaches it
 *    (`NgTemplateOutlet` through `<ng-container>` adds no wrapper element).
 *
 * `active` / `disabled` bridge to the WC's presence attributes (nav mode) or
 * Bootstrap's item classes + `aria-disabled` (menu mode).
 */
@Component({
  selector: 'bs-navbar-item',
  template: `
    <ng-template #content><ng-content></ng-content></ng-template>
    @if (inMenu) {
      <ng-container [ngTemplateOutlet]="content" />
    } @else {
      <mp-navbar-item role="listitem" [attr.active]="activeAttr()" [attr.disabled]="disabledAttr()">
        <ng-container [ngTemplateOutlet]="content" />
      </mp-navbar-item>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgTemplateOutlet],
  host: {
    '[class.dropdown-item]': 'inMenu',
    '[class.active]': 'inMenu && active()',
    '[class.disabled]': 'inMenu && disabled()',
    '[attr.aria-disabled]': "inMenu && disabled() ? 'true' : null",
  },
})
export class BsNavbarItemComponent {
  readonly active = input(false);
  readonly disabled = input(false);

  /** Menu mode when authored inside a dropdown; fixed per instance. */
  protected readonly inMenu = inject(BS_DROPDOWN_MENU_CONTEXT, { optional: true }) ?? false;

  /** Presence attributes: `''` when set, `null` when absent. */
  protected readonly activeAttr = computed(() => (this.active() ? '' : null));
  protected readonly disabledAttr = computed(() => (this.disabled() ? '' : null));
}
