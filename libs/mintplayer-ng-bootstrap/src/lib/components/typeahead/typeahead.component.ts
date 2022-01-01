import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss']
})
export class BsTypeaheadComponent {

  @Input() searchterm = '';

  //#region IsOpen
  dropdownVisible = false;
  //#endregion

  onProvideSuggestions(value: string) {
    this.searchterm = value;
    this.searchtermChange.emit(this.searchterm);

    if (this.searchterm === '') {
      this.dropdownVisible = false;
      this.suggestions = [];
    } else {
      this.dropdownVisible = true;
      this.provideSuggestions.emit(value);
    }
  }

  @Output() public provideSuggestions = new EventEmitter<string>();
  @Input() public suggestions: any[] = [];
  suggestionClicked(suggestion: any) {
    this.searchterm = suggestion.text;
    this.searchtermChange.emit(this.searchterm);

    this.dropdownVisible = false;
    this.suggestionSelected.emit(suggestion);
  }

  // Search by suggestion
  @Output() suggestionSelected = new EventEmitter<any>();
  @Output() searchtermChange = new EventEmitter<string>();

  // Search just by text
  @Output() submit = new EventEmitter<string>();
  onSubmit() {
    this.dropdownVisible = false;
    this.submit.emit(this.searchterm);
  }

  @ViewChild('textbox') textbox!: ElementRef<HTMLInputElement>;
  public focus() {
    this.textbox.nativeElement.focus();
  }
}
