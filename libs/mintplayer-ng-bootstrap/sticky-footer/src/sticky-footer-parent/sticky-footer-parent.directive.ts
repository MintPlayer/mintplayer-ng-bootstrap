import { Directive, signal } from '@angular/core';

/**
 * Reserves room for the `bs-sticky-footer` inside it: a bottom margin as tall as
 * the footer, kept current by the footer's size observer. A signal, so the host
 * binding re-renders when the footer writes it (zoneless: a plain field write
 * schedules nothing, and the margin never appeared).
 */
@Directive({
  selector: '[bsStickyFooterParent]',
  host: {
    '[style.margin-bottom.px]': 'marginBottom()',
  },
})
export class BsStickyFooterParentDirective {
  readonly marginBottom = signal<number | undefined>(undefined);
}
