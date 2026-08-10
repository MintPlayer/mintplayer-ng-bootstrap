import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { MpSparkline } from '@mintplayer/web-components/charts/sparkline';

// Side-effect import: registers the `<mp-sparkline>` custom element.
import '@mintplayer/web-components/charts/sparkline';

import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-sparkline',
  templateUrl: './sparkline.component.html',
  styleUrls: ['./sparkline.component.scss'],
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSparklineComponent {
  readonly points = input<(number | null)[]>([]);
  readonly area = input<boolean>(false);
  readonly showLastDot = input<boolean>(true);
  readonly yMin = input<number | undefined>(undefined);
  readonly yMax = input<number | undefined>(undefined);
  readonly locale = input<string | undefined>(undefined);
  readonly inputLabel = input<string | undefined>(undefined);
  readonly summaryFormatter = input<((points: (number | null)[]) => string | undefined) | undefined>(undefined);

  readonly sparklineRef = viewChild<ElementRef<MpSparkline>>('sparkline');

  constructor() {
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.points = this.points(); });
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.area = this.area(); });
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.showLastDot = this.showLastDot(); });
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.yMin = this.yMin(); });
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.yMax = this.yMax(); });
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.locale = this.locale(); });
    effect(() => {
      const el = this.sparklineRef()?.nativeElement;
      if (el) el.inputLabel = this.inputLabel() ?? null;
    });
    effect(() => { const el = this.sparklineRef()?.nativeElement; if (el) el.summaryFormatter = this.summaryFormatter(); });
  }
}
