import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
})
export class BsTypeaheadMockComponent {
  @Input() searchterm = '';
  @Output() searchtermChange = new EventEmitter<string>();
  @Output() provideSuggestions = new EventEmitter<string>();
  @Input() suggestions: any[] = [];
  @Output() submitted = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<any>();
}