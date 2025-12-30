import { Directive, signal } from '@angular/core';

@Directive({
  selector: '[bsStickyFooterParent]',
  standalone: false,
  host: {
    '[style.margin-bottom.px]': 'marginBottom()',
  },
})
export class BsStickyFooterParentDirective {
  marginBottom = signal<number | undefined>(undefined);
}
