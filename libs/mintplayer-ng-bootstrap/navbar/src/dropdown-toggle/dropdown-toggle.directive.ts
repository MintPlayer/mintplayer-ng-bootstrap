import { AfterContentInit, ContentChildren, Directive, ElementRef, forwardRef, inject, QueryList } from '@angular/core';
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

  private elementRef = inject<ElementRef<HTMLAnchorElement>>(ElementRef);
  private bsNavbarItem = inject<BsNavbarItemComponent>(forwardRef(() => BsNavbarItemComponent));

  childDropdowns!: QueryList<BsNavbarDropdownComponent>;

  ngAfterContentInit() {
    if (this.bsNavbarItem.dropdowns().length > 0) {
      this.bsNavbarItem.hasDropdown = true;
    }
  }
}