import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import {
  DROPDOWN_MENU_SCOPE,
  attachDropdownMenu,
  connectDropdownMenu,
  dropdownMenuScopedStyles,
  type DropdownSelectEventDetail,
} from '@mintplayer/ui-core/dropdown-menu';
import { BS_DROPDOWN_MENU_CONTEXT } from '../tokens/menu-context.token';

/**
 * `<bs-dropdown-menu>` — a Bootstrap `.dropdown-menu` list (#437). Used
 * standalone, projected through `*bsDropdownMenu` by the `[bsDropdown]`
 * trigger stack. Menu only: the typeahead renders its own listbox, and the
 * navbar renders its own navigation panels.
 *
 * Renders the markup of `@mintplayer/ui-core/dropdown-menu` in its own
 * template: a `<ul>` around the projected `[bsDropdownItem]` /
 * `[bsDropdownDivider]` / `[bsDropdownHeader]` `<li>`s. Once hydrated, the
 * core's attachment adds the menu roles, the roving tabindex, the arrow keys
 * and the `select` output; the server output is a plain list of links, which
 * is valid and works with JavaScript off.
 *
 * A consumer's `aria-*`, `role` and `id` on `bs-dropdown-menu` reach the list.
 */
@Component({
  selector: 'bs-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  imports: [BsForwardAriaDirective, MpPropsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Marks content authored between these tags as "inside a menu" so
  // context-aware children render their dropdown-item shape.
  providers: [{ provide: BS_DROPDOWN_MENU_CONTEXT, useValue: true }],
})
export class BsDropdownMenuComponent {
  /** Pixel cap on the menu height; scrolls beyond. */
  readonly maxHeight = input<number>();

  /** Fires when an enabled item is activated. */
  readonly select = output<DropdownSelectEventDetail>();

  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');
  private readonly hydrated = signal(false);

  protected readonly bag = computed(() => connectDropdownMenu({ hydrated: this.hydrated() }));
  protected readonly maxHeightCss = computed(() => {
    const value = this.maxHeight();
    return value === undefined ? null : `${value}px`;
  });

  constructor() {
    useScopedStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.hydrated.set(true);
      const dispose = attachDropdownMenu(this.menu().nativeElement, {
        onSelect: (detail) => this.select.emit(detail),
      });
      destroyRef.onDestroy(dispose);
    });
  }
}
