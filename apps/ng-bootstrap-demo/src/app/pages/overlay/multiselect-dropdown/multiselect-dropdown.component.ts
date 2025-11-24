import { Component } from '@angular/core';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsMultiselectModule } from '@mintplayer/ng-bootstrap/multiselect';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-multiselect-dropdown',
  templateUrl: './multiselect-dropdown.component.html',
  styleUrls: ['./multiselect-dropdown.component.scss'],
  imports: [BsFormModule, BsMultiselectModule, FocusOnLoadDirective]
})
export class MultiselectDropdownComponent {

  availableItems = ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink'];
  selectedItems: string[] = [];

}
