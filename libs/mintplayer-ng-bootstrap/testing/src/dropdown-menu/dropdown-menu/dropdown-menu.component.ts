import { Component } from '@angular/core';
import { BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';

@Component({
  selector: 'bs-dropdown-menu',
  templateUrl: './dropdown-menu.component.html',
  styleUrls: ['./dropdown-menu.component.scss'],
  providers: [
    { provide: BsDropdownMenuComponent, useExisting: BsDropdownMenuMockComponent }
  ],
})
export class BsDropdownMenuMockComponent {}
