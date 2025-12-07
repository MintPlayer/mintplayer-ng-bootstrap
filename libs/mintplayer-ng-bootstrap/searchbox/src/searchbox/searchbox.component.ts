/// <reference types="../types" />

import { Component, ElementRef, EventEmitter, Input, Optional, Output, TemplateRef, ViewChild, signal, effect, untracked } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsSuggestionTemplateContext } from '../directives';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'bs-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss'],
  standalone: false,
})
export class BsSearchboxComponent<T extends HasId<U>, U> {
  constructor(@Optional() bsForm: BsFormComponent, sanitizer: DomSanitizer) {
    if (!bsForm) {
      throw '<bs-searchbox> must be inside a <bs-form>';
    }

    // Debounced effect for searchterm
    let debounceTimer: any = null;
    effect(() => {
      const searchterm = this.searchterm();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        untracked(() => {
          if (searchterm === '') {
            this.suggestionsInternal = [];
          } else {
            this.isBusy.set(true);
            this.provideSuggestions.emit(searchterm);
          }
        });
      }, 200);
    });

    import('bootstrap-icons/icons/caret-up-fill.svg').then((icon) => {
      this.caretUpFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/caret-down-fill.svg').then((icon) => {
      this.caretDownFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  caretUpFill?: SafeHtml;
  caretDownFill?: SafeHtml;
  colors = Color;
  isBusy = signal<boolean>(false);
  @ViewChild('textbox') textbox!: ElementRef<HTMLInputElement>;

  //#region isOpen
  private _isOpen = false;
  public get isOpen() {
    return this._isOpen;
  }
  @Input() public set isOpen(value: boolean) {
    const changed = (this._isOpen !== value);
    this._isOpen = value;
    if (changed && value) {
      setTimeout(() => this.textbox.nativeElement.setSelectionRange(0, -1), 20);
    }
  }
  //#endregion

  //#region suggestions
  private suggestionsInternal: T[] = [];
  public get suggestions() {
    return this.suggestionsInternal;
  }
  @Input() public set suggestions(value: T[]) {
    this.suggestionsInternal = value;
    this.isBusy.set(false);
  }
  //#endregion

  //#region selectedItem
  private _selectedItem?: T;
  public get selectedItem() {
    return this._selectedItem;
  }
  @Input() public set selectedItem(value: T | undefined) {
    this._selectedItem = value;
    this.selectedItemChange.emit(value);
  };
  @Output() selectedItemChange = new EventEmitter<T | undefined>();
  //#endregion

  //#region searchterm
  searchterm = signal<string>('');
  //#endregion

  suggestionTemplate?: TemplateRef<BsSuggestionTemplateContext<T, U>>;
  enterSearchtermTemplate?: TemplateRef<T>;
  noResultsTemplate?: TemplateRef<T>;
  @Output() provideSuggestions = new EventEmitter<string>();

  onSearchtermChange(searchterm: string) {
    this.searchterm.set(searchterm);
  }

  onSuggestionClicked(suggestion: T) {
    this.selectedItem = suggestion;
    this.isOpen = false;
    this.searchterm.set('');
  }
}
