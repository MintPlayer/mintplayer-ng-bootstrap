import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsStickyFooterParent]',
})
export class BsStickyFooterParentDirective {
  @HostBinding('style.margin-bottom.px') marginBottom?: number;
}
