import { AfterContentChecked, Component, ContentChildren, ElementRef, forwardRef, Optional, QueryList } from '@angular/core';
import { BsNavbarComponent } from '../../navbar/navbar/navbar.component';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss']
})
export class BsNavbarItemComponent implements AfterContentChecked {

  constructor(private navbar: BsNavbarComponent, @Optional() parentDropdown: BsNavbarDropdownComponent, private element: ElementRef) {
    this.parentDropdown = parentDropdown;
  }

  parentDropdown: BsNavbarDropdownComponent;
  hasDropdown = false;
  anchorTag: HTMLAnchorElement | null = null;
  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent)) dropdowns!: QueryList<BsNavbarDropdownComponent>;

  ngAfterContentChecked() {
    this.anchorTag = this.element.nativeElement.querySelector('li a');

    if (this.hasDropdown) {
      (this.anchorTag) && this.anchorTag.classList.add('dropdown-toggle');

      if (this.anchorTag && !this.anchorTag.getAttribute('close-init-b')) {
        this.anchorTag.setAttribute('close-init-b', '1');
        this.anchorTag.addEventListener('click', (ev: MouseEvent) => {
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
        });
      }
    } else {

      // Close if this is a link
      if ((this.dropdowns.length === 0) && this.anchorTag && !this.anchorTag.getAttribute('close-init-a')) {
        this.anchorTag.setAttribute('close-init-a', '1');
        this.anchorTag.addEventListener('click', (ev: MouseEvent) => {
          let d = this.parentDropdown;
          while (d && d.autoclose) {
            d.isVisible = false;
            d = d.parentDropdown;
          }
          if (this.navbar.autoclose) {
            this.navbar.isExpanded$.next(false);
          }
        });
      }

    }
  }
}
