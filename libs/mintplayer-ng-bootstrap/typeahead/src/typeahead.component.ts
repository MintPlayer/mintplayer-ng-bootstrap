import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsRovingFocusDirective, BsRovingFocusItemDirective } from '@mintplayer/ng-bootstrap/a11y';
import { BsComboboxDirective, BsDropdownDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsProgressComponent } from '@mintplayer/ng-bootstrap/progress-bar';

@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  imports: [
    FormsModule,
    BsFormComponent, BsFormControlDirective,
    BsDropdownDirective, BsDropdownMenuDirective, BsDropdownMenuComponent, BsDropdownItemComponent,
    BsComboboxDirective,
    BsRovingFocusDirective, BsRovingFocusItemDirective,
    BsProgressComponent, BsHasOverlayComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTypeaheadComponent {

  isOpen = model(false);

  suggestions = input<any[]>([]);
  isLoading = signal<boolean>(false);
  showNoSuggestions = computed(() => this.suggestions().length === 0);

  readonly textbox = viewChild.required<ElementRef<HTMLInputElement>>('textbox');
  readonly rovingFocus = viewChild(BsRovingFocusDirective);
  searchterm = model('');
  isLoadingText = input('Loading...');
  noSuggestionsText = input('No suggestions found');
  provideSuggestions = output<string>();
  suggestionSelected = output<any>();
  submitted = output<string>();

  constructor() {
    effect(() => {
      const suggestions = this.suggestions();
      if (suggestions) {
        this.isLoading.set(false);
      }
    });
  }

  onProvideSuggestions(value: string) {
    this.searchterm.set(value);
    if (value === '') {
      this.isOpen.set(false);
    } else {
      this.isLoading.set(true);
      this.isOpen.set(true);
      this.provideSuggestions.emit(value);
    }
  }

  suggestionClicked(suggestion: any) {
    this.searchterm.set(suggestion.text);
    this.isOpen.set(false);
    this.suggestionSelected.emit(suggestion);
  }

  onActivate() {
    const rf = this.rovingFocus();
    if (!rf) return;
    const suggestion = this.suggestions()[rf.activeIndex()];
    if (suggestion) {
      this.suggestionClicked(suggestion);
    }
  }

  onCancel() {
    // dropdown was already closed by bsCombobox; no extra work needed
  }

  onSubmit(event?: Event) {
    // Suppress browser form-submit; we own the Enter semantics here.
    event?.preventDefault();
    this.isOpen.set(false);
    this.submitted.emit(this.searchterm());
  }

  public focus() {
    this.textbox().nativeElement.focus();
  }
}
