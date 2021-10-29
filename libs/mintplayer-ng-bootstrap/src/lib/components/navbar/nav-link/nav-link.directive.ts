import { Directive, ElementRef, Optional } from '@angular/core';
import { BsNavbarDropdownComponent } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: 'bs-navbar-item > a[routerLink]'
})
export class NavLinkDirective {

  constructor(private elementRef: ElementRef<HTMLAnchorElement>, @Optional() parentDropdown: BsNavbarDropdownComponent) {
    if (parentDropdown == null) {
      console.log('add nav-link class');
      this.elementRef.nativeElement.classList.add('nav-link');
    } else {
      console.log('add dropdown-item class');
      this.elementRef.nativeElement.classList.add('dropdown-item');
    }
  }

}
