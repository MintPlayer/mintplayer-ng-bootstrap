import {
  booleanAttribute,
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
  type BsTimelineConnectorContext,
  BsTimelineConnectorDirective,
  BsTimelineContentDirective,
  type BsTimelineItemContext,
  BsTimelineMarkerDirective,
  BsTimelineOppositeDirective,
  BsTimelineTimestampDirective,
  BsTimelineTitleDirective,
} from '../directives/timeline-template.directives';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

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
  imports: [BsForwardAriaDirective, NgTemplateOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTimelineComponent {
  readonly items = input<TimelineItem[]>([]);
  readonly orientation = input<TimelineOrientation>('vertical');
  readonly align = input<TimelineAlign>('start');
  readonly reverse = input<boolean>(false);
  readonly selectable = input<TimelineSelectable>('none');
  /**
   * Make the rows keyboard-operable without selection: they become buttons
   * with a roving tab stop, and Enter/Space emit `(itemClick)`. Set this when
   * `(itemClick)` is used without `selectable`, or the click is pointer-only.
   */
  readonly activatable = input(false, { transform: booleanAttribute });

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

  /**
   * The selection most recently reported BY the element. Writing it back would
   * be an echo at best, and at worst lossy: a declarative id-less item has no
   * key the wrapper could send.
   */
  private selectionFromElement: TimelineItem[] | null = null;

  constructor() {
    // Push the selection model into the WC, keyed the way the WC keys it.
    effect(() => {
      const el = this.timelineRef()?.nativeElement;
      const selection = this.selection();
      if (!el || selection === this.selectionFromElement) return;
      const items = this.items();
      el.selectedIds = selection.flatMap<string | number>((item) => {
        if (item.id != null) return [String(item.id)];
        const index = items.indexOf(item);
        return index >= 0 ? [index] : [];
      });
    });
  }

  // ----- template helpers --------------------------------------------------

  /**
   * The key the WC gives an item. The items are lowered to attributes, and an
   * attribute is always a string, so a numeric id is keyed as its string form;
   * an id-less item is keyed by its position.
   */
  private keyFor(item: TimelineItem, index: number): string | number {
    return item.id != null ? String(item.id) : index;
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
      side: this.sides()[index],
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
    const items = this.items();
    // Declarative mode: surface the attribute-derived models from the event.
    const next = items.length
      ? this.boundItems((event.currentTarget as MpTimeline).selectedIds, items)
      : (event as CustomEvent<TimelineSelectionChangeDetail>).detail.selected;
    this.selectionFromElement = next;
    this.selection.set(next);
  }

  /** Maps the element's selected keys back onto the consumer's own items. */
  private boundItems(ids: (string | number)[], items: TimelineItem[]): TimelineItem[] {
    const byKey = new Map(items.map((it, i) => [this.keyFor(it, i), it] as const));
    return ids.map((id) => byKey.get(id)).filter((it): it is TimelineItem => it !== undefined);
  }
}
