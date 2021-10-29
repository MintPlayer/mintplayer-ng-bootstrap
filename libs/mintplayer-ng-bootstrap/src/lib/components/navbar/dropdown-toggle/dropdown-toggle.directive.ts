import { AfterContentInit, ContentChildren, Directive, ElementRef, Inject, Optional, QueryList } from '@angular/core';
import { BsNavbarItemComponent } from '@mintplayer/ng-bootstrap';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Directive({
  // selector: 'bs-navbar-item > a[routerLink]',
  selector: 'bs-navbar-item',
  queries: {
    childDropdowns: new ContentChildren(BsNavbarDropdownComponent)
  }
})
export class DropdownToggleDirective implements AfterContentInit {

  constructor(
    private elementRef: ElementRef<HTMLAnchorElement>,
    private bsNavbarItem: BsNavbarItemComponent,
    @Optional() parentDropdown: BsNavbarDropdownComponent
  ) {
    console.log('elementRef', elementRef);
    console.log('navbar item', bsNavbarItem);
    
    // if (bsNavbarItem..length > 0) {
    //   elementRef.nativeElement.classList.add('dropdown-toggle')
    // }
  }

  childDropdowns!: QueryList<BsNavbarDropdownComponent>;

  ngAfterContentInit() {
    // setTimeout(() => {
      console.log('child dropdowns', this.childDropdowns.length);
    // }, 50);
  }
}
