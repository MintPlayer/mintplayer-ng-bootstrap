import { computed, Directive, inject, input, output } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

export type BsComboboxAutocomplete = 'none' | 'list' | 'inline' | 'both';
export type BsComboboxNavigateDirection = 'next' | 'prev' | 'first' | 'last';

/**
 * APG Combobox pattern — turns a plain `<input>` into a combobox that drives
 * an adjacent `bsDropdown` popup (typeahead, tree-select, etc.).
 *
 * The directive owns the input-side ARIA wiring:
 * - `role="combobox"` on the host
 * - `aria-expanded` / `aria-controls` derived from the parent dropdown
 * - `aria-activedescendant` mirroring the dropdown's `bsRovingFocus` active id
 * - `aria-autocomplete` (defaults to `"list"`)
 *
 * Keyboard model:
 * - **ArrowUp/Down/Home/End** — opens the popup if closed; once open,
 *   forwards to the dropdown's `bsRovingFocus` (or emits a `navigate` event
 *   if no roving-focus is found, so consumers can manage navigation manually).
 * - **Enter** — fires `activate` so the consumer can commit the highlighted
 *   option. `stopImmediatePropagation` is called to keep sibling
 *   `(keydown.enter)` listeners on the same input (e.g. "submit free-text
 *   search") from also firing on the same Enter.
 * - **Escape** — closes the popup and fires `cancel`.
 * - **Tab** — hybrid behaviour: while the popup is open and a roving-focus
 *   is present, Tab advances the active descendant; at the boundary, Tab
 *   closes the popup and falls through to the browser's default tab order.
 */
@Directive({
  selector: 'input[bsCombobox]',
  exportAs: 'bsCombobox',
  host: {
    'role': 'combobox',
    '[attr.aria-autocomplete]': 'autocomplete()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'controls()',
    '[attr.aria-activedescendant]': 'resolvedActiveDescendant()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsComboboxDirective {
  private dropdown = inject(BsDropdownDirective, { optional: true });

  /** Aliased to bsComboboxAutocomplete to avoid colliding with the host input's native HTML autocomplete attribute. */
  readonly autocomplete = input<BsComboboxAutocomplete>('list', { alias: 'bsComboboxAutocomplete' });
  /** Override the auto-derived activeDescendant. Defaults to dropdown.rovingFocus()'s id when present. */
  readonly activeDescendant = input<string | null>(null);

  readonly expanded = computed(() => this.dropdown?.isOpen() ?? false);
  readonly controls = computed(() => this.dropdown?.menuId() || null);
  readonly resolvedActiveDescendant = computed(() =>
    this.activeDescendant() ?? this.dropdown?.rovingFocus()?.activeDescendantId() ?? null);

  /** Fires only when no BsRovingFocus is found inside the parent dropdown — otherwise arrow keys are forwarded automatically. */
  readonly navigate = output<BsComboboxNavigateDirection>();
  readonly activate = output<KeyboardEvent>();
  readonly cancel = output<KeyboardEvent>();

  onKeydown(event: KeyboardEvent): void {
    // Skip browser/OS chords on the navigation keys; Tab is exempt because Shift+Tab is a legit chord
    // and Ctrl/Alt/Meta+Tab don't reach JS in any browser.
    if (event.key !== 'Tab' && (event.altKey || event.ctrlKey || event.metaKey)) return;
    const isOpen = this.expanded();
    const rf = this.dropdown?.rovingFocus();
    switch (event.key) {
      case 'ArrowDown':
        if (!isOpen) this.dropdown?.isOpen.set(true);
        else if (rf) rf.next();
        else this.navigate.emit('next');
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (!isOpen) this.dropdown?.isOpen.set(true);
        else if (rf) rf.prev();
        else this.navigate.emit('prev');
        event.preventDefault();
        break;
      case 'Home':
        if (isOpen) {
          if (rf) rf.focusFirst();
          else this.navigate.emit('first');
          event.preventDefault();
        }
        break;
      case 'End':
        if (isOpen) {
          if (rf) rf.focusLast();
          else this.navigate.emit('last');
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
          // Sibling listeners on the same input (e.g. a host-template
          // (keydown.enter) for "submit free-text search") must not also
          // fire when this Enter activated a suggestion — otherwise the
          // queued keyup of the alert-dismiss Enter would re-trigger them.
          event.stopImmediatePropagation();
        }
        break;
      case 'Tab':
        // Hybrid combobox TAB: when the popup is open and a roving-focus is
        // present, TAB advances the active descendant (focus stays in the
        // input). At the boundary, close the popup and fall through to the
        // browser's default tab traversal so focus exits the combobox.
        if (!isOpen || !rf) break;
        if (event.shiftKey) {
          if (rf.activeIndex() <= rf.firstEnabledIndex()) {
            this.dropdown?.isOpen.set(false);
          } else {
            rf.prev();
            event.preventDefault();
          }
        } else {
          if (rf.activeIndex() >= rf.lastEnabledIndex()) {
            this.dropdown?.isOpen.set(false);
          } else {
            rf.next();
            event.preventDefault();
          }
        }
        break;
    }
  }
}
