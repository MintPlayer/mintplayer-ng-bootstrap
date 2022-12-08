import { Directive, ElementRef, forwardRef, Inject, Optional } from '@angular/core';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Directive({
  selector: 'bs-navbar-item > a[routerLink]'
})
export class NavLinkDirective {

  constructor(
    private elementRef: ElementRef<HTMLAnchorElement>,
    @Optional() @Inject(forwardRef(() => BsNavbarDropdownComponent)) parentDropdown: BsNavbarDropdownComponent
  ) {
    if (parentDropdown == null) {
      this.elementRef.nativeElement.classList.add('nav-link');
    } else {
      this.elementRef.nativeElement.classList.add('dropdown-item');
    }
  }

}