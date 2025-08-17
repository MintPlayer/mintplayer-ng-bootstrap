import { AfterContentInit, Component, ContentChildren, Directive, ElementRef, forwardRef, inject, Inject, Optional, QueryList } from '@angular/core';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Directive({
  // selector: 'bs-navbar-item > a[routerLink]',
  selector: 'bs-navbar-item',
  standalone: false,
  queries: {
    childDropdowns: new ContentChildren(forwardRef(() => BsNavbarDropdownComponent))
  },
})
export class DropdownToggleDirective implements AfterContentInit {

  elementRef = inject(ElementRef<HTMLAnchorElement>);
  bsNavbarItem = inject(BsNavbarItemComponent);
  parentDropdown = inject(BsNavbarDropdownComponent, { optional: true });

  childDropdowns!: QueryList<BsNavbarDropdownComponent>;

  ngAfterContentInit() {
    if (this.bsNavbarItem.dropdowns.length > 0) {
      this.bsNavbarItem.hasDropdown = true;
    }
  }
}