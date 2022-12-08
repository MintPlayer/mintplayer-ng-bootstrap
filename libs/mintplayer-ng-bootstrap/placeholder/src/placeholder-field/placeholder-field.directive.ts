import { Directive, HostBinding, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';

@Directive({
  selector: '[bsPlaceholderField]'
})
export class BsPlaceholderFieldDirective implements OnDestroy {

  constructor(private placeholder: BsPlaceholderComponent) {
    this.placeholder.isLoading$
      .pipe(takeUntil(this.destroyed$))
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
  destroyed$ = new Subject();

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
  
}
