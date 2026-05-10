import { afterNextRender, contentChild, Directive, ElementRef, inject, input, model, signal } from '@angular/core';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsIdService, BsRovingFocusDirective } from '@mintplayer/ng-bootstrap/a11y';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

export type BsDropdownPopupRole = 'menu' | 'listbox';

@Directive({
  selector: '[bsDropdown]',
  exportAs: 'bsDropdown',
  host: {
    '(window:blur)': 'onBlur()',
  },
})
export class BsDropdownDirective {

  elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private bsDevelopment = inject(BS_DEVELOPMENT, { optional: true });
  private ids = inject(BsIdService);

  readonly menu = contentChild.required(BsDropdownMenuDirective);
  readonly toggle = contentChild(BsDropdownToggleDirective);
  readonly rovingFocus = contentChild(BsRovingFocusDirective, { descendants: true });

  hasBackdrop = input(false);
  sameWidth = input(false);
  closeOnClickOutside = input(true);
  sameDropdownWidth = input(false);
  isOpen = model<boolean>(false);
  readonly popupRole = input<BsDropdownPopupRole>('menu');

  /** Reactive id used for the menu's host id and for the toggle's aria-controls. Empty until afterNextRender resolves the host's static id (or generates one), so sibling host bindings on the wrapper element get a chance to land first. */
  private _menuId = signal<string>('');
  readonly menuId = this._menuId.asReadonly();

  constructor() {
    afterNextRender(() => {
      const hostId = this.elementRef.nativeElement.id;
      this._menuId.set(hostId ? `${hostId}-menu` : this.ids.next('bs-dropdown-menu'));
    });
  }

  onBlur() {
    if (this.closeOnClickOutside() && !this.bsDevelopment) {
      this.isOpen.set(false);
    }
  }
}
