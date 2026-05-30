import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  resolveSides,
  type MpTimeline,
} from '@mintplayer/web-components/timeline';
import type {
  TimelineAlign,
  TimelineItem,
  TimelineItemClickDetail,
  TimelineOrientation,
  TimelineSelectable,
  TimelineSelectionChangeDetail,
} from '@mintplayer/web-components/timeline-core';

// Side-effect import: registers <mp-timeline> + <mp-timeline-item>.
import '@mintplayer/web-components/timeline';

import {
  BsTimelineConnectorContext,
  BsTimelineConnectorDirective,
  BsTimelineContentDirective,
  BsTimelineItemContext,
  BsTimelineMarkerDirective,
  BsTimelineOppositeDirective,
  BsTimelineTimestampDirective,
  BsTimelineTitleDirective,
} from '../directives/timeline-template.directives';

/**
 * `<bs-timeline>` — Angular wrapper around `<mp-timeline>`.
 *
 * Data-driven: bind `[items]` and supply any of the `*bsTimeline*` template
 * directives; the wrapper lowers each into a `<mp-timeline-item>` child with the
 * template projected into the matching slot. Declarative: drop
 * `<mp-timeline-item>` elements directly inside `<bs-timeline>` (no items).
 */
@Component({
  selector: 'bs-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  imports: [NgTemplateOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTimelineComponent {
  readonly items = input<TimelineItem[]>([]);
  readonly orientation = input<TimelineOrientation>('vertical');
  readonly align = input<TimelineAlign>('start');
  readonly reverse = input<boolean>(false);
  readonly selectable = input<TimelineSelectable>('none');

  /** Two-way bound array of selected items (identity via `id`). */
  readonly selection = model<TimelineItem[]>([]);

  /** Emitted when a non-disabled item is activated. */
  readonly itemClick = output<TimelineItemClickDetail>();

  readonly timelineRef = viewChild<ElementRef<MpTimeline>>('timeline');

  protected readonly markerTpl = contentChild(BsTimelineMarkerDirective);
  protected readonly titleTpl = contentChild(BsTimelineTitleDirective);
  protected readonly timestampTpl = contentChild(BsTimelineTimestampDirective);
  protected readonly contentTpl = contentChild(BsTimelineContentDirective);
  protected readonly oppositeTpl = contentChild(BsTimelineOppositeDirective);
  protected readonly connectorTpl = contentChild(BsTimelineConnectorDirective);

  protected readonly sides = computed(() =>
    resolveSides(this.items().length, this.align(), this.reverse()),
  );

  constructor() {
    // Push the selection model into the WC (identity via id).
    effect(() => {
      const el = this.timelineRef()?.nativeElement;
      if (!el) return;
      el.selectedIds = this.selection().map((item, i) => this.idForItem(item, i));
    });
  }

  // ----- template helpers --------------------------------------------------

  protected idForItem(item: TimelineItem, index: number): string | number {
    return item.id ?? index;
  }

  protected idAttr(item: TimelineItem): string | number | null {
    return item.id ?? null;
  }

  protected timeAttr(item: TimelineItem): string | null {
    if (item.time == null) return null;
    return item.time instanceof Date ? item.time.toLocaleDateString() : item.time;
  }

  protected ctx(item: TimelineItem, index: number): BsTimelineItemContext {
    const len = this.items().length;
    const visualIndex = this.reverse() ? len - 1 - index : index;
    return {
      $implicit: item,
      index,
      visualIndex,
      isFirst: visualIndex === 0,
      isLast: visualIndex === len - 1,
      orientation: this.orientation(),
      side: this.sides()[index] ?? 'start',
    };
  }

  protected connectorCtx(item: TimelineItem, index: number): BsTimelineConnectorContext {
    return {
      $implicit: item,
      toItem: this.items()[index + 1],
      index,
      orientation: this.orientation(),
    };
  }

  // ----- WC event handlers -------------------------------------------------

  protected onItemClick(event: Event): void {
    this.itemClick.emit((event as CustomEvent<TimelineItemClickDetail>).detail);
  }

  protected onSelectionChange(event: Event): void {
    const detail = (event as CustomEvent<TimelineSelectionChangeDetail>).detail;
    const items = this.items();
    if (items.length) {
      const byId = new Map(items.map((it, i) => [this.idForItem(it, i), it] as const));
      const el = this.timelineRef()?.nativeElement;
      const ids = el?.selectedIds ?? detail.selected.map((m, i) => m.id ?? i);
      this.selection.set(ids.map((id) => byId.get(id)).filter((it): it is TimelineItem => it !== undefined));
    } else {
      // Declarative mode: surface the attribute-derived models from the event.
      this.selection.set(detail.selected);
    }
  }
}
