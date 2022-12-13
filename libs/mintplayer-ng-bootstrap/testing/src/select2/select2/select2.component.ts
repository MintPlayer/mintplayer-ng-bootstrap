import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'bs-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss'],
})
export class BsSelect2Component {
  @Input() public selectedItems: any[] = [];
  @Input() public suggestions: any[] = [];
  @Output() public provideSuggestions = new EventEmitter<string>();
}
