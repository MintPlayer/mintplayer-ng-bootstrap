/// <reference types="../types" />

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, model, OnDestroy, output, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsProgressComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsSuggestionTemplateContext } from '../directives';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'bs-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss'],
  imports: [
    NgTemplateOutlet,
    FormsModule,
    FocusOnLoadDirective,
    BsHasOverlayComponent,
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
    BsButtonTypeDirective,
    BsProgressComponent,
    BsProgressBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSearchboxComponent<T extends HasId<U>, U> implements OnDestroy {

  private bsForm = inject(BsFormComponent, { optional: true });
  private sanitizer = inject(DomSanitizer);

  caretUpFill = signal<SafeHtml | undefined>(undefined);
  caretDownFill = signal<SafeHtml | undefined>(undefined);
  colors = Color;
  isBusy = signal<boolean>(false);
  readonly textbox = viewChild.required<ElementRef<HTMLInputElement>>('textbox');

  isOpen = model(false);
  selectedItem = model<T | undefined>(undefined);
  searchterm = model('');

  suggestions = model<T[]>([]);

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
      const suggestions = this.suggestions();
      if (suggestions) {
        this.isBusy.set(false);
      }
    });

    effect(() => {
      const isOpen = this.isOpen();
      if (isOpen) {
        setTimeout(() => this.textbox()?.nativeElement?.setSelectionRange(0, -1), 20);
      }
    });

    import('bootstrap-icons/icons/caret-up-fill.svg').then((icon) => {
      this.caretUpFill.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/caret-down-fill.svg').then((icon) => {
      this.caretDownFill.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  ngOnDestroy() {
    clearTimeout(this.debounceTimeout);
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
