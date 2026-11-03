import { Directive, effect, inject } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapPlaceholders } from '@mintplayer/ui-core/bootstrap/placeholders';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';

@Directive({
  selector: '[bsPlaceholderField]',
  host: {
    '[attr.data-mps]': '"placeholder"',
    '[attr.innerHtml]': 'html',
    '[style.min-width.px]': '80',
    '[style.margin-bottom.px]': 'marginBottom',
    '[class.placeholder]': 'placeholderClass',
  },
})
export class BsPlaceholderFieldDirective {
  private placeholder = inject(BsPlaceholderComponent);

  constructor() {
    // #452: the placeholders partial ships with this component, scoped to the elements it stamps (data-mps="placeholder").
    useBootstrap(bootstrapPlaceholders);
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
