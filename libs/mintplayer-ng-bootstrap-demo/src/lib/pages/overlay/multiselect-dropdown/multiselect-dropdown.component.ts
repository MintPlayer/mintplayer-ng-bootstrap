import { Component } from '@angular/core';

@Component({
  selector: 'demo-multiselect-dropdown',
  templateUrl: './multiselect-dropdown.component.html',
  styleUrls: ['./multiselect-dropdown.component.scss']
})
export class MultiselectDropdownComponent {

  availableItems = ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink'];
  selectedItems: string[] = [];

}
