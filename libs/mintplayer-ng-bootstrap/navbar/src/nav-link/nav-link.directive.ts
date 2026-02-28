import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: 'bs-navbar-item > li > a',
  // Below selector doesn't work well either (does not select the github link)
  // selector: 'bs-navbar-item > a[routerLink]'
  // Below selector seems to target other a's that aren't even remotely inside a bs-navbar-item
  // selector: 'bs-navbar-item:first-child > a'
  standalone: true,
  host: {
    '[class.cursor-pointer]': 'cursorPointer',
  },
})
export class NavLinkDirective {

  private elementRef = inject<ElementRef<HTMLAnchorElement>>(ElementRef);
  private parentNavbar = inject(BsNavbarComponent, { optional: true });
  private parentDropdown = inject<BsNavbarDropdownComponent>(forwardRef(() => BsNavbarDropdownComponent), { optional: true });

  cursorPointer: boolean;

  constructor() {
    if (this.parentNavbar) {
      if (this.parentDropdown == null) {
        this.elementRef.nativeElement.classList.add('nav-link');
      } else {
        this.elementRef.nativeElement.classList.add('dropdown-item');
      }
    }
    this.cursorPointer = !!this.parentNavbar;
  }

}
