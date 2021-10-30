import { AfterContentChecked, Component, ContentChildren, ElementRef, Input, OnInit, Optional, QueryList } from '@angular/core';
import { BsNavbarDropdownComponent } from '@mintplayer/ng-bootstrap';

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

  ngOnInit(): void {
  }

  ngAfterContentChecked() {
    if (this.hasDropdown) {
      (<any>window).element = this.element.nativeElement;
      this.element.nativeElement.querySelector('li a').classList.add('dropdown-toggle');

      let link = this.element.nativeElement.querySelector('li a');
      if (!link.onclick) {
        link.onclick = (ev: Event) => {
          ev.preventDefault();
          // Normally there should be only one dropdown in this list
          this.dropdowns.forEach((dropdown) => {
            if (!(dropdown.isVisible = !dropdown.isVisible)) {
              console.log('child dropdowns', dropdown.childDropdowns);
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

  @ContentChildren(BsNavbarDropdownComponent) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}
