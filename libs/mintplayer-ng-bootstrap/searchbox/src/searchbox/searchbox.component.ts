/// <reference types="../types" />

import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Input, input, model, output, signal, TemplateRef, ViewChild } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSearchboxComponent<T extends HasId<U>, U> {

  private bsForm = inject(BsFormComponent, { optional: true });
  private sanitizer = inject(DomSanitizer);

  caretUpFill = signal<SafeHtml | undefined>(undefined);
  caretDownFill = signal<SafeHtml | undefined>(undefined);
  colors = Color;
  isBusy = signal<boolean>(false);
  @ViewChild('textbox') textbox!: ElementRef<HTMLInputElement>;

  isOpen = model(false);
  selectedItem = model<T | undefined>(undefined);
  searchterm = model('');

  // Use getter/setter pattern because directive sets this programmatically
  private _suggestions = signal<T[]>([]);
  get suggestions(): T[] {
    return this._suggestions();
  }
  @Input() set suggestions(value: T[]) {
    this._suggestions.set(value);
  }

  suggestionTemplate?: TemplateRef<BsSuggestionTemplateContext<T, U>>;
  enterSearchtermTemplate?: TemplateRef<T>;
  noResultsTemplate?: TemplateRef<T>;
  provideSuggestions = output<string>();

  private debouncedSearchterm = signal('');
  private debounceTimeout: any;

  constructor() {
    if (!this.bsForm) {
      throw '<bs-searchbox> must be inside a <bs-form>';
    }

    effect(() => {
      const searchterm = this.searchterm();
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        if (searchterm === '') {
          // clear suggestions - will be handled by the template
        } else {
          this.isBusy.set(true);
          this.provideSuggestions.emit(searchterm);
        }
      }, 200);
    });

    effect(() => {
      const suggestions = this._suggestions();
      if (suggestions) {
        this.isBusy.set(false);
      }
    });

    effect(() => {
      const isOpen = this.isOpen();
      if (isOpen) {
        setTimeout(() => this.textbox?.nativeElement?.setSelectionRange(0, -1), 20);
      }
    });

    import('bootstrap-icons/icons/caret-up-fill.svg').then((icon) => {
      this.caretUpFill.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/caret-down-fill.svg').then((icon) => {
      this.caretDownFill.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  onSearchtermChange(searchterm: string) {
    this.searchterm.set(searchterm);
  }

  onSuggestionClicked(suggestion: T) {
    this.selectedItem.set(suggestion);
    this.isOpen.set(false);
    this.searchterm.set('');
  }
}
