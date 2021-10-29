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
    }
  }

  @ContentChildren(BsNavbarDropdownComponent) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}
