import { computed, Directive, inject, input, output } from '@angular/core';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';

export type BsComboboxAutocomplete = 'none' | 'list' | 'inline' | 'both';
export type BsComboboxNavigateDirection = 'next' | 'prev' | 'first' | 'last';

@Directive({
  selector: 'input[bsCombobox]',
  exportAs: 'bsCombobox',
  host: {
    'role': 'combobox',
    '[attr.aria-autocomplete]': 'autocomplete()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'controls()',
    '[attr.aria-activedescendant]': 'activeDescendant()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsComboboxDirective {
  private dropdown = inject(BsDropdownDirective, { optional: true });

  readonly autocomplete = input<BsComboboxAutocomplete>('list');
  readonly activeDescendant = input<string | null>(null);

  readonly expanded = computed(() => this.dropdown?.isOpen() ?? false);
  readonly controls = computed(() => this.dropdown?.menuId ?? null);

  readonly navigate = output<BsComboboxNavigateDirection>();
  readonly activate = output<KeyboardEvent>();
  readonly cancel = output<KeyboardEvent>();

  onKeydown(event: KeyboardEvent): void {
    const isOpen = this.expanded();
    switch (event.key) {
      case 'ArrowDown':
        if (!isOpen) this.dropdown?.isOpen.set(true);
        else this.navigate.emit('next');
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (!isOpen) this.dropdown?.isOpen.set(true);
        else this.navigate.emit('prev');
        event.preventDefault();
        break;
      case 'Home':
        if (isOpen) {
          this.navigate.emit('first');
          event.preventDefault();
        }
        break;
      case 'End':
        if (isOpen) {
          this.navigate.emit('last');
          event.preventDefault();
        }
        break;
      case 'Escape':
        if (isOpen) {
          this.dropdown?.isOpen.set(false);
          this.cancel.emit(event);
          event.preventDefault();
        }
        break;
      case 'Enter':
        if (isOpen) {
          this.activate.emit(event);
          event.preventDefault();
        }
        break;
    }
  }
}
