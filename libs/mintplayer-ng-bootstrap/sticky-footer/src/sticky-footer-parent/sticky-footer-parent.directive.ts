import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsStickyFooterParent]',
  standalone: false,
})
export class BsStickyFooterParentDirective {
  @HostBinding('style.margin-bottom.px') marginBottom?: number;
}
