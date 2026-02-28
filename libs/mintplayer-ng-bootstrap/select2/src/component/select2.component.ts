import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, ElementRef, input, model, output, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsInListPipe } from '@mintplayer/ng-bootstrap/in-list';

@Component({
  selector: 'bs-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss'],
  imports: [
    NgTemplateOutlet,
    FormsModule,
    BsHasOverlayComponent,
    BsDropdownDirective,
    BsDropdownMenuDirective,
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
    BsInListPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.focus]': 'isFocused()',
    '(click)': 'focus()',
  },
})
export class BsSelect2Component<T extends HasId<U>, U> {

  isOpen = model(false);
  isLoading = signal<boolean>(false);

  suggestions = model<T[]>([]);

  readonly defaultItemTemplate = viewChild.required<TemplateRef<any>>('defaultItemTemplate');
  readonly searchBox = viewChild.required<ElementRef<HTMLInputElement>>('searchBox');
  readonly itemsBox = viewChild.required<ElementRef<HTMLDivElement>>('itemsBox');
  searchterm = model('');
  provideSuggestions = output<string>();
  isFocused = signal(false);

  selectedItems = model<T[]>([]);

  private charWidth = 10;
  searchWidth = signal(20);
  itemTemplate?: TemplateRef<T>;
  suggestionTemplate?: TemplateRef<T>;

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
    this.searchWidth.set(this.charWidth * (value.length + 2));
    if (value === '') {
      this.isOpen.set(false);
    } else {
      this.isLoading.set(true);
      this.isOpen.set(true);
      this.provideSuggestions.emit(value);
    }
  }

  onSuggestionClicked(suggestion: T) {
    this.searchterm.set('');
    this.isOpen.set(false);

    const currentItems = this.selectedItems();
    const existing = currentItems.find((value, index) => value.id === suggestion.id);
    if (existing === undefined) {
      this.selectedItems.set([...currentItems, suggestion]);
    } else {
      this.selectedItems.set(currentItems.filter(item => item.id !== suggestion.id));
    }

    this.searchBox().nativeElement.focus();
  }

  onRemoveItem(item: T, event: MouseEvent) {
    event.stopPropagation();
    const currentItems = this.selectedItems();
    this.selectedItems.set(currentItems.filter(i => i.id !== item.id));
    this.focus();
  }

  public focus() {
    this.searchBox().nativeElement.focus();
  }
}
