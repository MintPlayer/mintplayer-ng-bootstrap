import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import {
  MpHierarchyChart,
  type HierarchyChartLayout,
  type HierarchyChildrenLoader,
  type HierarchyHoverEventDetail,
  type HierarchyLoadErrorEventDetail,
  type HierarchyNode,
  type HierarchyNodeEventDetail,
  type HierarchyNodeFormatter,
} from '@mintplayer/web-components/charts/hierarchy';

// Side-effect import: registers the `<mp-hierarchy-chart>` custom element.
import '@mintplayer/web-components/charts/hierarchy';

import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-hierarchy-chart',
  templateUrl: './hierarchy-chart.component.html',
  styleUrls: ['./hierarchy-chart.component.scss'],
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsHierarchyChartComponent {
  readonly data = input<HierarchyNode | undefined>(undefined);
  readonly layout = input<HierarchyChartLayout>('sunburst');
  readonly rootId = model<string | undefined>(undefined);
  /** Levels rendered outward from the focus, or `'auto'` for every loaded level. */
  readonly maxDepth = input<number | 'auto'>(2);
  readonly minAngle = input<number>(0.2);
  readonly minSize = input<number>(4);
  readonly showLabels = input<boolean>(true);
  /** Label font size in device px, constant across host size and zoom. */
  readonly labelFontSize = input<number>(12);
  /** Opaque color behind the chart for label contrast; unset = auto-detected. */
  readonly backdrop = input<string | undefined>(undefined);
  /** Gesture allowlist for the geometric zoom: 'wheel pinch' | 'wheel' | 'pinch' | 'none'. */
  readonly zoomGestures = input<string>('wheel pinch');
  readonly zoomHintLabel = input<string | undefined>(undefined);
  /** Renders the focus path as buttons above the chart. */
  readonly showBreadcrumb = input<boolean>(false);
  readonly breadcrumbLabel = input<string | undefined>(undefined);
  readonly colorMin = input<number>(0);
  readonly colorMax = input<number>(100);
  readonly colorStart = input<string>('#fe0000');
  readonly colorEnd = input<string>('#21b577');
  readonly transitionDuration = input<number>(300);
  readonly locale = input<string | undefined>(undefined);
  readonly inputLabel = input<string | undefined>(undefined);
  readonly zoomOutLabel = input<string | undefined>(undefined);
  readonly metricUnitLabel = input<string | undefined>(undefined);
  readonly valueUnitLabel = input<string | undefined>(undefined);
  readonly loadingLabel = input<string | undefined>(undefined);
  readonly tooltipFormatter = input<HierarchyNodeFormatter | undefined>(undefined);
  readonly labelFormatter = input<HierarchyNodeFormatter | undefined>(undefined);
  readonly loadChildren = input<HierarchyChildrenLoader | undefined>(undefined);

  readonly zoom = output<HierarchyNodeEventDetail>();
  readonly nodeSelect = output<HierarchyNodeEventDetail>();
  readonly nodeHover = output<HierarchyHoverEventDetail>();
  readonly nodeLoadError = output<HierarchyLoadErrorEventDetail>();

  readonly chartRef = viewChild<ElementRef<MpHierarchyChart>>('chart');

  constructor() {
    // One effect per input, deliberately: a `data` write must not re-fire on
    // every zoom tick and vice versa.
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.data = this.data(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.layout = this.layout(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.rootId = this.rootId(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.maxDepth = this.maxDepth(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.minAngle = this.minAngle(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.minSize = this.minSize(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.showLabels = this.showLabels(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.labelFontSize = this.labelFontSize(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.backdrop = this.backdrop(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.zoomGestures = this.zoomGestures(); });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      const label = this.zoomHintLabel();
      if (el && label !== undefined) el.zoomHintLabel = label;
    });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.showBreadcrumb = this.showBreadcrumb(); });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      const label = this.breadcrumbLabel();
      if (el && label !== undefined) el.breadcrumbLabel = label;
    });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.colorMin = this.colorMin(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.colorMax = this.colorMax(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.colorStart = this.colorStart(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.colorEnd = this.colorEnd(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.transitionDuration = this.transitionDuration(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.locale = this.locale(); });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      if (el) el.inputLabel = this.inputLabel() ?? null;
    });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      const label = this.zoomOutLabel();
      if (el && label !== undefined) el.zoomOutLabel = label;
    });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      const label = this.metricUnitLabel();
      if (el && label !== undefined) el.metricUnitLabel = label;
    });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      const label = this.valueUnitLabel();
      if (el && label !== undefined) el.valueUnitLabel = label;
    });
    effect(() => {
      const el = this.chartRef()?.nativeElement;
      const label = this.loadingLabel();
      if (el && label !== undefined) el.loadingLabel = label;
    });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.tooltipFormatter = this.tooltipFormatter(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.labelFormatter = this.labelFormatter(); });
    effect(() => { const el = this.chartRef()?.nativeElement; if (el) el.loadChildren = this.loadChildren(); });
  }

  protected onZoom(event: Event): void {
    const detail = (event as CustomEvent<HierarchyNodeEventDetail>).detail;
    this.rootId.set((event.target as MpHierarchyChart).rootId);
    this.zoom.emit(detail);
  }

  protected onNodeSelect(event: Event): void {
    this.nodeSelect.emit((event as CustomEvent<HierarchyNodeEventDetail>).detail);
  }

  protected onNodeHover(event: Event): void {
    this.nodeHover.emit((event as CustomEvent<HierarchyHoverEventDetail>).detail);
  }

  protected onNodeLoadError(event: Event): void {
    this.nodeLoadError.emit((event as CustomEvent<HierarchyLoadErrorEventDetail>).detail);
  }
}
