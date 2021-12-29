import { AfterContentChecked, Component, ContentChildren, ElementRef, forwardRef, Input, OnInit, Optional, QueryList } from '@angular/core';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss']
})
export class BsNavbarItemComponent implements OnInit, AfterContentChecked {

  constructor(@Optional() parentDropdown: BsNavbarDropdownComponent, private element: ElementRef) {
    this.parentDropdown = parentDropdown;
  }

  parentDropdown: BsNavbarDropdownComponent;
  hasDropdown: boolean = false;
  anchorTag: HTMLAnchorElement | null = null;

  ngOnInit(): void {
  }

  ngAfterContentChecked() {
    if (this.hasDropdown) {
      (<any>window).element = this.element.nativeElement;
      this.anchorTag = this.element.nativeElement.querySelector('li a');
      (this.anchorTag) && this.anchorTag.classList.add('dropdown-toggle');

      if (this.anchorTag && !this.anchorTag.onclick) {
        this.anchorTag.onclick = (ev: Event) => {
          ev.preventDefault();
          // Normally there should be only one dropdown in this list
          this.dropdowns.forEach((dropdown) => {
            if (!(dropdown.isVisible = !dropdown.isVisible)) {
              dropdown.childDropdowns.forEach((child) => {
                child.isVisible = false;
              });
            }
          });
          return false;
        }
      }
    }
  }

  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent)) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}