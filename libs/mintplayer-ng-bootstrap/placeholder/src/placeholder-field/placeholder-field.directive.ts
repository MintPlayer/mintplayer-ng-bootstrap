import { Directive, effect, inject } from '@angular/core';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';

@Directive({
  selector: '[bsPlaceholderField]',
  standalone: false,
  host: {
    '[attr.innerHtml]': 'html',
    '[style.min-width.px]': '80',
    '[style.margin-bottom.px]': 'marginBottom',
    '[class.placeholder]': 'placeholderClass',
  },
})
export class BsPlaceholderFieldDirective {
  private placeholder = inject(BsPlaceholderComponent);

  constructor() {
    effect(() => {
      const isLoading = this.placeholder.isLoading();
      this.placeholderClass = isLoading;
      this.marginBottom = isLoading ? -1 : 0;
      this.html = isLoading ? '&nbsp;' : undefined;
    });
  }

  html?: string = undefined;
  marginBottom = 0;
  placeholderClass = true;
}
