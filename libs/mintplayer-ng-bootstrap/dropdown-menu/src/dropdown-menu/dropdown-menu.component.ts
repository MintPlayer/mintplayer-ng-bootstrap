import { AfterViewInit, Component, computed, contentChildren, ElementRef, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownItemComponent } from '../dropdown-item/dropdown-item.component';

@Component({
  selector: 'bs-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  styleUrls: ['./dropdown-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width]': 'dropdownWith()',
    '(window:resize)': 'onResize()',
    '[attr.role]': 'menuRole()',
    '[attr.id]': 'menuId()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsDropdownMenuComponent implements AfterViewInit {
  private bsDropdown = inject(BsDropdownDirective, { optional: true });

  readonly maxHeight = input<number | null>(null);
  dropdownWith = signal<string | null>(null);

  readonly menuRole = computed(() => this.bsDropdown?.popupRole() ?? null);
  readonly menuId = computed(() => this.bsDropdown?.menuId() || null);

  /**
   * Items projected into this menu. Used in menu mode (popupRole='menu') to
   * implement roving-tabindex keyboard navigation. In listbox mode, callers
   * (typeahead/tree-select/etc.) typically apply their own bsRovingFocus directly,
   * so this menu's keyboard handler is a no-op.
   */
  readonly dropdownItems = contentChildren(BsDropdownItemComponent, { descendants: true });

  /** True when this is a plain menu (default), false when used as a combobox listbox. */
  readonly isMenuMode = computed(() => this.bsDropdown?.popupRole() !== 'listbox');

  /** Index into dropdownItems() of the item that currently holds the roving tabindex (menu mode). */
  readonly focusedIndex = signal<number>(0);

  isItemFocused(item: BsDropdownItemComponent): boolean {
    if (!this.isMenuMode()) return false;
    return this.dropdownItems()[this.focusedIndex()] === item;
  }

  setFocusedItem(item: BsDropdownItemComponent) {
    if (!this.isMenuMode()) return;
    const idx = this.dropdownItems().indexOf(item);
    if (idx >= 0) this.focusedIndex.set(idx);
  }

  onResize() {
    if ((typeof window !== 'undefined') && this.bsDropdown && this.bsDropdown.sameDropdownWidth()) {
      const element = this.bsDropdown.elementRef.nativeElement;
      this.dropdownWith.set(window.getComputedStyle(element).width);
    }
  }

  ngAfterViewInit() {
    this.onResize();
  }

  onKeydown(event: KeyboardEvent) {
    if (!this.isMenuMode()) return;
    const items = this.dropdownItems();
    if (items.length === 0) return;

    let handled = false;
    switch (event.key) {
      case 'ArrowDown':
        this.moveFocus(+1);
        handled = true;
        break;
      case 'ArrowUp':
        this.moveFocus(-1);
        handled = true;
        break;
      case 'Home':
        this.moveTo(this.firstEnabledIndex());
        handled = true;
        break;
      case 'End':
        this.moveTo(this.lastEnabledIndex());
        handled = true;
        break;
    }
    if (handled) event.preventDefault();
  }

  private moveFocus(delta: 1 | -1): void {
    const items = this.dropdownItems();
    const total = items.length;
    if (total === 0) return;
    let cursor = this.focusedIndex();
    for (let i = 0; i < total; i++) {
      cursor = (cursor + delta + total) % total;
      if (!items[cursor].disabled()) {
        this.moveTo(cursor);
        return;
      }
    }
  }

  private firstEnabledIndex(): number {
    return this.dropdownItems().findIndex(it => !it.disabled());
  }

  private lastEnabledIndex(): number {
    const items = this.dropdownItems();
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].disabled()) return i;
    }
    return -1;
  }

  private moveTo(index: number): void {
    if (index < 0) return;
    this.focusedIndex.set(index);
    const target = this.dropdownItems()[index];
    if (target) {
      target.elementRef.nativeElement.focus();
    }
  }
}
