import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from '@angular/core';
import type { RibbonGroupSize, RibbonReduceStep } from '@mintplayer/web-components/ribbon';

@Component({
  selector: 'bs-ribbon-tab',
  template: `
    <mp-ribbon-tab
      [attr.tab-id]="tabId()"
      [attr.label]="label()"
      [idealSizes]="idealSizes()"
      [reduceOrder]="reduceOrder()"
    >
      <ng-content></ng-content>
    </mp-ribbon-tab>
  `,
  styles: [`:host { display: contents; }`],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonTabComponent {
  readonly tabId = input<string>('');
  readonly label = input<string>('');
  /** Per-group starting size; defaults to `large` per group when omitted. */
  readonly idealSizes = input<Record<string, RibbonGroupSize>>({});
  /** Ordered reduction steps walked top-to-bottom on shrink. */
  readonly reduceOrder = input<readonly RibbonReduceStep[]>([]);
}
