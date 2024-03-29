import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss']
})
export class BsTypeaheadComponent {

  isOpen = false;
  
  suggestions$ = new BehaviorSubject<any[]>([]);
  isLoading$ = new BehaviorSubject<boolean>(false);
  showNoSuggestions$: Observable<boolean>;
  
  @ViewChild('textbox') textbox!: ElementRef<HTMLInputElement>;
  @Input() searchterm = '';
  @Input() public isLoadingText = 'Loading...';
  @Input() public noSuggestionsText = 'No suggestions found';
  @Output() public provideSuggestions = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<any>();
  @Output() searchtermChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<string>();
  
  constructor() {
    this.showNoSuggestions$ = this.suggestions$
      .pipe(map(suggestions => suggestions.length === 0));
  }

  onProvideSuggestions(value: string) {
    this.searchtermChange.emit(value);
    if (value === '') {
      this.isOpen = false;
      this.suggestions$.next([]);
    } else {
      this.isLoading$.next(true);
      this.isOpen = true;
      this.provideSuggestions.emit(value);
    }
  }

  @Input() public set suggestions(value: any[]) {
    this.isLoading$.next(false);
    this.suggestions$.next(value);
  }
  suggestionClicked(suggestion: any) {
    this.searchterm = suggestion.text;
    this.searchtermChange.emit(this.searchterm);

    this.isOpen = false;
    this.suggestionSelected.emit(suggestion);
  }

  onSubmit() {
    this.isOpen = false;
    this.submitted.emit(this.searchterm);
  }

  public focus() {
    this.textbox.nativeElement.focus();
  }

}
