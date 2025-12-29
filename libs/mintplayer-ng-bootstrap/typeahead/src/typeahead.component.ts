import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';

let typeaheadIdCounter = 0;

@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsDropdownModule, BsDropdownMenuModule, BsProgressBarModule, BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTypeaheadComponent {

  isOpen = signal(false);
  listboxId = `typeahead-listbox-${typeaheadIdCounter++}`;

  suggestions = input<any[]>([]);
  isLoading = signal<boolean>(false);
  showNoSuggestions = computed(() => this.suggestions().length === 0);

  @ViewChild('textbox') textbox!: ElementRef<HTMLInputElement>;
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

  onSubmit() {
    this.isOpen.set(false);
    this.submitted.emit(this.searchterm());
  }

  public focus() {
    this.textbox.nativeElement.focus();
  }
}
