import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  MpTrendChart,
  type TrendHoverEventDetail,
  type TrendPointEventDetail,
  type TrendSeries,
} from '@mintplayer/web-components/charts/trend';

// Side-effect import: registers the `<mp-trend-chart>` custom element.
import '@mintplayer/web-components/charts/trend';

import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-trend-chart',
  templateUrl: './trend-chart.component.html',
  styleUrls: ['./trend-chart.component.scss'],
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTrendChartComponent {
  readonly series = input<TrendSeries[]>([]);
  readonly area = input<boolean>(true);
  readonly stacked = input<boolean>(false);
  readonly yMin = input<number | undefined>(undefined);
  readonly yMax = input<number | undefined>(undefined);
  readonly goal = input<number | undefined>(undefined);
  readonly goalLabel = input<string | undefined>(undefined);
  readonly locale = input<string | undefined>(undefined);
  readonly summary = input<string | undefined>(undefined);
  readonly inputLabel = input<string | undefined>(undefined);
  readonly summaryFormatter = input<((series: TrendSeries[]) => string | undefined) | undefined>(undefined);

  readonly pointHover = output<TrendHoverEventDetail>();
  readonly pointSelect = output<TrendPointEventDetail>();

  readonly chartRef = viewChild<ElementRef<MpTrendChart>>('chart');

  constructor() {
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.series = this.series(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.area = this.area(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.stacked = this.stacked(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.yMin = this.yMin(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.yMax = this.yMax(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.goal = this.goal(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.goalLabel = this.goalLabel(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.locale = this.locale(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.summary = this.summary(); });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      if (el) el.inputLabel = this.inputLabel() ?? null;
    });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.summaryFormatter = this.summaryFormatter(); });
  }

  protected onPointHover(event: Event): void {
    this.pointHover.emit((event as CustomEvent<TrendHoverEventDetail>).detail);
  }

  protected onPointSelect(event: Event): void {
    this.pointSelect.emit((event as CustomEvent<TrendPointEventDetail>).detail);
  }
}
