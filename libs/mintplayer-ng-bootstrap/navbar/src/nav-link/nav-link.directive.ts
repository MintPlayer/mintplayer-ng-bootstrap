import { Directive, ElementRef, forwardRef, HostBinding, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Directive({
  selector: 'bs-navbar-item > li > a'
  // Below selector doesn't work well either (does not select the github link)
  // selector: 'bs-navbar-item > a[routerLink]'
  // Below selector seems to target other a's that aren't even remotely inside a bs-navbar-item
  // selector: 'bs-navbar-item:first-child > a'
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
    // console.log('elementref', elementRef);
  }

  @HostBinding('class.cursor-pointer') cursorPointer = true;

}