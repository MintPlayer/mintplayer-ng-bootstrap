import { Directive, effect, HostBinding } from '@angular/core';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';

@Directive({
  selector: '[bsPlaceholderField]',
  standalone: false,
})
export class BsPlaceholderFieldDirective {

  constructor(private placeholder: BsPlaceholderComponent) {
    effect(() => {
      const isLoading = this.placeholder.isLoading();
      this.placeholderClass = isLoading;
      this.marginBottom = isLoading ? -1 : 0;
      this.html = isLoading ? '&nbsp;' : undefined;
    });
  }

  @HostBinding('attr.innerHtml') html?: string = undefined;
  @HostBinding('style.min-width.px') minWidth = 80;
  @HostBinding('style.margin-bottom.px') marginBottom = 0;
  @HostBinding('class.placeholder') placeholderClass = true;
}
