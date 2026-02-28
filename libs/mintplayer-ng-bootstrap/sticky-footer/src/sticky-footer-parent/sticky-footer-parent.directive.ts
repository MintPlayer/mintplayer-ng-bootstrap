import { Directive } from '@angular/core';

@Directive({
  selector: '[bsStickyFooterParent]',
  standalone: false,
  host: {
    '[style.margin-bottom.px]': 'marginBottom',
  },
})
export class BsStickyFooterParentDirective {
  marginBottom?: number;
}
