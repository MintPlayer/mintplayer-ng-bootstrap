import { Directive, ElementRef } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownToggle]',
  host: {
    '[attr.aria-haspopup]': 'dropdown.popupRole()',
    '[attr.aria-expanded]': 'dropdown.isOpen()',
    '[attr.aria-controls]': 'dropdown.menuId() || null',
    '(click)': 'onClick()',
    '(keydown.arrowdown)': 'onArrowDown($event)',
  },
})
export class BsDropdownToggleDirective {

  constructor(
    public dropdown: BsDropdownDirective,
    toggleButton: ElementRef) {
      this.toggleButton = toggleButton;
    }

  toggleButton: ElementRef;

  onClick() {
    this.dropdown.isOpen.set(!this.dropdown.isOpen());
  }

  /**
   * APG menu button: ArrowDown opens the menu AND moves focus into it, so the
   * next arrow press navigates items instead of scrolling the page. Focus entry
   * goes through the roving directive when one is present — it owns which item
   * is the tab stop.
   */
  onArrowDown(event: Event) {
    event.preventDefault();
    if (!this.dropdown.isOpen()) this.dropdown.isOpen.set(true);
    setTimeout(() => {
      const roving = this.dropdown.rovingFocus();
      if (roving) {
        roving.focusFirst();
        return;
      }
      const menu = this.dropdown.elementRef.nativeElement.querySelector<HTMLElement>(
        '[role="menu"] [role="menuitem"], .dropdown-item',
      );
      menu?.focus();
    });
  }
}
