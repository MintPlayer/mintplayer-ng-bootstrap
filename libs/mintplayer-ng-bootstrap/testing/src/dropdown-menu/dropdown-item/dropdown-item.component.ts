import { Component } from '@angular/core';
import { BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';

@Component({
  selector: 'bs-dropdown-item',
  templateUrl: './dropdown-item.component.html',
  styleUrls: ['./dropdown-item.component.scss'],
  providers: [
    { provide: BsDropdownItemComponent, useExisting: BsDropdownItemMockComponent }
  ]
})
export class BsDropdownItemMockComponent {}
