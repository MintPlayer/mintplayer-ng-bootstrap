import { Directive, HostBinding } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';

@Directive({
  selector: '[bsPlaceholderField]'
})
export class BsPlaceholderFieldDirective {

  constructor(private placeholder: BsPlaceholderComponent) {
    this.placeholder.isLoading$
      .pipe(takeUntilDestroyed())
      .subscribe((isLoading) => {
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
