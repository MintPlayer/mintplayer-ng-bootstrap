import { afterNextRender, Component, computed, ElementRef, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsDropdownMenuComponent } from '../dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'bs-dropdown-item',
  templateUrl: './dropdown-item.component.html',
  styleUrls: ['./dropdown-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'itemRole()',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'tabindex()',
    '(focus)': 'onFocus()',
    '(keydown.enter)': 'onActivate($event)',
    '(keydown.space)': 'onActivate($event)',
  },
})
export class BsDropdownItemComponent {
  private parent = inject(BsDropdownDirective, { optional: true });
  private menu = inject(BsDropdownMenuComponent, { optional: true });
  /** Public so BsDropdownMenuComponent can imperatively focus this item during keyboard nav. */
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);

  readonly isSelected = input(false);
  readonly disabled = input(false);

  readonly itemRole = computed(() =>
    this.parent?.popupRole() === 'listbox' ? 'option' : 'menuitem');

  readonly ariaSelected = computed(() => {
    if (this.parent?.popupRole() !== 'listbox') return null;
    return this.isSelected() ? 'true' : 'false';
  });

  /**
   * Roving tabindex in menu mode: the focused item is 0, others -1.
   * In listbox mode (typeahead/select2/etc.), the consumer applies bsRovingFocusItem
   * externally for activedescendant management; this binding stays null so it
   * doesn't fight that directive.
   */
  readonly tabindex = computed<number | null>(() => {
    if (!this.menu?.isMenuMode()) return null;
    if (this.disabled()) return -1;
    return this.menu.isItemFocused(this) ? 0 : -1;
  });

  /**
   * Resolved after first render so static `id="…"` attributes set by the consumer
   * and any sibling host bindings have applied first. Read-only access for any
   * other directive on the same element (e.g. BsRovingFocusItem) that needs a
   * stable target id for aria-activedescendant.
   */
  get itemId(): string {
    return this.elementRef.nativeElement.id;
  }

  constructor() {
    afterNextRender(() => {
      if (!this.elementRef.nativeElement.id) {
        this.elementRef.nativeElement.id = this.ids.next('bs-dropdown-item');
      }
    });
  }

  onFocus() {
    this.menu?.setFocusedItem(this);
  }

  onActivate(event: Event) {
    if (this.disabled()) return;
    event.preventDefault();
    this.elementRef.nativeElement.click();
  }
}
