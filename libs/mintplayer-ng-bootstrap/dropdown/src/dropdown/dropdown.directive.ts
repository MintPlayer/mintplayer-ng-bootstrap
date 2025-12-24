import { ContentChild, Directive, effect, ElementRef, HostListener, inject, input, model, Optional } from '@angular/core';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

@Directive({
  selector: '[bsDropdown]',
  standalone: false,
})
export class BsDropdownDirective {

  elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private bsDevelopment = inject(BS_DEVELOPMENT, { optional: true });

  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle: BsDropdownToggleDirective | null = null;

  hasBackdrop = input(false);
  sameWidth = input(false);
  closeOnClickOutside = input(true);
  sameDropdownWidth = input(false);
  isOpen = model<boolean>(false);

  @HostListener('window:blur') onBlur() {
    if (this.closeOnClickOutside() && !this.bsDevelopment) {
      this.isOpen.set(false);
    }
  }
}
