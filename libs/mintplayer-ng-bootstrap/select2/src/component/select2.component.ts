import { ChangeDetectionStrategy, Component, effect, ElementRef, HostBinding, HostListener, input, model, output, signal, TemplateRef, ViewChild } from '@angular/core';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Component({
  selector: 'bs-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSelect2Component<T extends HasId<U>, U> {

  isOpen = signal(false);
  isLoading = signal<boolean>(false);

  // Use a writable signal so the directive can set it programmatically
  private _suggestions = signal<T[]>([]);
  get suggestions(): T[] {
    return this._suggestions();
  }
  set suggestions(value: T[]) {
    this._suggestions.set(value);
  }

  @ViewChild('defaultItemTemplate', { static: true }) defaultItemTemplate!: TemplateRef<any>;
  @ViewChild('searchBox') searchBox!: ElementRef<HTMLInputElement>;
  @ViewChild('itemsBox') itemsBox!: ElementRef<HTMLDivElement>;
  searchterm = model('');
  provideSuggestions = output<string>();
  @HostBinding('class.focus') isFocused = false;

  selectedItems = model<T[]>([]);

  private charWidth = 10;
  searchWidth = signal(20);
  itemTemplate?: TemplateRef<T>;
  suggestionTemplate?: TemplateRef<T>;

  constructor() {
    effect(() => {
      const suggestions = this._suggestions();
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

    this.searchBox.nativeElement.focus();
  }

  onRemoveItem(item: T, event: MouseEvent) {
    event.stopPropagation();
    const currentItems = this.selectedItems();
    this.selectedItems.set(currentItems.filter(i => i.id !== item.id));
    this.focus();
  }

  @HostListener('click')
  public focus() {
    this.searchBox.nativeElement.focus();
  }
}
